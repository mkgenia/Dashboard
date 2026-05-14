import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  UserPlus,
  Search,
  ShieldCheck,
  Check,
  Building2,
  Users as UsersIcon,
  MessageSquare,
  Eye,
  EyeOff,
  ChevronRight,
  Shield,
  LayoutDashboard,
  Loader2,
  ChevronDown,
  Megaphone,
  Rocket,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Permisos } from '../contexts/AuthContext';
import { PERMISOS_ADMIN, PERMISOS_AGENTE_DEFAULT } from '../contexts/AuthContext';

type Rol = 'Admin' | 'Agente';

interface UserProfile {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  usuario?: string;
  password?: string;
  telefono?: string;
  prefijo?: string;
  rol: Rol;
  permisos: Permisos;
}

const PERMISSION_LABELS: { key: keyof Permisos; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={14} /> },
  { key: 'leads',       label: 'Leads',        icon: <UsersIcon size={14} /> },
  { key: 'captaciones', label: 'Captaciones',  icon: <Layers size={14} /> },
  { key: 'mensajes',    label: 'Mensajes',     icon: <MessageSquare size={14} /> },
  { key: 'propiedades', label: 'Propiedades',  icon: <Building2 size={14} /> },
  { key: 'campanas',    label: 'Campañas',     icon: <Megaphone size={14} /> },
  { key: 'marketing',   label: 'Marketing',    icon: <Rocket size={14} /> },
];

const PERM_ICON_MAP: Record<keyof Permisos, React.ReactNode> = {
  dashboard:   <LayoutDashboard size={14} />,
  leads:       <UsersIcon size={14} />,
  captaciones: <Layers size={14} />,
  mensajes:    <MessageSquare size={14} />,
  propiedades: <Building2 size={14} />,
  campanas:    <Megaphone size={14} />,
  marketing:   <Rocket size={14} />,
  usuarios:    <ShieldCheck size={14} />,
};

const newUserDefault: UserProfile = {
  id: '', nombre: '', apellidos: '', email: '', usuario: '', password: '',
  telefono: '', prefijo: '+34', rol: 'Agente',
  permisos: { ...PERMISOS_AGENTE_DEFAULT },
};

const gridTemplate = '1.2fr 2fr 1fr 1.6fr 60px';

