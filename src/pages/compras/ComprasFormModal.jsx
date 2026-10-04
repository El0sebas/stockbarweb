import React, { useState, useEffect } from 'react';
import { BagCheck, Trash, Pencil, Plus, Search, FileEarmarkText, Upload } from 'react-bootstrap-icons';
import { showAlert } from '../../utils/alerts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { defaultProveedores } from '../../data/defaultProveedores';
import { defaultProductos } from '../../data/defaultProductos';
import { defaultProductoProveedor } from '../../data/defaultProductoProveedor';
import { generateNextId } from '../../utils/identifiers';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { MoneyInput } from '../../components/common/MoneyInput';

export const CompraFormModal = ({ show, onClose, onSave, compra, nextFactura }) => {
  // metodo_pago es un catálogo fijo sin pantalla de administración (no es
  // un subproceso listado en la Ficha de Proyecto aprobada), igual que
  // unidad_medida y motivo_baja.
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);
  const metodosPagoActivos = metodosPago.filter((m) => m.estado === 'Activo');

  const [proveedores] = usePersistentState('stockbar_proveedores', defaultProveedores);
  const proveedoresActivos = proveedores.filter((p) => p.estado === 'Activo');
  const [productos] = usePersistentState('stockbar_productos', defaultProductos);
  const productosActivos = productos.filter((p) => p.estado === 'Activo');

  const [productoProveedor] = usePersistentState('stockbar_producto_proveedor', defaultProductoProveedor);
  const [verTodoCatalogo, setVerTodoCatalogo] = useState(false);

  const initialState = {
    proveedor: '',
    numero_factura_proveedor: '',
    id_metodo_pago: 1,
    ruta_factura: '',
    ruta_factura_url: '',
    observaciones: '',
    items: []
  };

  const [formData, setFormData] = useState(initialState);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Debounce del buscador de productos (250ms) para no filtrar en cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(productSearch), 250);
    return () => clearTimeout(timeout);
  }, [productSearch]);

  useEffect(() => {
    if (compra) {
      setFormData({ ...initialState, ...compra });
    } else {
      setFormData({
        ...initialState,
        numero_factura_proveedor: nextFactura || initialState.numero_factura_proveedor
      });
    }
    setProductSearch('');
    setSelectedProductToAdd(null);
    setCantidad(1);
    setCostoUnitario(0);
    setFechaVencimiento('');
  }, [compra, show, nextFactura]);

  if (!show) return null;

  const handleSelectProduct = (prod) => {
    setSelectedProductToAdd(prod);
    setProductSearch(prod.nombre);
    setCostoUnitario(0);
    setFechaVencimiento('');
  };

  // ponytail: mock sin backend, así que "subir" el archivo es guardar una
  // object URL local (no persiste tras recargar). Cuando exista el backend
  // real, este handler pasa a hacer un POST del archivo y guardar la ruta/URL
  // que devuelva el servidor en ruta_factura.
  const handleFacturaFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({
      ...prev,
      ruta_factura: file.name,
      ruta_factura_url: URL.createObjectURL(file)
    }));
  };

  // Una compra es de UN solo proveedor: al cambiarlo con líneas ya agregadas
  // se pide confirmación y, si acepta, se limpia el detalle.
  const handleCambiarProveedor = async (e) => {
    const nuevo = e.target.value;
    if (formData.items.length > 0 && formData.proveedor && nuevo !== formData.proveedor) {
      const ok = await showAlert.confirm('¿Desea cambiar de proveedor?', 'Se eliminarán los productos ya agregados a esta compra.');
      if (!ok) return;
    }
    setFormData((prev) => ({ ...prev, proveedor: nuevo, items: nuevo === prev.proveedor ? prev.items : [] }));
    setProductSearch('');
    setSelectedProductToAdd(null);
    setVerTodoCatalogo(false);
  };

  const handleAddItem = () => {
    if (!selectedProductToAdd || cantidad <= 0 || costoUnitario <= 0) {
      showAlert.error('Línea incompleta', 'Selecciona un producto, cantidad y costo unitario válidos.');
      return;
    }

    const requiereLote = selectedProductToAdd.maneja_vencimiento;

    if (requiereLote && !fechaVencimiento) {
      showAlert.error('Falta información del lote', 'Este producto requiere fecha de vencimiento para registrarse.');
      return;
    }

    if (requiereLote) {
      // Mirror de sp_validar_lote: la fecha de vencimiento debe ser al menos
      // 15 días posterior a la fecha de compra (no CURDATE(), para no romper
      // el registro de compras históricas/atrasadas).
      if (new Date(fechaVencimiento) < new Date(minimoVencimiento)) {
        showAlert.error(
          'Fecha de vencimiento inválida',
          'La fecha de vencimiento debe ser al menos 15 días posterior a la fecha de compra (no se pueden registrar productos ya vencidos o próximos a vencer).'
        );
        return;
      }
    }

    const idDetalle = generateNextId(formData.items, 'id_detalle');
    const nuevosItems = [
      ...formData.items,
      {
        id_detalle: idDetalle,
        producto: selectedProductToAdd.nombre,
        producto_codigo: selectedProductToAdd.codigo,
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        fecha_vencimiento: requiereLote ? fechaVencimiento : null
      }
    ];

    setFormData({ ...formData, items: nuevosItems });
    setProductSearch('');
    setSelectedProductToAdd(null);
    setCantidad(1);
    setCostoUnitario(0);
    setFechaVencimiento('');
  };

  const handleRemoveItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  // Editar = devolver la línea al formulario de "Agregar Productos" para
  // corregir cantidad/costo/vencimiento y volver a agregarla.
  const handleEditItem = (index) => {
    const item = formData.items[index];
    const prod = productos.find((p) => p.codigo === item.producto_codigo);
    if (!prod) {
      showAlert.error('Producto no disponible', 'El producto de esta línea ya no existe en el catálogo.');
      return;
    }
    setSelectedProductToAdd(prod);
    setProductSearch(prod.nombre);
    setCantidad(item.cantidad);
    setCostoUnitario(item.costoUnitario);
    setFechaVencimiento(item.fecha_vencimiento || '');
    handleRemoveItem(index);
  };

  const calcularTotal = () =>
    formData.items.reduce((acc, item) => acc + item.cantidad * item.costoUnitario, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numeroFactura = (formData.numero_factura_proveedor || nextFactura || '').trim();

    if (!formData.proveedor || !numeroFactura) {
      showAlert.error('Facturación incompleta', 'Debe completar proveedor y el número de factura para continuar.');
      return;
    }

    if (formData.items.length === 0) {
      showAlert.error('Compra sin productos', 'Debe agregar al menos un producto antes de registrar la compra.');
      return;
    }

    const compraFinal = {
      ...formData,
      numero_factura_proveedor: numeroFactura,
      total: calcularTotal(),
      fecha_compra: compra ? compra.fecha_compra : new Date().toISOString().split('T')[0]
    };

    onSave(compraFinal);
  };

  const proveedorSeleccionado = proveedoresActivos.find((p) => p.razon_social === formData.proveedor);

  // Fecha de referencia para la regla de 15 días (mirror sp_validar_lote):
  // fecha_compra real si se edita, o hoy si es una compra nueva.
  const fechaCompraReferencia = compra ? compra.fecha_compra : new Date().toISOString().split('T')[0];
  const minimoVencimiento = (() => {
    const d = new Date(fechaCompraReferencia);
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  })();

  // v5: "productos de este proveedor" = el catálogo producto_proveedor
  // (afiliación), no el historial de compras. "Ver todo el catálogo" permite
  // agregar a la compra un producto que aún no está afiliado a este proveedor.
  const codigosProveedor = new Set(
    productoProveedor
      .filter((pp) => pp.nit_proveedor === proveedorSeleccionado?.nit)
      .map((pp) => pp.id_producto)
  );
  const disponibles = verTodoCatalogo ? productosActivos : productosActivos.filter((p) => codigosProveedor.has(p.codigo));

  const resultadosBusqueda = disponibles.filter((prod) =>
    !debouncedSearch ||
    prod.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    prod.codigo.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
    tableBg: 'var(--bg-main)',
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <BagCheck size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{compra ? 'Editar Compra' : 'Registrar Nueva Compra'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Proveedor</label>
                  <select
                    className="form-select shadow-none"
                    value={formData.proveedor}
                    onChange={handleCambiarProveedor}
                    required
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  >
                    <option value="">Seleccione un proveedor...</option>
                    {proveedoresActivos.map((prov) => (
                      <option key={prov.nit} value={prov.razon_social}>{prov.razon_social}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold">N° Factura Proveedor</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.numero_factura_proveedor}
                    readOnly={!compra}
                    onChange={(e) => setFormData({ ...formData, numero_factura_proveedor: e.target.value })}
                    placeholder={nextFactura || 'FAC-0001'}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Método de pago</label>
                  <select
                    className="form-select shadow-none"
                    value={formData.id_metodo_pago}
                    onChange={(e) => setFormData({ ...formData, id_metodo_pago: Number(e.target.value) })}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  >
                    {metodosPagoActivos.map((m) => (
                      <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-12">
                  <label className="form-label small fw-semibold">Factura digitalizada (PDF o imagen)</label>
                  <div className="d-flex align-items-center gap-2">
                    <label
                      className="btn btn-sm d-flex align-items-center gap-2 m-0"
                      style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}`, color: styles.textColor }}
                    >
                      <Upload size={14} />
                      Subir archivo
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFacturaFileChange}
                        hidden
                      />
                    </label>
                    {formData.ruta_factura ? (
                      formData.ruta_factura_url ? (
                        <a
                          href={formData.ruta_factura_url}
                          target="_blank"
                          rel="noreferrer"
                          className="small d-flex align-items-center gap-1"
                          style={{ color: 'var(--amber-action)' }}
                        >
                          <FileEarmarkText size={14} /> {formData.ruta_factura}
                        </a>
                      ) : (
                        <span className="small d-flex align-items-center gap-1" style={{ color: styles.mutedColor }}>
                          <FileEarmarkText size={14} /> {formData.ruta_factura}
                        </span>
                      )
                    ) : (
                      <span className="small" style={{ color: styles.mutedColor }}>Sin factura adjunta</span>
                    )}
                  </div>
                </div>

                <div className="col-md-12">
                  <label className="form-label small fw-semibold">Observaciones (opcional)</label>
                  <textarea
                    className="form-control shadow-none"
                    rows="2"
                    placeholder="Novedades de la compra, acuerdos con el proveedor, etc."
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-3 mt-2" style={{ backgroundColor: styles.tableBg, border: `1px solid ${styles.borderCol}` }}>
                <h6 className="fw-bold small mb-3" style={{ color: 'var(--amber-action)' }}>Agregar Productos</h6>
                <div className="row g-2 align-items-end">
                  <div className="col-12 col-md-3">
                    <label className="form-label small text-muted">Buscar producto (nombre o código)</label>
                    <div className="position-relative">
                      <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-2" style={{ color: styles.mutedColor }} />
                      <input
                        type="text"
                        className="form-control form-control-sm ps-4"
                        placeholder={proveedorSeleccionado ? 'Ej: Tequila o PROD-01' : 'Seleccione un proveedor primero'}
                        disabled={!proveedorSeleccionado}
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setSelectedProductToAdd(null);
                        }}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                      />
                    </div>
                  </div>

                  <div className="col-6 col-md-2">
                    <label className="form-label small text-muted">Cantidad</label>
                    <QuantityStepper value={cantidad} onChange={setCantidad} />
                  </div>

                  <div className="col-6 col-md-2">
                    <label className="form-label small text-muted">Costo</label>
                    <MoneyInput
                      className="form-control form-control-sm"
                      value={costoUnitario}
                      onChange={(val) => setCostoUnitario(val === '' ? 0 : val)}
                      style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                    />
                  </div>

                  {selectedProductToAdd &&
                    (selectedProductToAdd.maneja_vencimiento ? (
                      <div className="col-6 col-md-3">
                        <label className="form-label small text-muted">Vence</label>
                        <input
                          type="date"
                          min={minimoVencimiento}
                          className="form-control form-control-sm"
                          value={fechaVencimiento}
                          onChange={(e) => setFechaVencimiento(e.target.value)}
                          style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                        />
                      </div>
                    ) : (
                      <div className="col-12 col-md-4">
                        <span className="small text-muted">Sin control de vencimiento.</span>
                      </div>
                    ))}

                  <div className="col-12 col-md-1 d-grid">
                    <button
                      type="button"
                      className="btn btn-sm text-white"
                      style={{ backgroundColor: 'var(--amber-action)', border: 'none', height: '31px' }}
                      onClick={handleAddItem}
                      title="Agregar item"
                      disabled={!selectedProductToAdd}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {!selectedProductToAdd && (
                  <div
                    className="rounded-3 mt-2"
                    style={{ border: `1px solid ${styles.borderCol}`, maxHeight: '180px', overflowY: 'auto' }}
                  >
                    {resultadosBusqueda.length === 0 ? (
                      <div className="small text-center py-2" style={{ color: styles.mutedColor }}>
                        {debouncedSearch ? 'Sin resultados.' : proveedorSeleccionado ? 'Este proveedor aún no ha entregado productos. Use "Ver todo el catálogo".' : 'Seleccione un proveedor primero.'}
                      </div>
                    ) : (
                      resultadosBusqueda.map((prod, idx) => (
                        <button
                          type="button"
                          key={prod.codigo}
                          className="btn btn-sm d-block w-100 text-start border-0 rounded-0 px-3 py-2"
                          style={{
                            backgroundColor: 'transparent',
                            color: styles.textColor,
                            borderBottom: idx < resultadosBusqueda.length - 1 ? `1px solid ${styles.borderCol}` : 'none'
                          }}
                          onClick={() => handleSelectProduct(prod)}
                        >
                          <span className="fw-semibold">{prod.nombre}</span>{' '}
                          <span className="small" style={{ color: styles.mutedColor }}>({prod.codigo})</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                <div className="form-check mt-2 small">
                  <input id="verTodo" type="checkbox" className="form-check-input" checked={verTodoCatalogo} onChange={(e) => setVerTodoCatalogo(e.target.checked)} />
                  <label htmlFor="verTodo" className="form-check-label">Ver todo el catálogo (no solo los productos de este proveedor)</label>
                </div>

                {selectedProductToAdd?.maneja_vencimiento && (
                  <div className="form-text small mt-1" style={{ color: styles.mutedColor }}>
                    Fecha de vencimiento mínima: {minimoVencimiento} (15 días después de la compra).
                  </div>
                )}
              </div>

              <div className="table-responsive mt-2">
                <table className="table table-sm align-middle m-0" style={{ color: styles.textColor }}>
                  <thead>
                    <tr style={{ borderColor: styles.borderCol }}>
                      <th className="small text-uppercase fw-bold" style={{ color: styles.mutedColor }}>Producto</th>
                      <th className="small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor }}>Cantidad</th>
                      <th className="small text-uppercase fw-bold text-end" style={{ color: styles.mutedColor }}>Costo Unit.</th>
                      <th className="small text-uppercase fw-bold" style={{ color: styles.mutedColor }}>Vencimiento</th>
                      <th className="small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-3 small" style={{ color: styles.mutedColor }}>
                          No hay productos agregados a esta compra.
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, index) => (
                        <tr key={item.id_detalle ?? index} style={{ borderColor: styles.borderCol }}>
                          <td className="fw-semibold">{item.producto}</td>
                          <td className="text-center">{item.cantidad} un.</td>
                          <td className="text-end">$ {Number(item.costoUnitario).toLocaleString()}</td>
                          <td>
                            {item.fecha_vencimiento ? (
                              <span className="small">{item.fecha_vencimiento}</span>
                            ) : (
                              <span className="small text-muted">Sin vencimiento</span>
                            )}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm p-0 border-0 me-2"
                              style={{ color: 'var(--amber-action)' }}
                              onClick={() => handleEditItem(index)}
                              title="Editar item"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm p-0 text-danger border-0"
                              onClick={() => handleRemoveItem(index)}
                              title="Eliminar item"
                            >
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {formData.items.length > 0 && (
                <div className="d-flex justify-content-end align-items-center gap-3 pt-2 border-top" style={{ borderColor: styles.borderCol }}>
                  <span className="fw-bold fs-6">Total Compra:</span>
                  <span className="fw-bold fs-5" style={{ color: 'var(--amber-action)' }}>$ {Number(calcularTotal()).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                {compra ? 'Actualizar Compra' : 'Registrar Compra'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
