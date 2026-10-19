import React, { useState, useEffect } from 'react';
import { BoxSeam } from 'react-bootstrap-icons';
import { Field, useFormValidation } from '../../components/common/Field';
import { useApi } from '../../hooks/useApi';
import { MoneyInput } from '../../components/common/MoneyInput';
import { showAlert } from '../../utils/alerts';

const CODIGO_REGEX = /^[A-Z0-9-]{3,30}$/;

export const ProductoFormModal = ({ show, onClose, onSave, producto }) => {
  // Catálogos desde la API; en edición también el detalle del producto
  // (proveedores asociados y costo de la última compra registrada).
  const { data: categorias } = useApi(show ? '/categorias' : null, []);
  const { data: unidadesMedida } = useApi(show ? '/unidades-medida' : null, []);
  const { data: proveedores } = useApi(show ? '/proveedores?estado=true' : null, []);
  const { data: detalle } = useApi(show && producto ? `/productos/${producto.id_producto}` : null);
  const [nitsSeleccionados, setNitsSeleccionados] = useState([]);

  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
    id_categoria: '',
    id_unidad_medida: '',
    precioVenta: '',
    margenPersonalizado: '',
    maneja_vencimiento: true,
    stockMinimo: ''
  };

  const [formData, setFormData] = useState(initialState);
  const { errors, formProps, resetErrors } = useFormValidation();

  useEffect(() => {
    setFormData(producto ? {
      codigo: producto.id_producto,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      id_categoria: producto.id_categoria,
      id_unidad_medida: producto.id_unidad_medida,
      precioVenta: producto.precio_venta_actual,
      margenPersonalizado: producto.margen_personalizado_porcentaje ?? '',
      maneja_vencimiento: producto.maneja_vencimiento,
      stockMinimo: producto.stock_minimo
    } : initialState);
    setNitsSeleccionados([]);
    resetErrors();
  }, [producto, show]);

  // Los proveedores asociados llegan con el detalle del producto.
  useEffect(() => {
    if (detalle && detalle.id_producto === producto?.id_producto) {
      setNitsSeleccionados(detalle.proveedores.map((p) => p.id_proveedor));
    }
  }, [detalle, producto]);

  if (!show) return null;

  // Precio sugerido = costo de referencia (última compra REGISTRADA del
  // producto) + margen (personalizado o de la categoría) + IVA de la categoría,
  // porque precio_venta_actual es el precio final al cliente. Solo sugiere.
  const cat = categorias.find((c) => c.id_categoria === formData.id_categoria);
  const margen = formData.margenPersonalizado !== '' && formData.margenPersonalizado != null
    ? Number(formData.margenPersonalizado)
    : cat?.margen_defecto_porcentaje;
  const costoRef = producto && detalle?.costo_referencia != null ? Number(detalle.costo_referencia) : null;
  const precioSugerido = costoRef != null && margen != null
    ? Math.round(costoRef * (1 + margen / 100) * (1 + (cat?.porcentaje_iva ?? 19) / 100))
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // id_producto ES el código (SKU) del negocio. Vacío = el backend genera
    // PROD-NN (CU_03_02). Formato igual a ck_producto_codigo.
    const codigo = (formData.codigo || '').trim().toUpperCase();
    if (!producto && codigo && !CODIGO_REGEX.test(codigo)) {
      showAlert.error('Código inválido', 'El código (SKU) debe tener entre 3 y 30 caracteres: solo letras mayúsculas, números y guiones.');
      return;
    }
    if (formData.precioVenta === '' || !(Number(formData.precioVenta) >= 0)) {
      showAlert.error('Precio inválido', 'El precio de venta debe ser un número mayor o igual a 0.');
      return;
    }
    if (nitsSeleccionados.length === 0) {
      showAlert.error('Faltan proveedores', 'Un producto debe estar asociado a al menos un proveedor.');
      return;
    }
    onSave({
      ...(producto || !codigo ? {} : { id_producto: codigo }),
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      id_categoria: formData.id_categoria,
      id_unidad_medida: formData.id_unidad_medida,
      precio_venta_actual: Number(formData.precioVenta),
      margen_personalizado_porcentaje: formData.margenPersonalizado === '' ? null : Number(formData.margenPersonalizado),
      maneja_vencimiento: Boolean(formData.maneja_vencimiento),
      stock_minimo: Number(formData.stockMinimo || 0),
      proveedores: nitsSeleccionados
    });
  };

  const handleToggleProveedor = (nit) => {
    setNitsSeleccionados((prev) =>
      prev.includes(nit) ? prev.filter((n) => n !== nit) : [...prev, nit]
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
              <BoxSeam size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>
          
          <form {...formProps(handleSubmit)}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div className="row g-3">
                <Field className="col-5" label="Código (SKU)" error={errors.codigo}>
                  <input type="text" name="codigo" disabled={Boolean(producto)} className="form-control shadow-none text-uppercase" placeholder="Automático"
                    style={{ ...inputStyle, color: producto ? styles.mutedColor : styles.textColor }} value={formData.codigo || ''} onChange={handleChange} />
                </Field>
                <Field className="col-7" label="Nombre del Producto" required error={errors.nombre}>
                  <input type="text" name="nombre" required className="form-control shadow-none" placeholder="Ej: Whisky Old Parr" style={inputStyle} value={formData.nombre} onChange={handleChange} />
                </Field>
              </div>

              <Field label="Descripción" error={errors.descripcion}>
                <textarea name="descripcion" rows="2" className="form-control shadow-none" placeholder="Marca, origen, notas" style={inputStyle} value={formData.descripcion || ''} onChange={handleChange} />
              </Field>

              <div className="row g-3">
                <Field className="col-6" label="Categoría" required error={errors.id_categoria}>
                  <select name="id_categoria" className="form-select shadow-none" required style={inputStyle} value={formData.id_categoria} onChange={handleChange}>
                    <option value="">Seleccione...</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field className="col-6" label="Unidad de Medida" required error={errors.id_unidad_medida}>
                  <select name="id_unidad_medida" className="form-select shadow-none" required style={inputStyle} value={formData.id_unidad_medida} onChange={handleChange}>
                    <option value="">Seleccione...</option>
                    {unidadesMedida.map((um) => (
                      <option key={um.id_unidad_medida} value={um.id_unidad_medida}>{um.nombre}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="row g-3">
                <Field className="col-6" label="Precio de Venta" required error={errors.precioVenta}>
                  <MoneyInput
                    name="precioVenta"
                    required
                    placeholder="0"
                    style={inputStyle}
                    value={formData.precioVenta}
                    onChange={(val) => setFormData((prev) => ({ ...prev, precioVenta: val }))}
                  />
                  {precioSugerido != null && (
                    <div className="form-text small d-flex flex-wrap align-items-center gap-2" style={{ color: styles.mutedColor }}>
                      <span>Sugerido: ${precioSugerido.toLocaleString('es-CO')}</span>
                      <button type="button" className="btn btn-sm btn-outline-secondary py-0" onClick={() => setFormData((prev) => ({ ...prev, precioVenta: precioSugerido }))}>
                        Aplicar
                      </button>
                    </div>
                  )}
                </Field>
                <Field className="col-6" label="Stock Mínimo" required error={errors.stockMinimo}>
                  <input type="number" name="stockMinimo" min="0" required className="form-control shadow-none" placeholder="0" style={inputStyle} value={formData.stockMinimo} onChange={handleChange} />
                </Field>
              </div>

              <div className="row g-3">
                <Field className="col-6" label="Margen personalizado (%)" error={errors.margenPersonalizado}>
                  <input
                    type="number"
                    name="margenPersonalizado"
                    min="0"
                    step="0.01"
                    className="form-control shadow-none"
                    placeholder={cat ? `Categoría: ${cat.margen_defecto_porcentaje}%` : 'Seleccione categoría'}
                    style={inputStyle}
                    value={formData.margenPersonalizado}
                    onChange={handleChange}
                  />
                </Field>
                <div className="col-6">
                  <label className="form-label small fw-semibold">% IVA (de la categoría)</label>
                  <input
                    type="text"
                    disabled
                    className="form-control"
                    value={cat ? `${cat.porcentaje_iva}%` : '—'}
                    style={{ ...inputStyle, color: styles.mutedColor }}
                  />
                </div>
              </div>

              <div
                className="p-3 rounded-3 d-flex align-items-center justify-content-between gap-3"
                style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}
              >
                <div className="fw-semibold small">Maneja vencimiento / lote</div>
                <div className="form-check form-switch m-0 flex-shrink-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    name="maneja_vencimiento"
                    style={{ width: '2.6rem', height: '1.4rem', cursor: 'pointer' }}
                    checked={Boolean(formData.maneja_vencimiento)}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">
                  Proveedores que surten este producto <span style={{ color: 'var(--brand-danger)' }}>*</span> <span className="fw-normal" style={{ color: styles.mutedColor }}>(mínimo uno)</span>
                </label>
                <div
                  className="rounded-3 p-2"
                  style={{ border: `1px solid ${styles.borderCol}`, backgroundColor: styles.inputBg, maxHeight: '160px', overflowY: 'auto' }}
                >
                  {proveedores.length === 0 ? (
                    <div className="small" style={{ color: styles.mutedColor }}>No hay proveedores activos registrados.</div>
                  ) : (
                    proveedores.map((prov) => (
                      <div className="form-check small" key={prov.id_proveedor}>
                        <input
                          id={`prov-${prov.id_proveedor}`}
                          type="checkbox"
                          className="form-check-input"
                          checked={nitsSeleccionados.includes(prov.id_proveedor)}
                          onChange={() => handleToggleProveedor(prov.id_proveedor)}
                        />
                        <label htmlFor={`prov-${prov.id_proveedor}`} className="form-check-label">{prov.razon_social}</label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {producto ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};