import React, { useState, useRef, useEffect } from 'react';
import {
  X, Save, Home, Euro, Image as ImageIcon, ClipboardCheck,
  Maximize2, Trash2, Loader2, Users,
  ShieldCheck, Building, Building2, AlertCircle, Waves, TreePine,
  Layout, Archive, Accessibility, Wind, Search, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Property } from '../types/properties';
import type { Captacion } from '../types/captaciones';
import { propertyService } from '../services/propertyService';
import { catastroService, type CatastroUnit } from '../services/catastroService';

// Esquema de validación profesional
const propertySchema = z.object({
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  tipo_inmueble: z.string().min(1, "El tipo de inmueble es obligatorio"),
  tipo_operacion: z.enum(['venta', 'alquiler', 'venta_alquiler', 'traspaso']),
  estado_venta: z.enum(['disponible', 'reservado', 'vendido', 'alquilado', 'baja']),
  precio: z.coerce.number().min(1, "El precio es obligatorio"),
  calle: z.string().min(3, "La calle es obligatoria"),
  numero: z.string().min(1, "El número es obligatorio"),
  bloque: z.string().optional(),
  barrio: z.string().min(2, "El barrio es obligatorio"),
  ciudad: z.string().min(2, "La ciudad es obligatoria"),
  provincia: z.string().min(2, "La provincia es obligatoria"),
  metros_construidos: z.coerce.number().min(1, "Los metros construidos son obligatorios"),
  metros_utiles: z.coerce.number(),
  habitaciones_dobles: z.coerce.number(),
  habitaciones_simples: z.coerce.number(),
  banos: z.coerce.number().min(1, "Al menos 1 baño"),
  ascensor: z.boolean().default(false),
  aire_acondicionado: z.boolean().default(false),
  propietario_id: z.string().uuid("Debes seleccionar un propietario (Lead) válido"),
  imagenes: z.array(z.string()).default([]),
  captacion_id: z.number().optional(),
  precio_alquiler: z.coerce.number().optional(),
  gastos_comunidad: z.coerce.number().optional(),
  honorarios_fijo: z.coerce.number().optional(),
  honorarios_porcentaje: z.coerce.number().optional(),
  ibi: z.coerce.number().optional(),
  piscina: z.boolean().optional(),
  jardin: z.boolean().optional(),
  armarios_empotrados: z.boolean().optional(),
  balcon: z.boolean().optional(),
  terraza: z.boolean().optional(),
  acceso_adaptado: z.boolean().optional(),
  ano_construccion: z.coerce.number().optional(),
  orientacion: z.string().optional(),
  consumo_energetico_letra: z.string().optional(),
  emisiones_letra: z.string().optional(),
  piso: z.string().optional(),
  exclusiva: z.string().optional(),
  metros_parcela: z.coerce.number().optional(),
  trastero: z.boolean().default(false),
  referencia_catastral: z.string().optional(),
  escalera: z.string().optional(),
  puerta: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormModalProps {
  initialData?: Partial<Property> | Captacion;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

type TabType = 'operacion' | 'economico' | 'tecnico' | 'equipamiento' | 'legal' | 'multimedia';

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ initialData, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('operacion');
  const [potentialOwners, setPotentialOwners] = useState<any[]>([]);
  const [searchingCatastro, setSearchingCatastro] = useState(false);
  const [catastroUnits, setCatastroUnits] = useState<CatastroUnit[]>([]);
  const [showCatastroRefinement, setShowCatastroRefinement] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selEsc, setSelEsc] = useState<string>('');
  const [selPla, setSelPla] = useState<string>('');
  const [catastroNumbers, setCatastroNumbers] = useState<string[]>([]);
  const [officialStreet, setOfficialStreet] = useState<{ sigla: string, nombre: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicialización de valores desde Captación o Propiedad existente
  const getInitialValues = (): Partial<PropertyFormData> => {
    if (!initialData) return {
      estado_venta: 'disponible', tipo_operacion: 'venta', imagenes: [],
      habitaciones_dobles: 0, habitaciones_simples: 0, banos: 1,
      provincia: 'Valencia', ciudad: 'Valencia', ascensor: false, aire_acondicionado: false
    };

    const isCaptacion = 'calle' in initialData && !('referencia' in initialData);
    if (isCaptacion) {
      const cap = initialData as Captacion;
      return {
        titulo: `Piso en ${cap.calle}`,
        precio: cap.precio,
        calle: cap.calle,
        barrio: cap.barrio,
        ciudad: 'Valencia',
        provincia: 'Valencia',
        habitaciones_dobles: Math.floor(cap.habitaciones / 2),
        habitaciones_simples: Math.ceil(cap.habitaciones / 2),
        banos: cap.banos || 1,
        metros_construidos: cap.metros || 0,
        metros_utiles: cap.raw_data?.moreCharacteristics?.usableArea || Math.floor((cap.metros || 0) * 0.9),
        ascensor: cap.raw_data?.moreCharacteristics?.lift || cap.raw_data?.moreCharacteristics?.hasLift || cap.tiene_ascensor || false,
        piscina: cap.raw_data?.moreCharacteristics?.swimmingPool || cap.raw_data?.moreCharacteristics?.hasSwimmingPool || cap.raw_data?.features?.hasSwimmingPool || false,
        jardin: cap.raw_data?.moreCharacteristics?.garden || cap.raw_data?.moreCharacteristics?.hasGarden || cap.raw_data?.features?.hasGarden || false,
        armarios_empotrados: cap.raw_data?.moreCharacteristics?.hasBuiltInWardrobes || false,
        balcon: cap.raw_data?.moreCharacteristics?.balcony || cap.raw_data?.moreCharacteristics?.hasBalcony || false,
        terraza: cap.raw_data?.moreCharacteristics?.terrace || cap.raw_data?.moreCharacteristics?.hasTerrace || cap.raw_data?.features?.hasTerrace || false,
        trastero: cap.raw_data?.moreCharacteristics?.boxroom || cap.raw_data?.moreCharacteristics?.hasBoxRoom || false,
        acceso_adaptado: cap.raw_data?.moreCharacteristics?.isAccessible || false,
        ano_construccion: cap.raw_data?.moreCharacteristics?.constructionYear || undefined,
        orientacion: cap.raw_data?.moreCharacteristics?.orientation || '',
        piso: cap.raw_data?.moreCharacteristics?.floor || '',
        metros_parcela: cap.raw_data?.moreCharacteristics?.plotOfLand || 0,
        consumo_energetico_letra: (cap.raw_data?.energyCertification?.energyConsumption?.type === 'inProcess' || cap.raw_data?.moreCharacteristics?.energyCertificationType === 'inProcess') ? 'TRAMITE' : (cap.raw_data?.energyCertification?.energyConsumption?.type?.toUpperCase() || 'E'),
        emisiones_letra: (cap.raw_data?.energyCertification?.emissions?.type === 'inProcess' || cap.raw_data?.moreCharacteristics?.energyCertificationType === 'inProcess') ? 'TRAMITE' : (cap.raw_data?.energyCertification?.emissions?.type?.toUpperCase() || 'E'),
        imagenes: cap.raw_data?.multimedia?.images?.map((img: any) => img.url) || (cap.imagen_url ? [cap.imagen_url] : []),
        estado_venta: 'disponible',
        tipo_operacion: 'venta',
        tipo_inmueble: (cap.raw_data?.homeType === 'countryHouse' || cap.raw_data?.homeType === 'chalet') ? 'casa' : 'piso',
        captacion_id: cap.id
      };
    }
    return initialData as PropertyFormData;
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: getInitialValues() as any
  });

  const imagenes = watch('imagenes') || [];

  // Cargar leads reales
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const leads = await propertyService.getPotentialOwners();
        setPotentialOwners(leads || []);

        // Auto-selección si venimos de una captación
        const isCaptacion = initialData && 'id' in initialData && !('referencia' in initialData);
        if (isCaptacion) {
          const capId = (initialData as Captacion).id;
          const leadVinculado = leads.find(l => l.captacion_id === capId);
          if (leadVinculado) {
            setValue('propietario_id', leadVinculado.id);
          }
        }
      } catch (error) {
        console.error('Error loading leads:', error);
      }
    };
    loadLeads();
  }, [initialData, setValue]);

  const streetValue = watch('calle');

  // BUSCADOR OFICIAL DEL MINISTERIO (Sede Electrónica del Catastro)
  useEffect(() => {
    const normalize = (str: string) => {
      if (!str) return "";
      return str.toUpperCase()
        .replace(/[ÁÀÄ]/g, "A")
        .replace(/[ÉÈË]/g, "E")
        .replace(/[ÍÌÏ]/g, "I")
        .replace(/[ÓÒÖ]/g, "O")
        .replace(/[ÚÙÜ]/g, "U")
        .replace(/Ç/g, "C")
        .trim();
    };

    const searchCatastroStreet = async () => {
      // Si la calle actual ya es la oficial que acabamos de seleccionar, no buscamos de nuevo
      if (officialStreet && streetValue.toUpperCase() === officialStreet.nombre.toUpperCase()) {
        setShowSuggestions(false);
        return;
      }

      if (streetValue && streetValue.length > 2) {
        try {
          const ciudad = watch('ciudad') || 'VALENCIA';
          const provincia = watch('provincia') || ciudad;

          console.log('🚀 Disparando búsqueda Catastro para:', streetValue);
          const vias = await catastroService.getVias(normalize(provincia), normalize(ciudad), normalize(streetValue));
          console.log('📦 Vías recibidas del Catastro:', vias);

          if (vias && vias.length > 0) {
            const suggestions = vias.map((v, idx) => ({
              label: v.label,
              street: v.nombre,
              sigla: v.sigla,
              city: v.city,
              state: v.state,
              key: `${v.label}-${idx}`
            }));

            setStreetSuggestions(suggestions);
            setShowSuggestions(true);
          } else {
            console.log('⚠️ No se encontraron vías para esta búsqueda');
            setStreetSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (error) {
          console.error('❌ Error crítico en Callejero Oficial:', error);
        }
      } else {
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(searchCatastroStreet, 400);
    return () => clearTimeout(timer);
  }, [streetValue]);

  // Cargar números oficiales al seleccionar la calle
  useEffect(() => {
    const loadNumbers = async () => {
      const calle = watch('calle');
      const ciudad = watch('ciudad');
      if (calle && officialStreet && ciudad) {
        try {
          const provincia = watch('provincia') || ciudad;
          const nums = await catastroService.getNumeros(normalize(provincia), normalize(ciudad), officialStreet.sigla, officialStreet.nombre);
          setCatastroNumbers(nums.sort((a, b) => parseInt(a) - parseInt(b)));
          // Resetear número al cambiar de calle
          setValue('numero', '');
          setCatastroUnits([]);
          setShowCatastroRefinement(false);
        } catch (error) {
          console.error('Error cargando portales:', error);
        }
      }
    };
    loadNumbers();
  }, [officialStreet]);

  // DISPARO AUTOMÁTICO: Buscar unidades al seleccionar número
  const numValue = watch('numero');
  useEffect(() => {
    if (numValue && officialStreet) {
      handleCatastroSearch();
    }
  }, [numValue]);

  const normalize = (str: string) => {
    if (!str) return "";
    return str.toUpperCase().replace(/[ÁÀÄ]/g, "A").replace(/[ÉÈË]/g, "E").replace(/[ÍÌÏ]/g, "I").replace(/[ÓÒÖ]/g, "O").replace(/[ÚÙÜ]/g, "U").replace(/Ç/g, "C").trim();
  };

  const handleCatastroSearch = async () => {
    const calle = watch('calle');
    const numero = watch('numero');
    const ciudad = watch('ciudad');
    const provincia = watch('provincia') || ciudad;

    if (calle && numero && ciudad) {
      setSearchingCatastro(true);
      try {
        const units = await catastroService.getUnitsByAddress(calle, numero, ciudad, provincia, officialStreet?.sigla);
        setCatastroUnits(units);
        
        if (units.length > 0) {
          setShowCatastroRefinement(true);
          
          // Si solo hay una unidad (chalet/casa), la seleccionamos automáticamente
          if (units.length === 1) {
            handleSelectCatastroUnit(units[0].referencia);
          }
        }
      } catch (error) {
        console.error('Error catastro:', error);
        setNotification({ message: '❌ No se encontró la finca. Revisa la dirección.', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
      } finally {
        setSearchingCatastro(false);
      }
    }
  };

  const handleSelectCatastroUnit = async (ref: string) => {
    try {
      setSearchingCatastro(true);
      const ciudad = watch('ciudad');
      const provincia = watch('provincia') || ciudad;
      const data = await catastroService.getUnitDetails(ref, normalize(ciudad), normalize(provincia));
      const unit = catastroUnits.find(u => u.referencia === ref);

      if (data && unit) {
        setValue('referencia_catastral', data.referencia || '');
        setValue('ano_construccion', data.ano_construccion || 0);
        setValue('metros_construidos', data.metros_construidos || 0);
        setValue('metros_utiles', data.metros_utiles || 0);
        if (data.habitaciones) setValue('habitaciones_simples', data.habitaciones);
        if (data.banos) setValue('banos', data.banos);

        setValue('piso', unit.planta);
        setValue('puerta', unit.puerta);
        setValue('escalera', unit.escalera);

        if (data.superficie_grafica) {
          setValue('metros_parcela', data.superficie_grafica);
        }

        // Mapeo inteligente mejorado
        if (data.uso) {
          const uso = data.uso.toUpperCase();
          if (uso.includes('RESIDENCIAL')) {
            const esPiso = unit.planta || unit.puerta;
            setValue('tipo_inmueble', esPiso ? 'piso' : 'casa');
          } else if (uso.includes('OFICINA')) {
            setValue('tipo_inmueble', 'oficina');
          } else if (uso.includes('COMERCIAL') || uso.includes('LOCAL')) {
            setValue('tipo_inmueble', 'local');
          } else if (uso.includes('INDUSTRIAL') || uso.includes('ALMACEN')) {
            setValue('tipo_inmueble', 'nave');
          }
        }

        setShowCatastroRefinement(false);
      }
    } catch (error) {
      console.error('Error al importar unidad:', error);
      alert('Error al obtener detalles de la unidad del Catastro');
    } finally {
      setSearchingCatastro(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      setUploading(true);
      const newUrls = [];
      for (const file of Array.from(files)) {
        const url = await propertyService.uploadImage(file);
        newUrls.push(url);
      }
      setValue('imagenes', [...imagenes, ...newUrls]);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setSaving(true);
      // Transformación de datos antes de guardar
      const finalData = {
        ...data,
        exclusiva: data.exclusiva === 'true'
      };
      await onSave(finalData);
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Error al guardar la propiedad. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  // Estilos compartidos
  const inputStyle = (hasError?: any): React.CSSProperties => ({
    width: '100%', padding: '10px 14px', borderRadius: '12px',
    border: `1px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
    fontSize: '0.9rem', outline: 'none', background: hasError ? '#fef2f2' : 'white'
  });

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase'
  };

  const sectionStyle: React.CSSProperties = {
    background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '24px'
  };

  const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' };
  const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '95%', maxWidth: 1100, height: '90vh', background: 'white', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

        {/* HEADER */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #eee', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>CRM: Alta de Propiedad</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Completa todos los pasos para publicar en portales</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>

        {/* NOTIFICACIÓN FLOTANTE INTERNA */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)',
                background: notification.type === 'success' ? '#10b981' : '#ef4444',
                color: 'white', padding: '12px 24px', borderRadius: 16, fontWeight: 800,
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 2000,
                display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem'
              }}
            >
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TABS NAVIGATION */}
        <div style={{ display: 'flex', overflowX: 'auto', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { id: 'operacion', label: 'Propietario', icon: Users, error: errors.propietario_id || errors.titulo || errors.calle },
            { id: 'economico', label: 'Precios', icon: Euro, error: errors.precio },
            { id: 'tecnico', label: 'Superficies', icon: Maximize2, error: errors.metros_construidos || errors.banos },
            { id: 'equipamiento', label: 'Calidades', icon: Home },
            { id: 'legal', label: 'Estado', icon: ShieldCheck },
            { id: 'multimedia', label: 'Galería', icon: ImageIcon },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
              flex: 1, padding: '16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: activeTab === t.id ? '#2563eb' : '#64748b', fontWeight: activeTab === t.id ? 800 : 600, borderBottom: activeTab === t.id ? '3px solid #2563eb' : 'none',
              minWidth: 140, transition: '0.2s', position: 'relative'
            }}>
              <t.icon size={16} /> {t.label}
              {t.error && <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
            </button>
          ))}
        </div>

        {/* MAIN FORM */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <form id="main-crm-form" onSubmit={handleSubmit(onSubmit)}>

            {activeTab === 'operacion' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ ...sectionStyle, border: errors.propietario_id ? '2px solid #ef4444' : '2px solid #2563eb', background: errors.propietario_id ? '#fef2f2' : '#eff6ff' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: errors.propietario_id ? '#ef4444' : '#2563eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} /> ASIGNACIÓN DE PROPIETARIO (OBLIGATORIO)
                  </h4>
                  <div style={grid3}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Lead Vinculado</label>
                      <select id="propietario-select" style={inputStyle(errors.propietario_id)} {...register('propietario_id')}>
                        <option value="">-- Seleccionar Titular --</option>
                        {potentialOwners.map(lead => (
                          <option key={lead.id} value={lead.id}>
                            👤 {lead.nombre} {lead.apellidos} ({lead.telefono || 'Sin tel'})
                          </option>
                        ))}
                      </select>
                      {errors.propietario_id && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4, fontWeight: 700 }}>{errors.propietario_id.message}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                      <button type="button" style={{ width: '100%', height: 42, borderRadius: 12, border: '1px dashed #cbd5e1', background: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>
                        + CREAR NUEVO LEAD
                      </button>
                    </div>
                  </div>
                </div>

                <div style={grid4}>
                  <div><label style={labelStyle}>Operación</label>
                    <select id="tipo-operacion" style={inputStyle()} {...register('tipo_operacion')}>
                      <option value="venta">Venta</option><option value="alquiler">Alquiler</option>
                      <option value="venta_alquiler">Venta/Alq</option><option value="traspaso">Traspaso</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Estado</label>
                    <select id="estado-venta" style={inputStyle()} {...register('estado_venta')}>
                      <option value="disponible">Disponible</option><option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option><option value="alquilado">Alquilado</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Título Comercial</label>
                    <input id="property-title" style={inputStyle(errors.titulo)} {...register('titulo')} placeholder="Ej: Precioso ático con vistas al cauce" />
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b' }}>UBICACIÓN</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr auto 0.8fr 1.5fr 1.5fr', gap: 12, alignItems: 'end' }}>
                    <div style={{ position: 'relative' }}>
                      <label style={labelStyle}>Calle</label>
                      <input
                        id="property-street"
                        style={inputStyle(errors.calle)}
                        {...register('calle')}
                        onFocus={() => streetValue?.length > 2 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                        autoComplete="off"
                      />
                      <AnimatePresence>
                        {showSuggestions && streetSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{
                              position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                              borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100,
                              marginTop: 4, border: '1px solid #e2e8f0', overflow: 'hidden'
                            }}
                          >
                            {streetSuggestions.map(s => (
                              <div
                                key={s.key}
                                onClick={() => {
                                  setValue('calle', s.street);
                                  setValue('ciudad', s.city);
                                  setValue('provincia', s.state);
                                  setOfficialStreet({ sigla: s.sigla, nombre: s.street });
                                  setShowSuggestions(false);
                                }}
                                style={{
                                  padding: '12px 16px', fontSize: '0.85rem', cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontWeight: 600 }}>{s.label}</span>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>{s.city}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={handleCatastroSearch}
                      disabled={searchingCatastro}
                      style={{
                        padding: '10px 16px', background: '#2563eb', color: 'white',
                        borderRadius: 12, fontWeight: 800, fontSize: '0.7rem',
                        cursor: 'pointer', border: 'none', height: 42,
                        display: 'flex', alignItems: 'center', gap: 6,
                        opacity: searchingCatastro ? 0.7 : 1
                      }}
                    >
                      {searchingCatastro ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      CATASTRO
                    </button>
                    <div style={{ width: 100 }}>
                      <label style={labelStyle}>Núm.</label>
                      {catastroNumbers.length > 0 ? (
                        <select
                          id="property-number-select"
                          style={inputStyle(errors.numero)}
                          {...register('numero')}
                        >
                          <option value="">-</option>
                          {catastroNumbers.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      ) : (
                        <input
                          id="property-number-input"
                          style={inputStyle(errors.numero)}
                          {...register('numero')}
                          placeholder="Ej: 25"
                        />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Barrio</label>
                      <input id="property-barrio" style={inputStyle()} {...register('barrio')} placeholder="Opcional" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Ciudad</label>
                      <input id="property-city" style={inputStyle(errors.ciudad)} {...register('ciudad')} placeholder="Valencia" />
                    </div>
                  </div>

                  {showCatastroRefinement && catastroUnits.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      style={{
                        marginTop: 20, padding: 24, background: '#eff6ff', borderRadius: 20,
                        border: '2px solid #2563eb', overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(37,99,235,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Building size={20} color="#2563eb" />
                        <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Edificio detectado: Selecciona Planta y Puerta
                        </h5>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 16, alignItems: 'end' }}>
                        <div>
                          <label style={labelStyle}>Escalera</label>
                          <select
                            id="catastro-esc"
                            style={inputStyle()}
                            value={selEsc}
                            onChange={(e) => { setSelEsc(e.target.value); setSelPla(''); }}
                          >
                            <option value="">Todas</option>
                            {Array.from(new Set(catastroUnits.map(u => u.escalera))).filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Planta</label>
                          <select
                            id="catastro-pla"
                            style={inputStyle()}
                            value={selPla}
                            onChange={(e) => setSelPla(e.target.value)}
                          >
                            <option value="">Selecciona...</option>
                            {Array.from(new Set(catastroUnits.filter(u => !selEsc || u.escalera === selEsc).map(u => u.planta))).map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Puerta</label>
                          <select id="catastro_pue" style={inputStyle()}>
                            {catastroUnits
                              .filter(u => (!selEsc || u.escalera === selEsc) && (!selPla || u.planta === selPla))
                              .map(u => <option key={u.referencia} value={u.referencia}>{u.puerta}</option>)
                            }
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const ref = (document.getElementById('catastro_pue') as HTMLSelectElement).value;
                            handleSelectCatastroUnit(ref);
                          }}
                          disabled={searchingCatastro}
                          style={{
                            padding: '0 30px', background: '#2563eb', color: 'white',
                            borderRadius: 14, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                            border: 'none', height: 44, display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 4px 12px rgba(37,99,235,0.3)', transition: '0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          {searchingCatastro ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
                          VINCULAR DATOS
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'economico' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={grid3}>
                  <div><label style={labelStyle}>Precio Venta (€)</label><input id="property-price" style={inputStyle(errors.precio)} type="number" {...register('precio', { valueAsNumber: true })} /></div>
                  <div><label style={labelStyle}>Precio Alquiler</label><input id="property-rent" style={inputStyle()} type="number" {...register('precio_alquiler', { valueAsNumber: true })} /></div>
                  <div><label style={labelStyle}>Gastos Comunidad</label><input id="property-community" style={inputStyle()} type="number" {...register('gastos_comunidad', { valueAsNumber: true })} /></div>
                </div>

                <div style={{ ...sectionStyle, background: '#f0fdf4', border: '1px solid #bcf0da' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Euro size={16} /> HONORARIOS Y COMISIONES
                  </h4>
                  <div style={grid3}>
                    <div><label style={labelStyle}>Comisión (%)</label><input id="property-commission" style={inputStyle()} type="number" step="0.1" {...register('honorarios_porcentaje', { valueAsNumber: true })} /></div>
                    <div><label style={labelStyle}>Honorarios Fijos (€)</label><input id="property-fees" style={inputStyle()} type="number" {...register('honorarios_fijo', { valueAsNumber: true })} /></div>
                    <div><label style={labelStyle}>IBI Anual</label><input id="property-ibi" style={inputStyle()} type="number" {...register('ibi', { valueAsNumber: true })} /></div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tecnico' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={grid4}>
                  <div><label style={labelStyle}>Metros Const.</label><input id="property-sqm-const" style={inputStyle(errors.metros_construidos)} type="number" {...register('metros_construidos', { valueAsNumber: true })} /></div>
                  <div><label style={labelStyle}>Metros Útiles</label><input id="property-sqm-usable" style={inputStyle()} type="number" {...register('metros_utiles', { valueAsNumber: true })} /></div>
                  <div><label style={labelStyle}>Habitaciones</label><input id="property-rooms" style={inputStyle()} type="number" {...register('habitaciones_dobles', { valueAsNumber: true })} /></div>
                  <div><label style={labelStyle}>Baños</label><input id="property-bathrooms" style={inputStyle(errors.banos)} type="number" {...register('banos', { valueAsNumber: true })} /></div>
                </div>
                <div style={grid4}>
                  <div><label style={labelStyle}>Orientación</label>
                    <select id="property-orientation" style={inputStyle()} {...register('orientacion')}>
                      <option value="">No definida</option>
                      {['Norte', 'Sur', 'Este', 'Oeste', 'Noreste', 'Sureste', 'Noroeste', 'Suroeste'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Año Const.</label><input id="property-year" style={inputStyle()} type="number" {...register('ano_construccion', { valueAsNumber: true })} /></div>
                  <div><label style={labelStyle}>Planta / Altura</label><input id="property-floor" style={inputStyle()} {...register('piso')} placeholder="Ej: 4ª Exterior" /></div>
                  <div><label style={labelStyle}>Metros Parcela</label><input id="property-plot" style={inputStyle()} type="number" {...register('metros_parcela', { valueAsNumber: true })} /></div>
                </div>
              </motion.div>
            )}

            {activeTab === 'equipamiento' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { id: 'ascensor', label: 'ASCENSOR', icon: <Building2 size={16} /> },
                  { id: 'aire_acondicionado', label: 'AIRE ACOND.', icon: <Wind size={16} /> },
                  { id: 'piscina', label: 'PISCINA', icon: <Waves size={16} /> },
                  { id: 'jardin', label: 'JARDÍN', icon: <TreePine size={16} /> },
                  { id: 'terraza', label: 'TERRAZA', icon: <Maximize2 size={16} /> },
                  { id: 'balcon', label: 'BALCÓN', icon: <Layout size={16} /> },
                  { id: 'armarios_empotrados', label: 'ARMARIOS EMP.', icon: <Archive size={16} /> },
                  { id: 'acceso_adaptado', label: 'ACCESO ADAPT.', icon: <Accessibility size={16} /> },
                ].map((item) => (
                  <label key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: '#f8fafc', borderRadius: 16, cursor: 'pointer',
                    border: '1px solid #e2e8f0', transition: '0.2s'
                  }}>
                    <input type="checkbox" {...register(item.id as any)} style={{ width: 18, height: 18 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#64748b' }}>{item.icon}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{item.label}</span>
                    </div>
                  </label>
                ))}
              </motion.div>
            )}

            {activeTab === 'legal' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={grid3}>
                  <div>
                    <label style={labelStyle}>Letra Consumo</label>
                    <select id="property-energy-cons" style={inputStyle()} {...register('consumo_energetico_letra')}>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'EXENTO', 'TRAMITE'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Letra Emisiones</label>
                    <select id="property-energy-emissions" style={inputStyle()} {...register('emisiones_letra')}>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'EXENTO', 'TRAMITE'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Estado Exclusiva</label>
                    <select id="property-exclusive" style={inputStyle()} {...register('exclusiva')}>
                      <option value="false">Sin Exclusiva</option>
                      <option value="true">En Exclusiva</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'multimedia' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #cbd5e1', padding: 60, borderRadius: 24, textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: '0.3s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}>
                  <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileChange} />
                  {uploading ? <Loader2 className="animate-spin" size={40} color="#2563eb" /> : <ImageIcon size={40} color="#64748b" />}
                  <h3 style={{ margin: '16px 0 4px 0', fontSize: '1rem', fontWeight: 800 }}>{uploading ? 'SUBIENDO IMÁGENES...' : 'ARRASTRA O HAZ CLIC'}</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Máximo 20 fotos (JPG, PNG)</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginTop: 32 }}>
                  {imagenes.map((url, i) => (
                    <motion.div layout key={url} style={{ aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setValue('imagenes', imagenes.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </form>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {Object.keys(errors).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.8rem', fontWeight: 700 }}>
                <AlertCircle size={16} /> HAY ERRORES EN EL FORMULARIO
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}>Cancelar</button>
            <button type="submit" form="main-crm-form" disabled={saving} style={{ padding: '12px 40px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'GUARDANDO...' : 'PUBLICAR PROPIEDAD'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyFormModal;
