import React, { useState, useContext } from 'react';
import { WatchedDataContext } from '../App';
import { DuelResult } from '../types';
import { getDuelAnalysis } from '../services/RecommendationService';

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mt-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <span className="text-lg text-gray-400">O Gênio está analisando o confronto...</span>
    </div>
);

const DuelResultCard = ({ title, posterUrl, analysis, probability }: DuelResult['title1']) => (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center border border-gray-700 h-full">
        <img src={posterUrl || 'https://placehold.co/200x300/374151/9ca3af?text=?'} alt={`Pôster de ${title}`} className="w-32 h-48 object-cover rounded-md shadow-lg mb-4"/>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <div className="w-full bg-gray-700 rounded-full h-6 mb-4">
            <div className="bg-indigo-500 h-6 rounded-full flex items-center justify-center text-sm font-bold" style={{ width: `${probability}%` }}>
                {probability}%
            </div>
        </div>
        <p className="text-sm text-gray-400 flex-grow">{analysis}</p>
    </div>
);


const DuelView: React.FC = () => {
    const { data: watchedData } = useContext(WatchedDataContext);
    const [title1, setTitle1] = useState('');
    const [title2, setTitle2] = useState('');
    const [result, setResult] = useState<DuelResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDuel = async () => {
        if (!title1.trim() || !title2.trim()) {
            setError('Por favor, preencha os dois títulos para o duelo.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const duelResult = await getDuelAnalysis(title1, title2, watchedData);
            setResult(duelResult);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            console.error(err);
            setError(`Desculpe, não foi possível fazer a análise. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center p-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Duelo de Títulos</h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                Em dúvida entre dois filmes ou séries? Deixe o Gênio decidir qual tem mais a ver com você.
            </p>

            <div className="w-full max-w-2xl mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <input type="text" value={title1} onChange={(e) => setTitle1(e.target.value)} placeholder="Título 1" className="w-full bg-gray-800 text-white p-3 rounded-lg border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"/>
                <input type="text" value={title2} onChange={(e) => setTitle2(e.target.value)} placeholder="Título 2" className="w-full bg-gray-800 text-white p-3 rounded-lg border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"/>
            </div>
            <button onClick={handleDuel} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:bg-gray-600">
                {isLoading ? 'Analisando...' : 'Iniciar Duelo'}
            </button>

            {isLoading && <LoadingSpinner />}
            {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg w-full max-w-2xl">{error}</p>}

            {result && (
                <div className="mt-10 w-full max-w-4xl animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        <DuelResultCard {...result.title1} />
                        <DuelResultCard {...result.title2} />
                    </div>
                    <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-green-500/50">
                        <h3 className="text-xl font-bold text-green-400 mb-2">Veredito do Gênio</h3>
                        <p className="text-gray-300">{result.verdict}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuelView;
