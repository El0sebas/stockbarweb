import React, { useState, useEffect } from 'react';
import { Person } from 'react-bootstrap-icons';
import { Field, useFormValidation } from '../../components/common/Field';

export const ClienteFormModal = ({ show, onClose, onSave, cliente }) => {
  const initialState = { tipo_documento: 'CC', numero_documento: '', nombre_completo: '', telefono: '', correo: '', fecha_nacimiento: '', genero: '' };
  const [formData, setFormData] = useState(initialState);
  const { errors, formProps, resetErrors } = useFormValidation();

  useEffect(() => {
    if (cliente) {
      setFormData({
        tipo_documento: cliente.tipo_documento || 'CC',
        numero_documento: cliente.numero_documento,
        nombre_completo: cliente.nombre_completo,
        telefono: cliente.telefono || '',
        correo: cliente.correo || '',
        fecha_nacimiento: cliente.fecha_nacimiento || '',
        genero: cliente.genero || ''
      });
    } else {
      setFormData(initialState);
    }
    resetErrors();
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
  const inputStyle = { backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor };

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
          <form {...formProps(handleSubmit)}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div className="small fw-bold text-uppercase" style={{ color: styles.mutedColor }}>Información personal</div>
              <div className="row g-3">
                <Field className="col-4" label="Tipo" required error={errors.tipo_documento}>
                  <select name="tipo_documento" required className="form-select shadow-none" style={inputStyle} value={formData.tipo_documento} onChange={handleChange}>
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                    <option value="PAS">PAS</option>
                    <option value="NIT">NIT</option>
                  </select>
                </Field>
                <Field className="col-8" label="N° Documento" required error={errors.numero_documento}>
                  <input type="text" name="numero_documento" required className="form-control shadow-none" placeholder="Ej: 1017223344" style={inputStyle} value={formData.numero_documento} onChange={handleChange} />
                </Field>
              </div>
              <Field label="Nombre Completo" required error={errors.nombre_completo}>
                <input type="text" name="nombre_completo" required className="form-control shadow-none" placeholder="Ej: Andrés Pérez" style={inputStyle} value={formData.nombre_completo} onChange={handleChange} />
              </Field>
              <div className="row g-3">
                <Field className="col-7" label="Fecha de nacimiento" error={errors.fecha_nacimiento}>
                  <input type="date" name="fecha_nacimiento" className="form-control shadow-none" style={inputStyle} value={formData.fecha_nacimiento} onChange={handleChange} />
                </Field>
                <Field className="col-5" label="Género" error={errors.genero}>
                  <select name="genero" className="form-select shadow-none" style={inputStyle} value={formData.genero} onChange={handleChange}>
                    <option value="">No especifica</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </Field>
              </div>

              <div className="small fw-bold text-uppercase mt-2" style={{ color: styles.mutedColor }}>Contacto</div>
              <div className="row g-3">
                <Field className="col-6" label="Teléfono" error={errors.telefono}>
                  <input type="text" name="telefono" className="form-control shadow-none" placeholder="300 123 4567" style={inputStyle} value={formData.telefono} onChange={handleChange} />
                </Field>
                <Field className="col-6" label="Correo Electrónico" error={errors.correo}>
                  <input type="email" name="correo" className="form-control shadow-none" placeholder="correo@ejemplo.com" style={inputStyle} value={formData.correo} onChange={handleChange} />
                </Field>
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
