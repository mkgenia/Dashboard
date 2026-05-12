import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  MoreVertical, 
  Send, 
  Users, 
  Clock, 
  CheckCircle2, 
  Play,
  Pause,
  ArrowUpRight,
  ChevronLeft,
  Mail,
  AlertCircle,
  MessageSquare,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Campaña {
  id: string;
  nombre: string;
  tipo: 'Email' | 'WhatsApp' | 'Mixta';
  estado: 'Activa' | 'Pausada' | 'Borrador';
  leads_total: number;
  enviados: number;
  abiertos?: number;
  respondidos: number;
  fecha_inicio: string;
  color: string;
  icon: string;
}

interface LeadCampaña {
  id: string;
  nombre: string;
  email: string;
  estado_envio: 'Enviado' | 'Leído' | 'Respondido' | 'Pendiente' | 'Error';
  fecha_ultimo_paso: string;
}

const mockCampañas: Campaña[] = [
  {
    id: '1',
    nombre: 'Seguimiento Idealista - Salamanca',
    tipo: 'WhatsApp',
    estado: 'Activa',
    leads_total: 45,
    enviados: 32,
    respondidos: 12,
    fecha_inicio: '2026-04-10',
    color: '#25D366',
    icon: 'WhatsApp'
  },
  {
    id: '2',
    nombre: 'Newsletter Mensual - Propietarios',
    tipo: 'Email',
    estado: 'Activa',
    leads_total: 1250,
    enviados: 1250,
    abiertos: 450,
    respondidos: 35,
    fecha_inicio: '2026-04-01',
    color: '#3b82f6',
    icon: 'Email'
  },
  {
    id: '3',
    nombre: 'Captación Fría - Chamberí',
    tipo: 'Mixta',
    estado: 'Pausada',
    leads_total: 80,
    enviados: 15,
    abiertos: 8,
    respondidos: 2,
    fecha_inicio: '2026-04-15',
    color: '#a855f7',
    icon: 'Mixta'
  }
];

const mockLeadsCampaña: LeadCampaña[] = [
  { id: '1', nombre: 'Juan Pérez', email: 'juan.perez@email.com', estado_envio: 'Respondido', fecha_ultimo_paso: 'Hoy, 10:45' },
  { id: '2', nombre: 'María García', email: 'm.garcia@email.com', estado_envio: 'Leído', fecha_ultimo_paso: 'Hoy, 09:12' },
  { id: '3', nombre: 'Roberto Sanz', email: 'rsanz@email.com', estado_envio: 'Enviado', fecha_ultimo_paso: 'Ayer, 18:30' },
  { id: '4', nombre: 'Lucía Fernández', email: 'lucia.f@email.com', estado_envio: 'Pendiente', fecha_ultimo_paso: '-' },
  { id: '5', nombre: 'Antonio López', email: 'alopez@email.com', estado_envio: 'Error', fecha_ultimo_paso: 'Ayer, 15:20' },
  { id: '6', nombre: 'Elena Blanco', email: 'elena.b@email.com', estado_envio: 'Respondido', fecha_ultimo_paso: 'Hace 2 días' },
];

const getIconComponent = (iconName: string, size: number = 24) => {
  switch (iconName) {
    case 'WhatsApp': return <Send size={size} />;
    case 'Email': return <Mail size={size} />;
    case 'Mixta': return <Megaphone size={size} />;
    case 'Trending': return <TrendingUp size={size} />;
    case 'Alert': return <AlertCircle size={size} />;
    default: return <Megaphone size={size} />;
  }
};

/* ── Shared button styles ── */
const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 700,
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--card-dark)',
  color: 'var(--bg-color)',
  borderRadius: 16,
  padding: '12px 24px',
  fontSize: '0.9rem',
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: 'var(--card-gray)',
  color: 'var(--text-primary)',
  borderRadius: 14,
  padding: '10px',
  border: '1px solid var(--border-color)',
};

const searchInputStyle: React.CSSProperties = {
  background: 'var(--bg-color)',
  border: '1px solid var(--border-color)',
  borderRadius: 14,
  padding: '12px 16px 12px 44px',
  fontSize: '0.9rem',
  fontWeight: 500,
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease',
};

