import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Plus,
  Check,
  X,
  SlidersHorizontal,
  Users,
  RefreshCw,
  Clock,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { Lead } from '../types/leads';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/usePersistence';
import StatBubble from '../components/StatBubble';
import { getThumbnail } from '../lib/captacionesUtils';

const sourceColors: Record<string, string> = {
  'Captaciones': '#2563eb',
  'WhatsApp': '#34d399',
  'Web': '#60a5fa',
  'QR': '#facc15',
  'Llamada': '#fb7185',
  'Propiedades': '#4f46e5',
  'Solicitud valoración': '#a855f7',
  'Total': '#1a1a1a'
};

const bubblePositions: Record<string, [number, number]> = {
  'Total': [160, 0],
  'WhatsApp': [0, -80],
  'Llamada': [-130, -80],
  'QR': [-80, 20],
  'Web': [20, 90],
  'Captaciones': [-240, -40],
  'Propiedades': [-190, 60],
  'Solicitud valoración': [-100, 135]
};

interface DashboardViewProps {
  leads?: Lead[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ leads: initialLeads = [] }) => {
  const navigate = useNavigate();
  const { } = useAuth();
  const [activeSources, setActiveSources] = useLocalStorage<string[]>('dashboard_active_sources', ['Captaciones', 'WhatsApp', 'Web', 'Total']);
  const [showSettings, setShowSettings] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [recentCaptaciones, setRecentCaptaciones] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Leads
      let { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (leadsError) {
        const retry = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });
        leadsData = retry.data;
        leadsError = retry.error;
      }

      if (!leadsError && leadsData) {
        const sortedLeads = [...leadsData].sort((a, b) => {
          const dateA = new Date(a.fecha_creacion || a.created_at || 0).getTime();
          const dateB = new Date(b.fecha_creacion || b.created_at || 0).getTime();
          return dateB - dateA;
        });
        setLeads(sortedLeads as Lead[]);
      }

      // 2. Fetch Recent Captaciones
      const { data: capData, error: capError } = await supabase
        .from('captaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!capError && capData) {
        setRecentCaptaciones(capData);
      }

      setDbError(leadsError?.message || capError?.message || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const leadsSub = supabase
      .channel('dashboard-leads-realtime')
      .on('postgres_changes', { event: '*', table: 'leads', schema: 'public' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const capsSub = supabase
      .channel('dashboard-caps-realtime')
      .on('postgres_changes', { event: '*', table: 'captaciones', schema: 'public' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      leadsSub.unsubscribe();
      capsSub.unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      nuevos: leads.filter(l => (l.estado || '').toLowerCase().includes('nuevo')).length,
    };
  }, [leads]);

  const availableSources = ['Total', 'Captaciones', 'WhatsApp', 'Web', 'QR', 'Llamada', 'Propiedades', 'Solicitud valoración'];

  const getCountForSource = (sourceName: string) => {
    if (sourceName === 'Total') return stats.total;
    return leads.filter(l => l.fuente === sourceName).length;
  };

  const toggleSource = (source: string) => {
    if (activeSources.includes(source)) {
      setActiveSources(activeSources.filter(s => s !== source));
    } else {
      setActiveSources([...activeSources, source]);
    }
  };

  const groupCentering = useMemo(() => {
    if (activeSources.length === 0) return { x: 0, y: 0 };

    const activeSourcesWithSizes = activeSources.map(name => ({
      pos: bubblePositions[name] || [0, 0],
      radius: (name === 'Total' ? 230 : (name === 'WhatsApp' ? 150 : 120)) / 2
    }));

    const minX = Math.min(...activeSourcesWithSizes.map(s => s.pos[0] - s.radius));
    const maxX = Math.max(...activeSourcesWithSizes.map(s => s.pos[0] + s.radius));
    const minY = Math.min(...activeSourcesWithSizes.map(s => s.pos[1] - s.radius));
    const maxY = Math.max(...activeSourcesWithSizes.map(s => s.pos[1] + s.radius));

    return {
      x: -(minX + maxX) / 2,
      y: -(minY + maxY) / 2
    };
  }, [activeSources]);

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
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>

      <section className="card card-gray" style={{ minHeight: 450, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Resumen de Leads</h3>
            <p style={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.95rem' }}>Estado actual de captación</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => fetchDashboardData()}
              style={{ width: 40, height: 40, background: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{ width: 40, height: 40, background: 'black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: '0.3s' }}
            >
              <SlidersHorizontal size={18} color="white" />
            </button>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                style={{ position: 'absolute', top: 55, right: 0, width: 240, background: 'white', borderRadius: 28, padding: 20, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', zIndex: 100, border: '1px solid rgba(0,0,0,0.05)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#999', letterSpacing: 0.5 }}>Filtros</p>
                  <X size={16} onClick={() => setShowSettings(false)} style={{ cursor: 'pointer', opacity: 0.4 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {availableSources.map(s => (
                    <div
                      key={s}
                      onClick={() => toggleSource(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 16, cursor: 'pointer', transition: '0.2s', background: activeSources.includes(s) ? '#f3f4f6' : 'transparent' }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: 7, border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeSources.includes(s) ? 'black' : 'transparent' }}>
                        {activeSources.includes(s) && <Check size={14} color="white" />}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bubble-chart-area" style={{
          flex: 1,
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          minHeight: 350
        }}>
          <AnimatePresence>
            {activeSources.map((name, i) => {
              const [posX, posY] = bubblePositions[name] || [0, 0];
              const finalX = posX + groupCentering.x;
              const finalY = posY + groupCentering.y;

              return (
                <StatBubble
                  key={name}
                  title={name}
                  value={loading ? '...' : getCountForSource(name)}
                  x={finalX}
                  y={finalY}
                  size={name === 'Total' ? 230 : (name === 'WhatsApp' ? 150 : 120)}
                  color={sourceColors[name]}
                  delay={i}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900 }}>Últimas Captaciones</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Nuevas oportunidades</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {recentCaptaciones.length > 0 ? (
            recentCaptaciones.map((cap) => (
              <motion.div
                key={cap.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/captaciones?id=${cap.id}`)}
                style={{
                  padding: 20,
                  background: 'var(--bg-color)',
                  borderRadius: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  border: '1px solid transparent',
                  transition: '0.2s'
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
                }}>
                  <img
                    src={getThumbnail(cap)}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400';
                    }}
                    style={{ width: '100%', height: '100%', borderRadius: 18, objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cap.precio.toLocaleString()} €
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cap.calle || cap.barrio || 'Sin dirección'}
                  </p>
                </div>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0
                }} className="hover-arrow">
                  <ArrowUpRight size={16} />
                </div>
              </motion.div>
            ))
          ) : (
            <div style={{
              padding: 40,
              textAlign: 'center',
              background: 'var(--bg-color)',
              borderRadius: 24,
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              No hay captaciones recientes
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/captaciones')}
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '16px',
            borderRadius: 16,
            background: 'var(--bg-color)',
            border: 'none',
            color: 'var(--text-primary)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: '0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#eee')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--bg-color)')}
        >
          Ver todo el inventario
        </button>
      </section>

      <section className="card" style={{ gridColumn: 'span 2', marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 18, background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Leads Recientes</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Últimos contactos gestionados</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/leads')}
            className="btn-black"
            style={{ padding: '12px 24px', fontSize: '0.9rem' }}
          >
            Ver todos los leads
            <Plus size={18} style={{ marginLeft: 8 }} />
          </button>
        </div>

        {dbError && (
          <div style={{ padding: 20, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 20, marginBottom: 20, border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
            <strong>Error de conexión:</strong> {dbError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && leads.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--accent-yellow)' }} />
              <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Sincronizando con Supabase...</p>
            </div>
          ) : (
            leads.slice(0, 5).map((lead) => (
              <motion.div
                layout
                key={lead.id}
                className="lead-item-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <img src={`https://avatar.vercel.sh/${lead.id}`} className="avatar-pill" alt={lead.nombre} />

                <div style={{ flex: 2 }}>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>{lead.nombre} {lead.apellidos}</p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`source-tag source-${(lead.fuente || 'Otras').toLowerCase().includes('whatsapp') ? 'whatsapp' : (lead.fuente || 'Otras').toLowerCase().split(' ')[0]}`}>
                      {lead.fuente === 'Captaciones' ? <Building2 size={12} style={{ marginRight: 4 }} /> : null}
                      {lead.fuente}
                    </span>
                    {lead.fuente === 'Captaciones' && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)', padding: '2px 8px', borderRadius: 6 }}>PROSPECTO</span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>
                    <Clock size={16} style={{ color: 'var(--accent-yellow)' }} />
                    {formatDistanceToNow(getDateValue(lead), { addSuffix: true, locale: es })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'capitalize' }}>
                    {format(getDateValue(lead), "EEEE, d 'de' MMMM", { locale: es })} • {format(getDateValue(lead), "HH:mm")}
                  </p>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <span className={`status-badge ${getStatusClass(lead.estado)}`}>
                    {lead.estado}
                  </span>
                </div>

                <div style={{ marginLeft: 20, width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                  <ArrowUpRight size={20} />
                </div>
              </motion.div>
            ))
          )}
          {!loading && leads.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-color)', borderRadius: 32, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Todavía no tienes leads. ¡Es buen momento para captar!
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardView;
