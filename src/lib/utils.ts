import type { SSCalculo } from '../types';

export const SMMLV_2025 = 1423500; // Actualizar cada enero

export function calcularSS(params: {
  ingresoBruto: number;
  costosReales?: number;
  presuncionCostos?: number; // porcentaje, ej: 61 para 61%
  tipoCotizacion: 'obligatorio' | 'completo';
  smmlv: number;
}): SSCalculo {
  const { ingresoBruto, costosReales, presuncionCostos, tipoCotizacion, smmlv } = params;

  // 1. Calcular ingreso neto
  let costosAplicados = 0;
  if (costosReales && costosReales > 0) {
    costosAplicados = costosReales;
  } else if (presuncionCostos && presuncionCostos > 0) {
    costosAplicados = ingresoBruto * (presuncionCostos / 100);
  }
  const ingresoNeto = ingresoBruto - costosAplicados;

  // 2. Verificar obligación de cotizar
  if (ingresoNeto < smmlv) {
    return {
      ingresoBruto,
      costosAplicados: round2(costosAplicados),
      ingresoNeto: round2(ingresoNeto),
      ibcInicial: 0,
      ibcFinal: 0,
      pension: 0,
      salud: 0,
      arl: 0,
      caja: 0,
      total: 0,
      netoEstimado: round2(ingresoNeto),
      obligaCotizar: false,
    };
  }

  // 3. Calcular IBC
  const ibcInicial = ingresoNeto * 0.40;
  const ibcFinal = ibcInicial < smmlv ? smmlv : ibcInicial;

  // 4. Calcular aportes
  const pension = ibcFinal * 0.16;
  const salud = ibcFinal * 0.125;
  const arl = tipoCotizacion === 'completo' ? ibcFinal * 0.00522 : 0;
  const caja = tipoCotizacion === 'completo' ? ibcFinal * 0.04 : 0;
  const total = pension + salud + arl + caja;
  const netoEstimado = ingresoBruto - costosAplicados - total;

  return {
    ingresoBruto,
    costosAplicados: round2(costosAplicados),
    ingresoNeto: round2(ingresoNeto),
    ibcInicial: round2(ibcInicial),
    ibcFinal: round2(ibcFinal),
    pension: round2(pension),
    salud: round2(salud),
    arl: round2(arl),
    caja: round2(caja),
    total: round2(total),
    netoEstimado: round2(netoEstimado),
    obligaCotizar: true,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function getLast6MonthsLabels(): string[] {
  const labels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }));
  }
  return labels;
}

export const CATEGORIAS_EGRESO = [
  'Suscripción de software',
  'Equipos y hardware',
  'Internet y conectividad',
  'Publicidad y marketing',
  'Honorarios externos',
  'Otros',
];
