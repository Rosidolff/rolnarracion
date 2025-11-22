import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CampaignList from './pages/CampaignList';
import CampaignDashboard from './pages/CampaignDashboard';
import VaultManager from './pages/VaultManager';
import SessionRunner from './pages/SessionRunner';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <Routes>
          <Route path="/" element={<CampaignList />} />
          <Route path="/campaign/:id" element={<CampaignDashboard />} />
          <Route path="/campaign/:id/vault" element={<VaultManager />} />
          <Route path="/campaign/:id/sessions" element={<SessionRunner />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
