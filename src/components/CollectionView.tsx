import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { ManagedWatchedItem, Rating, TMDbSearchResult, WatchProvider, MediaType } from '../types';
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

type SortType = 'createdAt-desc' | 'createdAt-asc' | 'title-asc' | 'title-desc';

// --- Componentes ---

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

// --- Componentes do Modal de Detalhes ---

interface WatchProvidersDisplayProps {
    providers: WatchProvider[];
}
const WatchProvidersDisplay: React.FC<WatchProvidersDisplayProps> = ({ providers }) => (
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

interface DetailsModalProps {
    item: ManagedWatchedItem;
    onClose: () => void;
}
const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose }) => {
    const { removeItem } = useContext(WatchedDataContext);
    // ... (O restante do código do DetailsModal permanece o mesmo)
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


// --- Componente do Modal de Adicionar ---

interface AddModalProps {
    onClose: () => void;
}
const AddModal: React.FC<AddModalProps> = ({ onClose }) => {
    // ... (O código do AddModal permanece o mesmo)
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
        setSelectedSuggestion(null);
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


// --- NOVO Componente do Modal de Filtros ---

interface GenreSelectorProps {
    availableGenres: string[];
    selectedGenres: Set<string>;
    onToggle: (genre: string) => void;
}
const GenreSelector: React.FC<GenreSelectorProps> = ({ availableGenres, selectedGenres, onToggle }) => {
    const [query, setQuery] = useState('');
    const filteredGenres = query ? availableGenres.filter(g => g.toLowerCase().includes(query.toLowerCase())) : availableGenres;

    return (
        <div>
            <h3 className="font-semibold text-gray-300 mb-3">Gênero</h3>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar gênero..."
                className="w-full bg-gray-900 text-white p-2 mb-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="max-h-40 overflow-y-auto space-y-1 p-1">
                {filteredGenres.map(genre => (
                    <button
                        key={genre}
                        onClick={() => onToggle(genre)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedGenres.has(genre) ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        {genre}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableCategories: string[];
    availableGenres: string[];
    
    tempSortType: SortType;
    setTempSortType: (sort: SortType) => void;
    tempSelectedCategories: Set<string>;
    setTempSelectedCategories: (cats: Set<string>) => void;
    tempSelectedGenres: Set<string>;
    setTempSelectedGenres: (genres: Set<string>) => void;

    onApply: () => void;
}
const FilterModal: React.FC<FilterModalProps> = ({ 
    isOpen, onClose, availableCategories, availableGenres,
    tempSortType, setTempSortType,
    tempSelectedCategories, setTempSelectedCategories,
    tempSelectedGenres, setTempSelectedGenres,
    onApply 
}) => {
    if (!isOpen) return null;

    const handleCategoryToggle = (cat: string) => {
        const newSet = new Set(tempSelectedCategories);
        if (newSet.has(cat)) newSet.delete(cat);
        else newSet.add(cat);
        setTempSelectedCategories(newSet);
    };

    const handleGenreToggle = (genre: string) => {
        const newSet = new Set(tempSelectedGenres);
        if (newSet.has(genre)) newSet.delete(genre);
        else newSet.add(genre);
        setTempSelectedGenres(newSet);
    };

    const sortOptions: {id: SortType, label: string}[] = [
        {id: 'createdAt-desc', label: 'Mais Recentes'},
        {id: 'createdAt-asc', label: 'Mais Antigos'},
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
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-3">Categoria</h3>
                        <div className="flex flex-wrap gap-2">
                            {availableCategories.map((cat: string) => (
                                <button key={cat} onClick={() => handleCategoryToggle(cat)} className={`px-3 py-2 text-sm rounded-lg transition-colors ${tempSelectedCategories.has(cat) ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>
                    <GenreSelector availableGenres={availableGenres} selectedGenres={tempSelectedGenres} onToggle={handleGenreToggle} />
                </div>
                <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end">
                    <button onClick={onApply} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">Aplicar</button>
                </div>
            </div>
        </Modal>
    );
};


// --- Componente Principal da Coleção ---

interface ItemCardProps {
    item: ManagedWatchedItem;
    onClick: () => void;
}
const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
    return (
        <div onClick={onClick} className="relative bg-gray-800 rounded-lg group cursor-pointer overflow-hidden shadow-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-300 aspect-[2/3]">
            {item.posterUrl ? <img src={item.posterUrl} alt={`Pôster de ${item.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-center p-2"><span className="text-gray-500 text-sm">Pôster não disponível</span></div>}
            {/* Gradiente para legibilidade do texto */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-bold text-white text-base truncate leading-tight" title={item.title}>{item.title}</h3>
            </div>
            <div className={`absolute top-2 right-2 text-xs font-bold py-1 px-2 rounded-full border backdrop-blur-sm ${ratingStyles[item.rating].bg} ${ratingStyles[item.rating].text} ${ratingStyles[item.rating].border}`}>{item.rating.toUpperCase()}</div>
        </div>
    );
};

const CollectionView: React.FC = () => {
    const { data } = useContext(WatchedDataContext);
    const [modal, setModal] = useState<'add' | 'details' | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ManagedWatchedItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const allItems: ManagedWatchedItem[] = useMemo(() => [...data.amei, ...data.gostei, ...data.meh, ...data.naoGostei], [data]);
    
    const availableGenres = useMemo(() => Array.from(new Set(allItems.map(item => item.genre))).sort(), [allItems]);
    const availableCategories = useMemo(() => Array.from(new Set(allItems.map(item => item.type))).sort(), [allItems]);

    // Estados dos filtros APLICADOS
    const [activeRatingFilter, setActiveRatingFilter] = useState<Rating | null>(null);
    const [appliedSortType, setAppliedSortType] = useState<SortType>('createdAt-desc');
    const [appliedCategories, setAppliedCategories] = useState<Set<string>>(new Set());
    const [appliedGenres, setAppliedGenres] = useState<Set<string>>(new Set());

    // Estados TEMPORÁRIOS para o modal
    const [tempSortType, setTempSortType] = useState<SortType>(appliedSortType);
    const [tempSelectedCategories, setTempSelectedCategories] = useState<Set<string>>(appliedCategories);
    const [tempSelectedGenres, setTempSelectedGenres] = useState<Set<string>>(appliedGenres);

    const sortedAndFilteredItems = useMemo(() => {
        let items = allItems;
        if (searchQuery) items = items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (activeRatingFilter) items = items.filter(item => item.rating === activeRatingFilter);
        if (appliedCategories.size > 0) items = items.filter(item => appliedCategories.has(item.type));
        if (appliedGenres.size > 0) items = items.filter(item => appliedGenres.has(item.genre));

        return items.sort((a, b) => {
            switch (appliedSortType) {
                case 'title-asc': return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                case 'createdAt-asc': return a.createdAt - b.createdAt;
                case 'createdAt-desc':
                default: return b.createdAt - a.createdAt;
            }
        });
    }, [allItems, activeRatingFilter, appliedCategories, appliedGenres, searchQuery, appliedSortType]);

    const handleItemClick = (item: ManagedWatchedItem) => {
        setSelectedItem(item);
        setModal('details');
    };
    
    const openFilterModal = () => {
        // Inicializa os filtros temporários com os valores já aplicados
        setTempSortType(appliedSortType);
        setTempSelectedCategories(new Set(appliedCategories));
        setTempSelectedGenres(new Set(appliedGenres));
        setIsFilterModalOpen(true);
    };

    const applyFilters = () => {
        // Aplica os filtros temporários aos filtros reais
        setAppliedSortType(tempSortType);
        setAppliedCategories(tempSelectedCategories);
        setAppliedGenres(tempSelectedGenres);
        setIsFilterModalOpen(false);
    };

    return (
        <div className="p-4">
            {modal === 'details' && selectedItem && <DetailsModal item={selectedItem} onClose={() => setModal(null)} />}
            {modal === 'add' && <AddModal onClose={() => setModal(null)} />}
            
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                availableCategories={availableCategories}
                availableGenres={availableGenres}
                tempSortType={tempSortType}
                setTempSortType={setTempSortType}
                tempSelectedCategories={tempSelectedCategories}
                setTempSelectedCategories={setTempSelectedCategories}
                tempSelectedGenres={tempSelectedGenres}
                setTempSelectedGenres={setTempSelectedGenres}
                onApply={applyFilters}
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-white mb-4 sm:mb-0">Minha Coleção</h1>
                <button onClick={() => setModal('add')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105">[+] Adicionar</button>
            </div>

            {/* BARRA DE FILTROS REDESENHADA */}
            <div className="bg-gray-800 p-4 rounded-lg mb-8 space-y-4">
                <input type="text" placeholder="Buscar na coleção..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        {ratingOptions.map(({ rating, emoji }) => (
                            <button key={rating} onClick={() => setActiveRatingFilter(prev => prev === rating ? null : rating)} title={rating} className={`px-3 py-2 text-xl rounded-lg transition-all duration-300 ${activeRatingFilter === rating ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110' : 'bg-gray-700 hover:bg-gray-600'}`}>{emoji}</button>
                        ))}
                    </div>
                    <button onClick={openFilterModal} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center sm:justify-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 12.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                         Filtros & Ordenação
                    </button>
                </div>
            </div>

            {sortedAndFilteredItems.length === 0 ? (
                <div className="text-center py-16"><p className="text-2xl text-gray-400">Nenhum resultado encontrado.</p><p className="text-gray-500 mt-2">Tente ajustar seus filtros.</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {sortedAndFilteredItems.map(item => (
                       <ItemCard key={item.id} item={item} onClick={() => handleItemClick(item)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CollectionView;