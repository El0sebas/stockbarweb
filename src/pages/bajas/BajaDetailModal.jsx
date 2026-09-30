import React from 'react';
import { ExclamationTriangle, Calendar3, Person, BoxSeam, Tag } from 'react-bootstrap-icons';

export const BajaDetailModal = ({ show, onClose, baja, lote, producto, motivoNombre }) => {
  if (!show || !baja) return null;

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
              <ExclamationTriangle size={20} color="var(--brand-danger)" />
              <h5 className="modal-title fw-bold m-0">Detalle de Baja</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: styles.borderCol }}>
              <div>
                <span className="badge px-2 py-1 mb-1 fw-bold" style={{ backgroundColor: 'var(--brand-danger)', color: '#FFFFFF' }}>
                  Baja #{baja.id_baja}
                </span>
                <h4 className="fw-bold m-0">{producto?.nombre || 'Producto eliminado'}</h4>
              </div>
              <span
                className="badge px-3 py-2 fw-medium d-flex align-items-center gap-1"
                style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', borderRadius: '12px' }}
              >
                <ExclamationTriangle size={12} />
                {motivoNombre}
              </span>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Calendar3 size={16} />
                    <span className="small">Fecha y hora</span>
                  </div>
                  <span className="fw-semibold">{new Date(baja.fecha_hora).toLocaleString('es-CO')}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Person size={16} />
                    <span className="small">Registrada por</span>
                  </div>
                  <span className="fw-semibold">{baja.usuario || 'N/A'}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <BoxSeam size={16} />
                    <span className="small">Lote afectado</span>
                  </div>
                  <span className="fw-semibold">{lote?.numero_lote_proveedor || `#${baja.id_lote}`}</span>
                  {lote?.fecha_vencimiento && (
                    <div className="small" style={{ color: styles.mutedColor }}>Vence: {lote.fecha_vencimiento}</div>
                  )}
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Tag size={16} />
                    <span className="small">Producto</span>
                  </div>
                  <span className="fw-semibold">{producto?.codigo || 'N/A'}{producto?.categoria ? ` • ${producto.categoria}` : ''}</span>
                </div>
              </div>
              <div className="col-12">
                <div className="p-3 rounded-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <span className="small" style={{ color: styles.mutedColor }}>Cantidad dada de baja</span>
                  <span className="fw-bold fs-5" style={{ color: 'var(--brand-danger)' }}>{baja.cantidad} un.</span>
                </div>
              </div>
              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small mb-1" style={{ color: styles.mutedColor }}>Observaciones</div>
                  <span className="fw-semibold">{baja.observaciones || 'Sin observaciones.'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button
              type="button"
              className="btn btn-sm px-4 fw-medium"
              style={{ backgroundColor: 'var(--border-color)', color: styles.textColor, border: 'none' }}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
