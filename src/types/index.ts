export interface Ingreso {
  id: string;
  user_id: string;
  monto: number;
  descripcion: string;
  fecha: string;
  remitente: string;
  tipo_cotizacion: 'obligatorio' | 'completo';
  costos_reales?: number;
  presuncion_costos?: number;
  ingreso_neto: number;
  ibc_inicial: number;
  ibc_final: number;
  ss_pension: number;
  ss_salud: number;
  ss_arl?: number;
  ss_caja?: number;
  ss_total: number;
  neto_estimado: number;
  obliga_cotizar: boolean;
  smmlv_usado: number;
  archivos?: string[];
  created_at: string;
}

export interface Egreso {
  id: string;
  user_id: string;
  monto: number;
  descripcion: string;
  fecha: string;
  proveedor: string;
  categoria: string;
  factura_url?: string;
  notas?: string;
  created_at: string;
}

export interface UserConfig {
  id: string;
  user_id: string;
  smmlv: number;
  tipo_cotizacion_default: 'obligatorio' | 'completo';
  presuncion_costos_default: number;
  updated_at: string;
}

export interface SSCalculo {
  ingresoBruto: number;
  costosAplicados: number;
  ingresoNeto: number;
  ibcInicial: number;
  ibcFinal: number;
  pension: number;
  salud: number;
  arl: number;
  caja: number;
  total: number;
  netoEstimado: number;
  obligaCotizar: boolean;
}
