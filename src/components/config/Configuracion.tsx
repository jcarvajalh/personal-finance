import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toast, useToast } from '../ui/Toast';
import type { UserConfig } from '../../types';

interface ConfiguracionProps {
  userId: string;
  userEmail: string;
}

export default function Configuracion({ userId, userEmail }: ConfiguracionProps) {
  const [config, setConfig] = useState<Partial<UserConfig>>({
    porcentaje_default: 28,
    tipo_cotizacion_default: 'obligatorio',
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
    // Get user metadata
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user?.user_metadata?.name) {
      setName(userData.user.user_metadata.name);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('user_config').select('id').eq('user_id', userId).single();
      if (existing) {
        await supabase.from('user_config').update({
          porcentaje_default: config.porcentaje_default,
          tipo_cotizacion_default: config.tipo_cotizacion_default,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
      } else {
        await supabase.from('user_config').insert({
          user_id: userId,
          porcentaje_default: config.porcentaje_default,
          tipo_cotizacion_default: config.tipo_cotizacion_default,
        });
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
        {/* Profile section */}
        <div className="card">
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '16px', color: 'var(--color-text)' }}>
            Perfil
          </div>
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

        {/* SS defaults section */}
        <div className="card">
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--color-text)' }}>
            Valores predeterminados — Seguridad Social
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Estos valores se precargan automáticamente al registrar un nuevo ingreso.
          </div>

          <div className="field">
            <label>Porcentaje de cotización predeterminado</label>
            <select
              value={config.porcentaje_default}
              onChange={e => setConfig(c => ({ ...c, porcentaje_default: Number(e.target.value) }))}
            >
              <option value={28}>28% (estándar)</option>
              <option value={30}>30%</option>
            </select>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              IBC = Monto × porcentaje seleccionado
            </div>
          </div>

          <div className="field" style={{ marginBottom: '16px' }}>
            <label>Tipo de cotización predeterminado</label>
            <select
              value={config.tipo_cotizacion_default}
              onChange={e => setConfig(c => ({ ...c, tipo_cotizacion_default: e.target.value as any }))}
            >
              <option value="obligatorio">Obligatorio — Solo Salud + Pensión</option>
              <option value="completo">Completo — Salud + Pensión + ARL + Caja</option>
            </select>
          </div>

          {/* SS rates reference */}
          <div style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Tarifas de cotización (referencia)
            </div>
            {[
              { label: 'Pensión', rate: '16% del IBC' },
              { label: 'Salud', rate: '12.5% del IBC' },
              { label: 'ARL (riesgo I)', rate: '0.522% del IBC' },
              { label: 'Caja compensación', rate: '4% del IBC' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace' }}>{r.rate}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-sm" onClick={saveConfig} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </div>

        {/* Info */}
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--color-text)' }}>Nota:</strong> Arka Finance calcula la Seguridad Social siguiendo las reglas para independientes colombianos: el IBC se calcula como un porcentaje del ingreso bruto (mínimo 40% según normativa). Cada ingreso puede configurarse individualmente.
        </div>
      </div>
    </div>
  );
}
