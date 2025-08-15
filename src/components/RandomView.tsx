import React, { useState, useContext } from 'react';
import { Recommendation } from '../types';
import { getRandomSuggestion } from '../services/RecommendationService';
import { WatchedDataContext } from '../App';
import RecommendationCard from './RecommendationCard';

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
    <span className="text-lg text-gray-400">Gerando uma surpresa...</span>
  </div>
);

const RandomView: React.FC = () => {
  const { data: watchedData } = useContext(WatchedDataContext);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSuggestions, setSessionSuggestions] = useState<string[]>([]);

  const handleGetRandomSuggestion = async () => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    try {
      const result = await getRandomSuggestion(watchedData, sessionSuggestions);
      setRecommendation(result);
      setSessionSuggestions(prev => [...prev, result.title]);
    } catch (err) {
      console.error(err);
      setError('Desculpe, não foi possível gerar uma sugestão. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">Sugestão Aleatória</h1>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Descubra joias escondidas! Clique no botão abaixo e nosso CineGênio encontrará uma recomendação inesperada, mas que tem tudo a ver com você.
      </p>

      {!isLoading && (
        <button
          onClick={handleGetRandomSuggestion}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-indigo-500/50"
        >
          {recommendation ? 'Tentar Outra Vez' : 'Me Surpreenda!'}
        </button>
      )}

      {isLoading && <LoadingSpinner />}

      {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>}
      
      {recommendation && !isLoading && (
        <RecommendationCard recommendation={recommendation} />
      )}
    </div>
  );
};

export default RandomView;