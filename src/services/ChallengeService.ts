import { GoogleGenAI, Type } from "@google/genai";
import { AllManagedWatchedData, Challenge } from '../types';
import { formatWatchedDataForPrompt } from './GeminiService';
import { fetchPosterUrl } from './TMDbService';

// --- Schema da IA para o Desafio ---
const challengeSchema = {
    type: Type.OBJECT,
    properties: {
        tmdbId: { type: Type.INTEGER, description: "O ID numérico do TMDb do título desafiado." },
        tmdbMediaType: { type: Type.STRING, enum: ['movie', 'tv'], description: "O tipo de mídia no TMDb ('movie' ou 'tv')." },
        title: { type: Type.STRING, description: "O título oficial do filme/série, incluindo o ano." },
        challengeType: { type: Type.STRING, description: "O tipo de desafio gerado (ex: 'Desafio do Diretor', 'Gênero Oculto', 'Clássico Esquecido')." },
        reason: { type: Type.STRING, description: "Uma justificativa curta e convincente, explicando por que este desafio é perfeito para o usuário." }
    },
    required: ["tmdbId", "tmdbMediaType", "title", "challengeType", "reason"]
};

// --- Função Principal para Gerar o Desafio ---
export const generateWeeklyChallenge = async (watchedData: AllManagedWatchedData): Promise<Omit<Challenge, 'posterUrl' | 'weekId'>> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);

    const prompt = `Você é o "CineGênio Pessoal". Sua tarefa é analisar o perfil de gosto de um usuário e criar um "Desafio Semanal" para expandir seus horizontes cinematográficos.

**REGRAS DO DESAFIO:**
1.  **Analise os Pontos Cegos:** Identifique gêneros, diretores, atores ou décadas que o usuário explora pouco.
2.  **Crie uma Conexão:** O desafio deve ter alguma conexão com o que o usuário já ama. Ex: "Você ama ficção científica, mas nunca viu um clássico do cinema mudo sobre o tema. Assista a 'Metrópolis'."
3.  **Seja Criativo no Tipo:** Varie o tipo de desafio (Desafio do Diretor, Gênero Oculto, Clássico Esquecido, Fora da Caixa, etc.).
4.  **Seja Convincente:** A razão deve ser curta e despertar a curiosidade.

**PERFIL DO USUÁRIO:**
${formattedData}

**Sua Tarefa:**
Gere UM desafio. Sua resposta DEVE ser um único objeto JSON com a estrutura exata definida no schema.`;

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        // Mock para desenvolvimento
        return { tmdbId: 278, tmdbMediaType: 'movie', title: "Um Sonho de Liberdade (1994)", challengeType: "Desafio do Clássico", reason: "Você adora dramas aclamados, mas este clássico absoluto ainda não está na sua coleção." };
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: challengeSchema }
    });

    return JSON.parse(response.text.trim());
};
