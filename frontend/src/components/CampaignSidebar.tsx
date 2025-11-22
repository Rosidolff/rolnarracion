import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faHistory, faPlus, faTrash, faCheck, faStar } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';

interface CampaignSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
}

const PLACEHOLDERS_TRUTHS = [
    "Verdad Social/Económica",
    "Verdad Política/Amenaza interna",
    "Verdad de amenaza Externa",
    "Verdad Cosmológica",
    "Verdad Histórica",
    "Otra verdad"
];

// Componente simple para Tags (Moods)
const TagInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
    const tags = value.split(',').map(t => t.trim()).filter(t => t);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className="w-full bg-gray-800 border border-gray-700 rounded p-1.5 flex flex-wrap gap-1 focus-within:border-pink-500/50 transition-colors">
            {tags.map((tag, i) => (
                <span key={i} className="bg-pink-900/30 text-pink-300 text-[10px] px-1.5 py-0.5 rounded border border-pink-800/50">
                    {tag}
                </span>
            ))}
            <input 
                className="flex-1 bg-transparent text-sm text-gray-200 outline-none min-w-[80px] px-1"
                value={value}
                onChange={handleChange}
                onBlur={handleChange} // Ensure triggered
                placeholder={tags.length === 0 ? placeholder : ""}
            />
        </div>
    );
};

const AutoResizeTextarea = ({ value, onChange, onBlur, placeholder, className }: any) => {
    const ref = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value]);
    return <textarea ref={ref} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={className} rows={1} />;
};

