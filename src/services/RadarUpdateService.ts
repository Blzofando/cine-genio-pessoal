// src/services/RadarUpdateService.ts

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AllManagedWatchedData, RadarItem, TMDbSearchResult } from '../types';
import { getUpcomingMovies, getOnTheAirTV, getNowPlayingMovies, getTopRatedOnProvider, getTrending } from './TMDbService';
import { formatWatchedDataForPrompt, fetchPersonalizedRadar } from './GeminiService';
import { getRelevantReleases, setRelevantReleases } from './firestoreService';

const METADATA_DOC_ID = 'radarMetadata';

// Verifica dois 'cronómetros' separados: um para as listas diárias e um para a semanal
const shouldUpdate = async (): Promise<{ daily: boolean; weekly: boolean }> => {
    const metadataRef = doc(db, 'metadata', METADATA_DOC_ID);
    const metadataSnap = await getDoc(metadataRef);

    if (!metadataSnap.exists()) {
        console.log("Metadados do Radar não encontrados. Primeira atualização completa necessária.");
        return { daily: true, weekly: true };
    }

    const data = metadataSnap.data();
    const lastDailyUpdate = (data.lastDailyUpdate as Timestamp)?.toDate() || new Date(0);
    const lastWeeklyUpdate = (data.lastWeeklyUpdate as Timestamp)?.toDate() || new Date(0);

    const now = new Date();
    const daysSinceDaily = (now.getTime() - lastDailyUpdate.getTime()) / (1000 * 3600 * 24);
    const daysSinceWeekly = (now.getTime() - lastWeeklyUpdate.getTime()) / (1000 * 3600 * 24);

    const daily = daysSinceDaily >= 1;
    const weekly = daysSinceWeekly >= 7;
    
    if(daily) console.log("Atualização diária do Radar necessária.");
    if(weekly) console.log("Atualização semanal do Radar (Relevantes) necessária.");

    return { daily, weekly };
};

const toRadarItem = (item: TMDbSearchResult, listType: RadarItem['listType'], providerId?: number): RadarItem | null => {
    const releaseDate = item.release_date || item.first_air_date;
    if (!releaseDate) return null;
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    const fullTitle = item.title || item.name;
    const yearRegex = /\(\d{4}\)/;
    const titleWithYear = yearRegex.test(fullTitle || '') 
        ? fullTitle 
        : `${fullTitle} (${new Date(releaseDate).getFullYear()})`;

    const radarItem: RadarItem = {
        id: item.id, tmdbMediaType: mediaType, title: titleWithYear || 'Título Desconhecido',
        releaseDate, type: mediaType, listType, providerId,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    };
    return radarItem;
};

export const updateRelevantReleasesIfNeeded = async (watchedData: AllManagedWatchedData): Promise<void> => {
    const { daily, weekly } = await shouldUpdate();
    if (!daily && !weekly) {
        console.log("Radar está atualizado. A usar dados em cache.");
        return;
    }

    const existingItems = await getRelevantReleases();
    const itemsMap = new Map<number, RadarItem>(existingItems.map(item => [item.id, item]));

    // Atualiza as listas diárias se necessário
    if (daily) {
        console.log("Iniciando atualização das listas diárias...");
        const PROVIDER_IDS = { netflix: 8, prime: 119, max: 1899, disney: 337 };
        const [nowPlaying, trending, topNetflix, topPrime, topMax, topDisney] = await Promise.all([
            getNowPlayingMovies(), getTrending(),
            getTopRatedOnProvider(PROVIDER_IDS.netflix), getTopRatedOnProvider(PROVIDER_IDS.prime),
            getTopRatedOnProvider(PROVIDER_IDS.max), getTopRatedOnProvider(PROVIDER_IDS.disney)
        ]);

        const dailyItems = [
            ...nowPlaying.map(m => toRadarItem(m, 'now_playing')),
            ...trending.map(t => toRadarItem(t, 'trending')),
            ...topNetflix.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.netflix)),
            ...topPrime.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.prime)),
            ...topMax.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.max)),
            ...topDisney.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.disney)),
        ].filter((item): item is RadarItem => item !== null);
        
        // Remove listas diárias antigas e adiciona as novas
        existingItems.forEach(item => {
            if(item.listType !== 'upcoming') itemsMap.delete(item.id);
        });
        dailyItems.forEach(item => itemsMap.set(item.id, item));

        await setDoc(doc(db, 'metadata', METADATA_DOC_ID), { lastDailyUpdate: new Date() }, { merge: true });
        console.log("Listas diárias atualizadas.");
    }

    // Atualiza a lista semanal (relevantes) se necessário
    if (weekly) {
        console.log("Iniciando atualização da lista semanal (Relevantes)...");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [upcomingMovies, onTheAirShows] = await Promise.all([getUpcomingMovies(), getOnTheAirTV()]);
        const futureContent = [...upcomingMovies, ...onTheAirShows].filter(item => new Date(item.release_date || item.first_air_date || '') >= today);

        if (futureContent.length > 0) {
            const releasesForPrompt = futureContent.map(r => `- ${r.title || r.name} (ID: ${r.id})`).join('\n');
            const formattedData = formatWatchedDataForPrompt(watchedData);
            const prompt = `Analise o perfil e a lista de lançamentos e selecione até 20 mais relevantes.\n\n**PERFIL:**\n${formattedData}\n\n**LANÇAMENTOS:**\n${releasesForPrompt}`;
            const aiResult = await fetchPersonalizedRadar(prompt);
            const relevantUpcomingItems = aiResult.releases.map(release => {
                const original = futureContent.find(r => r.id === release.id);
                return original ? toRadarItem(original, 'upcoming') : null;
            }).filter((item): item is RadarItem => item !== null);
            
            // Remove relevantes antigos e adiciona os novos
            existingItems.forEach(item => {
                if(item.listType === 'upcoming') itemsMap.delete(item.id);
            });
            relevantUpcomingItems.forEach(item => itemsMap.set(item.id, item));
        }
        await setDoc(doc(db, 'metadata', METADATA_DOC_ID), { lastWeeklyUpdate: new Date() }, { merge: true });
        console.log("Lista semanal (Relevantes) atualizada.");
    }

    const allItems = Array.from(itemsMap.values());
    await setRelevantReleases(allItems);
    console.log(`Atualização do Radar finalizada! ${allItems.length} itens salvos.`);
};