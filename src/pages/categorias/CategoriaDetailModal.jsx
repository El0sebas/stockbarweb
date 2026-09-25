import React from 'react';
import { Tag } from 'react-bootstrap-icons';

export const CategoriaDetailModal = ({ show, onClose, categoria }) => {
  if (!show || !categoria) return null;

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    detailBoxBg: 'var(--bg-main)',
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>

          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <Tag size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalles de la Categoría</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="pb-3 border-bottom" style={{ borderColor: styles.borderCol }}>
              <span className="badge px-2 py-1 mb-2 fw-bold" style={{ backgroundColor: 'var(--amber-action)', color: '#FFFFFF' }}>
                {categoria.codigo}
              </span>
              <h4 className="fw-bold m-0">{categoria.nombre}</h4>
            </div>

            <div className="p-3 rounded-3 mt-1" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
              <div className="d-flex align-items-center gap-2 mb-2" style={{ color: styles.mutedColor }}>
                <span className="small fw-semibold">Descripción</span>
              </div>
              <p className="m-0" style={{ color: styles.textColor }}>
                {categoria.descripcion || <span style={{ color: styles.mutedColor, fontStyle: 'italic' }}>Sin descripción registrada.</span>}
              </p>
            </div>

            <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
              <div className="small" style={{ color: styles.mutedColor }}>% IVA cobrado al cliente</div>
              <div className="fw-bold fs-5 mt-1" style={{ color: 'var(--amber-action)' }}>{categoria.porcentaje_iva ?? 19}%</div>
            </div>
          </div>

          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button
              type="button"
              className="btn btn-sm px-4 fw-medium"
              style={{ backgroundColor: 'var(--neutral-soft-bg)', color: styles.textColor, border: 'none' }}
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