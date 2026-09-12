import React, { useState, useEffect } from 'react';
import { Person } from 'react-bootstrap-icons';

export const ClienteFormModal = ({ show, onClose, onSave, cliente }) => {
  const initialState = { documento: '', nombre_completo: '', telefono: '', correo: '' };
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (cliente) {
      setFormData({ documento: cliente.documento, nombre_completo: cliente.nombre_completo, telefono: cliente.telefono || '', correo: cliente.correo || '' });
    } else {
      setFormData(initialState);
    }
  }, [cliente, show]);

  if (!show) return null;

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <Person size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{cliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Documento</label>
                <input type="text" name="documento" required className="form-control shadow-none" placeholder="Ej: 1017223344" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={formData.documento} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label small fw-semibold">Nombre Completo</label>
                <input type="text" name="nombre_completo" required className="form-control shadow-none" placeholder="Ej: Andrés Pérez" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={formData.nombre_completo} onChange={handleChange} />
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Teléfono</label>
                  <input type="text" name="telefono" className="form-control shadow-none" placeholder="300 123 4567" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={formData.telefono} onChange={handleChange} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Correo Electrónico</label>
                  <input type="email" name="correo" className="form-control shadow-none" placeholder="correo@ejemplo.com" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={formData.correo} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>{cliente ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
