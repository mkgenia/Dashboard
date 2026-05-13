import type { 
  EvolutionChat, 
  EvolutionMessage, 
  EvolutionContact, 
  ConnectionState 
} from '../types/evolution';

const EVO_URL = '/evo-api';
const API_KEY = import.meta.env.VITE_EVO_API_KEY;
const INSTANCE = import.meta.env.VITE_EVO_INSTANCE;

const headers = {
  'apikey': API_KEY,
  'Content-Type': 'application/json'
};

export const evolutionService = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    if (!EVO_URL || !API_KEY || !INSTANCE) {
      console.error('Evolution API Error: Missing environment variables', { EVO_URL, hasApiKey: !!API_KEY, INSTANCE });
      return null;
    }

    try {
      const url = `${EVO_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        }
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        if (response.status === 404) return null;
        
        let errorMessage = response.statusText;
        if (isJson) {
          const errorBody = await response.json().catch(() => ({}));
          errorMessage = errorBody.message || errorBody.error || response.statusText;
        } else {
          const text = await response.text().catch(() => '');
          if (text.includes('<!DOCTYPE html>')) {
            errorMessage = `Received HTML instead of JSON (likely a 404/500 page from proxy). URL: ${url}`;
          } else {
            errorMessage = text || response.statusText;
          }
        }
        
        console.error(`Evolution API Error [${endpoint}]:`, `API Error (${response.status}): ${errorMessage}`);
        return null;
      }

      if (!isJson) {
        const text = await response.text();
        console.error(`Evolution API Error [${endpoint}]: Expected JSON but received:`, text.slice(0, 100));
        return null;
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Evolution API Error [${endpoint}]:`, error.message);
      return null;
    }
  },

  async getConnectionState(): Promise<ConnectionState> {
    const data = await this.request<any>(`/instance/connectionState/${INSTANCE}`);
    return data?.instance?.state || data?.state || 'disconnected';
  },

  async getConnectQR(): Promise<string | null> {
    const data = await this.request<any>(`/instance/connect/${INSTANCE}`);
    return data?.base64 || data?.code || null;
  },

  async logout(): Promise<boolean> {
    const response = await fetch(`${EVO_URL}/instance/logout/${INSTANCE}`, {
      method: 'DELETE',
      headers
    });
    return response.ok;
  },

  async getChats(): Promise<EvolutionChat[]> {
    const normalizePhone = (p: string) => {
      const clean = p.replace(/[^0-9]/g, '');
      return clean.length > 9 ? clean.slice(-9) : clean;
    };

    let jidToNormalizedPhone = new Map<string, string>();

    // 1. Obtener contactos para mapeo de JID a teléfono
    const contactsData = await this.request<any>(`/chat/findContacts/${INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({ where: {} })
    });
    
    const contactList: EvolutionContact[] = Array.isArray(contactsData) ? contactsData : (contactsData?.data || []);
    contactList.forEach(c => {
      const jid = c.remoteJid || c.id || '';
      const phone = c.number || (jid.includes('@s.whatsapp.net') ? jid.split('@')[0] : null);
      if (jid && phone) {
        jidToNormalizedPhone.set(jid, normalizePhone(phone));
      }
    });

    // 2. Obtener chats
    const chatsData = await this.request<any>(`/chat/findChats/${INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({})
    });

    if (!chatsData) return [];

    const rawChats: any[] = Array.isArray(chatsData) ? chatsData : (chatsData.data || []);
    const groupedChats = new Map<string, EvolutionChat>();

    rawChats.forEach((chat: any) => {
      const jid = chat.remoteJid || chat.id || chat.key?.remoteJid || '';
      if (!jid || jid.includes('broadcast') || jid.includes('status')) return;

      let altJidPhone = null;
      const altJid = chat.lastMessage?.key?.remoteJidAlt;
      if (altJid && altJid.includes('@s.whatsapp.net')) {
        altJidPhone = normalizePhone(altJid.split('@')[0]);
      }

      let phone = altJidPhone || jidToNormalizedPhone.get(jid);
      if (!phone && jid.includes('@s.whatsapp.net') && jid.split('@')[0].length < 15) {
        phone = normalizePhone(jid.split('@')[0]);
      }

      const finalKey = phone || jid;

      if (groupedChats.has(finalKey)) {
        const existing = groupedChats.get(finalKey)!;
        const existingJids = existing.remoteJid.split(',');
        if (!existingJids.includes(jid)) {
          existing.remoteJid = [...existingJids, jid].join(',');
        }

        const timeA = existing.lastMessage?.messageTimestamp || 0;
        const timeB = chat.lastMessage?.messageTimestamp || 0;
        
        if (timeB > timeA) {
          const allJids = existing.remoteJid;
          const mergedUnread = (existing.unreadCount || 0) + (chat.unreadCount || 0);
          Object.assign(existing, chat);
          existing.remoteJid = allJids;
          existing.unreadCount = mergedUnread;
        } else {
          existing.unreadCount = (existing.unreadCount || 0) + (chat.unreadCount || 0);
        }
      } else {
        chat.remoteJid = jid;
        groupedChats.set(finalKey, { ...chat });
      }
    });

    // 3. SEGUNDA PASADA: Fusión por Foto de Perfil (Muy fiable si la URL es idéntica)
    const finalChats: EvolutionChat[] = Array.from(groupedChats.values());
    const chatsByPhoto = new Map<string, EvolutionChat>();
    const mergedList: EvolutionChat[] = [];

    finalChats.forEach(chat => {
      const photo = chat.profilePicUrl;
      // Solo fusionar por foto si es una URL real y no algo genérico
      if (photo && photo.includes('http') && !photo.includes('default')) {
        if (chatsByPhoto.has(photo)) {
          const existing = chatsByPhoto.get(photo)!;
          // Combinar JIDs
          const existingJids = existing.remoteJid.split(',');
          const newJids = chat.remoteJid.split(',');
          const combinedJids = [...new Set([...existingJids, ...newJids])].join(',');
          
          // Quedarse con el mensaje más reciente
          const timeA = existing.lastMessage?.messageTimestamp || 0;
          const timeB = chat.lastMessage?.messageTimestamp || 0;
          
          if (timeB > timeA) {
            Object.assign(existing, chat);
          }
          existing.remoteJid = combinedJids;
          existing.unreadCount = (existing.unreadCount || 0) + (chat.unreadCount || 0);
        } else {
          chatsByPhoto.set(photo, chat);
          mergedList.push(chat);
        }
      } else {
        mergedList.push(chat);
      }
    });

    // 4. TERCERA PASADA: Fusión por Nombre (Menos fiable, solo si el nombre es específico)
    const finalGrouped = new Map<string, EvolutionChat>();
    mergedList.forEach(chat => {
      const name = (chat.name || chat.pushName || '').trim();
      const isGeneric = !name || name === 'Desconocido' || name.match(/^\d+$/);
      
      const key = (!isGeneric && name.length > 3) ? `name_${name.toLowerCase()}` : `id_${chat.remoteJid}`;
      
      if (finalGrouped.has(key)) {
        const existing = finalGrouped.get(key)!;
        const existingJids = existing.remoteJid.split(',');
        const newJids = chat.remoteJid.split(',');
        existing.remoteJid = [...new Set([...existingJids, ...newJids])].join(',');
        
        const timeA = existing.lastMessage?.messageTimestamp || 0;
        const timeB = chat.lastMessage?.messageTimestamp || 0;
        if (timeB > timeA) {
          const allJids = existing.remoteJid;
          Object.assign(existing, chat);
          existing.remoteJid = allJids;
        }
        existing.unreadCount = (existing.unreadCount || 0) + (chat.unreadCount || 0);
      } else {
        finalGrouped.set(key, chat);
      }
    });

    return Array.from(finalGrouped.values()).sort((a, b) => {
      const timeA = a.lastMessage?.messageTimestamp || 0;
      const timeB = b.lastMessage?.messageTimestamp || 0;
      return timeB - timeA;
    });
  },

  async getMessages(jid: string): Promise<EvolutionMessage[]> {
    const ids = [...new Set(jid.split(',').map(j => j.trim()).filter(Boolean))];
    const allMsgs: EvolutionMessage[] = [];

    for (const id of ids) {
      const data = await this.request<any>(`/chat/findMessages/${INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({ where: { key: { remoteJid: id } } })
      });

      if (data) {
        const msgs = data.messages?.records || data.messages || (Array.isArray(data) ? data : (data.data || []));
        if (Array.isArray(msgs)) allMsgs.push(...msgs);
      }
    }

    const seen = new Set<string>();
    return allMsgs
      .filter(m => {
        const msgId = m.key?.id || (m as any).id;
        if (!msgId || seen.has(msgId)) return false;
        seen.add(msgId);
        return true;
      })
      .sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));
  },

  async checkWhatsApp(phone: string): Promise<boolean> {
    // Limpia el número a solo dígitos con prefijo de país
    const clean = phone.replace(/[^\d]/g, '').replace(/^00/, '');
    const withPrefix = clean.length === 9 ? `34${clean}` : clean;
    const data = await this.request<any>(`/chat/whatsappNumbers/${INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({ numbers: [withPrefix] })
    });
    if (!data) return false;
    const result = Array.isArray(data) ? data[0] : data;
    return result?.exists === true || result?.jid?.includes('@s.whatsapp.net');
  },

  async sendMessage(number: string, text: string): Promise<boolean> {
    const jids = number.split(',');
    let targetJid = jids.find(j => j.split('@')[0].length >= 15) || jids[0];
    if (!targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;

    const data = await this.request<any>(`/message/sendText/${INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({ number: targetJid, text })
    });
    return !!data;
  },

  async sendMedia(number: string, base64Data: string, mimetype: string, fileName: string, caption?: string): Promise<boolean> {
    const jids = number.split(',');
    let targetJid = jids.find(j => j.split('@')[0].length >= 15) || jids[0];
    if (!targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;

    let mediatype = 'document';
    if (mimetype.startsWith('image/')) mediatype = 'image';
    else if (mimetype.startsWith('video/')) mediatype = 'video';
    else if (mimetype.startsWith('audio/')) mediatype = 'audio';

    const cleanBase64 = base64Data.split(',')[1] || base64Data;

    const data = await this.request<any>(`/message/sendMedia/${INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({
        number: targetJid,
        mediatype,
        mimetype,
        caption: caption || '',
        media: cleanBase64,
        fileName
      })
    });
    return !!data;
  },

  async markAsRead(jid: string, messageId: string) {
    const jids = jid.split(',');
    for (const id of jids) {
      await this.request(`/chat/markMessageAsRead/${INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({
          readMessages: [{ remoteJid: id, fromMe: false, id: messageId }]
        })
      });
    }
  },

  async markChatAsRead(jid: string) {
    const jids = jid.split(',');
    for (const id of jids) {
      await this.request(`/chat/readMessages/${INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({ number: id, read: true })
      });
    }
  },

  async deleteMessage(remoteJid: string, messageId: string, fromMe: boolean): Promise<boolean> {
    const response = await fetch(`${EVO_URL}/chat/deleteMessage/${INSTANCE}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id: messageId, remoteJid, fromMe })
    });
    return response.ok;
  },

  async editMessage(remoteJid: string, messageId: string, newText: string): Promise<boolean> {
    const response = await fetch(`${EVO_URL}/message/editText/${INSTANCE}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        number: remoteJid,
        text: newText,
        key: { id: messageId, remoteJid, fromMe: true }
      })
    });
    return response.ok;
  }
};

