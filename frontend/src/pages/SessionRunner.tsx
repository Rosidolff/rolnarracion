import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faSave, 
    faCheck, 
    faLink, 
    faUnlink, 
    faTimes, 
    faChevronDown, 
    faChevronRight,
    faArrowLeft,
    faPen,
    faPlay
} from '@fortawesome/free-solid-svg-icons';

const ITEM_TYPES = ["npc", "scene", "secret", "location", "monster", "item"];
const REUSABLE_TYPES = ["npc", "location", "item", "monster"];

// --- Componentes Auxiliares ---

const AutoResizeTextarea = ({ value, onChange, placeholder, className, autoFocus, onBlur }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            className={`${className} overflow-hidden`}
            placeholder={placeholder}
            rows={1}
            autoFocus={autoFocus}
        />
    );
};

export default function SessionRunner() {
    const { id } = useParams<{ id: string }>();
    
    // Datos
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [vaultItems, setVaultItems] = useState<any[]>([]);
    
    // UI States
    const [isLinking, setIsLinking] = useState(false);
    
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        strong_start: true, recap: true,
        npc: true, scene: true, secret: true, location: true, monster: true, item: true
    });
    
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [usedItems, setUsedItems] = useState<Set<string>>(new Set());

    // Edición Inline (Items)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const editRef = useRef<HTMLDivElement>(null);

    // Edición Inline (Session Fields)
    const [editingSessionField, setEditingSessionField] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadSessions();
            loadVault();
        }
    }, [id]);

    // Auto-save al hacer click fuera (Items)
    useEffect(() => {
        const handleClickOutside = async (event: MouseEvent) => {
            if (editingId && editRef.current && !editRef.current.contains(event.target as Node)) {
                await saveItemEdit();
            }
        };
        if (editingId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingId, editData]);

    const loadSessions = () => {
        if (id) api.sessions.list(id).then(setSessions);
    };

    const loadVault = () => {
        if (id) api.vault.list(id).then(setVaultItems);
    };

    // --- Gestión de Sesión ---

    const handleCreateSession = async () => {
        if (!id) return;
        await api.sessions.create(id);
        loadSessions();
    };

    const openSession = (session: any) => {
        setActiveSession(session);
        setUsedItems(new Set());
    };

    const saveSession = async () => {
        if (!id || !activeSession) return;
        await api.sessions.update(id, activeSession.id, activeSession);
    };

    const updateSessionField = (field: string, value: any) => {
        setActiveSession({ ...activeSession, [field]: value });
    };

    const concludeSession = async () => {
        if (!confirm("¿Concluir sesión? Esto procesará los elementos marcados como usados.")) return;
        if (!id || !activeSession) return;

        const linkedIds = activeSession.linked_items || [];

        for (const itemId of linkedIds) {
            const item = vaultItems.find(i => i.id === itemId);
            if (!item) continue;

            const wasUsed = usedItems.has(itemId);
            const isReusable = REUSABLE_TYPES.includes(item.type);
            let newStatus = 'reserve';

            if (wasUsed && !isReusable) newStatus = 'archived';
            
            await api.vault.update(id, itemId, { status: newStatus });
        }

        const finalSession = { ...activeSession, status: 'completed', linked_items: [] };
        await api.sessions.update(id, activeSession.id, finalSession);
        
        setActiveSession(null);
        loadSessions();
        loadVault();
    };

    // --- Gestión de Items ---

    const toggleLinkItem = async (itemId: string) => {
        if (!activeSession || !id) return;
        const isLinked = activeSession.linked_items?.includes(itemId);
        let newLinkedItems;

        if (isLinked) {
            newLinkedItems = activeSession.linked_items.filter((i: string) => i !== itemId);
            await api.vault.update(id, itemId, { status: 'reserve' });
            const newUsed = new Set(usedItems);
            newUsed.delete(itemId);
            setUsedItems(newUsed);
        } else {
            newLinkedItems = [...(activeSession.linked_items || []), itemId];
            await api.vault.update(id, itemId, { status: 'active' });
        }

        setActiveSession({ ...activeSession, linked_items: newLinkedItems });
        await api.sessions.update(id, activeSession.id, { ...activeSession, linked_items: newLinkedItems });
        loadVault(); 
    };

    const toggleMarkAsUsed = (itemId: string) => {
        const newSet = new Set(usedItems);
        if (newSet.has(itemId)) newSet.delete(itemId);
        else newSet.add(itemId);
        setUsedItems(newSet);
    };

    // --- Edición Inline ---

    const startEditingItem = (item: any) => {
        setEditingId(item.id);
        setEditData(JSON.parse(JSON.stringify(item)));
    };

    const saveItemEdit = async () => {
        if (!id || !editingId) return;
        await api.vault.update(id, editingId, editData);
        setEditingId(null);
        loadVault(); 
    };

    const updateItemContent = (field: string, value: string) => {
        const newContent = { ...editData.content, [field]: value };
        if (field === 'name') newContent.title = value;
        if (field === 'title') newContent.name = value;
        setEditData({ ...editData, content: newContent });
    };

    const toggleGroup = (key: string) => {
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderEditInputs = (type: string) => {
        switch (type) {
            case 'npc':
                return (
                    <>
                        <input 
                            value={editData.content.archetype || ''} 
                            onChange={e => updateItemContent('archetype', e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm w-32 text-yellow-200 placeholder-gray-500"
                            placeholder="Arquetipo"
                        />
                        <input 
                            value={editData.content.relationship || ''} 
                            onChange={e => updateItemContent('relationship', e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm w-32 text-blue-200 placeholder-gray-500"
                            placeholder="Relación"
                        />
                    </>
                );
            case 'scene':
                return (
                    <select 
                        value={editData.content.scene_type || 'explore'} 
                        onChange={e => updateItemContent('scene_type', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-purple-200"
                    >
                        <option value="explore">Explore</option>
                        <option value="social">Social</option>
                        <option value="combat">Combat</option>
                    </select>
                );
            case 'location':
                return (
                    <input 
                        value={editData.content.aspects || ''} 
                        onChange={e => updateItemContent('aspects', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm w-48 text-green-200 placeholder-gray-500"
                        placeholder="Aspectos"
                    />
                );
            default: return null;
        }
    };

    // --- RENDERIZADO DE FILAS ---

    const renderItemRow = (item: any) => {
        const isEditing = editingId === item.id;
        const isExpanded = expandedItems[item.id];
        const isUsed = usedItems.has(item.id);
        const displayName = item.content.name || item.content.title || "Sin Nombre";

        // Estilos dinámicos para el estado "Usado/Activo" (Mejor visibilidad)
        const rowBgClass = isUsed 
            ? 'bg-amber-900/30 border-l-4 border-amber-500' 
            : 'hover:bg-gray-800 border-l-4 border-transparent';
        
        // Texto nombre más brillante y grande
        const textClass = isUsed 
            ? 'text-amber-100 font-bold text-base' 
            : 'text-white font-semibold text-base';

        if (isEditing) {
            return (
                <div key={item.id} className="border-b border-gray-700 bg-gray-800 p-2">
                    <div ref={editRef} className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 items-center">
                            <button onClick={() => toggleLinkItem(item.id)} className="text-gray-500 hover:text-red-400 p-1 mr-1">
                                <FontAwesomeIcon icon={faUnlink} size="sm" />
                            </button>
                            <input
                                value={editData.content.name || editData.content.title || ''}
                                onChange={(e) => updateItemContent(item.type === 'scene' ? 'title' : 'name', e.target.value)}
                                className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white font-bold text-base min-w-[200px]"
                                placeholder="Nombre"
                                autoFocus
                            />
                            {renderEditInputs(item.type)}
                            <button onClick={saveItemEdit} className="text-green-400 hover:text-green-300 ml-auto text-sm bg-gray-900 px-2 py-1 rounded border border-gray-700">
                                <FontAwesomeIcon icon={faSave} /> Guardar
                            </button>
                        </div>
                        <AutoResizeTextarea
                            value={editData.content.description || ''}
                            onChange={(e: any) => updateItemContent('description', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-200 text-sm font-sans resize-none leading-relaxed"
                            placeholder="Descripción..."
                        />
                    </div>
                </div>
            );
        }

        // MODO LECTURA (Alta legibilidad)
        return (
            <div key={item.id} className={`border-b border-gray-800 last:border-0 transition-colors ${rowBgClass}`}>
                <div className="flex items-start p-2 gap-3"> {/* items-start para alinear con la primera línea de texto */}
                    {/* Checkbox Usado */}
                    <button 
                        onClick={() => toggleMarkAsUsed(item.id)}
                        className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            isUsed ? 'bg-amber-600 border-amber-600 text-black shadow-md' : 'border-gray-600 text-transparent hover:border-gray-400 bg-gray-900'
                        }`}
                        title={isUsed ? "En uso" : "Marcar uso"}
                    >
                        <FontAwesomeIcon icon={faCheck} size="xs" />
                    </button>

                    {/* CONTENIDO INLINE */}
                    <div 
                        className={`flex-1 min-w-0 cursor-pointer select-none pt-0.5 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}
                        onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    >
                        {/* Bloque Nombre + Atributos */}
                        <span className="inline align-baseline">
                            {/* Nombre */}
                            <span 
                                className={`mr-3 hover:underline decoration-blue-500/50 decoration-2 underline-offset-2 ${textClass}`}
                                onClick={(e) => { e.stopPropagation(); startEditingItem(item); }}
                                title="Clic para editar"
                            >
                                {displayName}
                            </span>

                            {/* Atributos (Texto un poco más grande y legible) */}
                            {item.type === 'npc' && (
                                <>
                                    {item.content.archetype && <span className="text-xs text-yellow-400 font-mono mr-2 bg-yellow-900/30 px-1 rounded">[{item.content.archetype}]</span>}
                                    {item.content.relationship && <span className="text-xs text-blue-300 italic mr-2">({item.content.relationship})</span>}
                                </>
                            )}
                            {item.type === 'scene' && item.content.scene_type && (
                                <span className="text-[10px] text-purple-300 font-bold mr-2 uppercase border border-purple-700 bg-purple-900/30 px-1.5 py-0.5 rounded tracking-wide">{item.content.scene_type}</span>
                            )}
                            {item.type === 'location' && item.content.aspects && (
                                <span className="text-xs text-green-400 font-mono mr-2 bg-green-900/30 px-1 rounded">[{item.content.aspects}]</span>
                            )}
                        </span>

                        {/* Separador y Descripción */}
                        <span className="text-gray-500 mx-1 font-light">|</span>
                        <span className="text-sm text-gray-300 leading-relaxed">
                            {item.content.description || <span className="italic opacity-40">Sin descripción...</span>}
                        </span>
                    </div>

                    {/* Sacar de Sesión */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleLinkItem(item.id); }}
                        className="text-gray-600 hover:text-red-400 p-1.5 transition-colors flex-shrink-0 opacity-60 hover:opacity-100"
                        title="Quitar de sesión"
                    >
                        <FontAwesomeIcon icon={faUnlink} size="sm" />
                    </button>
                </div>
            </div>
        );
    };

    // Header Genérico
    const renderGroupHeader = (key: string, title: string, count?: number, extraClass?: string) => {
        const isOpen = openGroups[key];
        return (
            <div 
                onClick={() => toggleGroup(key)}
                className={`bg-gray-800 hover:bg-gray-750 px-4 py-2 cursor-pointer flex items-center gap-3 select-none sticky top-0 z-10 shadow-sm border-b border-gray-700 ${extraClass || ''}`}
            >
                <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-gray-400 text-xs" />
                <span className="text-xs font-bold uppercase text-gray-300 tracking-wider">{title}</span>
                {count !== undefined && <span className="ml-auto text-[10px] bg-gray-700 px-2 py-0.5 rounded-full text-gray-300 font-mono">{count}</span>}
            </div>
        );
    };

    // Acordeón de Texto para Start/Recap
    const renderSessionFieldAccordion = (key: string, title: string) => {
        const isOpen = openGroups[key];
        const content = activeSession[key] || '';
        const isEditing = editingSessionField === key;

        return (
            <div className="border-b border-gray-800">
                {renderGroupHeader(key, title)}
                
                {isOpen && (
                    <div className="bg-gray-900 p-3">
                        {isEditing ? (
                            <div className="relative">
                                <AutoResizeTextarea
                                    value={content}
                                    onChange={(e: any) => updateSessionField(key, e.target.value)}
                                    onBlur={() => { setEditingSessionField(null); saveSession(); }}
                                    autoFocus
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-3 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-blue-500 min-h-[4rem]"
                                    placeholder={`Escribe el ${title}...`}
                                />
                                <button 
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setEditingSessionField(null); saveSession(); }}
                                    className="absolute bottom-2 right-2 text-green-500 hover:text-green-400 text-xs bg-gray-900 rounded px-2 py-1 border border-gray-700"
                                >
                                    <FontAwesomeIcon icon={faSave} /> Guardar
                                </button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => setEditingSessionField(key)}
                                className="text-sm text-gray-200 whitespace-pre-wrap cursor-text hover:bg-gray-800/30 rounded p-2 border border-transparent hover:border-gray-800 min-h-[2rem] transition-colors leading-relaxed"
                            >
                                {content || <span className="italic text-gray-600">Clic para escribir...</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // --- VISTA DASHBOARD ---
    if (!activeSession) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                 <header className="mb-8 flex justify-between items-center border-b border-gray-700 pb-4">
                    <div>
                        <Link to={`/campaign/${id}`} className="text-gray-400 hover:text-white mb-2 block text-sm">
                           <FontAwesomeIcon icon={faArrowLeft} /> Volver al Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-green-400">Gestor de Sesiones</h1>
                    </div>
                    <button onClick={handleCreateSession} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                        <FontAwesomeIcon icon={faPlus} /> Nueva Sesión
                    </button>
                </header>
                <div className="space-y-4">
                    {sessions.map(session => (
                        <div key={session.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex justify-between items-center hover:border-green-500 transition-all shadow-sm">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">Sesión #{session.number}</h2>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${session.status === 'completed' ? 'bg-gray-700 text-gray-400' : 'bg-green-900 text-green-300'}`}>
                                        {session.status === 'completed' ? 'Completada' : 'Planificada'}
                                    </span>
                                    <span className="text-gray-400 text-sm font-mono">{new Date(session.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button onClick={() => openSession(session)} className="bg-gray-700 hover:bg-blue-600 text-white px-5 py-2 rounded font-bold flex items-center gap-2 transition-colors">
                                <FontAwesomeIcon icon={faPlay} /> {session.status === 'completed' ? 'Ver Log' : 'Jugar'}
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
                            <p className="text-gray-500 mb-4">No hay sesiones creadas.</p>
                            <button onClick={handleCreateSession} className="text-green-500 hover:text-green-400 font-bold">
                                + Crear la primera sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VISTA DE EJECUCIÓN ---
    const linkedItems = vaultItems.filter(i => activeSession.linked_items?.includes(i.id));
    const availableForLinking = vaultItems.filter(i => i.status === 'reserve' || activeSession.linked_items?.includes(i.id));

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white font-sans overflow-hidden">
            {/* HEADER COMPACTO */}
            <header className="h-12 bg-gray-800 border-b border-gray-700 flex justify-between items-center px-4 shadow-md z-20 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveSession(null)} className="text-gray-400 hover:text-white text-xs uppercase font-bold tracking-wide flex items-center gap-2">
                        <FontAwesomeIcon icon={faArrowLeft} /> Salir
                    </button>
                    <div className="h-4 w-px bg-gray-600"></div>
                    <span className="font-bold text-green-400 text-sm tracking-wide">Sesión #{activeSession.number}</span>
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={() => setIsLinking(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold flex items-center gap-2 transition-colors shadow-sm">
                        <FontAwesomeIcon icon={faLink} /> Añadir Recurso
                    </button>
                    <div className="h-4 w-px bg-gray-600 mx-1"></div>
                    <button onClick={concludeSession} className="text-red-300 hover:text-red-100 text-xs px-3 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 font-bold flex items-center gap-2 transition-colors">
                        <FontAwesomeIcon icon={faCheck} /> Concluir Sesión
                    </button>
                </div>
            </header>

            {/* CONTENIDO LISTAS (SCROLL) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900 pb-2">
                
                <div className="mb-4">
                    {renderSessionFieldAccordion('strong_start', 'Strong Start')}
                    {renderSessionFieldAccordion('recap', 'Recap')}
                </div>

                {linkedItems.length > 0 ? (
                    ITEM_TYPES.map(type => {
                        const groupItems = linkedItems.filter(i => i.type === type);
                        if (groupItems.length === 0) return null;
                        
                        return (
                            <div key={type} className="border-b border-gray-800 last:border-0">
                                {renderGroupHeader(type, `${type}s`, groupItems.length)}
                                {openGroups[type] && (
                                    <div className="bg-gray-900">
                                        {groupItems.map(item => renderItemRow(item))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-600 italic text-sm">
                        <p>La mesa está vacía.</p>
                        <p className="text-xs mt-1">Usa "Añadir Recurso" para traer elementos del Vault.</p>
                    </div>
                )}
            </div>

            {/* NOTAS FIJAS ABAJO */}
            <div className="h-[35vh] flex flex-col bg-gray-800 border-t border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] z-30">
                <div className="px-4 py-1.5 bg-gray-800 text-[10px] font-bold uppercase text-gray-400 flex justify-between items-center select-none border-b border-gray-700/50">
                    <span className="tracking-wider">Log de Sesión / Notas</span>
                    <span className="font-mono">{activeSession.notes?.length || 0} chars</span>
                </div>
                <textarea
                    value={activeSession.notes || ''}
                    onChange={e => updateSessionField('notes', e.target.value)}
                    onBlur={saveSession}
                    className="flex-1 w-full bg-gray-900 p-4 text-gray-200 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:bg-gray-900 transition-colors"
                    placeholder="Escribe aquí lo que ocurre durante la sesión..."
                    spellCheck={false}
                />
            </div>

            {/* MODAL VINCULACIÓN */}
            {isLinking && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-800">
                            <h2 className="text-sm font-bold uppercase text-blue-400 tracking-wider">Vault: Seleccionar Recursos</h2>
                            <button onClick={() => setIsLinking(false)} className="text-gray-400 hover:text-white px-2 transition-colors">
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 bg-gray-900 custom-scrollbar">
                            {ITEM_TYPES.map(type => {
                                const groupItems = availableForLinking.filter(i => i.type === type);
                                if (groupItems.length === 0) return null;
                                return (
                                    <div key={type} className="border-b border-gray-800">
                                        <div className="bg-gray-800 px-4 py-2 text-[10px] font-bold uppercase text-gray-400 sticky top-0 z-10 border-y border-gray-700 shadow-sm">
                                            {type}s
                                        </div>
                                        {groupItems.map(item => {
                                            const isLinked = activeSession.linked_items?.includes(item.id);
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 last:border-0 hover:bg-gray-800/80 cursor-pointer transition-colors ${isLinked ? 'bg-blue-900/20' : ''}`}
                                                    onClick={() => toggleLinkItem(item.id)}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isLinked ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                                                        {isLinked && <FontAwesomeIcon icon={faCheck} className="text-[10px] text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={`text-sm font-bold ${isLinked ? 'text-blue-300' : 'text-gray-200'}`}>{item.content.name || item.content.title}</span>
                                                            {isLinked && <span className="text-[8px] uppercase text-blue-400 font-bold bg-blue-900/30 px-1.5 py-0.5 rounded tracking-wide">En Sesión</span>}
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate">{item.content.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {availableForLinking.length === 0 && (
                                <div className="p-10 text-center text-gray-500 italic text-sm">
                                    No hay elementos disponibles en la Reserva.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}