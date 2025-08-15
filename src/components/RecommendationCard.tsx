import React from 'react';
import { Recommendation } from '../types';

const OldCard = ({ recommendation }: { recommendation: Recommendation }) => {
    const probabilityColors = {
        amei: 'bg-green-500',
        gostei: 'bg-indigo-500',
        meh: 'bg-yellow-500',
        naoGostei: 'bg-red-500',
    };
    return (
        <div className="mt-8 w-full max-w-2xl animate-fade-in">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 text-left border border-gray-700">
                <h2 className="text-3xl font-bold text-indigo-400">{recommendation.title}</h2>
                <div className="flex items-center gap-4 my-3 text-sm text-gray-400">
                    <span>{recommendation.type}</span>
                    <span>&bull;</span>
                    <span>{recommendation.genre}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-1">Sinopse</h3>
                <p className="text-gray-400">{recommendation.synopsis}</p>
                
                <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-1">Análise do Gênio</h3>
                <p className="text-gray-400">{recommendation.analysis}</p>

                <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-2">Probabilidades de Gosto</h3>
                <div className="space-y-2">
                    {Object.entries(recommendation.probabilities).map(([key, value]) => (
                        <div key={key} className="flex items-center">
                            <span className="w-24 text-sm text-gray-400 capitalize">{key === 'naoGostei' ? 'Não Gostei' : key}</span>
                            <div className="flex-1 bg-gray-700 rounded-full h-5">
                                <div
                                    className={`${probabilityColors[key as keyof typeof probabilityColors]} h-full rounded-full flex items-center justify-end text-xs font-bold pr-2 text-white`}
                                    style={{ width: `${value}%` }}
                                >
                                   {value > 10 ? `${value}%` : ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
    const { title, type, genre, synopsis, analysis, probabilities, posterUrl } = recommendation;

    if (!posterUrl) {
        return <OldCard recommendation={recommendation} />;
    }
    
    const probabilityColors = {
        amei: 'bg-green-500',
        gostei: 'bg-indigo-500',
        meh: 'bg-yellow-500',
        naoGostei: 'bg-red-500',
    };

    return (
        <div className="mt-8 w-full max-w-4xl mx-auto animate-fade-in">
            <div className="relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                {/* Background Layer */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                    style={{ backgroundImage: `url(${posterUrl})` }}
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-lg" />

                {/* Foreground Content */}
                <div className="relative p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Poster */}
                    <div className="md:col-span-1 flex justify-center items-start">
                        <img
                            src={posterUrl}
                            alt={`Pôster de ${title}`}
                            className="w-48 md:w-full max-w-xs rounded-lg shadow-2xl transform transition-transform duration-300 hover:scale-105"
                        />
                    </div>

                    {/* Details */}
                    <div className="md:col-span-2 text-white">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.7)'}}>{title}</h2>
                        <div className="flex items-center gap-4 my-3 text-sm text-gray-300 font-medium">
                            <span>{type}</span>
                            <span className="text-indigo-400">&bull;</span>
                            <span>{genre}</span>
                        </div>

                        <div className="mt-4 space-y-4 text-shadow-sm">
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
                                            <div
                                                className={`${probabilityColors[key as keyof typeof probabilityColors]} h-full flex items-center justify-end text-xs font-bold pr-2 text-white transition-all duration-500`}
                                                style={{ width: `${value}%` }}
                                            >
                                               {value > 10 ? `${value}%` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
