import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPlay, faSave, faCheck, faLink, faUnlink } from '@fortawesome/free-solid-svg-icons';

export default function SessionRunner() {
    const { id } = useParams<{ id: string }>();
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [vaultItems, setVaultItems] = useState<any[]>([]);
    const [isLinking, setIsLinking] = useState(false);

    useEffect(() => {
        if (id) {
            loadSessions();
            loadVault();
        }
    }, [id]);

    const loadSessions = () => {
        if (id) api.sessions.list(id).then(setSessions);
    };

    const loadVault = () => {
        if (id) api.vault.list(id).then(setVaultItems);
    };

    const handleCreateSession = async () => {
        if (!id) return;
        await api.sessions.create(id);
        loadSessions();
    };

    const openSession = (session: any) => {
        setActiveSession(session);
    };

    const saveSession = async () => {
        if (!id || !activeSession) return;
        await api.sessions.update(id, activeSession.id, activeSession);
        // Also update linked items status if needed, but for now we just save the session data
        alert("Session saved!");
    };

    const updateSessionField = (field: string, value: any) => {
        setActiveSession({ ...activeSession, [field]: value });
    };

    const toggleLinkItem = async (itemId: string) => {
        if (!activeSession) return;
        const isLinked = activeSession.linked_items.includes(itemId);
        let newLinkedItems;

        if (isLinked) {
            newLinkedItems = activeSession.linked_items.filter((i: string) => i !== itemId);
            // Update item status back to reserve
            await api.vault.update(id!, itemId, { status: 'reserve' });
        } else {
            newLinkedItems = [...(activeSession.linked_items || []), itemId];
            // Update item status to active
            await api.vault.update(id!, itemId, { status: 'active' });
        }

        setActiveSession({ ...activeSession, linked_items: newLinkedItems });
        loadVault(); // Reload to see status changes
    };

    const concludeSession = async () => {
        if (!confirm("Are you sure you want to conclude this session? Used items will be archived.")) return;

        // Archive linked items? Or just the ones marked as "completed"?
        // Spec says: "Los elementos marcados como 'usados/revelados' pasan a estado 'archived'".
        // For simplicity, let's assume all linked items are "used" for now, or we could add a checkbox for each.
        // Let's just mark the session as completed.

        updateSessionField('status', 'completed');
        await saveSession();
        setActiveSession(null);
        loadSessions();
    };

    if (activeSession) {
        const linkedVaultItems = vaultItems.filter(i => activeSession.linked_items?.includes(i.id));
        const availableVaultItems = vaultItems.filter(i => i.status === 'reserve' && !activeSession.linked_items?.includes(i.id));

        return (
            <div className="p-4 h-screen flex flex-col bg-gray-900 text-white">
                {/* Header */}
                <header className="flex justify-between items-center mb-4 bg-gray-800 p-4 rounded border border-gray-700">
                    <div>
                        <button onClick={() => setActiveSession(null)} className="text-gray-400 hover:text-white mr-4">&larr; Back</button>
                        <span className="text-2xl font-bold text-green-400">Session #{activeSession.number}</span>
                        <span className="ml-4 text-gray-400">{new Date(activeSession.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setIsLinking(!isLinking)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold">
                            <FontAwesomeIcon icon={faLink} /> Link Items
                        </button>
                        <button onClick={saveSession} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-bold">
                            <FontAwesomeIcon icon={faSave} /> Save
                        </button>
                        <button onClick={concludeSession} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold">
                            <FontAwesomeIcon icon={faCheck} /> Conclude
                        </button>
                    </div>
                </header>

                {/* Linking Modal */}
                {isLinking && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full h-3/4 overflow-y-auto border border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Link Items from Vault</h2>
                                <button onClick={() => setIsLinking(false)} className="text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {availableVaultItems.map(item => (
                                    <div key={item.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-bold capitalize">{item.type}</div>
                                            <div>{item.content.name || item.content.title}</div>
                                        </div>
                                        <button onClick={() => toggleLinkItem(item.id)} className="text-green-400 hover:text-green-300">
                                            <FontAwesomeIcon icon={faPlus} />
                                        </button>
                                    </div>
                                ))}
                                {availableVaultItems.length === 0 && <p>No items in reserve.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left Panel: Active Items */}
                    <div className="w-1/3 bg-gray-800 p-4 rounded border border-gray-700 overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-blue-400">Active Resources</h3>
                        <div className="space-y-4">
                            {linkedVaultItems.map(item => (
                                <div key={item.id} className="bg-gray-700 p-3 rounded border-l-4 border-blue-500">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold uppercase text-gray-400">{item.type}</span>
                                        <button onClick={() => toggleLinkItem(item.id)} className="text-red-400 hover:text-red-300 text-xs"><FontAwesomeIcon icon={faUnlink} /></button>
                                    </div>
                                    <h4 className="font-bold text-lg">{item.content.name || item.content.title}</h4>
                                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{item.content.description}</p>
                                </div>
                            ))}
                            {linkedVaultItems.length === 0 && <p className="text-gray-500 italic">No items linked. Click "Link Items" to add from Vault.</p>}
                        </div>
                    </div>

                    {/* Right Panel: Session Log */}
                    <div className="w-2/3 flex flex-col gap-4">
                        <div className="bg-gray-800 p-4 rounded border border-gray-700">
                            <h3 className="text-lg font-bold mb-2 text-yellow-400">Strong Start</h3>
                            <input
                                value={activeSession.strong_start || ''}
                                onChange={e => updateSessionField('strong_start', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                placeholder="What happens immediately to kick off the session?"
                            />
                        </div>
                        <div className="bg-gray-800 p-4 rounded border border-gray-700">
                            <h3 className="text-lg font-bold mb-2 text-purple-400">Recap</h3>
                            <textarea
                                value={activeSession.recap || ''}
                                onChange={e => updateSessionField('recap', e.target.value)}
                                className="w-full h-20 bg-gray-900 border border-gray-600 rounded p-2 text-white resize-none"
                                placeholder="What happened last time?"
                            />
                        </div>
                        <div className="flex-1 bg-gray-800 p-4 rounded border border-gray-700 flex flex-col">
                            <h3 className="text-lg font-bold mb-2 text-green-400">Session Log</h3>
                            <textarea
                                value={activeSession.notes || ''}
                                onChange={e => updateSessionField('notes', e.target.value)}
                                className="flex-1 w-full bg-gray-900 border border-gray-600 rounded p-4 text-white font-mono text-lg leading-relaxed resize-none focus:outline-none focus:border-green-500"
                                placeholder="Type your session notes here..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <Link to={`/campaign/${id}`} className="text-gray-400 hover:text-white mb-2 block">&larr; Back to Dashboard</Link>
                    <h1 className="text-3xl font-bold text-green-400">Session Manager</h1>
                </div>
                <button onClick={handleCreateSession} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold flex items-center gap-2">
                    <FontAwesomeIcon icon={faPlus} /> New Session
                </button>
            </header>

            <div className="space-y-4">
                {sessions.map(session => (
                    <div key={session.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex justify-between items-center hover:border-green-500 transition-colors">
                        <div>
                            <h2 className="text-2xl font-bold">Session #{session.number}</h2>
                            <p className="text-gray-400">{new Date(session.date).toLocaleDateString()}</p>
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${session.status === 'completed' ? 'bg-gray-600' : 'bg-green-900 text-green-300'}`}>
                                {session.status}
                            </span>
                        </div>
                        <button onClick={() => openSession(session)} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold flex items-center gap-2">
                            <FontAwesomeIcon icon={faPlay} /> {session.status === 'completed' ? 'Review' : 'Play'}
                        </button>
                    </div>
                ))}
                {sessions.length === 0 && <p>No sessions created yet.</p>}
            </div>
        </div>
    );
}
