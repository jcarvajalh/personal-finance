import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { formatCOP, getLast6MonthsLabels } from '../../lib/utils';
import type { Ingreso, Egreso } from '../../types';

interface DashboardProps {
  userId: string;
}

const COLORS = ['#3b82f6', '#a371f7', '#3fb950', '#d29922'];

function StatCard({ label, value, color = '' }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color}`}>{value}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '13px',
      }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '2px 0' }}>
            {p.name}: {formatCOP(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ userId }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [monthIngresos, setMonthIngresos] = useState<Ingreso[]>([]);
  const [monthEgresos, setMonthEgresos] = useState<Egreso[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  async function loadData() {
    setLoading(true);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [{ data: ingresos }, { data: egresos }] = await Promise.all([
      supabase.from('ingresos').select('*').eq('user_id', userId).gte('fecha', from).lte('fecha', to),
      supabase.from('egresos').select('*').eq('user_id', userId).gte('fecha', from).lte('fecha', to),
    ]);

    setMonthIngresos(ingresos || []);
    setMonthEgresos(egresos || []);

    // Load 6 months data
    const labels = getLast6MonthsLabels();
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const mFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const mTo = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const [{ data: mIng }, { data: mEgr }] = await Promise.all([
        supabase.from('ingresos').select('monto,ss_total').eq('user_id', userId).gte('fecha', mFrom).lte('fecha', mTo),
        supabase.from('egresos').select('monto').eq('user_id', userId).gte('fecha', mFrom).lte('fecha', mTo),
      ]);
      monthsData.push({
        mes: labels[5 - i],
        Ingresos: (mIng || []).reduce((s: number, r: any) => s + r.monto, 0),
        Egresos: (mEgr || []).reduce((s: number, r: any) => s + r.monto, 0),
      });
    }
    setChartData(monthsData);
    setLoading(false);
  }

  const totalIngresos = monthIngresos.reduce((s, r) => s + r.monto, 0);
  const totalEgresos = monthEgresos.reduce((s, r) => s + r.monto, 0);
  const totalSS = monthIngresos.reduce((s, r) => s + (r.ss_total || 0), 0);
  const utilidad = totalIngresos - totalEgresos - totalSS;

  const ibcTotal = monthIngresos.reduce((s, r) => s + (r.ibc || 0), 0);
  const ssPension = monthIngresos.reduce((s, r) => s + (r.ss_pension || 0), 0);
  const ssSalud = monthIngresos.reduce((s, r) => s + (r.ss_salud || 0), 0);
  const ssArl = monthIngresos.reduce((s, r) => s + (r.ss_arl || 0), 0);
  const ssCaja = monthIngresos.reduce((s, r) => s + (r.ss_caja || 0), 0);

  const donutData = [
    { name: 'SS Total', value: totalSS },
    { name: 'Neto', value: Math.max(0, totalIngresos - totalSS) },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-muted)' }}>
        Cargando...
      </div>
    );
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px', textTransform: 'capitalize' }}>
            {monthLabel}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Ingresos del mes" value={formatCOP(totalIngresos)} color="green" />
        <StatCard label="Egresos del mes" value={formatCOP(totalEgresos)} color="red" />
        <StatCard label="SS a pagar" value={formatCOP(totalSS)} color="blue" />
        <StatCard label="Utilidad estimada" value={formatCOP(utilidad)} color={utilidad >= 0 ? 'green' : 'red'} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Bar chart */}
        <div className="card">
          <div style={{ fontWeight: '600', marginBottom: '16px', fontSize: '13px' }}>Ingresos vs Egresos — últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Ingresos" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Egresos" fill="#f85149" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="card">
          <div style={{ fontWeight: '600', marginBottom: '16px', fontSize: '13px' }}>Evolución de ingresos</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Ingresos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Donut chart */}
        <div className="card">
          <div style={{ fontWeight: '600', marginBottom: '16px', fontSize: '13px' }}>Distribución ingreso mensual</div>
          {totalIngresos > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                    {donutData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {donutData.map((d: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i], flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{d.name}</div>
                      <div style={{ fontWeight: '600', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>{formatCOP(d.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
              Sin ingresos este mes
            </div>
          )}
        </div>

        {/* SS Summary table */}
        <div className="card">
          <div style={{ fontWeight: '600', marginBottom: '16px', fontSize: '13px' }}>Resumen SS del mes</div>
          <table>
            <tbody>
              {[
                { label: 'IBC total acumulado', value: ibcTotal },
                { label: 'Pensión (16%)', value: ssPension },
                { label: 'Salud (12.5%)', value: ssSalud },
                ...(ssArl > 0 ? [{ label: 'ARL (0.522%)', value: ssArl }] : []),
                ...(ssCaja > 0 ? [{ label: 'Caja compensación (4%)', value: ssCaja }] : []),
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{row.label}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
                    {formatCOP(row.value)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td style={{ fontWeight: '600' }}>Total SS a pagar</td>
                <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'DM Mono, monospace', color: 'var(--color-accent)' }}>
                  {formatCOP(totalSS)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
