import React from 'react';
import { Building, Person, Telephone, Envelope } from 'react-bootstrap-icons';

export const ProveedorDetailModal = ({ show, onClose, proveedor }) => {
  
  if (!show || !proveedor) return null;

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    cardBg: 'var(--bg-main)',
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <Building size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalle del Proveedor</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <div className="modal-body p-4 d-flex flex-column gap-4">
            <div className="d-flex justify-content-between align-items-center p-3 rounded-3" style={{ backgroundColor: styles.cardBg, border: `1px solid ${styles.borderCol}` }}>
              <div>
                <span className="small fw-semibold text-uppercase" style={{ color: 'var(--amber-action)', fontSize: '0.75rem' }}>{proveedor.codigo}</span>
                <h4 className="fw-bold m-0 mt-1" style={{ color: styles.textColor }}>{proveedor.nombre}</h4>
              </div>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: proveedor.estado === 'Activo'
                    ? ('var(--success-soft-bg)')
                    : ('var(--danger-soft-bg)'),
                  color: proveedor.estado === 'Activo'
                    ? ('var(--brand-success)')
                    : ('var(--brand-danger)'),
                  borderRadius: '12px'
                }}
              >
                {proveedor.estado}
              </span>
            </div>

            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                <Person size={18} style={{ color: styles.mutedColor }} />
                <div>
                  <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>NIT / Documento</span>
                  <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.nit_empresa || 'No especificado'}</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                <Person size={18} style={{ color: styles.mutedColor }} />
                <div>
                  <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Contacto Principal</span>
                  <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.contacto || 'No especificado'}</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                <Telephone size={18} style={{ color: styles.mutedColor }} />
                <div>
                  <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Teléfono</span>
                  <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.telefono || 'No especificado'}</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                <Envelope size={18} style={{ color: styles.mutedColor }} />
                <div>
                  <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Correo Electrónico</span>
                  <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.correo || 'No especificado'}</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                <Building size={18} style={{ color: styles.mutedColor }} />
                <div>
                  <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Dirección</span>
                  <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.direccion || 'No especificado'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button type="button" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};