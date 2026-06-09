import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Paperclip, X, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCOP, formatDate, getCurrentMonthRange, CATEGORIAS_EGRESO } from '../../lib/utils';
import { Toast, useToast } from '../ui/Toast';
import type { Egreso } from '../../types';

interface EgresosProps {
  userId: string;
}

const DEFAULT_FORM = {
  monto: '',
  descripcion: '',
  fecha: new Date().toISOString().split('T')[0],
  proveedor: '',
  categoria: 'Suscripción de software',
  notas: '',
  facturaFile: null as File | null,
};

export default function Egresos({ userId }: EgresosProps) {
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Egreso | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [dateFrom, setDateFrom] = useState(getCurrentMonthRange().from);
  const [dateTo, setDateTo] = useState(getCurrentMonthRange().to);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchEgresos();
  }, [userId]);

  async function fetchEgresos() {
    setLoading(true);
    const { data } = await supabase
      .from('egresos')
      .select('*')
      .eq('user_id', userId)
      .gte('fecha', dateFrom)
      .lte('fecha', dateTo)
      .order('fecha', { ascending: false });
    setEgresos(data || []);
    setLoading(false);
  }

  function openAdd() {
    setForm({ ...DEFAULT_FORM, fecha: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(egr: Egreso) {
    setForm({
      monto: String(egr.monto),
      descripcion: egr.descripcion,
      fecha: egr.fecha,
      proveedor: egr.proveedor,
      categoria: egr.categoria,
      notas: egr.notas || '',
      facturaFile: null,
    });
    setEditId(egr.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.monto || !form.descripcion || !form.fecha || !form.proveedor) {
      showToast('Completa todos los campos requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      let facturaUrl: string | undefined;
      if (form.facturaFile) {
        const file = form.facturaFile;
        const ext = file.name.split('.').pop();
        const path = `${userId}/egresos/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const { error } = await supabase.storage.from('adjuntos').upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from('adjuntos').getPublicUrl(path);
          facturaUrl = urlData.publicUrl;
        }
      }

      const payload = {
        user_id: userId,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion,
        fecha: form.fecha,
        proveedor: form.proveedor,
        categoria: form.categoria,
        notas: form.notas || null,
        ...(facturaUrl && { factura_url: facturaUrl }),
      };

      if (editId) {
        await supabase.from('egresos').update(payload).eq('id', editId);
        showToast('Egreso actualizado');
      } else {
        await supabase.from('egresos').insert(payload);
        showToast('Egreso guardado');
      }
      setShowModal(false);
      fetchEgresos();
    } catch (e) {
      showToast('Error al guardar', 'error');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('egresos').delete().eq('id', id);
    setDeleteConfirm(null);
    showToast('Egreso eliminado');
    fetchEgresos();
  }

  const totalMonto = egresos.reduce((s, r) => s + r.monto, 0);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="page-header">
        <div className="page-title">Egresos</div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Agregar egreso
        </button>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Desde</div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '150px' }} />
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Hasta</div>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '150px' }} />
        <button className="btn btn-ghost btn-sm" onClick={fetchEgresos}>Consultar</button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Monto</th>
              <th>Factura</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>Cargando...</td></tr>
            ) : egresos.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>
                Sin egresos en este período
              </td></tr>
            ) : egresos.map(egr => (
              <tr key={egr.id} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(egr)}>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(egr.fecha)}</td>
                <td onClick={e => e.stopPropagation()}>{egr.proveedor}</td>
                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{egr.descripcion}</td>
                <td>
                  <span className="badge badge-blue">{egr.categoria}</span>
                </td>
                <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-red)', fontWeight: '600' }}>{formatCOP(egr.monto)}</td>
                <td onClick={e => e.stopPropagation()}>
                  {egr.factura_url && (
                    <a href={egr.factura_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                      <Paperclip size={13} /> Ver
                    </a>
                  )}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(egr)} title="Editar">
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(egr.id)} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {egresos.length > 0 && (
            <tfoot>
              <tr className="table-footer">
                <td colSpan={4}>Total del período</td>
                <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-red)' }}>{formatCOP(totalMonto)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <span style={{ fontWeight: '600', fontSize: '15px' }}>{editId ? 'Editar egreso' : 'Nuevo egreso'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Monto (COP) *</label>
                  <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="250000" min="0" autoFocus />
                </div>
                <div className="field">
                  <label>Proveedor *</label>
                  <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="Netflix, AWS, Freelancer..." />
                </div>
                <div className="field">
                  <label>Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Descripción *</label>
                  <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del gasto..." />
                </div>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS_EGRESO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Notas adicionales</label>
                  <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                    placeholder="Notas opcionales..." style={{ resize: 'vertical' }} />
                </div>
              </div>

              {/* File upload */}
              <div className="field">
                <label>Factura electrónica (PDF o imagen)</label>
                <div
                  className={`file-drop ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) setForm(f => ({ ...f, facturaFile: file }));
                  }}
                  onClick={() => document.getElementById('file-input-egr')?.click()}
                >
                  <Upload size={20} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '13px' }}>
                    {form.facturaFile ? form.facturaFile.name : 'Arrastra o haz clic para subir'}
                  </div>
                </div>
                <input
                  id="file-input-egr" type="file" accept=".pdf,image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setForm(f => ({ ...f, facturaFile: file }));
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar egreso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDetail(null); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <span style={{ fontWeight: '600', fontSize: '15px' }}>Detalle del egreso</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetail(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: 'Proveedor', value: showDetail.proveedor },
                  { label: 'Fecha', value: formatDate(showDetail.fecha) },
                  { label: 'Monto', value: formatCOP(showDetail.monto) },
                  { label: 'Categoría', value: showDetail.categoria },
                  { label: 'Descripción', value: showDetail.descripcion },
                  ...(showDetail.notas ? [{ label: 'Notas', value: showDetail.notas }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '120px', flexShrink: 0, fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '1px' }}>
                      {row.label}
                    </div>
                    <div style={{ fontWeight: row.label === 'Monto' ? '600' : '400', color: row.label === 'Monto' ? 'var(--color-red)' : 'var(--color-text)' }}>
                      {row.value}
                    </div>
                  </div>
                ))}

                {showDetail.factura_url && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '120px', flexShrink: 0, fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Factura
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={showDetail.factura_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                        <Eye size={13} /> Ver factura
                      </a>
                      <a href={showDetail.factura_url} download className="btn btn-ghost btn-sm">
                        <ExternalLink size={13} /> Descargar
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowDetail(null); openEdit(showDetail!); }}>
                <Pencil size={13} /> Editar
              </button>
              <button className="btn btn-ghost" onClick={() => setShowDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-panel" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <span style={{ fontWeight: '600' }}>Eliminar egreso</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>¿Seguro que quieres eliminar este egreso?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ borderColor: 'var(--color-red)', background: 'rgba(248,81,73,0.1)' }}
                onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
