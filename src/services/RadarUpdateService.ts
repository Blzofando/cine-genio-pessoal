// src/services/RadarUpdateService.ts

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AllManagedWatchedData, RadarItem } from '../types';
import { getUpcomingMovies, getOnTheAirTV } from './TMDbService';
import { fetchPersonalizedRadar, formatWatchedDataForPrompt } from './GeminiService';
import { setRelevantReleases } from './firestoreService';

const METADATA_DOC_ID = 'radarMetadata';
const UPDATE_INTERVAL_DAYS = 7; // Atualiza a cada 7 dias

/**
 * Verifica se já passou tempo suficiente desde a última atualização.
 */
const shouldUpdate = async (): Promise<boolean> => {
    const metadataRef = doc(db, 'metadata', METADATA_DOC_ID);
    const metadataSnap = await getDoc(metadataRef);

    if (!metadataSnap.exists()) {
        console.log("Metadados do Radar não encontrados. Primeira atualização necessária.");
        return true; // Se nunca atualizou, precisa atualizar
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

/**
 * Orquestra a atualização da lista de lançamentos relevantes e salva no Firebase.
 */
export const updateRelevantReleasesIfNeeded = async (watchedData: AllManagedWatchedData): Promise<void> => {
    const needsUpdate = await shouldUpdate();
    if (!needsUpdate) {
        return; // Não faz nada se a lista estiver atualizada
    }

    console.log("Iniciando atualização do Radar de Lançamentos...");

    // 1. Busca os lançamentos gerais no TMDb
    const [movies, tvShows] = await Promise.all([getUpcomingMovies(), getOnTheAirTV()]);
    const allReleases = [...movies, ...tvShows];
    const releasesForPrompt = allReleases.map(r => `- ${r.title || r.name} (ID: ${r.id}, Tipo: ${r.media_type})`).join('\n');
    
    // 2. Pede à IA para filtrar os mais relevantes
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Analise a lista de próximos lançamentos e séries no ar e selecione até 20 que sejam mais relevantes para o usuário, com base no seu perfil de gosto.

**PERFIL DO USUÁRIO:**
${formattedData}

**LISTA DE LANÇAMENTOS:**
${releasesForPrompt}

**Sua Tarefa:**
Retorne um objeto JSON contendo uma chave "releases", que é um array com os 20 lançamentos mais promissores. Para cada item, inclua 'id', 'tmdbMediaType' e 'title'.`;

    // A chamada à IA é feita implicitamente através do RecommendationService ou diretamente se a função estiver no GeminiService
    const result = await fetchPersonalizedRadar(prompt);
    
    // 3. Enriquece os resultados com os dados completos
    const enrichedReleases: RadarItem[] = result.releases.map(release => {
        const originalRelease = allReleases.find(r => r.id === release.id);
        if (!originalRelease) return null;

        return {
            id: release.id,
            tmdbMediaType: release.tmdbMediaType,
            title: originalRelease.title || originalRelease.name || 'Título Desconhecido',
            posterUrl: originalRelease.poster_path ? `https://image.tmdb.org/t/p/w500${originalRelease.poster_path}` : undefined,
            releaseDate: originalRelease.release_date || originalRelease.first_air_date || 'Em breve',
            type: originalRelease.media_type,
        };
    // ### LINHA CORRIGIDA ###
    }).filter(Boolean) as RadarItem[];

    // 4. Salva a nova lista no Firebase
    await setRelevantReleases(enrichedReleases);

    // 5. Atualiza a data da última verificação
    const metadataRef = doc(db, 'metadata', METADATA_DOC_ID);
    await setDoc(metadataRef, { lastUpdate: new Date() });

    console.log("Atualização do Radar de Lançamentos concluída!");
};