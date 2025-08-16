// src/services/RadarUpdateService.ts

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AllManagedWatchedData, RadarItem, TMDbSearchResult } from '../types';
import { getUpcomingMovies, getOnTheAirTV, getNowPlayingMovies, getTopRatedOnProvider, getTrending, getTMDbDetails } from './TMDbService';
import { formatWatchedDataForPrompt } from './GeminiService';
import { setRelevantReleases } from './firestoreService';

const METADATA_DOC_ID = 'radarMetadata';
const UPDATE_INTERVAL_DAYS = 1; // Atualiza a cada 1 dia para manter as listas frescas

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
    if (!releaseDate) return null; // Ignora itens sem data

    const fullTitle = item.title || item.name;
    const yearRegex = /\(\d{4}\)/;
    const titleWithYear = yearRegex.test(fullTitle || '') 
        ? fullTitle 
        : `${fullTitle} (${new Date(releaseDate).getFullYear()})`;

    const radarItem: RadarItem = {
        id: item.id,
        tmdbMediaType: item.media_type,
        title: titleWithYear || 'Título Desconhecido',
        releaseDate: releaseDate,
        type: item.media_type,
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

    // IDs dos provedores de streaming para o Brasil
    const PROVIDER_IDS = {
        netflix: 8,
        prime: 119,
        max: 1899,
        disney: 337,
    };

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

    // --- Processamento da lista "Em Breve" (com filtro de data) ---
    // A IA foi removida daqui para acelerar o processo, focando nos Top 10 e Tendências como curadoria principal
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureContent = [...upcomingMovies, ...onTheAirShows].filter(item => {
        const releaseDate = new Date(item.release_date || item.first_air_date || '');
        return releaseDate >= today;
    });
    
    const upcomingItems: RadarItem[] = futureContent.map(m => toRadarItem(m, 'upcoming')).filter(Boolean) as RadarItem[];

    // --- Processamento das outras listas ---
    const nowPlayingItems: RadarItem[] = nowPlayingMovies.map(m => toRadarItem(m, 'now_playing')).filter(Boolean) as RadarItem[];
    const trendingItems: RadarItem[] = trending.map(t => toRadarItem(t, 'trending')).filter(Boolean) as RadarItem[];
    const netflixItems: RadarItem[] = topNetflix.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.netflix)).filter(Boolean) as RadarItem[];
    const primeItems: RadarItem[] = topPrime.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.prime)).filter(Boolean) as RadarItem[];
    const maxItems: RadarItem[] = topMax.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.max)).filter(Boolean) as RadarItem[];
    const disneyItems: RadarItem[] = topDisney.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.disney)).filter(Boolean) as RadarItem[];
    
    // Combina todas as listas numa só, removendo duplicados pelo ID
    const allItemsMap = new Map<number, RadarItem>();
    const allLists = [
        ...nowPlayingItems, 
        ...trendingItems,
        ...netflixItems, 
        ...primeItems, 
        ...maxItems, 
        ...disneyItems,
        ...upcomingItems, 
    ];

    allLists.forEach(item => {
        if (item && !allItemsMap.has(item.id)) {
            allItemsMap.set(item.id, item);
        }
    });
    const allItems = Array.from(allItemsMap.values());

    await setRelevantReleases(allItems);
    await setDoc(doc(db, 'metadata', METADATA_DOC_ID), { lastUpdate: new Date() });

    console.log(`Atualização do Radar de Lançamentos concluída! ${allItems.length} itens salvos.`);
};