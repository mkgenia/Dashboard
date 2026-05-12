import { leadService } from './leadService';
import { evolutionService } from './evolutionService';
import { supabase } from '../lib/supabase';
import { settingsService } from './settingsService';

export const automationService = {
  processNewCaptacion: async (cap: any) => {
    try {
      // 1. Verificar si la automatización está activa
      const isAutoEnabled = await settingsService.getSetting('auto_contact_enabled', false);
      if (!isAutoEnabled) return;

      // 2. Verificar si ya existe un lead para esta captación para no duplicar
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('captacion_id', cap.id);
      
      if (existingLeads && existingLeads.length > 0) {
        console.log(`[Automation] Captación ${cap.id} ya tiene un lead asociado. Saltando.`);
        return;
      }

      // 3. Verificar si tiene teléfono
      const phone = cap.telefono || '';
      const cleanPhone = phone.replace(/[^\d]/g, '');
      if (cleanPhone.length < 9) return;

      console.log(`[Automation] Procesando captación ${cap.id} automáticamente...`);

      // 3. Crear Lead
      await leadService.createLead({
        nombre: cap.nombre || 'Propietario',
        apellidos: cap.barrio || 'Idealista',
        email: '',
        telefono: phone,
        fuente: 'Captación Automática',
        estado: 'Nuevo',
        notas: `CONTACTO AUTOMÁTICO IA\nPROPIEDAD: ${cap.calle}\nZONA: ${cap.barrio}\nURL: ${cap.url}`,
        captacion_id: cap.id
      });

      // 4. Generar Mensaje IA (vía Webhook)
      const message = await automationService.generateAIMessage(cap);

      // 5. Enviar WhatsApp
      const sent = await evolutionService.sendMessage(phone, message);

      if (sent) {
        // 6. Actualizar Estado de la Captación
        await supabase
          .from('captaciones')
          .update({ 
            estado: 'Contactado',
            estado_whatsapp: 'Enviado' 
          })
          .eq('id', cap.id);
        
        console.log(`[Automation] Captación ${cap.id} contactada con éxito.`);
      }

    } catch (error) {
      console.error('[Automation] Error procesando captación:', error);
    }
  },

  generateAIMessage: async (cap: any) => {
    try {
      const N8N_WEBHOOK_URL = 'https://test-n8n.pzkz6e.easypanel.host/webhook/ia-lead-gen';
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_message',
          captacion_id: cap.id,
          agent: 'Sistema Automático Grupo Hogares'
        })
      });

      if (!response.ok) throw new Error('Error n8n');
      const data = await response.json();
      return data.message || automationService.getFallbackMessage(cap);
    } catch (err) {
      return automationService.getFallbackMessage(cap);
    }
  },

  getFallbackMessage: (cap: any) => {
    return `Hola ${cap.nombre || 'propietario'}, 👋\n\nLe contacto de Grupo Hogares por su anuncio en ${cap.calle}. Me ha parecido muy interesante. ¿Hablamos? 🏠`;
  }
};
