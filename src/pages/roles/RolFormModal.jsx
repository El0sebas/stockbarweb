import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'react-bootstrap-icons';

export const RolFormModal = ({ show, onClose, onSave, rol }) => {
  
  // Alineado con los 10 subprocesos del sistema (ver docs/ARQUITECTURA.md, sección 2).
  const availablePermissions = ['Roles', 'Usuarios', 'Categorías', 'Productos', 'Proveedores', 'Compras', 'Clientes', 'Ventas', 'Reportes'];

  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
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
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (permiso) => {
    setFormData(prev => {
      const exists = prev.permisos.includes(permiso);
      const nuevosPermisos = exists 
        ? prev.permisos.filter(p => p !== permiso)
        : [...prev.permisos, permiso];
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
                  placeholder="Ej: Supervisor de Caja"
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
                  rows="2" 
                  placeholder="Breve detalle de las funciones del rol..."
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                  value={formData.descripcion} 
                  onChange={handleChange}
                ></textarea>
              </div>

              <div>
                <label className="form-label small fw-semibold mb-2">Permisos de Módulos</label>
                <div className="d-flex flex-column gap-2 p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  {availablePermissions.map(permiso => (
                    <div className="form-check" key={permiso}>
                      <input 
                        className="form-check-input shadow-none" 
                        type="checkbox" 
                        id={`perm-${permiso}`}
                        checked={formData.permisos.includes(permiso)}
                        onChange={() => handleCheckboxChange(permiso)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label small" htmlFor={`perm-${permiso}`} style={{ cursor: 'pointer' }}>
                        Acceso a <span className="fw-semibold">{permiso}</span>
                      </label>
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