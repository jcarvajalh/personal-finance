import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Paperclip, X, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calcularSS, formatCOP, formatDate, getCurrentMonthRange, SMMLV_2025 } from '../../lib/utils';
import { Toast, useToast } from '../ui/Toast';
import type { Ingreso, UserConfig } from '../../types';

interface IngresosProps {
  userId: string;
}

const DEFAULT_FORM = {
  monto: '',
  descripcion: '',
  fecha: new Date().toISOString().split('T')[0],
  remitente: '',
  tipo_cotizacion: 'obligatorio' as 'obligatorio' | 'completo',
  costos_reales: '',
  presuncion_costos: '',
  archivos: [] as File[],
};

export default function Ingresos({ userId }: IngresosProps) {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [dateFrom, setDateFrom] = useState(getCurrentMonthRange().from);
  const [dateTo, setDateTo] = useState(getCurrentMonthRange().to);
  const [smmlv, setSmmlv] = useState(SMMLV_2025);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadConfig();
    fetchIngresos();
  }, [userId]);

  async function loadConfig() {
    const { data } = await supabase.from('user_config').select('*').eq('user_id', userId).single();
    if (data) {
      if (data.smmlv) setSmmlv(data.smmlv);
      if (data.tipo_cotizacion_default) setForm(f => ({ ...f, tipo_cotizacion: data.tipo_cotizacion_default }));
      if (data.presuncion_costos_default) setForm(f => ({ ...f, presuncion_costos: String(data.presuncion_costos_default) }));
    }
  }

  async function fetchIngresos() {
    setLoading(true);
    const { data } = await supabase
      .from('ingresos')
      .select('*')
      .eq('user_id', userId)
      .gte('fecha', dateFrom)
      .lte('fecha', dateTo)
      .order('fecha', { ascending: false });
    setIngresos(data || []);
    setLoading(false);
  }

  async function openAdd() {
    const { data } = await supabase.from('user_config').select('*').eq('user_id', userId).single();
    setForm({
      ...DEFAULT_FORM,
      fecha: new Date().toISOString().split('T')[0],
      tipo_cotizacion: data?.tipo_cotizacion_default || 'obligatorio',
      presuncion_costos: data?.presuncion_costos_default ? String(data.presuncion_costos_default) : '',
      costos_reales: '',
      archivos: [],
    });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(ing: Ingreso) {
    setForm({
      monto: String(ing.monto),
      descripcion: ing.descripcion,
      fecha: ing.fecha,
      remitente: ing.remitente,
      tipo_cotizacion: ing.tipo_cotizacion,
      costos_reales: ing.costos_reales ? String(ing.costos_reales) : '',
      presuncion_costos: ing.presuncion_costos ? String(ing.presuncion_costos) : '',
      archivos: [],
    });
    setEditId(ing.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.monto || !form.descripcion || !form.fecha || !form.remitente) {
      showToast('Completa todos los campos requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      const ingresoBruto = parseFloat(form.monto);
      const costosReales = form.costos_reales ? parseFloat(form.costos_reales) : undefined;
      const presuncionCostos = form.presuncion_costos ? parseFloat(form.presuncion_costos) : undefined;

      const ss = calcularSS({
        ingresoBruto,
        costosReales,
        presuncionCostos,
        tipoCotizacion: form.tipo_cotizacion,
        smmlv,
      });

      // Upload files
      const archivosUrls: string[] = [];
      for (const file of form.archivos) {
        const ext = file.name.split('.').pop();
        const path = `${userId}/ingresos/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const { error } = await supabase.storage.from('adjuntos').upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from('adjuntos').getPublicUrl(path);
          archivosUrls.push(urlData.publicUrl);
        }
      }

      const payload = {
        user_id: userId,
        monto: ingresoBruto,
        descripcion: form.descripcion,
        fecha: form.fecha,
        remitente: form.remitente,
        tipo_cotizacion: form.tipo_cotizacion,
        costos_reales: costosReales || null,
        presuncion_costos: presuncionCostos || null,
        ingreso_neto: ss.ingresoNeto,
        ibc_inicial: ss.ibcInicial,
        ibc_final: ss.ibcFinal,
        ss_pension: ss.pension,
        ss_salud: ss.salud,
        ss_arl: ss.arl,
        ss_caja: ss.caja,
        ss_total: ss.total,
        neto_estimado: ss.netoEstimado,
        obliga_cotizar: ss.obligaCotizar,
        smmlv_usado: smmlv,
        ...(archivosUrls.length > 0 && { archivos: archivosUrls }),
      };

      if (editId) {
        await supabase.from('ingresos').update(payload).eq('id', editId);
        showToast('Ingreso actualizado');
      } else {
        await supabase.from('ingresos').insert(payload);
        showToast('Ingreso guardado');
      }
      setShowModal(false);
      fetchIngresos();
    } catch (e) {
      showToast('Error al guardar', 'error');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('ingresos').delete().eq('id', id);
    setDeleteConfirm(null);
    showToast('Ingreso eliminado');
    fetchIngresos();
  }

  // Preview cálculo en tiempo real
  const ss = form.monto && parseFloat(form.monto) > 0 ? calcularSS({
    ingresoBruto: parseFloat(form.monto),
    costosReales: form.costos_reales ? parseFloat(form.costos_reales) : undefined,
    presuncionCostos: form.presuncion_costos ? parseFloat(form.presuncion_costos) : undefined,
    tipoCotizacion: form.tipo_cotizacion,
    smmlv,
  }) : null;

  const totalMonto = ingresos.reduce((s, r) => s + r.monto, 0);
  const totalIBC = ingresos.reduce((s, r) => s + (r.ibc_final || 0), 0);
  const totalSS = ingresos.reduce((s, r) => s + (r.ss_total || 0), 0);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div className="page-title">Ingresos</div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Agregar ingreso
        </button>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Desde</div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '150px' }} />
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Hasta</div>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '150px' }} />
        <button className="btn btn-ghost btn-sm" onClick={fetchIngresos}>Consultar</button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Remitente</th>
              <th>Descripción</th>
              <th>Ingreso bruto</th>
              <th>Ingreso neto</th>
              <th>IBC final</th>
              <th>SS a pagar</th>
              <th>Tipo</th>
              <th>Archivos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>Cargando...</td></tr>
            ) : ingresos.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>
                Sin ingresos en este período
              </td></tr>
            ) : ingresos.map(ing => (
              <tr key={ing.id}>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(ing.fecha)}</td>
                <td>{ing.remitente}</td>
                <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.descripcion}</td>
                <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-green)', fontWeight: '600' }}>{formatCOP(ing.monto)}</td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>{formatCOP(ing.ingreso_neto || 0)}</td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                  {ing.obliga_cotizar === false ? (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>No aplica</span>
                  ) : formatCOP(ing.ibc_final || 0)}
                </td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                  {ing.obliga_cotizar === false ? (
                    <span className="badge" style={{ background: 'rgba(210,153,34,0.15)', color: 'var(--color-yellow)' }}>$0 — exento</span>
                  ) : (
                    <span style={{ color: 'var(--color-accent)' }}>{formatCOP(ing.ss_total || 0)}</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${ing.tipo_cotizacion === 'completo' ? 'badge-purple' : 'badge-blue'}`}>
                    {ing.tipo_cotizacion === 'completo' ? 'Completo' : 'Obligatorio'}
                  </span>
                </td>
                <td>
                  {ing.archivos && ing.archivos.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {ing.archivos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--color-accent)' }}>
                          <Paperclip size={14} />
                        </a>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ing)}><Pencil size={13} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(ing.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {ingresos.length > 0 && (
            <tfoot>
              <tr className="table-footer">
                <td colSpan={3}>Totales del período</td>
                <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-green)' }}>{formatCOP(totalMonto)}</td>
                <td></td>
                <td style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(totalIBC)}</td>
                <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-accent)' }}>{formatCOP(totalSS)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-panel" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <span style={{ fontWeight: '600', fontSize: '15px' }}>{editId ? 'Editar ingreso' : 'Nuevo ingreso'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                {/* Ingreso bruto */}
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Ingreso bruto (COP) *</label>
                  <input
                    type="number" value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    placeholder="3000000" min="0" step="1000" autoFocus
                  />
                </div>

                {/* Remitente y fecha */}
                <div className="field">
                  <label>Remitente *</label>
                  <input value={form.remitente} onChange={e => setForm(f => ({ ...f, remitente: e.target.value }))} placeholder="Empresa XYZ" />
                </div>
                <div className="field">
                  <label>Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>

                {/* Descripción */}
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Descripción *</label>
                  <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del servicio..." />
                </div>

                {/* Costos */}
                <div className="field">
                  <label>Costos reales del mes (COP)</label>
                  <input
                    type="number" value={form.costos_reales}
                    onChange={e => setForm(f => ({ ...f, costos_reales: e.target.value, presuncion_costos: e.target.value ? '' : f.presuncion_costos }))}
                    placeholder="0"
                    min="0"
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Si tienes costos soportados con factura
                  </div>
                </div>
                <div className="field">
                  <label>Presunción de costos (%)</label>
                  <input
                    type="number" value={form.presuncion_costos}
                    onChange={e => setForm(f => ({ ...f, presuncion_costos: e.target.value, costos_reales: e.target.value ? '' : f.costos_reales }))}
                    placeholder="Ej: 61"
                    min="0" max="100"
                    disabled={!!form.costos_reales}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Se ignora si hay costos reales
                  </div>
                </div>

                {/* Tipo cotización */}
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Tipo de cotización SS *</label>
                  <select value={form.tipo_cotizacion} onChange={e => setForm(f => ({ ...f, tipo_cotizacion: e.target.value as any }))}>
                    <option value="obligatorio">Obligatorio — Solo Salud + Pensión</option>
                    <option value="completo">Completo — Salud + Pensión + ARL + Caja de compensación</option>
                  </select>
                </div>
              </div>

              {/* SS Preview */}
              {ss && form.monto && (
                <div className="ss-preview">
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Cálculo Seguridad Social — SMMLV {formatCOP(smmlv)}
                  </div>

                  {/* Desglose de ingresos */}
                  <div className="ss-preview-row">
                    <span style={{ color: 'var(--color-text-muted)' }}>Ingreso bruto</span>
                    <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.ingresoBruto)}</span>
                  </div>
                  {ss.costosAplicados > 0 && (
                    <div className="ss-preview-row">
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        Costos {form.costos_reales ? 'reales' : `presuntos (${form.presuncion_costos}%)`}
                      </span>
                      <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-red)' }}>− {formatCOP(ss.costosAplicados)}</span>
                    </div>
                  )}
                  <div className="ss-preview-row" style={{ borderTop: '1px solid var(--color-border)', marginTop: '6px', paddingTop: '6px' }}>
                    <span style={{ fontWeight: '500' }}>Ingreso neto</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '600' }}>{formatCOP(ss.ingresoNeto)}</span>
                  </div>

                  {/* Alerta si no obliga cotizar */}
                  {!ss.obligaCotizar ? (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.3)',
                      borderRadius: '6px', padding: '10px 12px', marginTop: '10px',
                    }}>
                      <AlertCircle size={15} color="var(--color-yellow)" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div style={{ fontSize: '12px', color: 'var(--color-yellow)', lineHeight: '1.5' }}>
                        El ingreso neto ({formatCOP(ss.ingresoNeto)}) es inferior a 1 SMMLV ({formatCOP(smmlv)}).
                        <strong> No existe obligación de cotizar este mes.</strong> SS = $0
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginTop: '10px' }}>
                        <div className="ss-preview-row">
                          <span style={{ color: 'var(--color-text-muted)' }}>IBC inicial (neto × 40%)</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.ibcInicial)}</span>
                        </div>
                        {ss.ibcFinal !== ss.ibcInicial && (
                          <div className="ss-preview-row">
                            <span style={{ color: 'var(--color-yellow)', fontSize: '12px' }}>↑ Ajuste a mínimo (1 SMMLV)</span>
                            <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-yellow)' }}>{formatCOP(ss.ibcFinal)}</span>
                          </div>
                        )}
                        <div className="ss-preview-row" style={{ fontWeight: '600' }}>
                          <span>IBC final</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.ibcFinal)}</span>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px' }}>
                        <div className="ss-preview-row">
                          <span style={{ color: 'var(--color-text-muted)' }}>Pensión (16%)</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.pension)}</span>
                        </div>
                        <div className="ss-preview-row">
                          <span style={{ color: 'var(--color-text-muted)' }}>Salud (12.5%)</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.salud)}</span>
                        </div>
                        {form.tipo_cotizacion === 'completo' && (
                          <>
                            <div className="ss-preview-row">
                              <span style={{ color: 'var(--color-text-muted)' }}>ARL (0.522%)</span>
                              <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.arl)}</span>
                            </div>
                            <div className="ss-preview-row">
                              <span style={{ color: 'var(--color-text-muted)' }}>Caja compensación (4%)</span>
                              <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.caja)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="ss-preview-row total">
                        <span>Total SS</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-accent)' }}>{formatCOP(ss.total)}</span>
                      </div>
                      <div className="ss-preview-row neto">
                        <span>Neto estimado</span>
                        <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatCOP(ss.netoEstimado)}</span>
                      </div>
                    </>
                  )}

                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '10px', lineHeight: '1.5' }}>
                    ⚠️ Estimación. Valida con la legislación vigente y/o un contador especializado en UGPP.
                  </div>
                </div>
              )}

              {/* File upload */}
              <div className="field" style={{ marginTop: '14px' }}>
                <label>Archivos adjuntos (facturas, comprobantes)</label>
                <div
                  className={`file-drop ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    setForm(f => ({ ...f, archivos: [...f.archivos, ...files] }));
                  }}
                  onClick={() => document.getElementById('file-input-ing')?.click()}
                >
                  <Upload size={20} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '13px' }}>Arrastra archivos o haz clic para seleccionar</div>
                </div>
                <input id="file-input-ing" type="file" multiple accept=".pdf,image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setForm(f => ({ ...f, archivos: [...f.archivos, ...files] }));
                  }}
                />
                {form.archivos.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {form.archivos.map((file, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                        borderRadius: '6px', padding: '4px 8px', fontSize: '12px',
                      }}>
                        <Paperclip size={12} />
                        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <button onClick={() => setForm(f => ({ ...f, archivos: f.archivos.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar ingreso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-panel" style={{ maxWidth: '380px' }}>
            <div className="modal-header"><span style={{ fontWeight: '600' }}>Eliminar ingreso</span></div>
            <div className="modal-body">
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>¿Seguro que quieres eliminar este ingreso? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ borderColor: 'var(--color-red)', background: 'rgba(248,81,73,0.1)' }}
                onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
