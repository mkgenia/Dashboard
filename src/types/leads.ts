export interface Lead {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  fuente: string;
  estado: string;
  created_at?: string;
  fecha_creacion?: string; // Some tables use this instead of created_at
  notas?: string;
  captacion_id?: number;
  wa_jid?: string;
}

export interface LeadStats {
  total: number;
  nuevos: number;
  enGestion: number;
  citas: number;
  porFuente: {
    web: number;
    whatsapp: number;
    qr: number;
    otras: number;
  };
}
