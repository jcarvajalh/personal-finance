import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toast, useToast } from '../ui/Toast';
import { formatCOP, SMMLV_2025 } from '../../lib/utils';
import type { UserConfig } from '../../types';

interface ConfiguracionProps {
  userId: string;
  userEmail: string;
}

export default function Configuracion({ userId, userEmail }: ConfiguracionProps) {
  const [config, setConfig] = useState<Partial<UserConfig>>({
    smmlv: SMMLV_2025,
    tipo_cotizacion_default: 'obligatorio',
    presuncion_costos_default: 0,
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [userId]);

  async function loadConfig() {
    const { data } = await supabase.from('user_config').select('*').eq('user_id', userId).single();
    if (data) setConfig(data);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user?.user_metadata?.name) setName(userData.user.user_metadata.name);
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('user_config').select('id').eq('user_id', userId).single();
      const payload = {
        smmlv: config.smmlv,
        tipo_cotizacion_default: config.tipo_cotizacion_default,
        presuncion_costos_default: config.presuncion_costos_default || 0,
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        await supabase.from('user_config').update(payload).eq('user_id', userId);
      } else {
        await supabase.from('user_config').insert({ user_id: userId, ...payload });
      }
      showToast('Configuración guardada');
    } catch (e) {
      showToast('Error al guardar', 'error');
    }
    setSaving(false);
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const updates: any = {};
      if (email !== userEmail) updates.email = email;
      if (name) updates.data = { name };
      await supabase.auth.updateUser(updates);
      showToast('Perfil actualizado');
    } catch (e) {
      showToast('Error al actualizar perfil', 'error');
    }
    setSavingProfile(false);
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div className="page-title">Configuración</div>
      </div>

      <div style={{ display: 'grid', gap: '20px', maxWidth: '560px' }}>

        {/* Perfil */}
        <div className="card">
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>Perfil</div>
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="field" style={{ marginBottom: '16px' }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Guardando...' : 'Actualizar perfil'}
          </button>
        </div>

        {/* SMMLV */}
        <div className="card">
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
            Salario Mínimo Mensual Legal Vigente (SMMLV)
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Actualiza este valor cada enero cuando el gobierno publique el nuevo salario mínimo.
            Se usa para calcular si hay obligación de cotizar y el IBC mínimo.
          </div>
          <div className="field" style={{ marginBottom: '8px' }}>
            <label>SMMLV vigente (COP)</label>
            <input
              type="number"
              value={config.smmlv}
              onChange={e => setConfig(c => ({ ...c, smmlv: Number(e.target.value) }))}
              min="0"
              step="1000"
            />
          </div>
          <div style={{
            fontSize: '12px', color: 'var(--color-text-muted)',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '6px', padding: '8px 12px', marginBottom: '16px',
          }}>
            Valor actual configurado: <strong style={{ color: 'var(--color-text)', fontFamily: 'DM Mono, monospace' }}>
              {formatCOP(config.smmlv || SMMLV_2025)}
            </strong>
          </div>
        </div>

        {/* SS Defaults */}
        <div className="card">
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
            Valores predeterminados — Seguridad Social
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Se precargan automáticamente al registrar un nuevo ingreso.
          </div>

          <div className="field">
            <label>Tipo de cotización predeterminado</label>
            <select
              value={config.tipo_cotizacion_default}
              onChange={e => setConfig(c => ({ ...c, tipo_cotizacion_default: e.target.value as any }))}
            >
              <option value="obligatorio">Obligatorio — Solo Salud + Pensión</option>
              <option value="completo">Completo — Salud + Pensión + ARL + Caja</option>
            </select>
          </div>

          <div className="field" style={{ marginBottom: '16px' }}>
            <label>Presunción de costos predeterminada (%)</label>
            <input
              type="number"
              value={config.presuncion_costos_default || ''}
              onChange={e => setConfig(c => ({ ...c, presuncion_costos_default: Number(e.target.value) }))}
              placeholder="Ej: 61 (deja en 0 si no aplica)"
              min="0" max="100"
            />
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Para actividades independientes con costos fijos predecibles. Ej: desarrollo de software ~61%.
            </div>
          </div>

          {/* Tarifas referencia */}
          <div style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Tarifas de cotización (referencia)
            </div>
            {[
              { label: 'IBC', rate: 'Ingreso neto × 40% (mín. 1 SMMLV)' },
              { label: 'Pensión', rate: 'IBC × 16%' },
              { label: 'Salud', rate: 'IBC × 12.5%' },
              { label: 'ARL (riesgo I)', rate: 'IBC × 0.522%' },
              { label: 'Caja compensación', rate: 'IBC × 4%' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>{r.rate}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-sm" onClick={saveConfig} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>

        {/* Nota legal */}
        <div style={{
          fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6',
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '12px 14px',
        }}>
          <strong style={{ color: 'var(--color-text)' }}>⚠️ Nota:</strong> Los cálculos de Arka Finance son una estimación
          basada en la normativa colombiana para trabajadores independientes con empleo formal simultáneo.
          El IBC se calcula sobre el ingreso neto (descontando costos), con un mínimo de 1 SMMLV.
          Si el ingreso neto es inferior a 1 SMMLV, no existe obligación de cotizar ese mes.
          Siempre valida con un contador especializado en UGPP.
        </div>
      </div>
    </div>
  );
}
