import React, { useContext, useState, useMemo, useEffect } from 'react';
import { WatchlistContext } from '../contexts/WatchlistContext';
import { WatchedDataContext } from '../App';
import { WatchlistItem, Rating, ManagedWatchedItem, WatchProvider } from '../types';
import { getTMDbDetails, getProviders } from '../services/TMDbService';

// --- Tipos Específicos da View ---
type SortType = 'addedAt-desc' | 'addedAt-asc' | 'title-asc' | 'title-desc';

// --- Componentes ---

// Modal Genérico
interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}
const Modal: React.FC<ModalProps> = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

// Componente para exibir logos de streaming
interface WatchProvidersDisplayProps {
    providers: WatchProvider[];
}
const WatchProvidersDisplay: React.FC<WatchProvidersDisplayProps> = ({ providers }) => (
    <div className="flex flex-wrap gap-3">
        {providers.map(p => (
            <img key={p.provider_id} src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className="w-12 h-12 rounded-lg object-cover bg-gray-700"/>
        ))}
    </div>
);

// Modal para Avaliar um Item
interface RateModalProps {
    item: WatchlistItem;
    onRate: (rating: Rating) => void;
    onCancel: () => void;
}
const RateModal: React.FC<RateModalProps> = ({ item, onRate, onCancel }) => {
    // ... (código do RateModal permanece o mesmo)
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


// Modal para Exibir Detalhes de um Item da Watchlist
interface DetailsModalProps {
    item: WatchlistItem;
    onClose: () => void;
    onMarkAsWatched: () => void;
}
const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose, onMarkAsWatched }) => {
    const [details, setDetails] = useState<Partial<ManagedWatchedItem> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        getTMDbDetails(item.id, item.tmdbMediaType)
            .then(data => {
                setDetails({
                    synopsis: data.overview || "Sinopse não disponível.",
                    watchProviders: getProviders(data),
                    voteAverage: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 0,
                    genre: data.genres?.[0]?.name || 'N/A',
                    type: data.media_type === 'movie' ? 'Filme' : 'Série',
                });
            })
            .catch(err => console.error("Failed to fetch details for watchlist item", err))
            .finally(() => setIsLoading(false));
    }, [item.id, item.tmdbMediaType]);

    return (
        <Modal onClose={onClose}>
            <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    {item.posterUrl && <img src={item.posterUrl} alt={`Pôster de ${item.title}`} className="w-40 h-60 object-cover rounded-lg shadow-md flex-shrink-0 mx-auto sm:mx-0" />}
                    <div className="flex-grow">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{item.title}</h2>
                        {isLoading ? <div className="h-8 bg-gray-700 rounded animate-pulse w-3/4"></div> : (
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 text-sm text-gray-400">
                                <span>{details?.type}</span>
                                <span>&bull;</span>
                                <span>{details?.genre}</span>
                                {details?.voteAverage && details.voteAverage > 0 && (
                                     <><span className="hidden sm:inline">&bull;</span><span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg><span className="font-bold text-white">{details.voteAverage}</span></span></>
                                )}
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-1">Sinopse</h3>
                        {isLoading ? <div className="h-24 bg-gray-700 rounded animate-pulse"></div> : <p className="text-gray-400 text-sm">{details?.synopsis}</p>}
                    </div>
                </div>
                {isLoading ? <div className="h-20 mt-6 bg-gray-700 rounded animate-pulse"></div> : (
                    details?.watchProviders?.flatrate && details.watchProviders.flatrate.length > 0 && (
                        <div className="mt-6"><h3 className="text-xl font-semibold text-gray-300 mb-3">Onde Assistir (Assinatura)</h3><WatchProvidersDisplay providers={details.watchProviders.flatrate} /></div>
                    )
                )}
                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={onMarkAsWatched} className="w-full sm:w-auto flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Já Assisti</button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};


// Modal para a Roleta
interface RouletteModalProps {
    item: WatchlistItem | null;
    onClose: () => void;
    onSpinAgain: () => void;
    onMarkAsWatched: (item: WatchlistItem) => void;
}
const RouletteModal: React.FC<RouletteModalProps> = ({ item, onClose, onSpinAgain, onMarkAsWatched }) => {
    if(!item) return null;
    return (
        <Modal onClose={onClose}>
             <div className="p-6 text-center">
                <img src={item.posterUrl || 'https://placehold.co/400x600/374151/9ca3af?text=?'} alt={`Pôster de ${item.title}`} className="w-48 h-72 object-cover rounded-lg shadow-lg mx-auto mb-4"/>
                <h3 className="text-2xl font-bold text-white">O Gênio escolheu:</h3>
                <p className="text-3xl font-bold text-indigo-400 mb-6">{item.title}</p>
                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={() => onMarkAsWatched(item)} className="w-full sm:w-auto flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Já Assisti</button>
                    <button onClick={onSpinAgain} className="w-full sm:w-auto flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Rodar a roleta</button>
                </div>
            </div>
        </Modal>
    )
};

// Modal de Filtros para a Watchlist
interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    tempSortType: SortType;
    setTempSortType: (sort: SortType) => void;
    onApply: () => void;
}
const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, tempSortType, setTempSortType, onApply }) => {
    if (!isOpen) return null;

    const sortOptions: {id: SortType, label: string}[] = [
        {id: 'addedAt-desc', label: 'Mais Recentes'},
        {id: 'addedAt-asc', label: 'Mais Antigos'},
        {id: 'title-asc', label: 'Título (A-Z)'},
        {id: 'title-desc', label: 'Título (Z-A)'}
    ];

    return (
        <Modal onClose={onClose}>
            <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Filtros e Ordenação</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-3">Ordenar por</h3>
                        <div className="flex flex-wrap gap-2">
                            {sortOptions.map(opt => (
                                <button key={opt.id} onClick={() => setTempSortType(opt.id)} className={`px-3 py-2 text-sm rounded-lg transition-colors ${tempSortType === opt.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{opt.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end">
                    <button onClick={onApply} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">Aplicar</button>
                </div>
            </div>
        </Modal>
    );
};


// --- Componente Principal da Watchlist ---
const WatchlistView: React.FC = () => {
    const { watchlist, removeFromWatchlist } = useContext(WatchlistContext);
    const { addItem, loading: isAdding } = useContext(WatchedDataContext);
    
    const [itemToRate, setItemToRate] = useState<WatchlistItem | null>(null);
    const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
    const [rouletteItem, setRouletteItem] = useState<WatchlistItem | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Estados de filtro
    const [appliedSortType, setAppliedSortType] = useState<SortType>('addedAt-desc');
    const [tempSortType, setTempSortType] = useState<SortType>(appliedSortType);
    
    const filteredAndSortedItems = useMemo(() => {
        let items = watchlist;
        if (searchQuery) {
            items = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return items.sort((a, b) => {
            switch (appliedSortType) {
                case 'title-asc': return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                case 'addedAt-asc': return a.addedAt - b.addedAt;
                case 'addedAt-desc':
                default: return b.addedAt - a.addedAt;
            }
        });
    }, [watchlist, searchQuery, appliedSortType]);


    const handleMoveToCollection = async (rating: Rating) => {
        const itemToMove = itemToRate || selectedItem;
        if (!itemToMove) return;
        try {
            await addItem(itemToMove.title, rating);
            await removeFromWatchlist(itemToMove.id);
        } catch (error) {
            console.error("Erro ao mover item para a coleção:", error);
        } finally {
            setItemToRate(null);
            setSelectedItem(null);
        }
    };

    const handleRouletteClick = () => {
        if (filteredAndSortedItems.length === 0) return;
        const randomIndex = Math.floor(Math.random() * filteredAndSortedItems.length);
        setRouletteItem(filteredAndSortedItems[randomIndex]);
    };

    const openFilterModal = () => {
        setTempSortType(appliedSortType);
        setIsFilterModalOpen(true);
    };

    const applyFilters = () => {
        setAppliedSortType(tempSortType);
        setIsFilterModalOpen(false);
    };

    return (
        <div className="p-4">
            {itemToRate && <RateModal item={itemToRate} onRate={handleMoveToCollection} onCancel={() => setItemToRate(null)}/>}
            {selectedItem && <DetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} onMarkAsWatched={() => setItemToRate(selectedItem)}/>}
            {rouletteItem && <RouletteModal item={rouletteItem} onClose={() => setRouletteItem(null)} onSpinAgain={handleRouletteClick} onMarkAsWatched={setItemToRate} />}
            <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} tempSortType={tempSortType} setTempSortType={setTempSortType} onApply={applyFilters} />

            <h1 className="text-4xl font-bold text-white mb-8 text-center">Watchlist</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-8 space-y-4">
                <input type="text" placeholder="Buscar na watchlist..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex justify-end gap-2">
                    <button onClick={openFilterModal} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">Filtros & Ordenação</button>
                    <button onClick={handleRouletteClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">🎲 Roleta</button>
                </div>
            </div>

            {filteredAndSortedItems.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-2xl text-gray-400">{searchQuery ? 'Nenhum resultado encontrado.' : 'Sua lista está vazia.'}</p>
                    <p className="text-gray-500 mt-2">{searchQuery ? 'Tente uma busca diferente.' : 'Salve recomendações do Gênio para vê-las aqui.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredAndSortedItems.map(item => (
                        <div key={item.id} className="relative bg-gray-800 rounded-lg group overflow-hidden shadow-lg cursor-pointer" onClick={() => setSelectedItem(item)}>
                            <img src={item.posterUrl || 'https://placehold.co/500x750/374151/9ca3af?text=?'} alt={`Pôster de ${item.title}`} className="w-full h-full object-cover aspect-[2/3]"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-center">
                                <h3 className="font-bold text-white text-base leading-tight mb-3">{item.title}</h3>
                                <button onClick={(e) => { e.stopPropagation(); setItemToRate(item); }} disabled={isAdding} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-2 rounded-lg text-sm mb-2 transition-colors disabled:bg-gray-500">Já Assisti</button>
                                <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-lg text-sm transition-colors">Remover</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WatchlistView;