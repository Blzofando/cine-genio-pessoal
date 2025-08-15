import React, { useState, useContext, useEffect, useCallback } from 'react';
import { WatchedDataContext } from '../App';
import { WatchlistContext } from '../contexts/WatchlistContext';
import { Challenge, WatchlistItem, Rating } from '../types';
import { generateWeeklyChallenge } from '../services/ChallengeService';
import { fetchPosterUrl } from '../services/TMDbService';

// --- Helpers ---
const getWeekId = () => {
    const now = new Date();
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
    return `${firstDay.getFullYear()}-${firstDay.getMonth()}-${firstDay.getDate()}`;
};

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mt-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <span className="text-lg text-gray-400">O Gênio está a preparar o seu desafio...</span>
    </div>
);

const ChallengeView: React.FC = () => {
    const { data: watchedData, addItem } = useContext(WatchedDataContext);
    const { addToWatchlist, isInWatchlist } = useContext(WatchlistContext);
    
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);

    const completeChallenge = useCallback(() => {
        if (challenge) {
            localStorage.setItem(`challenge_${challenge.weekId}_completed`, 'true');
            setIsCompleted(true);
        }
    }, [challenge]);

    useEffect(() => {
        const loadChallenge = async () => {
            setIsLoading(true);
            const weekId = getWeekId();
            const storedChallenge = localStorage.getItem(`challenge_${weekId}`);
            const challengeCompleted = localStorage.getItem(`challenge_${weekId}_completed`) === 'true';

            if (storedChallenge) {
                const parsedChallenge = JSON.parse(storedChallenge) as Challenge;
                setChallenge(parsedChallenge);
                setIsCompleted(challengeCompleted);
                setIsLoading(false);
            } else {
                try {
                    const newChallengeData = await generateWeeklyChallenge(watchedData);
                    const posterUrl = await fetchPosterUrl(newChallengeData.title);
                    
                    const newChallenge: Challenge = {
                        ...newChallengeData,
                        posterUrl: posterUrl ?? undefined,
                        weekId: weekId,
                    };

                    localStorage.setItem(`challenge_${weekId}`, JSON.stringify(newChallenge));
                    setChallenge(newChallenge);
                    setIsCompleted(false);
                } catch (err) {
                    setError("Não foi possível gerar o desafio desta semana. Tente mais tarde.");
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadChallenge();
    }, [watchedData]);

    const handleAddToWatchlist = () => {
        if (!challenge) return;
        const item: WatchlistItem = {
            id: challenge.tmdbId,
            tmdbMediaType: challenge.tmdbMediaType,
            title: challenge.title,
            posterUrl: challenge.posterUrl,
            addedAt: Date.now(),
        };
        addToWatchlist(item);
        completeChallenge(); // Marcar como concluído ao adicionar à lista
    };

    const handleMarkAsWatched = async () => {
        if (!challenge) return;
        // Simplesmente adiciona à coleção com uma avaliação padrão 'gostei'
        // O modal de avaliação da watchlist pode ser usado no futuro para mais opções
        await addItem(challenge.title, 'gostei');
        completeChallenge();
    };

    return (
        <div className="flex flex-col items-center p-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Desafio do Gênio</h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                Expanda os seus horizontes com uma nova sugestão a cada semana!
            </p>

            {isLoading && <LoadingSpinner />}
            {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>}

            {!isLoading && challenge && (
                <div className="w-full max-w-lg bg-gray-800 border border-indigo-500/30 rounded-xl shadow-2xl p-6 animate-fade-in">
                    <span className="inline-block bg-indigo-500/20 text-indigo-300 font-bold py-1 px-3 rounded-full text-sm border border-indigo-500 mb-4">
                        {challenge.challengeType}
                    </span>
                    <img 
                        src={challenge.posterUrl || 'https://placehold.co/400x600/374151/9ca3af?text=?'} 
                        alt={`Pôster de ${challenge.title}`}
                        className="w-48 h-72 object-cover rounded-lg shadow-lg mx-auto mb-4"
                    />
                    <h2 className="text-3xl font-bold text-white">{challenge.title}</h2>
                    <p className="text-gray-300 mt-2 mb-6">{challenge.reason}</p>

                    {isCompleted ? (
                        <div className="bg-green-500/20 text-green-300 font-bold py-3 px-4 rounded-lg border border-green-500">
                            Desafio Concluído! Bom trabalho!
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={handleAddToWatchlist} disabled={isInWatchlist(challenge.tmdbId)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                                {isInWatchlist(challenge.tmdbId) ? "Já está na Lista" : "Adicionar à Lista"}
                            </button>
                            <button onClick={handleMarkAsWatched} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                Já Assisti
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChallengeView;