const UserManagementView: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState<UserProfile>(newUserDefault);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const { data, error } = await supabase.from('perfiles').select('*').order('nombre', { ascending: true });
      if (error) throw error;
      
      if (data) {
        // Normalizamos los datos para asegurar que 'permisos' siempre sea un objeto válido
        const normalizedProfiles = data.map(p => ({
          ...p,
          permisos: p.permisos || (p.rol === 'Admin' ? PERMISOS_ADMIN : PERMISOS_AGENTE_DEFAULT)
        }));
        setProfiles(normalizedProfiles as UserProfile[]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleRolChange = (rol: Rol) => {
    if (editingUser) {
      setEditingUser(prev => prev ? {
        ...prev,
        rol,
        permisos: rol === 'Admin' ? { ...PERMISOS_ADMIN } : { ...PERMISOS_AGENTE_DEFAULT },
      } : null);
    } else {
      setNewUser(prev => ({
        ...prev,
        rol,
        permisos: rol === 'Admin' ? { ...PERMISOS_ADMIN } : { ...PERMISOS_AGENTE_DEFAULT },
      }));
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingUser) {
        // 1. Validaciones previas en la base de datos (solo para nuevos usuarios)
        const { data: existingEmail } = await supabase
          .from('perfiles')
          .select('email')
          .eq('email', newUser.email)
          .maybeSingle();

        if (existingEmail) {
          alert('Error: Este correo electrónico ya está registrado en el sistema.');
          return;
        }

        const { data: existingUser } = await supabase
          .from('perfiles')
          .select('id')
          .eq('usuario', newUser.usuario)
          .maybeSingle();

        if (existingUser) {
          alert('Error: Este nombre de usuario ya está en uso. Por favor, elige otro.');
          return;
        }
      }

      setLoading(true);
      
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('perfiles')
          .update({
            nombre: editingUser.nombre,
            apellidos: editingUser.apellidos,
            rol: editingUser.rol,
            permisos: editingUser.permisos,
            telefono: editingUser.telefono,
            prefijo: editingUser.prefijo,
            usuario: editingUser.usuario
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        
        setProfiles(prev => prev.map(p => p.id === editingUser.id ? editingUser : p));
        setNotification({ message: '✨ Perfil actualizado correctamente', type: 'success' });
      } else {
        // Create new user (via n8n)
        const response = await fetch('https://test-n8n.pzkz6e.easypanel.host/webhook/new-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...newUser, 
            full_name: newUser.usuario, // Para que aparezca el NOMBRE DE USUARIO en el "Display name" de Supabase Auth
            fecha_registro: new Date().toISOString(), 
            creado_por: 'Admin_Dashboard' 
          }),
        });

        if (response.ok) {
          const id = Math.random().toString(36).substr(2, 9);
          setProfiles(prev => [...prev, { ...newUser, id }]);
          setNotification({ message: '✨ Miembro creado y solicitud enviada', type: 'success' });
        } else {
          throw new Error('Error en la respuesta de n8n');
        }
      }

      setShowModal(false);
      setNewUser(newUserDefault);
      setEditingUser(null);
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error('Error saving user:', error);
      setNotification({ message: '❌ Error al guardar el perfil', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProfiles(prev => prev.filter(p => p.id !== id));
      setNotification({ message: '✨ Usuario eliminado correctamente', type: 'success' });
      setShowDeleteConfirm(null);
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setNotification({ message: '❌ Error al eliminar el usuario', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key: keyof Permisos) => {
    const currentUser = editingUser || newUser;
    if (currentUser.rol === 'Admin') return;
    if (key === 'usuarios') return;

    if (editingUser) {
      setEditingUser(prev => prev ? {
        ...prev,
        permisos: { ...prev.permisos, [key]: !prev.permisos[key] }
      } : null);
    } else {
      setNewUser(prev => ({
        ...prev,
        permisos: { ...prev.permisos, [key]: !prev.permisos[key] }
      }));
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const filteredProfiles = profiles.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.apellidos && p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentUserData = editingUser || newUser;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 32, position: 'relative' }}>

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
            style={{ position: 'fixed', bottom: 40, left: '50%', zIndex: 10000, background: notification.type === 'success' ? 'var(--text-primary)' : '#ff4d4d', color: 'var(--card-bg)', padding: '16px 32px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          >
            {notification.type === 'success' ? <Check size={18} color="var(--accent-yellow)" /> : <Shield size={18} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>Gestión de Equipo</h2>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Control de accesos y perfiles corporativos</p>
        </div>
        <button onClick={() => { setEditingUser(null); setNewUser(newUserDefault); setShowModal(true); }} className="btn-black">
          <UserPlus size={20} /> Nuevo Miembro
        </button>
      </header>

      {/* Table */}
      <section className="card card-gray" style={{ padding: 0 }}>
        <div style={{ padding: '30px 40px' }}>
          <div className="search-pill" style={{ maxWidth: 500 }}>
            <Search size={22} color="var(--text-secondary)" />
            <input 
              id="user-search"
              name="user-search"
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '0 40px 15px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
          <div>Miembro</div><div>Email</div><div>Rol</div><div>Accesos</div><div />
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loadingProfiles ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 600 }}>Cargando equipo...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontWeight: 600 }}>No hay miembros en el equipo todavía.</p>
            </div>
          ) : (
            filteredProfiles.map((p) => {
              const isAdmin = p.rol === 'Admin';
              const perms = isAdmin ? PERMISOS_ADMIN : (p.permisos || PERMISOS_AGENTE_DEFAULT);
              return (
                <motion.div layout key={p.id} className="lead-item-row" style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center', padding: '15px 20px', background: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img src={`https://avatar.vercel.sh/${p.id}`} style={{ width: 44, height: 44, borderRadius: 16 }} alt={p.nombre} />
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{p.nombre} {p.apellidos || ''}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{p.email}</div>
                  <div>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 800,
                        background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'var(--bg-color)',
                        color: isAdmin ? 'white' : 'var(--text-secondary)',
                        boxShadow: isAdmin ? '0 4px 12px rgba(245,158,11,0.35)' : 'none',
                        border: isAdmin ? 'none' : '1px solid var(--border-color)',
                      }}
                    >
                      {isAdmin ? <Shield size={12} /> : <UsersIcon size={12} />}
                      {p.rol}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(Object.keys(PERM_ICON_MAP) as (keyof Permisos)[]).filter(k => k !== 'usuarios').map(k => (
                      <ModuleIcon key={k} icon={PERM_ICON_MAP[k]} active={!!perms[k]} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => openEditModal(p)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.6, transition: '0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <ChevronRight size={22} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(p.id)}
                      style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', opacity: 0.6, transition: '0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: 560, padding: 40, background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 30 }}>{editingUser ? 'Editar Miembro' : 'Nuevo Miembro'}</h3>
              <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <InputLabel id="nombre" label="Nombre" value={currentUserData.nombre} onChange={(v) => editingUser ? setEditingUser({...editingUser, nombre: v}) : setNewUser({ ...newUser, nombre: v })} placeholder="Nombre" autoComplete="given-name" />
                  <InputLabel id="apellidos" label="Apellidos" value={currentUserData.apellidos} onChange={(v) => editingUser ? setEditingUser({...editingUser, apellidos: v}) : setNewUser({ ...newUser, apellidos: v })} placeholder="Apellidos" autoComplete="family-name" />
                </div>
                <InputLabel id="email" label="Email Corporativo" value={currentUserData.email} onChange={(v) => editingUser ? setEditingUser({...editingUser, email: v}) : setNewUser({ ...newUser, email: v })} placeholder="ejemplo@grupohogares.com" autoComplete="email" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <InputLabel id="usuario" label="Usuario" value={currentUserData.usuario || ''} onChange={(v) => editingUser ? setEditingUser({...editingUser, usuario: v}) : setNewUser({ ...newUser, usuario: v })} placeholder="usuario123" autoComplete="username" />
                  {!editingUser && (
                    <InputLabel
                      id="password"
                      label="Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password || ''}
                      onChange={(v) => setNewUser({ ...newUser, password: v })}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      rightElement={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 15 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label htmlFor="prefijo" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Prefijo</label>
                    <div className="search-pill" style={{ width: '100%', padding: '0 15px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <select id="prefijo" name="prefijo" value={currentUserData.prefijo} onChange={e => editingUser ? setEditingUser({...editingUser, prefijo: e.target.value}) : setNewUser({ ...newUser, prefijo: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '100%', padding: '15px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', appearance: 'none', cursor: 'pointer' }}>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+351">🇵🇹 +351</option>
                        <option value="+52">🇲🇽 +52</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: 10, color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <InputLabel id="telefono" label="Teléfono" value={currentUserData.telefono || ''} onChange={(v) => editingUser ? setEditingUser({...editingUser, telefono: v}) : setNewUser({ ...newUser, telefono: v })} placeholder="600 000 000" type="tel" />
                </div>

                {/* Rol */}
                <p style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: -10 }}>Rol de Usuario</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <RoleButton active={currentUserData.rol === 'Agente'} onClick={() => handleRolChange('Agente')} label="Agente" icon={<UsersIcon size={18} />} />
                  <RoleButton active={currentUserData.rol === 'Admin'} onClick={() => handleRolChange('Admin')} label="Admin" icon={<Shield size={18} />} accent />
                </div>

                {/* Permisos */}
                <AnimatePresence>
                  {currentUserData.rol === 'Agente' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12, marginTop: 10 }}>Accesos del Agente</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--bg-color)', padding: 15, borderRadius: 20 }}>
                        {PERMISSION_LABELS.map(({ key, label, icon }) => (
                          <PermissionItem
                            key={key}
                            label={label}
                            icon={icon}
                            active={!!currentUserData.permisos[key]}
                            onClick={() => togglePermission(key)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {currentUserData.rol === 'Admin' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(245,158,11,0.08)', padding: '16px 20px', borderRadius: 20, border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.85rem', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Shield size={16} color="#f59e0b" />
                      El rol Admin tiene acceso completo a todos los módulos.
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-black" style={{ flex: 1, background: 'var(--bg-color)', color: 'var(--text-primary)' }}>Cancelar</button>
                  <button type="submit" className="btn-black" style={{ flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                    {loading ? <><Loader2 size={20} className="animate-spin" /> Guardando...</> : (editingUser ? 'Guardar Cambios' : 'Crear Perfil')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div onClick={() => setShowDeleteConfirm(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: 400, padding: 40, background: 'var(--card-bg)', textAlign: 'center' }}>
              <div style={{ background: '#fee2e2', color: '#ef4444', width: 60, height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 10 }}>¿Eliminar usuario?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 30, fontWeight: 500 }}>Esta acción no se puede deshacer. Se eliminará el perfil de la base de datos.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowDeleteConfirm(null)} className="btn-black" style={{ flex: 1, background: 'var(--bg-color)', color: 'var(--text-primary)' }}>Cancelar</button>
                <button onClick={() => handleDeleteUser(showDeleteConfirm)} className="btn-black" style={{ flex: 1, background: '#ef4444' }}>Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};


// ── Helpers ──────────────────────────────────────────────────────────────────

interface InputLabelProps {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; rightElement?: React.ReactNode;
  autoComplete?: string; id?: string; name?: string;
}
const InputLabel = ({ label, value, onChange, placeholder, type = 'text', rightElement, autoComplete, id, name }: InputLabelProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <label htmlFor={id} style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{label}</label>
    <div className="search-pill" style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input 
        id={id}
        name={name || id}
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        style={{ flex: 1, paddingRight: rightElement ? 40 : 0 }} 
        autoComplete={autoComplete}
      />
      {rightElement && <div style={{ position: 'absolute', right: 20, display: 'flex', alignItems: 'center' }}>{rightElement}</div>}
    </div>
  </div>
);

interface RoleButtonProps { active: boolean; onClick: () => void; label: string; icon: React.ReactNode; accent?: boolean; }
const RoleButton = ({ active, onClick, label, icon, accent }: RoleButtonProps) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, padding: '16px', borderRadius: 20,
      background: active
        ? (accent ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'var(--text-primary)')
        : 'var(--bg-color)',
      color: active ? (accent ? 'white' : 'var(--card-bg)') : 'var(--text-primary)',
      display: 'flex', gap: 10, cursor: 'pointer', fontWeight: 800,
      alignItems: 'center', justifyContent: 'center', transition: '0.2s',
      boxShadow: active && accent ? '0 8px 20px rgba(245,158,11,0.3)' : 'none',
    }}
  >
    {icon} {label}
  </div>
);

const PermissionItem = ({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    style={{
      padding: '12px 14px', borderRadius: 12,
      background: active ? 'var(--card-bg)' : 'transparent',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      cursor: 'pointer', transition: '0.2s',
      boxShadow: active ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
    }}
  >
    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ opacity: active ? 1 : 0.4 }}>{icon}</span>
      {label}
    </span>
    <div style={{ width: 16, height: 16, borderRadius: 5, background: active ? 'var(--accent-yellow)' : '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {active && <Check size={10} color="black" />}
    </div>
  </div>
);

const ModuleIcon = ({ icon, active }: { icon: React.ReactNode; active: boolean }) => (
  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? 'var(--accent-yellow)' : 'transparent', border: active ? 'none' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.2, color: active ? 'black' : 'inherit' }}>
    {icon}
  </div>
);

export default UserManagementView;
