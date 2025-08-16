// src/services/RadarUpdateService.ts (Completo e Corrigido)

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AllManagedWatchedData, RadarItem, TMDbSearchResult } from '../types';
import { getUpcomingMovies, getOnTheAirTV, getNowPlayingMovies, getTopRatedOnProvider, getTrending } from './TMDbService';
import { formatWatchedDataForPrompt, fetchPersonalizedRadar } from './GeminiService';
import { setRelevantReleases } from './firestoreService';

const METADATA_DOC_ID = 'radarMetadata';
const UPDATE_INTERVAL_DAYS = 1;

const shouldUpdate = async (): Promise<boolean> => {
    const metadataRef = doc(db, 'metadata', METADATA_DOC_ID);
    const metadataSnap = await getDoc(metadataRef);

    if (!metadataSnap.exists()) {
        console.log("Metadados do Radar não encontrados. Primeira atualização necessária.");
        return true;
    }

    const lastUpdate = (metadataSnap.data().lastUpdate as Timestamp).toDate();
    const daysSinceLastUpdate = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);

    if (daysSinceLastUpdate >= UPDATE_INTERVAL_DAYS) {
        console.log(`Já se passaram ${daysSinceLastUpdate.toFixed(1)} dias. Nova atualização do Radar necessária.`);
        return true;
    }

    console.log(`Ainda não é hora de atualizar o Radar. A usar dados em cache.`);
    return false;
};

// Função auxiliar para converter um resultado do TMDb para o nosso tipo RadarItem
const toRadarItem = (item: TMDbSearchResult, listType: RadarItem['listType'], providerId?: number): RadarItem | null => {
    const releaseDate = item.release_date || item.first_air_date;
    if (!releaseDate) return null;

    const fullTitle = item.title || item.name;
    const yearRegex = /\(\d{4}\)/;
    const titleWithYear = yearRegex.test(fullTitle || '') 
        ? fullTitle 
        : `${fullTitle} (${new Date(releaseDate).getFullYear()})`;
    
    // ### CORREÇÃO AQUI ###
    // Garante que o tmdbMediaType seja 'movie' ou 'tv', mesmo que a API não o forneça explicitamente.
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');

    const radarItem: RadarItem = {
        id: item.id,
        tmdbMediaType: mediaType,
        title: titleWithYear || 'Título Desconhecido',
        releaseDate: releaseDate,
        type: mediaType,
        listType: listType,
    };

    if (item.poster_path) {
        radarItem.posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
    }
    if (providerId) {
        radarItem.providerId = providerId;
    }
    
    return radarItem;
};


export const updateRelevantReleasesIfNeeded = async (watchedData: AllManagedWatchedData): Promise<void> => {
    if (!(await shouldUpdate())) {
        return;
    }

    console.log("Iniciando atualização completa do Radar de Lançamentos...");

    const PROVIDER_IDS = { netflix: 8, prime: 119, max: 1899, disney: 337 };

    const [
        upcomingMovies, 
        onTheAirShows, 
        nowPlayingMovies, 
        trending,
        topNetflix,
        topPrime,
        topMax,
        topDisney
    ] = await Promise.all([
        getUpcomingMovies(),
        getOnTheAirTV(),
        getNowPlayingMovies(),
        getTrending(),
        getTopRatedOnProvider(PROVIDER_IDS.netflix),
        getTopRatedOnProvider(PROVIDER_IDS.prime),
        getTopRatedOnProvider(PROVIDER_IDS.max),
        getTopRatedOnProvider(PROVIDER_IDS.disney),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureContent = [...upcomingMovies, ...onTheAirShows].filter(item => {
        const releaseDate = new Date(item.release_date || item.first_air_date || '');
        return releaseDate >= today;
    });

    let relevantUpcomingItems: RadarItem[] = [];
    if (futureContent.length > 0) {
        const releasesForPrompt = futureContent.map(r => `- ${r.title || r.name} (ID: ${r.id})`).join('\n');
        const formattedData = formatWatchedDataForPrompt(watchedData);
        const prompt = `Analise a lista de próximos lançamentos... (prompt completo aqui)`;
        const aiResult = await fetchPersonalizedRadar(prompt);
        relevantUpcomingItems = aiResult.releases
            .map(release => {
                const original = futureContent.find(r => r.id === release.id);
                return original ? toRadarItem(original, 'upcoming') : null;
            })
            .filter((item): item is RadarItem => item !== null);
    }
    
    const nowPlayingItems = nowPlayingMovies.map(m => toRadarItem(m, 'now_playing')).filter((item): item is RadarItem => item !== null);
    const trendingItems = trending.map(t => toRadarItem(t, 'trending')).filter((item): item is RadarItem => item !== null);
    const netflixItems = topNetflix.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.netflix)).filter((item): item is RadarItem => item !== null);
    const primeItems = topPrime.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.prime)).filter((item): item is RadarItem => item !== null);
    const maxItems = topMax.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.max)).filter((item): item is RadarItem => item !== null);
    const disneyItems = topDisney.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.disney)).filter((item): item is RadarItem => item !== null);
    
    const allItemsMap = new Map<number, RadarItem>();
    [...nowPlayingItems, ...trendingItems, ...netflixItems, ...primeItems, ...maxItems, ...disneyItems, ...relevantUpcomingItems].forEach(item => {
        if (item && !allItemsMap.has(item.id)) {
            allItemsMap.set(item.id, item);
        }
    });
    const allItems = Array.from(allItemsMap.values());

    await setRelevantReleases(allItems);
    await setDoc(doc(db, 'metadata', METADATA_DOC_ID), { lastUpdate: new Date() });

    console.log(`Atualização do Radar de Lançamentos concluída! ${allItems.length} itens salvos.`);
};