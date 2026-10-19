import React, { useState, useEffect } from 'react';
import { BagCheck, Trash, Pencil, Plus, Search, FileEarmarkText, Upload } from 'react-bootstrap-icons';
import { showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { MoneyInput } from '../../components/common/MoneyInput';
import { Field, useFormValidation } from '../../components/common/Field';

// Fecha local (Colombia), no UTC: de noche toISOString() daría el día siguiente.
const hoyLocal = () => new Date().toLocaleDateString('sv-SE');

// onSave(compra, completar): completar=true la registra (stock vendible de
// inmediato); false la deja PENDIENTE. La factura (File) se sube aparte.
export const CompraFormModal = ({ show, onClose, onSave, compra }) => {
  // metodo_pago, proveedores y productos vienen de la API.
  const { data: metodosPago } = useApi(show ? '/metodos-pago' : null, []);
  const { data: proveedoresActivos } = useApi(show ? '/proveedores?estado=true' : null, []);

  const initialState = {
    proveedor: '',
    numero_factura_proveedor: '',
    id_metodo_pago: '',
    archivoFactura: null,
    observaciones: '',
    items: []
  };

  const [formData, setFormData] = useState(initialState);
  const { errors, formProps, resetErrors } = useFormValidation();
  const { data: productosProveedor } = useApi(show && formData.proveedor ? `/proveedores/${formData.proveedor}/productos` : null, []);
  const idMetodoPago = formData.id_metodo_pago || metodosPago[0]?.id_metodo_pago;
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
      setFormData(initialState);
    }
    setProductSearch('');
    setSelectedProductToAdd(null);
    setCantidad(1);
    setCostoUnitario(0);
    setFechaVencimiento('');
    resetErrors();
  }, [compra, show]);

  if (!show) return null;

  const handleSelectProduct = (prod) => {
    setSelectedProductToAdd(prod);
    setProductSearch(prod.producto);
    setCostoUnitario(0);
    setFechaVencimiento('');
  };

  // El archivo se sube al backend (POST /compras/:id/factura) al guardar.
  const handleFacturaFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showAlert.error('Archivo muy grande', 'La factura no puede superar los 5 MB.');
      return;
    }
    setFormData((prev) => ({ ...prev, archivoFactura: file }));
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

    const nuevosItems = [
      ...formData.items,
      {
        id_detalle: `${selectedProductToAdd.id_producto}|${requiereLote ? fechaVencimiento : ''}|${Date.now()}`,
        producto: selectedProductToAdd.producto,
        producto_codigo: selectedProductToAdd.id_producto,
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
    const prod = productosProveedor.find((p) => p.id_producto === item.producto_codigo);
    if (!prod) {
      showAlert.error('Producto no disponible', 'El producto de esta línea ya no existe en el catálogo.');
      return;
    }
    setSelectedProductToAdd(prod);
    setProductSearch(prod.producto);
    setCantidad(item.cantidad);
    setCostoUnitario(item.costoUnitario);
    setFechaVencimiento(item.fecha_vencimiento || '');
    handleRemoveItem(index);
  };

  const calcularTotal = () =>
    formData.items.reduce((acc, item) => acc + item.cantidad * item.costoUnitario, 0);

  // Espejo de sp_validar_cierre_compra: solo exige proveedor/factura/items,
  // sin importar si el resultado va a quedar PENDIENTE o REGISTRADA.
  const construirCompraFinal = () => {
    const numeroFactura = (formData.numero_factura_proveedor || '').trim();

    if (!formData.proveedor || !numeroFactura || !idMetodoPago) {
      showAlert.error('Facturación incompleta', 'Debe completar proveedor, número de factura y método de pago para continuar.');
      return null;
    }

    if (formData.items.length === 0) {
      showAlert.error('Compra sin productos', 'Debe agregar al menos un producto antes de guardar la compra.');
      return null;
    }

    return {
      id_proveedor: formData.proveedor,
      id_metodo_pago: idMetodoPago,
      numero_factura_proveedor: numeroFactura,
      fecha_compra: compra ? compra.fecha_compra : hoyLocal(),
      observaciones: formData.observaciones,
      detalles: formData.items.map((i) => ({
        id_producto: i.producto_codigo,
        fecha_vencimiento: i.fecha_vencimiento,
        cantidad: i.cantidad,
        precio_unitario_compra: i.costoUnitario
      })),
      archivoFactura: formData.archivoFactura
    };
  };

  const handleRegistrar = (e) => {
    e.preventDefault();
    const compraFinal = construirCompraFinal();
    if (compraFinal) onSave(compraFinal, true);
  };

  const handleGuardarPendiente = () => {
    const compraFinal = construirCompraFinal();
    if (compraFinal) onSave(compraFinal, false);
  };

  const proveedorSeleccionado = proveedoresActivos.find((p) => p.id_proveedor === formData.proveedor);

  // Aviso de la regla de 15 días (la valida trg_validar_detalle_compra_ins):
  // fecha_compra real si se edita, o hoy si es una compra nueva.
  const fechaCompraReferencia = compra ? compra.fecha_compra : hoyLocal();
  const minimoVencimiento = (() => {
    const d = new Date(fechaCompraReferencia);
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  })();

  // Solo los productos activos afiliados a este proveedor
  // (vw_productos_por_proveedor): el backend rechaza cualquier otro.
  const resultadosBusqueda = productosProveedor.filter((prod) =>
    !debouncedSearch ||
    prod.producto.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    prod.id_producto.toLowerCase().includes(debouncedSearch.toLowerCase())
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
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <BagCheck size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">{compra ? 'Editar Compra' : 'Registrar Nueva Compra'}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <form {...formProps(handleRegistrar)}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <div className="row g-3">
                <Field className="col-md-5" label="Proveedor" required error={errors.proveedor}>
                  <select name="proveedor" className="form-select shadow-none" value={formData.proveedor} onChange={handleCambiarProveedor} required style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}>
                    <option value="">Seleccione un proveedor...</option>
                    {proveedoresActivos.map((prov) => (
                      <option key={prov.id_proveedor} value={prov.id_proveedor}>{prov.razon_social}</option>
                    ))}
                  </select>
                </Field>
                <Field className="col-md-3" label="N° Factura Proveedor" required error={errors.numero_factura_proveedor}>
                  <input type="text" name="numero_factura_proveedor" className="form-control" required value={formData.numero_factura_proveedor}
                    onChange={(e) => setFormData({ ...formData, numero_factura_proveedor: e.target.value })} placeholder="Como aparece en la factura" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} />
                </Field>
                <Field className="col-md-4" label="Método de pago" required error={errors.id_metodo_pago}>
                  <select name="id_metodo_pago" className="form-select shadow-none" required value={idMetodoPago || ''}
                    onChange={(e) => setFormData({ ...formData, id_metodo_pago: e.target.value })} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}>
                    {metodosPago.map((m) => (
                      <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
                    ))}
                  </select>
                </Field>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Factura digitalizada <span className="fw-normal" style={{ color: styles.mutedColor }}>(opcional)</span></label>
                  <div className="d-flex align-items-center gap-2">
                    <label className="btn btn-sm d-flex align-items-center gap-2 m-0" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}`, color: styles.textColor }}>
                      <Upload size={14} />
                      Subir archivo
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFacturaFileChange} hidden />
                    </label>
                    {formData.archivoFactura && (
                      <span className="small d-flex align-items-center gap-1" style={{ color: styles.mutedColor }}>
                        <FileEarmarkText size={14} /> {formData.archivoFactura.name}
                      </span>
                    )}
                  </div>
                </div>
                <Field className="col-md-6" label="Observaciones" error={errors.observaciones}>
                  <textarea name="observaciones" className="form-control shadow-none" rows="1" value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} />
                </Field>
              </div>

              <div className="row g-3 mt-0">
                <div className="col-lg-8 d-flex flex-column gap-3">
              <div className="p-3 rounded-3 mt-2" style={{ backgroundColor: styles.tableBg, border: `1px solid ${styles.borderCol}` }}>
                <h6 className="fw-bold small mb-3" style={{ color: 'var(--amber-action)' }}>Agregar Productos</h6>
                <div className="row g-2 align-items-end">
                  <div className="col-12 col-md-3">
                    <label className="form-label small text-muted">Buscar producto (nombre o código)</label>
                    <div className="position-relative">
                      <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-2" style={{ color: styles.mutedColor }} />
                      <input
                        type="text"
                        className="form-control form-control-sm ps-5"
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
                        <label className="form-label small text-muted">Vence <span style={{ color: 'var(--brand-danger)' }}>*</span></label>
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
                      <div className="col-12 col-md-3" />
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
                        {debouncedSearch ? 'Sin resultados.' : proveedorSeleccionado ? 'Este proveedor no tiene productos asociados. Asócielos desde Productos (campo Proveedores).' : 'Seleccione un proveedor primero.'}
                      </div>
                    ) : (
                      resultadosBusqueda.map((prod, idx) => (
                        <button
                          type="button"
                          key={prod.id_producto}
                          className="btn btn-sm d-block w-100 text-start border-0 rounded-0 px-3 py-2"
                          style={{
                            backgroundColor: 'transparent',
                            color: styles.textColor,
                            borderBottom: idx < resultadosBusqueda.length - 1 ? `1px solid ${styles.borderCol}` : 'none'
                          }}
                          onClick={() => handleSelectProduct(prod)}
                        >
                          <span className="fw-semibold">{prod.producto}</span>{' '}
                          <span className="small" style={{ color: styles.mutedColor }}>({prod.id_producto})</span>
                        </button>
                      ))
                    )}
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

                </div>

                <div className="col-lg-4">
                  <div className="position-sticky" style={{ top: 0 }}>
                    <div className="rounded-3 p-3" style={{ backgroundColor: styles.tableBg, border: `1px solid ${styles.borderCol}` }}>
                      <div className="d-flex justify-content-between small" style={{ color: styles.mutedColor }}>
                        <span>Productos</span>
                        <span>{formData.items.length}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 mt-2 border-top" style={{ borderColor: styles.borderCol }}>
                        <span className="fw-semibold">Total Compra</span>
                        <span className="fw-bold fs-4" style={{ color: 'var(--amber-action)' }}>$ {Number(calcularTotal()).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="button" className="btn btn-outline-secondary fw-medium" onClick={handleGuardarPendiente}>
                Guardar como pendiente
              </button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                Registrar Compra
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
