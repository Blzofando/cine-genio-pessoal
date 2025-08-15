import React, { useState, useContext, useEffect } from 'react';
import { WatchedDataContext } from '../App';
import { WatchlistContext } from '../contexts/WatchlistContext';
import { getPersonalizedRadar } from '../services/RecommendationService';
import { RadarRelease, WatchlistItem, ManagedWatchedItem } from '../types';

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mt-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <span className="text-lg text-gray-400">A procurar futuros favoritos no horizonte...</span>
    </div>
);

interface ReleaseCardProps {
    release: RadarRelease;
}

// CORREÇÃO: Declaramos o componente como React.FC<ReleaseCardProps>
const ReleaseCard: React.FC<ReleaseCardProps> = ({ release }) => {
    const { addToWatchlist, isInWatchlist } = useContext(WatchlistContext);
    const { data: watchedData } = useContext(WatchedDataContext);
    const [isSaved, setIsSaved] = useState(false);

    const isInCollection = Object.values(watchedData).flat().some((item: ManagedWatchedItem) => item.id === release.id);
    const showSaveButton = !isInCollection && !isInWatchlist(release.id) && !isSaved;

    const handleSaveToWatchlist = () => {
        const item: WatchlistItem = {
            id: release.id,
            tmdbMediaType: release.tmdbMediaType,
            title: release.title,
            posterUrl: release.posterUrl,
            addedAt: Date.now(),
        };
        addToWatchlist(item);
        setIsSaved(true);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row items-start gap-4 border border-gray-700">
            <img 
                src={release.posterUrl || 'https://placehold.co/150x225/374151/9ca3af?text=?'} 
                alt={`Pôster de ${release.title}`} 
                className="w-24 sm:w-28 h-auto object-cover rounded-md shadow-lg flex-shrink-0"
            />
            <div className="text-left flex-grow">
                <h3 className="text-xl font-bold text-white">{release.title}</h3>
                <p className="text-sm text-indigo-400 font-semibold mb-2">Lançamento: {new Date(release.releaseDate).toLocaleDateString()}</p>
                <p className="text-sm text-gray-300 mb-4"><span className="font-bold text-gray-400">Porquê está no seu radar:</span> {release.reason}</p>
                {showSaveButton && (
                    <button onClick={handleSaveToWatchlist} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                        + Salvar na Lista
                    </button>
                )}
                {isSaved && <p className="text-green-400 font-semibold text-sm">Salvo na sua lista!</p>}
                {isInWatchlist(release.id) && <p className="text-gray-400 font-semibold text-sm">Já está na sua lista.</p>}
                {isInCollection && <p className="text-gray-400 font-semibold text-sm">Já está na sua coleção.</p>}
            </div>
        </div>
    );
};


const RadarView: React.FC = () => {
    const { data: watchedData } = useContext(WatchedDataContext);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [releases, setReleases] = useState<RadarRelease[]>([]);

    useEffect(() => {
        const fetchRadar = async () => {
            if (Object.values(watchedData).flat().length === 0) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const personalizedReleases = await getPersonalizedRadar(watchedData);
                setReleases(personalizedReleases);
            } catch (err) {
                setError("Não foi possível procurar os lançamentos do radar.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRadar();
    }, [watchedData]);

    return (
        <div className="flex flex-col items-center p-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Radar de Lançamentos</h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                O Gênio vasculhou o futuro e encontrou estes próximos lançamentos que têm tudo a ver consigo.
            </p>

            {isLoading && <LoadingSpinner />}
            {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg w-full max-w-2xl">{error}</p>}

            {!isLoading && !error && releases.length === 0 && (
                 <div className="text-center py-16">
                    <p className="text-2xl text-gray-400">Nenhum lançamento relevante no radar por enquanto.</p>
                    <p className="text-gray-500 mt-2">Volte mais tarde para novas descobertas!</p>
                </div>
            )}

            {!isLoading && !error && releases.length > 0 && (
                <div className="w-full max-w-3xl space-y-4">
                    {releases.map(item => <ReleaseCard key={item.id} release={item} />)}
                </div>
            )}
        </div>
    );
};

export default RadarView;
