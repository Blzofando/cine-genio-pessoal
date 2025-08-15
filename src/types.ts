export type MediaType = 'Filme' | 'Série' | 'Anime' | 'Programa';

// A estrutura base para todos os itens, agora exigindo o ID do TMDb.
export interface WatchedItem {
  id: number; // ID do TMDb é agora o identificador principal e obrigatório
  tmdbMediaType: 'movie' | 'tv';
  title: string;
  type: MediaType;
  genre: string;
}

export type Rating = 'amei' | 'gostei' | 'meh' | 'naoGostei';

// Representa um item totalmente gerenciado no estado do aplicativo.
export interface ManagedWatchedItem extends WatchedItem {
  rating: Rating;
  synopsis?: string;
  createdAt: number;
  posterUrl?: string;
}

export type AllManagedWatchedData = {
  [key in Rating]: ManagedWatchedItem[];
};

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

export interface PredictionResult {
  prediction: string;
  reason: string;
}

export enum View {
  MENU,
  RANDOM,
  SUGGESTION,
  PREDICT,
  COLLECTION,
  STATS
}
