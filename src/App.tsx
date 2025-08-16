import React, { useState, createContext, useEffect, useCallback } from 'react';
import { WatchlistProvider } from './contexts/WatchlistContext';
import { View, AllManagedWatchedData, Rating, ManagedWatchedItem, SuggestionFilters } from './types';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig';
import { getFullMediaDetailsFromQuery } from './services/RecommendationService';
import { addWatchedItem, removeWatchedItem, updateWatchedItem } from './services/firestoreService';

// Importando todos os componentes
import WatchlistView from './components/WatchlistView';
import MainMenu from './components/MainMenu';
import SuggestionView from './components/SuggestionView';
import StatsView from './components/StatsView';
import CollectionView from './components/CollectionView';
import RandomView from './components/RandomView';
import PredictView from './components/PredictView';
import DuelView from './components/DuelView';
import RadarView from './components/RadarView';
import ChallengeView from './components/ChallengeView'; // Importado aqui
import ChatView from './components/ChatView';

const initialData: AllManagedWatchedData = {
    amei: [], gostei: [], meh: [], naoGostei: []
};

interface IWatchedDataContext {
    data: AllManagedWatchedData;
    loading: boolean;
    addItem: (title: string, rating: Rating) => Promise<void>;
    removeItem: (id: number) => void;
    updateItem: (item: ManagedWatchedItem) => void;
}
export const WatchedDataContext = createContext<IWatchedDataContext>({
    data: initialData,
    loading: false,
    addItem: async () => {},
    removeItem: () => {},
    updateItem: () => {},
});

const ViewContainer = ({ children, onBack }: { children: React.ReactNode, onBack: () => void }) => (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8 relative">
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 bg-gray-800 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 z-10"
      >
        &larr; Voltar ao Menu
      </button>
      <div className="mt-12 sm:mt-16">
        {children}
      </div>
    </div>
);

const WatchedDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<AllManagedWatchedData>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const collectionRef = collection(db, 'watchedItems');
        const unsubscribe = onSnapshot(collectionRef, (querySnapshot) => {
            const items: ManagedWatchedItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push(doc.data() as ManagedWatchedItem);
            });
            const groupedData = items.reduce((acc, item) => {
                const rating = item.rating || 'meh';
                acc[rating].push(item);
                return acc;
            }, { amei: [], gostei: [], meh: [], naoGostei: [] } as AllManagedWatchedData);
            Object.keys(groupedData).forEach(key => {
                const ratingKey = key as Rating;
                groupedData[ratingKey].sort((a, b) => b.createdAt - a.createdAt);
            });
            setData(groupedData);
            setLoading(false);
        }, (err) => {
            console.error("Erro ao buscar dados do Firestore: ", err);
            setError("Não foi possível carregar sua coleção.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const addItem = useCallback(async (title: string, rating: Rating) => {
        setLoading(true);
        try {
            const mediaDetails = await getFullMediaDetailsFromQuery(title);
            const newItem: ManagedWatchedItem = {
                ...mediaDetails,
                rating,
                createdAt: Date.now(),
            };
            await addWatchedItem(newItem);
        } catch(e) {
            console.error(e);
            throw new Error(e instanceof Error ? e.message : "Falha ao buscar informações do título.");
        } finally {
            setLoading(false);
        }
    }, []);
    
    const removeItem = useCallback(async (id: number) => {
       try {
           await removeWatchedItem(id);
       } catch (error) {
           console.error("Falha ao remover item:", error);
       }
    }, []);

    const updateItem = useCallback(async (updatedItem: ManagedWatchedItem) => {
        try {
            const { id, ...dataToUpdate } = updatedItem;
            await updateWatchedItem(id, dataToUpdate);
        } catch (error) {
            console.error("Falha ao atualizar item:", error);
        }
    }, []);

    return (
        <WatchedDataContext.Provider value={{ data, loading, addItem, removeItem, updateItem }}>
            {children}
        </WatchedDataContext.Provider>
    );
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.MENU);
  const [chatFilters, setChatFilters] = useState<SuggestionFilters | null>(null);

  const renderView = () => {
    const handleBackToMenu = () => setCurrentView(View.MENU);
    const clearChatFilters = () => setChatFilters(null);

    switch (currentView) {
      case View.MENU:
        return <MainMenu setView={setCurrentView} />;
      case View.SUGGESTION:
        return ( <ViewContainer onBack={handleBackToMenu}><SuggestionView preloadedFilters={chatFilters} clearPreloadedFilters={clearChatFilters} /></ViewContainer> );
      case View.STATS:
        return <ViewContainer onBack={handleBackToMenu}><StatsView /></ViewContainer>;
      case View.COLLECTION:
        return <ViewContainer onBack={handleBackToMenu}><CollectionView /></ViewContainer>;
      case View.RANDOM:
        return <ViewContainer onBack={handleBackToMenu}><RandomView /></ViewContainer>;
      case View.PREDICT:
        return <ViewContainer onBack={handleBackToMenu}><PredictView /></ViewContainer>;
      case View.WATCHLIST:
        return <ViewContainer onBack={handleBackToMenu}><WatchlistView /></ViewContainer>;
      case View.DUEL:
        return <ViewContainer onBack={handleBackToMenu}><DuelView /></ViewContainer>;
      case View.RADAR:
        return <ViewContainer onBack={handleBackToMenu}><RadarView /></ViewContainer>;
      case View.CHALLENGE: // Novo case adicionado
        return <ViewContainer onBack={handleBackToMenu}><ChallengeView /></ViewContainer>;
      case View.CHAT:
        return ( <ViewContainer onBack={handleBackToMenu}><ChatView setView={setCurrentView} setSuggestionFilters={setChatFilters} /></ViewContainer> );
      default:
        return <MainMenu setView={setCurrentView} />;
    }
  };

  return (
    <WatchlistProvider>
        <WatchedDataProvider>
            <div className="App">
                {renderView()}
            </div>
        </WatchedDataProvider>
    </WatchlistProvider>
  );
};

export default App;