const API_KEY = 'f75b3a1c8198ef984e4daa01a79a9eed';
const BASE_URL = 'https://api.themoviedb.org/3';

// Fila de requisições para evitar erros de rate-limiting (429)
const requestQueue: (() => Promise<any>)[] = [];
let isProcessing = false;
const DELAY_BETWEEN_REQUESTS = 250; // Aprox. 4 requisições por segundo para segurança

const processQueue = async () => {
    if (isProcessing || requestQueue.length === 0) {
        return;
    }
    isProcessing = true;

    const requestTask = requestQueue.shift();
    if (requestTask) {
        try {
            await requestTask();
        } catch (error) {
            // O erro é tratado no bloco catch da função que chama
        }
    }

    setTimeout(() => {
        isProcessing = false;
        processQueue();
    }, DELAY_BETWEEN_REQUESTS);
};

const addToQueue = <T>(requestFn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        const task = () => requestFn().then(resolve).catch(reject);
        requestQueue.push(task);
        if (!isProcessing) {
            processQueue();
        }
    });
};


export interface TMDbSearchResult {
    id: number;
    title?: string; // for movies
    name?: string; // for tv
    overview: string;
    popularity: number;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    genre_ids: number[];
    release_date?: string; // for movies
    first_air_date?: string; // for tv
}

const internalSearchTMDb = async (query: string, lang: 'pt-BR' | 'en-US' = 'pt-BR'): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=${lang}&page=1&api_key=${API_KEY}`;
    const options = { method: 'GET', headers: { accept: 'application/json' } };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error('TMDb search failed with status:', response.status);
            throw new Error(`A busca no TMDb falhou com o status: ${response.status}`);
        }
        const data = await response.json();
        return data.results?.filter((r: any) => (r.media_type === 'movie' || r.media_type === 'tv')) || [];
    } catch (error) {
        console.error('Error fetching from TMDb:', error);
        throw error;
    }
};

const internalGetTMDbDetails = async (id: number, mediaType: 'movie' | 'tv') => {
    const url = `${BASE_URL}/${mediaType}/${id}?language=pt-BR&api_key=${API_KEY}&append_to_response=credits`;
    const options = { method: 'GET', headers: { accept: 'application/json' } };
    try {
        let response = await fetch(url, options);
        if (response.status === 404) {
            // If not found in pt-BR, try en-US as a fallback
            const fallbackUrl = `${BASE_URL}/${mediaType}/${id}?language=en-US&api_key=${API_KEY}&append_to_response=credits`;
            console.warn(`TMDb details not found in pt-BR for ${mediaType}/${id}. Retrying with en-US.`);
            response = await fetch(fallbackUrl, options);
        }

        if (!response.ok) {
            console.error(`TMDb details fetch failed for ${mediaType}/${id} with status:`, response.status);
            throw new Error(`A busca de detalhes no TMDb falhou com o status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching details from TMDb for ${mediaType}/${id}:`, error);
        throw error;
    }
};

export const searchTMDb = (query: string, lang: 'pt-BR' | 'en-US' = 'pt-BR') => 
    addToQueue(() => internalSearchTMDb(query, lang));

export const getTMDbDetails = (id: number, mediaType: 'movie' | 'tv') =>
    addToQueue(() => internalGetTMDbDetails(id, mediaType));


export const findBestTMDbMatchByTitle = async (title: string): Promise<TMDbSearchResult | null> => {
    let results: TMDbSearchResult[] = [];
    const simplifiedTitle = title.replace(/\s*\([^)]*\)\s*/g, '').trim();

    results = await searchTMDb(title, 'pt-BR');
    if (results.length === 0 && simplifiedTitle !== title) {
        results = await searchTMDb(simplifiedTitle, 'pt-BR');
    }
    if (results.length === 0) {
        results = await searchTMDb(title, 'en-US');
    }
    if (results.length === 0 && simplifiedTitle !== title) {
        results = await searchTMDb(simplifiedTitle, 'en-US');
    }

    if (results && results.length > 0) {
        return results.reduce((prev, current) => (prev.popularity > current.popularity) ? prev : current);
    }
    return null;
}

export const fetchPosterUrl = async (title: string): Promise<string | null> => {
    try {
        const bestResult = await findBestTMDbMatchByTitle(title);
        if (bestResult && bestResult.poster_path) {
            return `https://image.tmdb.org/t/p/w500${bestResult.poster_path}`;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching poster for "${title}":`, error);
        return null; 
    }
};