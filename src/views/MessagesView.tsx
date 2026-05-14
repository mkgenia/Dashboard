import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MoreVertical,
  MessageCircle,
  CheckCheck,
  Paperclip,
  Smile,
  Info,
  RefreshCw,
  Loader2,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import WhatsAppConnection from '../components/WhatsAppConnection';
import { evolutionService } from '../services/evolutionService';
import { useCaptaciones } from '../hooks/useCaptaciones';
import type { EvolutionChat, EvolutionMessage, ConnectionState } from '../types/evolution';
import { useApp } from '../contexts/AppContext';

interface MessageDisplay {
  id: string;
  sender: 'me' | 'them' | 'agent' | 'lead';
  contenido: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'whatsapp' | 'email';
  asunto?: string;
}

interface MessagesViewProps {
  // Props removed in favor of useApp
}

const MessagesView: React.FC<MessagesViewProps> = () => {
  const { captaciones } = useCaptaciones();
  const { activeChatId, setActiveChatId } = useApp();
  const [chats, setChats] = useState<EvolutionChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [waState, setWaState] = useState<ConnectionState>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const scrollToBottom = (force = false) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (force || isNearBottom || isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoad ? 'instant' : 'smooth' });
      if (isInitialLoad) setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    const checkWA = async () => {
      const state = await evolutionService.getConnectionState();
      setWaState(state);
    };
    checkWA();
    const interval = setInterval(checkWA, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleWaLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión de WhatsApp?')) {
      await evolutionService.logout();
      setWaState('disconnected');
    }
  };

  const fetchChats = async (isSilent = false) => {
    if (waState !== 'open') return;
    if (!isSilent && chats.length === 0) setLoading(true);
    try {
      const evoChats = await evolutionService.getChats();
      
      // Forzar que el chat seleccionado siempre tenga 0 no leídos en el estado local
      const optimizedChats = evoChats.map(c => 
        c.remoteJid === selectedChatId ? { ...c, unreadCount: 0 } : c
      );

      if (JSON.stringify(optimizedChats) !== JSON.stringify(chats)) {
        setChats(optimizedChats);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (jid: string) => {
    try {
      const evoMsgs = await evolutionService.getMessages(jid);

      const formattedMsgs: MessageDisplay[] = evoMsgs.map((m: EvolutionMessage) => {
        const content = m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          'Mensaje multimedia';

        return {
          id: m.key?.id || Math.random().toString(),
          contenido: content,
          timestamp: new Date((m.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
          sender: m.key?.fromMe ? 'agent' : 'lead',
          status: (m.status as any) === 'READ' ? 'read' : 'sent',
          type: 'whatsapp'
        };
      });

      if (JSON.stringify(formattedMsgs) !== JSON.stringify(messages)) {
        setMessages(formattedMsgs);
        
        // Marcar como leído
        const lastReceived = [...evoMsgs].reverse().find(m => !m.key?.fromMe);
        if (lastReceived && lastReceived.key?.id) {
          evolutionService.markChatAsRead(jid);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(() => {
      if (waState === 'open') fetchChats(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [waState, selectedChatId]);


  const normalizePhone = (p: string | undefined | null) => {
    if (!p) return '';
    const clean = p.replace(/[^0-9]/g, '');
    return clean.length >= 9 ? clean.slice(-9) : clean;
  };

  useEffect(() => {
    if (activeChatId) {
      // 1. Intentar encontrar el chat real en la lista cargada
      const realChat = chats.find(c => {
        const jids = (c.remoteJid || '').split(',');
        const targetPhone = normalizePhone(activeChatId.split('@')[0]);
        return jids.some(j => {
          if (j === activeChatId) return true;
          const chatPhone = normalizePhone(j.split('@')[0]);
          return chatPhone === targetPhone;
        });
      });

      if (realChat) {
        setSelectedChatId(realChat.remoteJid);
        setActiveChatId(null);
      } else if (chats.length > 0) {
        // Si ya hay chats cargados y no lo encontramos, usamos el ID directo como fallback
        setSelectedChatId(activeChatId);
        setActiveChatId(null);
      }
      // Si chats está vacío, esperamos a la siguiente carga
    }
  }, [activeChatId, chats]);

  useEffect(() => {
    if (selectedChatId) {
      setIsInitialLoad(true); // Reiniciar para el nuevo chat
      fetchMessages(selectedChatId);
      const interval = setInterval(() => {
        fetchMessages(selectedChatId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return;

    try {
      const success = await evolutionService.sendMessage(selectedChatId, newMessage);
      if (success) {
        setNewMessage('');
        await fetchMessages(selectedChatId);
        scrollToBottom(true); // Forzar scroll al enviar
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        try {
          const caption = prompt("Añadir comentario (opcional):") || '';
          await evolutionService.sendMedia(selectedChatId, base64, file.type, file.name, caption);
          fetchMessages(selectedChatId);
        } catch (error) {
          alert("Error enviando el archivo");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedChat = chats.find(c => c.remoteJid === selectedChatId);

  const getChatDisplayName = (chat: EvolutionChat) => {
    const rawName = chat.name || chat.pushName;
    const isLikelyPhone = rawName && /^[0-9+\-\s]+$/.test(rawName);
    
    if (!rawName || isLikelyPhone) {
      const chatPhone = normalizePhone(chat.remoteJid.split('@')[0]);
      const captacion = captaciones.find(c => normalizePhone(c.telefono) === chatPhone);
      if (captacion && captacion.nombre) {
        return captacion.nombre;
      }
    }
    
    return rawName || 'Desconocido';
  };

  const formatMessageText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\n/g, '<br />')
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  };

  return (
    <div style={{ height: 'calc(100vh - 160px)', display: 'flex', gap: 0, background: 'var(--card-bg)', borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <div style={{ width: 350, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)' }}>
        <div style={{ padding: '32px 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Mensajes</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {waState === 'open' && (
                <button 
                  onClick={handleWaLogout} 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', height: 40, padding: '0 12px', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8rem' }}
                  title="Cerrar sesión de WhatsApp"
                >
                  <LogOut size={16} /> WA
                </button>
              )}
              <button onClick={() => fetchChats()} disabled={loading} style={{ background: 'var(--bg-color)', border: 'none', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <div className="search-pill" style={{ width: '100%' }}>
            <Search size={20} color="var(--text-secondary)" />
            <input 
              id="chat-search"
              name="chat-search"
              type="text" 
              placeholder="Buscar chat..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
          ) : (
            chats
              .filter(c => getChatDisplayName(c).toLowerCase().includes(searchTerm.toLowerCase()) || c.remoteJid.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(chat => (
                <div
                  key={chat.remoteJid}
                  onClick={() => setSelectedChatId(chat.remoteJid)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    gap: 12,
                    cursor: 'pointer',
                    background: selectedChatId === chat.remoteJid ? 'var(--bg-color)' : 'transparent',
                    borderRadius: 16,
                    marginBottom: 4,
                    transition: '0.2s',
                    position: 'relative'
                  }}
                >
                  <img 
                    src={chat.profilePicUrl || `https://avatar.vercel.sh/${chat.remoteJid}`} 
                    alt="" 
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} 
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = `https://avatar.vercel.sh/${chat.remoteJid}`;
                    }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{getChatDisplayName(chat)}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {chat.lastMessage?.messageTimestamp ? format(new Date(chat.lastMessage.messageTimestamp * 1000), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.lastMessage?.message?.conversation || chat.lastMessage?.message?.extendedTextMessage?.text || 'Multimedia'}
                    </p>
                  </div>
                  {chat.unreadCount ? (
                    <div style={{ position: 'absolute', right: 20, bottom: 20, background: 'var(--accent-yellow)', color: 'black', fontSize: '0.7rem', fontWeight: 900, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {chat.unreadCount}
                    </div>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', position: 'relative' }}>
        <AnimatePresence>
          {waState !== 'open' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WhatsAppConnection />
            </motion.div>
          )}
        </AnimatePresence>

        {selectedChatId ? (
          <>
            <header style={{ padding: '24px 40px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img 
                  src={selectedChat?.profilePicUrl || `https://avatar.vercel.sh/${selectedChatId}`} 
                  style={{ width: 44, height: 44, borderRadius: '50%' }} 
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = `https://avatar.vercel.sh/${selectedChatId}`;
                  }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedChat ? getChatDisplayName(selectedChat) : 'Desconocido'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#25D366', fontWeight: 700 }}>● En línea</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Info size={20} color="var(--text-secondary)" />
                <MoreVertical size={20} color="var(--text-secondary)" />
              </div>
            </header>

            <div 
          ref={scrollContainerRef}
          style={{ flex: 1, overflowY: 'auto', padding: 30, background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: 15 }}
        >
              {messages.map((msg, i) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id + i}
                    style={{
                      alignSelf: isAgent ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      background: isAgent ? '#075E54' : 'var(--card-bg)',
                      color: isAgent ? 'white' : 'var(--text-primary)',
                      padding: '10px 16px',
                      borderRadius: isAgent ? '16px 0 16px 16px' : '0 16px 16px 16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontSize: '0.95rem',
                      lineHeight: 1.5
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: formatMessageText(msg.contenido) }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4, fontSize: '0.65rem', opacity: 0.6 }}>
                      {format(new Date(msg.timestamp), 'HH:mm')}
                      {isAgent && <CheckCheck size={14} color={msg.status === 'read' ? '#34B7F1' : 'white'} />}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <footer style={{ padding: '24px 40px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <Smile size={24} color="var(--text-secondary)" />
              <Paperclip size={24} color="var(--text-secondary)" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }} />
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <input
                id="message-input"
                name="message"
                type="text"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, padding: '14px 24px', borderRadius: 24, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}
              />
              <button onClick={handleSendMessage} className="btn-primary" style={{ width: 50, height: 50, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={20} />
              </button>
            </footer>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: 20 }}>
            <MessageCircle size={60} strokeWidth={1} />
            <p style={{ fontWeight: 600 }}>Selecciona un chat para ver la conversación</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesView;
