import React, { useState, useContext, useEffect, useMemo } from 'react';
import { WatchedDataContext } from '../App';
import { WatchlistContext } from '../contexts/WatchlistContext';
import { RadarItem, WatchProvider, WatchlistItem, TMDbSearchResult } from '../types';
import { getRelevantReleases } from '../services/firestoreService';
import { updateRelevantReleasesIfNeeded } from '../services/RadarUpdateService';
import { getTMDbDetails, getNowPlayingMovies, getTopRatedOnProvider, getTrending } from '../services/TMDbService';

// --- Componentes Internos ---
const Modal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => ( <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>{children}</div></div>);
const WatchProvidersDisplay: React.FC<{ providers: WatchProvider[] }> = ({ providers }) => ( <div className="flex flex-wrap gap-3">{providers.map(p => (<img key={p.provider_id} src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className="w-12 h-12 rounded-lg object-cover bg-gray-700"/>))}</div>);

interface DetailsModalProps { item: RadarItem; onClose: () => void; onAddToWatchlist: (item: RadarItem) => void; isInWatchlist: boolean; }
const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose, onAddToWatchlist, isInWatchlist }) => {
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
                <div className="flex flex-col sm:flex-row gap-6">
                    <img src={item.posterUrl || 'https://placehold.co/400x600/374151/9ca3af?text=?'} alt={`Pôster de ${item.title}`} className="w-40 h-60 object-cover rounded-lg shadow-md flex-shrink-0 mx-auto sm:mx-0"/>
                    <div className="flex-grow">
                        <h2 className="text-3xl font-bold text-white mb-2">{item.title}</h2>
                        {isLoading ? <div className="h-5 bg-gray-700 rounded animate-pulse w-3/4 mb-4"></div> : (
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 text-sm text-gray-400">
                                <span>{item.type === 'movie' ? 'Filme' : 'Série'}</span>
                                <span>&bull;</span>
                                <span>{details?.genres?.[0]?.name || 'N/A'}</span>
                            </div>
                        )}
                        {isLoading ? (
                            <div className="space-y-2 mt-4">
                                <div className="h-4 bg-gray-700 rounded animate-pulse w-full"></div>
                                <div className="h-4 bg-gray-700 rounded animate-pulse w-full"></div>
                                <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6"></div>
                            </div>
                        ) : (
                            <p className="text-gray-300 text-sm mb-4">{details?.overview || "Sinopse não disponível."}</p>
                        )}
                    </div>
                </div>
                {isLoading ? <div className="h-20 mt-4 bg-gray-700 rounded animate-pulse"></div> : (
                    details?.['watch/providers']?.results?.BR?.flatrate && (
                        <div className="mt-4"><h3 className="text-xl font-semibold text-gray-300 mb-3">Onde Assistir</h3><WatchProvidersDisplay providers={details['watch/providers'].results.BR.flatrate} /></div>
                    )
                )}
                <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                    <button onClick={() => onAddToWatchlist(item)} disabled={isInWatchlist} className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isInWatchlist ? 'Já está na Watchlist' : 'Adicionar à Watchlist'}
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};

