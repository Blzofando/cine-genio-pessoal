import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AllManagedWatchedData, Challenge } from '../types';
import { fetchWeeklyChallenge } from './GeminiService';
import { fetchPosterUrl } from './TMDbService';

const getCurrentWeekId = (): string => { /* ...código inalterado... */ };

export const getWeeklyChallenge = async (watchedData: AllManagedWatchedData): Promise<Challenge> => {
    const weekId = getCurrentWeekId();
    const challengeRef = doc(db, 'challenges', weekId);
    const challengeSnap = await getDoc(challengeRef);

    if (challengeSnap.exists()) {
        return challengeSnap.data() as Challenge;
    }

    console.log("Gerando novo desafio para a semana:", weekId);
    
    // ### PROMPT MELHORADO E MAIS CRIATIVO ###
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

    // Se for um desafio de passo único, busca o pôster principal
    let posterUrl: string | undefined = undefined;
    if (challengeData.title) {
        posterUrl = await fetchPosterUrl(challengeData.title) ?? undefined;
    }

    // Se for de múltiplos passos, preenche os dados que faltam
    const steps = challengeData.steps ? await Promise.all(challengeData.steps.map(async step => ({
        ...step,
        completed: false,
        // Poderíamos buscar pôsteres individuais para cada passo aqui no futuro
    }))) : undefined;

    const newChallenge: Challenge = {
        id: weekId,
        ...challengeData,
        posterUrl,
        steps,
        status: 'active',
    };

    await setDoc(challengeRef, newChallenge);
    return newChallenge;
};

export const updateChallenge = async (challenge: Challenge): Promise<void> => {
    const challengeRef = doc(db, 'challenges', challenge.id);
    await setDoc(challengeRef, challenge, { merge: true });
};