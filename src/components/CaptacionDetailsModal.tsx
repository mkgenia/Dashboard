import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, ExternalLink, TrendingDown, TrendingUp, Sparkles,
  User, Phone, Loader2, Send, Trash2, AlertTriangle, Building2, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Captacion, HistorialCambio } from '../types/captaciones';
import type { Property } from '../types/properties';
import {
  getAllImages, hasPhone, phoneToJid, generateWhatsAppMessage
} from '../lib/captacionesUtils';
import { evolutionService } from '../services/evolutionService';
import { leadService } from '../services/leadService';
import { propertyService } from '../services/propertyService';
import PropertyFormModal from './PropertyFormModal';
import type { Lead } from '../types/leads';
import type { EvolutionMessage } from '../types/evolution';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

interface CaptacionDetailsModalProps {
  selectedCaptacion: Captacion;
  onClose: () => void;
  historial: HistorialCambio[];
  existingLeads: Lead[];
  onLeadCreated: () => void;
  onDelete: () => void;
}

const CaptacionDetailsModal: React.FC<CaptacionDetailsModalProps> = ({
  selectedCaptacion,
  onClose,
  historial,
  existingLeads,
  onLeadCreated,
  onDelete
}) => {
  const { showNotification, setActiveChatId } = useApp();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [realMessages, setRealMessages] = useState<EvolutionMessage[]>([]);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showContactConfirm, setShowContactConfirm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [leadCreatedLocal, setLeadCreatedLocal] = useState(false);

  const linkedLead = existingLeads.find(
    l => Number(l.captacion_id) === Number(selectedCaptacion.id)
  );

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_IMG) {
      target.src = FALLBACK_IMG;
    }
  };

  const fetchMessages = async (jidOverride?: string) => {
    if (!selectedCaptacion?.telefono) {
      setRealMessages([]);
      return;
    }

    setFetchingMessages(true);
    try {
      const identifier = jidOverride || linkedLead?.wa_jid || phoneToJid(selectedCaptacion.telefono);

      const msgs = await evolutionService.getMessages(identifier);
      if (msgs && Array.isArray(msgs) && msgs.length > 0) {
        setRealMessages(msgs.slice(0, 5).reverse());
      } else {
        setRealMessages([]);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setRealMessages([]);
    } finally {
      setFetchingMessages(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedCaptacion, existingLeads]);

  const handleCreateLead = async (cap: Captacion) => {
    try {
      await leadService.createLead({
        nombre: cap.nombre || 'Propietario',
        apellidos: cap.barrio || 'Idealista',
        email: '',
        telefono: cap.telefono || '',
        fuente: 'Captaciones',
        estado: 'Nuevo',
        notas: `PROPIEDAD: ${cap.calle}\nZONA: ${cap.barrio}\nURL: ${cap.url}`,
        captacion_id: cap.id
      });
      setLeadCreatedLocal(true);
      onLeadCreated();
    } catch (err) {
      console.error('Error creando lead:', err);
      alert('Error al crear el lead');
    }
  };

  const generateAIMessage = async (cap: Captacion) => {
    try {
      setGeneratingAI(true);
      setAiMessage(null); // Limpiar el anterior para que se vea el cargador
      const N8N_WEBHOOK_URL = 'https://test-n8n.pzkz6e.easypanel.host/webhook/ia-lead-gen';

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_message',
          captacion_id: cap.id,
          agent: user?.nombre || 'Agente de Grupo Hogares'
        })
      });

      if (!response.ok) throw new Error('Error en la conexión con n8n');
      const data = await response.json();
      
      // Lógica ultra-robusta para capturar el mensaje de n8n
      let message = null;
      
      if (Array.isArray(data) && data.length > 0) {
        // Es un array: [ { output: "..." } ] o [ { message: "..." } ]
        message = data[0].output || data[0].message || data[0].text;
      } else if (typeof data === 'object' && data !== null) {
        // Es un objeto: { output: "..." } o { message: "..." }
        message = data.output || data.message || data.text;
      } else if (typeof data === 'string') {
        // Es texto directo
        message = data;
      }

      setAiMessage(message || 'Error: n8n no devolvió un texto válido');
    } catch (err) {
      console.error('Error IA Lead Gen:', err);
      setAiMessage(`¡Hola! He visto tu propiedad en ${cap.calle} y me ha parecido muy interesante. ¿Hablamos?`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleConvertToProperty = async (propertyData: Omit<Property, 'id' | 'created_at'>) => {
    try {
      // 1. Crear la propiedad
      await propertyService.createProperty(propertyData);
      
      // 2. Actualizar el estado de la captación para que desaparezca de "pendientes"
      const { error: updateError } = await supabase
        .from('captaciones')
        .update({ estado: 'convertida' })
        .eq('id', selectedCaptacion.id);

      if (updateError) console.error('Error actualizando estado captación:', updateError);

      showNotification('¡Propiedad publicada y vinculada al lead con éxito!', 'success');
      setShowPropertyForm(false);
      onClose(); // Cerrar el modal de captación
      navigate('/properties'); // Ir a ver la nueva propiedad
    } catch (error) {
      console.error('Error converting to property:', error);
      showNotification('Error al crear la propiedad', 'error');
    }
  };

  const handleDeleteCaptacion = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('captaciones')
        .delete()
        .eq('id', selectedCaptacion.id);

      if (error) throw error;
      onDelete();
      onClose();
    } catch (err) {
      console.error('Error deleting captacion:', err);
      alert('Error al dar de baja la captación');
    } finally {
      setIsDeleting(false);
    }
  };

  const isLeadExisting = leadCreatedLocal || existingLeads.some(l => Number(l.captacion_id) === Number(selectedCaptacion.id));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card"
        style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: 40 }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 24, right: 24, background: 'var(--bg-color)', border: 'none', width: 40, height: 40, borderRadius: 100, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div>
            <img
              src={getAllImages(selectedCaptacion)[activeImageIndex]}
              referrerPolicy="no-referrer"
              onError={handleImgError}
              style={{ width: '100%', height: 350, borderRadius: 24, objectFit: 'cover', marginBottom: 24 }}
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
              gap: 12,
              marginBottom: 24,
              maxHeight: showAllPhotos ? '280px' : 'none',
              overflowY: showAllPhotos ? 'auto' : 'hidden',
              paddingRight: showAllPhotos ? '8px' : '0'
            }}>
              {(showAllPhotos ? getAllImages(selectedCaptacion) : getAllImages(selectedCaptacion).slice(0, 6)).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                  onClick={() => setActiveImageIndex(i)}
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 16,
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: activeImageIndex === i ? '2px solid var(--accent-yellow)' : '1px solid var(--border-color)',
                    transition: '0.2s',
                    opacity: activeImageIndex === i ? 1 : 0.7
                  }}
                />
              ))}
              {!showAllPhotos && getAllImages(selectedCaptacion).length > 6 && (
                <div
                  onClick={() => setShowAllPhotos(true)}
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 16,
                    background: 'var(--bg-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  +{getAllImages(selectedCaptacion).length - 6}
                </div>
              )}
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{selectedCaptacion.calle}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 24 }}>
              <MapPin size={18} />
              <span>{selectedCaptacion.barrio}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
              <div style={{ background: 'var(--bg-color)', padding: 20, borderRadius: 20, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: 4, color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>PRECIO</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{(selectedCaptacion.precio || 0).toLocaleString()}€</div>
              </div>
              <div style={{ background: 'var(--bg-color)', padding: 20, borderRadius: 20, border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: 4, color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>SUPERFICIE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedCaptacion.metros}m²</div>
              </div>
            </div>

            <a
              href={selectedCaptacion.url}
              target="_blank"
              rel="noreferrer"
              className="btn-black"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none', height: 60, borderRadius: 100 }}
            >
              <ExternalLink size={20} />
              <span>Abrir en Idealista</span>
            </a>

            {/* Historial logic remains similar, simplified for the modal */}
            {historial.filter(h => h.captacion_id === selectedCaptacion.id).length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={20} color="var(--accent-yellow)" />
                  Historial de Cambios
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {historial
                    .filter(h => h.captacion_id === selectedCaptacion.id)
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map(h => (
                      <div key={h.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        background: 'var(--bg-color)',
                        borderRadius: 20,
                        border: '1px solid var(--border-color)',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>
                            {h.campo}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {h.campo === 'precio' ? (
                              <>
                                {Number(h.valor_nuevo) < Number(h.valor_anterior) ? <TrendingDown size={14} color="#ef4444" /> : <TrendingUp size={14} color="#10b981" />}
                                {Number(h.valor_nuevo).toLocaleString()}€
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                                  {Number(h.valor_anterior).toLocaleString()}€
                                </span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} style={{ color: 'var(--accent-yellow)' }} />
                                {String(h.campo).charAt(0).toUpperCase() + String(h.campo).slice(1)} actualizada
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {format(new Date(h.fecha), "d 'de' MMMM", { locale: es })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {format(new Date(h.fecha), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ padding: 32, background: 'var(--bg-color)', borderRadius: 24, border: '1px solid rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 100, background: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="black" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800 }}>PROPIETARIO</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedCaptacion.nombre}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 100, background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={24} color="var(--text-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800 }}>TELÉFONO</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedCaptacion.telefono || 'No disponible'}</div>
                </div>
              </div>
            </div>

            {hasPhone(selectedCaptacion) && (
              <div style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(37, 211, 102, 0.2)', background: 'var(--card-bg)' }}>
                <div style={{ background: '#075E54', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} color="white" />
                    </div>
                    <div>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>{selectedCaptacion.nombre || 'Propietario'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>{selectedCaptacion.telefono}</div>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#ECE5DD',
                  padding: '16px',
                  minHeight: 180,
                  maxHeight: 320,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  {fetchingMessages ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 }}>
                      <Loader2 className="animate-spin" color="#075E54" size={20} />
                      <span style={{ fontSize: '0.8rem', color: '#075E54', fontWeight: 600 }}>Cargando...</span>
                    </div>
                  ) : realMessages.length > 0 ? (
                    realMessages.map((m, idx) => {
                      const isFromMe = m.key?.fromMe ?? false;
                      const msgText = m.message?.conversation || m.message?.extendedTextMessage?.text || null;
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: isFromMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            background: isFromMe ? '#DCF8C6' : 'white',
                            padding: '10px 14px',
                            borderRadius: 12,
                            maxWidth: '85%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            fontSize: '0.82rem'
                          }}>
                            {msgText || '📎 Archivo'}
                          </div>
                        </div>
                      );
                    })
                  ) : generatingAI ? (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '40px', gap: 12 }}>
                      <Loader2 className="animate-spin" color="#2563eb" size={24} />
                      <span style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: 700 }}>IA redactando mensaje...</span>
                    </div>
                  ) : aiMessage ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ background: '#DCF8C6', padding: '16px', borderRadius: 16, maxWidth: '90%', fontSize: '0.82rem' }}>
                        {aiMessage}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>Genera un mensaje con IA</p>
                    </div>
                  )}
                </div>

                <div style={{ background: '#F0F0F0', padding: '16px', display: 'flex', gap: 10 }}>
                  {!isLeadExisting && (
                    <button
                      onClick={() => generateAIMessage(selectedCaptacion)}
                      disabled={generatingAI}
                      className="btn-black"
                      style={{ flex: 1, borderRadius: 100, fontSize: '0.85rem', padding: '12px' }}
                    >
                      <Sparkles size={16} /> IA
                    </button>
                  )}
                  {isLeadExisting ? (
                    <button
                      onClick={() => {
                        const jid = linkedLead?.wa_jid?.split(',')[0] || phoneToJid(selectedCaptacion.telefono);
                        setActiveChatId(jid);
                        navigate('/messages');
                      }}
                      style={{ flex: 1, background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 100, fontWeight: 800, cursor: 'pointer', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <MessageCircle size={16} /> Ver Conversación
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowContactConfirm(true)}
                      disabled={!aiMessage && realMessages.length === 0}
                      style={{ flex: 1.2, background: '#25D366', color: 'white', border: 'none', borderRadius: 100, fontWeight: 800, cursor: 'pointer', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Send size={16} /> WhatsApp
                    </button>
                  )}
                  {isLeadExisting ? (
                    <button onClick={() => navigate('/leads')} style={{ flex: 1, background: 'white', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 100, fontWeight: 800, padding: '12px' }}>Ver Lead</button>
                  ) : (
                    <button onClick={() => handleCreateLead(selectedCaptacion)} style={{ flex: 1, background: 'white', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 100, fontWeight: 800, padding: '12px' }}>+ Lead</button>
                  )}
                </div>
              </div>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setShowPropertyForm(true)}
                  style={{ background: 'white', color: '#2563eb', border: '1px solid #2563eb', padding: '16px', borderRadius: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}
                >
                  <Building2 size={16} /> Convertir en Propiedad
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Trash2 size={16} /> Dar de baja
                </button>
              </>
            )}
          </div>
        </div>

        {/* Confirmation Modals */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
                <AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 24px' }} />
                <h3>¿Estás seguro?</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                  <button onClick={handleDeleteCaptacion} disabled={isDeleting} style={{ background: '#ef4444', color: 'white', padding: '16px', borderRadius: 16, border: 'none', fontWeight: 800 }}>{isDeleting ? 'Borrando...' : 'Confirmar Baja'}</button>
                  <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {showContactConfirm && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
                <Send size={40} color="#25D366" style={{ margin: '0 auto 24px' }} />
                <h3>Iniciar Contacto</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={async () => {
                      try {
                        // 1. Crear el lead automáticamente si no existe aún
                        if (!isLeadExisting) {
                          await handleCreateLead(selectedCaptacion);
                        }

                        // 2. Determinar el JID correcto para enviar
                        // Prioridad: wa_jid del lead vinculado (JID real de WhatsApp)
                        // Solo construirlo a mano si no hay lead o no tiene wa_jid
                        const linkedLead = existingLeads.find(
                          l => Number(l.captacion_id) === Number(selectedCaptacion.id)
                        );

                        let jid: string;
                        if (linkedLead?.wa_jid) {
                          // Usar el JID real validado por WhatsApp
                          jid = linkedLead.wa_jid.split(',')[0]; // si hay varios, usar el primero
                        } else {
                          // Construir JID desde el teléfono
                          let phone = selectedCaptacion.telefono.replace(/[^\d]/g, '');
                          if (phone.startsWith('00')) phone = phone.slice(2);
                          if (phone.length === 9 && (phone.startsWith('6') || phone.startsWith('7') || phone.startsWith('9'))) {
                            phone = '34' + phone;
                          }
                          jid = `${phone}@s.whatsapp.net`;
                        }

                        const text = aiMessage || generateWhatsAppMessage(selectedCaptacion);

                        // Verificar si el número tiene WhatsApp antes de enviar
                        const hasWA = await evolutionService.checkWhatsApp(selectedCaptacion.telefono);
                        if (!hasWA) {
                          throw new Error(`El número ${selectedCaptacion.telefono} no tiene WhatsApp. Contacta por teléfono o email.`);
                        }

                        const success = await evolutionService.sendMessage(jid, text);

                        if (success) {
                          showNotification(`Mensaje enviado con éxito a ${selectedCaptacion.calle}`, 'success');
                          setShowContactConfirm(false);
                          setAiMessage('');
                          fetchMessages(jid);
                        } else {
                          throw new Error('Error al enviar el mensaje por WhatsApp');
                        }
                      } catch (err: any) {
                        console.error('Error en envío directo:', err);
                        showNotification(`Error WhatsApp: ${err?.message || 'Error desconocido'}`, 'error');
                      }
                    }}
                    style={{ background: '#25D366', color: 'white', padding: '16px', borderRadius: 16, border: 'none', fontWeight: 800 }}
                  >
                    Confirmar y Enviar
                  </button>
                  <button onClick={() => setShowContactConfirm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
        {showPropertyForm && (
          <PropertyFormModal 
            initialData={selectedCaptacion}
            onClose={() => setShowPropertyForm(false)}
            onSave={handleConvertToProperty}
          />
        )}
      </motion.div>
    </div>
  );
};

export default CaptacionDetailsModal;
