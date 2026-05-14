import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  QrCode,
  Phone,
  Search,
  Building2,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { Lead } from '../types/leads';
import { useLocalStorage } from '../hooks/usePersistence';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Skeleton from '../components/Skeleton';
import type { EvolutionMessage } from '../types/evolution';
import { leadService } from '../services/leadService';

interface LeadsManagementViewProps {
  leads?: Lead[];
}

const LeadsManagementView: React.FC<LeadsManagementViewProps> = ({ leads: initialLeads = [] }) => {
  const { isAdmin } = useAuth();
  const { setInitialCaptacionId } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useLocalStorage('leads_filter', 'Captaciones'); // Default to Captaciones as requested
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [realMessages, setRealMessages] = useState<EvolutionMessage[]>([]);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [leadProperties, setLeadProperties] = useState<any[]>([]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      // Intentamos con created_at (estándar Supabase)
      let { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error con created_at, intentando fecha_creacion...');
        const retry = await supabase
          .from('leads')
          .select('*')
          .order('fecha_creacion', { ascending: false });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.warn('Cargando leads sin ordenamiento por error de columna...');
        const retry = await supabase.from('leads').select('*');
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Error definitivo de Supabase en leads:', error);
        setDbError(error.message);
        throw error;
      }

      setDbError(null);
      if (data) {
        setLeads(data as Lead[]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id);

      if (error) throw error;

      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
      setShowDeleteConfirm(false);

      setNotification({ message: '✨ Lead eliminado correctamente', type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Error deleting lead:', err);
      setNotification({ message: '❌ Error al eliminar el lead', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLead || !selectedLead) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('leads')
        .update({
          nombre: editingLead.nombre,
          apellidos: editingLead.apellidos,
          email: editingLead.email,
          telefono: editingLead.telefono,
          notas: editingLead.notas,
          estado: editingLead.estado,
          wa_jid: editingLead.wa_jid
        })
        .eq('id', selectedLead.id);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === selectedLead.id ? editingLead : l));
      setSelectedLead(editingLead);
      setIsEditing(false);
      setNotification({ message: '✨ Lead actualizado correctamente', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error saving lead:', err);
      setNotification({ message: '❌ Error al guardar cambios', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Cargar mensajes reales de WhatsApp
  useEffect(() => {
    const fetchRealMessages = async () => {
      const identifier = selectedLead?.wa_jid || selectedLead?.telefono;
      if (!identifier) {
        setRealMessages([]);
        return;
      }

      setFetchingMessages(true);
      try {
        const { evolutionService } = await import('../services/evolutionService');
        const msgs = await evolutionService.getMessages(identifier);
        if (msgs && Array.isArray(msgs)) {
          setRealMessages(msgs.slice(0, 10).reverse());
        } else {
          setRealMessages([]);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setRealMessages([]);
      } finally {
        setFetchingMessages(false);
      }
    };

    if (selectedLead && !isEditing) {
      fetchRealMessages();

      // Cargar propiedades del lead
      const fetchProps = async () => {
        try {
          const props = await leadService.getLeadProperties(selectedLead.id);
          setLeadProperties(props || []);
        } catch (err) {
          console.error('Error fetching lead properties:', err);
        }
      };
      fetchProps();
    }
  }, [selectedLead, isEditing]);

  useEffect(() => {
    fetchLeads();

    const subscription = supabase
      .channel('leads-view-realtime')
      .on('postgres_changes', { event: '*', table: 'leads', schema: 'public' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredLeads = leads.filter(l => {
    const nameMatch = `${l.nombre || ''} ${l.apellidos || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (l.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (l.telefono || '').includes(searchTerm);

    const matchesSearch = nameMatch || emailMatch || phoneMatch;
    const matchesFilter = filterSource === 'Todas' || l.fuente === filterSource;
    return matchesSearch && matchesFilter;
  });

  const sources = ['Todas', 'Captaciones', 'Propiedades', 'WhatsApp', 'Web', 'QR', 'Llamada', 'Solicitud valoración'];

  const getSourceIcon = (fuente: string) => {
    const f = (fuente || '').toLowerCase();
    if (f.includes('whatsapp')) return <MessageSquare size={16} />;
    if (f.includes('qr')) return <QrCode size={16} />;
    if (f.includes('llamada')) return <Phone size={16} />;
    if (f.includes('propiedad')) return <Building2 size={16} />;
    if (f.includes('valoración')) return <TrendingUp size={16} />;
    if (f.includes('web')) return <ExternalLink size={16} />;
    return <Search size={16} />;
  };

  const getStatusClass = (estado: string) => {
    if (!estado) return '';
    const e = estado.toLowerCase();
    if (e.includes('nuevo')) return 'status-nuevo';
    if (e.includes('gestión')) return 'status-gestion';
    if (e.includes('cita')) return 'status-cita';
    if (e.includes('convertido')) return 'status-convertido';
    if (e.includes('descartado')) return 'status-descartado';
    return '';
  };

  const getDateValue = (lead: Lead) => {
    const date = lead.fecha_creacion || lead.created_at;
    if (!date) return new Date();
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
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

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>Gestión de Leads</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            {loading ? 'Cargando...' : `${filteredLeads.length} leads en ${filterSource}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '12px 24px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: '#2563eb'
            }} />
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{leads.filter(l => l.fuente === 'Captaciones').length} Prospectos en Captación</span>
          </div>
          <button
            onClick={() => fetchLeads()}
            className="btn-black"
            style={{ borderRadius: 20, padding: '12px 24px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <section className="card" style={{ padding: '40px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 40, flexDirection: 'column' }}>
          <div className="search-pill" style={{ width: '100%', maxWidth: 'none' }}>
            <Search size={22} color="var(--text-secondary)" />
            <input
              id="lead-search"
              name="lead-search"
              type="text"
              placeholder="Buscar por nombre, email, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '1.1rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', overflowX: 'auto', paddingBottom: 10 }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700, marginRight: 8 }}>Fuentes:</span>
            {sources.map(s => (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                style={{
                  padding: '12px 24px',
                  borderRadius: 18,
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  background: filterSource === s ? 'var(--text-primary)' : 'var(--bg-color)',
                  color: filterSource === s ? 'var(--card-bg)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: filterSource === s ? '0 10px 20px rgba(0,0,0,0.15)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none'
                }}
              >
                {getSourceIcon(s)}
                {s}
                {leads.filter(l => l.fuente === s).length > 0 && (
                  <span style={{
                    background: filterSource === s ? 'rgba(255,255,255,0.2)' : (s === 'Captaciones' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0,0,0,0.05)'),
                    color: filterSource === s ? 'white' : (s === 'Captaciones' ? '#2563eb' : 'var(--text-secondary)'),
                    padding: '2px 8px',
                    borderRadius: 8,
                    fontSize: '0.7rem'
                  }}>
                    {leads.filter(l => l.fuente === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {dbError && (
          <div style={{ padding: 30, background: '#fee2e2', color: '#b91c1c', borderRadius: 24, marginBottom: 30, border: '1px solid #fecaca' }}>
            <p style={{ fontWeight: 800 }}>Error de Base de Datos:</p>
            <p style={{ fontSize: '0.9rem' }}>{dbError}</p>
          </div>
        )}

        {loading && leads.length === 0 ? (
          <div style={{ padding: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="lead-item-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.5fr', alignItems: 'center', padding: '20px 30px', background: 'var(--card-bg)', borderRadius: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Skeleton width="44px" height="44px" borderRadius="16px" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton width="140px" height="20px" />
                    <Skeleton width="80px" height="14px" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton width="120px" height="16px" />
                  <Skeleton width="90px" height="14px" />
                </div>
                <Skeleton width="100px" height="24px" borderRadius="100px" />
                <Skeleton width="120px" height="18px" />
                <div style={{ textAlign: 'right' }}><Skeleton width="24px" height="24px" /></div>
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ padding: 100, textAlign: 'center', background: 'var(--bg-color)', borderRadius: 24 }}>
            <Building2 size={48} style={{ opacity: 0.2, margin: '0 auto 20px' }} />
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>No se han encontrado leads.</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Asegúrate de que la tabla 'leads' tenga datos y permisos de lectura.</p>
            <button onClick={() => fetchLeads()} className="btn-black" style={{ marginTop: 24, padding: '12px 24px' }}>
              Reintentar carga
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contacto</th>
                  <th>Fuente</th>
                  <th>Estado</th>
                  <th>Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredLeads.map((lead, index) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      onClick={() => setSelectedLead(lead)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                          <div style={{ position: 'relative' }}>
                            <img src={`https://avatar.vercel.sh/${lead.id}`} style={{ width: 48, height: 48, borderRadius: 16 }} alt="" />
                            {lead.fuente === 'Captaciones' && (
                              <div style={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                background: '#2563eb',
                                color: 'white',
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white'
                              }}>
                                <Building2 size={10} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{lead.nombre} {lead.apellidos}</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{lead.id.toString().slice(0, 8)}</div>
                              {lead.fuente === 'Propiedades' && (
                                <div style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800 }}>PROPIETARIO</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{lead.email}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{lead.telefono}</div>
                      </td>
                      <td>
                        <div className={`source-tag source-${(lead.fuente || 'Otras').toLowerCase().includes('whatsapp') ? 'whatsapp' : (lead.fuente || 'Otras').toLowerCase().split(' ')[0]}`} style={{ fontWeight: 800 }}>
                          {getSourceIcon(lead.fuente)}
                          {lead.fuente}
                        </div>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <span className={`status-badge ${getStatusClass(lead.estado)}`} style={{ fontWeight: 900, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                          {lead.estado}
                        </span>
                        {lead.notas?.includes('CONTACTO AUTOMÁTICO') && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginLeft: 8,
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#8b5cf6',
                            padding: '4px 10px',
                            borderRadius: 100,
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            textTransform: 'uppercase'
                          }}>
                            <MessageSquare size={10} />
                            Chat Pendiente
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem' }}>
                          <Clock size={16} style={{ color: 'var(--accent-yellow)' }} />
                          {formatDistanceToNow(getDateValue(lead), { addSuffix: true, locale: es })}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Detalle de Lead */}
      <AnimatePresence>
        {selectedLead && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onClick={() => setSelectedLead(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                width: '90%',
                maxWidth: 750,
                maxHeight: '90vh',
                background: 'var(--card-bg)',
                borderRadius: 40,
                position: 'relative',
                boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedLead(null)}
                style={{
                  position: 'absolute', top: 24, right: 24,
                  background: 'var(--bg-color)', border: 'none',
                  width: 44, height: 44, borderRadius: 22,
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  zIndex: 10
                }}
              >
                ✕
              </button>

              <div style={{ padding: 40, overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
                  <img src={`https://avatar.vercel.sh/${selectedLead.id}`} style={{ width: 80, height: 80, borderRadius: 28 }} alt="" />
                  <div style={{ minWidth: 200 }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>{selectedLead.nombre} {selectedLead.apellidos}</h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                      <div className={`source-tag source-${(selectedLead.fuente || 'Otras').toLowerCase().includes('whatsapp') ? 'whatsapp' : (selectedLead.fuente || 'Otras').toLowerCase().split(' ')[0]}`} style={{ fontWeight: 800 }}>
                        {getSourceIcon(selectedLead.fuente)}
                        {selectedLead.fuente}
                      </div>
                      <span className={`status-badge ${getStatusClass(selectedLead.estado)}`} style={{ fontWeight: 900 }}>
                        {selectedLead.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 40 }}>
                  <div style={{ background: 'var(--bg-color)', padding: 24, borderRadius: 24, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Teléfono</div>
                    {isEditing ? (
                      <input
                        id="lead-telefono"
                        name="telefono"
                        type="tel"
                        className="search-pill"
                        style={{ width: '100%', background: 'white', border: '1px solid #ddd' }}
                        value={editingLead?.telefono || ''}
                        onChange={(e) => setEditingLead(prev => prev ? { ...prev, telefono: e.target.value } : null)}
                      />
                    ) : (
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, wordBreak: 'break-all' }}>
                        <Phone size={18} color="var(--accent-yellow)" />
                        {selectedLead.telefono}
                      </div>
                    )}
                  </div>
                  <div style={{ background: 'var(--bg-color)', padding: 24, borderRadius: 24, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Email</div>
                    {isEditing ? (
                      <input
                        id="lead-email"
                        name="email"
                        type="email"
                        className="search-pill"
                        style={{ width: '100%', background: 'white', border: '1px solid #ddd' }}
                        value={editingLead?.email || ''}
                        onChange={(e) => setEditingLead(prev => prev ? { ...prev, email: e.target.value } : null)}
                      />
                    ) : (
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, wordBreak: 'break-all' }}>
                        <ExternalLink size={18} color="var(--accent-yellow)" />
                        {selectedLead.email}
                      </div>
                    )}
                  </div>
                </div>

                {selectedLead.fuente === 'Captaciones' && (
                  <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: 32, borderRadius: 32, marginBottom: 40, border: '2px dashed rgba(37, 99, 235, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                      <Building2 size={24} color="#2563eb" />
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e40af' }}>Prospecto de Captación</h4>
                    </div>
                    <p style={{ color: '#1e40af', fontSize: '0.95rem', fontWeight: 600, opacity: 0.8, lineHeight: 1.6 }}>
                      Este lead proviene de una propiedad. El objetivo es convertirlo en una captación exclusiva para Grupo Hogares.
                    </p>
                    <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        className="btn-black"
                        style={{ background: '#2563eb', border: 'none', padding: '14px 28px', borderRadius: 16, fontWeight: 800, width: '100%' }}
                        onClick={() => {
                          if (selectedLead.captacion_id && setInitialCaptacionId) {
                            setInitialCaptacionId(selectedLead.captacion_id);
                            navigate('/captaciones');
                            setSelectedLead(null);
                          } else if (!selectedLead.captacion_id) {
                            alert('No hay una propiedad vinculada a este lead.');
                          }
                        }}
                      >
                        Ver Propiedad Asociada
                      </button>
                    </div>
                  </div>
                )}

                {/* PROPIEDADES EN CARTERA */}
                {leadProperties.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 15, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} /> Propiedades en Cartera ({leadProperties.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                      {leadProperties.map(p => (
                        <div key={p.id} style={{ background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => { navigate('/properties'); setSelectedLead(null); }}>
                          <img src={p.imagenes?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400'} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                          <div style={{ padding: 12 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.calle}</div>
                            <div style={{ color: '#2563eb', fontWeight: 900, fontSize: '0.9rem' }}>{p.precio?.toLocaleString()} €</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Conversación WhatsApp</span>
                    {selectedLead.wa_jid && <span style={{ color: '#25D366' }}>● Conectado por JID</span>}
                  </div>

                  <div style={{
                    borderRadius: 24,
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    background: '#ECE5DD',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    minHeight: 200,
                    maxHeight: 350,
                    overflowY: 'auto',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    {fetchingMessages ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                        <Loader2 className="animate-spin" color="#075E54" />
                      </div>
                    ) : realMessages.length > 0 ? (
                      <>
                        {realMessages.map((m, idx) => {
                          const isFromMe = m.key?.fromMe ?? false;
                          return (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: isFromMe ? 'flex-end' : 'flex-start'
                            }}>
                              <div style={{
                                background: isFromMe ? '#DCF8C6' : 'white',
                                padding: '10px 14px',
                                borderRadius: isFromMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                                maxWidth: '85%',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                fontSize: '0.85rem',
                                lineHeight: 1.4
                              }}>
                                <div style={{ whiteSpace: 'pre-line' }}>
                                  {m.message?.conversation || m.message?.extendedTextMessage?.text || 'Mensaje de medios'}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'rgba(0,0,0,0.3)', marginTop: 4 }}>
                                  {m.messageTimestamp ? format(new Date(m.messageTimestamp * 1000), 'HH:mm') : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No hay historial de chat disponible.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>Notas y Comentarios</div>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <textarea
                        style={{
                          width: '100%', minHeight: 120,
                          border: '1px solid var(--border-color)', background: 'var(--card-bg)',
                          borderRadius: 20, padding: 20, marginBottom: 10,
                          fontSize: '0.95rem', lineHeight: 1.5,
                        }}
                        placeholder="Notas sobre el lead..."
                        value={editingLead?.notas || ''}
                        onChange={(e) => setEditingLead(prev => prev ? { ...prev, notas: e.target.value } : null)}
                      />
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>WHATSAPP JID (AVANZADO)</label>
                        <input
                          className="search-pill"
                          style={{ width: '100%', background: 'white', border: '1px solid #ddd' }}
                          placeholder="número@s.whatsapp.net"
                          value={editingLead?.wa_jid || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, wa_jid: e.target.value } : null)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-color)', padding: 24, borderRadius: 24, border: '1px solid var(--border-color)', fontSize: '1rem', lineHeight: 1.6, fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {selectedLead.notas || 'No hay notas adicionales para este lead.'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="btn-black"
                        style={{ background: '#000', color: '#fff', flex: 2, height: 60, borderRadius: 20, fontWeight: 900, fontSize: '1.1rem' }}
                      >
                        {loading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="btn-black"
                        style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', flex: 1, height: 60, borderRadius: 20, fontWeight: 900, fontSize: '1.1rem' }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditingLead(selectedLead);
                            }}
                            className="btn-black"
                            style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', flex: 2, height: 60, borderRadius: 20, fontWeight: 900, fontSize: '1.1rem' }}
                          >
                            Editar Lead
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              flex: 1,
                              height: 60,
                              borderRadius: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontSize: '0.95rem'
                            }}
                          >
                            <Trash2 size={20} />
                            <span>Eliminar</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--card-bg)',
                padding: 40,
                borderRadius: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: 100, background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <AlertTriangle size={40} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 12, color: 'var(--text-primary)' }}>¿Eliminar Lead?</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
                Estás a punto de eliminar permanentemente este lead. Esta acción es <strong>irreversible</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleDeleteLead}
                  disabled={isDeleting}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '16px',
                    borderRadius: 16,
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                  }}
                >
                  {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                  Confirmar Eliminación
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 16,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadsManagementView;
