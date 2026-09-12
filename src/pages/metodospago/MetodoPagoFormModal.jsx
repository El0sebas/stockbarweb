import React, { useState, useEffect } from 'react';
import { CreditCard } from 'react-bootstrap-icons';

export const MetodoPagoFormModal = ({ show, onClose, onSave, metodo }) => {

  const initialState = { id_metodo_pago: '', nombre: '' };
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (metodo) {
      setFormData({ id_metodo_pago: metodo.id_metodo_pago, nombre: metodo.nombre });
    } else {
      setFormData(initialState);
    }
  }, [metodo, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
              <CreditCard size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{metodo ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              {metodo && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>ID</label>
                  <input type="text" className="form-control" disabled value={formData.id_metodo_pago || ''} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }} />
                </div>
              )}

              <div>
                <label className="form-label small fw-semibold">Nombre del Método</label>
                <input 
                  type="text" name="nombre" required className="form-control shadow-none" 
                  placeholder="Ej: Nequi"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                  value={formData.nombre} onChange={handleChange} 
                />
              </div>
            </div>
            
            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {metodo ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
