import React, { useState } from 'react';
import { View } from '../types';

interface ChatViewProps {
    setView: (view: View) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ setView }) => {
    const [message, setMessage] = useState('');

    const handleSendMessage = () => {
        const lowerCaseMessage = message.toLowerCase();
        
        // Lógica simples de "roteamento" baseada em palavras-chave
        if (lowerCaseMessage.includes('sugestão') || lowerCaseMessage.includes('recomenda')) {
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
            // Poderíamos adicionar uma resposta padrão da IA aqui no futuro
            alert("Desculpe, ainda não consigo processar esse pedido, mas tente usar palavras como 'sugestão', 'coleção', 'lista', 'duelo', 'radar' ou 'desafio'.");
        }
        setMessage('');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">Fale com o Gênio</h1>
                <p className="text-lg text-gray-400 max-w-2xl">
                    O que você gostaria de fazer? Peça por uma "sugestão", para ver sua "coleção", "lista", "duelo" e mais.
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
