import { WatchProviders, TMDbSearchResult } from "../types";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Lógica de fila de requisições para evitar sobrecarga na API
const requestQueue: (() => Promise<any>)[] = [];
let isProcessing = false;
const DELAY_BETWEEN_REQUESTS = 250;

const processQueue = async () => {
    if (isProcessing || requestQueue.length === 0) return;
    isProcessing = true;
    const requestTask = requestQueue.shift();
    if (requestTask) {
        try {
            await requestTask();
        } catch (error) {
            // O erro é tratado no bloco catch da função que o chama
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
        if (!isProcessing) processQueue();
    });
};

// --- Funções de Busca Internas ---

const internalSearchTMDb = async (query: string): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=pt-BR&page=1&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`A busca no TMDb falhou com o status: ${response.status}`);
    const data = await response.json();
    return data.results?.filter((r: any) => (r.media_type === 'movie' || r.media_type === 'tv')) || [];
};

const internalGetTMDbDetails = async (id: number, mediaType: 'movie' | 'tv') => {
    const url = `${BASE_URL}/${mediaType}/${id}?language=pt-BR&api_key=${API_KEY}&append_to_response=watch/providers,credits`;
    let response = await fetch(url);
    if (response.status === 404) {
        const fallbackUrl = `${BASE_URL}/${mediaType}/${id}?language=en-US&api_key=${API_KEY}&append_to_response=watch/providers,credits`;
        response = await fetch(fallbackUrl);
    }
    if (!response.ok) throw new Error(`A busca de detalhes no TMDb falhou com o status: ${response.status}`);
    return await response.json();
};

const internalGetUpcomingMovies = async (): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/movie/upcoming?language=pt-BR&page=1&region=BR&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`A busca de próximos lançamentos de filmes falhou: ${response.status}`);
    const data = await response.json();
    return data.results || [];
};

const internalGetOnTheAirTV = async (): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/tv/on_the_air?language=pt-BR&page=1&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`A busca de séries no ar falhou: ${response.status}`);
    const data = await response.json();
    return data.results || [];
};

const internalGetNowPlayingMovies = async (): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/movie/now_playing?language=pt-BR&page=1&region=BR&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao buscar filmes nos cinemas: ${response.status}`);
    const data = await response.json();
    return data.results || [];
};

const internalGetTopRatedOnProvider = async (providerId: number): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/discover/movie?language=pt-BR&watch_region=BR&sort_by=popularity.desc&with_watch_providers=${providerId}&page=1&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao buscar Top 10 do provedor: ${response.status}`);
    const data = await response.json();
    return data.results?.slice(0, 10) || [];
};

const internalGetTrending = async (): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/trending/all/week?language=pt-BR&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao buscar tendências: ${response.status}`);
    const data = await response.json();
    return data.results || [];
};


// --- Funções Exportadas ---

export const searchTMDb = (query: string) => { 
    return addToQueue(() => internalSearchTMDb(query)); 
};

export const getTMDbDetails = (id: number, mediaType: 'movie' | 'tv') => {
    return addToQueue(() => internalGetTMDbDetails(id, mediaType));
};

export const getProviders = (data: any): WatchProviders | undefined => {
    const providers = data?.['watch/providers']?.results?.BR;
    if (!providers) return undefined;
    return {
        link: providers.link,
        flatrate: providers.flatrate,
    };
};

export const fetchPosterUrl = async (title: string): Promise<string | null> => {
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

export const getUpcomingMovies = () => {
    return addToQueue(() => internalGetUpcomingMovies());
};

export const getOnTheAirTV = () => {
    return addToQueue(() => internalGetOnTheAirTV());
};

export const getNowPlayingMovies = () => {
    return addToQueue(() => internalGetNowPlayingMovies());
};

export const getTopRatedOnProvider = (id: number) => {
    return addToQueue(() => internalGetTopRatedOnProvider(id));
};

export const getTrending = () => {
    return addToQueue(() => internalGetTrending());
};