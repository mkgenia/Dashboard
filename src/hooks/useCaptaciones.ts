import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Captacion, HistorialCambio } from '../types/captaciones';
import type { Lead } from '../types/leads';
import { evolutionService } from '../services/evolutionService';
import type { EvolutionChat } from '../types/evolution';

export const useCaptaciones = () => {
   const [captaciones, setCaptaciones] = useState<Captacion[]>([]);
  const [historial, setHistorial] = useState<HistorialCambio[]>([]);
  const [existingLeads, setExistingLeads] = useState<Lead[]>([]);
  const [chats, setChats] = useState<EvolutionChat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*');
      if (!error && data) setExistingLeads(data as Lead[]);
    } catch (err) {
      console.error('Error fetching existing leads:', err);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const data = await evolutionService.getChats();
      if (data) setChats(data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  }, []);

  const fetchHistorial = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('historial_cambios')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      if (data) setHistorial(data as HistorialCambio[]);
    } catch (error) {
      console.error('Error fetching historial:', error);
    }
  }, []);

  const fetchCaptaciones = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('captaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCaptaciones(data as Captacion[]);
        await fetchHistorial();
      }
    } catch (error) {
      console.error('Error fetching captaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchHistorial]);

  useEffect(() => {
    fetchCaptaciones();
    fetchLeads();
    fetchChats();

    const subscription = supabase
      .channel('captaciones-view-realtime')
      .on('postgres_changes', { event: '*', table: 'captaciones', schema: 'public' }, () => {
        fetchCaptaciones();
      })
      .on('postgres_changes', { event: '*', table: 'leads', schema: 'public' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', table: 'historial_cambios', schema: 'public' }, () => {
        fetchHistorial();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCaptaciones, fetchLeads, fetchHistorial]);

  return {
    captaciones,
    historial,
    existingLeads,
    chats,
    loading,
    refresh: () => {
      fetchCaptaciones();
      fetchChats();
    }
  };
};
