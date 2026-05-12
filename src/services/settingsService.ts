import { supabase } from '../lib/supabase';

export interface AppSettings {
  id?: string;
  key: string;
  value: any;
  updated_at?: string;
}

export const settingsService = {
  getSetting: async (key: string, defaultValue: any = null) => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        // Si la tabla no existe o el registro no está, devolvemos el valor de localStorage como fallback
        const localValue = localStorage.getItem(`setting_${key}`);
        return localValue !== null ? JSON.parse(localValue) : defaultValue;
      }

      return data.value;
    } catch (err) {
      const localValue = localStorage.getItem(`setting_${key}`);
      return localValue !== null ? JSON.parse(localValue) : defaultValue;
    }
  },

  updateSetting: async (key: string, value: any) => {
    try {
      // Intentar guardar en Supabase
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      // Siempre guardar en localStorage como respaldo/caché
      localStorage.setItem(`setting_${key}`, JSON.stringify(value));

      if (error) {
        console.warn('Error saving setting to Supabase, using localStorage:', error.message);
      }
    } catch (err) {
      localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    }
  }
};
