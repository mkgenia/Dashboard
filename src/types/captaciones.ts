export interface HistorialCambio {
  id: string;
  captacion_id: number;
  fecha: string;
  campo: string;
  valor_anterior: string;
  valor_nuevo: string;
}

export interface Captacion {
  id: number;
  created_at: string;
  nombre: string;
  telefono: string;
  precio: number;
  precio_m2: number;
  barrio: string;
  calle: string;
  metros: number;
  habitaciones: number;
  banos: number;
  planta: string;
  tiene_ascensor: boolean;
  estado: string;
  descripcion: string;
  url: string;
  raw_data: any;
  imagen_url?: string;
  imagenes?: string[];
}
