import React from 'react';
import { PersonBadge, Envelope, Telephone, Calendar3, ShieldCheck } from 'react-bootstrap-icons';

export const UsuarioDetailModal = ({ show, onClose, usuario }) => {
  
  if (!show || !usuario) return null;

  const styles = {
    bgModal: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    cardBg: 'var(--bg-main)'
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content border-0 shadow-lg rounded-3"
          style={{ backgroundColor: styles.bgModal, color: styles.textColor }}
        >
          {/* Header */}
          <div className="modal-header border-bottom py-3 px-4" style={{ borderColor: styles.borderCol }}>
            <h5 className="modal-title fw-bold">Detalle del Usuario</h5>
            <button
              type="button"
              className="btn-close shadow-none btn-close-themed"
              onClick={onClose}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            <div className="text-center mb-4">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                style={{ width: '64px', height: '64px', backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' }}
              >
                <PersonBadge size={32} />
              </div>
              <h5 className="fw-bold m-0">{usuario.nombre}</h5>
              <span className="small text-muted">{usuario.correo}</span>
            </div>

            <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: styles.cardBg, border: `1px solid ${styles.borderCol}` }}>
              <div className="d-flex align-items-center gap-3 mb-3">
                <PersonBadge style={{ color: styles.mutedColor }} size={18} />
                <div>
                  <div className="small fw-semibold" style={{ color: styles.mutedColor }}>Documento</div>
                  <div className="fw-semibold">{usuario.documento}</div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 mb-3">
                <Envelope style={{ color: styles.mutedColor }} size={18} />
                <div>
                  <div className="small fw-semibold" style={{ color: styles.mutedColor }}>Correo Electrónico</div>
                  <div className="fw-semibold">{usuario.correo}</div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 mb-3">
                <Telephone style={{ color: styles.mutedColor }} size={18} />
                <div>
                  <div className="small fw-semibold" style={{ color: styles.mutedColor }}>Teléfono</div>
                  <div className="fw-semibold">{usuario.telefono}</div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 mb-3">
                <ShieldCheck style={{ color: styles.mutedColor }} size={18} />
                <div>
                  <div className="small fw-semibold" style={{ color: styles.mutedColor }}>Rol Asignado</div>
                  <div className="fw-semibold">{usuario.rol}</div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <Calendar3 style={{ color: styles.mutedColor }} size={18} />
                <div>
                  <div className="small fw-semibold" style={{ color: styles.mutedColor }}>Fecha de Registro</div>
                  <div className="fw-semibold">{usuario.fechaRegistro}</div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center px-1">
              <span className="small fw-semibold" style={{ color: styles.mutedColor }}>Estado del Sistema:</span>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: usuario.estado === 'Activo'
                    ? ('var(--success-soft-bg)')
                    : ('var(--danger-soft-bg)'),
                  color: usuario.estado === 'Activo'
                    ? ('var(--brand-success)')
                    : ('var(--brand-danger)'),
                  borderRadius: '12px'
                }}
              >
                {usuario.estado}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top py-3 px-4" style={{ borderColor: styles.borderCol }}>
            <button
              type="button"
              className="btn btn-sm px-4 fw-semibold text-white"
              style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}
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