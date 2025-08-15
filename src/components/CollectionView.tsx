import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { ManagedWatchedItem, Rating, TMDbSearchResult, WatchProvider } from '../types';
import { WatchedDataContext } from '../App';
import { getTMDbDetails, getProviders, searchTMDb } from '../services/TMDbService';
import { updateWatchedItem } from '../services/firestoreService';

// --- Estilos e Configurações ---
const ratingStyles: Record<Rating, { bg: string, text: string, border: string }> = {
    amei: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500' },
    gostei: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500' },
    meh: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500' },
    naoGostei: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500' }
};

const ratingOptions: { rating: Rating; emoji: string; label: string }[] = [
    { rating: 'amei', emoji: '😍', label: 'Amei' },
    { rating: 'gostei', emoji: '👍', label: 'Gostei' },
    { rating: 'meh', emoji: '😐', label: 'Meh' },
    { rating: 'naoGostei', emoji: '👎', label: 'Não Gostei' },
];

type SortType = 'createdAt' | 'title-asc' | 'title-desc' | 'release-asc' | 'release-desc';

// --- Componentes do Modal ---

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

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

const DetailsModal = ({ item, onClose }: { item: ManagedWatchedItem, onClose: () => void }) => {
    const { removeItem } = useContext(WatchedDataContext);
    const [currentItem, setCurrentItem] = useState(item);
    const [isLoading, setIsLoading] = useState(false);

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
                    updateWatchedItem(currentItem.id, updatedDetails);
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
                    {currentItem.posterUrl && <img src={currentItem.posterUrl} alt={`Pôster de ${currentItem.title}`} className="w-40 h-60 object-cover rounded-lg shadow-md flex-shrink-0 mx-auto sm:mx-0" />}
                    <div className="flex-grow">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{currentItem.title}</h2>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 text-sm text-gray-400">
                            <span className={`inline-block font-bold py-1 px-3 rounded-full text-xs border ${ratingStyle.bg} ${ratingStyle.text} ${ratingStyle.border}`}>{currentItem.rating.toUpperCase()}</span>
                            <span>{currentItem.type}</span>
                            <span>&bull;</span>
                            <span>{currentItem.genre}</span>
                            {currentItem.voteAverage && currentItem.voteAverage > 0 && (
                                 <><span className="hidden sm:inline">&bull;</span><span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg><span className="font-bold text-white">{currentItem.voteAverage}</span></span></>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-300 mt-4 mb-1">Sinopse</h3>
                        <p className="text-gray-400 text-sm">{isLoading ? 'Carregando...' : currentItem.synopsis}</p>
                    </div>
                </div>
                {currentItem.watchProviders?.flatrate && currentItem.watchProviders.flatrate.length > 0 && (
                    <div className="mt-6"><h3 className="text-xl font-semibold text-gray-300 mb-3">Onde Assistir (Assinatura)</h3><WatchProvidersDisplay providers={currentItem.watchProviders.flatrate} /></div>
                )}
                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={handleRemove} className="w-full sm:w-auto flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">Remover</button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};

// --- AddModal com Preview ---
const AddModal = ({ onClose }: { onClose: () => void }) => {
    const [query, setQuery] = useState('');
    const [rating, setRating] = useState<Rating>('gostei');
    const [suggestions, setSuggestions] = useState<TMDbSearchResult[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<TMDbSearchResult | null>(null);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const { addItem, loading: isAdding } = useContext(WatchedDataContext);
    const [error, setError] = useState('');
    
    const debounceSearch = useCallback((searchFn: (q: string) => void, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (q: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => searchFn(q), delay);
        };
    }, []);

    const fetchSuggestions = async (q: string) => {
        if (q.length < 3) {
            setSuggestions([]);
            return;
        }
        setIsLoadingSuggestions(true);
        try {
            const results = await searchTMDb(q);
            setSuggestions(results.slice(0, 5));
        } catch (err) { console.error(err); } 
        finally { setIsLoadingSuggestions(false); }
    };
    
    const debouncedFetch = useMemo(() => debounceSearch(fetchSuggestions, 300), [debounceSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        setError('');
        setSelectedSuggestion(null); // Limpa a seleção se o usuário voltar a digitar
        debouncedFetch(newQuery);
    };
    
    const handleSuggestionClick = (suggestion: TMDbSearchResult) => {
        setSelectedSuggestion(suggestion);
        setQuery(suggestion.title || suggestion.name || '');
        setSuggestions([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            setError('O título não pode estar vazio.');
            return;
        }
        setError('');
        try {
            await addItem(query, rating);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao adicionar título.');
        }
    };

    return (
        <Modal onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Adicionar Novo Título</h2>
                
                {!selectedSuggestion && (
                    <div className="relative">
                        <input type="text" value={query} onChange={handleInputChange} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Comece a digitar um título..."/>
                        {isLoadingSuggestions && <div className="absolute right-3 top-3"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div></div>}
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-80 overflow-y-auto shadow-lg">
                                {suggestions.map(s => (
                                    <li key={s.id} onClick={() => handleSuggestionClick(s)} className="p-3 hover:bg-indigo-600 cursor-pointer flex items-center gap-4">
                                        <img src={s.poster_path ? `https://image.tmdb.org/t/p/w92${s.poster_path}` : 'https://placehold.co/50x75/374151/9ca3af?text=?'} alt="poster" className="w-12 h-[72px] object-cover rounded-md bg-gray-800"/>
                                        <div>
                                            <p className="font-bold text-white">{s.title || s.name}</p>
                                            <p className="text-sm text-gray-400">{s.media_type === 'movie' ? 'Filme' : 'Série'} ({new Date(s.release_date || s.first_air_date || '').getFullYear()})</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {selectedSuggestion && (
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="flex items-start gap-4">
                            <img src={selectedSuggestion.poster_path ? `https://image.tmdb.org/t/p/w92${selectedSuggestion.poster_path}` : 'https://placehold.co/80x120/374151/9ca3af?text=?'} alt="poster" className="w-20 h-[120px] object-cover rounded-md bg-gray-800"/>
                            <div className="flex-grow">
                                <p className="font-bold text-white text-lg">{selectedSuggestion.title || selectedSuggestion.name}</p>
                                <p className="text-sm text-gray-400">{selectedSuggestion.media_type === 'movie' ? 'Filme' : 'Série'} ({new Date(selectedSuggestion.release_date || selectedSuggestion.first_air_date || '').getFullYear()})</p>
                                <button type="button" onClick={() => { setSelectedSuggestion(null); setQuery(''); }} className="text-xs text-indigo-400 hover:underline mt-2">Buscar outro</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="my-6">
                    <label className="block text-sm font-medium text-gray-300 mb-3 text-center">Minha Avaliação</label>
                    <div className="flex justify-center gap-2 sm:gap-4">
                        {ratingOptions.map(opt => (
                            <button key={opt.rating} type="button" onClick={() => setRating(opt.rating)} className={`px-4 py-2 text-lg rounded-lg transition-all duration-200 flex flex-col items-center gap-1 w-20 ${rating === opt.rating ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                                <span className="text-2xl">{opt.emoji}</span>
                                <span className="text-xs font-bold">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                <div className="flex justify-end gap-3 border-t border-gray-700 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={isAdding || !query} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isAdding ? 'Adicionando...' : 'Adicionar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- Componentes da Coleção ---

const ItemCard = ({ item, onClick }: { item: ManagedWatchedItem, onClick: () => void }) => {
    return (
        <div onClick={onClick} className="relative bg-gray-800 rounded-lg group cursor-pointer overflow-hidden shadow-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-300 aspect-[2/3]">
            {item.posterUrl ? <img src={item.posterUrl} alt={`Pôster de ${item.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-center p-2"><span className="text-gray-500 text-sm">Pôster não disponível</span></div>}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 p-3"><h3 className="font-bold text-white text-base truncate leading-tight drop-shadow-md" title={item.title} style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>{item.title}</h3></div>
            <div className={`absolute top-2 right-2 text-xs font-bold py-1 px-2 rounded-full border backdrop-blur-sm ${ratingStyles[item.rating].bg} ${ratingStyles[item.rating].text} ${ratingStyles[item.rating].border}`}>{item.rating.toUpperCase()}</div>
        </div>
    );
};

const CollectionView: React.FC = () => {
    const { data } = useContext(WatchedDataContext);
    const [modal, setModal] = useState<'add' | 'details' | null>(null);
    const [selectedItem, setSelectedItem] = useState<ManagedWatchedItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<SortType>('createdAt');
    const [advancedFiltersVisible, setAdvancedFiltersVisible] = useState(false);
    
    const allItems: ManagedWatchedItem[] = useMemo(() => [...data.amei, ...data.gostei, ...data.meh, ...data.naoGostei], [data]);
    
    const availableGenres = useMemo(() => Array.from(new Set(allItems.map(item => item.genre))).sort(), [allItems]);
    const availableCategories = useMemo(() => Array.from(new Set(allItems.map(item => item.type))).sort(), [allItems]);

    const [activeRatingFilter, setActiveRatingFilter] = useState<Set<Rating>>(new Set());
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

    const sortedAndFilteredItems = useMemo(() => {
        let items = allItems;
        if (searchQuery) items = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (activeRatingFilter.size > 0) items = items.filter(item => activeRatingFilter.has(item.rating));
        if (selectedCategories.size > 0) items = items.filter(item => selectedCategories.has(item.type));
        if (selectedGenres.size > 0) items = items.filter(item => selectedGenres.has(item.genre));

        return items.sort((a, b) => {
            switch (sortType) {
                case 'title-asc': return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                case 'release-asc': {
                    const yearA = a.title.match(/\((\d{4})\)/)?.[1] || '0';
                    const yearB = b.title.match(/\((\d{4})\)/)?.[1] || '0';
                    return parseInt(yearA) - parseInt(yearB);
                }
                case 'release-desc': {
                    const yearA = a.title.match(/\((\d{4})\)/)?.[1] || '0';
                    const yearB = b.title.match(/\((\d{4})\)/)?.[1] || '0';
                    return parseInt(yearB) - parseInt(yearA);
                }
                case 'createdAt':
                default: return b.createdAt - a.createdAt;
            }
        });
    }, [allItems, activeRatingFilter, selectedCategories, selectedGenres, searchQuery, sortType]);

    const handleItemClick = (item: ManagedWatchedItem) => {
        setSelectedItem(item);
        setModal('details');
    };

    const handleRatingFilterClick = (rating: Rating) => {
        setActiveRatingFilter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rating)) {
                newSet.delete(rating);
            } else {
                newSet.add(rating);
            }
            return newSet;
        });
    };
    
    const handleCategoryChange = (category: string) => setSelectedCategories(prev => { const newSet = new Set(prev); newSet.has(category) ? newSet.delete(category) : newSet.add(category); return newSet; });
    const handleGenreChange = (genre: string) => setSelectedGenres(prev => { const newSet = new Set(prev); newSet.has(genre) ? newSet.delete(genre) : newSet.add(genre); return newSet; });
    const clearAdvancedFilters = () => { setSelectedCategories(new Set()); setSelectedGenres(new Set()); };

    return (
        <div className="p-4">
            {modal === 'details' && selectedItem && <DetailsModal item={selectedItem} onClose={() => setModal(null)} />}
            {modal === 'add' && <AddModal onClose={() => setModal(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-white mb-4 sm:mb-0">Minha Coleção</h1>
                <button onClick={() => setModal('add')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105">[+] Adicionar</button>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg mb-8 space-y-4">
                <input type="text" placeholder="Buscar na coleção..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 font-semibold">Avaliação:</span>
                        {ratingOptions.map(({ rating, emoji }) => (
                            <button key={rating} onClick={() => handleRatingFilterClick(rating)} title={rating} className={`px-3 py-2 text-xl rounded-lg transition-all duration-300 ${activeRatingFilter.has(rating) ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110' : 'bg-gray-700 hover:bg-gray-600'}`}>{emoji}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setAdvancedFiltersVisible(!advancedFiltersVisible)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                             Filtros {advancedFiltersVisible ? '▴' : '▾'}
                         </button>
                        <select value={sortType} onChange={e => setSortType(e.target.value as SortType)} className="bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 bg-no-repeat bg-right" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                            <option value="createdAt">Mais Recentes</option>
                            <option value="title-asc">Título (A-Z)</option>
                            <option value="title-desc">Título (Z-A)</option>
                            <option value="release-desc">Ano (Novo-Antigo)</option>
                            <option value="release-asc">Ano (Antigo-Novo)</option>
                        </select>
                    </div>
                </div>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${advancedFiltersVisible ? 'max-h-96 pt-4 border-t border-gray-700' : 'max-h-0'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {sortedAndFilteredItems.length === 0 ? (
                <div className="text-center py-16"><p className="text-2xl text-gray-400">Nenhum resultado encontrado.</p><p className="text-gray-500 mt-2">Tente ajustar seus filtros.</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {sortedAndFilteredItems.map(item => (
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
