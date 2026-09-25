import React, { useState, useEffect } from 'react';
import { Building } from 'react-bootstrap-icons';

export const ProveedorFormModal = ({ show, onClose, onSave, proveedor }) => {
  
  const initialState = {
    codigo: '',
    nit_empresa: '',
    nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
    estado: 'Activo'
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (proveedor) {
      setFormData({ ...initialState, ...proveedor });
    } else {
      setFormData(initialState);
    }
  }, [proveedor, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = proveedor ? formData : { ...formData, estado: 'Activo' };
    onSave(dataToSave);
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
              <Building size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              {proveedor && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>Código</label>
                  <input type="text" className="form-control" disabled value={formData.codigo || ''} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }} />
                </div>
              )}

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">NIT / Documento</label>
                  <input
                    type="text"
                    name="nit_empresa"
                    className="form-control shadow-none"
                    placeholder="900123456-1"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.nit_empresa || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Nombre de la Empresa</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    className="form-control shadow-none"
                    placeholder="Ej: Distribuidora de Licores"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    required
                    className="form-control shadow-none"
                    placeholder="3101234567"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Correo Electrónico</label>
                  <input
                    type="email"
                    name="correo"
                    required
                    className="form-control shadow-none"
                    placeholder="correo@ejemplo.com"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.correo}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-text small" style={{ color: styles.mutedColor }}>
                Los contactos de este proveedor (uno o varios, con un principal) se administran desde el detalle del proveedor una vez guardado.
              </div>

              <div>
                <label className="form-label small fw-semibold">Dirección</label>
                <textarea
                  name="direccion"
                  rows="2"
                  className="form-control shadow-none"
                  placeholder="Calle 45 # 12-34, Medellín"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.direccion || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {proveedor ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};