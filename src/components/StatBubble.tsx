import React from 'react';
import { motion } from 'framer-motion';

interface StatBubbleProps {
  title: string;
  value: number | string;
  x?: number;
  y?: number;
  size: number;
  color: string;
  delay?: number;
}

const StatBubble: React.FC<StatBubbleProps> = ({
  title,
  value,
  x = 0,
  y = 0,
  size,
  color,
  delay = 0
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: x - (size / 2), // Centramos la burbuja sobre su coordenada x
        y: y - (size / 2)  // Centramos la burbuja sobre su coordenada y
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 120,
        delay: delay * 0.05
      }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: title === 'Total' ? 10 : 1,
      }}
    >
      {/* Glow SVG */}
      <svg
        className="stat-bubble-svg"
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: -1
        }}
      >
        <circle cx="50" cy="50" r="45" fill={color} />
      </svg>

      {/* Texto */}
      <div style={{ textAlign: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <p style={{
          fontSize: size * 0.08,
          fontWeight: 800,
          color: title === 'Total' ? 'white' : 'black',
          opacity: 0.6,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 2
        }}>
          {title}
        </p>
        <p style={{
          fontSize: size * 0.22,
          fontWeight: 900,
          color: title === 'Total' ? 'white' : 'black',
          lineHeight: 1
        }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
};

export default StatBubble;
