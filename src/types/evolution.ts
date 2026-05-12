export interface EvolutionContact {
  id: string;
  remoteJid: string;
  pushName?: string;
  name?: string;
  number?: string;
  profilePicUrl?: string;
}

export interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    remoteJidAlt?: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      caption?: string;
      url?: string;
      mimetype?: string;
    };
  };
  messageTimestamp: number;
  pushName?: string;
  status?: string;
}

export interface EvolutionChat {
  id: string;
  remoteJid: string;
  name?: string;
  pushName?: string;
  unreadCount?: number;
  profilePicUrl?: string;
  lastMessage?: EvolutionMessage;
}

export type ConnectionState = 'open' | 'connecting' | 'disconnected' | 'close';

export interface EvolutionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
