import { WatchProviders, TMDbSearchResult } from "../types"; // Agora importa o TMDbSearchResult

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Fila de requisições para evitar erros de rate-limiting (429)
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
        if (!isProcessing) processQueue();
    });
};

// Função interna para buscar no TMDb
const internalSearchTMDb = async (query: string, lang: 'pt-BR' | 'en-US' = 'pt-BR'): Promise<TMDbSearchResult[]> => {
    const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=${lang}&page=1&api_key=${API_KEY}`;
    const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`A busca no TMDb falhou com o status: ${response.status}`);
    const data = await response.json();
    return data.results?.filter((r: any) => (r.media_type === 'movie' || r.media_type === 'tv')) || [];
};

// Função interna para buscar detalhes de um item
const internalGetTMDbDetails = async (id: number, mediaType: 'movie' | 'tv') => {
    const url = `${BASE_URL}/${mediaType}/${id}?language=pt-BR&api_key=${API_KEY}&append_to_response=watch/providers,credits`;
    let response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (response.status === 404) {
        const fallbackUrl = `${BASE_URL}/${mediaType}/${id}?language=en-US&api_key=${API_KEY}&append_to_response=watch/providers,credits`;
        response = await fetch(fallbackUrl, { method: 'GET', headers: { accept: 'application/json' } });
    }
    if (!response.ok) throw new Error(`A busca de detalhes no TMDb falhou com o status: ${response.status}`);
    return await response.json();
};

// Funções exportadas que usam a fila para evitar sobrecarga na API
export const searchTMDb = (query: string, lang: 'pt-BR' | 'en-US' = 'pt-BR') => 
    addToQueue(() => internalSearchTMDb(query, lang));

export const getTMDbDetails = (id: number, mediaType: 'movie' | 'tv') =>
    addToQueue(() => internalGetTMDbDetails(id, mediaType));

// Função para extrair os provedores de "Onde Assistir" para o Brasil
export const getProviders = (data: any): WatchProviders | undefined => {
    const providers = data?.['watch/providers']?.results?.BR;
    if (!providers) return undefined;
    return {
        link: providers.link,
        flatrate: providers.flatrate,
    };
};
