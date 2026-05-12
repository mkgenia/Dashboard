import { supabase } from '../lib/supabase';
import type { Lead, LeadStats } from '../types/leads';

export const leadService = {
  getLeads: async (): Promise<Lead[]> => {
    try {
      let { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const retry = await supabase
          .from('leads')
          .select('*')
          .order('fecha_creacion', { ascending: false });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        const retry = await supabase.from('leads').select('*');
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Error fetching leads:', error);
        return [];
      }

      return data as Lead[];
    } catch (err) {
      console.error('Unexpected error:', err);
      return [];
    }
  },
  
  getStats: async (): Promise<LeadStats> => {
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('estado, fuente');

      if (error) throw error;

      const leadData = leads as Pick<Lead, 'estado' | 'fuente'>[];

      return {
        total: leadData.length,
        nuevos: leadData.filter(l => (l.estado || '').includes('Nuevo')).length,
        enGestion: leadData.filter(l => (l.estado || '').includes('Gestión')).length,
        citas: leadData.filter(l => (l.estado || '').includes('Cita')).length,
        porFuente: {
          web: leadData.filter(l => (l.fuente || '').toLowerCase().includes('web')).length,
          whatsapp: leadData.filter(l => (l.fuente || '').toLowerCase().includes('whatsapp')).length,
          qr: leadData.filter(l => (l.fuente || '').toLowerCase().includes('qr')).length,
          otras: leadData.filter(l => {
            const f = (l.fuente || '').toLowerCase();
            return !f.includes('web') && !f.includes('whatsapp') && !f.includes('qr');
          }).length,
        }
      };
    } catch (err) {
      console.error('Error fetching stats:', err);
      return { total: 0, nuevos: 0, enGestion: 0, citas: 0, porFuente: { web: 0, whatsapp: 0, qr: 0, otras: 0 }};
    }
  },

  createLead: async (lead: Omit<Lead, 'id' | 'created_at' | 'fecha_creacion'>): Promise<Lead> => {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select();
    
    if (error) throw error;
    return data[0] as Lead;
  },

  updateLead: async (id: string, updates: Partial<Lead>): Promise<Lead> => {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0] as Lead;
  },

  /**
   * Obtiene las propiedades que pertenecen a este lead
   */
  async getLeadProperties(leadId: string) {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*')
      .eq('propietario_id', leadId);
    
    if (error) throw error;
    return data;
  }
};
