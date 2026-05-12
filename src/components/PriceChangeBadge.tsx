import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Captacion, HistorialCambio } from '../types/captaciones';
import { parseCurrency } from '../lib/captacionesUtils';

interface PriceChangeBadgeProps {
  cap: Captacion;
  historial: HistorialCambio[];
}

const PriceChangeBadge: React.FC<PriceChangeBadgeProps> = ({ cap, historial }) => {
  const latestChange = historial.find(h =>
    String(h.captacion_id) === String(cap.id) &&
    String(h.campo).toLowerCase().trim() === 'precio'
  );

  if (!latestChange) return null;

  const anterior = parseCurrency(latestChange.valor_anterior);
  const nuevo = parseCurrency(latestChange.valor_nuevo);
  const diff = nuevo - anterior;

  if (diff === 0 || isNaN(diff)) return null;

  const isDown = diff < 0;

  return (
    <div
      title={`Precio anterior: ${anterior.toLocaleString()}€`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: isDown ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        color: isDown ? '#10b981' : '#ef4444',
        padding: '4px 10px',
        borderRadius: 10,
        fontSize: '0.7rem',
        fontWeight: 800,
        marginTop: 6
      }}
    >
      {isDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
      {isDown ? '' : '+'}{diff.toLocaleString()}€
    </div>
  );
};

export default PriceChangeBadge;
