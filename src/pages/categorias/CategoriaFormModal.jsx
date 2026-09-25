import React, { useState, useEffect } from 'react';
import { Tag } from 'react-bootstrap-icons';

export const CategoriaFormModal = ({ show, onClose, onSave, categoria }) => {
  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
    porcentaje_iva: 19
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (categoria) {
      setFormData(categoria);
    } else {
      setFormData(initialState);
    }
  }, [categoria, show]);

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
              <Tag size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{categoria ? 'Editar Categoría' : 'Nueva Categoría'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              {categoria && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>Código</label>
                  <input type="text" className="form-control" disabled value={formData.codigo || ''} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }} />
                </div>
              )}

              <div>
                <label className="form-label small fw-semibold">Nombre de la Categoría</label>
                <input 
                  type="text" 
                  name="nombre"
                  required 
                  className="form-control shadow-none" 
                  placeholder="Ej: Licores Importados"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                  value={formData.nombre} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label className="form-label small fw-semibold">Descripción</label>
                <textarea 
                  name="descripcion"
                  className="form-control shadow-none" 
                  rows="3" 
                  placeholder="Detalles sobre los productos que incluye..."
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                  value={formData.descripcion} 
                  onChange={handleChange}
                ></textarea>
              </div>

              <div>
                <label className="form-label small fw-semibold">% IVA cobrado al cliente</label>
                <input
                  type="number"
                  name="porcentaje_iva"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  className="form-control shadow-none"
                  placeholder="19"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.porcentaje_iva ?? 19}
                  onChange={handleChange}
                />
                <div className="form-text small" style={{ color: styles.mutedColor }}>
                  19% general; 5% para licores destilados &gt;15° (tarifa diferencial). No incluye el impuesto al consumo de licores/cigarrillos: ese ya está diluido en el costo de compra y StockBar no lo vuelve a cobrar.
                </div>
              </div>
            </div>
            
            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {categoria ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};