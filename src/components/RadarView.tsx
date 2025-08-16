// src/components/RadarView.tsx

import React, { useState, useContext, useEffect, useMemo } from 'react';
import { WatchedDataContext } from '../App';
import { CalendarItem, RadarItem, WatchProvider } from '../types';
import { getRelevantReleases, getMyCalendar, addToMyCalendar } from '../services/firestoreService';
import { updateRelevantReleasesIfNeeded } from '../services/RadarUpdateService';
import { getTMDbDetails } from '../services/TMDbService';

// --- Componentes Internos ---

const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => ( <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>{children}</div></div>);
const WatchProvidersDisplay: React.FC<{ providers: WatchProvider[] }> = ({ providers }) => ( <div className="flex flex-wrap gap-3">{providers.map(p => (<img key={p.provider_id} src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className="w-12 h-12 rounded-lg object-cover bg-gray-700"/>))}</div>);

// Modal de Detalhes para um item do Radar
interface DetailsModalProps {
    item: RadarItem;
    onClose: () => void;
    onAddToCalendar: (item: RadarItem) => void;
    isInCalendar: boolean;
}
const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose, onAddToCalendar, isInCalendar }) => {
    const [details, setDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        getTMDbDetails(item.id, item.tmdbMediaType)
            .then(data => setDetails(data))
            .catch(err => console.error("Falha ao buscar detalhes do item do radar", err))
            .finally(() => setIsLoading(false));
    }, [item.id, item.tmdbMediaType]);

    return (
        <Modal onClose={onClose}>
            <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-4">{item.title}</h2>
                {isLoading ? <div className="h-48 bg-gray-700 rounded animate-pulse"></div> : (
                    <div>
                        <p className="text-gray-400 text-sm mb-4">{details?.overview || "Sinopse não disponível."}</p>
                        {details?.['watch/providers']?.results?.BR?.flatrate && (
                            <div className="mb-4"><h3 className="text-xl font-semibold text-gray-300 mb-3">Onde Assistir</h3><WatchProvidersDisplay providers={details['watch/providers'].results.BR.flatrate} /></div>
                        )}
                        {item.type === 'tv' && details?.number_of_episodes && (
                             <p className="text-sm text-gray-400"><strong>Episódios:</strong> {details.number_of_episodes}</p>
                        )}
                    </div>
                )}
                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={() => onAddToCalendar(item)} disabled={isInCalendar} className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isInCalendar ? 'Já está no Calendário' : 'Adicionar ao Meu Calendário'}
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};

// Card individual para os carrosséis
interface CarouselCardProps {
    item: RadarItem;
    onClick: () => void;
}
const CarouselCard: React.FC<CarouselCardProps> = ({ item, onClick }) => (
    <div onClick={onClick} className="flex-shrink-0 w-40 cursor-pointer group">
        <div className="relative overflow-hidden rounded-lg shadow-lg">
            <img src={item.posterUrl || 'https://placehold.co/400x600/374151/9ca3af?text=?'} alt={`Pôster de ${item.title}`} className="w-full h-60 object-cover transition-transform duration-300 group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        </div>
        <h3 className="text-white font-bold mt-2 truncate">{item.title}</h3>
        <p className="text-indigo-400 text-sm">{new Date(item.releaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</p>
    </div>
);

// Carrossel Horizontal
interface CarouselProps {
    title: string;
    items: RadarItem[];
    onItemClick: (item: RadarItem) => void;
}
const Carousel: React.FC<CarouselProps> = ({ title, items, onItemClick }) => (
    <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {items.map(item => <CarouselCard key={item.id} item={item} onClick={() => onItemClick(item)} />)}
            {items.length === 0 && <p className="text-gray-500">Nenhum item nesta categoria por enquanto.</p>}
        </div>
    </div>
);


const RadarView: React.FC = () => {
    const { data: watchedData } = useContext(WatchedDataContext);
    const [isLoading, setIsLoading] = useState(true);
    const [statusText, setStatusText] = useState("A carregar o seu radar...");
    const [error, setError] = useState<string | null>(null);
    const [relevantReleases, setRelevantReleases] = useState<RadarItem[]>([]);
    const [myCalendar, setMyCalendar] = useState<CalendarItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<RadarItem | null>(null);

    useEffect(() => {
        const initializeRadar = async () => {
            setIsLoading(true);
            setError(null);
            try {
                setStatusText("A verificar se há novidades...");
                await updateRelevantReleasesIfNeeded(watchedData);

                setStatusText("A carregar lançamentos...");
                const [releases, calendar] = await Promise.all([
                    getRelevantReleases(),
                    getMyCalendar()
                ]);

                setRelevantReleases(releases);
                setMyCalendar(calendar);

            } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível carregar o Radar.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (Object.values(watchedData).flat().length > 0) {
            initializeRadar();
        } else if (!isLoading) {
             setIsLoading(false);
             setStatusText("Adicione itens à sua coleção para que o Gênio possa gerar seu radar.");
        }
    }, [watchedData]);
    
    const handleAddToCalendar = async (item: RadarItem) => {
        const calendarItem: CalendarItem = { ...item, addedAt: Date.now() };
        await addToMyCalendar(calendarItem);
        setMyCalendar(prev => [...prev, calendarItem].sort((a,b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()));
        setSelectedItem(null);
    };
    
    const upcomingMovies = useMemo(() => 
        relevantReleases
            .filter(r => r.type === 'movie')
            .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
            .slice(0, 20),
        [relevantReleases]
    );

    const onTheAirShows = useMemo(() =>
        relevantReleases
            .filter(r => r.type === 'tv')
            .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
            .slice(0, 20),
        [relevantReleases]
    );

    return (
        <div className="p-4">
            {selectedItem && (
                <DetailsModal 
                    item={selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    onAddToCalendar={handleAddToCalendar}
                    isInCalendar={myCalendar.some(ci => ci.id === selectedItem.id)}
                />
            )}
            
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-white mb-2">LANÇAMENTOS RELEVANTES</h1>
                <p className="text-lg text-gray-400">O seu calendário pessoal de futuros favoritos.</p>
            </div>

            {isLoading && <p className="text-center text-gray-400">{statusText}</p>}
            {error && <p className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>}
            
            {!isLoading && !error && (
                <div>
                    <Carousel title="Meu Calendário" items={myCalendar} onItemClick={setSelectedItem} />
                    <Carousel title="Próximos nos Cinemas" items={upcomingMovies} onItemClick={setSelectedItem} />
                    <Carousel title="Séries No Ar" items={onTheAirShows} onItemClick={setSelectedItem} />
                </div>
            )}
        </div>
    );
};

export default RadarView;