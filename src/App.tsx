import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Views
import DashboardView from './views/DashboardView';
import LeadsManagementView from './views/LeadsManagementView';
import UserManagementView from './views/UserManagementView';
import SettingsView from './views/SettingsView';
import CaptacionesView from './views/CaptacionesView';
import CampaignsView from './views/CampaignsView';
import MessagesView from './views/MessagesView';
import MarketingView from './views/MarketingView';
import PropertiesView from './views/PropertiesView';

const App: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#f3f0e9' }}>
        <Loader2 className="animate-spin" size={32} color="#8c8c8c" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            {/* Rutas accesibles para todos los usuarios autenticados */}
            <Route path="/" element={<DashboardView />} />
            <Route path="/leads" element={<LeadsManagementView />} />
            <Route path="/messages" element={<MessagesView />} />
            <Route path="/captaciones" element={<CaptacionesView />} />
            <Route path="/properties" element={<PropertiesView />} />
            <Route path="/settings" element={<SettingsView />} />

            {/* Rutas con permiso específico */}
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute requiredPermission="campanas">
                  <CampaignsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketing"
              element={
                <ProtectedRoute requiredPermission="marketing">
                  <MarketingView />
                </ProtectedRoute>
              }
            />

            {/* Ruta exclusiva de Admin */}
            <Route
              path="/users"
              element={
                <ProtectedRoute adminOnly>
                  <UserManagementView />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;