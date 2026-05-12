import { supabase } from '../lib/supabase';
import type { Property } from '../types/properties';

export const propertyService = {
  async getProperties() {
    const { data, error } = await supabase
      .from('propiedades')
      .select(`
        *,
        propietario:propietario_id (
          nombre,
          apellidos,
          telefono
        ),
        agente:agente_id (
          nombre,
          apellidos
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[]; // Retornamos con los datos del propietario incluidos
  },

  async createProperty(property: Omit<Property, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('propiedades')
      .insert([property])
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  async updateProperty(id: string, updates: Partial<Property>) {
    const { data, error } = await supabase
      .from('propiedades')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  /**
   * Obtiene la lista de posibles propietarios (Leads)
   */
  async getPotentialOwners() {
    const { data, error } = await supabase
      .from('leads')
      .select('id, nombre, apellidos, telefono, captacion_id')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
  },

  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('propiedades')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('propiedades')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
