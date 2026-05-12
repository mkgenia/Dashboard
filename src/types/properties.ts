export interface Property {
  id: string;
  created_at: string;
  referencia: string;
  auto_ref?: string;
  titulo: string;
  descripcion: string;
  tipo_inmueble: string;
  tipo_operacion: 'venta' | 'alquiler' | 'venta_alquiler' | 'traspaso';
  estado_venta: 'disponible' | 'reservado' | 'vendido' | 'alquilado' | 'baja';
  
  // Ubicación Inmovilla Style
  tipo_via?: string;
  calle: string;
  numero?: string;
  codigo_postal: string;
  edificio?: string;
  bloque?: string;
  escalera?: string;
  altura?: string;
  piso?: string;
  puerta?: string;
  barrio: string;
  zona?: string;
  zona_auxiliar?: string;
  ciudad: string;
  provincia: string;
  distancia_playa?: number;
  referencia_catastral?: string;

  // Datos Económicos Venta
  precio: number;
  precio_propietario?: number;
  precio_anterior?: number;
  precio_traspaso?: number;
  valor_referencia?: number;
  honorarios_fijo?: number;
  honorarios_porcentaje?: number;
  iva_honorarios?: number;
  ibi?: number;
  gastos_comunidad?: number;
  periodicidad_comunidad?: string;

  // Datos Económicos Alquiler
  precio_alquiler?: number;
  fianza_meses?: number;
  importe_fianza?: number;
  importe_aval?: number;
  admite_animales?: boolean;
  admite_ninos?: boolean;
  estudiantes?: boolean;
  opcion_compra?: boolean;
  defensa_juridica?: boolean;
  seguro_alquiler?: boolean;

  // Ficha Técnica (Superficies)
  metros_utiles: number;
  metros_construidos: number;
  metros_parcela?: number;
  metros_cocina?: number;
  metros_salon?: number;
  metros_terraza?: number;
  metros_patio?: number;
  metros_sotano?: number;
  metros_fachada?: number;

  // Características
  habitaciones_dobles: number;
  habitaciones_simples: number;
  banos: number;
  aseos?: number;
  ano_construccion?: number;
  estado_conservacion?: string;
  orientacion?: string;
  vistas?: string;
  tipo_exterior?: string;
  suelos?: string;
  carpinteria_exterior?: string;
  carpinteria_interior?: string;
  ascensor: boolean;
  aire_acondicionado: boolean;
  calefaccion?: string;
  parking_plazas?: number;
  parking_precio?: number;
  trastero?: boolean;
  piscina?: boolean;
  jardin?: boolean;
  armarios_empotrados?: boolean;
  balcon?: boolean;
  terraza?: boolean;
  acceso_adaptado?: boolean;

  // Legal y Exclusiva
  cedula_habitabilidad?: boolean;
  ite_realizada?: boolean;
  certificado_energetico?: string;
  consumo_energetico_letra?: string;
  emisiones_letra?: string;
  exclusiva?: boolean;
  exclusiva_desde?: string;
  exclusiva_hasta?: string;

  // Gestión Interna
  llavero?: string;
  aviso_oficina?: string;
  aviso_compartida?: string;
  tiene_cartel?: boolean;
  tiene_contrato?: boolean;
  en_escaparate?: boolean;
  entidad_bancaria?: string;
  imagenes: string[];
  video_url?: string;
  tour_virtual_url?: string;
  captacion_id?: number;
  propietario_id?: string;
  agente_id?: string;
}
