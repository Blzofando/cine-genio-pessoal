import React, { useState, useContext, useMemo, useCallback } from 'react';
import { WatchedDataContext } from '../App';
import { DuelResult, TMDbSearchResult } from '../types';
import { getDuelAnalysis } from '../services/RecommendationService';
import { searchTMDb } from '../services/TMDbService';

// --- Componente de Seleção de Título com Autocomplete ---
interface TitleSelectorProps {
    label: string;
    onTitleSelect: (title: TMDbSearchResult) => void;
}
const TitleSelector: React.FC<TitleSelectorProps> = ({ label, onTitleSelect }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<TMDbSearchResult[]>([]);
    const [selectedTitle, setSelectedTitle] = useState<TMDbSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const debounceSearch = useCallback((searchFn: (q: string) => void, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (q: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => searchFn(q), delay); };
    }, []);

    const fetchSuggestions = async (q: string) => {
        if (q.length < 3) { setSuggestions([]); return; }
        setIsLoading(true);
        try {
            const results = await searchTMDb(q);
            setSuggestions(results.slice(0, 4));
        } catch (err) { console.error(err); } 
        finally { setIsLoading(false); }
    };

    const debouncedFetch = useMemo(() => debounceSearch(fetchSuggestions, 300), [debounceSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        debouncedFetch(newQuery);
    };

    const handleSelect = (suggestion: TMDbSearchResult) => {
        setSelectedTitle(suggestion);
        onTitleSelect(suggestion);
        setQuery('');
        setSuggestions([]);
    };

    if (selectedTitle) {
        return (
            <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                <img 
                    src={selectedTitle.poster_path ? `https://image.tmdb.org/t/p/w185${selectedTitle.poster_path}` : 'https://placehold.co/185x278/374151/9ca3af?text=?'} 
                    alt="poster" 
                    className="w-24 h-36 object-cover rounded-md mx-auto mb-2"
                />
                <p className="font-bold text-white text-sm">{selectedTitle.title || selectedTitle.name}</p>
                <button onClick={() => { setSelectedTitle(null); onTitleSelect(null as any); }} className="text-xs text-indigo-400 hover:underline mt-1">
                    Alterar
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <input type="text" value={query} onChange={handleInputChange} placeholder={label} className="w-full bg-gray-800 text-white p-3 rounded-lg border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"/>
            {isLoading && <div className="absolute right-3 top-3"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div></div>}
            {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-80 overflow-y-auto shadow-lg">
                    {suggestions.map(s => (
                        <li key={s.id} onClick={() => handleSelect(s)} className="p-2 hover:bg-indigo-600 cursor-pointer flex items-center gap-3">
                            <img src={s.poster_path ? `https://image.tmdb.org/t/p/w92${s.poster_path}` : 'https://placehold.co/50x75/374151/9ca3af?text=?'} alt="poster" className="w-10 h-[60px] object-cover rounded-md bg-gray-800"/>
                            <div>
                                <p className="font-bold text-white text-sm">{s.title || s.name}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- Componente de Animação da Batalha ---
interface BattleAnimationProps {
    poster1?: string;
    poster2?: string;
}
const BattleAnimation: React.FC<BattleAnimationProps> = ({ poster1, poster2 }) => (
    <div className="mt-10 w-full max-w-xl flex flex-col items-center justify-center animate-fade-in">
        <div className="relative w-full h-48 flex justify-center items-center">
            <img src={poster1 || 'https://placehold.co/150x225/374151/9ca3af?text=?'} alt="Pôster 1" className="w-28 h-42 object-cover rounded-md shadow-lg absolute animate-duel-left"/>
            <div className="text-5xl font-black text-gray-500 animate-pulse-fast">VS</div>
            <img src={poster2 || 'https://placehold.co/150x225/374151/9ca3af?text=?'} alt="Pôster 2" className="w-28 h-42 object-cover rounded-md shadow-lg absolute animate-duel-right"/>
            <div className="absolute text-7xl opacity-0 animate-poeira">💥</div>
        </div>
        <h2 className="text-xl font-bold text-gray-400 mt-4 animate-pulse">Duelo em análise...</h2>
    </div>
);


// --- Componente de Exibição do Vencedor ---
interface WinnerDisplayProps {
    result: DuelResult;
    onReset: () => void;
}
const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ result, onReset }) => {
    const winner = result.title1.probability >= result.title2.probability ? result.title1 : result.title2;
    return (
        <div className="mt-10 w-full max-w-2xl flex flex-col items-center animate-fade-in">
            <div className="relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl animate-trophy-up">🏆</div>
                <img src={winner.posterUrl || 'https://placehold.co/200x300/374151/9ca3af?text=?'} alt={`Pôster de ${winner.title}`} className="w-48 h-72 object-cover rounded-md shadow-2xl mb-4 border-4 border-yellow-400"/>
            </div>
            <h2 className="text-3xl font-bold text-white mt-4">{winner.title}</h2>
            <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-green-500/50">
                <h3 className="text-xl font-bold text-green-400 mb-2">Veredito do Gênio</h3>
                <p className="text-gray-300 italic">{result.verdict}</p>
            </div>
            <button onClick={onReset} className="mt-8 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors">
                Novo Duelo
            </button>
        </div>
    );
};

// --- Componente Principal ---
const DuelView: React.FC = () => {
    const { data: watchedData } = useContext(WatchedDataContext);
    const [title1, setTitle1] = useState<TMDbSearchResult | null>(null);
    const [title2, setTitle2] = useState<TMDbSearchResult | null>(null);
    const [result, setResult] = useState<DuelResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDuel = async () => {
        if (!title1 || !title2) {
            setError('Por favor, selecione os dois títulos para o duelo.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const duelResult = await getDuelAnalysis(title1.title || title1.name || '', title2.title || title2.name || '', watchedData);
            setResult(duelResult);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            setError(`Desculpe, não foi possível fazer a análise. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setTitle1(null);
        setTitle2(null);
        setResult(null);
        setError(null);
        setIsLoading(false);
    };

    if (isLoading) {
        return <BattleAnimation poster1={title1?.poster_path ? `https://image.tmdb.org/t/p/w185${title1.poster_path}` : undefined} poster2={title2?.poster_path ? `https://image.tmdb.org/t/p/w185${title2.poster_path}` : undefined} />;
    }

    if (result) {
        return <WinnerDisplay result={result} onReset={handleReset} />;
    }

    return (
        <div className="flex flex-col items-center p-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Duelo de Títulos</h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                Em dúvida entre dois? Deixe o Gênio decidir qual tem mais a ver com você.
            </p>

            <div className="w-full max-w-2xl mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <TitleSelector label="Título 1" onTitleSelect={setTitle1} />
                <TitleSelector label="Título 2" onTitleSelect={setTitle2} />
            </div>

            <button onClick={handleDuel} disabled={!title1 || !title2} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                Iniciar Duelo
            </button>

            {error && <p className="mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg w-full max-w-2xl">{error}</p>}
        </div>
    );
};

export default DuelView;