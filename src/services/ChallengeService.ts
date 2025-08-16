import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AllManagedWatchedData, Challenge } from '../types';
import { fetchChallengeIdea, formatWatchedDataForPrompt } from './GeminiService'; 
import { searchTMDb } from './TMDbService';

const getCurrentWeekId = (): string => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const day = startOfYear.getDay() > 0 ? startOfYear.getDay() : 7;
    const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + day) / 7);
    return `${now.getFullYear()}-${weekNumber}`;
};

export const getWeeklyChallenge = async (watchedData: AllManagedWatchedData): Promise<Challenge> => {
    const weekId = getCurrentWeekId();
    const challengeRef = doc(db, 'challenges', weekId);
    const challengeSnap = await getDoc(challengeRef);

    if (challengeSnap.exists()) {
        console.log("Desafio encontrado no Firebase para a semana:", weekId);
        return challengeSnap.data() as Challenge;
    }

    console.log("Gerando novo desafio para a semana:", weekId);
    
    // --- ETAPA 1: PEDIR A IDEIA CRIATIVA À IA ---
    const allWatchedTitles = Object.values(watchedData).flat().map(item => item.title).join(', ');
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Analise o perfil de gosto de um usuário e crie a IDEIA para um desafio semanal.
    
**PERFIL DE GOSTO:**
${formattedData}

**TÍTULOS JÁ VISTOS (A SEREM EVITADOS):**
${allWatchedTitles}

**Sua Tarefa:**
Retorne um objeto JSON com um "challengeType" (um nome criativo), uma "reason" (justificativa curta) e uma "searchQuery" (termo de busca para a API de filmes).`;

    const idea = await fetchChallengeIdea(prompt);
    console.log("Ideia recebida da IA:", idea);

    // --- ETAPA 2: USAR A IDEIA PARA BUSCAR O FILME NO TMDB ---
    const searchResults = await searchTMDb(idea.searchQuery);
    
    const allWatchedIds = Object.values(watchedData).flat().map(item => item.id);
    const validResult = searchResults.find(result => !allWatchedIds.includes(result.id));

    if (!validResult) {
        throw new Error("Não foi possível encontrar um filme inédito para o desafio gerado.");
    }
    console.log("Título encontrado no TMDb:", validResult.title || validResult.name);

    // --- ETAPA 3: MONTAR E SALVAR O DESAFIO COMPLETO ---
    const newChallenge: Challenge = {
        id: weekId,
        challengeType: idea.challengeType,
        reason: idea.reason,
        status: 'active',
        tmdbId: validResult.id,
        tmdbMediaType: validResult.media_type,
        title: `${validResult.title || validResult.name} (${new Date(validResult.release_date || validResult.first_air_date || '').getFullYear()})`,
        posterUrl: validResult.poster_path ? `https://image.tmdb.org/t/p/w500${validResult.poster_path}` : undefined,
    };

    await setDoc(challengeRef, newChallenge);
    console.log("Novo desafio salvo no Firebase.");
    return newChallenge;
};

export const updateChallenge = async (challenge: Challenge): Promise<void> => {
    const challengeRef = doc(db, 'challenges', challenge.id);
    await setDoc(challengeRef, challenge, { merge: true });
};