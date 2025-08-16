import React, { useState, useContext, useEffect } from 'react';
import { WatchedDataContext } from '../App';
import { Challenge } from '../types';
import { getWeeklyChallenge, updateChallenge } from '../services/ChallengeService';
import { fetchPosterUrl } from '../services/TMDbService';

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mt-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <span className="text-lg text-gray-400">O Gênio está a preparar o seu desafio...</span>
    </div>
);

// --- Componente para um passo individual em um desafio de múltiplos passos ---
interface StepCardProps {
    step: Challenge['steps'][number];
    onToggleStep: () => void;
}
const StepCard: React.FC<StepCardProps> = ({ step, onToggleStep }) => {
    const [posterUrl, setPosterUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        // Busca o pôster do passo individualmente
        fetchPosterUrl(step.title).then(url => setPosterUrl(url ?? undefined));
    }, [step.title]);

    return (
        <div className="relative bg-gray-800 rounded-lg group overflow-hidden shadow-lg cursor-pointer" onClick={onToggleStep}>
            <img 
                src={posterUrl || 'https://placehold.co/500x750/374151/9ca3af?text=?'} 
                alt={`Pôster de ${step.title}`} 
                className="w-full h-full object-cover aspect-[2/3] transition-transform duration-300 group-hover:scale-105"
            />
            {step.completed && (
                <div className="absolute inset-0 bg-green-900/70 backdrop-blur-sm flex flex-col items-center justify-center">
                    <span className="text-5xl">✅</span>
                    <span className="text-xl font-bold text-white mt-2">CONCLUÍDO</span>
                </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent"></div>
            <p className="absolute bottom-2 left-2 right-2 text-white font-bold text-center text-sm">{step.title}</p>
        </div>
    );
};


const ChallengeView: React.FC = () => {
    const { data: watchedData } = useContext(WatchedDataContext);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Busca o desafio da semana do Firebase
    useEffect(() => {
        const loadChallenge = async () => {
            if (Object.values(watchedData).flat().length === 0) {
                setError("Você precisa ter itens na sua coleção para gerar um desafio.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const challengeFromDb = await getWeeklyChallenge(watchedData);
                setChallenge(challengeFromDb);
            } catch (err) {
                setError("Não foi possível gerar o desafio desta semana. Tente mais tarde.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadChallenge();
    }, [watchedData]);

    // Função para marcar/desmarcar um passo em um desafio de múltiplos passos
    const handleToggleStep = async (stepIndex: number) => {
        if (!challenge || !challenge.steps) return;

        const newSteps = [...challenge.steps];
        newSteps[stepIndex].completed = !newSteps[stepIndex].completed;

        const allStepsCompleted = newSteps.every(step => step.completed);

        const updatedChallenge: Challenge = {
            ...challenge,
            steps: newSteps,
            status: allStepsCompleted ? 'completed' : 'active',
        };

        setChallenge(updatedChallenge); // Atualiza a UI imediatamente
        await updateChallenge(updatedChallenge); // Salva no Firebase
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
                <div className="w-full max-w-4xl bg-gray-800 border border-indigo-500/30 rounded-xl shadow-2xl p-6 animate-fade-in">
                    <span className="inline-block bg-indigo-500/20 text-indigo-300 font-bold py-1 px-3 rounded-full text-sm border border-indigo-500 mb-4">
                        {challenge.challengeType}
                    </span>
                    
                    {challenge.steps && challenge.steps.length > 0 ? (
                        // --- VISÃO PARA DESAFIO DE MÚLTIPLOS PASSOS ---
                        <div>
                            <p className="text-gray-300 mt-2 mb-6">{challenge.reason}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {challenge.steps.map((step, index) => (
                                    <StepCard 
                                        key={step.tmdbId} 
                                        step={step} 
                                        onToggleStep={() => handleToggleStep(index)} 
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        // --- VISÃO PARA DESAFIO DE PASSO ÚNICO ---
                        <div className="flex flex-col items-center">
                            <img 
                                src={challenge.posterUrl || 'https://placehold.co/400x600/374151/9ca3af?text=?'} 
                                alt={`Pôster de ${challenge.title}`}
                                className="w-48 h-72 object-cover rounded-lg shadow-lg mx-auto mb-4"
                            />
                            <h2 className="text-3xl font-bold text-white">{challenge.title}</h2>
                            <p className="text-gray-300 mt-2 mb-6">{challenge.reason}</p>
                            {/* Aqui poderiam entrar os botões de "Adicionar à Watchlist" etc. para o desafio de passo único */}
                        </div>
                    )}

                    {challenge.status === 'completed' && (
                        <div className="mt-6 bg-green-500/20 text-green-300 font-bold py-3 px-4 rounded-lg border border-green-500">
                            Desafio Concluído! Bom trabalho!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChallengeView;