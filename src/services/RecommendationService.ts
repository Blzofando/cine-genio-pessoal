import { GoogleGenAI, Type } from "@google/genai";
import { AllManagedWatchedData, ManagedWatchedItem, Recommendation, PredictionResult, MediaType } from '../types';
import { TMDbSearchResult, searchTMDb, getTMDbDetails, fetchPosterUrl } from './TMDbService';

export type SuggestionFilters = {
    category: MediaType | null;
    genres: string[];
    keywords: string;
};

// Helper to format the new data structure for prompts
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
        analysis: { type: Type.STRING, description: "Sua análise detalhada, explicando por que esta recomendação se encaixa no perfil do usuário. Ex: 'Como você amou A Origem...'" }
    },
    required: ["title", "type", "genre", "synopsis", "probabilities", "analysis"]
};

const callGeminiWithSchema = async (prompt: string): Promise<Omit<Recommendation, 'posterUrl'>> => {
    if (!process.env.API_KEY) {
        return new Promise(resolve => setTimeout(() => resolve({
            title: "Mock: A Viagem de Chihiro (2001)",
            type: 'Anime',
            genre: "Animação/Fantasia",
            synopsis: "Chihiro, uma menina de 10 anos, descobre um mundo secreto de deuses e monstros, e precisa trabalhar em uma casa de banhos para seres sobrenaturais para salvar seus pais.",
            probabilities: { amei: 85, gostei: 10, meh: 4, naoGostei: 1 },
            analysis: "Este é um dado de exemplo. Como você gosta de narrativas complexas e visuais impressionantes, este clássico do Studio Ghibli é uma escolha perfeita."
        }), 1000));
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: recommendationSchema
        }
    });
    return JSON.parse(response.text.trim()) as Omit<Recommendation, 'posterUrl'>;
};

export const getRandomSuggestion = async (watchedData: AllManagedWatchedData, sessionExclude: string[] = []): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData, sessionExclude);
    const prompt = `Você é o "CineGênio Pessoal", um especialista em cinema e séries com uma capacidade analítica profunda. Sua tarefa é analisar o "DNA de gosto" do usuário para fornecer UMA recomendação de filme ou série.

**REGRAS DE ANÁLISE PROFUNDA:**

1.  **Exclusão Absoluta:** Obedeça estritamente à lista de exclusão. NUNCA sugira um título dessa lista.
2.  **Análise Ponderada das Listas:**
    *   **Amei:** Esta é sua fonte principal de inspiração. Identifique os padrões-chave aqui (gêneros, temas, diretores, tom, complexidade da narrativa). Sua sugestão deve espelhar essas qualidades.
    *   **Gostei:** Estas são pistas valiosas. Analise o que pode ter faltado para que não estivessem na lista "Amei". Talvez o conceito era bom, mas a execução falhou? Use isso para encontrar algo com um conceito semelhante, mas com melhor execução.
    *   **Meh:** Estas são armadilhas a evitar. Que elementos essas obras têm em comum? Um tipo de humor específico? Ritmo lento? Evite sugerir obras com essas características.
    *   **Não Gostei:** Elementos a excluir completamente. Se o usuário odeia um subgênero ou tema presente aqui, não chegue perto.
3.  **Pontes Temáticas:** Não se limite aos gêneros que o usuário mais consome. Use temas como pontes. Se o usuário ama "thrillers psicológicos complexos" (Amei), você pode sugerir um "drama complexo com forte tensão psicológica", mesmo que o usuário tenha poucos dramas na lista.
4.  **Descoberta:** A recomendação deve ser uma "jóia escondida" ou algo que o usuário provavelmente não conhece, mas que se alinha perfeitamente ao seu perfil.
5.  **Confiança nas Probabilidades:** Suas probabilidades devem ser realistas e refletir sua análise. Se você tem alta confiança de que o usuário vai amar a sugestão, a probabilidade "amei" deve ser alta (ex: >70%).

**PERFIL DO USUÁRIO (DNA de Gosto):**
${formattedData}

**Sua Tarefa:**
Com base nesta análise profunda, gere UMA recomendação. Sua resposta DEVE ser um único objeto JSON com a estrutura exata definida no schema. A análise deve explicar o raciocínio por trás da sua escolha, conectando-a diretamente aos gostos e aversões do usuário.`;
    const recommendation = await callGeminiWithSchema(prompt);
    const posterUrl = await fetchPosterUrl(recommendation.title);
    return { ...recommendation, posterUrl: posterUrl ?? undefined };
};

