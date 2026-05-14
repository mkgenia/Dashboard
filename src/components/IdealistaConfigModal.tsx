import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { X, Search, Copy, Check, Map as MapIcon, Globe, Trash2, Plus, Minus, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Google Polyline Algorithm implementation for Idealista
const encodePolyline = (coords: [number, number][]) => {
  const encode = (num: number) => {
    let v = Math.round(num * 1e5);
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    s += String.fromCharCode(v + 63);
    return s;
  };

  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const [lat, lng] of coords) {
    result += encode(lat - lastLat);
    result += encode(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }

  return result;
};

// Custom Draw logic without default toolbar
const CustomMapControls = ({
  onCreated,
  onClear
}: {
  onCreated: (coords: [number, number][]) => void;
  onClear: () => void;
}) => {
  const map = useMap();
  const [isDrawing, setIsDrawing] = useState(false);
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const drawHandlerRef = useRef<any>(null);

  useEffect(() => {
    map.addLayer(featureGroupRef.current);

    const handleCreated = (e: any) => {
      const layer = e.layer;
      featureGroupRef.current.clearLayers(); // Keep only one polygon for simplicity
      featureGroupRef.current.addLayer(layer);

      const latlngs = layer.getLatLngs()[0];
      const coords: [number, number][] = latlngs.map((ll: any) => [ll.lat, ll.lng]);
      coords.push(coords[0]);
      onCreated(coords);
      setIsDrawing(false);
    };

    map.on('draw:created', handleCreated);

    return () => {
      map.off('draw:created', handleCreated);
    };
  }, [map, onCreated]);

  const startDrawing = () => {
    if (drawHandlerRef.current) drawHandlerRef.current.disable();

    drawHandlerRef.current = new (L.Draw as any).Polygon(map, {
      allowIntersection: false,
      shapeOptions: {
        color: '#facc15',
        fillColor: '#facc15',
        fillOpacity: 0.2,
        weight: 3
      }
    });

    drawHandlerRef.current.enable();
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
    setIsDrawing(false);
  };

  const clearLayers = () => {
    featureGroupRef.current.clearLayers();
    onClear();
  };

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Zoom Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <button onClick={zoomIn} style={{ width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', borderBottom: '1px solid rgba(0,0,0,0.05)' }}><Plus size={20} /></button>
        <button onClick={zoomOut} style={{ width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}><Minus size={20} /></button>
      </div>

      {/* Draw Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={isDrawing ? stopDrawing : startDrawing}
          style={{
            width: 44,
            height: 44,
            border: 'none',
            background: isDrawing ? 'var(--accent-yellow)' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            transition: '0.2s'
          }}
          title={isDrawing ? "Cancelar Dibujo" : "Dibujar Polígono"}
        >
          {isDrawing ? <X size={20} /> : <Pencil size={20} />}
        </button>
        <button
          onClick={clearLayers}
          style={{
            width: 44,
            height: 44,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}
          title="Borrar Selección"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

interface IdealistaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IdealistaConfigModal: React.FC<IdealistaConfigModalProps> = ({ isOpen, onClose }) => {
  const [searchName, setSearchName] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const [copied, setCopied] = useState(false);
  const [searchType, setSearchType] = useState<'name' | 'zone'>('name');

  const generateUrl = useCallback(() => {
    let url = 'https://www.idealista.com/';

    if (searchType === 'name' && searchName) {
      url += `buscar/venta-viviendas/?q=${encodeURIComponent(searchName)}`;
    } else if (searchType === 'zone' && polygonCoords.length > 0) {
      const encoded = encodePolyline(polygonCoords);
      url += `areas/venta-viviendas/?shape=((${encoded}))`;
    } else {
      url += 'venta-viviendas/valencia/';
    }

    setGeneratedUrl(url);
  }, [searchName, polygonCoords, searchType]);

  useEffect(() => {
    generateUrl();
  }, [generateUrl]);

  const handleCreated = (coords: [number, number][]) => {
    setPolygonCoords(coords);
  };

  const handleClear = () => {
    setPolygonCoords([]);
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          style={{
            background: 'var(--card-bg)',
            width: '100%',
            maxWidth: 1100,
            borderRadius: 40,
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '40px 48px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>Configuración de Scraper</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontWeight: 500, fontSize: '1.1rem' }}>Define la zona de búsqueda para Idealista</p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                background: 'var(--bg-color)',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: '0.3s',
              }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flex: 1 }}>
            {/* Left Panel: Settings */}
            <div style={{ padding: 48, overflowY: 'auto', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 40 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setSearchType('name')}
                  style={{
                    flex: 1,
                    padding: '20px',
                    borderRadius: 24,
                    border: 'none',
                    background: searchType === 'name' ? 'var(--accent-yellow)' : 'var(--bg-color)',
                    color: searchType === 'name' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    transition: '0.3s',
                    boxShadow: searchType === 'name' ? '0 8px 20px rgba(250, 204, 21, 0.3)' : 'none'
                  }}
                >
                  <Search size={26} />
                  <span>Por Nombre</span>
                </button>
                <button
                  onClick={() => setSearchType('zone')}
                  style={{
                    flex: 1,
                    padding: '20px',
                    borderRadius: 24,
                    border: 'none',
                    background: searchType === 'zone' ? 'var(--accent-yellow)' : 'var(--bg-color)',
                    color: searchType === 'zone' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    transition: '0.3s',
                    boxShadow: searchType === 'zone' ? '0 8px 20px rgba(250, 204, 21, 0.3)' : 'none'
                  }}
                >
                  <MapIcon size={26} />
                  <span>Por Zona</span>
                </button>
              </div>

              {searchType === 'name' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre de la Zona</label>
                  <div style={{
                    background: 'var(--bg-color)',
                    borderRadius: 24,
                    padding: '8px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    border: '2px solid transparent',
                    transition: '0.3s',
                  }}>
                    <Globe size={24} color="var(--text-secondary)" />
                    <input
                      id="scraper-zone-name"
                      name="zone-name"
                      type="text"
                      placeholder="Ej: Chamberí, Madrid..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        height: 64,
                        flex: 1,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.8' }}>
                  <p style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, fontSize: '1.1rem' }}>Instrucciones:</p>
                  <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <li style={{ display: 'flex', gap: 12 }}><div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--accent-yellow)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>1</div> <span>Activa el modo dibujo con el icono <Pencil size={14} /></span></li>
                    <li style={{ display: 'flex', gap: 12 }}><div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--accent-yellow)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>2</div> <span>Haz clic en el mapa para añadir puntos.</span></li>
                    <li style={{ display: 'flex', gap: 12 }}><div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--accent-yellow)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>3</div> <span>Cierra el polígono en el punto inicial.</span></li>
                  </ul>
                </div>
              )}

              <div style={{ marginTop: 'auto' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>URL Generada</label>
                <div style={{
                  background: 'var(--bg-color)',
                  borderRadius: 28,
                  padding: 32,
                  marginTop: 16,
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                  wordBreak: 'break-all',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  minHeight: 120,
                  lineHeight: '1.5'
                }}>
                  {generatedUrl}
                  <button
                    onClick={handleCopy}
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      background: copied ? '#10b981' : 'var(--text-primary)',
                      color: copied ? '#fff' : 'var(--card-bg)',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: '0.3s',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                    }}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copiado' : 'Copiar URL'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Map */}
            <div style={{ background: '#f8f9fa', position: 'relative', overflow: 'hidden' }}>
              <MapContainer
                center={[39.469907, -0.376288]}
                zoom={13}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <CustomMapControls onCreated={handleCreated} onClear={handleClear} />
              </MapContainer>

              {searchType === 'name' && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  textAlign: 'center',
                  padding: 60,
                  letterSpacing: '-0.02em'
                }}>
                  <div style={{ background: 'white', padding: '32px 48px', borderRadius: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                    Selecciona "Por Zona" para interactuar con el mapa
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '32px 48px', background: 'var(--bg-color)', display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
            <button
              onClick={onClose}
              style={{
                padding: '0 40px',
                height: 64,
                borderRadius: 20,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              Cerrar
            </button>
            <button
              onClick={handleCopy}
              className="btn-black"
              style={{
                padding: '0 48px',
                height: 64,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '1.1rem',
                boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
              }}
            >
              <Copy size={22} />
              <span>Finalizar y Copiar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IdealistaConfigModal;
