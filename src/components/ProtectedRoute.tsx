import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import type { Permisos } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Exige que el usuario sea Admin */
  adminOnly?: boolean;
  /** Exige un permiso específico (los Admin siempre lo tienen) */
  requiredPermission?: keyof Permisos;
}

const AccessDenied: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 24,
      textAlign: 'center',
    }}
  >
    <div style={{
      width: 80,
      height: 80,
      borderRadius: 28,
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--border-color)',
    }}>
      <ShieldOff size={36} style={{ opacity: 0.3 }} />
    </div>
    <div>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: 10 }}>
        Acceso Restringido
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 380 }}>
        No tienes permisos para acceder a este módulo. Contacta con un administrador si crees que es un error.
      </p>
    </div>
    <button
      className="btn-black"
      style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', padding: '14px 32px' }}
      onClick={() => window.history.back()}
    >
      Volver atrás
    </button>
  </motion.div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly, requiredPermission }) => {
  const { user, isAdmin, hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Loader2 size={32} />
        </motion.div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;

  if (adminOnly && !isAdmin) return <AccessDenied />;
  if (requiredPermission && !hasPermission(requiredPermission)) return <AccessDenied />;

  return <>{children}</>;
};

export default ProtectedRoute;
