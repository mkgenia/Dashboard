import { supabase } from '../lib/supabase';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;
const ACTOR_ID = 'OTe82JNUGa93aVcRc';

export interface IdealistaProperty {
  adid: number;
  price: number;
  propertyComment?: string;
  ubication?: {
    title?: string;
    locationName?: string;
  };
  contactInfo?: {
    contactName?: string;
    userType?: string;
    professional?: boolean;
    phone1?: {
      phoneNumber?: string;
    };
  };
  moreCharacteristics?: {
    constructedArea?: number;
    roomNumber?: number;
  };
  basicInfo?: {
    url?: string;
    thumbnail?: string;
  };
  detailWebLink?: string;
  suggestedTexts?: {
    title?: string;
  };
}


export const idealistaService = {
  scrapeAndStore: async () => {
    try {
      console.log('Iniciando scrape de Idealista...');

      // 1. Ejecutar el actor de Apify
      const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxItems: 10,
          monitoringMode: true,
          startUrls: [
            {
              url: 'https://www.idealista.com/venta-viviendas/valencia-valencia/?ordenado-por=fecha-publicacion-desc'
            }
          ],
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"]
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en Apify: ${response.statusText}`);
      }

      const data: IdealistaProperty[] = await response.json();
      console.log(`Scrape completado. ${data.length} propiedades encontradas.`);

      // 2. Limpiar y mapear los datos
      const cleanedData = data
        .filter(item => {
          // Filtrar solo particulares si es necesario (opcional, lo dejamos como en el n8n)
          return item.contactInfo?.userType === 'private' && item.contactInfo?.professional === false;
        })
        .map(item => ({
          id: item.adid.toString(),
          titulo: item.suggestedTexts?.title || item.ubication?.title || 'Propiedad en Idealista',
          precio: item.price,
          area: item.moreCharacteristics?.constructedArea || 0,
          habitaciones: item.moreCharacteristics?.roomNumber || 0,
          ubicacion: item.ubication?.locationName || 'Valencia',
          imagen_url: item.basicInfo?.thumbnail || '',
          idealista_url: item.detailWebLink || item.basicInfo?.url || '',
          telefono: item.contactInfo?.phone1?.phoneNumber || '',
          estado: 'Nuevo',
          estado_whatsapp: 'Pendiente',
          created_at: new Date().toISOString()
        }));

      if (cleanedData.length === 0) {
        console.log('No se encontraron nuevas propiedades de particulares.');
        return [];
      }

      console.log(`Insertando ${cleanedData.length} propiedades en Supabase...`);

      // 3. Insertar en Supabase (upsert por ID para evitar duplicados)
      const { data: inserted, error } = await supabase
        .from('captaciones')
        .upsert(cleanedData, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('Error insertando en Supabase:', error);
        throw error;
      }

      console.log('Inserción completada con éxito.');
      return inserted;
    } catch (error) {
      console.error('Error en el proceso de Idealista:', error);
      throw error;
    }
  }
};
