import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { settingsService } from '../services/settingsService';

const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [autoContact, setAutoContact] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const val = await settingsService.getSetting('auto_contact_enabled', false);
      setAutoContact(val);
    };
    loadSettings();
  }, []);

  const handleToggleAutoContact = async (checked: boolean) => {
    setAutoContact(checked);
    await settingsService.updateSetting('auto_contact_enabled', checked);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      <header>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }}>Configuración</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Gestiona tu perfil y las automatizaciones del sistema.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Perfil de Usuario */}
        <div className="card">
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <User size={24} color="var(--accent-yellow)" />
            Mi Perfil
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, padding: 16, background: 'var(--bg-color)', borderRadius: 20 }}>
            <img 
              src={user?.avatar} 
              style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--card-bg)', boxShadow: 'var(--shadow-sm)' }} 
              alt="Avatar" 
            />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 2 }}>{user?.nombre}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Agente Inmobiliario</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Nombre Completo</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  defaultValue={user?.nombre} 
                  style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '14px 14px 14px 48px' }} 
                />
              </div>
            </div>
            <div className="input-group">
              <label style={{ fontWeight: 700, display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Email Profesional</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  disabled
                  type="email" 
                  defaultValue={user?.email} 
                  style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '14px 14px 14px 48px', cursor: 'not-allowed' }} 
                />
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: 8, padding: '14px', justifyContent: 'center', fontSize: '1rem' }}>Actualizar Perfil</button>
          </div>
        </div>

        {/* Automatización */}
        <div className="card">
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkles size={24} color="var(--accent-yellow)" />
            Automatización
          </h3>

          <div style={{ padding: '24px', background: 'var(--bg-color)', borderRadius: 24, border: '1px solid var(--border-color)', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Contacto Automático (IA)
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 100, background: 'rgba(250, 204, 21, 0.1)', color: 'var(--accent-yellow)', fontWeight: 800 }}>PRO</span>
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Cuando el scraper detecte una nueva captación con teléfono, el sistema generará un mensaje personalizado y lo enviará vía WhatsApp automáticamente.
                </p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={autoContact} 
                  onChange={(e) => handleToggleAutoContact(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 16, background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 700 }}>
              <Shield size={18} />
              <span>La automatización solo se activará si la captación tiene teléfono válido.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 16, background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
              <Sparkles size={18} />
              <span>Se creará automáticamente un Lead por cada contacto realizado.</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 24px;
          flex-shrink: 0;
          margin-left: 16px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border-color);
          transition: .4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        input:checked + .slider {
          background-color: var(--accent-yellow);
        }

        input:focus + .slider {
          box-shadow: 0 0 1px var(--accent-yellow);
        }

        input:checked + .slider:before {
          transform: translateX(22px);
        }

        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </motion.div>
  );
};

export default SettingsView;
