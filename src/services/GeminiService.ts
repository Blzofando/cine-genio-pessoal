import { GoogleGenAI, Type } from "@google/genai";
import { AllManagedWatchedData, ManagedWatchedItem, Recommendation, DuelResult, RadarRelease, TMDbSearchResult } from '../types';

// --- Helper para Formatar Dados (Versão Completa Restaurada) ---
export const formatWatchedDataForPrompt = (data: AllManagedWatchedData, sessionExclude: string[] = []): string => {
    const permanentTitles = Object.values(data).flat().map(item => item.title);
    const allToExclude = [...new Set([...permanentTitles, ...sessionExclude])];
    const formatList = (list: ManagedWatchedItem[]) => list.map(item => `- ${item.title} (Tipo: ${item.type}, Gênero: ${item.genre})`).join('\n') || 'Nenhum';
    
    return `
**Itens já na coleção do usuário ou sugeridos nesta sessão (NUNCA SUGERIR ESTES):**
${allToExclude.length > 0 ? allToExclude.join(', ') : 'Nenhum'}

**Amei (obras que considero perfeitas, alvo principal para inspiração):**
${formatList(data.amei)}

**Gostei (obras muito boas, boas pistas do que faltou para ser 'amei'):**
${formatList(data.gostei)}

**Indiferente (obras que achei medianas, armadilhas a evitar):**
${formatList(data.meh)}

**Não Gostei (obras que não me agradaram, elementos a excluir completamente):**
${formatList(data.naoGostei)}
    `.trim();
};

// --- Schemas da IA (Completos e Restaurados) ---
const recommendationSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.INTEGER, description: "O ID numérico do TMDb do título recomendado." },
        tmdbMediaType: { type: Type.STRING, enum: ['movie', 'tv'], description: "O tipo de mídia no TMDb ('movie' ou 'tv')." },
        title: { type: Type.STRING, description: "O título oficial do filme/série, incluindo o ano. Ex: 'Interestelar (2014)'" },
        type: { type: Type.STRING, enum: ['Filme', 'Série', 'Anime', 'Programa'], description: "A categoria da mídia." },
        genre: { type: Type.STRING, description: "O gênero principal da mídia. Ex: 'Ficção Científica/Aventura'." },
        synopsis: { type: Type.STRING, description: "Uma sinopse curta e envolvente de 2-3 frases." },
        probabilities: {
            type: Type.OBJECT,
            properties: {
                amei: { type: Type.INTEGER, description: "Probabilidade (0-100) de o usuário AMAR." },
                gostei: { type: Type.INTEGER, description: "Probabilidade (0-100) de o usuário GOSTAR." },
                meh: { type: Type.INTEGER, description: "Probabilidade (0-100) de o usuário achar MEDIANO." },
                naoGostei: { type: Type.INTEGER, description: "Probabilidade (0-100) de o usuário NÃO GOSTAR." }
            },
            required: ["amei", "gostei", "meh", "naoGostei"]
        },
        analysis: { type: Type.STRING, description: "Sua análise detalhada mas curta, explicando por que esta recomendação se encaixa no perfil do usuário." }
    },
    required: ["id", "tmdbMediaType", "title", "type", "genre", "synopsis", "probabilities", "analysis"]
};

const duelSchema = {
    type: Type.OBJECT,
    properties: {
        title1: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                analysis: { type: Type.STRING, description: "Análise detalhada mas curta do porquê o usuário gostaria (ou não) deste título." },
                probability: { type: Type.INTEGER, description: "Probabilidade (0-100) de o usuário preferir este título no confronto." }
            },
            required: ["title", "analysis", "probability"]
        },
        title2: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                analysis: { type: Type.STRING, description: "Análise detalhada mas curta do porquê o usuário gostaria (ou não) deste título." },
                probability: { type: Type.INTEGER, description: "Probabilidade (0-100) de o usuário preferir este título no confronto." }
            },
            required: ["title", "analysis", "probability"]
        },
        verdict: { type: Type.STRING, description: "O veredito final do Gênio, recomendando um dos dois títulos e explicando o porquê." }
    },
    required: ["title1", "title2", "verdict"]
};

const radarSchema = {
    type: Type.OBJECT,
    properties: {
        releases: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.INTEGER },
                    tmdbMediaType: { type: Type.STRING, enum: ['movie', 'tv'] },
                    title: { type: Type.STRING },
                    reason: { type: Type.STRING, description: "Uma frase curta explicando por que este lançamento é relevante para o usuário." }
                },
                required: ["id", "tmdbMediaType", "title", "reason"]
            }
        }
    },
    required: ["releases"]
};

// --- Funções de Chamada à IA ---

export const fetchRecommendation = async (prompt: string): Promise<Omit<Recommendation, 'posterUrl'>> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return { id: 129, tmdbMediaType: 'movie', title: "Mock: A Viagem de Chihiro (2001)", type: 'Anime', genre: "Animação/Fantasia", synopsis: "Mock synopsis", probabilities: { amei: 85, gostei: 10, meh: 4, naoGostei: 1 }, analysis: "Mock analysis" };
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: recommendationSchema }});
    return JSON.parse(response.text.trim());
};

export const fetchDuelAnalysis = async (prompt: string): Promise<DuelResult> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return { title1: { title: "Mock 1", analysis: "Análise 1", probability: 80 }, title2: { title: "Mock 2", analysis: "Análise 2", probability: 70 }, verdict: "Veredito Mock" };
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: duelSchema }});
    return JSON.parse(response.text.trim());
};

export const fetchPersonalizedRadar = async (prompt: string): Promise<{ releases: Omit<RadarRelease, 'posterUrl' | 'releaseDate'>[] }> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return { releases: [] };
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: radarSchema }});
    return JSON.parse(response.text.trim());
};

export const fetchBestTMDbMatch = async (prompt: string): Promise<number | null> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return null;
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{googleSearch: {}}] }});
    const text = response.text.trim();
    const parsedId = parseInt(text, 10);
    return !isNaN(parsedId) ? parsedId : null;
};
