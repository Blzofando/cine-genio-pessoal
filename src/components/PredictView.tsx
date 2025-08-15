import React, { useState, useContext } from 'react';
import { PredictionResult } from '../types';
import { getPrediction } from '../services/RecommendationService';
import { WatchedDataContext } from '../App';

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mt-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <span className="text-lg text-gray-400">Analisando os confins do cinema...</span>
    </div>
);

const PredictView: React.FC = () => {
  const { data: watchedData } = useContext(WatchedDataContext);
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!title.trim()) {
      setError('Por favor, digite o nome de um filme ou série.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const predictionResult = await getPrediction(title, watchedData);
      setResult(predictionResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      console.error(err);
      setError(`Desculpe, não foi possível fazer a análise. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getVerdictChipStyle = (prediction: string): string => {
    const p = prediction.toUpperCase();
    if (p.includes('AMAR')) return 'bg-green-500/20 text-green-300 border-green-500';
    if (p.includes('GOSTAR')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500';
    if (p.includes('RESSALVAS')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
    if (p.includes('NÃO É PARA VOCÊ') || p.includes('NÃO GOSTAR')) return 'bg-red-500/20 text-red-300 border-red-500';
    return 'bg-gray-500/20 text-gray-300 border-gray-500';
  };

  return (
    <div className="flex flex-col items-center p-4 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">Será que vou gostar?</h1>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Digite o nome de um filme ou série e o CineGênio analisará se tem a ver com seu perfil.
      </p>

      <div className="w-full max-w-lg mb-8">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => {
                setTitle(e.target.value);
                if(error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleAnalyze()}
            placeholder="Ex: Blade Runner 2049"
            className="flex-grow bg-gray-800 text-white p-4 rounded-lg border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg"
            aria-label="Título do filme ou série"
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-indigo-500/50 disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analisando...' : 'Analisar'}
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <p className="mt-4 text-red-400 bg-red-900/50 p-4 rounded-lg w-full max-w-lg">{error}</p>}

      {result && (
        <div className="mt-8 w-full max-w-2xl animate-fade-in" role="alert">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 text-left border border-gray-700">
              <div className={`inline-block font-bold py-1 px-3 rounded-full text-lg mb-4 border ${getVerdictChipStyle(result.prediction)}`}>
                  {result.prediction}
              </div>
              <p className="text-gray-300 text-lg whitespace-pre-wrap">{result.reason}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default PredictView;