interface CarouselCardProps { item: RadarItem; onClick: () => void; rank?: number; }
const CarouselCard: React.FC<CarouselCardProps> = ({ item, onClick, rank }) => (
    <div onClick={onClick} className="flex-shrink-0 w-40 cursor-pointer group">
        <div className="relative overflow-hidden rounded-lg shadow-lg">
            {rank && (<div className="absolute -left-1 -top-1 z-10"><svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 H 60 L 0 60 V 0 Z" fill="#111827" fillOpacity="0.7"/><text x="10" y="25" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="bold" fill="white">{rank}</text></svg></div>)}
            <img src={item.posterUrl || 'https://placehold.co/400x600/374151/9ca3af?text=?'} alt={`Pôster de ${item.title}`} className="w-full h-60 object-cover transition-transform duration-300 group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        </div>
        <h3 className="text-white font-bold mt-2 truncate">{item.title}</h3>
        <p className="text-indigo-400 text-sm">{new Date(item.releaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
    </div>
);

interface CarouselProps { title: string; items: RadarItem[]; onItemClick: (item: RadarItem) => void; isRanked?: boolean; isLoading?: boolean; }
const Carousel: React.FC<CarouselProps> = ({ title, items, onItemClick, isRanked = false, isLoading = false }) => (
    <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {isLoading && Array.from({ length: 7 }).map((_, i) => <div key={i} className="flex-shrink-0 w-40 h-60 bg-gray-700 rounded-lg animate-pulse"></div>)}
            {!isLoading && items.map((item, index) => <CarouselCard key={`${item.id}-${item.listType}`} item={item} onClick={() => onItemClick(item)} rank={isRanked ? index + 1 : undefined} />)}
            {!isLoading && items.length === 0 && <p className="text-gray-500">Nenhum item nesta categoria por enquanto.</p>}
        </div>
    </div>
);


const RadarView: React.FC = () => {
    const { data: watchedData } = useContext(WatchedDataContext);
    const { addToWatchlist, isInWatchlist } = useContext(WatchlistContext);
    
    const [relevantReleases, setRelevantReleases] = useState<RadarItem[]>([]);
    const [isLoadingRelevants, setIsLoadingRelevants] = useState(true);

    const [quickLists, setQuickLists] = useState<Record<string, RadarItem[]>>({});
    const [isLoadingQuickLists, setIsLoadingQuickLists] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<RadarItem | null>(null);

    useEffect(() => {
        const initializeRadar = async () => {
            setError(null);
            
            // FASE 1: Busca rápida das listas não-IA
            setIsLoadingQuickLists(true);
            try {
                const PROVIDER_IDS = { netflix: 8, prime: 119, max: 1899, disney: 337 };
                const [nowPlaying, trending, topNetflix, topPrime, topMax, topDisney] = await Promise.all([
                    getNowPlayingMovies(), getTrending(),
                    getTopRatedOnProvider(PROVIDER_IDS.netflix), getTopRatedOnProvider(PROVIDER_IDS.prime),
                    getTopRatedOnProvider(PROVIDER_IDS.max), getTopRatedOnProvider(PROVIDER_IDS.disney)
                ]);

                const toRadarItem = (item: TMDbSearchResult, listType: RadarItem['listType'], providerId?: number): RadarItem | null => {
                    const releaseDate = item.release_date || item.first_air_date;
                    if (!releaseDate) return null;
                    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
                    const radarItem: RadarItem = {
                        id: item.id, tmdbMediaType: mediaType, title: `${item.title || item.name} (${new Date(releaseDate).getFullYear()})`,
                        releaseDate, type: mediaType, listType, providerId,
                        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
                    };
                    return radarItem;
                };

                setQuickLists({
                    nowPlaying: nowPlaying.map(m => toRadarItem(m, 'now_playing')).filter((i): i is RadarItem => !!i),
                    trending: trending.map(t => toRadarItem(t, 'trending')).filter((i): i is RadarItem => !!i),
                    topNetflix: topNetflix.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.netflix)).filter((i): i is RadarItem => !!i),
                    topPrime: topPrime.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.prime)).filter((i): i is RadarItem => !!i),
                    topMax: topMax.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.max)).filter((i): i is RadarItem => !!i),
                    topDisney: topDisney.map(m => toRadarItem(m, 'top_rated_provider', PROVIDER_IDS.disney)).filter((i): i is RadarItem => !!i),
                });

            } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível carregar as listas principais.");
            } finally {
                setIsLoadingQuickLists(false);
            }

            // FASE 2: Atualização completa em segundo plano e busca dos dados do Firebase
            setIsLoadingRelevants(true);
            try {
                await updateRelevantReleasesIfNeeded(watchedData);
                const releases = await getRelevantReleases();
                setRelevantReleases(releases);
            } catch (err) {
                console.error("Falha na atualização em segundo plano do Radar:", err);
            } finally {
                setIsLoadingRelevants(false);
            }
        };

        if (Object.values(watchedData).flat().length > 0) {
            initializeRadar();
        } else {
             setIsLoadingQuickLists(false);
             setIsLoadingRelevants(false);
        }
    }, [watchedData]);
    
    const handleAddToWatchlist = (item: RadarItem) => {
        const watchlistItem: WatchlistItem = {
            id: item.id,
            tmdbMediaType: item.tmdbMediaType,
            title: item.title,
            posterUrl: item.posterUrl,
            addedAt: Date.now(),
        };
        addToWatchlist(watchlistItem);
        setSelectedItem(null);
    };
    
    const upcoming = useMemo(() => relevantReleases.filter(r => r.listType === 'upcoming').sort((a,b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()), [relevantReleases]);
    const nowPlaying = useMemo(() => quickLists.nowPlaying || [], [quickLists]);
    const trending = useMemo(() => quickLists.trending || [], [quickLists]);
    const topNetflix = useMemo(() => quickLists.topNetflix || [], [quickLists]);
    const topPrime = useMemo(() => quickLists.topPrime || [], [quickLists]);
    const topMax = useMemo(() => quickLists.topMax || [], [quickLists]);
    const topDisney = useMemo(() => quickLists.topDisney || [], [quickLists]);

    return (
        <div className="p-4">
            {selectedItem && (
                <DetailsModal 
                    item={selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    onAddToWatchlist={handleAddToWatchlist}
                    isInWatchlist={isInWatchlist(selectedItem.id)}
                />
            )}
            
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-white">Radar de Lançamentos</h1>
            </div>

            {error && <p className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>}
            
            <div>
                <Carousel title="Nos Cinemas" items={nowPlaying} onItemClick={setSelectedItem} isLoading={isLoadingQuickLists} />
                <Carousel title="Tendências da Semana" items={trending} onItemClick={setSelectedItem} isLoading={isLoadingQuickLists} />
                <Carousel title="Top 10 na Netflix" items={topNetflix} onItemClick={setSelectedItem} isRanked={true} isLoading={isLoadingQuickLists} />
                <Carousel title="Top 10 no Prime Video" items={topPrime} onItemClick={setSelectedItem} isRanked={true} isLoading={isLoadingQuickLists} />
                <Carousel title="Top 10 na Max" items={topMax} onItemClick={setSelectedItem} isRanked={true} isLoading={isLoadingQuickLists} />
                <Carousel title="Top 10 no Disney+" items={topDisney} onItemClick={setSelectedItem} isRanked={true} isLoading={isLoadingQuickLists} />
                <Carousel title="Relevante para Si (Em Breve)" items={upcoming} onItemClick={setSelectedItem} isLoading={isLoadingRelevants} />
            </div>
        </div>
    );
};

export default RadarView;
