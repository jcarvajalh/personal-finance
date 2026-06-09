export interface Ingreso {
  id: string;
  user_id: string;
  monto: number;
  descripcion: string;
  fecha: string;
  remitente: string;
  tipo_cotizacion: 'obligatorio' | 'completo';
  porcentaje_cotizacion: number;
  ibc: number;
  ss_pension: number;
  ss_salud: number;
  ss_arl?: number;
  ss_caja?: number;
  ss_total: number;
  neto_estimado: number;
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
  porcentaje_default: number;
  tipo_cotizacion_default: 'obligatorio' | 'completo';
  updated_at: string;
}

export interface SSCalculo {
  ibc: number;
  pension: number;
  salud: number;
  arl: number;
  caja: number;
  total: number;
  neto: number;
}

export interface DashboardStats {
  totalIngresos: number;
  totalEgresos: number;
  totalSS: number;
  utilidad: number;
  ibcTotal: number;
  ssPension: number;
  ssSalud: number;
  ssArl: number;
  ssCaja: number;
}