export default function CampaignSidebar({ isOpen, onClose, campaignId }: CampaignSidebarProps) {
    const [metadata, setMetadata] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && campaignId) {
            loadData();
        }
    }, [isOpen, campaignId]);

    const loadData = async () => {
        const meta = await api.campaigns.get(campaignId);
        const truths = meta.truths || [];
        while (truths.length < 6) truths.push("");
        setMetadata({ ...meta, truths: truths.slice(0, 6) });

        const sess = await api.sessions.list(campaignId);
        setSessions(sess.sort((a: any, b: any) => b.number - a.number));
    };

    // Auto-save function
    const persistChanges = async (newData: any) => {
        if (!newData) return;
        setMetadata(newData); // Update UI immediately
        await api.campaigns.update(campaignId, newData); // Background save
    };

    const updateField = (field: string, value: any) => {
        const newData = { ...metadata, [field]: value };
        setMetadata(newData); // UI update for typing
    };

    const handleBlur = () => {
        persistChanges(metadata);
    };

    const updateTruth = (index: number, val: string) => {
        const newTruths = [...metadata.truths];
        newTruths[index] = val;
        updateField('truths', newTruths);
    };

    const updateFront = (index: number, field: string, val: string) => {
        const newFronts = [...(metadata.fronts || [])];
        newFronts[index] = { ...newFronts[index], [field]: val };
        updateField('fronts', newFronts);
    };
    
    const addFront = () => {
        const newFronts = [...(metadata.fronts || []), { name: '', goal: '', grim_portents: [] }];
        const newData = { ...metadata, fronts: newFronts };
        persistChanges(newData);
    };

    const removeFront = (index: number) => {
        const newFronts = [...(metadata.fronts || [])];
        newFronts.splice(index, 1);
        const newData = { ...metadata, fronts: newFronts };
        persistChanges(newData);
    };

    const setActiveSession = async (sessionId: string) => {
        const updated = { ...metadata, active_session: sessionId };
        persistChanges(updated);
    };

    const goToSession = (sessionId: string) => {
        navigate(`/campaign/${campaignId}/sessions`, { state: { sessionId } });
        onClose();
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>}
            
            <div className={`fixed top-0 left-0 h-full w-96 bg-gray-900 border-r border-gray-700 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900">
                    <h2 className="text-sm font-bold uppercase text-gray-400 tracking-widest">Info Campaña</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                    
                    <section>
                        <h3 className="text-xs font-bold text-yellow-500 uppercase mb-2">Core Concept</h3>
                        <AutoResizeTextarea 
                            value={metadata?.elevator_pitch || ''} 
                            onChange={(e: any) => updateField('elevator_pitch', e.target.value)}
                            onBlur={handleBlur}
                            placeholder="El gancho principal..."
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-yellow-500/50 outline-none resize-none"
                        />
                    </section>

                    <section>
                        <h3 className="text-xs font-bold text-pink-500 uppercase mb-2">Moods</h3>
                        <TagInput 
                            value={metadata?.moods || ''}
                            onChange={(val) => { updateField('moods', val); persistChanges({...metadata, moods: val}); }}
                            placeholder="Ej: Terror, Comedia (separar por comas)"
                        />
                    </section>

                    <section>
                         <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-red-500 uppercase">Fronts</h3>
                            <button onClick={addFront} className="text-gray-500 hover:text-green-400"><FontAwesomeIcon icon={faPlus} size="xs"/></button>
                        </div>
                        <div className="space-y-3">
                            {metadata?.fronts?.map((f: any, i: number) => (
                                <div key={i} className="bg-gray-800/50 p-2 rounded border border-gray-700/50">
                                    <div className="flex gap-2 mb-1">
                                        <input 
                                            value={f.name} 
                                            onChange={(e) => updateFront(i, 'name', e.target.value)}
                                            onBlur={handleBlur}
                                            placeholder="Nombre Amenaza"
                                            className="bg-transparent border-b border-gray-700 w-full text-sm font-bold text-gray-200 focus:border-red-500 outline-none"
                                        />
                                        <button onClick={() => removeFront(i)} className="text-gray-600 hover:text-red-500"><FontAwesomeIcon icon={faTrash} size="xs"/></button>
                                    </div>
                                    <input 
                                        value={f.goal} 
                                        onChange={(e) => updateFront(i, 'goal', e.target.value)}
                                        onBlur={handleBlur}
                                        placeholder="Objetivo..."
                                        className="bg-transparent w-full text-xs text-gray-400 focus:text-gray-200 outline-none"
                                    />
                                </div>
                            ))}
                            {(!metadata?.fronts || metadata.fronts.length === 0) && <p className="text-xs text-gray-600 italic">Sin frentes activos.</p>}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-bold text-blue-500 uppercase mb-2">Las 6 Verdades</h3>
                        <ul className="space-y-2">
                            {metadata?.truths?.map((t: string, i: number) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="text-xs text-gray-600 font-mono mt-1">{i+1}.</span>
                                    <AutoResizeTextarea
                                        value={t}
                                        onChange={(e: any) => updateTruth(i, e.target.value)}
                                        onBlur={handleBlur}
                                        placeholder={PLACEHOLDERS_TRUTHS[i]}
                                        className="flex-1 bg-transparent border-b border-gray-800 hover:border-gray-700 focus:border-blue-500 outline-none text-sm text-gray-300 resize-none"
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="pt-4 border-t border-gray-800">
                         <h3 className="text-xs font-bold text-green-500 uppercase mb-3 flex items-center gap-2">
                            <FontAwesomeIcon icon={faHistory} /> Cronología
                         </h3>
                         <div className="space-y-2">
                            {sessions.length === 0 ? (
                                <p className="text-xs text-gray-600 italic">No hay sesiones registradas.</p>
                            ) : (
                                sessions.map(s => {
                                    const isActive = metadata?.active_session === s.id;
                                    return (
                                        <div key={s.id} className="flex items-center justify-between group bg-gray-800/30 p-2 rounded border border-transparent hover:border-gray-700">
                                            <div className="cursor-pointer flex-1" onClick={() => goToSession(s.id)}>
                                                <div className="text-xs font-bold text-gray-300 group-hover:text-green-400">
                                                    Sesión #{s.number} {s.status === 'completed' && <span className="text-[9px] text-gray-500 font-normal">(Comp.)</span>}
                                                </div>
                                                <div className="text-[10px] text-gray-500">{new Date(s.date).toLocaleDateString()}</div>
                                            </div>
                                            <button 
                                                onClick={() => setActiveSession(s.id)} 
                                                className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${isActive ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-200'}`}
                                                title={isActive ? "Sesión Activa" : "Marcar como Activa"}
                                            >
                                                <FontAwesomeIcon icon={isActive ? faStar : faCheck} />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                         </div>
                    </section>
                </div>
            </div>
        </>
    );
}