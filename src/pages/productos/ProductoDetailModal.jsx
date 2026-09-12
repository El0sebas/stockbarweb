import React from 'react';
import { BoxSeam, Tag, CurrencyDollar, Layers, ShieldExclamation } from 'react-bootstrap-icons';

export const ProductoDetailModal = ({ show, onClose, producto }) => {
  if (!show || !producto) return null;

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
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content border-0 shadow-lg"
          style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}
        >
          {/* Header */}
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <BoxSeam size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalles del Producto</h5>
            </div>
            <button
              type="button"
              className="btn-close shadow-none btn-close-themed"
              onClick={onClose}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: styles.borderCol }}>
              <div>
                <span className="badge px-2 py-1 mb-1 fw-bold" style={{ backgroundColor: 'var(--amber-action)', color: '#FFFFFF' }}>
                  {producto.codigo}
                </span>
                <h4 className="fw-bold m-0">{producto.nombre}</h4>
              </div>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: producto.estado === 'Activo'
                    ? ('var(--success-soft-bg)')
                    : ('var(--danger-soft-bg)'),
                  color: producto.estado === 'Activo'
                    ? ('var(--brand-success)')
                    : ('var(--brand-danger)'),
                  borderRadius: '12px'
                }}
              >
                {producto.estado}
              </span>
            </div>

            <div className="row g-3">
              {/* Categoría */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Tag size={16} />
                    <span className="small">Categoría</span>
                  </div>
                  <span className="fw-semibold">{producto.categoria}</span>
                </div>
              </div>

              {/* Precio de venta */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <CurrencyDollar size={16} />
                    <span className="small">Precio de Venta</span>
                  </div>
                  <span className="fw-bold" style={{ color: 'var(--amber-action)' }}>
                    $ {Number(producto.precioVenta || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Stock Actual */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Layers size={16} />
                    <span className="small">Stock Actual</span>
                  </div>
                  <span className="fw-semibold fs-5">{producto.stockActual} un.</span>
                </div>
              </div>

              {/* Stock Mínimo */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <ShieldExclamation size={16} />
                    <span className="small">Stock Mínimo</span>
                  </div>
                  <span className="fw-semibold fs-5">{producto.stockMinimo} un.</span>
                </div>
              </div>

              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Descripción</div>
                  <div className="fw-medium mt-1">{producto.descripcion || 'Sin descripción registrada'}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Impuesto</div>
                  <div className="fw-semibold mt-1">{producto.porcentaje_impuesto ?? producto.porcentajeImpuesto ?? 0}%</div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Precio incluye impuesto</div>
                  <div className="fw-semibold mt-1">{producto.precio_incluye_impuesto || producto.precioIncluyeImpuesto ? 'Sí' : 'No'}</div>
                </div>
              </div>

              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Maneja vencimiento / lote</div>
                  <div className="fw-semibold mt-1">{producto.maneja_vencimiento || producto.manejaVencimiento ? 'Sí' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
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