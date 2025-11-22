import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDungeon, faBoxOpen, faDiceD20, faInfoCircle, faSearch, faSignOutAlt 
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../services/api';

interface TopNavBarProps {
    campaignId: string;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onToggleInfo: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    extraTabs?: { id: string, label: string, icon?: any }[]; // Nuevas pestañas dinámicas
}

const ITEM_TYPES = ["npc", "scene", "secret", "location", "monster", "item"];

export default function TopNavBar({ 
    campaignId, 
    activeTab, 
    onTabChange, 
    onToggleInfo,
    searchQuery,
    onSearchChange,
    extraTabs = []
}: TopNavBarProps) {
    const navigate = useNavigate();

    const handleGoToSession = async () => {
        try {
            const [campaign, sessions] = await Promise.all([
                api.campaigns.get(campaignId),
                api.sessions.list(campaignId)
            ]);

            let targetSessionId = campaign.active_session;

            if (!targetSessionId && sessions.length > 0) {
                const sorted = sessions.sort((a: any, b: any) => b.number - a.number);
                targetSessionId = sorted[0].id;
            }

            if (targetSessionId) {
                navigate(`/campaign/${campaignId}/sessions`, { state: { sessionId: targetSessionId } });
            } else {
                navigate(`/campaign/${campaignId}/sessions`);
            }
        } catch (error) {
            navigate(`/campaign/${campaignId}/sessions`);
        }
    };

    return (
        <nav className="bg-gray-900 border-b border-gray-800 flex items-stretch px-2 py-1 shadow-md z-40 h-auto min-h-[3.5rem] flex-shrink-0">
            
            {/* IZQUIERDA: Info Campaña */}
            <button 
                onClick={onToggleInfo}
                className="flex flex-col justify-center items-center px-4 mr-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded border border-gray-700 transition-colors flex-shrink-0"
                title="Info Campaña"
            >
                <FontAwesomeIcon icon={faInfoCircle} size="lg" />
                <span className="text-[10px] font-bold uppercase mt-1">Info</span>
            </button>

            {/* CENTRO: Pestañas Items (2 filas) */}
            <div className="flex-1 grid grid-cols-4 sm:grid-cols-8 gap-1 mr-2 min-w-0">
                <button 
                    onClick={() => onTabChange('all')}
                    className={`col-span-1 flex items-center justify-center text-[10px] font-bold uppercase rounded border transition-colors h-full max-h-[1.5rem] truncate ${activeTab === 'all' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                >
                    Todos
                </button>
                {ITEM_TYPES.map(type => (
                    <button 
                        key={type}
                        onClick={() => onTabChange(type)}
                        className={`col-span-1 flex items-center justify-center text-[10px] font-bold uppercase rounded border transition-colors h-full max-h-[1.5rem] truncate ${activeTab === type ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    >
                        {type}s
                    </button>
                ))}
                
                {/* Buscador */}
                <div className="col-span-full sm:col-span-3 relative h-full max-h-[1.5rem]">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full h-full pl-6 pr-2 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Pestañas Extra (Strong Start / Recap) - Se muestran en la rejilla si hay espacio o fluyen */}
                {extraTabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`col-span-2 sm:col-span-2 flex items-center justify-center gap-1 text-[10px] font-bold uppercase rounded border transition-colors h-full max-h-[1.5rem] truncate ${activeTab === tab.id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-purple-300 hover:bg-gray-700'}`}
                    >
                        {tab.icon && <FontAwesomeIcon icon={tab.icon} />}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* DERECHA: Navegación Apps */}
            <div className="flex gap-1 flex-shrink-0">
                <Link 
                    to={`/campaign/${campaignId}/vault`}
                    className="flex flex-col justify-center items-center px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-colors w-14"
                >
                    <FontAwesomeIcon icon={faBoxOpen} />
                    <span className="text-[9px] font-bold uppercase mt-1">Vault</span>
                </Link>
                
                <button 
                    onClick={handleGoToSession}
                    className="flex flex-col justify-center items-center px-3 bg-gray-800 hover:bg-gray-700 text-green-400 hover:text-green-300 rounded border border-gray-700 transition-colors w-14"
                >
                    <FontAwesomeIcon icon={faDiceD20} />
                    <span className="text-[9px] font-bold uppercase mt-1">Sesión</span>
                </button>

                <Link 
                    to="/"
                    className="flex flex-col justify-center items-center px-3 bg-gray-900 hover:bg-red-900/30 text-gray-600 hover:text-red-400 rounded border border-transparent hover:border-red-900 transition-colors ml-1"
                    title="Salir a Campañas"
                >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                </Link>
            </div>
        </nav>
    );
}