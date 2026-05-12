import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, LogOut, MessageCircle } from 'lucide-react';
import { evolutionService } from '../services/evolutionService';

const WhatsAppConnection: React.FC = () => {
  const [state, setState] = useState<'open' | 'connecting' | 'disconnected' | 'close'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const checkStatus = async () => {
    const response = await fetch(`${import.meta.env.VITE_EVO_URL}/instance/connectionState/${import.meta.env.VITE_EVO_INSTANCE}`, {
      headers: { 'apikey': import.meta.env.VITE_EVO_API_KEY }
    });
    const data = await response.json();
    
    const currentState = data.instance?.state || data.state || 'disconnected';
    setState(currentState);

    if (currentState === 'open') {
      setPolling(false);
      setQrCode(null);
    }
  };

  const generateQR = async () => {
    setLoading(true);
    const qr = await evolutionService.getConnectQR();
    if (qr) {
      setQrCode(qr);
      setPolling(true);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión de WhatsApp?')) {
      await evolutionService.logout();
      checkStatus();
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    let interval: any;
    if (polling) {
      interval = setInterval(checkStatus, 5000); // Poll every 5s
    }
    return () => clearInterval(interval);
  }, [polling]);

  if (state === 'open') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: 'rgba(37, 211, 102, 0.1)',
        borderRadius: 100,
        color: '#25D366',
        fontWeight: 700,
        fontSize: '0.85rem'
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 10px #25D366' }} />
        WhatsApp Conectado
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7 }}
          title="Cerrar sesión"
        >
          <LogOut size={14} />
        </button>

      </div>
    );
  }

  return (
    <div style={{
      padding: 48,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: 40,
      border: '1px solid rgba(255, 255, 255, 0.5)',
      textAlign: 'center',
      maxWidth: 440,
      boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
      margin: '0 auto'
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: '#25D366',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <MessageCircle size={32} />
      </div>

      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>Conectar WhatsApp</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 32 }}>
        Sincroniza tu cuenta para gestionar mensajes y contactos directamente desde el dashboard.
      </p>

      {qrCode ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{
            background: 'white',
            padding: 20,
            borderRadius: 24,
            display: 'inline-block',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            border: '1px solid var(--border-color)'
          }}>
            <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" style={{ width: 200, height: 200 }} />
          </div>
          <p style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Escanea el código con tu teléfono
          </p>
        </motion.div>
      ) : (
        <button
          onClick={generateQR}
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', height: 56, borderRadius: 16, background: '#25D366', border: 'none' }}
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Generar Código QR'}
        </button>
      )}

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        <AlertCircle size={14} />
        <span>Como WhatsApp Web, pero integrado</span>
      </div>

      <button
        onClick={async () => {
          if (confirm('¿Limpiar base de datos? Esto borrará el historial roto. Tendrás que escanear el QR de nuevo, pero a partir de ahora las conversaciones estarán unificadas.')) {
            const headers = { 'apikey': import.meta.env.VITE_EVO_API_KEY };
            await fetch(`/evo-api/instance/delete/${import.meta.env.VITE_EVO_INSTANCE}`, {
              method: 'DELETE',
              headers
            });
            window.location.reload();
          }
        }}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 12,
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginTop: 24
        }}
      >
        🗑️ Limpiar Base de Datos Rota
      </button>

    </div>
  );

};

export default WhatsAppConnection;
