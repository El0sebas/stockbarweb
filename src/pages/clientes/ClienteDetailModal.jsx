import React from 'react';
import { Person } from 'react-bootstrap-icons';

export const ClienteDetailModal = ({ show, onClose, cliente }) => {
  if (!show || !cliente) return null;

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-main)',
  };

  const InfoItem = ({ label, value }) => (
    <div className="col-6">
      <p className="small fw-semibold mb-1" style={{ color: styles.mutedColor }}>{label}</p>
      <p className="fw-medium m-0" style={{ color: styles.textColor }}>{value || '—'}</p>
    </div>
  );

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <Person size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalle del Cliente</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="row g-3">
              <InfoItem label="Documento" value={`${cliente.tipo_documento || ''} ${cliente.numero_documento || ''}`} />
              <InfoItem label="Nombre Completo" value={cliente.nombre_completo} />
              <InfoItem label="Teléfono" value={cliente.telefono} />
              <InfoItem label="Correo" value={cliente.correo} />
              <InfoItem label="Fecha de nacimiento" value={cliente.fecha_nacimiento} />
              <div className="col-6">
                <p className="small fw-semibold mb-1" style={{ color: styles.mutedColor }}>Estado</p>
                <span className="badge px-3 py-2 fw-medium" style={{
                  backgroundColor: cliente.estado === 'Activo' ? ('var(--success-soft-bg)') : ('var(--danger-soft-bg)'),
                  color: cliente.estado === 'Activo' ? 'var(--brand-success)' : 'var(--brand-danger)', borderRadius: '8px'
                }}>{cliente.estado}</span>
              </div>
            </div>
          </div>
          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
