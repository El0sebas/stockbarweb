import React, { useState, useEffect } from 'react';
import { ExclamationTriangle, Search } from 'react-bootstrap-icons';
import { getEstadoVencimiento } from '../../utils/stock';
import { useApi } from '../../hooks/useApi';
import { api, consulta } from '../../services/api';
import { ejecutar } from '../../utils/accion';

// Da de baja un lote concreto (nunca un producto en general: el stock vive
// en los lotes). `loteInicial` permite abrir el formulario ya con un lote
// elegido, para el acceso directo desde el detalle de producto. El usuario
// que registra la baja lo toma el backend de la sesión. Con `baja` edita una
// existente (CU_07_03): el lote no cambia, solo motivo, cantidad y observaciones.
export const BajaFormModal = ({ show, onClose, onGuardada, loteInicial, baja }) => {
  const [busqueda, setBusqueda] = useState('');
  const { data: motivos } = useApi(show ? '/motivos-baja' : null, []);
  const { data: resultadosBusqueda } = useApi(show && busqueda.trim() ? `/bajas/lotes${consulta({ q: busqueda.trim() })}` : null, []);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [idMotivoBaja, setIdMotivoBaja] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (show) {
      setLoteSeleccionado(baja ? { id_lote: baja.id_lote, producto: baja.producto, fecha_vencimiento: baja.fecha_vencimiento } : loteInicial || null);
      setBusqueda('');
      setIdMotivoBaja(baja?.id_motivo_baja || '');
      setCantidad(baja ? Number(baja.cantidad) : 1);
      setObservaciones(baja?.observaciones || '');
      setTocado(false);
    }
  }, [show, loteInicial, baja]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTocado(true);
    if (errLote || errCantidad) return;

    // trg_validar_baja_ins/_upd revalidan en la BD (stock concurrente).
    const datos = { id_motivo_baja: motivoElegido, cantidad: Number(cantidad), observaciones: observaciones.trim() || null };
    const ok = await ejecutar(
      () => (baja ? api.put(`/bajas/${baja.id_baja}`, datos) : api.post('/bajas', { ...datos, id_lote: loteSeleccionado.id_lote })),
      (r) => r.mensaje
    );
    if (ok) onGuardada?.();
  };

  const motivoElegido = idMotivoBaja || motivos[0]?.id_motivo_baja;
  const errLote = loteSeleccionado ? '' : 'Campo obligatorio: selecciona un lote';
  // Aviso inmediato; la regla real la aplica el trigger de la BD (al editar
  // no se conoce el disponible del lote: lo valida solo el trigger).
  const errCantidad = !loteSeleccionado ? ''
    : !(Number(cantidad) > 0) ? 'La cantidad de la baja debe ser mayor que cero.'
    : !baja && Number(cantidad) > Number(loteSeleccionado.cantidad_disponible) ? 'La baja supera la cantidad disponible del lote.' : '';
  const msg = (t) => tocado && t && <div className="small mt-1" style={{ color: 'var(--brand-danger)' }}>{t}</div>;
  const estadoVencimiento = loteSeleccionado ? getEstadoVencimiento(loteSeleccionado.fecha_vencimiento) : null;

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
    tableBg: 'var(--bg-main)',
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <ExclamationTriangle size={20} color="var(--brand-danger)" />
              <h5 className="modal-title fw-bold m-0">{baja ? `Editar baja ${baja.id_baja}` : 'Dar de baja'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          {/* noValidate: el mensaje de rechazo debe ser el que lanzaría la BD
              (validarCantidadBaja), no el tooltip nativo del navegador por
              el atributo max del input de cantidad. */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Lote a dar de baja <span style={{ color: 'var(--brand-danger)' }}>*</span></label>
                {loteSeleccionado ? (
                  <div className="p-3 rounded-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: styles.tableBg, border: `1px solid ${styles.borderCol}` }}>
                    <div>
                      <div className="fw-semibold">{loteSeleccionado.producto}</div>
                      <div className="small" style={{ color: styles.mutedColor }}>
                        Lote {loteSeleccionado.id_lote}
                        {loteSeleccionado.fecha_vencimiento ? ` • Vence ${loteSeleccionado.fecha_vencimiento}` : ' • Sin vencimiento'}
                        {loteSeleccionado.cantidad_disponible != null && ` • Disponible: ${loteSeleccionado.cantidad_disponible} un.`}
                        {estadoVencimiento === 'vencido' && <span className="badge ms-2" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>Vencido</span>}
                        {estadoVencimiento === 'por_vencer' && <span className="badge ms-2" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' }}>Por vencer</span>}
                      </div>
                    </div>
                    {!baja && <button type="button" className="btn btn-sm btn-link" onClick={() => setLoteSeleccionado(null)}>Cambiar</button>}
                  </div>
                ) : (
                  <>
                    <div className="position-relative">
                      <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
                      <input
                        type="text"
                        className="form-control ps-5"
                        placeholder="Buscar por producto, código o número de lote..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                      />
                    </div>
                    {busqueda && (
                      <div className="rounded-3 mt-1" style={{ border: `1px solid ${styles.borderCol}`, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosBusqueda.length === 0 ? (
                          <div className="small text-center py-3" style={{ color: styles.mutedColor }}>Sin lotes disponibles que coincidan.</div>
                        ) : (
                          resultadosBusqueda.map((l) => {
                            const estado = getEstadoVencimiento(l.fecha_vencimiento);
                            return (
                              <button
                                type="button"
                                key={l.id_lote}
                                className="btn d-flex justify-content-between align-items-center w-100 text-start border-0 px-3 py-2"
                                style={{ backgroundColor: 'transparent', color: styles.textColor, borderRadius: 0 }}
                                onClick={() => setLoteSeleccionado(l)}
                              >
                                <span>
                                  <span className="fw-semibold">{l.producto}</span>{' '}
                                  <span className="small" style={{ color: styles.mutedColor }}>
                                    Lote {l.id_lote} • Disp. {l.cantidad_disponible} un.
                                  </span>
                                </span>
                                {estado === 'vencido' && <span className="badge" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>Vencido</span>}
                                {estado === 'por_vencer' && <span className="badge" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' }}>Por vencer</span>}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
                {msg(errLote)}
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Motivo <span style={{ color: 'var(--brand-danger)' }}>*</span></label>
                  <select
                    className="form-select shadow-none"
                    value={motivoElegido || ''}
                    onChange={(e) => setIdMotivoBaja(e.target.value)}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  >
                    {motivos.map((m) => (
                      <option key={m.id_motivo_baja} value={m.id_motivo_baja}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Cantidad <span style={{ color: 'var(--brand-danger)' }}>*</span></label>
                  <input
                    type="number"
                    min="1"
                    max={baja ? undefined : loteSeleccionado?.cantidad_disponible || undefined}
                    className="form-control shadow-none"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value) || 0)}
                    onBlur={() => setTocado(true)}
                    style={{ backgroundColor: styles.inputBg, borderColor: tocado && errCantidad ? 'var(--brand-danger)' : styles.borderCol, color: styles.textColor }}
                  />
                  {msg(errCantidad)}
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">Observaciones (opcional)</label>
                <textarea
                  className="form-control shadow-none"
                  rows="2"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                />
              </div>
            </div>

            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--brand-danger)' }}>
                {baja ? 'Guardar cambios' : 'Registrar baja'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
