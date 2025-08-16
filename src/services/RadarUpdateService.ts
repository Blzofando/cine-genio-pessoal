// src/services/RadarUpdateService.ts (Completo e Atualizado)

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AllManagedWatchedData, RadarItem } from '../types';
import { getUpcomingMovies, getOnTheAirTV, getNowPlayingMovies, getTopRatedOnProvider } from './TMDbService';
import { setRelevantReleases } from './firestoreService';

const METADATA_DOC_ID = 'radarMetadata';
const UPDATE_INTERVAL_DAYS = 7; // Atualiza a cada 1 dia para manter as listas de Top 10 frescas

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

    console.log(`Ainda não é hora de atualizar o Radar. Última atualização há ${daysSinceLastUpdate.toFixed(1)} dias.`);
    return false;
};

export const updateRelevantReleasesIfNeeded = async (watchedData: AllManagedWatchedData): Promise<void> => {
    if (!(await shouldUpdate())) {
        console.log("Atualização do Radar não é necessária. A usar dados em cache.");
        return;
    }

    console.log("Iniciando atualização do Radar de Lançamentos...");

    // Busca todas as fontes de dados em paralelo
    const [
        upcomingMovies, 
        onTheAirShows, 
        nowPlayingMovies, 
        topNetflix
    ] = await Promise.all([
        getUpcomingMovies(),
        getOnTheAirTV(),
        getNowPlayingMovies(),
        getTopRatedOnProvider(8) // ID da Netflix no Brasil
    ]);

    // Converte cada lista para o formato RadarItem com o seu listType
    const upcomingItems: RadarItem[] = upcomingMovies.map(m => ({ id: m.id, tmdbMediaType: 'movie', title: m.title || '', posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined, releaseDate: m.release_date || '', type: 'movie', listType: 'upcoming' }));
    const onAirItems: RadarItem[] = onTheAirShows.map(s => ({ id: s.id, tmdbMediaType: 'tv', title: s.name || '', posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : undefined, releaseDate: s.first_air_date || '', type: 'tv', listType: 'upcoming' }));
    const nowPlayingItems: RadarItem[] = nowPlayingMovies.map(m => ({ id: m.id, tmdbMediaType: 'movie', title: m.title || '', posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined, releaseDate: m.release_date || '', type: 'movie', listType: 'now_playing' }));
    const netflixItems: RadarItem[] = topNetflix.map(m => ({ id: m.id, tmdbMediaType: 'movie', title: m.title || '', posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined, releaseDate: m.release_date || '', type: 'movie', listType: 'top_rated_provider' }));

    // Combina todas as listas numa só, removendo duplicados pelo ID
    const allItemsMap = new Map<number, RadarItem>();
    [...nowPlayingItems, ...netflixItems, ...upcomingItems, ...onAirItems].forEach(item => {
        if (!allItemsMap.has(item.id)) {
            allItemsMap.set(item.id, item);
        }
    });
    const allItems = Array.from(allItemsMap.values());

    await setRelevantReleases(allItems);
    await setDoc(doc(db, 'metadata', METADATA_DOC_ID), { lastUpdate: new Date() });

    console.log(`Atualização do Radar de Lançamentos concluída! ${allItems.length} itens salvos.`);
};