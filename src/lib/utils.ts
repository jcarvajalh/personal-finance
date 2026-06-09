import type { SSCalculo } from '../types';

export function calcularSS(
  monto: number,
  tipoCotizacion: 'obligatorio' | 'completo',
  porcentaje: number = 28
): SSCalculo {
  const ibc = monto * (porcentaje / 100);
  const pension = ibc * 0.16;
  const salud = ibc * 0.125;
  const arl = tipoCotizacion === 'completo' ? ibc * 0.00522 : 0;
  const caja = tipoCotizacion === 'completo' ? ibc * 0.04 : 0;
  const total = pension + salud + arl + caja;
  const neto = monto - total;

  return {
    ibc: round2(ibc),
    pension: round2(pension),
    salud: round2(salud),
    arl: round2(arl),
    caja: round2(caja),
    total: round2(total),
    neto: round2(neto),
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
