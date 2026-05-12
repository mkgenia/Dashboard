import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  Layers,
  Building2,
  Megaphone,
  Rocket,
  ShieldCheck,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Permisos } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { evolutionService } from '../services/evolutionService';
import { useApp } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  permission?: keyof Permisos;
}

const allNavItems: NavItem[] = [
  { id: 'dashboard', path: '/', label: 'Panel Principal', icon: Home },
  { id: 'leads', path: '/leads', label: 'Leads', icon: Users },
  { id: 'messages', path: '/messages', label: 'Mensajes', icon: MessageSquare },
  { id: 'captaciones', path: '/captaciones', label: 'Captaciones', icon: Layers },
  { id: 'properties', path: '/properties', label: 'Propiedades', icon: Building2 },
  { id: 'campaigns', path: '/campaigns', label: 'Campañas', icon: Megaphone, permission: 'campanas' },
  { id: 'marketing', path: '/marketing', label: 'Ads Center', icon: Rocket, permission: 'marketing' },
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, hasPermission, logout } = useAuth();
  const { notification } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('sidebarOpen') === 'true';
  });
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  // Polling para mensajes no leídos
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const state = await evolutionService.getConnectionState();
        if (state === 'open') {
          const chats = await evolutionService.getChats();
          const unread = chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
          if (mounted) setTotalUnread(unread);
        }
      } catch (e) { }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filtrar ítems visibles según permisos
  const visibleNavItems = allNavItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <div className="sidebar-nav-container">
          <div
            className="nav-item sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronsLeft size={22} /> : <ChevronsRight size={22} />}
          </div>

          {visibleNavItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : undefined}
              style={{ position: 'relative' }}
            >
              <item.icon size={22} />
              {item.id === 'messages' && totalUnread > 0 && (
                <div className="unread-badge">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </div>
              )}
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!sidebarOpen ? 'Usuarios' : undefined}
            >
              <ShieldCheck size={22} />
              {sidebarOpen && <span className="nav-label">Usuarios</span>}
            </NavLink>
          )}
        </div>

        <div style={{ paddingBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
          <img
            src={`https://avatar.vercel.sh/${user?.id}`}
            style={{ width: 48, height: 48, borderRadius: 18, cursor: 'pointer', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
            onClick={() => navigate('/settings')}
            alt="Profile"
          />
          <button onClick={logout} className="logout-btn">
            <LogOut size={18} />
            {sidebarOpen && <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Salir</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 50 }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 5, letterSpacing: '-1.5px' }}>
                  {location.pathname === '/' ? `Hola, ${user?.nombre || 'Agente'}!` : ''}
                </h1>
                {location.pathname === '/' && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
                    Echemos un vistazo a tu actividad hoy.
                  </p>
                )}
              </div>
              <ThemeToggle />
            </header>

            {children}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
              style={{
                position: 'fixed',
                bottom: 40,
                left: '50%',
                zIndex: 10000,
                background: notification.type === 'success' ? '#000' : '#ef4444',
                color: 'white',
                padding: '16px 32px',
                borderRadius: 100,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontWeight: 700,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {notification.type === 'success' ? <CheckCheck size={18} color="var(--accent-yellow)" /> : <ShieldCheck size={18} />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .unread-badge {
          position: absolute;
          top: 6;
          left: ${sidebarOpen ? '32px' : '24px'};
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          height: 18px;
          min-width: 18px;
          padding: 0 4px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-color);
          z-index: 2;
        }
      `}</style>
    </div>
  );
};

export default Layout;
