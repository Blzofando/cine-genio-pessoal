import React, { useState, useContext, useEffect } from 'react';
import { WatchedDataContext } from '../App';
import { Challenge, ChallengeStep, WatchProvider } from '../types';
import { getWeeklyChallenge, updateChallenge } from '../services/ChallengeService';
import { fetchPosterUrl, getTMDbDetails, getProviders } from '../services/TMDbService';

const LoadingSpinner = () => ( <div className="flex flex-col items-center justify-center space-y-2 mt-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div><span className="text-lg text-gray-400">O Gênio está a preparar o seu desafio...</span></div>);
const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => ( <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>{children}</div></div>);
const WatchProvidersDisplay: React.FC<{ providers: WatchProvider[] }> = ({ providers }) => ( <div className="flex flex-wrap gap-3">{providers.map(p => (<img key={p.provider_id} src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className="w-12 h-12 rounded-lg object-cover bg-gray-700"/>))}</div>);


// --- NOVO MODAL DE DETALHES PARA DESAFIOS ---
interface ChallengeDetailsModalProps {
    item: { title: string, tmdbId: number, tmdbMediaType?: 'movie' | 'tv' };
    isCompleted: boolean;
    onClose: () => void;
    onComplete: () => void;
}
const ChallengeDetailsModal: React.FC<ChallengeDetailsModalProps> = ({ item, isCompleted, onClose, onComplete }) => {
    const [details, setDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!item.tmdbMediaType) return; // Não busca detalhes se não tiver o tipo de mídia
        setIsLoading(true);
        getTMDbDetails(item.tmdbId, item.tmdbMediaType)
            .then(data => setDetails(data))
            .catch(err => console.error("Falha ao buscar detalhes do desafio", err))
            .finally(() => setIsLoading(false));
    }, [item.tmdbId, item.tmdbMediaType]);

    return (
        <Modal onClose={onClose}>
            <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-4">{item.title}</h2>
                {isLoading ? <div className="h-48 bg-gray-700 rounded animate-pulse"></div> : (
                    <div>
                        <p className="text-gray-400 text-sm mb-4">{details?.overview || "Sinopse não disponível."}</p>
                        {details?.['watch/providers']?.results?.BR?.flatrate && (
                            <div><h3 className="text-xl font-semibold text-gray-300 mb-3">Onde Assistir</h3><WatchProvidersDisplay providers={details['watch/providers'].results.BR.flatrate} /></div>
                        )}
                    </div>
                )}
                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={onComplete} className={`w-full sm:w-auto flex-1 font-bold py-2 px-4 rounded-lg ${isCompleted ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`}>
                        {isCompleted ? 'Desmarcar Concluído' : 'Marcar como Concluído'}
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};


// --- Componente para um passo individual ---
interface StepCardProps {
    step: ChallengeStep;
    onClick: () => void;
}
const StepCard: React.FC<StepCardProps> = ({ step, onClick }) => {
    const [posterUrl, setPosterUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        fetchPosterUrl(step.title).then(url => setPosterUrl(url ?? undefined));
    }, [step.title]);

    return (
        <div className="relative bg-gray-800 rounded-lg group overflow-hidden shadow-lg cursor-pointer" onClick={onClick}>
            <img src={posterUrl || 'https://placehold.co/500x750/374151/9ca3af?text=?'} alt={`Pôster de ${step.title}`} className="w-full h-full object-cover aspect-[2/3] transition-transform duration-300 group-hover:scale-105"/>
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
    const [selectedItem, setSelectedItem] = useState<{ step: ChallengeStep, index: number } | Challenge | null>(null);

    useEffect(() => {
        // ... (lógica de carregamento do desafio inalterada) ...
    }, [watchedData]);

    const handleToggleStep = async (stepIndex: number) => {
        if (!challenge || !challenge.steps) return;
        const newSteps = [...challenge.steps];
        newSteps[stepIndex].completed = !newSteps[stepIndex].completed;
        const allStepsCompleted = newSteps.every(step => step.completed);
        const updatedChallenge: Challenge = { ...challenge, steps: newSteps, status: allStepsCompleted ? 'completed' : 'active' };
        setChallenge(updatedChallenge);
        await updateChallenge(updatedChallenge);
        setSelectedItem(null); // Fecha o modal
    };

    const handleToggleSingleChallenge = async () => {
        if (!challenge) return;
        const newStatus = challenge.status === 'completed' ? 'active' : 'completed';
        const updatedChallenge: Challenge = { ...challenge, status: newStatus };
        setChallenge(updatedChallenge);
        await updateChallenge(updatedChallenge);
        setSelectedItem(null); // Fecha o modal
    };
    
    return (
        <div className="flex flex-col items-center p-4 text-center">
            {/* ... Título e subtítulo ... */}

            {isLoading && <LoadingSpinner />}
            {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>}
            
            {/* Modal de Detalhes */}
            {selectedItem && (
                <ChallengeDetailsModal
                    // Lógica para determinar qual item foi clicado
                    item={ 'steps' in selectedItem ? selectedItem.steps![selectedItem.index] : selectedItem }
                    isCompleted={ 'steps' in selectedItem ? selectedItem.steps![selectedItem.index].completed : selectedItem.status === 'completed' }
                    onClose={() => setSelectedItem(null)}
                    onComplete={() => 'steps' in selectedItem ? handleToggleStep(selectedItem.index) : handleToggleSingleChallenge()}
                />
            )}

            {!isLoading && challenge && (
                <div className="w-full max-w-4xl bg-gray-800 border border-indigo-500/30 rounded-xl shadow-2xl p-6 animate-fade-in">
                    <span className="inline-block bg-indigo-500/20 text-indigo-300 font-bold py-1 px-3 rounded-full text-sm border border-indigo-500 mb-4">
                        {challenge.challengeType}
                    </span>
                    
                    {challenge.steps && challenge.steps.length > 0 ? (
                        <div>
                            <p className="text-gray-300 mt-2 mb-6">{challenge.reason}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {challenge.steps.map((step, index) => (
                                    <StepCard key={step.tmdbId} step={step} onClick={() => setSelectedItem({ ...challenge, index })} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center cursor-pointer" onClick={() => setSelectedItem(challenge)}>
                            <img src={challenge.posterUrl || '...'} alt={`Pôster de ${challenge.title}`} className="w-48 h-72 object-cover rounded-lg shadow-lg mx-auto mb-4"/>
                            <h2 className="text-3xl font-bold text-white">{challenge.title}</h2>
                            <p className="text-gray-300 mt-2 mb-6">{challenge.reason}</p>
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