export const getPersonalizedSuggestion = async (watchedData: AllManagedWatchedData, filters: SuggestionFilters, sessionExclude: string[] = []): Promise<Recommendation> => {
    const formattedData = formatWatchedDataForPrompt(watchedData, sessionExclude);
    const genresText = filters.genres.length > 0 ? filters.genres.join(', ') : 'Qualquer';
    const prompt = `Você é o "CineGênio Pessoal", um especialista em cinema e séries com uma capacidade analítica profunda. Sua tarefa é encontrar a recomendação PERFEITA que se encaixe tanto nos filtros do usuário quanto no seu "DNA de gosto".

**REGRAS DE ANÁLISE PROFUNDA:**

1.  **Filtros são Reis:** Os filtros do usuário são a prioridade MÁXIMA. Sua sugestão DEVE corresponder a todos os filtros fornecidos (Categoria, Gêneros, Palavras-chave).
2.  **Exclusão Absoluta:** Dentro dos resultados filtrados, obedeça estritamente à lista de exclusão. NUNCA sugira um título dessa lista.
3.  **Análise Ponderada (Dentro dos Filtros):**
    *   **Amei:** Encontre algo que corresponda aos filtros e que também compartilhe o DNA das obras que o usuário amou.
    *   **Gostei:** Use como critério de desempate. Se duas obras se encaixam, qual delas se parece mais com as da lista "Amei" e menos com as da lista "Gostei"?
    *   **Meh / Não Gostei:** Use para eliminar candidatos. Uma obra corresponde aos filtros, mas tem elementos em comum com algo que o usuário achou "Meh" ou "Não Gostei"? Descarte-a.
4.  **Confiança nas Probabilidades:** Suas probabilidades devem ser realistas e refletir sua análise. Se você tem alta confiança de que o usuário vai amar a sugestão (porque ela bate com os filtros E com o perfil "Amei"), a probabilidade "amei" deve ser alta (ex: >70%).

**FILTROS DO USUÁRIO:**
- Categoria: ${filters.category || 'Qualquer'}
- Gêneros: ${genresText}
- Palavras-chave: ${filters.keywords || 'Nenhuma'}

**PERFIL DO USUÁRIO (DNA de Gosto):**
${formattedData}

**Sua Tarefa:**
Com base nesta análise profunda, gere UMA recomendação. Sua resposta DEVE ser um único objeto JSON com a estrutura exata definida no schema. A análise deve explicar o raciocínio por trás da sua escolha, conectando-a aos filtros E aos gostos e aversões do usuário.`;
    const recommendation = await callGeminiWithSchema(prompt);
    const posterUrl = await fetchPosterUrl(recommendation.title);
    return { ...recommendation, posterUrl: posterUrl ?? undefined };
};

export const getPrediction = async (title: string, watchedData: AllManagedWatchedData): Promise<PredictionResult> => {
    const formattedData = formatWatchedDataForPrompt(watchedData);
    const prompt = `Você é o "CineGênio Pessoal". Preveja se o usuário gostará do título: "${title}". Use a busca para encontrar informações sobre o título (gênero, enredo, temas) e compare com o histórico do usuário: ${formattedData}. Gere uma resposta JSON com "prediction" (veredito: "Altíssima probabilidade de você AMAR!", "Boas chances de você GOSTAR.", "Você pode gostar, MAS COM RESSALVAS.", ou "Provavelmente NÃO É PARA VOCÊ.") e "reason" (justificativa detalhada). Sua resposta DEVE ser APENAS o objeto JSON.`;

    if (!process.env.API_KEY) {
        return new Promise(resolve => setTimeout(() => resolve({
            prediction: "Boas chances de você GOSTAR.",
            reason: "Este é um dado de exemplo. O filme parece ter uma forte pegada de ficção científica, algo que você apreciou."
        }), 1000));
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
    });
    const text = response.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("A resposta da IA não continha um JSON válido.");
    return JSON.parse(jsonMatch[0]) as PredictionResult;
};

// --- Intelligent Add Functions ---

const findBestTMDbMatch = async (userQuery: string, searchResults: TMDbSearchResult[]): Promise<number | null> => {
    if (searchResults.length === 0) return null;
    if (searchResults.length === 1) return searchResults[0].id;

    const prompt = `Você é um especialista em identificar a mídia correta a partir de uma lista de resultados de busca do TMDb. Analise a lista 'search_results' e, usando a 'user_query' como a principal dica de contexto, determine qual resultado é o mais provável de ser o que o usuário deseja. Utilize a busca na internet se a 'user_query' contiver termos descritivos (ex: 'live action', 'preto e branco', 'remake') para descobrir o título oficial e encontrar o item correto. Sua resposta final deve ser APENAS o número do ID do item escolhido, nada mais.

Critérios de Análise:
1. Contexto da Query: Use a busca para entender palavras-chave que não fazem parte do título, como "série", "filme", "anime", "BL", "tailandês", "dorama", "preto e branco", "live action". Elas são dicas valiosas para encontrar o título oficial ou a versão correta e devem ter prioridade máxima na sua análise para determinar o tipo de mídia (filme vs. tv).
2. Sinopse (overview): Leia a sinopse de cada resultado. Ela corresponde às dicas de contexto da query e às informações encontradas na busca?
3. Popularidade (popularity): Em caso de dúvida entre dois resultados muito parecidos, o que tiver a maior 'popularity' no TMDb é geralmente a escolha mais segura.
4. Tipo de Mídia (media_type): Se a 'user_query' mencionar "série", priorize os resultados com 'media_type' igual a "tv". Se mencionar "filme", priorize "movie".

user_query: "${userQuery}"

search_results:
${JSON.stringify(searchResults.map(r => ({ id: r.id, title: r.title || r.name, overview: r.overview, popularity: r.popularity, media_type: r.media_type })), null, 2)}

Com base na sua análise e na busca na internet (se necessária), qual é o ID correto? Responda APENAS com o número do ID.`;

    if (!process.env.API_KEY) {
        const mostPopular = [...searchResults].sort((a, b) => b.popularity - a.popularity)[0];
        return new Promise(resolve => setTimeout(() => resolve(mostPopular.id), 500));
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    });
    const text = response.text.trim();
    const parsedId = parseInt(text, 10);

    if (!isNaN(parsedId) && searchResults.some(r => r.id === parsedId)) {
        return parsedId;
    }

    console.warn(`A IA retornou um ID inválido: '${text}'. Usando o resultado mais popular como fallback.`);
    const mostPopular = [...searchResults].sort((a, b) => b.popularity - a.popularity)[0];
    return mostPopular.id;
};

export const getFullMediaDetailsFromQuery = async (query: string): Promise<Omit<ManagedWatchedItem, 'rating' | 'createdAt'>> => {
    let searchResults: TMDbSearchResult[] = [];
    let titleToSearch = query;
    let year: string | null = null;

    // Regex to find a 4-digit year at the end of the string, optionally in parentheses.
    const yearMatch = query.match(/(?:\s*\(?(\d{4})\)?\s*)$/);
    if (yearMatch && yearMatch[1]) {
        year = yearMatch[1];
        titleToSearch = query.substring(0, yearMatch.index).trim();
    }

    // If we have a title after potentially stripping the year, search with it.
    if (titleToSearch) {
        searchResults = await searchTMDb(titleToSearch, 'pt-BR');
        if (searchResults.length === 0) {
            searchResults = await searchTMDb(titleToSearch, 'en-US');
        }
    }

    // If we have a year, try to filter the results.
    if (year && searchResults.length > 1) { // Only filter if there's ambiguity
        const filteredResults = searchResults.filter(r => {
            const releaseDate = r.media_type === 'movie' ? r.release_date : r.first_air_date;
            return releaseDate && releaseDate.startsWith(year!);
        });

        // Use filtered results only if they are not empty. Otherwise, keep the broader search.
        if (filteredResults.length > 0) {
            searchResults = filteredResults;
        }
    }
    
    // Fallback 1: If the smart search yielded no results, try the original full query.
    if (searchResults.length === 0) {
        searchResults = await searchTMDb(query, 'pt-BR');
        if (searchResults.length === 0) {
           searchResults = await searchTMDb(query, 'en-US');
        }
    }

    // Fallback 2: For titles with parentheses that weren't years (e.g., "Filme (Remake)")
    if (searchResults.length === 0) {
        const simplifiedQuery = query.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (simplifiedQuery && simplifiedQuery !== query && simplifiedQuery !== titleToSearch) {
            searchResults = await searchTMDb(simplifiedQuery, 'pt-BR');
             if (searchResults.length === 0) {
               searchResults = await searchTMDb(simplifiedQuery, 'en-US');
            }
        }
    }

    if (!searchResults || searchResults.length === 0) {
        throw new Error(`Nenhum resultado encontrado para "${query}", mesmo após buscas alternativas.`);
    }

    // Passo 2: Validação e Seleção com a IA (agora a única chamada de IA)
    const bestMatchId = await findBestTMDbMatch(query, searchResults);
    if (!bestMatchId) {
        throw new Error("A IA não conseguiu identificar um resultado correspondente.");
    }

    const bestMatch = searchResults.find(r => r.id === bestMatchId);
    if (!bestMatch) {
        throw new Error("Ocorreu um erro interno ao selecionar o resultado após a análise da IA.");
    }

    // Passo 3: Coleta de Detalhes
    const details = await getTMDbDetails(bestMatch.id, bestMatch.media_type);

    let mediaType: MediaType = 'Filme';
    let titleWithYear = '';

    if (bestMatch.media_type === 'tv') {
        const hasAnimeKeyword = query.toLowerCase().includes('anime');
        const isJapaneseAnimation = details.original_language === 'ja' && details.genres.some((g: any) => g.id === 16);
        
        mediaType = (hasAnimeKeyword || isJapaneseAnimation) ? 'Anime' : 'Série';
        titleWithYear = `${details.name} (${details.first_air_date ? new Date(details.first_air_date).getFullYear() : 'N/A'})`;
    } else { // movie
        mediaType = 'Filme';
        titleWithYear = `${details.title} (${details.release_date ? new Date(details.release_date).getFullYear() : 'N/A'})`;
    }
    
    if (details.genres.some((g: any) => g.id === 10767 || g.id === 10763)) { // Talk or News
        mediaType = 'Programa';
    }

    // Passo 4: Adição à Coleção (preparação dos dados)
    return {
        id: bestMatch.id,
        tmdbMediaType: bestMatch.media_type,
        title: titleWithYear,
        type: mediaType,
        genre: details.genres[0]?.name || 'Desconhecido',
        synopsis: details.overview || 'Sinopse não disponível.',
        posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
    };
};