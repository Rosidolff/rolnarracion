import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CampaignList from './pages/CampaignList';
import VaultManager from './pages/VaultManager';
import SessionRunner from './pages/SessionRunner';
import Bitacora from './pages/Bitacora';
import { useParams } from 'react-router-dom';

// Componente auxiliar para redirección
const RedirectToVault = () => {
    const { id } = useParams<{ id: string }>();
    return <Navigate to={`/campaign/${id}/vault`} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <Routes>
          <Route path="/" element={<CampaignList />} />
          
          {/* Redirección base */}
          <Route path="/campaign/:id" element={<RedirectToVault />} />
          
          <Route path="/campaign/:id/vault" element={<VaultManager />} />
          <Route path="/campaign/:id/sessions" element={<SessionRunner />} />
          <Route path="/campaign/:id/bitacora" element={<Bitacora />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;