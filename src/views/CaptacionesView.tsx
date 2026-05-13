import React, { useState, useEffect } from 'react';
import { Building2, CheckCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCaptaciones } from '../hooks/useCaptaciones';
import type { Captacion } from '../types/captaciones';
import IdealistaConfigModal from '../components/IdealistaConfigModal';
import CaptacionesHeader from '../components/CaptacionesHeader';
import CaptacionCard from '../components/CaptacionCard';
import CaptacionListItem from '../components/CaptacionListItem';
import CaptacionDetailsModal from '../components/CaptacionDetailsModal';
import { useApp } from '../contexts/AppContext';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';

interface CaptacionesViewProps {
  // Props removed in favor of useApp
}

const CaptacionesView: React.FC<CaptacionesViewProps> = () => {
  const { isAdmin } = useAuth();
  const { initialCaptacionId, setInitialCaptacionId } = useApp();
  const { captaciones, historial, existingLeads, chats, loading, refresh } = useCaptaciones();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCaptacion, setSelectedCaptacion] = useState<Captacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'worked' | 'responded' | 'not_worked'>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Efecto para abrir captación inicial desde navegación externa
  useEffect(() => {
    if (initialCaptacionId && captaciones.length > 0) {
      const cap = captaciones.find(c => Number(c.id) === Number(initialCaptacionId));
      if (cap) {
        setSelectedCaptacion(cap);
        if (setInitialCaptacionId) setInitialCaptacionId(null);
      }
    }
  }, [initialCaptacionId, captaciones, setInitialCaptacionId]);

  const normalizePhone = (p: string | undefined | null) => {
    if (!p) return '';
    const clean = p.replace(/[^0-9]/g, '');
    // Para España (9 dígitos) y números internacionales, tomamos los últimos 9 como base de comparación robusta
    return clean.length >= 9 ? clean.slice(-9) : clean;
  };

  const filteredCaptaciones = captaciones.filter(c => {
    const matchesSearch = (c.calle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.barrio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const hasLead = existingLeads.some(l => Number(l.captacion_id) === Number(c.id));
    
    if (filterType === 'worked') return hasLead;
    if (filterType === 'not_worked') return !hasLead;
    if (filterType === 'responded') {
      const capPhone = normalizePhone(c.telefono);
      if (!capPhone) return false;

      const chat = (chats || []).find(chat => {
        const jids = (chat.remoteJid || '').split(',');
        return jids.some(j => {
          const num = j.split('@')[0];
          return normalizePhone(num) === capPhone;
        });
      });

      // Es respuesta si: hay un chat Y (el último mensaje no es nuestro O hay mensajes sin leer)
      return !!chat && (
        chat.lastMessage?.key?.fromMe === false || 
        (chat.unreadCount !== undefined && chat.unreadCount > 0)
      );
    }

    return true;
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="captaciones-container">
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
            {notification.type === 'success' ? <CheckCheck size={18} color="var(--accent-yellow)" /> : <ShieldAlert size={18} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <CaptacionesHeader 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        count={filteredCaptaciones.length}
        loading={loading}
        onSync={refresh}
        onConfig={() => setIsConfigModalOpen(true)}
        showConfig={isAdmin}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 32, overflowX: 'auto', paddingBottom: 8 }}>
        {[
          { id: 'all', label: 'Todas', color: 'var(--text-primary)' },
          { id: 'not_worked', label: 'Sin trabajar', color: '#64748b' },
          { id: 'worked', label: 'Trabajadas', color: '#2563eb' },
          { id: 'responded', label: 'Con respuesta', color: '#10b981' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id as any)}
            style={{
              padding: '12px 24px',
              borderRadius: 100,
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: filterType === f.id ? 'black' : 'var(--card-bg)',
              color: filterType === f.id ? 'white' : f.color,
              border: filterType === f.id ? 'none' : '1px solid var(--border-color)',
              transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: filterType === f.id ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: filterType === f.id ? 'white' : f.color
            }} />
            {f.label}
            <span style={{
              opacity: 0.5, fontSize: '0.75rem', marginLeft: 4,
              background: filterType === f.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
              padding: '2px 8px', borderRadius: 8
            }}>
              {captaciones.filter(c => {
                const hasLead = existingLeads.some(l => Number(l.captacion_id) === Number(c.id));
                if (f.id === 'worked') return hasLead;
                if (f.id === 'not_worked') return !hasLead;
                if (f.id === 'responded') {
                  const capPhone = normalizePhone(c.telefono);
                  if (!capPhone) return false;
                  const chat = (chats || []).find(chat => {
                    const jids = (chat.remoteJid || '').split(',');
                    return jids.some(j => normalizePhone(j.split('@')[0]) === capPhone);
                  });
                  return !!chat && (
                    chat.lastMessage?.key?.fromMe === false || 
                    (chat.unreadCount !== undefined && chat.unreadCount > 0)
                  );
                }
                return true;
              }).length}
            </span>
          </button>
        ))}
      </div>

      <IdealistaConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      {loading && (
        <div className="captaciones-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 24
        }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <Skeleton width="100%" height="220px" borderRadius="0" />
              <div style={{ padding: 24 }}>
                <Skeleton width="80%" height="24px" style={{ marginBottom: 10 }} />
                <Skeleton width="40%" height="18px" style={{ marginBottom: 20 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                  <Skeleton width="60px" height="24px" />
                  <Skeleton width="100px" height="24px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredCaptaciones.length === 0 ? (
        <div className="card" style={{ padding: 80, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-color)' }}>
          <Building2 size={60} style={{ marginBottom: 20, opacity: 0.1, margin: '0 auto' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No hay captaciones disponibles.</p>
        </div>
      ) : (
        !loading && (
          viewMode === 'grid' ? (
              <div className="captaciones-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 24
              }}>
                {filteredCaptaciones.map((cap) => {
                  const hasLead = existingLeads.some(l => Number(l.captacion_id) === Number(cap.id));
                  const capPhone = normalizePhone(cap.telefono);
                  const chat = capPhone ? (chats || []).find(chat => {
                    const jids = (chat.remoteJid || '').split(',');
                    return jids.some(j => normalizePhone(j.split('@')[0]) === capPhone);
                  }) : null;
                  
                  const hasResponse = !!chat && (
                    chat.lastMessage?.key?.fromMe === false || 
                    (chat.unreadCount !== undefined && chat.unreadCount > 0)
                  );

                  return (
                    <CaptacionCard 
                      key={cap.id} 
                      cap={cap} 
                      historial={historial} 
                      onClick={setSelectedCaptacion} 
                      hasLead={hasLead}
                      hasResponse={hasResponse}
                    />
                  );
                })}
              </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr',
                padding: '20px 32px',
                background: 'var(--bg-color)',
                borderRadius: 24,
                marginBottom: 8
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Propiedad / Dirección</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Precio Inversión</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ubicación / Zona</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Estado</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</span>
              </div>

              <AnimatePresence>
                {filteredCaptaciones.map((cap, index) => {
                  const hasLead = existingLeads.some(l => Number(l.captacion_id) === Number(cap.id));
                  const capPhone = normalizePhone(cap.telefono);
                  const chat = capPhone ? (chats || []).find(chat => {
                    const jids = (chat.remoteJid || '').split(',');
                    return jids.some(j => normalizePhone(j.split('@')[0]) === capPhone);
                  }) : null;
                  
                  const hasResponse = !!chat && (
                    chat.lastMessage?.key?.fromMe === false || 
                    (chat.unreadCount !== undefined && chat.unreadCount > 0)
                  );

                  return (
                    <CaptacionListItem 
                      key={cap.id} 
                      cap={cap} 
                      historial={historial} 
                      index={index} 
                      onClick={setSelectedCaptacion} 
                      hasLead={hasLead}
                      hasResponse={hasResponse}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )
        )
      )}

      <AnimatePresence>
        {selectedCaptacion && (
          <CaptacionDetailsModal 
            selectedCaptacion={selectedCaptacion}
            onClose={() => setSelectedCaptacion(null)}
            historial={historial}
            existingLeads={existingLeads}
            onLeadCreated={() => {}} // Could show notification here
            onDelete={() => showNotification('✨ Captación dada de baja correctamente')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaptacionesView;
