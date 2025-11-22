import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faTrash, 
    faTimes, 
    faSearch,
    faChevronDown,
    faChevronRight,
    faPen,
    faSave
} from '@fortawesome/free-solid-svg-icons';

const ITEM_TYPES = ["npc", "scene", "secret", "location", "monster", "item"];

interface VaultItem {
    id: string;
    type: string;
    status: string;
    content: {
        name?: string;
        title?: string;
        description?: string;
        archetype?: string;
        relationship?: string;
        scene_type?: string;
        aspects?: string;
        [key: string]: any;
    };
    tags: string[];
}

// --- Componentes Auxiliares ---

const AutoResizeTextarea = ({ value, onChange, placeholder, className }: { value: string, onChange: (e: any) => void, placeholder?: string, className?: string }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
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
            className={`${className} overflow-hidden`}
            placeholder={placeholder}
            rows={3}
            style={{ minHeight: '4.5rem' }}
        />
    );
};

export default function VaultManager() {
    const { id } = useParams<{ id: string }>();
    const [items, setItems] = useState<VaultItem[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        npc: true, scene: true, secret: true, location: true, monster: true, item: true
    });

    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    // Quick Create State
    const [newItemType, setNewItemType] = useState(ITEM_TYPES[0]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemDetails, setNewItemDetails] = useState({
        archetype: '',
        relationship: '',
        scene_type: 'explore',
        aspects: ''
    });

    // Inline Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    
    const editRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) loadItems();
    }, [id]);

    // Auto-save al hacer click fuera
    useEffect(() => {
        const handleClickOutside = async (event: MouseEvent) => {
            if (editingId && editRef.current && !editRef.current.contains(event.target as Node)) {
                await saveEdit();
            }
        };

        if (editingId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingId, editData]);

    const loadItems = () => {
        if (id) api.vault.list(id).then(setItems).catch(console.error);
    };

    const toggleGroup = (type: string) => {
        setOpenGroups(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleCreate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!id || !newItemName.trim()) return;

        const content: any = {
            name: newItemName,
            title: newItemName,
            description: newItemDesc
        };

        if (newItemType === 'npc') {
            content.archetype = newItemDetails.archetype;
            content.relationship = newItemDetails.relationship;
        } else if (newItemType === 'scene') {
            content.scene_type = newItemDetails.scene_type;
        } else if (newItemType === 'location') {
            content.aspects = newItemDetails.aspects;
        }

        const payload = { type: newItemType, content, tags: [] };
        await api.vault.create(id, payload);
        
        setNewItemName('');
        setNewItemDesc('');
        setNewItemDetails({ archetype: '', relationship: '', scene_type: 'explore', aspects: '' });
        
        if (filterType !== 'all' && filterType !== newItemType) setFilterType(newItemType);
        loadItems();
    };

    const handleDelete = async (itemId: string) => {
        if (!id || !confirm("¿Borrar elemento permanentemente?")) return;
        await api.vault.delete(id, itemId);
        loadItems();
        if (editingId === itemId) setEditingId(null);
    };

    const startEditing = (item: VaultItem) => {
        setEditingId(item.id);
        setEditData(JSON.parse(JSON.stringify(item)));
    };

    const saveEdit = async () => {
        if (!id || !editingId) return;
        await api.vault.update(id, editingId, editData);
        setEditingId(null);
        loadItems();
    };

    const updateEditContent = (field: string, value: string) => {
        const newContent = { ...editData.content, [field]: value };
        if (field === 'name') newContent.title = value;
        if (field === 'title') newContent.name = value;
        setEditData({ ...editData, content: newContent });
    };

    // --- RENDER HELPERS ---

    const renderCreateFields = () => {
        switch (newItemType) {
            case 'npc':
                return (
                    <>
                        <input
                            placeholder="Arquetipo"
                            value={newItemDetails.archetype}
                            onChange={e => setNewItemDetails({...newItemDetails, archetype: e.target.value})}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs w-24 focus:border-blue-500 outline-none"
                        />
                        <input
                            placeholder="Relación"
                            value={newItemDetails.relationship}
                            onChange={e => setNewItemDetails({...newItemDetails, relationship: e.target.value})}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs w-24 focus:border-blue-500 outline-none"
                        />
                    </>
                );
            case 'scene':
                return (
                    <select
                        value={newItemDetails.scene_type}
                        onChange={e => setNewItemDetails({...newItemDetails, scene_type: e.target.value})}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                    >
                        <option value="explore">Exploración</option>
                        <option value="social">Social</option>
                        <option value="combat">Combate</option>
                    </select>
                );
            case 'location':
                return (
                    <input
                        placeholder="Aspectos (separados por coma)"
                        value={newItemDetails.aspects}
                        onChange={e => setNewItemDetails({...newItemDetails, aspects: e.target.value})}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs w-48 focus:border-blue-500 outline-none"
                    />
                );
            default:
                return null;
        }
    };

    const renderEditInputs = (type: string) => {
        switch (type) {
            case 'npc':
                return (
                    <>
                        <input 
                            value={editData.content.archetype || ''} 
                            onChange={e => updateEditContent('archetype', e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-32 text-yellow-200"
                            placeholder="Arquetipo"
                        />
                        <input 
                            value={editData.content.relationship || ''} 
                            onChange={e => updateEditContent('relationship', e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-32 text-blue-200"
                            placeholder="Relación"
                        />
                    </>
                );
            case 'scene':
                return (
                    <select 
                        value={editData.content.scene_type || 'explore'} 
                        onChange={e => updateEditContent('scene_type', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-purple-200"
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
                        onChange={e => updateEditContent('aspects', e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-48 text-green-200"
                        placeholder="Aspectos"
                    />
                );
            default:
                return null;
        }
    };

    // Subcomponente para la fila de lectura (para manejar el ref y layout effect individualmente)
    const ReadOnlyItemRow = ({ item, isExpanded, toggleExpand, startEditing, handleDelete }: any) => {
        const contentRef = useRef<HTMLDivElement>(null);
        const [isOverflowing, setIsOverflowing] = useState(false);
        
        const { name, title, description, archetype, relationship, scene_type, aspects } = item.content;
        const displayName = name || title || "Sin nombre";
        const displayDescription = (description || "").trim();

        // Detectar si el texto es más largo que el contenedor (para mostrar manita o no)
        useLayoutEffect(() => {
            if (contentRef.current) {
                // Comprobamos si el scrollWidth es mayor que el clientWidth cuando está colapsado (truncate)
                // O si ya está expandido, asumimos que era overflowable
                const hasOverflow = contentRef.current.scrollWidth > contentRef.current.clientWidth;
                setIsOverflowing(hasOverflow || isExpanded);
            }
        }, [item, isExpanded]); // Recalcular si cambia el item o el estado

        const handleRowClick = () => {
            if (isOverflowing) toggleExpand(item.id);
        };

        return (
            <div className="flex items-center gap-3 min-h-[1.5rem]">
                {/* 1. BOTÓN ELIMINAR ALINEADO (Izquierda) */}
                <div className="flex-shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                        className="text-gray-700 hover:text-red-500 transition-colors p-1"
                        title="Eliminar"
                    >
                        <FontAwesomeIcon icon={faTrash} size="xs" />
                    </button>
                </div>

                {/* 2. CONTENIDO DE TEXTO (Fluido) */}
                {/* flex-1 y min-w-0 son CRÍTICOS para que truncate funcione dentro de flex */}
                <div 
                    ref={contentRef}
                    className={`flex-1 min-w-0 text-sm leading-tight ${isOverflowing ? 'cursor-pointer' : 'cursor-default'} ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}
                    onClick={handleRowClick}
                    title={isOverflowing && !isExpanded ? "Clic para expandir" : ""}
                >
                    {/* NOMBRE (Editable) */}
                    <span 
                        className="font-bold text-white hover:text-blue-400 transition-colors mr-2 inline-flex items-center gap-1 align-baseline cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                        title="Clic para editar"
                    >
                        {displayName}
                        <FontAwesomeIcon icon={faPen} className="text-[9px] opacity-0 hover:opacity-50 transition-opacity" />
                    </span>

                    {/* ATRIBUTOS */}
                    {item.type === 'npc' && (
                        <>
                            {archetype && <span className="text-yellow-500 font-mono text-[11px] mr-2">[{archetype}]</span>}
                            {relationship && <span className="text-blue-300 italic text-[11px] mr-2">{relationship}</span>}
                        </>
                    )}
                    
                    {item.type === 'scene' && scene_type && (
                        <span className="text-purple-400 text-[10px] uppercase font-bold border border-purple-900 px-1 rounded mr-2 align-middle">
                            {scene_type}
                        </span>
                    )}

                    {item.type === 'location' && aspects && (
                        <span className="text-green-400 font-mono text-[11px] mr-2">[{aspects}]</span>
                    )}
                    
                    {/* DESCRIPCIÓN */}
                    <span className="text-gray-600 mr-2">-</span>
                    <span className="text-gray-400">
                        {displayDescription || <span className="italic opacity-30">...</span>}
                    </span>
                </div>

                {/* 3. ESTADO ACTIVO (Derecha) */}
                {item.status === 'active' && (
                    <div className="flex-shrink-0">
                        <span className="text-[9px] bg-green-900 text-green-100 px-1 py-0 rounded uppercase font-bold tracking-wider leading-none">
                            ACTIVO
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const renderItemRow = (item: VaultItem) => {
        const isEditing = editingId === item.id;
        const isExpanded = expandedItems[item.id];

        return (
            <div key={item.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-750 transition-colors">
                <div className="py-1 px-2">
                    {isEditing ? (
                        /* --- MODO EDICIÓN --- */
                        /* Usamos items-start en flex para alinear el botón de borrar arriba si el form crece */
                        <div ref={editRef} className="flex items-start gap-3 py-1 bg-gray-800/50 rounded -ml-2 -mr-2 px-2"> {/* Márgenes negativos para resaltar fondo */}
                            
                            {/* Botón Eliminar en Edición (Misma posición) */}
                            <div className="pt-1.5 flex-shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                                    className="text-gray-600 hover:text-red-500 transition-colors p-1"
                                    title="Eliminar"
                                >
                                    <FontAwesomeIcon icon={faTrash} size="xs" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <input
                                        value={editData.content.name || editData.content.title || ''}
                                        onChange={(e) => updateEditContent(item.type === 'scene' ? 'title' : 'name', e.target.value)}
                                        className="bg-gray-900 border border-gray-600 rounded px-2 py-0.5 text-white font-bold text-sm min-w-[200px]"
                                        placeholder="Nombre"
                                        autoFocus
                                    />
                                    {renderEditInputs(item.type)}
                                    
                                    <div className="flex gap-2 ml-auto">
                                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-200 text-xs px-2 py-0.5 bg-gray-900 rounded border border-gray-700" title="Cerrar">
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </div>
                                </div>

                                <AutoResizeTextarea
                                    value={editData.content.description || ''}
                                    onChange={(e) => updateEditContent('description', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-300 text-sm font-sans resize-none"
                                    placeholder="Descripción..."
                                />
                            </div>
                        </div>
                    ) : (
                        /* --- MODO LECTURA (Componente separado para lógica de overflow) --- */
                        <ReadOnlyItemRow 
                            item={item} 
                            isExpanded={!!isExpanded} 
                            toggleExpand={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            startEditing={startEditing}
                            handleDelete={handleDelete}
                        />
                    )}
                </div>
            </div>
        );
    };

    const searchFilteredItems = items.filter(item => {
        const text = (item.content.name || item.content.title || '').toLowerCase() + (item.content.description || '').toLowerCase();
        return text.includes(searchQuery.toLowerCase());
    });

    return (
        <div className="p-4 max-w-full mx-auto bg-gray-900 min-h-screen text-gray-300 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <div className="flex items-center gap-4">
                    <Link to={`/campaign/${id}`} className="text-gray-400 hover:text-white text-sm">&larr; Dashboard</Link>
                    <h1 className="text-lg font-bold text-blue-400">Vault</h1>
                </div>

                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600 text-xs" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-6 pr-2 py-1 bg-gray-800 border border-gray-700 rounded-full text-white text-xs focus:border-blue-500 outline-none w-40 transition-all focus:w-64"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    Todos
                </button>
                {ITEM_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        {type}s
                    </button>
                ))}
            </div>

            {/* Quick Add */}
            <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-4 bg-gray-800 p-2 rounded border border-gray-700 items-center text-sm shadow-sm">
                <div className="text-blue-500 px-1"><FontAwesomeIcon icon={faPlus} /></div>
                <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs uppercase font-bold text-white focus:outline-none focus:border-blue-500"
                >
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                    type="text"
                    placeholder="Nombre"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 min-w-[120px] bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                />
                {renderCreateFields()}
                <input
                    type="text"
                    placeholder="Descripción..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="flex-[2] min-w-[150px] bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold text-xs">
                    Add
                </button>
            </form>

            {/* List Content */}
            <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden shadow-xl">
                {filterType === 'all' ? (
                    <div>
                        {ITEM_TYPES.map(type => {
                            const groupItems = searchFilteredItems.filter(i => i.type === type);
                            if (groupItems.length === 0) return null;

                            const isOpen = openGroups[type];

                            return (
                                <div key={type} className="border-b border-gray-700 last:border-0">
                                    {/* SEPARATOR HEADER */}
                                    <div 
                                        onClick={() => toggleGroup(type)}
                                        className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 cursor-pointer flex items-center gap-2 select-none border-t border-gray-600 first:border-t-0 shadow-inner"
                                    >
                                        <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-white text-xs transition-transform" />
                                        <span className="text-sm font-bold uppercase text-white tracking-wider drop-shadow-sm">{type}s</span>
                                        <span className="text-[10px] text-gray-300 ml-auto bg-gray-600 px-2 py-0.5 rounded-full">({groupItems.length})</span>
                                    </div>

                                    {isOpen && (
                                        <div className="bg-gray-800">
                                            {groupItems.map(item => renderItemRow(item))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                         {searchFilteredItems.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-xs italic">
                                No hay elementos coincidentes.
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {searchFilteredItems
                            .filter(item => item.type === filterType)
                            .map(item => renderItemRow(item))
                        }
                        {searchFilteredItems.filter(item => item.type === filterType).length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-xs italic">
                                No hay {filterType}s creados.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}