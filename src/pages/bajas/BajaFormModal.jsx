import React, { useState, useEffect } from 'react';
import { ExclamationTriangle, Search } from 'react-bootstrap-icons';
import { showAlert } from '../../utils/alerts';
import { getEstadoVencimiento } from '../../utils/stock';
import { validarCantidadBaja } from '../../utils/bajas';

// Da de baja un lote concreto (nunca un producto en general: el stock vive
// en los lotes). `loteInicial` permite abrir el formulario ya con un lote
// elegido, para el acceso directo desde el detalle de producto.
export const BajaFormModal = ({ show, onClose, onSave, lotes, productos, motivos, loteInicial }) => {
  const [busqueda, setBusqueda] = useState('');
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [idMotivoBaja, setIdMotivoBaja] = useState(motivos[0]?.id_motivo_baja || 1);
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (show) {
      setLoteSeleccionado(loteInicial || null);
      setBusqueda('');
      setIdMotivoBaja(motivos[0]?.id_motivo_baja || 1);
      setCantidad(1);
      setObservaciones('');
    }
  }, [show, loteInicial, motivos]);

  if (!show) return null;

  const getProducto = (codigo) => productos.find((p) => p.codigo === codigo);

  // Un lote de una compra ANULADA no cuenta como stock (ver utils/stock.js):
  // no se puede dar de baja algo que nunca contó como inventario real.
  const lotesConDisponible = lotes.filter((l) => Number(l.cantidad_disponible) > 0 && l.estado_compra !== 'ANULADA');
  const resultadosBusqueda = busqueda
    ? lotesConDisponible.filter((l) => {
        const prod = getProducto(l.producto_codigo);
        return (
          prod?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          prod?.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
          (l.numero_lote_proveedor || '').toLowerCase().includes(busqueda.toLowerCase())
        );
      })
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loteSeleccionado) {
      showAlert.error('Falta el lote', 'Selecciona el lote que vas a dar de baja.');
      return;
    }

    const disponible = Number(loteSeleccionado.cantidad_disponible);
    const mensajeError = validarCantidadBaja(Number(cantidad), disponible);
    if (mensajeError) {
      showAlert.error('Baja rechazada', mensajeError);
      return;
    }

    onSave({
      id_lote: loteSeleccionado.id_lote,
      id_motivo_baja: Number(idMotivoBaja),
      cantidad: Number(cantidad),
      observaciones: observaciones.trim() || null
    });
  };

  const productoSeleccionado = loteSeleccionado ? getProducto(loteSeleccionado.producto_codigo) : null;
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
              <h5 className="modal-title fw-bold m-0">Dar de baja</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          {/* noValidate: el mensaje de rechazo debe ser el que lanzaría la BD
              (validarCantidadBaja), no el tooltip nativo del navegador por
              el atributo max del input de cantidad. */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Lote a dar de baja</label>
                {loteSeleccionado ? (
                  <div className="p-3 rounded-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: styles.tableBg, border: `1px solid ${styles.borderCol}` }}>
                    <div>
                      <div className="fw-semibold">{productoSeleccionado?.nombre || loteSeleccionado.producto_codigo}</div>
                      <div className="small" style={{ color: styles.mutedColor }}>
                        Lote {loteSeleccionado.numero_lote_proveedor || `#${loteSeleccionado.id_lote}`}
                        {loteSeleccionado.fecha_vencimiento ? ` • Vence ${loteSeleccionado.fecha_vencimiento}` : ' • Sin vencimiento'}
                        {' • '}Disponible: {loteSeleccionado.cantidad_disponible} un.
                        {estadoVencimiento === 'vencido' && <span className="badge ms-2" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>Vencido</span>}
                        {estadoVencimiento === 'por_vencer' && <span className="badge ms-2" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' }}>Por vencer</span>}
                      </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-link" onClick={() => setLoteSeleccionado(null)}>Cambiar</button>
                  </div>
                ) : (
                  <>
                    <div className="position-relative">
                      <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
                      <input
                        type="text"
                        className="form-control ps-4"
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
                            const prod = getProducto(l.producto_codigo);
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
                                  <span className="fw-semibold">{prod?.nombre || l.producto_codigo}</span>{' '}
                                  <span className="small" style={{ color: styles.mutedColor }}>
                                    Lote {l.numero_lote_proveedor || `#${l.id_lote}`} • Disp. {l.cantidad_disponible} un.
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
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Motivo</label>
                  <select
                    className="form-select shadow-none"
                    value={idMotivoBaja}
                    onChange={(e) => setIdMotivoBaja(e.target.value)}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  >
                    {motivos.map((m) => (
                      <option key={m.id_motivo_baja} value={m.id_motivo_baja}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max={loteSeleccionado?.cantidad_disponible || undefined}
                    className="form-control shadow-none"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value) || 0)}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
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
                Registrar baja
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
