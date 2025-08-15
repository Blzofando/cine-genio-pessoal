import React, { useState, createContext, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from './services/firebaseConfig';
import { addWatchedItem, removeWatchedItem, updateWatchedItem } from './services/firestoreService';
import { View, AllManagedWatchedData, Rating, ManagedWatchedItem } from './types';
import { getFullMediaDetailsFromQuery } from './services/RecommendationService';
import MainMenu from './components/MainMenu';
import SuggestionView from './components/SuggestionView';
import StatsView from './components/StatsView';
import CollectionView from './components/CollectionView';
import RandomView from './components/RandomView';
import PredictView from './components/PredictView';

const initialData: AllManagedWatchedData = {
    amei: [], gostei: [], meh: [], naoGostei: []
};

// --- WatchedDataContext ---
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

// Em App.tsx, substitua o componente WatchedDataProvider por este:

const WatchedDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<AllManagedWatchedData>(initialData);
    const [loading, setLoading] = useState(true);  // Inicia como true para mostrar que está carregando do Firestore
    const [error, setError] = useState<string | null>(null);
    
    // Efeito para carregar os dados do Firestore e ouvir atualizações em tempo real
    useEffect(() => {
        setLoading(true);
        const collectionRef = collection(db, 'watchedItems');

        // onSnapshot cria uma conexão em tempo real.
        // O código dentro dele será executado sempre que os dados na nuvem mudarem.
        const unsubscribe = onSnapshot(collectionRef, (querySnapshot) => {
            const items: ManagedWatchedItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push(doc.data() as ManagedWatchedItem);
            });

            // Organiza os itens de volta nas categorias (amei, gostei, etc.)
            const groupedData = items.reduce((acc, item) => {
                const rating = item.rating || 'meh'; // Garante que há uma avaliação
                if (!acc[rating]) {
                    acc[rating] = [];
                }
                acc[rating].push(item);
                return acc;
            }, initialData as AllManagedWatchedData);

            // Ordena cada lista por data de criação
            Object.keys(groupedData).forEach(key => {
                const ratingKey = key as Rating;
                groupedData[ratingKey].sort((a, b) => b.createdAt - a.createdAt);
            });
            
            setData(groupedData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar dados do Firestore: ", error);
            setError("Não foi possível carregar sua coleção. Verifique o console para mais detalhes.");
            setLoading(false);
        });

        // Retorna uma função de limpeza para se desconectar quando o componente for desmontado
        return () => unsubscribe();
    }, []);
    
    // Adicionar um item ficou muito mais simples!
    const addItem = useCallback(async (title: string, rating: Rating) => {
        setLoading(true);
        try {
            const mediaDetails = await getFullMediaDetailsFromQuery(title);
            const newItem: ManagedWatchedItem = {
                ...mediaDetails,
                rating,
                createdAt: Date.now(),
            };
            
            // Apenas mandamos o novo item para o Firestore.
            // O 'onSnapshot' cuidará de atualizar o estado (a UI) para nós!
            await addWatchedItem(newItem);

        } catch(e) {
            console.error(e);
            throw new Error(e instanceof Error ? e.message : "Falha ao buscar informações do título.");
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Remover e atualizar também ficaram mais simples
    const removeItem = useCallback(async (id: number) => {
       try {
           await removeWatchedItem(id);
       } catch (error) {
           console.error("Falha ao remover item:", error);
           // Opcional: mostrar um erro para o usuário
       }
    }, []);

    const updateItem = useCallback(async (updatedItem: ManagedWatchedItem) => {
        try {
            // A função updateWatchedItem espera um objeto com as propriedades a serem atualizadas
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

  const renderView = () => {
    const handleBackToMenu = () => setCurrentView(View.MENU);
    
    switch (currentView) {
      case View.MENU:
        return <MainMenu setView={setCurrentView} />;
      case View.SUGGESTION:
        return <ViewContainer onBack={handleBackToMenu}><SuggestionView /></ViewContainer>;
      case View.STATS:
        return <ViewContainer onBack={handleBackToMenu}><StatsView /></ViewContainer>;
      case View.COLLECTION:
        return <ViewContainer onBack={handleBackToMenu}><CollectionView /></ViewContainer>;
      case View.RANDOM:
        return <ViewContainer onBack={handleBackToMenu}><RandomView /></ViewContainer>;
      case View.PREDICT:
        return <ViewContainer onBack={handleBackToMenu}><PredictView /></ViewContainer>;
      default:
        return <MainMenu setView={setCurrentView} />;
    }
  };

  return (
    <WatchedDataProvider>
        <div className="App">
            {renderView()}
        </div>
    </WatchedDataProvider>
  );
};

export default App;
