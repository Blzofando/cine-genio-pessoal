import { GoogleGenAI, Type } from "@google/genai";
import { AllManagedWatchedData, ManagedWatchedItem, Recommendation, MediaType } from '../types';
import { TMDbSearchResult, searchTMDb, getTMDbDetails, getProviders } from './TMDbService';

export type SuggestionFilters = {
    category: MediaType | null;
    genres: string[];
    keywords: string;
};

// Helper para formatar os dados para a IA
const formatWatchedDataForPrompt = (data: AllManagedWatchedData, sessionExclude: string[] = []): string => {
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

// Schema JSON que a IA deve seguir para retornar os dados
const recommendationSchema = {
    type: Type.OBJECT,
    properties: {
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
        analysis: { type: Type.STRING, description: "Sua análise detalhada, explicando por que esta recomendação se encaixa no perfil do usuário." }
    },
    required: ["title", "type", "genre", "synopsis", "probabilities", "analysis"]
};

// Função genérica para chamar a IA com o schema
const callGeminiWithSchema = async (prompt: string): Promise<Omit<Recommendation, 'posterUrl'>> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        // Mock para desenvolvimento sem chave de API
        return new Promise(resolve => setTimeout(() => resolve({
            title: "Mock: A Viagem de Chihiro (2001)", type: 'Anime', genre: "Animação/Fantasia",
            synopsis: "Chihiro descobre um mundo secreto de deuses e monstros...",
            probabilities: { amei: 85, gostei: 10, meh: 4, naoGostei: 1 },
            analysis: "Este é um dado de exemplo."
        }), 1000));
    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: recommendationSchema }
    });
    return JSON.parse(response.text.trim()) as Omit<Recommendation, 'posterUrl'>;
};

// Função para buscar o poster no TMDb
const fetchPosterUrl = async (title: string): Promise<string | null> => {
    try {
        const results = await searchTMDb(title.replace(/\s*\(\d{4}\)\s*/, ''));
        const bestResult = results?.[0];
        if (bestResult && bestResult.poster_path) {
            return `https://image.tmdb.org/t/p/w500${bestResult.poster_path}`;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching poster for "${title}":`, error);
        return null; 
    }
};

// Função para Sugestão Aleatória
export const getRandomSuggestion = async (watchedData: AllManagedWatchedData, sessionExclude: string[] = []): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData, sessionExclude);
    const prompt = `Você é o "CineGênio Pessoal". Analise o perfil de gosto do usuário e forneça UMA recomendação de filme ou série que ele provavelmente não conhece, mas que se alinha perfeitamente ao seu perfil. Evite os títulos da lista de exclusão.

**PERFIL DO USUÁRIO:**
${formattedData}

**Sua Tarefa:**
Gere UMA recomendação. Sua resposta DEVE ser um único objeto JSON com a estrutura exata definida no schema.`;
    const recommendation = await callGeminiWithSchema(prompt);
    const posterUrl = await fetchPosterUrl(recommendation.title);
    return { ...recommendation, posterUrl: posterUrl ?? undefined };
};

// Função para Sugestão Personalizada
export const getPersonalizedSuggestion = async (watchedData: AllManagedWatchedData, filters: SuggestionFilters, sessionExclude: string[] = []): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData, sessionExclude);
    const prompt = `Você é o "CineGênio Pessoal". Encontre a recomendação PERFEITA que se encaixe tanto nos filtros do usuário quanto no seu perfil de gosto. Os filtros são a prioridade máxima.

**FILTROS DO USUÁRIO:**
- Categoria: ${filters.category || 'Qualquer'}
- Gêneros: ${filters.genres.join(', ') || 'Qualquer'}
- Palavras-chave: ${filters.keywords || 'Nenhuma'}

**PERFIL DO USUÁRIO:**
${formattedData}

**Sua Tarefa:**
Gere UMA recomendação que obedeça aos filtros. Sua resposta DEVE ser um único objeto JSON com a estrutura exata definida no schema.`;
    const recommendation = await callGeminiWithSchema(prompt);
    const posterUrl = await fetchPosterUrl(recommendation.title);
    return { ...recommendation, posterUrl: posterUrl ?? undefined };
};

// NOVA FUNÇÃO para "Será que vou gostar?"
export const getPredictionAsRecommendation = async (title: string, watchedData: AllManagedWatchedData): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Você é o "CineGênio Pessoal". Sua tarefa é analisar o título "${title}" e prever se o usuário vai gostar, com base no perfil de gosto dele. Use a busca na internet para encontrar informações sobre "${title}" (gênero, enredo, temas).

**PERFIL DO USUÁRIO:**
${formattedData}

**Sua Tarefa:**
Analise "${title}" e gere uma resposta completa no formato JSON, seguindo o schema, com probabilidades de gosto e uma análise detalhada.`;
    
    // A chamada para a IA é a mesma, só muda o prompt
    const recommendation = await callGeminiWithSchema(prompt);
    const posterUrl = await fetchPosterUrl(recommendation.title);
    return { ...recommendation, posterUrl: posterUrl ?? undefined };
};


// --- Funções para Adicionar Itens ---

const findBestTMDbMatch = async (userQuery: string, searchResults: TMDbSearchResult[]): Promise<number | null> => {
    if (searchResults.length === 0) return null;
    if (searchResults.length === 1) return searchResults[0].id;

    const prompt = `Analise a 'user_query' e a lista 'search_results' do TMDb. Determine qual resultado é o mais provável. Sua resposta deve ser APENAS o número do ID do item escolhido.

user_query: "${userQuery}"
search_results:
${JSON.stringify(searchResults.map(r => ({ id: r.id, title: r.title || r.name, overview: r.overview, popularity: r.popularity, media_type: r.media_type })), null, 2)}

Qual é o ID correto? Responda APENAS com o número do ID.`;

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        const mostPopular = [...searchResults].sort((a, b) => b.popularity - a.popularity)[0];
        return new Promise(resolve => setTimeout(() => resolve(mostPopular.id), 500));
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{googleSearch: {}}] },
    });
    const text = response.text.trim();
    const parsedId = parseInt(text, 10);

    if (!isNaN(parsedId) && searchResults.some(r => r.id === parsedId)) {
        return parsedId;
    }
    const mostPopular = [...searchResults].sort((a, b) => b.popularity - a.popularity)[0];
    return mostPopular.id;
};

