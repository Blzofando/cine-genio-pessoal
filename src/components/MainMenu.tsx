import React from 'react';
import { View } from '../types';

interface MainMenuProps {
  setView: (view: View) => void;
}

const MenuButton = ({ icon, text, onClick }: { icon: string, text: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="bg-gray-800 hover:bg-indigo-600 text-white font-bold py-4 px-6 rounded-lg w-full flex items-center justify-start space-x-4 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-indigo-500/50"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-lg">{text}</span>
    </button>
);

const FooterButton = ({ icon, text, onClick }: { icon: string, text: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-400 transition-colors">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold">{text}</span>
    </button>
);


const MainMenu: React.FC<MainMenuProps> = ({ setView }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-between p-4">
      {/* Espaçador para empurrar o conteúdo para o centro */}
      <div></div>

      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold text-white tracking-tight">
            CineGênio <span className="text-indigo-400">Pessoal</span>
            </h1>
            <p className="mt-4 text-xl text-gray-400">Seu assistente de cinema e séries.</p>
        </div>
        
        <div className="w-full max-w-md space-y-4">
            <MenuButton icon="💬" text="Fale com o Gênio" onClick={() => setView(View.CHAT)} />
            <MenuButton icon="🎲" text="Sugestão Aleatória" onClick={() => setView(View.RANDOM)} />
            <MenuButton icon="💡" text="Sugestão Personalizada" onClick={() => setView(View.SUGGESTION)} />
            <MenuButton icon="📡" text="Radar de Lançamentos" onClick={() => setView(View.RADAR)} />
            <MenuButton icon="⚔️" text="Duelo de Títulos" onClick={() => setView(View.DUEL)} />
            <MenuButton icon="🏆" text="Desafio do Gênio" onClick={() => setView(View.CHALLENGE)} />
        </div>
      </div>

      {/* --- NOVO RODAPÉ MEU PERFIL --- */}
      <div className="w-full max-w-md py-4 mt-10 border-t border-gray-700">
        <div className="flex justify-around items-center">
            <FooterButton icon="📚" text="Minha Coleção" onClick={() => setView(View.COLLECTION)} />
            <FooterButton icon="📋" text="Watchlist" onClick={() => setView(View.WATCHLIST)} />
            <FooterButton icon="📊" text="Insights" onClick={() => setView(View.STATS)} />
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
