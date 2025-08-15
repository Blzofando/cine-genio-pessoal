import React, { useContext, useState } from 'react';
import { WatchlistContext } from '../contexts/WatchlistContext';
import { WatchedDataContext } from '../App';
import { WatchlistItem, Rating } from '../types';

// Modal para escolher a avaliação ao mover item para a coleção
const RateModal = ({ item, onRate, onCancel }: { item: WatchlistItem, onRate: (rating: Rating) => void, onCancel: () => void }) => {
    const ratingOptions: { rating: Rating; emoji: string; label: string }[] = [
        { rating: 'amei', emoji: '😍', label: 'Amei' },
        { rating: 'gostei', emoji: '👍', label: 'Gostei' },
        { rating: 'meh', emoji: '😐', label: 'Meh' },
        { rating: 'naoGostei', emoji: '👎', label: 'Não Gostei' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Você assistiu a "{item.title}"!</h2>
                <p className="text-gray-400 mb-6">O que você achou?</p>
                <div className="flex justify-center gap-2 sm:gap-4 mb-6">
                    {ratingOptions.map(opt => (
                        <button key={opt.rating} onClick={() => onRate(opt.rating)} className="px-4 py-2 text-lg rounded-lg transition-all duration-200 flex flex-col items-center gap-1 w-20 bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white">
                            <span className="text-2xl">{opt.emoji}</span>
                            <span className="text-xs font-bold">{opt.label}</span>
                        </button>
                    ))}
                </div>
                <button onClick={onCancel} className="text-sm text-indigo-400 hover:underline">Cancelar</button>
            </div>
        </div>
    );
};


const WatchlistView: React.FC = () => {
    const { watchlist, removeFromWatchlist } = useContext(WatchlistContext);
    const { addItem, loading: isAdding } = useContext(WatchedDataContext);
    const [itemToRate, setItemToRate] = useState<WatchlistItem | null>(null);

    const handleMoveToCollection = async (rating: Rating) => {
        if (!itemToRate) return;

        try {
            // Adiciona à coleção principal (o addItem já faz a busca de detalhes)
            await addItem(itemToRate.title, rating);
            // Remove da watchlist após o sucesso
            await removeFromWatchlist(itemToRate.id);
        } catch (error) {
            console.error("Erro ao mover item para a coleção:", error);
        } finally {
            setItemToRate(null); // Fecha o modal
        }
    };

    return (
        <div className="p-4">
            {itemToRate && (
                <RateModal 
                    item={itemToRate}
                    onRate={handleMoveToCollection}
                    onCancel={() => setItemToRate(null)}
                />
            )}

            <h1 className="text-4xl font-bold text-white mb-8 text-center">Minha Lista para Ver</h1>

            {watchlist.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-2xl text-gray-400">Sua lista está vazia.</p>
                    <p className="text-gray-500 mt-2">Salve recomendações do Gênio para vê-las aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {watchlist.map(item => (
                        <div key={item.id} className="relative bg-gray-800 rounded-lg group overflow-hidden shadow-lg">
                            <img 
                                src={item.posterUrl || 'https://placehold.co/500x750/374151/9ca3af?text=?'} 
                                alt={`Pôster de ${item.title}`} 
                                className="w-full h-full object-cover aspect-[2/3]" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-center">
                                <h3 className="font-bold text-white text-base leading-tight mb-3">{item.title}</h3>
                                <button onClick={() => setItemToRate(item)} disabled={isAdding} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-2 rounded-lg text-sm mb-2 transition-colors disabled:bg-gray-500">
                                    Já Assisti
                                </button>
                                <button onClick={() => removeFromWatchlist(item.id)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-lg text-sm transition-colors">
                                    Remover
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WatchlistView;
