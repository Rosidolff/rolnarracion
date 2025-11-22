import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faEdit, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function CampaignDashboard() {
    const { id } = useParams<{ id: string }>();
    const [campaign, setCampaign] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>(null);

    useEffect(() => {
        if (id) loadCampaign();
    }, [id]);

    const loadCampaign = () => {
        if (id) api.campaigns.get(id).then(data => {
            setCampaign(data);
            setEditData(data);
        });
    };

    const handleSave = async () => {
        if (!id || !editData) return;
        await api.campaigns.update(id, editData); // We need to add this to api.ts too
        setCampaign(editData);
        setIsEditing(false);
    };

    const updateField = (field: string, value: any) => {
        setEditData({ ...editData, [field]: value });
    };

    const updateFront = (index: number, field: string, value: string) => {
        const newFronts = [...editData.fronts];
        newFronts[index] = { ...newFronts[index], [field]: value };
        setEditData({ ...editData, fronts: newFronts });
    };

    const addFront = () => {
        setEditData({ ...editData, fronts: [...(editData.fronts || []), { name: 'New Front', goal: '', grim_portents: [] }] });
    };

    const removeFront = (index: number) => {
        const newFronts = [...editData.fronts];
        newFronts.splice(index, 1);
        setEditData({ ...editData, fronts: newFronts });
    };

    const updateTruth = (index: number, value: string) => {
        const newTruths = [...editData.truths];
        newTruths[index] = value;
        setEditData({ ...editData, truths: newTruths });
    };

    const addTruth = () => {
        setEditData({ ...editData, truths: [...(editData.truths || []), 'New Truth'] });
    };

    const removeTruth = (index: number) => {
        const newTruths = [...editData.truths];
        newTruths.splice(index, 1);
        setEditData({ ...editData, truths: newTruths });
    };

    if (!campaign) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <Link to="/" className="text-gray-400 hover:text-white mb-2 block">&larr; Back to Campaigns</Link>
                    <div className="flex items-center gap-4">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editData.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="text-4xl font-bold text-purple-400 bg-gray-800 border border-gray-700 rounded px-2"
                            />
                        ) : (
                            <h1 className="text-4xl font-bold text-purple-400">{campaign.title}</h1>
                        )}
                        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="text-gray-400 hover:text-white">
                            <FontAwesomeIcon icon={isEditing ? faSave : faEdit} size="lg" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Link to={`/campaign/${id}/vault`} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold">Vault</Link>
                    <Link to={`/campaign/${id}/sessions`} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Sessions</Link>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Elevator Pitch */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-yellow-400">Elevator Pitch</h3>
                    {isEditing ? (
                        <textarea
                            value={editData.elevator_pitch}
                            onChange={(e) => updateField('elevator_pitch', e.target.value)}
                            className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-2 text-gray-300"
                        />
                    ) : (
                        <p className="text-gray-300">{campaign.elevator_pitch || "Define the core concept of your campaign."}</p>
                    )}
                </div>

                {/* Fronts */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-red-400">Active Fronts</h3>
                        {isEditing && <button onClick={addFront} className="text-green-400"><FontAwesomeIcon icon={faPlus} /></button>}
                    </div>
                    <ul className="space-y-4">
                        {(isEditing ? editData.fronts : campaign.fronts)?.map((f: any, i: number) => (
                            <li key={i} className="bg-gray-900 p-3 rounded border border-gray-700">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <input
                                                value={f.name}
                                                onChange={(e) => updateFront(i, 'name', e.target.value)}
                                                className="bg-transparent border-b border-gray-600 w-full font-bold"
                                                placeholder="Front Name"
                                            />
                                            <button onClick={() => removeFront(i)} className="text-red-500 ml-2"><FontAwesomeIcon icon={faTrash} /></button>
                                        </div>
                                        <input
                                            value={f.goal}
                                            onChange={(e) => updateFront(i, 'goal', e.target.value)}
                                            className="bg-transparent border-b border-gray-600 w-full text-sm"
                                            placeholder="Goal"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-bold">{f.name}</div>
                                        <div className="text-sm text-gray-400">{f.goal}</div>
                                    </div>
                                )}
                            </li>
                        ))}
                        {(!campaign.fronts || campaign.fronts.length === 0) && !isEditing && <li>No active fronts.</li>}
                    </ul>
                </div>

                {/* Truths */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-blue-400">The 6 Truths</h3>
                        {isEditing && <button onClick={addTruth} className="text-green-400"><FontAwesomeIcon icon={faPlus} /></button>}
                    </div>
                    <ul className="list-decimal pl-5 space-y-2 text-gray-300">
                        {(isEditing ? editData.truths : campaign.truths)?.map((t: string, i: number) => (
                            <li key={i}>
                                {isEditing ? (
                                    <div className="flex items-center">
                                        <input
                                            value={t}
                                            onChange={(e) => updateTruth(i, e.target.value)}
                                            className="bg-transparent border-b border-gray-600 w-full"
                                        />
                                        <button onClick={() => removeTruth(i)} className="text-red-500 ml-2"><FontAwesomeIcon icon={faTrash} /></button>
                                    </div>
                                ) : (
                                    <span>{t}</span>
                                )}
                            </li>
                        ))}
                        {(!campaign.truths || campaign.truths.length === 0) && !isEditing && <li>No truths defined.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
}
