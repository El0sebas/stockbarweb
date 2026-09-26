import React, { useState, useEffect } from 'react';
import { Building } from 'react-bootstrap-icons';

export const ProveedorFormModal = ({ show, onClose, onSave, proveedor }) => {

  const initialState = {
    codigo: '',
    nit: '',
    razon_social: '',
    nombre_comercial: '',
    ciudad: '',
    direccion: '',
    telefono_principal: '',
    correo_principal: '',
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
                  <label className="form-label small fw-semibold">NIT</label>
                  <input
                    type="text"
                    name="nit"
                    required
                    className="form-control shadow-none"
                    placeholder="900123456-1"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.nit || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Razón Social</label>
                  <input
                    type="text"
                    name="razon_social"
                    required
                    className="form-control shadow-none"
                    placeholder="Ej: Distribuidora de Licores S.A.S."
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.razon_social}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">Nombre Comercial (opcional)</label>
                <input
                  type="text"
                  name="nombre_comercial"
                  className="form-control shadow-none"
                  placeholder="Ej: Distrilicores"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.nombre_comercial || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Ciudad</label>
                  <input
                    type="text"
                    name="ciudad"
                    className="form-control shadow-none"
                    placeholder="Medellín"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.ciudad || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    className="form-control shadow-none"
                    placeholder="Calle 45 # 12-34"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.direccion || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Teléfono Principal</label>
                  <input
                    type="text"
                    name="telefono_principal"
                    required
                    className="form-control shadow-none"
                    placeholder="3101234567"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.telefono_principal}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Correo Principal</label>
                  <input
                    type="email"
                    name="correo_principal"
                    required
                    className="form-control shadow-none"
                    placeholder="correo@ejemplo.com"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.correo_principal}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-text small" style={{ color: styles.mutedColor }}>
                Los contactos de este proveedor (uno o varios, con un principal) se administran desde el detalle del proveedor una vez guardado.
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
