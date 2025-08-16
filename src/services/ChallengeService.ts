import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AllManagedWatchedData, Challenge, ChallengeStep } from '../types';
import { fetchWeeklyChallenge, formatWatchedDataForPrompt } from './GeminiService'; 
import { fetchPosterUrl } from './TMDbService';

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
        return challengeSnap.data() as Challenge;
    }

    console.log("Gerando novo desafio para a semana:", weekId);
    
    const currentDate = new Date().toLocaleDateString('pt-BR', { month: 'long', day: 'numeric' });
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Hoje é ${currentDate}. Você é o "CineGênio Pessoal". Sua tarefa é analisar o perfil de um usuário e criar um "Desafio Semanal" criativo e temático.

**REGRAS DO DESAFIO:**
1.  **Seja Criativo:** Crie temas como "Maratona de um Diretor", "Clássicos de Halloween" (se for Outubro), "Comédias Românticas para o Dia dos Namorados" (se for Junho), "Animações que Merecem uma Chance", "Joias Raras de um ator que ele ama", etc.
2.  **Passo Único ou Múltiplo:** O desafio pode ser assistir a um único filme ou uma lista de até 5 (ex: uma trilogia).
3.  **Conecte com o Gosto:** O desafio deve ter alguma conexão com o que o usuário já ama para incentivá-lo a sair da zona de conforto.
4.  **Seja Convincente:** A razão deve ser curta e despertar a curiosidade.

**PERFIL DO USUÁRIO:**
${formattedData}

**Sua Tarefa:**
Gere UM desafio. Sua resposta DEVE ser um único objeto JSON com a estrutura exata definida no schema.`;

    const challengeData = await fetchWeeklyChallenge(prompt);

    // ### LÓGICA DE CONSTRUÇÃO CORRIGIDA ###
    const newChallenge: Challenge = {
        id: weekId,
        challengeType: challengeData.challengeType,
        reason: challengeData.reason,
        status: 'active',
    };

    if (challengeData.steps && challengeData.steps.length > 0) {
        // É um desafio de múltiplos passos
        newChallenge.steps = challengeData.steps.map((step: any) => ({ ...step, completed: false }));
    } else {
        // É um desafio de passo único
        newChallenge.tmdbId = challengeData.tmdbId;
        newChallenge.tmdbMediaType = challengeData.tmdbMediaType;
        newChallenge.title = challengeData.title;
        newChallenge.posterUrl = await fetchPosterUrl(challengeData.title || "") ?? undefined;
    }

    await setDoc(challengeRef, newChallenge);
    return newChallenge;
};

export const updateChallenge = async (challenge: Challenge): Promise<void> => {
    const challengeRef = doc(db, 'challenges', challenge.id);
    await setDoc(challengeRef, challenge, { merge: true });
};