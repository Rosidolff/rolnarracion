import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';

const ITEM_TYPES = ["npc", "scene", "secret", "location", "monster", "item"];

export default function VaultManager() {
    const { id } = useParams<{ id: string }>();
    const [items, setItems] = useState<any[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Quick Create State
    const [newItemType, setNewItemType] = useState(ITEM_TYPES[0]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');

    // Inline Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    useEffect(() => {
        if (id) loadItems();
    }, [id]);

    const loadItems = () => {
        if (id) {
            console.log("Loading items for campaign", id);
            api.vault.list(id).then(data => {
                console.log("Items loaded:", data);
                setItems(data);
            }).catch(err => console.error("Error loading items:", err));
        }
    };

    const handleCreate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!id || !newItemName.trim()) return;

        const payload = {
            type: newItemType,
            content: {
                name: newItemName,
                title: newItemName, // Fallback for scenes
                description: newItemDesc
            },
            tags: []
        };

        await api.vault.create(id, payload);
        setNewItemName('');
        setNewItemDesc('');
        loadItems();
    };

    const handleDelete = async (itemId: string) => {
        if (!id || !confirm("Delete this item?")) return;
        await api.vault.delete(id, itemId);
        loadItems();
    };

    const startEditing = (item: any) => {
        setEditingId(item.id);
        setEditData(item);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = async () => {
        if (!id || !editingId) return;
        await api.vault.update(id, editingId, editData);
        setEditingId(null);
        loadItems();
    };

    const updateEditField = (field: string, value: string) => {
        const newContent = { ...editData.content, [field]: value };
        // Also sync name/title for convenience
        if (field === 'name') newContent.title = value;
        if (field === 'title') newContent.name = value;
        setEditData({ ...editData, content: newContent });
    };

    const filteredItems = items.filter(item => {
        const matchesType = filterType === 'all' || item.type === filterType;
        const matchesSearch = (item.content.name || item.content.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.content.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="p-4 max-w-full mx-auto bg-gray-900 min-h-screen text-gray-300 font-sans text-sm">
            {/* Header & Navigation */}
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <div className="flex items-center gap-4">
                    <Link to={`/campaign/${id}`} className="text-gray-400 hover:text-white">&larr; Dashboard</Link>
                    <h1 className="text-xl font-bold text-blue-400">Vault</h1>
                </div>

                {/* Filters */}
                <div className="flex gap-1">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                    >
                        All
                    </button>
                    {ITEM_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1 rounded text-xs font-bold uppercase ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none w-48"
                    />
                </div>
            </div>

            {/* Quick Add Row */}
            <form onSubmit={handleCreate} className="flex gap-2 mb-4 bg-gray-800 p-2 rounded border border-gray-700 items-center">
                <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs uppercase font-bold w-24"
                >
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                    type="text"
                    placeholder="Name / Title"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1"
                />
                <input
                    type="text"
                    placeholder="Short Description"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="flex-[2] bg-gray-900 border border-gray-600 rounded px-2 py-1"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded font-bold">
                    <FontAwesomeIcon icon={faPlus} /> Add
                </button>
            </form>

            {/* Dense List View */}
            <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900 text-gray-500 text-xs uppercase border-b border-gray-700">
                            <th className="p-2 w-24">Type</th>
                            <th className="p-2 w-1/4">Name</th>
                            <th className="p-2">Description</th>
                            <th className="p-2 w-24 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => {
                            const isEditing = editingId === item.id;
                            return (
                                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-750 group">
                                    {/* Type Column */}
                                    <td className="p-2">
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </td>

                                    {/* Name Column */}
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input
                                                value={editData.content.name || editData.content.title || ''}
                                                onChange={(e) => updateEditField(item.type === 'scene' ? 'title' : 'name', e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white font-bold"
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className="font-bold text-white cursor-pointer hover:text-blue-400"
                                                onClick={() => startEditing(item)}
                                            >
                                                {item.content.name || item.content.title || "Untitled"}
                                            </span>
                                        )}
                                    </td>

                                    {/* Description Column */}
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input
                                                value={editData.content.description || ''}
                                                onChange={(e) => updateEditField('description', e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-300"
                                            />
                                        ) : (
                                            <span
                                                className="text-gray-400 cursor-pointer hover:text-gray-200 truncate block"
                                                onClick={() => startEditing(item)}
                                            >
                                                {item.content.description || "No description"}
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions Column */}
                                    <td className="p-2 text-right">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><FontAwesomeIcon icon={faSave} /></button>
                                                <button onClick={cancelEditing} className="text-gray-400 hover:text-gray-300"><FontAwesomeIcon icon={faTimes} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><FontAwesomeIcon icon={faTrash} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500 italic">
                                    No items found. Use the form above to add one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
