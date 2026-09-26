import React, { useState, useEffect } from 'react';
import { BoxSeam } from 'react-bootstrap-icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultCategorias } from '../../data/defaultCategorias';
import { defaultUnidadesMedida } from '../../data/defaultUnidadesMedida';
import { defaultProveedores } from '../../data/defaultProveedores';
import { defaultProductoProveedor } from '../../data/defaultProductoProveedor';

export const ProductoFormModal = ({ show, onClose, onSave, producto }) => {
  // Mismo catálogo que CategoriasPage: crear una categoría nueva la hace
  // aparecer aquí de inmediato, en vez de mantener una lista fija aparte.
  const [categorias] = usePersistentState('stockbar_categorias', defaultCategorias);
  const [unidadesMedida] = usePersistentState('stockbar_unidades_medida', defaultUnidadesMedida);
  const [proveedores] = usePersistentState('stockbar_proveedores', defaultProveedores);
  const [productoProveedor] = usePersistentState('stockbar_producto_proveedor', defaultProductoProveedor);

  const proveedoresActivos = proveedores.filter((p) => p.estado === 'Activo');

  const initialState = {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad_medida: '',
    precioVenta: '',
    maneja_vencimiento: false,
    stockMinimo: '',
    estado: 'Activo'
  };

  const [formData, setFormData] = useState(initialState);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);

  useEffect(() => {
    if (producto) {
      setFormData(producto);
      setProveedoresSeleccionados(
        productoProveedor
          .filter((pp) => pp.id_producto === producto.codigo && pp.estado === 'Activo')
          .map((pp) => pp.id_proveedor)
      );
    } else {
      setFormData({ ...initialState, estado: 'Activo' });
      setProveedoresSeleccionados([]);
    }
  }, [producto, show]);

  const toggleProveedor = (codigoProveedor) => {
    setProveedoresSeleccionados((prev) =>
      prev.includes(codigoProveedor)
        ? prev.filter((c) => c !== codigoProveedor)
        : [...prev, codigoProveedor]
    );
  };

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = producto ? formData : { ...formData, estado: 'Activo' };
    onSave({ ...dataToSave, proveedoresSeleccionados });
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
              {producto && (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: styles.mutedColor }}>Código</label>
                  <input type="text" className="form-control" disabled value={formData.codigo || ''} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }} />
                </div>
              )}

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
                <input
                  type="number"
                  name="precioVenta"
                  required
                  className="form-control shadow-none"
                  placeholder="0.00"
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  value={formData.precioVenta}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="form-label small fw-semibold">Proveedores</label>
                <div
                  className="p-2 rounded-3 d-flex flex-wrap gap-3"
                  style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}
                >
                  {proveedoresActivos.length === 0 ? (
                    <span className="small" style={{ color: styles.mutedColor }}>No hay proveedores activos.</span>
                  ) : (
                    proveedoresActivos.map((prov) => (
                      <div key={prov.codigo} className="form-check m-0">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`prov-${prov.codigo}`}
                          checked={proveedoresSeleccionados.includes(prov.codigo)}
                          onChange={() => toggleProveedor(prov.codigo)}
                        />
                        <label className="form-check-label small" htmlFor={`prov-${prov.codigo}`}>
                          {prov.razon_social}
                        </label>
                      </div>
                    ))
                  )}
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