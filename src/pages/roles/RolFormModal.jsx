import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'react-bootstrap-icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultPermisos } from '../../data/defaultPermisos';
import { showAlert } from '../../utils/alerts';

export const RolFormModal = ({ show, onClose, onSave, rol }) => {
  // Catálogo real de permiso (scripts/sch.sql) — nunca nombres de módulo
  // inventados. Editable solo desde este catálogo, no hardcodeado aquí.
  const [permisos] = usePersistentState('stockbar_permisos', defaultPermisos);
  const modulos = [...new Set(permisos.map((p) => p.modulo))];

  // Sin descripcion: rol no tiene esa columna (decisión explícita del
  // negocio, aunque la matriz de historias de usuario la mencione).
  const initialState = {
    codigo: '',
    nombre: '',
    permisos: []
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (rol) {
      setFormData(rol);
    } else {
      setFormData(initialState);
    }
  }, [rol, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Regla de la capa de aplicación (no de la BD: los permisos se asignan
    // en una operación aparte en rol_permiso) — un rol no se crea/actualiza
    // sin al menos un permiso.
    if (formData.permisos.length === 0) {
      showAlert.error('Faltan permisos', 'Un rol debe tener al menos un permiso asignado.');
      return;
    }
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (nombrePermiso) => {
    setFormData(prev => {
      const exists = prev.permisos.includes(nombrePermiso);
      const nuevosPermisos = exists
        ? prev.permisos.filter(p => p !== nombrePermiso)
        : [...prev.permisos, nombrePermiso];
      return { ...prev, permisos: nuevosPermisos };
    });
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
              <ShieldCheck size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{rol ? 'Editar Rol' : 'Nuevo Rol'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              {rol && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>Código</label>
                  <input type="text" className="form-control" disabled value={formData.codigo || ''} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }} />
                </div>
              )}

              <div>
                <label className="form-label small fw-semibold">Nombre del Rol</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  className="form-control shadow-none"
                  placeholder="Ej: SUPERVISOR_CAJA"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.nombre}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="form-label small fw-semibold mb-2">Permisos (rol_permiso)</label>
                <div className="d-flex flex-column gap-3 p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  {modulos.map((modulo) => (
                    <div key={modulo}>
                      <div className="small fw-bold mb-1" style={{ color: 'var(--amber-action)' }}>{modulo}</div>
                      {permisos.filter((p) => p.modulo === modulo).map((permiso) => (
                        <div className="form-check" key={permiso.id_permiso}>
                          <input
                            className="form-check-input shadow-none"
                            type="checkbox"
                            id={`perm-${permiso.id_permiso}`}
                            checked={formData.permisos.includes(permiso.nombre)}
                            onChange={() => handleCheckboxChange(permiso.nombre)}
                            style={{ cursor: 'pointer' }}
                          />
                          <label className="form-check-label small" htmlFor={`perm-${permiso.id_permiso}`} style={{ cursor: 'pointer' }}>
                            {permiso.nombre}
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {rol ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
