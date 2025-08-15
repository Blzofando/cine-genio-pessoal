import React, { useContext, useState, useMemo } from 'react';
import { Recommendation, WatchlistItem, ManagedWatchedItem } from '../types';
import { WatchlistContext } from '../contexts/WatchlistContext';
import { WatchedDataContext } from '../App';

const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
    const { title, type, genre, synopsis, analysis, probabilities, posterUrl, id, tmdbMediaType } = recommendation;
    
    const { addToWatchlist, isInWatchlist } = useContext(WatchlistContext);
    const { data: watchedData } = useContext(WatchedDataContext);
    const [isSaved, setIsSaved] = useState(false);

    const isInCollection = useMemo(() => {
        return Object.values(watchedData).flat().some((item: ManagedWatchedItem) => item.id === id);
    }, [watchedData, id]);

    const handleSaveToWatchlist = () => {
        const item: WatchlistItem = {
            id,
            tmdbMediaType,
            title,
            posterUrl,
            addedAt: Date.now(),
        };
        addToWatchlist(item);
        setIsSaved(true);
    };

    const probabilityColors: Record<string, string> = {
        amei: 'bg-green-500',
        gostei: 'bg-indigo-500',
        meh: 'bg-yellow-500',
        naoGostei: 'bg-red-500',
    };

    const showSaveButton = !isInCollection && !isInWatchlist(id) && !isSaved;

    return (
        <div className="mt-8 w-full max-w-4xl mx-auto animate-fade-in">
            <div className="relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                {posterUrl && <div className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url(${posterUrl})` }} />}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-lg" />

                <div className="relative p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div className="md:col-span-1 flex justify-center items-start">
                        {posterUrl ? (
                             <img src={posterUrl} alt={`Pôster de ${title}`} className="w-48 md:w-full max-w-xs rounded-lg shadow-2xl"/>
                        ) : (
                            <div className="w-48 md:w-full max-w-xs aspect-[2/3] bg-gray-700 rounded-lg flex items-center justify-center">
                                <span className="text-gray-500">Sem Pôster</span>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 text-white">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">{title}</h2>
                        <div className="flex items-center gap-4 my-3 text-sm text-gray-300 font-medium">
                            <span>{type}</span>
                            <span className="text-indigo-400">&bull;</span>
                            <span>{genre}</span>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-indigo-300 mb-1">Sinopse</h3>
                                <p className="text-gray-200 text-sm leading-relaxed">{synopsis}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-indigo-300 mb-1">Análise do Gênio</h3>
                                <p className="text-gray-200 text-sm leading-relaxed">{analysis}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Probabilidades de Gosto</h3>
                            <div className="space-y-2">
                                {Object.entries(probabilities).map(([key, value]) => (
                                    <div key={key} className="flex items-center">
                                        <span className="w-24 text-sm text-gray-300 capitalize">{key === 'naoGostei' ? 'Não Gostei' : key}</span>
                                        <div className="flex-1 bg-white/10 rounded-full h-5 overflow-hidden">
                                            <div className={`${probabilityColors[key]} h-full flex items-center justify-end text-xs font-bold pr-2 text-white transition-all duration-500`} style={{ width: `${value}%` }}>
                                               {value > 10 ? `${value}%` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {showSaveButton && (
                             <div className="mt-8">
                                <button onClick={handleSaveToWatchlist} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                                    + Salvar na Lista para Ver
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
