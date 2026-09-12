import React from 'react';
import { Trash, ExclamationTriangle } from 'react-bootstrap-icons';

// Modal de confirmación de eliminación compartido por todos los módulos CRUD.
// Antes existía una copia casi idéntica por módulo (con paletas de color
// ligeramente distintas entre sí); se centraliza aquí para que el
// comportamiento y la apariencia sean siempre los mismos.
export const ConfirmDeleteModal = ({ show, onClose, onConfirm, itemName, itemLabel = 'este registro' }) => {
  if (!show) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div
          className="modal-content border-0 shadow-lg text-center p-3"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px' }}
        >
          <div className="modal-body d-flex flex-column align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center p-3"
              style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}
            >
              <ExclamationTriangle size={32} />
            </div>

            <div>
              <h5 className="fw-bold m-0 mb-1">¿Eliminar registro?</h5>
              <p className="small m-0" style={{ color: 'var(--text-muted)' }}>
                ¿Estás seguro de eliminar{' '}
                <strong style={{ color: 'var(--text-main)' }}>{itemName || itemLabel}</strong>? Esta acción no se
                puede deshacer.
              </p>
            </div>

            <div className="d-flex gap-2 w-100 mt-2">
              <button
                type="button"
                className="btn btn-sm flex-fill border-0 fw-medium"
                style={{ backgroundColor: 'var(--neutral-soft-bg)', color: 'var(--text-main)' }}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm flex-fill fw-semibold text-white d-flex align-items-center justify-content-center gap-1"
                style={{ backgroundColor: 'var(--brand-danger)', border: 'none' }}
                onClick={onConfirm}
              >
                <Trash size={14} />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
