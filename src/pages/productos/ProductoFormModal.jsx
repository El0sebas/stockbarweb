import React, { useState, useEffect } from 'react';
import { BoxSeam } from 'react-bootstrap-icons';

export const ProductoFormModal = ({ show, onClose, onSave, producto }) => {
  
  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    precioVenta: '',
    porcentaje_impuesto: 19,
    precio_incluye_impuesto: false,
    maneja_vencimiento: false,
    stockActual: '',
    stockMinimo: '',
    estado: 'Activo'
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (producto) {
      setFormData(producto);
    } else {
      setFormData({ ...initialState, estado: 'Activo' });
    }
  }, [producto, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = producto ? formData : { ...formData, estado: 'Activo' };
    onSave(dataToSave);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
              <BoxSeam size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              {producto && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>Código</label>
                  <input type="text" className="form-control" disabled value={formData.codigo || ''} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }} />
                </div>
              )}

              <div>
                <label className="form-label small fw-semibold">Nombre del Producto</label>
                <input 
                  type="text" 
                  name="nombre"
                  required 
                  className="form-control shadow-none" 
                  placeholder="Ej: Whisky Old Parr"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                  value={formData.nombre} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label className="form-label small fw-semibold">Descripción</label>
                <textarea
                  name="descripcion"
                  rows="3"
                  className="form-control shadow-none"
                  placeholder="Describe el producto, marca, origen y notas relevantes"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.descripcion || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Categoría</label>
                  <select 
                    name="categoria"
                    className="form-select shadow-none"
                    required
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                    value={formData.categoria} 
                    onChange={handleChange}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Licores Importados">Licores Importados</option>
                    <option value="Licores Nacionales">Licores Nacionales</option>
                    <option value="Cervezas">Cervezas</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Precio de Venta</label>
                  <input 
                    type="number" 
                    name="precioVenta"
                    required 
                    className="form-control shadow-none" 
                    placeholder="0.00"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                    value={formData.precioVenta} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">% Impuesto</label>
                  <input 
                    type="number"
                    name="porcentaje_impuesto"
                    min="0"
                    max="100"
                    className="form-control shadow-none"
                    placeholder="19"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.porcentaje_impuesto || 0}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Stock Mínimo</label>
                  <input 
                    type="number" 
                    name="stockMinimo"
                    required 
                    className="form-control shadow-none" 
                    placeholder="0"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                    value={formData.stockMinimo} 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Stock Actual</label>
                  <input 
                    type="number" 
                    name="stockActual"
                    required 
                    className="form-control shadow-none" 
                    placeholder="0"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                    value={formData.stockActual} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Precio incluye impuesto</label>
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="precio_incluye_impuesto"
                      checked={Boolean(formData.precio_incluye_impuesto)}
                      onChange={handleChange}
                    />
                    <label className="form-check-label ms-2">Sí</label>
                  </div>
                </div>
              </div>

              <div className="form-check form-switch mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="maneja_vencimiento"
                  checked={Boolean(formData.maneja_vencimiento)}
                  onChange={handleChange}
                />
                <label className="form-check-label ms-2">Maneja vencimiento / lote</label>
              </div>
            </div>
            
            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {producto ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};