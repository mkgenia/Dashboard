import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Captacion, HistorialCambio } from '../types/captaciones';
import { getThumbnail, getStatusColor } from '../lib/captacionesUtils';
import PriceChangeBadge from './PriceChangeBadge';

interface CaptacionCardProps {
  cap: Captacion;
  historial: HistorialCambio[];
  onClick: (cap: Captacion) => void;
}

const CaptacionCard: React.FC<CaptacionCardProps> = ({ cap, historial, onClick }) => {
  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_IMG) {
      target.src = FALLBACK_IMG;
    }
  };

  return (
    <motion.div
      className="card"
      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-color)' }}
      onClick={() => onClick(cap)}
    >
      <div style={{ position: 'relative', height: 220 }}>
        <img 
          src={getThumbnail(cap)} 
          alt={cap.calle} 
          referrerPolicy="no-referrer" 
          onError={handleImgError} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 8
        }}>
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
          <div style={{
            background: getStatusColor(cap.estado),
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
            {cap.estado}
            {cap.estado === 'Contactado' && (
              <div style={{
                marginLeft: 4,
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: '0.6rem',
                fontWeight: 900
              }}>IA</div>
            )}
          </div>
        </div>
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(4px)',
          color: '#000',
          padding: '6px 12px',
          borderRadius: 100,
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Clock size={12} />
          {formatDistanceToNow(new Date(cap.created_at), { addSuffix: true, locale: es })}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {cap.calle || 'Sin nombre'}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          <MapPin size={14} />
          <span>{cap.barrio || 'Valencia'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {(cap.precio || 0).toLocaleString()}€
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {cap.precio_m2 ? `${Number(cap.precio_m2).toFixed(2)}€/m²` : '--'}
            </div>
            <PriceChangeBadge cap={cap} historial={historial} />
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: 8 }}>{cap.metros}m²</span>
            <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: 8 }}>{cap.habitaciones} hab.</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CaptacionCard;
