import React, { useState } from 'react';
import { View, SuggestionFilters, MediaType } from '../types';

interface ChatViewProps {
    setView: (view: View) => void;
    setSuggestionFilters: (filters: SuggestionFilters) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ setView, setSuggestionFilters }) => {
    const [message, setMessage] = useState('');

    const handleSendMessage = () => {
        const lowerCaseMessage = message.toLowerCase();
        
        if (lowerCaseMessage.includes('sugestão') || lowerCaseMessage.includes('recomenda')) {
            let remainingMessage = ` ${lowerCaseMessage.replace('sugestão de', '').replace('sugestão', '').replace('recomenda', '').trim()} `;
            
            const categories: { [key: string]: MediaType } = { 'filme': 'Filme', 'série': 'Série', 'anime': 'Anime', 'programa': 'Programa' };
            const genres = ['ação', 'comédia', 'drama', 'ficção científica', 'suspense', 'terror', 'romance', 'aventura', 'mistério', 'fantasia'];
            
            const foundFilters: SuggestionFilters = { category: null, genres: [], keywords: '' };

            // Procura por categoria
            for (const key in categories) {
                if (remainingMessage.includes(` ${key} `)) {
                    foundFilters.category = categories[key];
                    remainingMessage = remainingMessage.replace(` ${key} `, ' ');
                }
            }

            // Procura por gêneros
            for (const genre of genres) {
                if (remainingMessage.includes(` ${genre} `)) {
                    const capitalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
                    foundFilters.genres.push(capitalizedGenre);
                    remainingMessage = remainingMessage.replace(` ${genre} `, ' ');
                }
            }

            // O que sobra vira palavra-chave
            foundFilters.keywords = remainingMessage.trim().replace(/  +/g, ' ');

            setSuggestionFilters(foundFilters);
            setView(View.SUGGESTION);

        } else if (lowerCaseMessage.includes('coleção')) {
            setView(View.COLLECTION);
        } else if (lowerCaseMessage.includes('lista') || lowerCaseMessage.includes('watchlist')) {
            setView(View.WATCHLIST);
        } else if (lowerCaseMessage.includes('duelo')) {
            setView(View.DUEL);
        } else if (lowerCaseMessage.includes('radar') || lowerCaseMessage.includes('lançamentos')) {
            setView(View.RADAR);
        } else if (lowerCaseMessage.includes('desafio')) {
            setView(View.CHALLENGE);
        } else {
            alert("Desculpe, ainda não consigo processar esse pedido, mas tente usar palavras como 'sugestão', 'coleção', 'lista', 'duelo', 'radar' ou 'desafio'.");
        }
        setMessage('');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">Fale com o Gênio</h1>
                <p className="text-lg text-gray-400 max-w-2xl">
                    Peça por uma "sugestão de filme de terror com suspense" e veja a mágica acontecer.
                </p>
            </div>

            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="w-full max-w-2xl mx-auto flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ex: Quero uma sugestão de filme..."
                        className="flex-grow bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        onClick={handleSendMessage}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;