import React, { useState, useEffect } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultRoles } from '../../data/defaultRoles';
import { Field, useFormValidation } from '../../components/common/Field';

const emptyForm = {
  documento: '',
  nombre: '',
  correo: '',
  telefono: '',
  rol: '',
  password: ''
};

export const UsuarioFormModal = ({ show, onClose, onSave, usuario }) => {
  // Mismo storage que RolesPage: el selector de rol siempre refleja los roles
  // que realmente existen en el catálogo, no una lista fija desconectada de él.
  const [roles] = usePersistentState('stockbar_roles', defaultRoles);

  const [formData, setFormData] = useState(emptyForm);
  const { errors, formProps, resetErrors } = useFormValidation();

  useEffect(() => {
    if (usuario) {
      setFormData({
        documento: usuario.documento || '',
        nombre: usuario.nombre || '',
        correo: usuario.correo || '',
        telefono: usuario.telefono || '',
        rol: usuario.rol || roles[0]?.nombre || '',
        password: ''
      });
    } else {
      setFormData({ ...emptyForm, rol: roles[0]?.nombre || '' });
    }
    resetErrors();
  }, [usuario, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    // En edición, dejar la contraseña vacía conserva la actual (no se sobrescribe).
    if (usuario && !payload.password) {
      delete payload.password;
    }
    onSave(payload);
  };

  const styles = {
    bgModal: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };
  const inputStyle = { backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)' }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div
          className="modal-content border-0 shadow-lg rounded-3"
          style={{ backgroundColor: styles.bgModal, color: styles.textColor }}
        >
          {/* Header */}
          <div className="modal-header border-bottom py-3 px-4" style={{ borderColor: styles.borderCol }}>
            <h5 className="modal-title fw-bold">
              {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h5>
            <button
              type="button"
              className="btn-close shadow-none btn-close-themed"
              onClick={onClose}
            ></button>
          </div>

          {/* Formulario */}
          <form {...formProps(handleSubmit)}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div className="small fw-bold text-uppercase" style={{ color: styles.mutedColor }}>Información personal</div>
              <div className="row g-3">
                <Field className="col-12 col-md-6" label="Documento de Identidad" required error={errors.documento}>
                  <input type="text" className="form-control shadow-none" name="documento" required value={formData.documento} onChange={handleChange} placeholder="Ej. 1098765432" style={inputStyle} />
                </Field>
                <Field className="col-12 col-md-6" label="Nombre Completo" required error={errors.nombre}>
                  <input type="text" className="form-control shadow-none" name="nombre" required value={formData.nombre} onChange={handleChange} placeholder="Ej. Carlos Andrés Gómez" style={inputStyle} />
                </Field>
              </div>

              <div className="small fw-bold text-uppercase mt-2" style={{ color: styles.mutedColor }}>Contacto</div>
              <div className="row g-3">
                <Field className="col-12 col-md-6" label="Correo Electrónico" required error={errors.correo}>
                  <input type="email" className="form-control shadow-none" name="correo" required value={formData.correo} onChange={handleChange} placeholder="carlos@stockbar.com" style={inputStyle} />
                </Field>
                <Field className="col-12 col-md-6" label="Teléfono" required error={errors.telefono}>
                  <input type="text" className="form-control shadow-none" name="telefono" required value={formData.telefono} onChange={handleChange} placeholder="Ej. 3101234567" style={inputStyle} />
                </Field>
              </div>

              <div className="small fw-bold text-uppercase mt-2" style={{ color: styles.mutedColor }}>Acceso al sistema</div>
              <div className="row g-3">
                <Field className="col-12 col-md-6" label="Rol de Sistema" required error={errors.rol}>
                  <select className="form-select shadow-none" name="rol" required value={formData.rol} onChange={handleChange} style={inputStyle}>
                    {roles.map((rol) => (
                      <option key={rol.codigo} value={rol.nombre}>{rol.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field className="col-12 col-md-6" label={usuario ? 'Contraseña (vacía = conservar)' : 'Contraseña'} required={!usuario} error={errors.password}>
                  <input type="password" className="form-control shadow-none" name="password" required={!usuario} value={formData.password} onChange={handleChange} placeholder="••••••••" style={inputStyle} />
                </Field>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-top py-3 px-4" style={{ borderColor: styles.borderCol }}>
              <button
                type="button"
                className="btn btn-sm px-3 fw-semibold"
                style={{ backgroundColor: 'transparent', color: styles.mutedColor, border: `1px solid ${styles.borderCol}` }}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-sm px-4 fw-semibold text-white"
                style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}
              >
                {usuario ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};