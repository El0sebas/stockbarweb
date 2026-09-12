import React, { useState, useEffect } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultRoles } from '../../data/defaultRoles';

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
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <div className="row g-3">
                {/* Documento */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>
                    Documento de Identidad *
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    name="documento"
                    required
                    value={formData.documento}
                    onChange={handleChange}
                    placeholder="Ej. 1098765432"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>

                {/* Nombre Completo */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Carlos Andrés Gómez"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>

                {/* Email */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    className="form-control shadow-none"
                    name="correo"
                    required
                    value={formData.correo}
                    onChange={handleChange}
                    placeholder="carlos@stockbar.com"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>

                {/* Teléfono */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>
                    Teléfono *
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Ej. 3101234567"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>

                {/* Rol */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>
                    Rol de Sistema *
                  </label>
                  <select
                    className="form-select shadow-none"
                    name="rol"
                    value={formData.rol}
                    onChange={handleChange}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  >
                    {roles.map((rol) => (
                      <option key={rol.codigo} value={rol.nombre}>{rol.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Contraseña */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>
                    Contraseña {usuario ? '(Dejar vacía para conservar)' : '*'}
                  </label>
                  <input
                    type="password"
                    className="form-control shadow-none"
                    name="password"
                    required={!usuario}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>
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