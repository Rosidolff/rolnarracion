import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTrash, faTimes, faChevronDown, faChevronRight, faPen, faPlus, faShareFromSquare, faMinus
} from '@fortawesome/free-solid-svg-icons';
import TopNavBar from '../components/TopNavBar';
import CampaignSidebar from '../components/CampaignSidebar';

const ITEM_TYPES = ["npc", "scene", "secret", "location", "monster", "item"];

const AutoResizeTextarea = ({ value, onChange, placeholder, className }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);
    return <textarea ref={textareaRef} value={value} onChange={onChange} className={`${className} overflow-hidden`} placeholder={placeholder} rows={3} style={{ minHeight: '4.5rem' }} />;
};

export default function VaultManager() {
    const { id } = useParams<{ id: string }>();
    const [items, setItems] = useState<any[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Active Session
    const [activeSession, setActiveSession] = useState<any>(null);

    // Filter States
    const [showFilters, setShowFilters] = useState(false);
    // Eliminada opción 'burned' del tipo, ya que se agrupa en 'used'
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'used'>('all');
    const [subFilter, setSubFilter] = useState<string>('all');

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        npc: true, scene: true, secret: true, location: true, monster: true, item: true
    });
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const editRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            loadItems();
            loadActiveSession();
        }
    }, [id]);

    useEffect(() => {
        const handleClickOutside = async (event: MouseEvent) => {
            if (editingId && editRef.current && !editRef.current.contains(event.target as Node)) {
                await saveEdit();
            }
        };
        if (editingId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingId, editData]);

    const loadItems = () => { if (id) api.vault.list(id).then(setItems); };
    
    const loadActiveSession = async () => {
        if (!id) return;
        try {
            const camp = await api.campaigns.get(id);
            let sessId = camp.active_session;
            if (!sessId) {
                const list = await api.sessions.list(id);
                if (list.length > 0) sessId = list.sort((a: any, b: any) => b.number - a.number)[0].id;
            }
            if (sessId) {
                const sess = await api.sessions.get(id, sessId);
                setActiveSession(sess);
            }
        } catch (e) { console.error(e); }
    };

    const handleCreate = async (type: string) => {
        if (!id) return;
        const defaultContent: any = { name: `Nuevo ${type}`, title: `Nuevo ${type}`, description: "" };
        if (type === 'npc') { defaultContent.archetype = ""; defaultContent.relationship = ""; }
        else if (type === 'scene') { defaultContent.scene_type = "explore"; }
        else if (type === 'location') { defaultContent.aspects = ""; }

        const newItem = await api.vault.create(id, { type, content: defaultContent, tags: [], usage_count: 0 });
        await loadItems();
        setEditingId(newItem.id);
        setEditData(newItem);
        if (filterType === 'all') setOpenGroups(prev => ({ ...prev, [type]: true }));
    };

    const handleDelete = async (itemId: string) => {
        if (!id || !confirm("¿Borrar elemento permanentemente?")) return;
        await api.vault.delete(id, itemId);
        loadItems();
    };

    const saveEdit = async () => {
        if (!id || !editingId) return;
        await api.vault.update(id, editingId, editData);
        setEditingId(null);
        loadItems();
    };

    const toggleSessionItem = async (itemId: string) => {
        if (!id || !activeSession) {
            alert("No hay sesión activa detectada para vincular.");
            return;
        }

        const isLinked = activeSession.linked_items?.includes(itemId);
        let newLinked;
        let newStatus;

        if (isLinked) {
            newLinked = activeSession.linked_items.filter((i: string) => i !== itemId);
            newStatus = 'reserve';
        } else {
            newLinked = [...(activeSession.linked_items || []), itemId];
            newStatus = 'active';
        }

        const updatedSession = { ...activeSession, linked_items: newLinked };
        await api.sessions.update(id, activeSession.id, updatedSession);
        setActiveSession(updatedSession);

        await api.vault.update(id, itemId, { status: newStatus });
        loadItems();
    };

    const startEditing = (item: any) => { setEditingId(item.id); setEditData(JSON.parse(JSON.stringify(item))); };
    
    const updateEditContent = (field: string, value: string) => {
        const newContent = { ...editData.content, [field]: value };
        if (field === 'name') newContent.title = value;
        if (field === 'title') newContent.name = value;
        setEditData({ ...editData, content: newContent });
    };

    const renderEditInputs = (type: string) => {
        switch (type) {
            case 'npc': return <><input value={editData.content.archetype || ''} onChange={e => updateEditContent('archetype', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-32 text-yellow-200" placeholder="Arquetipo" /><input value={editData.content.relationship || ''} onChange={e => updateEditContent('relationship', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-32 text-blue-200" placeholder="Relación" /></>;
            case 'scene': return <select value={editData.content.scene_type || 'explore'} onChange={e => updateEditContent('scene_type', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-purple-200"><option value="explore">Explore</option><option value="social">Social</option><option value="combat">Combate</option></select>;
            case 'location': return <input value={editData.content.aspects || ''} onChange={e => updateEditContent('aspects', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-48 text-green-200" placeholder="Aspectos" />;
            default: return null;
        }
    };

    const getItemStatus = (item: any) => {
        if (item.status === 'archived') return 'burned';
        if ((item.usage_count || 0) > 0) return 'used';
        return 'new';
    };

    const ReadOnlyItemRow = ({ item }: any) => {
        const isExpanded = expandedItems[item.id];
        const name = item.content.name || item.content.title || "Sin nombre";
        const status = getItemStatus(item);
        const inSession = activeSession?.linked_items?.includes(item.id);

        let rowClass = "border-b border-gray-800 last:border-0 transition-colors ";
        let nameClass = "font-bold mr-2 hover:text-white transition-colors inline-flex items-center gap-1 align-baseline cursor-pointer ";

        if (inSession) {
            rowClass += "bg-green-900/10 hover:bg-green-900/20 border-l-2 border-l-green-600";
            nameClass += "text-green-400";
        } else if (status === 'burned') {
            rowClass += "bg-blue-900/10 hover:bg-blue-900/20 border-l-2 border-l-blue-900 opacity-60";
            nameClass += "text-blue-400";
        } else if (status === 'used') {
            rowClass += "bg-blue-900/10 hover:bg-blue-900/20 border-l-2 border-l-blue-500";
            nameClass += "text-blue-400";
        } else {
            rowClass += "bg-transparent hover:bg-gray-750";
            nameClass += "text-gray-200";
        }

        return (
            <div className={rowClass}>
                <div className="flex items-center gap-3 min-h-[1.5rem] py-1 px-2">
                    <div className="flex-shrink-0 flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-gray-700 hover:text-red-500 p-1 transition-colors" title="Eliminar">
                            <FontAwesomeIcon icon={faTrash} size="xs" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleSessionItem(item.id); }} 
                            className={`p-1 transition-colors ${inSession ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-blue-400'}`}
                            title={inSession ? "Quitar de Sesión Activa" : "Añadir a Sesión Activa"}
                        >
                            <FontAwesomeIcon icon={inSession ? faMinus : faShareFromSquare} size="xs" />
                        </button>
                    </div>

                    <div className={`flex-1 min-w-0 text-sm leading-tight cursor-pointer ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`} onClick={() => setExpandedItems(p => ({ ...p, [item.id]: !p[item.id] }))}>
                        <span className={nameClass} onClick={(e) => { e.stopPropagation(); startEditing(item); }}>
                            {name} <FontAwesomeIcon icon={faPen} className="text-[9px] opacity-0 hover:opacity-50" />
                        </span>
                        {item.type === 'npc' && <>{item.content.archetype && <span className="text-yellow-500 font-mono text-[11px] mr-2">[{item.content.archetype}]</span>}{item.content.relationship && <span className="text-blue-300 italic text-[11px] mr-2">{item.content.relationship}</span>}</>}
                        {item.type === 'scene' && item.content.scene_type && <span className="text-purple-400 text-[10px] uppercase font-bold border border-purple-900 px-1 rounded mr-2 align-middle">{item.content.scene_type}</span>}
                        {item.type === 'location' && item.content.aspects && <span className="text-green-400 font-mono text-[11px] mr-2">[{item.content.aspects}]</span>}
                        <span className="text-gray-600 mr-2">-</span><span className="text-gray-400">{item.content.description}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderItemRow = (item: any) => {
        const isEditing = editingId === item.id;
        if (isEditing) {
            return (
                <div key={item.id} className="border-b border-gray-800 py-1 px-2 bg-gray-800/50">
                    <div ref={editRef} className="flex items-start gap-3 rounded -ml-2 -mr-2 px-2">
                        <div className="pt-1.5 flex-shrink-0"><button onClick={() => handleDelete(item.id)} className="text-gray-600 hover:text-red-500 p-1"><FontAwesomeIcon icon={faTrash} size="xs" /></button></div>
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex flex-wrap gap-2 items-center">
                                <input value={editData.content.name || editData.content.title || ''} onChange={(e) => updateEditContent(item.type === 'scene' ? 'title' : 'name', e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-0.5 text-white font-bold text-sm min-w-[200px]" autoFocus />
                                {renderEditInputs(item.type)}
                                <div className="flex gap-2 ml-auto"><button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-200 text-xs px-2 py-0.5 bg-gray-900 rounded border border-gray-700"><FontAwesomeIcon icon={faTimes} /></button></div>
                            </div>
                            <AutoResizeTextarea value={editData.content.description || ''} onChange={(e: any) => updateEditContent('description', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-300 text-sm font-sans resize-none" placeholder="Descripción..." />
                        </div>
                    </div>
                </div>
            );
        }
        return <ReadOnlyItemRow key={item.id} item={item} />;
    };

    const searchFilteredItems = items.filter(item => {
        const text = (item.content.name || item.content.title || '').toLowerCase() + (item.content.description || '').toLowerCase();
        if (!text.includes(searchQuery.toLowerCase())) return false;

        const status = getItemStatus(item);
        if (statusFilter !== 'all') {
            if (statusFilter === 'used') {
                // El filtro 'used' ahora engloba 'used' Y 'burned'
                if (status !== 'used' && status !== 'burned') return false;
            } else if (status !== statusFilter) {
                return false;
            }
        }

        if (subFilter !== 'all' && item.type === 'scene' && item.content.scene_type !== subFilter) return false;

        return true;
    });

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-300 font-sans">
            {id && <TopNavBar 
                campaignId={id} 
                activeTab={filterType} 
                onTabChange={(tab) => { setFilterType(tab); setSubFilter('all'); }} 
                onToggleInfo={() => setIsSidebarOpen(true)} 
                searchQuery={searchQuery} 
                onSearchChange={setSearchQuery}
                onAdd={() => handleCreate(filterType)} 
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
                filterStatus={statusFilter}
                onFilterStatusChange={(val) => setStatusFilter(val as any)}
                filterSub={subFilter}
                onFilterSubChange={setSubFilter}
            />}
            {id && <CampaignSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} campaignId={id} />}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-900">
                <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden shadow-xl">
                    {ITEM_TYPES.map(type => {
                        if (filterType !== 'all' && filterType !== type) return null;
                        const groupItems = searchFilteredItems.filter(i => i.type === type);
                        const isFilteredView = filterType !== 'all';
                        
                        const content = (
                            <div className={filterType === 'all' ? "bg-gray-800" : ""}>
                                {groupItems.map(item => renderItemRow(item))}
                                {groupItems.length === 0 && isFilteredView && <div className="p-4 text-center text-gray-500 text-xs italic">No hay elementos.</div>}
                            </div>
                        );

                        if (isFilteredView) return <div key={type}>{content}</div>;

                        return (
                            <div key={type} className="border-b border-gray-700 last:border-0">
                                <div onClick={() => setOpenGroups(p => ({...p, [type]: !p[type]}))} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 cursor-pointer flex items-center gap-2 select-none border-t border-gray-600 first:border-t-0 shadow-inner group">
                                    <FontAwesomeIcon icon={openGroups[type] ? faChevronDown : faChevronRight} className="text-white text-xs" />
                                    <span className="text-sm font-bold uppercase text-white tracking-wider drop-shadow-sm">{type}s</span>
                                    <span className="text-[10px] text-gray-300 bg-gray-600 px-2 py-0.5 rounded-full ml-2">({groupItems.length})</span>
                                    
                                    {filterType === 'all' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleCreate(type); }} className="ml-auto text-gray-400 hover:text-white bg-gray-600/50 hover:bg-blue-600 w-6 h-6 rounded flex items-center justify-center transition-colors" title={`Crear ${type}`}><FontAwesomeIcon icon={faPlus} size="xs" /></button>
                                    )}
                                </div>
                                {openGroups[type] && content}
                            </div>
                        );
                    })}
                    {searchFilteredItems.length === 0 && filterType === 'all' && <div className="p-4 text-center text-gray-500 text-xs italic">No hay elementos coincidentes.</div>}
                </div>
            </div>
        </div>
    );
}