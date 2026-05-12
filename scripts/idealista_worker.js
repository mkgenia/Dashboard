import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env manualmente para evitar dependencias extra
const envPath = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
  });
}

const APIFY_TOKEN = env.VITE_APIFY_TOKEN;
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const ACTOR_ID = 'OTe82JNUGa93aVcRc';

async function runScraper() {
  console.log(`[${new Date().toLocaleTimeString()}] Iniciando captura de 10 propiedades de Idealista...`);
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxItems: 10,
        monitoringMode: true,
        startUrls: [
          { url: 'https://www.idealista.com/venta-viviendas/valencia-valencia/?ordenado-por=fecha-publicacion-desc' }
        ],
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      }),
    });

    if (!response.ok) throw new Error(`Apify Error: ${response.statusText}`);

    const data = await response.json();
    console.log(`Capturadas ${data.length} propiedades.`);

    const cleanedData = data
      .filter(item => item.contactInfo?.userType === 'private' && item.contactInfo?.professional === false)
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
        estado_whatsapp: 'Pendiente',
        raw_data: item
      }));

    if (cleanedData.length > 0) {
      console.log(`Subiendo ${cleanedData.length} propiedades nuevas a Supabase...`);
      
      const res = await fetch(`${SUPABASE_URL}/rest/v1/captaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(cleanedData)
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase Error: ${err}`);
      }
      console.log('¡Éxito! Propiedades insertadas.');
    } else {
      console.log('No se encontraron propiedades nuevas de particulares en esta ejecución.');
    }

  } catch (error) {
    console.error('Error en el worker:', error.message);
  }
}

// Ejecutar cada 10 minutos (600.000 ms)
console.log('Worker de Idealista iniciado. Se ejecutará cada 10 minutos.');
runScraper();
setInterval(runScraper, 10 * 60 * 1000);
