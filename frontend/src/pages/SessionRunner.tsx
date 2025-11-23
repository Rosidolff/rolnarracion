import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCheck, faLink, faTimes, faChevronDown, faChevronRight, faSave, faPlus, faUnlink, faBolt, faBookOpen, faPen
} from '@fortawesome/free-solid-svg-icons';
import TopNavBar from '../components/TopNavBar';
import CampaignSidebar from '../components/CampaignSidebar';

const ITEM_TYPES = ["npc", "scene", "secret", "location", "monster", "item"];
const REUSABLE_TYPES = ["npc", "location", "item", "monster"];

const AutoResizeTextarea = ({ value, onChange, placeholder, className, onBlur, autoFocus }: any) => {
    const ref = useRef<HTMLTextAreaElement>(null);
    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [value]);
    return <textarea ref={ref} value={value} onChange={onChange} onBlur={onBlur} className={`${className} overflow-hidden`} placeholder={placeholder} autoFocus={autoFocus} rows={1} />;
};

export default function SessionRunner() {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [session, setSession] = useState<any>(null);
    const [vaultItems, setVaultItems] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isLinking, setIsLinking] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        strong_start: true, recap: true, npc: true, scene: true, secret: true, location: true, monster: true, item: true
    });
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [usedItems, setUsedItems] = useState<Set<string>>(new Set());

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const editRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            loadVault();
            initSession();
        }
    }, [id, location.state]);

    useEffect(() => {
        const handleClickOutside = async (event: MouseEvent) => {
            if (editingId && editRef.current && !editRef.current.contains(event.target as Node)) {
                await saveItemEdit();
            }
        };
        if (editingId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingId, editData]);

    const loadVault = () => { if (id) api.vault.list(id).then(setVaultItems); };

    const initSession = async () => {
        if (!id) return;
        const passedId = location.state?.sessionId;
        
        if (passedId) {
            const s = await api.sessions.get(id, passedId);
            setSession(s);
        } else {
            const sessions = await api.sessions.list(id);
            const camp = await api.campaigns.get(id);
            const activeId = camp.active_session;
            
            let target = activeId ? sessions.find((s:any) => s.id === activeId) : null;
            if (!target && sessions.length > 0) target = sessions[sessions.length - 1];
            
            if (target) {
                setSession(target);
            } else {
                const newS = await api.sessions.create(id);
                setSession(newS);
            }
        }
    };

    const saveSession = async (updated = session) => {
        if (!id || !updated) return;
        await api.sessions.update(id, updated.id, updated);
        setSession(updated);
    };

    const updateField = (field: string, val: any) => {
        setSession({ ...session, [field]: val });
    };

    const toggleLinkItem = async (itemId: string) => {
        if (!session || !id) return;
        const isLinked = session.linked_items?.includes(itemId);
        let newLinked;
        if (isLinked) {
            newLinked = session.linked_items.filter((i: string) => i !== itemId);
            await api.vault.update(id, itemId, { status: 'reserve' });
            setUsedItems(p => { const n = new Set(p); n.delete(itemId); return n; });
        } else {
            newLinked = [...(session.linked_items || []), itemId];
            await api.vault.update(id, itemId, { status: 'active' });
        }
        const updated = { ...session, linked_items: newLinked };
        setSession(updated);
        await api.sessions.update(id, updated.id, updated);
        loadVault();
    };

    const concludeSession = async () => {
        if (!confirm("¿Concluir sesión? Esto archivará los items usados quemables.")) return;
        if (!id || !session) return;

        const finalDate = session.status === 'completed' ? session.date : new Date().toISOString();
        const linkedIds = session.linked_items || [];
        const finalLinkedItems = [];

        for (const itemId of linkedIds) {
            const item = vaultItems.find(i => i.id === itemId);
            if (!item) continue;

            const wasUsed = usedItems.has(itemId);
            
            if (wasUsed) {
                finalLinkedItems.push(itemId);
                const isReusable = REUSABLE_TYPES.includes(item.type);
                const newUsage = (item.usage_count || 0) + 1;
                await api.vault.update(id, itemId, { 
                    status: isReusable ? 'reserve' : 'archived', 
                    usage_count: newUsage 
                });
            } else {
                await api.vault.update(id, itemId, { status: 'reserve' });
            }
        }

        const finalSession = { 
            ...session, 
            status: 'completed', 
            date: finalDate, 
            linked_items: finalLinkedItems 
        };
        
        await api.sessions.update(id, session.id, finalSession);
        
        if (session.status !== 'completed') {
            const newS = await api.sessions.create(id);
            setSession(newS);
            await api.campaigns.update(id, { active_session: newS.id });
        } else {
            setSession(finalSession);
        }
        
        loadVault();
        setUsedItems(new Set());
    };

    const handleQuickCreate = async (type: string) => {
        if (!id || !session) return;
        const defaultContent: any = { name: `Nuevo ${type}`, title: `Nuevo ${type}`, description: "" };
        if (type === 'npc') { defaultContent.archetype = ""; defaultContent.relationship = ""; }
        else if (type === 'scene') { defaultContent.scene_type = "explore"; }
        else if (type === 'location') { defaultContent.aspects = ""; }

        const newItem = await api.vault.create(id, { type, content: defaultContent, tags: [], usage_count: 0 });
        const newLinked = [...(session.linked_items || []), newItem.id];
        const updatedSession = { ...session, linked_items: newLinked };
        
        setSession(updatedSession);
        await api.sessions.update(id, session.id, updatedSession);
        await api.vault.update(id, newItem.id, { status: 'active' });

        await loadVault();
        setEditingId(newItem.id);
        setEditData(newItem);
        if (filterType === 'all') setOpenGroups(prev => ({ ...prev, [type]: true }));
    };

    const startEditingItem = (item: any) => { setEditingId(item.id); setEditData(JSON.parse(JSON.stringify(item))); };
    const saveItemEdit = async () => { if (!id || !editingId) return; await api.vault.update(id, editingId, editData); setEditingId(null); loadVault(); };
    const updateItemContent = (field: string, val: string) => {
        const newContent = { ...editData.content, [field]: val };
        if (field === 'name') newContent.title = val; if (field === 'title') newContent.name = val;
        setEditData({ ...editData, content: newContent });
    };

    const renderEditInputs = (type: string) => {
        switch (type) {
            case 'npc': return <><input value={editData.content.archetype || ''} onChange={e => updateItemContent('archetype', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-32 text-yellow-200" placeholder="Arquetipo" /><input value={editData.content.relationship || ''} onChange={e => updateItemContent('relationship', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-32 text-blue-200" placeholder="Relación" /></>;
            case 'scene': return <select value={editData.content.scene_type || 'explore'} onChange={e => updateItemContent('scene_type', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-purple-200"><option value="explore">Explore</option><option value="social">Social</option><option value="combat">Combate</option></select>;
            case 'location': return <input value={editData.content.aspects || ''} onChange={e => updateItemContent('aspects', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-48 text-green-200" placeholder="Aspectos" />;
            default: return null;
        }
    };

    const renderItemRow = (item: any) => {
        const isEditing = editingId === item.id;
        const isUsed = usedItems.has(item.id);
        const isExpanded = expandedItems[item.id];
        const name = item.content.name || item.content.title || "Sin nombre";

        if (isEditing) {
            return (
                <div key={item.id} className="border-b border-gray-700 bg-gray-800 p-2">
                    <div ref={editRef} className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 items-center">
                            <input value={editData.content.name || editData.content.title || ''} onChange={(e) => updateItemContent(item.type === 'scene' ? 'title' : 'name', e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white font-bold text-sm min-w-[200px]" autoFocus />
                            {renderEditInputs(item.type)}
                            <button onClick={saveItemEdit} className="text-green-400 ml-auto text-sm"><FontAwesomeIcon icon={faSave} /></button>
                        </div>
                        <AutoResizeTextarea value={editData.content.description || ''} onChange={(e: any) => updateItemContent('description', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-300 text-sm" />
                    </div>
                </div>
            );
        }

        const rowBg = isUsed ? 'bg-amber-900/20 border-l-2 border-amber-600' : 'hover:bg-gray-750 border-l-2 border-transparent';
        
        return (
            <div key={item.id} className={`border-b border-gray-800 last:border-0 transition-colors ${rowBg}`}>
                <div className="flex items-center gap-3 min-h-[1.5rem] p-2">
                    <button onClick={() => setUsedItems(p => { const n = new Set(p); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })} className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isUsed ? 'bg-amber-600 border-amber-600 text-black' : 'border-gray-600 text-transparent hover:border-gray-400'}`}>
                        <FontAwesomeIcon icon={faCheck} size="xs" />
                    </button>

                    <div className={`flex-1 min-w-0 text-sm leading-tight cursor-pointer ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`} onClick={() => setExpandedItems(p => ({...p, [item.id]: !p[item.id]}))}>
                        <span className={`font-bold text-white mr-2 hover:text-blue-400 transition-colors inline-flex items-center gap-1 align-baseline ${isUsed ? 'text-amber-100' : ''}`} onClick={(e) => {e.stopPropagation(); startEditingItem(item);}}>
                            {name} <FontAwesomeIcon icon={faPen} className="text-[9px] opacity-0 hover:opacity-50" />
                        </span>
                        {item.type === 'npc' && <>{item.content.archetype && <span className="text-yellow-500 font-mono text-[10px] mr-2">[{item.content.archetype}]</span>}{item.content.relationship && <span className="text-blue-300 italic text-[10px] mr-2">{item.content.relationship}</span>}</>}
                        {item.type === 'scene' && <span className="text-purple-400 text-[10px] uppercase font-bold mr-2">{item.content.scene_type}</span>}
                        {item.type === 'location' && <span className="text-green-400 font-mono text-[10px] mr-2">[{item.content.aspects}]</span>}
                        <span className="text-gray-500 mx-1">-</span><span className="text-gray-400 text-sm">{item.content.description}</span>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                        <button onClick={() => toggleLinkItem(item.id)} className="text-gray-600 hover:text-red-400 p-1" title="Desvincular"><FontAwesomeIcon icon={faUnlink} size="xs" /></button>
                    </div>
                </div>
            </div>
        );
    };

    if (!session) return <div className="p-8 text-white">Cargando sesión...</div>;

    const linkedItems = vaultItems.filter(i => session.linked_items?.includes(i.id));
    const availableForLinking = vaultItems.filter(i => i.status === 'reserve' || session.linked_items?.includes(i.id));

    const filteredLinked = linkedItems.filter(item => {
        if (filterType === 'strong_start' || filterType === 'recap') return false;
        if (filterType !== 'all' && item.type !== filterType) return false;
        const txt = (item.content.name || item.content.title || '') + (item.content.description || '');
        return txt.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-300 font-sans overflow-hidden">
            {id && (
                <TopNavBar 
                    campaignId={id} 
                    activeTab={filterType} 
                    onTabChange={setFilterType} 
                    onToggleInfo={() => setIsSidebarOpen(true)} 
                    searchQuery={searchQuery} 
                    onSearchChange={setSearchQuery} 
                    onAdd={() => handleQuickCreate(filterType)}
                    extraTabs={[
                        { id: 'strong_start', label: 'Start', icon: faBolt },
                        { id: 'recap', label: 'Recap', icon: faBookOpen }
                    ]}
                />
            )}
            {id && <CampaignSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} campaignId={id} />}

            <div className="h-12 bg-gray-800 border-b border-gray-700 flex justify-between items-center px-4 flex-shrink-0">
                <div className="flex items-center gap-3 flex-1">
                    <span className="font-bold text-green-400 text-sm whitespace-nowrap">Sesión #{session.number}</span>
                    <span className="text-gray-600">|</span>
                    <input 
                        type="text" 
                        value={session.title || ''} 
                        onChange={(e) => updateField('title', e.target.value)} 
                        onBlur={() => saveSession()}
                        placeholder="Título de la sesión (ej: Campamento Goblin)"
                        className="bg-transparent text-sm text-white placeholder-gray-600 focus:placeholder-gray-500 outline-none w-full max-w-md border-b border-transparent hover:border-gray-600 focus:border-green-500 transition-colors"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-auto mr-4">{new Date(session.date).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsLinking(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-bold flex items-center gap-2"><FontAwesomeIcon icon={faLink} /> Recursos</button>
                    <button onClick={concludeSession} className="bg-red-900/30 border border-red-800 hover:bg-red-900/50 text-red-200 text-xs px-3 py-1 rounded font-bold flex items-center gap-2"><FontAwesomeIcon icon={faCheck} /> Concluir</button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 border-r border-gray-700 flex flex-col bg-gray-900">
                    <div className="p-2 bg-gray-800 border-b border-gray-700 text-xs font-bold uppercase text-gray-400">Log de Sesión</div>
                    <textarea value={session.notes || ''} onChange={e => updateField('notes', e.target.value)} onBlur={() => saveSession()} className="flex-1 w-full bg-gray-900 p-4 text-gray-300 font-mono text-sm leading-relaxed resize-none focus:outline-none" placeholder="Notas..." spellCheck={false} />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900 p-2 relative">
                    
                    {filterType === 'strong_start' && (
                        <div className="h-full flex flex-col">
                            <h3 className="text-sm font-bold text-purple-400 uppercase mb-2 flex items-center gap-2"><FontAwesomeIcon icon={faBolt} /> Strong Start</h3>
                            <AutoResizeTextarea value={session.strong_start || ''} onChange={(e: any) => updateField('strong_start', e.target.value)} onBlur={() => saveSession()} className="flex-1 w-full bg-gray-800/50 p-4 rounded border border-gray-700 text-sm text-gray-200 resize-none focus:border-purple-500 focus:outline-none" placeholder="Escribe cómo empieza la sesión..." autoFocus />
                        </div>
                    )}

                    {filterType === 'recap' && (
                        <div className="h-full flex flex-col">
                            <h3 className="text-sm font-bold text-purple-400 uppercase mb-2 flex items-center gap-2"><FontAwesomeIcon icon={faBookOpen} /> Recap</h3>
                            <AutoResizeTextarea value={session.recap || ''} onChange={(e: any) => updateField('recap', e.target.value)} onBlur={() => saveSession()} className="flex-1 w-full bg-gray-800/50 p-4 rounded border border-gray-700 text-sm text-gray-200 resize-none focus:border-purple-500 focus:outline-none" placeholder="Resumen de lo anterior..." autoFocus />
                        </div>
                    )}

                    {(filterType !== 'strong_start' && filterType !== 'recap') && (
                        <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden shadow-xl">
                            {ITEM_TYPES.map(type => {
                                if (filterType !== 'all' && filterType !== type) return null;
                                const groupItems = filteredLinked.filter(i => i.type === type);
                                const isFilteredView = filterType !== 'all';

                                const content = (
                                    <div className={filterType === 'all' ? "bg-gray-800" : ""}>
                                        {groupItems.map(item => renderItemRow(item))}
                                        {groupItems.length === 0 && isFilteredView && <div className="p-4 text-center text-gray-500 text-xs italic">No hay elementos. Pulsa + para añadir.</div>}
                                    </div>
                                );

                                if (isFilteredView) return <div key={type}>{content}</div>;

                                return (
                                    <div key={type} className="border-b border-gray-700 last:border-0">
                                        <div onClick={() => setOpenGroups(p => ({...p, [type]: !p[type]}))} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 cursor-pointer flex items-center gap-2 select-none border-t border-gray-600 first:border-t-0 shadow-inner group">
                                            <FontAwesomeIcon icon={openGroups[type] ? faChevronDown : faChevronRight} className="text-white text-xs" />
                                            <span className="text-sm font-bold uppercase text-white tracking-wider drop-shadow-sm">{type}s</span>
                                            <span className="text-[10px] text-gray-300 bg-gray-600 px-2 py-0.5 rounded-full ml-2">({groupItems.length})</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleQuickCreate(type); }} className="ml-auto text-gray-400 hover:text-white bg-gray-600/50 hover:bg-blue-600 w-6 h-6 rounded flex items-center justify-center transition-colors" title={`Crear ${type}`}><FontAwesomeIcon icon={faPlus} size="xs" /></button>
                                        </div>
                                        {openGroups[type] && content}
                                    </div>
                                );
                            })}
                            {filteredLinked.length === 0 && filterType === 'all' && <div className="p-4 text-center text-gray-500 text-xs italic">Mesa vacía.</div>}
                        </div>
                    )}
                </div>
            </div>

            {isLinking && (
                <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-8">
                    <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl h-[85vh] rounded shadow-2xl flex flex-col">
                        <div className="flex justify-between p-4 border-b border-gray-800">
                            <h2 className="font-bold text-blue-400 uppercase text-sm">Vincular Recursos</h2>
                            <button onClick={() => setIsLinking(false)} className="text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {ITEM_TYPES.map(type => {
                                 const group = availableForLinking.filter(i => i.type === type);
                                 if (group.length === 0) return null;
                                 return (
                                     <div key={type} className="bg-gray-800/50 rounded p-2 border border-gray-800">
                                         <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">{type}s</h3>
                                         <div className="space-y-1">
                                            {group.map(item => {
                                                const isLinked = session.linked_items?.includes(item.id);
                                                return (
                                                    <div key={item.id} onClick={() => toggleLinkItem(item.id)} className={`p-2 rounded border cursor-pointer text-xs flex items-center justify-between ${isLinked ? 'bg-blue-900/30 border-blue-800' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}>
                                                        <span className={isLinked ? 'text-blue-300 font-bold' : 'text-gray-300'}>{item.content.name || item.content.title}</span>
                                                        {isLinked && <FontAwesomeIcon icon={faCheck} className="text-blue-500" />}
                                                    </div>
                                                );
                                            })}
                                         </div>
                                     </div>
                                 );
                             })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}