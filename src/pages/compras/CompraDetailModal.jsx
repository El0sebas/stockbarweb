import React from 'react';
import { BagCheck, Truck, Calendar3, CreditCard, FileEarmarkText, Hash, XCircle } from 'react-bootstrap-icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';

export const CompraDetailModal = ({ show, onClose, compra, onAnular, bloqueada }) => {
  // Resuelve el método de pago tanto si viene como nombre (semilla antigua)
  // como si viene por id_metodo_pago (compras creadas desde el formulario).
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);

  if (!show || !compra) return null;

  const nombreMetodoPago = compra.metodoPago
    || metodosPago.find((m) => m.id_metodo_pago === compra.id_metodo_pago)?.nombre
    || 'N/A';

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    detailBoxBg: 'var(--bg-main)',
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
              <BagCheck size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalle de Compra</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: styles.borderCol }}>
              <div>
                <span className="badge px-2 py-1 mb-1 fw-bold" style={{ backgroundColor: 'var(--amber-action)', color: '#FFFFFF' }}>
                  {compra.numero_factura_proveedor}
                </span>
                <h4 className="fw-bold m-0">{compra.proveedor}</h4>
              </div>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: compra.estado === 'ANULADA' ? 'var(--danger-soft-bg)' : 'var(--success-soft-bg)',
                  color: compra.estado === 'ANULADA' ? 'var(--brand-danger)' : 'var(--brand-success)',
                  borderRadius: '12px'
                }}
              >
                {compra.estado}
              </span>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Calendar3 size={16} />
                    <span className="small">Fecha</span>
                  </div>
                  <span className="fw-semibold">{compra.fecha_compra || compra.fecha}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Hash size={16} />
                    <span className="small">N° Factura Proveedor</span>
                  </div>
                  <span className="fw-semibold">{compra.numero_factura_proveedor || 'N/A'}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <CreditCard size={16} />
                    <span className="small">Método de pago</span>
                  </div>
                  <span className="fw-semibold">{nombreMetodoPago}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Truck size={16} />
                    <span className="small">Proveedor</span>
                  </div>
                  <span className="fw-semibold">{compra.proveedor}</span>
                </div>
              </div>
              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <FileEarmarkText size={16} />
                    <span className="small">Factura digitalizada</span>
                  </div>
                  {compra.ruta_factura ? (
                    compra.ruta_factura_url ? (
                      <a href={compra.ruta_factura_url} target="_blank" rel="noreferrer" className="fw-semibold" style={{ color: 'var(--amber-action)' }}>
                        Ver factura ({compra.ruta_factura})
                      </a>
                    ) : (
                      <span className="fw-semibold">{compra.ruta_factura}</span>
                    )
                  ) : (
                    <span className="fw-semibold" style={{ color: styles.mutedColor }}>Sin factura adjunta</span>
                  )}
                </div>
              </div>
            </div>

            {compra.items && compra.items.length > 0 ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0" style={{ color: styles.textColor }}>
                  <thead>
                    <tr style={{ borderColor: styles.borderCol }}>
                      <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Producto</th>
                      <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Cant.</th>
                      <th className="small text-uppercase text-end" style={{ color: styles.mutedColor }}>Costo Unit.</th>
                      <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Lote/Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compra.items.map((item) => (
                      <tr key={item.id_detalle} style={{ borderColor: styles.borderCol }}>
                        <td className="fw-semibold">{item.producto}</td>
                        <td className="text-center">{item.cantidad} un.</td>
                        <td className="text-end">$ {Number(item.costoUnitario).toLocaleString()}</td>
                        <td className="small" style={{ color: styles.mutedColor }}>
                          {item.numero_lote ? `${item.numero_lote} • ${item.fecha_vencimiento}` : 'Sin vencimiento'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="small m-0" style={{ color: styles.mutedColor }}>
                Esta compra no tiene detalle de productos por línea registrado.
              </p>
            )}

            <div className="d-flex justify-content-end align-items-center gap-3 pt-2 border-top" style={{ borderColor: styles.borderCol }}>
              <span className="fw-bold fs-6">Total:</span>
              <span className="fw-bold fs-5" style={{ color: 'var(--amber-action)' }}>$ {Number(compra.total).toLocaleString()}</span>
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
            {compra.estado !== 'ANULADA' && onAnular && (
              <button
                type="button"
                className="btn btn-sm px-4 fw-bold text-white d-flex align-items-center gap-2 border-0"
                style={{ backgroundColor: 'var(--brand-danger)', opacity: bloqueada ? 0.6 : 1 }}
                onClick={() => onAnular(compra)}
                title={bloqueada ? 'Sus lotes ya tienen movimientos de inventario' : undefined}
              >
                <XCircle size={16} /> Anular compra
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
