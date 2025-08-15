import React, { useState, useContext, useEffect, useMemo } from 'react';
import { ManagedWatchedItem, Rating, WatchProvider } from '../types';
import { WatchedDataContext } from '../App';
import { getTMDbDetails, getProviders } from '../services/TMDbService';
import { updateWatchedItem } from '../services/firestoreService';

const ratingStyles: Record<Rating, { bg: string, text: string, border: string }> = {
    amei: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500' },
    gostei: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500' },
    meh: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500' },
    naoGostei: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500' }
};

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

// Componente para exibir os provedores de streaming
const WatchProvidersDisplay = ({ providers }: { providers: WatchProvider[] }) => (
    <div className="flex flex-wrap gap-3">
        {providers.map(p => (
            <img 
                key={p.provider_id} 
                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} 
                alt={p.provider_name}
                title={p.provider_name}
                className="w-12 h-12 rounded-lg object-cover bg-gray-700"
            />
        ))}
    </div>
);

// Interface para as propriedades do DetailsModal
interface DetailsModalProps {
    item: ManagedWatchedItem;
    onClose: () => void;
}

const DetailsModal = ({ item, onClose }: DetailsModalProps) => {
    const { removeItem } = useContext(WatchedDataContext);
    const [currentItem, setCurrentItem] = useState(item);
    const [isLoading, setIsLoading] = useState(false);

    // Efeito para buscar detalhes faltantes (sinopse, onde assistir)
    useEffect(() => {
        const needsUpdate = !currentItem.synopsis || !currentItem.watchProviders;
        if (needsUpdate) {
            setIsLoading(true);
            getTMDbDetails(currentItem.id, currentItem.tmdbMediaType)
                .then(details => {
                    const updatedDetails = {
                        synopsis: details.overview || "Sinopse não disponível.",
                        watchProviders: getProviders(details),
                        voteAverage: details.vote_average ? parseFloat(details.vote_average.toFixed(1)) : 0,
                    };
                    // Atualiza o item no Firebase
                    updateWatchedItem(currentItem.id, updatedDetails);
                    // Atualiza o estado local para exibir imediatamente
                    setCurrentItem(prev => ({ ...prev, ...updatedDetails }));
                })
                .catch(err => console.error("Failed to fetch extra details", err))
                .finally(() => setIsLoading(false));
        }
    }, [currentItem.id, currentItem.tmdbMediaType, currentItem.synopsis, currentItem.watchProviders]);

    const handleRemove = () => {
        if (window.confirm(`Tem certeza que deseja remover "${currentItem.title}" da sua coleção?`)) {
            removeItem(currentItem.id);
            onClose();
        }
    };

    const ratingStyle = ratingStyles[currentItem.rating];

    return (
        <Modal onClose={onClose}>
            <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    <img 
                        src={currentItem.posterUrl} 
                        alt={`Pôster de ${currentItem.title}`} 
                        className="w-40 h-60 object-cover rounded-lg shadow-md flex-shrink-0 mx-auto sm:mx-0" 
                    />
                    <div className="flex-grow">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{currentItem.title}</h2>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 text-sm text-gray-400">
                            <span className={`inline-block font-bold py-1 px-3 rounded-full text-xs border ${ratingStyle.bg} ${ratingStyle.text} ${ratingStyle.border}`}>
                                {currentItem.rating.toUpperCase()}
                            </span>
                            <span>{currentItem.type}</span>
                            <span>&bull;</span>
                            <span>{currentItem.genre}</span>
                            {currentItem.voteAverage && currentItem.voteAverage > 0 ? (
                                <>
                                 <span>&bull;</span>
                                 <span className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    <span className="font-bold text-white">{currentItem.voteAverage}</span>
                                 </span>
                                </>
                            ) : null}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-1">Sinopse</h3>
                        <p className="text-gray-400 text-sm">{isLoading ? 'Carregando...' : currentItem.synopsis}</p>
                    </div>
                </div>

                {/* Seção "Onde Assistir" */}
                {currentItem.watchProviders?.flatrate && currentItem.watchProviders.flatrate.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold text-gray-300 mb-3">Onde Assistir (Assinatura)</h3>
                        <WatchProvidersDisplay providers={currentItem.watchProviders.flatrate} />
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={handleRemove} className="w-full sm:w-auto flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                        Remover
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                        Fechar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

interface AddModalProps {
    onClose: () => void;
}

const AddModal = ({ onClose }: AddModalProps) => {
    const [title, setTitle] = useState('');
    const [rating, setRating] = useState<Rating>('gostei');
    const { addItem, loading: isAdding } = useContext(WatchedDataContext);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('O título não pode estar vazio.');
            return;
        }
        setError('');
        try {
            await addItem(title, rating);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao adicionar título.');
        }
    };

    return (
        <Modal onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Adicionar Novo Título</h2>
                <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título do Filme ou Série</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Interestelar"/>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Minha Avaliação</label>
                    <select value={rating} onChange={e => setRating(e.target.value as Rating)} className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="amei">Amei</option>
                        <option value="gostei">Gostei</option>
                        <option value="meh">Meh</option>
                        <option value="naoGostei">Não Gostei</option>
                    </select>
                </div>
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={isAdding} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                        {isAdding ? 'Adicionando...' : 'Adicionar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Interface para as propriedades do ItemCard
interface ItemCardProps {
    item: ManagedWatchedItem;
    onClick: () => void;
}

const ItemCard = ({ item, onClick }: ItemCardProps) => {
    const { updateItem } = useContext(WatchedDataContext);
    const [currentPosterUrl, setCurrentPosterUrl] = useState(item.posterUrl);
    const [isLoading, setIsLoading] = useState(!item.posterUrl);

    useEffect(() => {
        let isMounted = true;
        if (item.posterUrl === undefined) {
            setIsLoading(true);
            getTMDbDetails(item.id, item.tmdbMediaType)
                .then(details => {
                    if (isMounted) {
                        const newPosterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : 'not_found';
                        updateWatchedItem(item.id, { posterUrl: newPosterUrl });
                        setCurrentPosterUrl(newPosterUrl);
                        setIsLoading(false);
                    }
                })
                .catch(err => {
                    if (isMounted) {
                        console.error(`Failed to hydrate data for ${item.title}:`, err.message);
                        updateWatchedItem(item.id, { posterUrl: 'not_found' });
                        setCurrentPosterUrl('not_found');
                        setIsLoading(false);
                    }
                });
        } else {
            setIsLoading(false);
            setCurrentPosterUrl(item.posterUrl);
        }
        return () => { isMounted = false; };
    }, [item.posterUrl, item.id, item.tmdbMediaType, item.title, updateItem]);

    const ratingStyle = ratingStyles[item.rating];

    return (
        <div 
            onClick={onClick} 
            className="relative bg-gray-800 rounded-lg group cursor-pointer overflow-hidden shadow-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-300 aspect-[2/3]"
        >
            <div className="w-full h-full">
                {isLoading ? (
                    <div className="w-full h-full bg-gray-700 animate-pulse"></div>
                ) : currentPosterUrl && currentPosterUrl !== 'not_found' ? (
                    <img src={currentPosterUrl} alt={`Pôster de ${item.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-center p-2">
                        <span className="text-gray-500 text-sm">Pôster não disponível</span>
                    </div>
                )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-bold text-white text-base truncate leading-tight drop-shadow-md" title={item.title} style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>{item.title}</h3>
            </div>
             <div className={`absolute top-2 right-2 text-xs font-bold py-1 px-2 rounded-full border backdrop-blur-sm ${ratingStyle.bg} ${ratingStyle.text} ${ratingStyle.border}`}>
                {item.rating.toUpperCase()}
            </div>
        </div>
    );
};

const quickFilterConfig: { rating: Rating; emoji: string }[] = [
    { rating: 'amei', emoji: '😍' },
    { rating: 'gostei', emoji: '👍' },
    { rating: 'meh', emoji: '😐' },
    { rating: 'naoGostei', emoji: '👎' },
];

const CollectionView: React.FC = () => {
    const { data } = useContext(WatchedDataContext);
    const [modal, setModal] = useState<'add' | 'details' | null>(null);
    const [selectedItem, setSelectedItem] = useState<ManagedWatchedItem | null>(null);
    const [activeQuickFilter, setActiveQuickFilter] = useState<Rating | null>(null);
    const [advancedFiltersVisible, setAdvancedFiltersVisible] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const allItems: ManagedWatchedItem[] = useMemo(() => [...data.amei, ...data.gostei, ...data.meh, ...data.naoGostei], [data]);
    
    const availableGenres = useMemo(() => Array.from(new Set(allItems.map(item => item.genre))).sort(), [allItems]);
    const availableCategories = useMemo(() => Array.from(new Set(allItems.map(item => item.type))).sort(), [allItems]);

    const filteredItems = useMemo(() => {
        let items = allItems;
        if (searchQuery) items = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (activeQuickFilter) items = items.filter(item => item.rating === activeQuickFilter);
        if (selectedCategories.size > 0) items = items.filter(item => selectedCategories.has(item.type));
        if (selectedGenres.size > 0) items = items.filter(item => selectedGenres.has(item.genre));
        return items.sort((a, b) => b.createdAt - a.createdAt);
    }, [allItems, activeQuickFilter, selectedCategories, selectedGenres, searchQuery]);

    const handleItemClick = (item: ManagedWatchedItem) => {
        setSelectedItem(item);
        setModal('details');
    };

    const handleQuickFilterClick = (rating: Rating) => setActiveQuickFilter(prev => (prev === rating ? null : rating));
    const handleCategoryChange = (category: string) => setSelectedCategories(prev => { const newSet = new Set(prev); newSet.has(category) ? newSet.delete(category) : newSet.add(category); return newSet; });
    const handleGenreChange = (genre: string) => setSelectedGenres(prev => { const newSet = new Set(prev); newSet.has(genre) ? newSet.delete(genre) : newSet.add(genre); return newSet; });
    const clearAdvancedFilters = () => { setSelectedCategories(new Set()); setSelectedGenres(new Set()); };

    return (
        <div className="p-4">
            {modal === 'details' && selectedItem && <DetailsModal item={selectedItem} onClose={() => setModal(null)} />}
            {modal === 'add' && <AddModal onClose={() => setModal(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <h1 className="text-4xl font-bold text-white mb-4 sm:mb-0">Minha Coleção</h1>
                <div className="flex gap-2">
                    <button onClick={() => setModal('add')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">[+] Adicionar</button>
                </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <input type="text" placeholder="Buscar na coleção..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-auto flex-grow bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="flex gap-2">
                        {quickFilterConfig.map(({ rating, emoji }) => (
                            <button key={rating} onClick={() => handleQuickFilterClick(rating)} title={rating} className={`px-3 py-2 text-xl rounded-lg transition-all duration-300 ${activeQuickFilter === rating ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110' : 'bg-gray-700 hover:bg-gray-600'}`}>{emoji}</button>
                        ))}
                    </div>
                    <div className="sm:ml-auto flex items-center gap-2">
                         <button onClick={() => setAdvancedFiltersVisible(!advancedFiltersVisible)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 12.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                             Filtros {advancedFiltersVisible ? '▴' : '▾'}
                         </button>
                    </div>
                </div>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${advancedFiltersVisible ? 'max-h-96 mt-4' : 'max-h-0'}`}>
                    <div className="border-t border-gray-700 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-300">Categoria</h4>
                            <div className="space-y-2">{availableCategories.map(cat => (<label key={cat} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedCategories.has(cat)} onChange={() => handleCategoryChange(cat)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-600"/>{cat}</label>))}</div>
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="font-semibold mb-2 text-gray-300">Gênero</h4>
                            <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-600 p-3 rounded-md bg-gray-900/50">{availableGenres.map(genre => (<label key={genre} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedGenres.has(genre)} onChange={() => handleGenreChange(genre)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-600"/>{genre}</label>))}</div>
                        </div>
                    </div>
                     <button onClick={clearAdvancedFilters} className="text-sm text-indigo-400 hover:text-indigo-300 mt-4">Limpar Filtros</button>
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-2xl text-gray-400">Nenhum resultado encontrado.</p>
                    <p className="text-gray-500 mt-2">Tente ajustar seus filtros ou adicione mais itens à sua coleção.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id}>
                            <ItemCard item={item} onClick={() => handleItemClick(item)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CollectionView;
