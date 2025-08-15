export type MediaType = 'Filme' | 'Série' | 'Anime' | 'Programa';

export type Rating = 'amei' | 'gostei' | 'meh' | 'naoGostei';

// Interface para um provedor de streaming (ex: Netflix)
export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

// Interface para agrupar os provedores por tipo (flatrate = assinatura)
export interface WatchProviders {
  link: string;
  flatrate?: WatchProvider[];
}

// A estrutura base para todos os itens
export interface WatchedItem {
  id: number; // ID do TMDb
  tmdbMediaType: 'movie' | 'tv';
  title: string;
  type: MediaType;
  genre: string;
}

// Representa um item totalmente gerenciado no estado do aplicativo
export interface ManagedWatchedItem extends WatchedItem {
  rating: Rating;
  synopsis?: string;
  createdAt: number;
  posterUrl?: string;
  voteAverage?: number; // Nota do público (0 a 10)
  watchProviders?: WatchProviders; // Onde assistir
}

// Estrutura que agrupa todos os itens por avaliação
export type AllManagedWatchedData = {
  [key in Rating]: ManagedWatchedItem[];
};

// Estrutura unificada para todas as recomendações e previsões
export interface Recommendation {
  title: string;
  type: MediaType;
  genre: string;
  synopsis: string;
  probabilities: {
    amei: number;
    gostei: number;
    meh: number;
    naoGostei: number;
  };
  analysis: string;
  posterUrl?: string;
}

// Adicionado aqui para ser acessível globalmente
export interface TMDbSearchResult {
    id: number;
    title?: string;
    name?: string;
    overview: string;
    popularity: number;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    genre_ids: number[];
    release_date?: string;
    first_air_date?: string;
}

// Enum para controlar a visão atual do aplicativo
export enum View {
  MENU,
  RANDOM,
  SUGGESTION,
  PREDICT,
  COLLECTION,
  STATS
}
