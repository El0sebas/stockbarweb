import React, { useState, useEffect } from 'react';
import { BagCheck, Trash, Plus } from 'react-bootstrap-icons';
import { showAlert } from '../../utils/alerts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { generateNextIdentifier } from '../../utils/identifiers';

export const CompraFormModal = ({ show, onClose, onSave, compra, nextFactura }) => {
  // Mismo catálogo que MetodosPagoPage/VentasPage (ver comentario allí).
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);
  const metodosPagoActivos = metodosPago.filter((m) => m.estado === 'Activo');

  const proveedoresConProductos = {
    'Distribuidora de Licores de Antioquia': [
      { id: 'p1', nombre: 'Aguardiente Antioqueño 750ml', precioSugerido: 52000, maneja_vencimiento: true },
      { id: 'p2', nombre: 'Ron Medellín Añejo 3 Años', precioSugerido: 48000, maneja_vencimiento: true },
      { id: 'p3', nombre: 'Crema de Whisky Lunacy', precioSugerido: 60000, maneja_vencimiento: true }
    ],
    'Importaciones Andinas S.A.S.': [
      { id: 'p4', nombre: 'Tequila Don Julio Reposado', precioSugerido: 200000, maneja_vencimiento: true },
      { id: 'p5', nombre: 'Whisky Old Parr 12 Años', precioSugerido: 140000, maneja_vencimiento: false },
      { id: 'p6', nombre: 'Vodka Smirnoff 750ml', precioSugerido: 45000, maneja_vencimiento: true }
    ],
    'Cervecería Nacional': [
      { id: 'p7', nombre: 'Cerveza Club Colombia Dorada', precioSugerido: 6500, maneja_vencimiento: true },
      { id: 'p8', nombre: 'Cerveza Águila Light', precioSugerido: 4500, maneja_vencimiento: true },
      { id: 'p9', nombre: 'Cerveza Corona Extra', precioSugerido: 7500, maneja_vencimiento: true }
    ]
  };

  const initialState = {
    proveedor: '',
    numero_factura: '',
    id_metodo_pago: 1,
    ruta_factura: '',
    items: []
  };

  const [formData, setFormData] = useState(initialState);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [numeroLote, setNumeroLote] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  useEffect(() => {
    if (compra) {
      setFormData(compra);
    } else {
      setFormData({
        ...initialState,
        numero_factura: nextFactura || initialState.numero_factura
      });
    }
    setSelectedProductToAdd('');
    setCantidad(1);
    setCostoUnitario(0);
    setNumeroLote('');
    setFechaVencimiento('');
  }, [compra, show, nextFactura]);

  if (!show) return null;

  const handleProveedorChange = (e) => {
    const proveedorSeleccionado = e.target.value;
    setFormData({
      ...formData,
      proveedor: proveedorSeleccionado,
      items: []
    });
    setSelectedProductToAdd('');
    setCostoUnitario(0);
    setNumeroLote('');
    setFechaVencimiento('');
  };

  const handleProductSelectChange = (e) => {
    const prodNombre = e.target.value;
    setSelectedProductToAdd(prodNombre);

    const productosDisponibles = proveedoresConProductos[formData.proveedor] || [];
    const prodEncontrado = productosDisponibles.find((p) => p.nombre === prodNombre);
    if (prodEncontrado) {
      setCostoUnitario(prodEncontrado.precioSugerido);
    } else {
      setCostoUnitario(0);
    }
    setNumeroLote('');
    setFechaVencimiento('');
  };

  const handleAddItem = () => {
    if (!selectedProductToAdd || cantidad <= 0 || costoUnitario <= 0) return;

    const productosDisponibles = proveedoresConProductos[formData.proveedor] || [];
    const productoSeleccionado = productosDisponibles.find((p) => p.nombre === selectedProductToAdd);
    const requiereLote = productoSeleccionado?.maneja_vencimiento;

    if (requiereLote && (!numeroLote.trim() || !fechaVencimiento)) {
      showAlert.error('Falta información del lote', 'Este producto requiere número de lote y fecha de vencimiento para registrarse.');
      return;
    }

    const existingIndex = formData.items.findIndex((item) => item.producto === selectedProductToAdd);
    const nuevosItems = [...formData.items];

    if (existingIndex >= 0) {
      nuevosItems[existingIndex].cantidad += Number(cantidad);
      nuevosItems[existingIndex].costoUnitario = Number(costoUnitario);
      nuevosItems[existingIndex].numero_lote = requiereLote ? numeroLote.trim() : null;
      nuevosItems[existingIndex].fecha_vencimiento = requiereLote ? fechaVencimiento : null;
    } else {
      // El id de cada línea de compra lo asigna el sistema; el usuario nunca lo edita.
      const idDetalle = Number(generateNextIdentifier({ items: formData.items, key: 'id_detalle' }));
      nuevosItems.push({
        id_detalle: idDetalle,
        producto: selectedProductToAdd,
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        numero_lote: requiereLote ? numeroLote.trim() : null,
        fecha_vencimiento: requiereLote ? fechaVencimiento : null
      });
    }

    setFormData({ ...formData, items: nuevosItems });
    setSelectedProductToAdd('');
    setCantidad(1);
    setCostoUnitario(0);
    setNumeroLote('');
    setFechaVencimiento('');
  };

  const handleRemoveItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  const calcularTotal = () =>
    formData.items.reduce((acc, item) => acc + item.cantidad * item.costoUnitario, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numeroFactura = (formData.numero_factura || nextFactura || '').trim();

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
      numero_factura: numeroFactura,
      total: calcularTotal(),
      fecha: compra ? compra.fecha : new Date().toISOString().split('T')[0]
    };

    onSave(compraFinal);
  };

  const productosDisponibles = proveedoresConProductos[formData.proveedor] || [];

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
                    onChange={handleProveedorChange}
                    required
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  >
                    <option value="">Seleccione un proveedor...</option>
                    {Object.keys(proveedoresConProductos).map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Factura</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.numero_factura}
                    readOnly={!compra}
                    onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
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
                  <label className="form-label small fw-semibold">Ruta de factura</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.ruta_factura}
                    onChange={(e) => setFormData({ ...formData, ruta_factura: e.target.value })}
                    placeholder="/facturas/fac-001.pdf"
                    style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                  />
                </div>
              </div>

              {formData.proveedor && (
                <div className="p-3 rounded-3 mt-2" style={{ backgroundColor: styles.tableBg, border: `1px solid ${styles.borderCol}` }}>
                  <h6 className="fw-bold small mb-3" style={{ color: 'var(--amber-action)' }}>Agregar Productos del Proveedor</h6>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label small text-muted">Producto</label>
                      <select
                        className="form-select form-select-sm shadow-none"
                        value={selectedProductToAdd}
                        onChange={handleProductSelectChange}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                      >
                        <option value="">Seleccione producto...</option>
                        {productosDisponibles.map((prod) => (
                          <option key={prod.id} value={prod.nombre}>{prod.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-2">
                      <label className="form-label small text-muted">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={cantidad}
                        onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label small text-muted">Costo</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-sm"
                        value={costoUnitario}
                        onChange={(e) => setCostoUnitario(Number(e.target.value) || 0)}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                      />
                    </div>

                    {selectedProductToAdd &&
                      (productosDisponibles.find((p) => p.nombre === selectedProductToAdd)?.maneja_vencimiento ? (
                        <>
                          <div className="col-md-2">
                            <label className="form-label small text-muted">Lote</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={numeroLote}
                              onChange={(e) => setNumeroLote(e.target.value)}
                              placeholder="LT-001"
                              style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small text-muted">Vence</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={fechaVencimiento}
                              onChange={(e) => setFechaVencimiento(e.target.value)}
                              style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="col-md-4">
                          <span className="small text-muted">Sin control de vencimiento.</span>
                        </div>
                      ))}

                    <div className="col-md-1 d-grid">
                      <button
                        type="button"
                        className="btn btn-sm text-white"
                        style={{ backgroundColor: 'var(--amber-action)', border: 'none', height: '31px' }}
                        onClick={handleAddItem}
                        title="Agregar item"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="table-responsive mt-2">
                <table className="table table-sm align-middle m-0" style={{ color: styles.textColor }}>
                  <thead>
                    <tr style={{ borderColor: styles.borderCol }}>
                      <th className="small text-uppercase fw-bold" style={{ color: styles.mutedColor }}>Producto</th>
                      <th className="small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor }}>Cantidad</th>
                      <th className="small text-uppercase fw-bold text-end" style={{ color: styles.mutedColor }}>Costo Unit.</th>
                      <th className="small text-uppercase fw-bold" style={{ color: styles.mutedColor }}>Lote/Vencimiento</th>
                      <th className="small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-3 small" style={{ color: styles.mutedColor }}>
                          {formData.proveedor ? 'No hay productos agregados a esta compra.' : 'Seleccione un proveedor primero.'}
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, index) => (
                        <tr key={item.id_detalle ?? index} style={{ borderColor: styles.borderCol }}>
                          <td className="fw-semibold">{item.producto}</td>
                          <td className="text-center">{item.cantidad} un.</td>
                          <td className="text-end">$ {Number(item.costoUnitario).toLocaleString()}</td>
                          <td>
                            {item.numero_lote || item.fecha_vencimiento ? (
                              <span className="small">
                                {item.numero_lote || 'Sin lote'}
                                {item.fecha_vencimiento ? ` • ${item.fecha_vencimiento}` : ''}
                              </span>
                            ) : (
                              <span className="small text-muted">Sin vencimiento</span>
                            )}
                          </td>
                          <td className="text-center">
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