export const getFullMediaDetailsFromQuery = async (query: string): Promise<Omit<ManagedWatchedItem, 'rating' | 'createdAt'>> => {
    const searchResults = await searchTMDb(query);
    if (!searchResults || searchResults.length === 0) {
        throw new Error(`Nenhum resultado encontrado para "${query}".`);
    }

    const bestMatchId = await findBestTMDbMatch(query, searchResults);
    if (!bestMatchId) {
        throw new Error("A IA não conseguiu identificar um resultado correspondente.");
    }

    const bestMatch = searchResults.find(r => r.id === bestMatchId);
    if (!bestMatch) {
        throw new Error("Ocorreu um erro interno ao selecionar o resultado.");
    }

    const details = await getTMDbDetails(bestMatch.id, bestMatch.media_type);

    let mediaType: MediaType = 'Filme';
    let titleWithYear = '';

    if (bestMatch.media_type === 'tv') {
        const isAnime = details.original_language === 'ja' && details.genres.some((g: any) => g.id === 16);
        mediaType = isAnime ? 'Anime' : 'Série';
        titleWithYear = `${details.name} (${details.first_air_date ? new Date(details.first_air_date).getFullYear() : 'N/A'})`;
    } else {
        mediaType = 'Filme';
        titleWithYear = `${details.title} (${details.release_date ? new Date(details.release_date).getFullYear() : 'N/A'})`;
    }
    
    if (details.genres.some((g: any) => g.id === 10767 || g.id === 10763)) {
        mediaType = 'Programa';
    }

    return {
        id: bestMatch.id,
        tmdbMediaType: bestMatch.media_type,
        title: titleWithYear,
        type: mediaType,
        genre: details.genres[0]?.name || 'Desconhecido',
        synopsis: details.overview || 'Sinopse não disponível.',
        posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
        voteAverage: details.vote_average ? parseFloat(details.vote_average.toFixed(1)) : 0,
        watchProviders: getProviders(details),
    };
};
