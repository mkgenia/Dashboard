import type { Captacion } from '../types/captaciones';

export const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Gestionado': return '#10b981';
    case 'Nuevo': return '#3b82f6';
    case 'Contactado': return '#8b5cf6';
    case 'Pendiente': return '#f59e0b';
    case 'Rechazado': return '#ef4444';
    default: return '#6b7280';
  }
};

export const getParsedRawData = (cap: Captacion) => {
  if (!cap.raw_data) return null;
  if (typeof cap.raw_data === 'string') {
    try {
      return JSON.parse(cap.raw_data);
    } catch (e) {
      return null;
    }
  }
  return cap.raw_data;
};

export const getThumbnail = (cap: Captacion) => {
  // Prioridad absoluta a las imágenes persistentes en el bucket (WebP)
  if (cap.imagenes && cap.imagenes.length > 0) return cap.imagenes[0];
  if (cap.imagen_url) return cap.imagen_url;

  // Si no hay imágenes persistentes, devolvemos la imagen por defecto
  // para evitar mostrar enlaces de Idealista que caducan rápido.
  return FALLBACK_IMG;
};

export const getAllImages = (cap: Captacion): string[] => {
  // Prioridad absoluta a la galería persistente
  if (cap.imagenes && cap.imagenes.length > 0) {
    return cap.imagenes;
  }

  if (cap.imagen_url) {
    return [cap.imagen_url];
  }

  // Fallback a imagen única por defecto
  return [FALLBACK_IMG];
};

export const phoneToJid = (phone: string): string => {
  let clean = phone.replace(/[^\d]/g, '');
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.length === 9) clean = '34' + clean;
  return `${clean}@s.whatsapp.net`;
};

export const parseCurrency = (val: string) => {
  if (!val) return 0;
  const clean = val.replace(/[^\d.-]/g, '');
  return parseFloat(clean);
};

export const generateWhatsAppMessage = (cap: Captacion): string => {
  const raw = getParsedRawData(cap);
  const nombre = cap.nombre || 'propietario';
  const calle = cap.calle || 'su propiedad';
  const barrio = cap.barrio || 'Valencia';
  const precio = cap.precio ? `${cap.precio.toLocaleString()}€` : '';
  const metros = cap.metros ? `${cap.metros}m²` : '';
  const habs = cap.habitaciones ? `${cap.habitaciones} habitaciones` : '';

  const extras: string[] = [];
  if (raw?.moreCharacteristics?.hasLift) extras.push('ascensor');
  if (raw?.moreCharacteristics?.hasGarden) extras.push('jardín');
  if (raw?.moreCharacteristics?.hasTerrace) extras.push('terraza');
  if (raw?.moreCharacteristics?.hasSwimmingPool) extras.push('piscina');
  if (raw?.moreCharacteristics?.hasAirConditioning) extras.push('aire acondicionado');
  const extrasText = extras.length > 0 ? ` con ${extras.join(', ')}` : '';

  return `Hola ${nombre}, 👋\n\nLe contacto desde *Grupo Hogares*, empresa de gestión inmobiliaria en Valencia.\n\nHe visto su anuncio del piso en *${calle}*, ${barrio}${precio ? ` por ${precio}` : ''}${metros ? ` (${metros}${habs ? ', ' + habs : ''}${extrasText})` : ''}.\n\nEstamos especializados en ayudar a propietarios a vender su vivienda de forma rápida y al mejor precio. ¿Tendría unos minutos para comentarle cómo podemos ayudarle?\n\nUn saludo 🏠`;
};

export const hasPhone = (cap: Captacion) => {
  return cap.telefono &&
    !cap.telefono.toLowerCase().includes('no disponible') &&
    !cap.telefono.toLowerCase().includes('privado') &&
    cap.telefono.trim() !== '';
};
