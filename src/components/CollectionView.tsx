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

// --- Componentes ---

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableCategories: string[];
    availableGenres: string[];
    selectedCategories: Set<string>;
    setSelectedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedGenres: Set<string>;
    setSelectedGenres: React.Dispatch<React.SetStateAction<Set<string>>>;
    sortType: SortType;
    setSortType: React.Dispatch<React.SetStateAction<SortType>>;
    onApply: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
    isOpen,
    onClose,
    availableCategories,
    availableGenres,
    selectedCategories,
    setSelectedCategories,
    selectedGenres,
    setSelectedGenres,
    sortType,
    setSortType,
    onApply
}) => {
    if (!isOpen) return null;

    const handleCategoryToggle = (cat: string) => {
        const newSet = new Set(selectedCategories);
        if (newSet.has(cat)) newSet.delete(cat);
        else newSet.add(cat);
        setSelectedCategories(newSet);
    };

    const handleGenreToggle = (genre: string) => {
        const newSet = new Set(selectedGenres);
        if (newSet.has(genre)) newSet.delete(genre);
        else newSet.add(genre);
        setSelectedGenres(newSet);
    };

    return (
        <Modal onClose={onClose}>
            <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Filtros e Ordenação</h2>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-3">Ordenar por</h3>
                        <div className="flex flex-wrap gap-2">
                            {(['createdAt', 'title-asc', 'title-desc', 'release-desc', 'release-asc'] as SortType[]).map(type => (
                                <button key={type} onClick={() => setSortType(type)} className={`px-3 py-2 text-sm rounded-lg ${sortType === type ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    { {createdAt: 'Mais Recentes', 'title-asc': 'Título (A-Z)', 'title-desc': 'Título (Z-A)', 'release-desc': 'Ano (Novo-Antigo)', 'release-asc': 'Ano (Antigo-Novo)'}[type] }
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-3">Categoria</h3>
                        <div className="flex flex-wrap gap-2">
                            {availableCategories.map((cat: string) => (
                                <button key={cat} onClick={() => handleCategoryToggle(cat)} className={`px-3 py-2 text-sm rounded-lg ${selectedCategories.has(cat) ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-3">Gênero</h3>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {availableGenres.map((genre: string) => (
                                <button key={genre} onClick={() => handleGenreToggle(genre)} className={`px-3 py-2 text-sm rounded-lg ${selectedGenres.has(genre) ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {genre}
                                </button>
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

interface ItemCardProps {
    item: ManagedWatchedItem;
    onClick: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
    return (
        <div onClick={onClick} className="relative bg-gray-800 rounded-lg group cursor-pointer overflow-hidden shadow-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-300 aspect-[2/3]">
            {item.posterUrl ? <img src={item.posterUrl} alt={`Pôster de ${item.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full bg-gray-700 flex items-center justify-center text-center p-2"><span className="text-gray-500 text-sm">Pôster não disponível</span></div>}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 p-3"><h3 className="font-bold text-white text-base truncate leading-tight" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>{item.title}</h3></div>
            <div className={`absolute top-2 right-2 text-xs font-bold py-1 px-2 rounded-full border backdrop-blur-sm ${ratingStyles[item.rating].bg} ${ratingStyles[item.rating].text} ${ratingStyles[item.rating].border}`}>{item.rating.toUpperCase()}</div>
        </div>
    );
};

// ... (Os componentes DetailsModal e AddModal, que não foram alterados, estão omitidos por brevidade, mas devem permanecer no seu arquivo)

const CollectionView: React.FC = () => {
    const { data } = useContext(WatchedDataContext);
    const [modal, setModal] = useState<'add' | 'details' | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ManagedWatchedItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const allItems: ManagedWatchedItem[] = useMemo(() => [...data.amei, ...data.gostei, ...data.meh, ...data.naoGostei], [data]);
    
    const availableGenres = useMemo(() => Array.from(new Set(allItems.map(item => item.genre))).sort(), [allItems]);
    const availableCategories = useMemo(() => Array.from(new Set(allItems.map(item => item.type))).sort(), [allItems]);

    // Estados para os filtros
    const [activeRatingFilter, setActiveRatingFilter] = useState<Rating | null>(null);
    const [tempSelectedCategories, setTempSelectedCategories] = useState<Set<string>>(new Set());
    const [tempSelectedGenres, setTempSelectedGenres] = useState<Set<string>>(new Set());
    const [tempSortType, setTempSortType] = useState<SortType>('createdAt');
    
    // Estados aplicados
    const [appliedCategories, setAppliedCategories] = useState<Set<string>>(new Set());
    const [appliedGenres, setAppliedGenres] = useState<Set<string>>(new Set());
    const [appliedSortType, setAppliedSortType] = useState<SortType>('createdAt');


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
    }, [allItems, activeRatingFilter, appliedCategories, appliedGenres, searchQuery, appliedSortType]);

    const handleItemClick = (item: ManagedWatchedItem) => {
        setSelectedItem(item);
        setModal('details');
    };

    const openFilterModal = () => {
        setTempSelectedCategories(appliedCategories);
        setTempSelectedGenres(appliedGenres);
        setTempSortType(appliedSortType);
        setIsFilterModalOpen(true);
    };

    const applyFilters = () => {
        setAppliedCategories(tempSelectedCategories);
        setAppliedGenres(tempSelectedGenres);
        setAppliedSortType(tempSortType);
        setIsFilterModalOpen(false);
    };

    return (
        <div className="p-4">
            {/* ... (Os componentes de Modal 'details' e 'add' não foram alterados e estão omitidos por brevidade, mas devem permanecer no seu arquivo) ... */}
            
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                availableCategories={availableCategories}
                availableGenres={availableGenres}
                selectedCategories={tempSelectedCategories}
                setSelectedCategories={setTempSelectedCategories}
                selectedGenres={tempSelectedGenres}
                setSelectedGenres={setTempSelectedGenres}
                sortType={tempSortType}
                setSortType={setTempSortType}
                onApply={applyFilters}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-white mb-4 sm:mb-0">Minha Coleção</h1>
                <button onClick={() => setModal('add')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105">[+] Adicionar</button>
            </div>

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
