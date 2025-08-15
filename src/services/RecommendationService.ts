import { AllManagedWatchedData, ManagedWatchedItem, Recommendation, MediaType, DuelResult, TMDbSearchResult, RadarRelease, SuggestionFilters } from '../types';
import { searchTMDb, getTMDbDetails, getProviders, getUpcomingMovies, getOnTheAirTV, fetchPosterUrl } from './TMDbService';
import { formatWatchedDataForPrompt, fetchRecommendation, fetchDuelAnalysis, fetchPersonalizedRadar, fetchBestTMDbMatch, fetchLoveProbability } from './GeminiService';

// --- Funções de Orquestração ---

export const getRandomSuggestion = async (watchedData: AllManagedWatchedData, sessionExclude: string[] = []): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);
    
    const prompt = `Você é o "CineGênio Pessoal". Analise o perfil de gosto do usuário e forneça UMA recomendação de filme ou série que ele provavelmente não conhece, mas que se alinha perfeitamente ao seu perfil. Evite os títulos da lista de exclusão.

**PERFIL DO USUÁRIO:**
${formattedData}`;
    
    const recommendationData = await fetchRecommendation(prompt);
    const posterUrl = await fetchPosterUrl(recommendationData.title) ?? undefined;
    return { ...recommendationData, posterUrl };
};

export const getPersonalizedSuggestion = async (watchedData: AllManagedWatchedData, filters: SuggestionFilters, sessionExclude: string[] = []): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Você é o "CineGênio Pessoal". Encontre a recomendação PERFEITA que se encaixe tanto nos filtros do usuário quanto no seu perfil de gosto. Os filtros são a prioridade máxima.

**FILTROS DO USUÁRIO:**
- Categoria: ${filters.category || 'Qualquer'}
- Gêneros: ${filters.genres.join(', ') || 'Qualquer'}
- Palavras-chave: ${filters.keywords || 'Nenhuma'}

**PERFIL DO USUÁRIO:**
${formattedData}`;

    const recommendationData = await fetchRecommendation(prompt);
    const posterUrl = await fetchPosterUrl(recommendationData.title) ?? undefined;
    return { ...recommendationData, posterUrl };
};

export const getPredictionAsRecommendation = async (title: string, watchedData: AllManagedWatchedData): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Você é o "CineGênio Pessoal". Sua tarefa é analisar o título "${title}" e prever se o usuário vai gostar, com base no perfil de gosto dele. Use a busca na internet para encontrar informações sobre "${title}" (gênero, enredo, temas).

**PERFIL DO USUÁRIO:**
${formattedData}

**Sua Tarefa:**
Analise "${title}" e gere uma resposta completa no formato JSON, seguindo o schema, com probabilidades de gosto e uma análise detalhada.`;
    
    const recommendationData = await fetchRecommendation(prompt);
    const posterUrl = await fetchPosterUrl(recommendationData.title) ?? undefined;
    return { ...recommendationData, posterUrl };
};

export const getLoveProbability = async (title: string, watchedData: AllManagedWatchedData): Promise<number> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Você é o "CineGênio Pessoal". Analise o título "${title}" e preveja a probabilidade (0-100) de o usuário AMAR este título, com base no perfil de gosto dele. Retorne APENAS a probabilidade.

**PERFIL DO USUÁRIO:**
${formattedData}`;
    return await fetchLoveProbability(prompt);
}

export const getDuelAnalysis = async (title1: string, title2: string, watchedData: AllManagedWatchedData): Promise<DuelResult> => {
    // ... (código existente inalterado)
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Você é o "CineGênio Pessoal". Sua tarefa é analisar um confronto entre dois títulos: "${title1}" e "${title2}". Compare ambos com o perfil de gosto do usuário e determine qual ele provavelmente preferiria. Use a busca na internet para encontrar informações sobre ambos os títulos.

**PERFIL DO USUÁRIO:**
${formattedData}`;

    const result = await fetchDuelAnalysis(prompt);
    const [poster1, poster2] = await Promise.all([
        fetchPosterUrl(result.title1.title),
        fetchPosterUrl(result.title2.title)
    ]);
    result.title1.posterUrl = poster1 ?? undefined;
    result.title2.posterUrl = poster2 ?? undefined;
    return result;
};

export const getPersonalizedRadar = async (watchedData: AllManagedWatchedData): Promise<RadarRelease[]> => {
    // ... (código existente inalterado)
    const [movies, tvShows] = await Promise.all([getUpcomingMovies(), getOnTheAirTV()]);
    const allReleases = [...movies, ...tvShows];
    const releasesForPrompt = allReleases.map(r => `- ${r.title || r.name} (ID: ${r.id}, Tipo: ${r.media_type})`).join('\n');
    const formattedData = formatWatchedDataForPrompt(watchedData);

    const prompt = `Você é o "CineGênio Pessoal". Sua tarefa é analisar uma lista de próximos lançamentos e séries no ar, e selecionar até 10 que sejam mais relevantes para o usuário, com base no seu perfil de gosto.

**PERFIL DO USUÁRIO:**
${formattedData}

**LISTA DE LANÇAMENTOS:**
${releasesForPrompt}`;

    const result = await fetchPersonalizedRadar(prompt);
    
    const enrichedReleases = await Promise.all(result.releases.map(async (release) => {
        const originalRelease = allReleases.find(r => r.id === release.id);
        return {
            ...release,
            posterUrl: originalRelease?.poster_path ? `https://image.tmdb.org/t/p/w500${originalRelease.poster_path}` : undefined,
            releaseDate: originalRelease?.release_date || originalRelease?.first_air_date || 'Em breve'
        };
    }));
    return enrichedReleases;
};

export const getFullMediaDetailsFromQuery = async (query: string): Promise<Omit<ManagedWatchedItem, 'rating' | 'createdAt'>> => {
    // ... (código existente inalterado)
    let searchResults = await searchTMDb(query);
    if (searchResults.length === 0) {
        const simplifiedQuery = query.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (simplifiedQuery && simplifiedQuery !== query) {
            searchResults = await searchTMDb(simplifiedQuery);
        }
    }
    if (!searchResults || searchResults.length === 0) throw new Error(`Nenhum resultado encontrado para "${query}".`);

    const prompt = `Analise a 'user_query' e a lista 'search_results' do TMDb. Determine qual resultado é o mais provável. Sua resposta deve ser APENAS o número do ID do item escolhido.

user_query: "${query}"
search_results:
${JSON.stringify(searchResults.map(r => ({ id: r.id, title: r.title || r.name, overview: r.overview, popularity: r.popularity, media_type: r.media_type })), null, 2)}`;

    let bestMatchId = await fetchBestTMDbMatch(prompt);
    if (!bestMatchId) {
        bestMatchId = searchResults.sort((a, b) => b.popularity - a.popularity)[0].id;
    }

    const bestMatch = searchResults.find(r => r.id === bestMatchId);
    if (!bestMatch) throw new Error("Erro ao selecionar o melhor resultado.");

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