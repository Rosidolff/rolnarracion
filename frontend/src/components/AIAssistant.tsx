import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faPaperPlane, faTimes, faMagic, faCommentDots, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';

interface AIAssistantProps {
    campaignId: string;
    mode: 'vault' | 'session';
    sessionId?: string;
}

interface Message {
    role: 'user' | 'ai';
    text: string;
}

export default function AIAssistant({ campaignId, mode, sessionId }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Estado para posición y arrastre
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Manejadores de arrastre
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleSend = async () => {
        if (!query.trim() || loading) return;

        const userMsg: Message = { role: 'user', text: query };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            const res = await api.ai.ask(campaignId, userMsg.text, mode, sessionId);
            if (res.response) {
                setMessages(prev => [...prev, { role: 'ai', text: res.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: "Lo siento, hubo un error conectando con la mente colmena." }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: "Error de comunicación con el servidor." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Botón Flotante (Solo visible si el chat está cerrado) */}
            <button 
                onClick={() => { setIsOpen(true); }} 
                className={`fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'}`}
                title="Asistente IA"
            >
                <FontAwesomeIcon icon={faMagic} size="lg" />
            </button>

            {/* Panel de Chat Draggable */}
            <div 
                style={{ 
                    left: isOpen ? position.x : undefined, 
                    top: isOpen ? position.y : undefined,
                    right: !isOpen ? '24px' : undefined,
                    bottom: !isOpen ? '24px' : undefined
                }}
                className={`fixed w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col transition-opacity duration-300 z-50 ${isOpen ? 'opacity-100 h-[600px]' : 'opacity-0 h-0 pointer-events-none overflow-hidden'}`}
            >
                
                {/* Header Arrastrable */}
                <div 
                    onMouseDown={handleMouseDown}
                    className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center rounded-t-lg cursor-move select-none active:bg-gray-750"
                >
                    <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 flex items-center gap-2 text-sm">
                        <FontAwesomeIcon icon={faGripVertical} className="text-gray-600" />
                        {mode === 'vault' ? 'Creador de Contenido' : 'Asistente de Narrativa'}
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white px-2" onMouseDown={(e) => e.stopPropagation()}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 text-sm mt-10 px-4 select-none">
                            <FontAwesomeIcon icon={faMagic} className="text-yellow-600 text-2xl mb-2 opacity-50" />
                            <p>Hola DM. He estudiado tu Framework, Verdades y Personajes.</p>
                            <p className="mt-2 text-xs text-gray-600">
                                {mode === 'vault' 
                                    ? "¿Qué quieres crear hoy? ¿Un PNJ, un lugar, un secreto?" 
                                    : "Estoy atento a la sesión. Pregúntame sobre hallazgos, conexiones o consecuencias narrativas."}
                            </p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-blue-900/50 text-blue-100 border border-blue-800' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                                {msg.role === 'ai' ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.text
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                                <FontAwesomeIcon icon={faCommentDots} className="text-gray-500 animate-pulse" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-gray-800 border-t border-gray-700 rounded-b-lg">
                    <div className="relative">
                        <textarea 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={mode === 'vault' ? "Ayúdame a crear un villano..." : "¿Qué revela este libro antiguo?"}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:border-purple-500 outline-none resize-none h-10 focus:h-20 transition-all"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={loading || !query.trim()}
                            className="absolute right-2 bottom-2 text-purple-500 hover:text-purple-300 disabled:opacity-50 transition-colors"
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}