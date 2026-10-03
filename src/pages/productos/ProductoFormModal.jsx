import React, { useState, useEffect } from 'react';
import { BoxSeam } from 'react-bootstrap-icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultCategorias } from '../../data/defaultCategorias';
import { defaultUnidadesMedida } from '../../data/defaultUnidadesMedida';
import { defaultLotes } from '../../data/defaultLotes';
import { defaultCompras } from '../../data/defaultCompras';
import { defaultDetalleCompra } from '../../data/defaultDetalleCompra';
import { MoneyInput } from '../../components/common/MoneyInput';
import { showAlert } from '../../utils/alerts';

const CODIGO_REGEX = /^[A-Z0-9-]{3,30}$/;

export const ProductoFormModal = ({ show, onClose, onSave, producto, productos = [] }) => {
  // Mismo catálogo que CategoriasPage: crear una categoría nueva la hace
  // aparecer aquí de inmediato, en vez de mantener una lista fija aparte.
  const [categorias] = usePersistentState('stockbar_categorias', defaultCategorias);
  const [unidadesMedida] = usePersistentState('stockbar_unidades_medida', defaultUnidadesMedida);

  const [lotes] = usePersistentState('stockbar_lotes', defaultLotes);
  const [compras] = usePersistentState('stockbar_compras', defaultCompras);
  const [detalleCompra] = usePersistentState('stockbar_detalle_compra', defaultDetalleCompra);

  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad_medida: '',
    precioVenta: '',
    margenPersonalizado: '',
    maneja_vencimiento: false,
    stockMinimo: '',
    estado: 'Activo'
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    setFormData(producto ? producto : { ...initialState, estado: 'Activo' });
  }, [producto, show]);

  if (!show) return null;

  // Precio sugerido = costo de referencia (última compra REGISTRADA del
  // producto) + margen (personalizado o de la categoría) + IVA de la categoría,
  // porque precio_venta_actual es el precio final al cliente. Solo sugiere.
  const cat = categorias.find((c) => c.nombre === formData.categoria);
  const margen = formData.margenPersonalizado !== '' && formData.margenPersonalizado != null
    ? Number(formData.margenPersonalizado)
    : cat?.margen_defecto_porcentaje;
  const lotesProd = new Set(lotes.filter((l) => l.id_producto === producto?.codigo).map((l) => l.id_lote));
  const registradas = new Set(compras.filter((c) => c.estado === 'REGISTRADA').map((c) => c.id_compra));
  const ultimaCompra = detalleCompra
    .filter((d) => lotesProd.has(d.id_lote) && registradas.has(d.id_compra))
    .map((d) => ({ ...d, fecha: compras.find((c) => c.id_compra === d.id_compra)?.fecha_compra || '' }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const costoRef = ultimaCompra ? Number(ultimaCompra.precio_unitario_compra) : null;
  const precioSugerido = costoRef != null && margen != null
    ? Math.round(costoRef * (1 + margen / 100) * (1 + (cat?.porcentaje_iva ?? 19) / 100))
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // v3: id_producto ES el código (SKU) del negocio — lo asigna el usuario,
    // la app no lo inventa. Formato validado igual que ck_producto_codigo.
    const codigo = (formData.codigo || '').trim().toUpperCase();
    if (!CODIGO_REGEX.test(codigo)) {
      showAlert.error('Código inválido', 'El código (SKU) debe tener entre 3 y 30 caracteres: solo letras mayúsculas, números y guiones.');
      return;
    }
    const yaExiste = productos.some((p) => p.codigo === codigo && p.codigo !== producto?.codigo);
    if (yaExiste) {
      showAlert.error('Código duplicado', 'Ya existe un producto registrado con ese código.');
      return;
    }
    if (!(Number(formData.precioVenta) >= 0) || formData.precioVenta === '') {
      showAlert.error('Precio inválido', 'El precio de venta debe ser un número mayor o igual a 0.');
      return;
    }
    const dataToSave = producto ? { ...formData, codigo } : { ...formData, codigo, estado: 'Activo' };
    onSave(dataToSave);
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
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Código (SKU)</label>
                <input
                  type="text"
                  name="codigo"
                  required
                  disabled={Boolean(producto)}
                  className="form-control shadow-none text-uppercase"
                  placeholder="Ej: TEQ-DJ-750"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: producto ? styles.mutedColor : styles.textColor }}
                  value={formData.codigo || ''}
                  onChange={handleChange}
                />
                <div className="form-text small" style={{ color: styles.mutedColor }}>
                  El código del negocio (SKU). Letras mayúsculas, números y guiones; no se puede cambiar después de creado.
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">Nombre del Producto</label>
                <input 
                  type="text" 
                  name="nombre"
                  required 
                  className="form-control shadow-none" 
                  placeholder="Ej: Whisky Old Parr"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                  value={formData.nombre} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label className="form-label small fw-semibold">Descripción</label>
                <textarea
                  name="descripcion"
                  rows="3"
                  className="form-control shadow-none"
                  placeholder="Describe el producto, marca, origen y notas relevantes"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.descripcion || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Categoría</label>
                  <select 
                    name="categoria"
                    className="form-select shadow-none"
                    required
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} 
                    value={formData.categoria} 
                    onChange={handleChange}
                  >
                    <option value="">Seleccione...</option>
                    {categorias.map((cat) => (
                      <option key={cat.codigo} value={cat.nombre}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Unidad de Medida</label>
                  <select
                    name="unidad_medida"
                    className="form-select shadow-none"
                    required
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.unidad_medida}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione...</option>
                    {unidadesMedida.map((um) => (
                      <option key={um.id_unidad_medida} value={um.nombre}>{um.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">Precio de Venta</label>
                <MoneyInput
                  required
                  placeholder="0"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.precioVenta}
                  onChange={(val) => setFormData((prev) => ({ ...prev, precioVenta: val }))}
                />
                <div className="form-text small d-flex flex-wrap align-items-center gap-2" style={{ color: styles.mutedColor }}>
                  {precioSugerido != null ? (
                    <>
                      <span>
                        Sugerido: ${precioSugerido.toLocaleString('es-CO')} (costo ${costoRef.toLocaleString('es-CO')} + {margen}% margen + IVA)
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0"
                        onClick={() => setFormData((prev) => ({ ...prev, precioVenta: precioSugerido }))}
                      >
                        Aceptar sugerencia
                      </button>
                    </>
                  ) : (
                    <span>Sin sugerencia: el producto aún no tiene compras registradas. Ingrese el precio manualmente.</span>
                  )}
                  {producto && <span>· Precio actual: ${Number(producto.precioVenta || 0).toLocaleString('es-CO')}</span>}
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Stock Mínimo</label>
                  <input
                    type="number"
                    name="stockMinimo"
                    required
                    className="form-control shadow-none"
                    placeholder="0"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    value={formData.stockMinimo}
                    onChange={handleChange}
                  />
                  <div className="form-text small" style={{ color: styles.mutedColor }}>
                    El stock actual no se edita aquí: siempre se calcula desde los lotes registrados en Compras.
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">% IVA (según categoría)</label>
                  <input
                    type="text"
                    disabled
                    className="form-control"
                    value={
                      formData.categoria
                        ? `${categorias.find((c) => c.nombre === formData.categoria)?.porcentaje_iva ?? 19}%`
                        : 'Seleccione una categoría'
                    }
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold">Margen de ganancia personalizado (%)</label>
                <input
                  type="number"
                  name="margenPersonalizado"
                  min="0"
                  step="0.01"
                  className="form-control shadow-none"
                  placeholder={
                    formData.categoria
                      ? `Vacío = usa el ${categorias.find((c) => c.nombre === formData.categoria)?.margen_defecto_porcentaje ?? 0}% de la categoría`
                      : 'Seleccione una categoría'
                  }
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.margenPersonalizado}
                  onChange={handleChange}
                />
                <div className="form-text small" style={{ color: styles.mutedColor }}>
                  Opcional. Si lo dejas vacío, este producto hereda el margen por defecto de su categoría.
                </div>
              </div>

              <div
                className="p-3 rounded-3 d-flex align-items-center justify-content-between gap-3"
                style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}
              >
                <div>
                  <div className="fw-semibold small">Maneja vencimiento / lote</div>
                  <div className="small" style={{ color: styles.mutedColor }}>
                    Solo exige fecha de vencimiento cuando este producto entre en un lote nuevo desde Compras. No crea lotes desde aquí.
                  </div>
                </div>
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