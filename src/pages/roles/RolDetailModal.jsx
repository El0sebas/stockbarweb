import React from 'react';
import { ShieldCheck, CheckCircleFill } from 'react-bootstrap-icons';

export const RolDetailModal = ({ show, onClose, rol }) => {
  
  if (!show || !rol) return null;

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
              <ShieldCheck size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalles del Rol</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="pb-3 border-bottom" style={{ borderColor: styles.borderCol }}>
              <span className="badge px-2 py-1 mb-2 fw-bold" style={{ backgroundColor: 'var(--amber-action)', color: '#FFFFFF' }}>
                {rol.codigo}
              </span>
              <h4 className="fw-bold m-0">{rol.nombre}</h4>
            </div>

            <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
              <span className="small fw-semibold d-block mb-1" style={{ color: styles.mutedColor }}>Descripción</span>
              <p className="m-0" style={{ color: styles.textColor }}>{rol.descripcion}</p>
            </div>

            <div>
              <span className="small fw-semibold d-block mb-2" style={{ color: styles.mutedColor }}>Permisos Asignados</span>
              <div className="d-flex flex-wrap gap-2">
                {rol.permisos.map((p, index) => (
                  <span key={index} className="badge d-flex align-items-center gap-1 px-2 py-2" style={{ backgroundColor: 'var(--border-color)', color: styles.textColor }}>
                    <CheckCircleFill size={12} color="var(--brand-success)" />
                    {p}
                  </span>
                ))}
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