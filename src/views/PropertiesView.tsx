import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Plus, MapPin, Bed, Bath, Square, 
  MoreHorizontal, Users, FileText, Waves, Maximize2, Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyFormModal from '../components/PropertyFormModal';
import { propertyService } from '../services/propertyService';
import { pdfService } from '../services/pdfService';
import type { Property } from '../types/properties';
import { useApp } from '../contexts/AppContext';

const PropertiesView: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { showNotification } = useApp();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getProperties();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
      showNotification('Error al cargar propiedades', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProperty = async (propertyData: Omit<Property, 'id' | 'created_at'>) => {
    try {
      await propertyService.createProperty(propertyData);
      showNotification('Propiedad guardada con éxito', 'success');
      setShowForm(false);
      fetchProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      showNotification('Error al guardar la propiedad', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible': return '#2563eb';
      case 'reservado': return '#f59e0b';
      case 'vendido': return '#10b981';
      default: return '#6b7280';
    }
  };

  const filteredProperties = properties.filter(p => 
    p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.calle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '0 20px 40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Cartera Inmobiliaria</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Inventario unificado de {properties.length} propiedades activas</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-pill" style={{ width: 300 }}>
            <Search size={20} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Buscar por REF o dirección..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowForm(true)} className="btn-black" style={{ height: 48, padding: '0 24px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={20} /> Nueva Propiedad
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 100, textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', margin: '0 auto' }}></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: 32, border: '1px solid var(--border-color)' }}>
          <Building2 size={40} color="var(--text-secondary)" style={{ marginBottom: 20 }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>No hay propiedades que coincidan</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 32 }}>
          {filteredProperties.map((prop) => (
            <motion.div 
              key={prop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{ padding: 0, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
            >
              {/* Image & Status Badge */}
              <div style={{ position: 'relative', height: 220 }}>
                <img 
                  src={prop.imagenes && prop.imagenes.length > 0 ? prop.imagenes[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'} 
                  alt={prop.titulo}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: 12, left: 12, background: getStatusColor(prop.estado_venta), color: 'white', padding: '6px 14px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                  {prop.estado_venta}
                </div>
                {prop.exclusiva && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#facc15', color: '#000', padding: '6px 14px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                    💎 Exclusiva
                  </div>
                )}
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>
                      {prop.precio?.toLocaleString('es-ES')} €
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
                      <MapPin size={14} />
                      <span>{prop.calle}, {prop.barrio}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>REF: {prop.referencia}</span>
                </div>

                {/* Info Pills */}
                <div style={{ padding: '16px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#64748b', fontSize: '0.7rem', marginBottom: 4, fontWeight: 700 }}>
                        <Bed size={14} /> DORM.
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{(prop.habitaciones_dobles || 0) + (prop.habitaciones_simples || 0)}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#64748b', fontSize: '0.7rem', marginBottom: 4, fontWeight: 700 }}>
                        <Bath size={14} /> BAÑOS
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{prop.banos}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ 
                        background: '#f8fafc', padding: '6px 12px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <Square size={14} /> {prop.metros_construidos} m²
                      </div>
                      {prop.consumo_energetico_letra && (
                        <div style={{ 
                          background: '#2563eb', color: 'white', padding: '6px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 900
                        }}>
                          {prop.consumo_energetico_letra}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, color: '#94a3b8' }}>
                      {prop.piscina && <span title="Piscina"><Waves size={18} /></span>}
                      {prop.terraza && <span title="Terraza"><Maximize2 size={18} /></span>}
                      {prop.aire_acondicionado && <span title="Aire Acondicionado"><Wind size={18} /></span>}
                    </div>
                  </div>
                </div>

                {/* Relationships Section (Owner & Agent) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '10px 14px', borderRadius: 12 }}>
                    <Users size={16} color="#2563eb" />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Propietario</p>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                        {prop.propietario ? `${prop.propietario.nombre} ${prop.propietario.apellidos || ''}` : 'Sin asignar'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => pdfService.generatePropertySheet(prop)}
                    className="btn-black" 
                    style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <FileText size={18} /> Ficha PDF
                  </button>
                  <button style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <PropertyFormModal 
            onClose={() => setShowForm(false)}
            onSave={handleSaveProperty}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertiesView;