/* ── Campaign Details View ── */
const CampaignDetails = ({ campaña, onBack }: { campaña: Campaña, onBack: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Respondido': return <MessageSquare size={16} color="#10b981" />;
      case 'Leído': return <CheckCircle2 size={16} color="#3b82f6" />;
      case 'Enviado': return <Send size={16} color="#6b7280" />;
      case 'Pendiente': return <Clock size={16} color="#f59e0b" />;
      case 'Error': return <AlertCircle size={16} color="#ef4444" />;
      default: return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Respondido': return 'status-nuevo';
      case 'Leído': return 'status-gestion';
      case 'Enviado': return '';
      case 'Pendiente': return 'status-cita';
      case 'Error': return 'status-descartado';
      default: return '';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button 
          onClick={onBack}
          style={{ ...btnGhost, padding: 10, borderRadius: 14 }}
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{campaña.nombre}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            <span className={`status-badge ${campaña.estado === 'Activa' ? 'status-nuevo' : 'status-gestion'}`}>{campaña.estado}</span>
            <span>• {campaña.tipo}</span>
            <span>• Iniciada el {campaña.fecha_inicio}</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Leads', val: campaña.leads_total, icon: <Users size={20} /> },
          { label: 'Enviados', val: campaña.enviados, icon: <Send size={20} /> },
          { label: 'Ratio Respuestas', val: `${Math.round((campaña.respondidos / campaña.enviados) * 100)}%`, icon: <MessageSquare size={20} /> },
          { label: 'Pendientes', val: campaña.leads_total - campaña.enviados, icon: <Clock size={20} /> }
        ].map((stat, i) => (
          <div key={i} style={{ 
            padding: 20, display: 'flex', alignItems: 'center', gap: 16,
            background: 'var(--card-gray)', borderRadius: 24, 
          }}>
             <div style={{ padding: 10, background: 'var(--bg-color)', borderRadius: 14, color: 'var(--accent-yellow)' }}>
               {stat.icon}
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</div>
               <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stat.val}</div>
             </div>
          </div>
        ))}
      </div>

      <section style={{ background: 'var(--card-gray)', borderRadius: 32, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Listado de Envío</h3>
          <div style={{ position: 'relative', maxWidth: 300 }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar lead..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Email</th>
                <th>Estado Envío</th>
                <th>Última Actividad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mockLeadsCampaña.map((lead) => (
                <tr key={lead.id}>
                  <td><div style={{ fontWeight: 600 }}>{lead.nombre}</div></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{lead.email}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getStatusIcon(lead.estado_envio)}
                      <span className={`status-badge ${getStatusClass(lead.estado_envio)}`} style={{ fontSize: '0.75rem' }}>
                        {lead.estado_envio}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lead.fecha_ultimo_paso}</td>
                  <td>
                    <button style={{ 
                      ...btnBase, 
                      background: 'var(--bg-color)', 
                      color: 'var(--text-primary)', 
                      padding: '6px 14px', 
                      borderRadius: 10, 
                      fontSize: '0.8rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};

/* ── Main Campaigns View ── */
const CampaignsView: React.FC = () => {
  const [campañas, setCampañas] = useState<Campaña[]>(mockCampañas);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaña, setSelectedCampaña] = useState<Campaña | null>(null);
  const [editingCampaña, setEditingCampaña] = useState<Campaña | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const colors = ['#25D366', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];
  const icons = ['WhatsApp', 'Email', 'Mixta', 'Trending', 'Alert'];

  const handleDelete = (id: string) => {
    setCampañas(prev => prev.filter(c => c.id !== id));
    setMenuOpenId(null);
  };

  const handleUpdate = (updated: Campaña) => {
    setCampañas(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingCampaña(null);
    setMenuOpenId(null);
  };

  if (selectedCampaña) {
    return <CampaignDetails campaña={selectedCampaña} onBack={() => setSelectedCampaña(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Campañas</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Automatiza y gestiona las secuencias de envío para tus leads.</p>
        </div>
        <button style={btnPrimary}>
          <Plus size={20} />
          <span>Crear Campaña</span>
        </button>
      </header>

      {/* Search Bar */}
      <div style={{ 
        display: 'flex', gap: 16, alignItems: 'center', padding: '16px 24px',
        background: 'var(--card-gray)', borderRadius: 24 
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar campañas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
      </div>

      {/* Campaign Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
        {campañas.map((campaña) => (
          <motion.div 
            key={campaña.id}
            whileHover={{ y: -4 }}
            style={{ 
              display: 'flex', flexDirection: 'column', gap: 20, position: 'relative',
              background: 'var(--card-gray)', borderRadius: 32, padding: 28,
              transition: 'box-shadow 0.3s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 16, 
                  background: `${campaña.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: campaña.color
                }}>
                  {getIconComponent(campaña.icon)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{campaña.nombre}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    <span className={`status-badge ${campaña.estado === 'Activa' ? 'status-nuevo' : 'status-gestion'}`} style={{ fontSize: '0.7rem', padding: '5px 12px' }}>
                      {campaña.estado}
                    </span>
                    <span>•</span>
                    <span>{campaña.tipo}</span>
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setMenuOpenId(menuOpenId === campaña.id ? null : campaña.id)}
                  style={{ ...btnBase, background: 'none', color: 'var(--text-secondary)', padding: 4 }}
                >
                  <MoreVertical size={20} />
                </button>
                
                <AnimatePresence>
                  {menuOpenId === campaña.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      style={{ 
                        position: 'absolute', top: '100%', right: 0, zIndex: 10, width: 200, 
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        background: 'var(--card-bg)', borderRadius: 16, padding: 6,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)',
                      }}
                    >
                      <button 
                        onClick={() => setEditingCampaña(campaña)}
                        style={{ 
                          ...btnBase, justifyContent: 'flex-start', width: '100%',
                          padding: '12px 16px', borderRadius: 12,
                          background: 'transparent', color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Edit size={16} /> Editar Campaña
                      </button>
                      <button 
                        onClick={() => handleDelete(campaña.id)}
                        style={{ 
                          ...btnBase, justifyContent: 'flex-start', width: '100%',
                          padding: '12px 16px', borderRadius: 12,
                          background: 'transparent', color: '#ef4444',
                          fontSize: '0.85rem',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: 'var(--bg-color)', padding: 16, borderRadius: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{campaña.enviados}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>ENVIADOS</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{campaña.abiertos || '-'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>ABIERTOS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{campaña.respondidos}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>RESPUESTAS</div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Progreso</span>
                <span style={{ fontWeight: 700 }}>{Math.round((campaña.enviados / campaña.leads_total) * 100)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-color)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(campaña.enviados / campaña.leads_total) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: campaña.color, borderRadius: 3 }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Users size={16} />
                <span>{campaña.leads_total} leads</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btnGhost, padding: 8, borderRadius: 12 }}>
                  {campaña.estado === 'Activa' ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button 
                  onClick={() => setSelectedCampaña(campaña)}
                  style={{ ...btnPrimary, padding: '8px 18px', fontSize: '0.85rem', borderRadius: 14 }}
                >
                  Gestionar <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCampaña && (
          <div 
            onClick={() => setEditingCampaña(null)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 500, padding: 40, background: 'var(--card-bg)', borderRadius: 32, boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}
            >
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>Editar Campaña</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, display: 'block', color: 'var(--text-secondary)' }}>Nombre de la Campaña</label>
                  <input 
                    type="text" 
                    value={editingCampaña.nombre}
                    onChange={(e) => setEditingCampaña({...editingCampaña, nombre: e.target.value})}
                    style={{ 
                      ...searchInputStyle, 
                      paddingLeft: 16,
                      borderRadius: 16, 
                      width: '100%',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, display: 'block', color: 'var(--text-secondary)' }}>Icono de Campaña</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {icons.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setEditingCampaña({...editingCampaña, icon})}
                        style={{
                          ...btnBase,
                          padding: 14, borderRadius: 14,
                          background: editingCampaña.icon === icon ? 'var(--accent-yellow)' : 'var(--card-gray)',
                          color: editingCampaña.icon === icon ? '#000' : 'var(--text-primary)',
                          border: editingCampaña.icon === icon ? '2px solid var(--accent-yellow)' : '1px solid var(--border-color)',
                        }}
                      >
                        {getIconComponent(icon, 20)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, display: 'block', color: 'var(--text-secondary)' }}>Color de Marca</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {colors.map(color => (
                      <div
                        key={color}
                        onClick={() => setEditingCampaña({...editingCampaña, color})}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', background: color,
                          border: editingCampaña.color === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                          cursor: 'pointer', transform: editingCampaña.color === color ? 'scale(1.15)' : 'none',
                          transition: 'all 0.2s ease',
                          boxShadow: editingCampaña.color === color ? `0 4px 12px ${color}44` : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button 
                    onClick={() => handleUpdate(editingCampaña)} 
                    style={{ ...btnPrimary, flex: 1 }}
                  >
                    Guardar Cambios
                  </button>
                  <button 
                    onClick={() => setEditingCampaña(null)}
                    style={{ ...btnGhost, flex: 1, borderRadius: 16, padding: '12px 20px', fontWeight: 700, fontSize: '0.9rem' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CampaignsView;
