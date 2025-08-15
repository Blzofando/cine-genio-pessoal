import React, { useState, useMemo, useContext } from 'react';
import { Recommendation, ManagedWatchedItem, MediaType, SuggestionFilters } from '../types'; // Linha Corrigida
import { getPersonalizedSuggestion } from '../services/RecommendationService';
import { WatchedDataContext } from '../App';
import RecommendationCard from './RecommendationCard';

// ... (o restante do arquivo SuggestionView.tsx permanece o mesmo)
const getTopGenres = (amei: ManagedWatchedItem[], gostei: ManagedWatchedItem[], count = 10): string[] => {
    const genreCounts = new Map<string, number>();

    amei.forEach(item => {
        genreCounts.set(item.genre, (genreCounts.get(item.genre) || 0) + 2);
    });
    gostei.forEach(item => {
        genreCounts.set(item.genre, (genreCounts.get(item.genre) || 0) + 1);
    });

    const sortedGenres = [...genreCounts.entries()]
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([genre]) => genre);

    const topGenres = [...new Set(sortedGenres)];
    const defaultGenres = ['Ação', 'Comédia', 'Drama', 'Ficção Científica', 'Suspense', 'Terror', 'Romance', 'Aventura', 'Mistério', 'Fantasia'];

    while (topGenres.length < count) {
        const nextDefault = defaultGenres.find(g => !topGenres.includes(g));
        if (nextDefault) {
            topGenres.push(nextDefault);
        } else {
            break; 
        }
    }
    return topGenres.slice(0, count);
};

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mt-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <span className="text-lg text-gray-400">Buscando a sugestão perfeita...</span>
    </div>
  );

const SuggestionView: React.FC = () => {
  const { data: watchedData } = useContext(WatchedDataContext);
  const [filters, setFilters] = useState<SuggestionFilters>({
    category: null,
    genres: [],
    keywords: '',
  });
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSuggestions, setSessionSuggestions] = useState<string[]>([]);

  const topGenres = useMemo(() => getTopGenres(watchedData.amei, watchedData.gostei, 10), [watchedData]);

  const handleFilterChange = <K extends keyof SuggestionFilters>(
    key: K,
    value: SuggestionFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGenreToggle = (genreToToggle: string) => {
    const newGenres = filters.genres.includes(genreToToggle)
      ? filters.genres.filter(g => g !== genreToToggle)
      : [...filters.genres, genreToToggle];
    handleFilterChange('genres', newGenres);
  };

  const handleGetSuggestion = async () => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    try {
      const result = await getPersonalizedSuggestion(watchedData, filters, sessionSuggestions);
      setRecommendation(result);
      setSessionSuggestions(prev => [...prev, result.title]);
    } catch (err) {
      console.error(err);
      setError('Desculpe, não foi possível gerar uma sugestão. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFilterSection = (title: string, children: React.ReactNode) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-300 mb-3">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">Sugestão Personalizada</h1>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Refine sua busca para encontrar a recomendação ideal.
      </p>

      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-xl mb-8 text-left">
        {renderFilterSection('1. Escolha a Categoria',
            (['Filme', 'Série', 'Anime', 'Programa'] as const).map(cat => (
                <button key={cat} onClick={() => handleFilterChange('category', filters.category === cat ? null : cat)} className={`px-4 py-2 font-bold rounded-lg transition-colors duration-300 ${filters.category === cat ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                    {cat}
                </button>
            ))
        )}

        {renderFilterSection('2. Selecione Gêneros (Opcional)',
            topGenres.map(genre => (
                <button key={genre} onClick={() => handleGenreToggle(genre)} className={`px-4 py-2 font-bold rounded-lg transition-colors duration-300 ${filters.genres.includes(genre) ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                    {genre}
                </button>
            ))
        )}
        
        <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-300 mb-3">3. Adicione Palavras-Chave (Opcional)</h2>
            <input type="text" value={filters.keywords} onChange={(e) => handleFilterChange('keywords', e.target.value)} placeholder="Ex: viagem no tempo, suspense psicológico..." className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      
      <button onClick={handleGetSuggestion} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-indigo-500/50 disabled:bg-gray-500 disabled:scale-100">
        {isLoading ? 'Gerando...' : 'Gerar Sugestão'}
      </button>

      {isLoading && <LoadingSpinner />}
      {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>}

      {recommendation && <RecommendationCard recommendation={recommendation} />}
    </div>
  );
};

export default SuggestionView;