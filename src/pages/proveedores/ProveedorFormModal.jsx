import React, { useState, useEffect } from 'react';
import { Building } from 'react-bootstrap-icons';
import { Field, useFormValidation } from '../../components/common/Field';

export const ProveedorFormModal = ({ show, onClose, onSave, proveedor }) => {

  const initialState = {
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
  const { errors, formProps, resetErrors } = useFormValidation();

  useEffect(() => {
    if (proveedor) {
      setFormData({ ...initialState, ...proveedor });
    } else {
      setFormData(initialState);
    }
    resetErrors();
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
  const inputStyle = { backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor };

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

          <form {...formProps(handleSubmit)}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div className="small fw-bold text-uppercase" style={{ color: styles.mutedColor }}>Información de la empresa</div>
              <div className="row g-3">
                <Field className="col-6" label="NIT" required error={errors.nit}>
                  <input type="text" name="nit" required disabled={Boolean(proveedor)} className="form-control shadow-none" placeholder="9001234561"
                    style={{ ...inputStyle, color: proveedor ? styles.mutedColor : styles.textColor }} value={formData.nit || ''} onChange={handleChange} />
                </Field>
                <Field className="col-6" label="Razón Social" required error={errors.razon_social}>
                  <input type="text" name="razon_social" required className="form-control shadow-none" placeholder="Ej: Distribuidora de Licores S.A.S." style={inputStyle} value={formData.razon_social} onChange={handleChange} />
                </Field>
              </div>
              <Field label="Nombre Comercial" error={errors.nombre_comercial}>
                <input type="text" name="nombre_comercial" className="form-control shadow-none" placeholder="Ej: Distrilicores" style={inputStyle} value={formData.nombre_comercial || ''} onChange={handleChange} />
              </Field>

              <div className="small fw-bold text-uppercase mt-2" style={{ color: styles.mutedColor }}>Contacto</div>
              <div className="row g-3">
                <Field className="col-6" label="Teléfono Principal" required error={errors.telefono_principal}>
                  <input type="text" name="telefono_principal" required className="form-control shadow-none" placeholder="3101234567" style={inputStyle} value={formData.telefono_principal} onChange={handleChange} />
                </Field>
                <Field className="col-6" label="Correo Principal" required error={errors.correo_principal}>
                  <input type="email" name="correo_principal" required className="form-control shadow-none" placeholder="correo@ejemplo.com" style={inputStyle} value={formData.correo_principal} onChange={handleChange} />
                </Field>
                <Field className="col-6" label="Ciudad" error={errors.ciudad}>
                  <input type="text" name="ciudad" className="form-control shadow-none" placeholder="Medellín" style={inputStyle} value={formData.ciudad || ''} onChange={handleChange} />
                </Field>
                <Field className="col-6" label="Dirección" error={errors.direccion}>
                  <input type="text" name="direccion" className="form-control shadow-none" placeholder="Calle 45 # 12-34" style={inputStyle} value={formData.direccion || ''} onChange={handleChange} />
                </Field>
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
