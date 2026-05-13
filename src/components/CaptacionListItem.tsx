import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin, Phone } from 'lucide-react';
import type { Captacion, HistorialCambio } from '../types/captaciones';
import { getThumbnail, getStatusColor } from '../lib/captacionesUtils';
import PriceChangeBadge from './PriceChangeBadge';

interface CaptacionListItemProps {
  cap: Captacion;
  historial: HistorialCambio[];
  index: number;
  onClick: (cap: Captacion) => void;
  hasLead?: boolean;
  hasResponse?: boolean;
}

const CaptacionListItem: React.FC<CaptacionListItemProps> = ({ cap, historial, index, onClick, hasLead, hasResponse }) => {
  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_IMG) {
      target.src = FALLBACK_IMG;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(cap)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr',
        alignItems: 'center',
        padding: '20px 32px',
        background: 'var(--card-bg)',
        borderRadius: 24,
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        border: '1px solid var(--border-color)',
        willChange: 'transform, box-shadow, border-color'
      }}
      whileHover={{
        y: -4,
        scale: 1.005,
        boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
        borderColor: 'var(--accent-yellow)'
      }}
      transition={{
        delay: index * 0.05,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <img
            src={getThumbnail(cap)}
            referrerPolicy="no-referrer"
            onError={handleImgError}
            style={{ width: '100%', height: '100%', borderRadius: 18, objectFit: 'cover' }}
            alt={cap.calle}
          />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', letterSpacing: '-0.01em' }}>
            {cap.calle || 'Sin dirección'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{cap.metros}m² • {cap.habitaciones} habitaciones</span>
            {hasLead && (
              <span style={{ background: '#2563eb15', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800 }}>TRABAJADA</span>
            )}
            {hasResponse && (
              <span style={{ background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800 }}>CON RESPUESTA</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {(cap.precio || 0).toLocaleString()}€
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {cap.precio_m2 ? Number(cap.precio_m2).toFixed(2) : '--'}€/m²
        </div>
        <PriceChangeBadge cap={cap} historial={historial} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.95rem' }}>
        <MapPin size={18} style={{ color: 'var(--accent-yellow)' }} />
        <span>{cap.barrio || 'Valencia'}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          padding: '10px 20px',
          borderRadius: 100,
          fontSize: '0.7rem',
          background: getStatusColor(cap.estado) + '15',
          color: getStatusColor(cap.estado),
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'inline-block'
        }}>
          {cap.estado}
          {cap.estado === 'Contactado' && (
            <span style={{
              marginLeft: 8,
              background: '#8b5cf6',
              color: 'white',
              padding: '2px 6px',
              borderRadius: 6,
              fontSize: '0.6rem',
              fontWeight: 900,
              verticalAlign: 'middle'
            }}>IA</span>
          )}
        </span>
        {(!cap.telefono || cap.telefono.toLowerCase().includes('no disponible') || cap.telefono.toLowerCase().includes('privado')) && (
          <div style={{
            background: 'var(--accent-red)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: 100,
            fontSize: '0.7rem',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Phone size={10} />
            Sin Tel.
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: 'var(--bg-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          marginLeft: 'auto',
          transition: '0.2s'
        }}>
          <ArrowUpRight size={22} />
        </div>
      </div>
    </motion.div>
  );
};

export default CaptacionListItem;
