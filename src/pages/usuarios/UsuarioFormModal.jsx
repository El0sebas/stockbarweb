import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Field, useFormValidation } from '../../components/common/Field';

const emptyForm = {
  tipo_documento: 'CC',
  numero_documento: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  id_rol: '',
  contrasena: ''
};

export const UsuarioFormModal = ({ show, onClose, onSave, usuario }) => {
  // Solo roles activos: un usuario no se asigna a un rol desactivado.
  const { data: todosRoles } = useApi(show ? '/roles' : null, []);
  const roles = todosRoles.filter((r) => r.estado || r.id_rol === usuario?.id_rol);

  const [formData, setFormData] = useState(emptyForm);
  const { errors, formProps, resetErrors } = useFormValidation();

  useEffect(() => {
    if (usuario) {
      setFormData({
        tipo_documento: usuario.tipo_documento,
        numero_documento: usuario.numero_documento,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono || '',
        id_rol: usuario.id_rol,
        contrasena: ''
      });
    } else {
      setFormData(emptyForm);
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
    if (usuario && !payload.contrasena) {
      delete payload.contrasena;
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
                <Field className="col-12 col-md-4" label="Tipo de Documento" required error={errors.tipo_documento}>
                  <select className="form-select shadow-none" name="tipo_documento" required value={formData.tipo_documento} onChange={handleChange} style={inputStyle}>
                    {['CC', 'CE', 'TI', 'PAS', 'NIT'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field className="col-12 col-md-8" label="Número de Documento" required error={errors.numero_documento}>
                  <input type="text" className="form-control shadow-none" name="numero_documento" required maxLength={20} value={formData.numero_documento} onChange={handleChange} placeholder="Ej. 1098765432" style={inputStyle} />
                </Field>
                <Field className="col-12 col-md-6" label="Nombres" required error={errors.nombres}>
                  <input type="text" className="form-control shadow-none" name="nombres" required maxLength={60} value={formData.nombres} onChange={handleChange} placeholder="Ej. Carlos Andrés" style={inputStyle} />
                </Field>
                <Field className="col-12 col-md-6" label="Apellidos" required error={errors.apellidos}>
                  <input type="text" className="form-control shadow-none" name="apellidos" required maxLength={60} value={formData.apellidos} onChange={handleChange} placeholder="Ej. Gómez" style={inputStyle} />
                </Field>
              </div>

              <div className="small fw-bold text-uppercase mt-2" style={{ color: styles.mutedColor }}>Contacto</div>
              <div className="row g-3">
                <Field className="col-12 col-md-6" label="Correo Electrónico" required error={errors.correo}>
                  <input type="email" className="form-control shadow-none" name="correo" required value={formData.correo} onChange={handleChange} placeholder="carlos@stockbar.com" style={inputStyle} />
                </Field>
                <Field className="col-12 col-md-6" label="Teléfono" error={errors.telefono}>
                  <input type="text" className="form-control shadow-none" name="telefono" maxLength={20} value={formData.telefono} onChange={handleChange} placeholder="Ej. 3101234567" style={inputStyle} />
                </Field>
              </div>

              <div className="small fw-bold text-uppercase mt-2" style={{ color: styles.mutedColor }}>Acceso al sistema</div>
              <div className="row g-3">
                <Field className="col-12 col-md-6" label="Rol de Sistema" required error={errors.id_rol}>
                  <select className="form-select shadow-none" name="id_rol" required value={formData.id_rol} onChange={handleChange} disabled={usuario?.es_admin_principal} style={inputStyle}>
                    <option value="">Seleccione...</option>
                    {roles.map((rol) => (
                      <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field className="col-12 col-md-6" label={usuario ? 'Contraseña (vacía = conservar)' : 'Contraseña'} required={!usuario} error={errors.contrasena}>
                  <input type="password" className="form-control shadow-none" name="contrasena" required={!usuario} minLength={8} autoComplete="new-password" title="Mínimo 8 caracteres, con al menos una letra y un número" value={formData.contrasena} onChange={handleChange} placeholder="••••••••" style={inputStyle} />
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