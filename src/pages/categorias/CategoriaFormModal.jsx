import React, { useState, useEffect } from 'react';
import { Tag } from 'react-bootstrap-icons';
import { Field, useFormValidation } from '../../components/common/Field';

export const CategoriaFormModal = ({ show, onClose, onSave, categoria }) => {
  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
    margen_defecto_porcentaje: '',
    porcentaje_iva: 19,
    requiere_verificacion_edad: false
  };

  const [formData, setFormData] = useState(initialState);
  const { errors, formProps, resetErrors } = useFormValidation();

  useEffect(() => {
    if (categoria) {
      setFormData(categoria);
    } else {
      setFormData(initialState);
    }
    resetErrors();
  }, [categoria, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
              <Tag size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{categoria ? 'Editar Categoría' : 'Nueva Categoría'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <form {...formProps(handleSubmit)}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              {categoria && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>Código</label>
                  <input type="text" className="form-control" disabled value={formData.codigo || ''} style={{ ...inputStyle, color: styles.mutedColor }} />
                </div>
              )}

              <Field label="Nombre de la Categoría" required error={errors.nombre}>
                <input type="text" name="nombre" required className="form-control shadow-none" placeholder="Ej: Licores" style={inputStyle} value={formData.nombre} onChange={handleChange} />
              </Field>

              <Field label="Descripción" error={errors.descripcion}>
                <textarea name="descripcion" className="form-control shadow-none" rows="2" placeholder="Qué productos incluye" style={inputStyle} value={formData.descripcion} onChange={handleChange}></textarea>
              </Field>

              <div className="row g-3">
                <Field className="col-6" label="Margen por defecto (%)" required error={errors.margen_defecto_porcentaje}>
                  <input type="number" name="margen_defecto_porcentaje" min="0" step="0.01" required className="form-control shadow-none" placeholder="Ej: 35" style={inputStyle} value={formData.margen_defecto_porcentaje} onChange={handleChange} />
                </Field>
                <Field className="col-6" label="% IVA al cliente" required error={errors.porcentaje_iva}>
                  <input type="number" name="porcentaje_iva" min="0" max="100" step="0.01" required className="form-control shadow-none" placeholder="19" style={inputStyle} value={formData.porcentaje_iva ?? 19} onChange={handleChange} />
                </Field>
              </div>

              <div
                className="p-3 rounded-3 d-flex align-items-center justify-content-between gap-3"
                style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}
              >
                <div className="fw-semibold small">Requiere verificación de edad (+18)</div>
                <div className="form-check form-switch m-0 flex-shrink-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    name="requiere_verificacion_edad"
                    style={{ width: '2.6rem', height: '1.4rem', cursor: 'pointer' }}
                    checked={Boolean(formData.requiere_verificacion_edad)}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {categoria ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};