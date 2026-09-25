import React from 'react';
import { CartCheck, Person, CreditCard, Calendar3, XCircle } from 'react-bootstrap-icons';
import { calcularTotalesVenta } from '../../utils/impuestos';

export const VentaDetailModal = ({ show, onClose, venta, onAnular }) => {
  if (!show || !venta) return null;

  // Espejo de vw_totales_venta: base gravable + IVA a partir de la tasa
  // que quedó congelada por línea al momento de la venta.
  const totales = calcularTotalesVenta(venta.productos || []);
  const totalPagado = (venta.pagos || []).reduce((acc, p) => acc + Number(p.monto), 0);

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    detailBoxBg: 'var(--bg-main)',
  };

  const estadoBadgeStyle = () => {
    if (venta.estado === 'COMPLETADA') return { backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)' };
    if (venta.estado === 'ANULADA') return { backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' };
    return { backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' };
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div
          className="modal-content border-0 shadow-lg"
          style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}
        >
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <CartCheck size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalle de Venta</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: styles.borderCol }}>
              <div>
                <span className="badge px-2 py-1 mb-1 fw-bold" style={{ backgroundColor: 'var(--amber-action)', color: '#FFFFFF' }}>
                  {venta.idVenta}
                </span>
                <h4 className="fw-bold m-0">{venta.cliente}</h4>
              </div>
              <span className="badge px-3 py-2 fw-medium" style={{ ...estadoBadgeStyle(), borderRadius: '12px' }}>
                {venta.estado}
              </span>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Calendar3 size={16} />
                    <span className="small">Fecha</span>
                  </div>
                  <span className="fw-semibold">{new Date(venta.fecha_hora_venta).toLocaleString('es-CO')}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Person size={16} />
                    <span className="small">Registrada por</span>
                  </div>
                  <span className="fw-semibold">{venta.usuario || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table align-middle mb-0" style={{ color: styles.textColor }}>
                <thead>
                  <tr style={{ borderColor: styles.borderCol }}>
                    <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Producto</th>
                    <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Cant.</th>
                    <th className="small text-uppercase text-end" style={{ color: styles.mutedColor }}>Precio</th>
                    <th className="small text-uppercase text-end" style={{ color: styles.mutedColor }}>Subtotal</th>
                    <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {(venta.productos || []).map((p, idx) => (
                    <tr key={idx} style={{ borderColor: styles.borderCol }}>
                      <td className="fw-semibold">{p.nombre}</td>
                      <td className="text-center">{p.cantidad}</td>
                      <td className="text-end">$ {Number(p.precio).toLocaleString()}</td>
                      <td className="text-end fw-semibold">$ {Number(p.precio * p.cantidad).toLocaleString()}</td>
                      <td className="small" style={{ color: styles.mutedColor }}>{p.lote || 'Sin lote'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
              <div className="d-flex align-items-center gap-2 mb-2" style={{ color: styles.mutedColor }}>
                <CreditCard size={16} />
                <span className="small fw-semibold">Pagos</span>
              </div>
              {(venta.pagos || []).length === 0 ? (
                <div className="small" style={{ color: styles.mutedColor }}>Sin pagos registrados.</div>
              ) : (
                venta.pagos.map((p, idx) => (
                  <div key={idx} className="d-flex justify-content-between small py-1">
                    <span>{p.metodoPago}{p.referencia_transaccion ? ` • ${p.referencia_transaccion}` : ''}</span>
                    <span className="fw-semibold">$ {Number(p.monto).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>

            <div className="d-flex flex-column align-items-end gap-1 pt-2 border-top" style={{ borderColor: styles.borderCol }}>
              <div className="d-flex justify-content-between gap-3 small" style={{ color: styles.mutedColor, minWidth: '220px' }}>
                <span>Subtotal (base gravable)</span>
                <span>$ {Math.round(totales.baseGravable).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 small" style={{ color: styles.mutedColor, minWidth: '220px' }}>
                <span>IVA</span>
                <span>$ {Math.round(totales.iva).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center gap-3" style={{ minWidth: '220px' }}>
                <span className="fw-bold fs-6">Total:</span>
                <span className="fw-bold fs-5" style={{ color: 'var(--amber-action)' }}>$ {Number(venta.total).toLocaleString()}</span>
              </div>
              {venta.estado === 'COMPLETADA' && (
                <div className="d-flex justify-content-between gap-3 small" style={{ color: styles.mutedColor, minWidth: '220px' }}>
                  <span>Pagado</span>
                  <span>$ {Number(totalPagado).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
            <button
              type="button"
              className="btn btn-sm px-4 fw-medium"
              style={{ backgroundColor: 'var(--border-color)', color: styles.textColor, border: 'none' }}
              onClick={onClose}
            >
              Cerrar
            </button>
            {venta.estado === 'COMPLETADA' && onAnular && (
              <button
                type="button"
                className="btn btn-sm px-4 fw-bold text-white d-flex align-items-center gap-2 border-0"
                style={{ backgroundColor: 'var(--brand-danger)' }}
                onClick={() => onAnular(venta)}
              >
                <XCircle size={16} /> Anular venta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
