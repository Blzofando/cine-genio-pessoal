import React from 'react';
import { View } from '../types';

interface MainMenuProps {
  setView: (view: View) => void;
}

// Componente para um grupo de botões
const MenuGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{title}</h2>
        <div className="space-y-2">{children}</div>
    </div>
);

// Componente para um botão individual dentro de um grupo
const MenuButton = ({ icon, text, onClick }: { icon: string, text: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg w-full flex items-center justify-start space-x-4 transition-colors duration-200"
    >
      <span className="text-xl text-indigo-400">{icon}</span>
      <span>{text}</span>
    </button>
);

const MainMenu: React.FC<MainMenuProps> = ({ setView }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-white tracking-tight">
          CineGênio <span className="text-indigo-400">Pessoal</span>
        </h1>
        <p className="mt-4 text-xl text-gray-400">Seu assistente de cinema e séries.</p>
      </div>
      
      <div className="w-full max-w-md space-y-8">
        {/* Botão de Destaque */}
        <button 
            onClick={() => setView(View.CHAT)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-3 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-indigo-500/50"
        >
            <span className="text-2xl">💬</span>
            <span className="text-lg">Fale com o Gênio</span>
        </button>

        {/* Grupos de Ferramentas */}
        <MenuGroup title="Descobrir">
            <MenuButton icon="🎲" text="Sugestão Aleatória" onClick={() => setView(View.RANDOM)} />
            <MenuButton icon="💡" text="Sugestão Personalizada" onClick={() => setView(View.SUGGESTION)} />
            <MenuButton icon="📡" text="Radar de Lançamentos" onClick={() => setView(View.RADAR)} />
        </MenuGroup>

        <MenuGroup title="Ferramentas do Gênio">
            <MenuButton icon="🤔" text="Será que vou gostar?" onClick={() => setView(View.PREDICT)} />
            <MenuButton icon="⚔️" text="Duelo de Títulos" onClick={() => setView(View.DUEL)} />
            <MenuButton icon="🏆" text="Desafio do Gênio" onClick={() => setView(View.CHALLENGE)} />
        </MenuGroup>

        <MenuGroup title="Meu Perfil">
            <MenuButton icon="📚" text="Minha Coleção" onClick={() => setView(View.COLLECTION)} />
            <MenuButton icon="📋" text="Minha Lista para Ver" onClick={() => setView(View.WATCHLIST)} />
            <MenuButton icon="📊" text="Ver Insights" onClick={() => setView(View.STATS)} />
        </MenuGroup>
      </div>
    </div>
  );
};

export default MainMenu;
