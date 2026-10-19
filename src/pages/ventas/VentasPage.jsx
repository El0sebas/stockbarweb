import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Search, Plus, Trash, CartCheck, ClockHistory, ShieldExclamation, CashCoin, PlayFill, XCircle, Eye, Printer } from 'react-bootstrap-icons';
import { showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { useJornadaActual } from '../../hooks/useJornadaActual';
import { api, consulta } from '../../services/api';
import { ejecutar } from '../../utils/accion';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { VentaDetailModal } from './VentaDetailModal';
import { FechaRangoFilter } from '../../components/common/FechaRangoFilter';
import { descargarFactura, generarFacturaPDF } from '../../utils/factura';
import { DIAS_SUGERENCIA_VENCIMIENTO } from '../../utils/stock';

// Cliente genérico de mostrador (lo crea el backend al arrancar).
const CONSUMIDOR_FINAL = 'CLI-00000';
const formato = (n) => new Intl.NumberFormat('es-CO').format(Math.round(Number(n) || 0));

// Ventas (CU_06_xx). El carrito es una venta PENDIENTE real en el servidor
// desde el primer producto: el backend reparte por lotes (FEFO), reserva el
// stock, congela el IVA y valida jornada, edad y vencimiento. Esta pantalla
// solo envía la intención y muestra lo que responde la API.
export const VentasPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  // El rango lo filtra la API: el listado trae como máximo las 500 ventas más
  // recientes, así que filtrar solo en el navegador escondería las antiguas.
  const { data: ventas, recargar } = useApi(`/ventas${consulta({ desde: filtroDesde, hasta: filtroHasta })}`, []);
  const { jornada: jornadaAbierta } = useJornadaActual();
  const { data: metodosPago } = useApi('/metodos-pago', []);
  const [showModal, setShowModal] = useState(false);
  const [ventaActiva, setVentaActiva] = useState(null);
  const [productoSearch, setProductoSearch] = useState('');
  const [cantidadesBusqueda, setCantidadesBusqueda] = useState({});
  const [idCliente, setIdCliente] = useState(CONSUMIDOR_FINAL);
  const [metodoPagoVenta, setMetodoPagoVenta] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);

  // Catálogo vendible y clientes solo mientras el formulario está abierto.
  const { data: catalogo, recargar: recargarCatalogo } = useApi(showModal ? '/ventas/catalogo' : null, []);
  const { data: clientesActivos } = useApi(showModal ? '/clientes?estado=true' : null, []);

  const metodoPago = metodoPagoVenta || metodosPago[0]?.id_metodo_pago || '';
  const clienteSeleccionado = clientesActivos.find((c) => c.id_cliente === idCliente);
  const requiereEdad = (idProducto) => Boolean(catalogo.find((p) => p.id_producto === idProducto)?.requiere_verificacion_edad);

  // El backend guarda una línea por lote; el carrito se muestra por producto.
  const carrito = Object.values(
    (ventaActiva?.detalles || []).reduce((acc, l) => {
      const item = (acc[l.id_producto] ||= { id_producto: l.id_producto, producto: l.producto, cantidad: 0, subtotal: 0, lotes: [] });
      item.cantidad += Number(l.cantidad);
      item.subtotal += Number(l.subtotal);
      item.lotes.push(`${l.id_lote} ×${Number(l.cantidad)}`);
      return acc;
    }, {})
  );

  // Señal visual "Por vencer": el próximo vencimiento vendible está a 15 días o menos.
  const diasParaVencer = (prod) => {
    if (!prod.proximo_vencimiento) return null;
    const dias = Math.ceil((new Date(`${prod.proximo_vencimiento}T00:00:00`) - new Date()) / 86400000);
    return dias <= DIAS_SUGERENCIA_VENCIMIENTO ? dias : null;
  };

  // Envuelve cada llamada del carrito: evita doble clic y refresca la venta y el stock.
  const conVenta = async (llamada, exito) => {
    setOcupado(true);
    const venta = await ejecutar(llamada, exito);
    setOcupado(false);
    if (venta && venta !== true) setVentaActiva(venta);
    recargarCatalogo();
    return venta;
  };

  const handleOpenModal = async (ventaExistente = null) => {
    if (!jornadaAbierta) {
      showAlert.error('No hay jornada abierta', 'Debes abrir una jornada (menú "Jornada") antes de poder registrar ventas.');
      return;
    }
    const venta = ventaExistente ? await ejecutar(() => api.get(`/ventas/${ventaExistente.id_venta}`)) : null;
    if (ventaExistente && !venta) return;
    setVentaActiva(venta);
    setIdCliente(venta ? venta.id_cliente : CONSUMIDOR_FINAL);
    setMetodoPagoVenta(venta?.id_metodo_pago || '');
    setObservaciones(venta?.observaciones || '');
    setProductoSearch('');
    setCantidadesBusqueda({});
    setShowModal(true);
  };

  const cabecera = (cambios = {}) => ({
    id_cliente: idCliente,
    id_metodo_pago: metodoPago,
    observaciones: observaciones.trim() || null,
    ...cambios
  });

  // Primer producto: crea la venta PENDIENTE con su línea en una sola
  // transacción (si el backend la rechaza, no queda ninguna venta huérfana).
  const handleAgregarProducto = (prod) => {
    if (!jornadaAbierta) {
      showAlert.error('No hay jornada abierta', 'La venta no puede registrarse porque no hay una jornada ABIERTA.');
      return;
    }
    const linea = { id_producto: prod.id_producto, cantidad: cantidadesBusqueda[prod.id_producto] || 1 };
    const agregado = ventaActiva
      ? conVenta(() => api.post(`/ventas/${ventaActiva.id_venta}/productos`, linea))
      : conVenta(() => api.post('/ventas', { ...cabecera(), productos: [linea] }));
    agregado.then((ok) => ok && setCantidadesBusqueda((prev) => ({ ...prev, [prod.id_producto]: 1 })));
  };

  const handleCambiarCantidad = (idProducto, cantidad) =>
    conVenta(() => api.put(`/ventas/${ventaActiva.id_venta}/productos/${idProducto}`, { cantidad }));

  const handleQuitarProducto = (idProducto) =>
    conVenta(() => api.del(`/ventas/${ventaActiva.id_venta}/productos/${idProducto}`));

  // Cambiar cliente o método de pago se guarda en la venta PENDIENTE; el
  // backend revalida las líneas (p. ej. la edad del nuevo cliente).
  const guardarCabecera = async (cambios, revertir) => {
    if (!ventaActiva) return;
    const ok = await conVenta(() => api.put(`/ventas/${ventaActiva.id_venta}`, cabecera(cambios)));
    if (!ok) revertir();
  };

  const handleCambiarCliente = (value) => {
    const anterior = idCliente;
    setIdCliente(value);
    guardarCabecera({ id_cliente: value }, () => setIdCliente(anterior));
  };

  const handleCambiarMetodoPago = (value) => {
    const anterior = metodoPagoVenta;
    setMetodoPagoVenta(value);
    guardarCabecera({ id_metodo_pago: value }, () => setMetodoPagoVenta(anterior));
  };

  const handleGuardarObservaciones = () => {
    if (ventaActiva && (observaciones.trim() || null) !== (ventaActiva.observaciones || null)) {
      guardarCabecera({}, () => {});
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setVentaActiva(null);
    recargar();
  };

  // PENDIENTE -> COMPLETADA. El backend exige al menos una línea y total > 0,
  // y responde con todo lo necesario para la factura automática.
  const handleConfirmarVenta = async () => {
    if (!ventaActiva || carrito.length === 0) {
      showAlert.error('Venta rechazada', 'Una venta COMPLETADA debe tener al menos un detalle.');
      return;
    }
    setOcupado(true);
    const completada = await ejecutar(async () => {
      await api.put(`/ventas/${ventaActiva.id_venta}`, cabecera());
      return api.post(`/ventas/${ventaActiva.id_venta}/completar`);
    }, (v) => `Venta ${v.id_venta} completada`);
    setOcupado(false);
    if (!completada) return;
    cerrarModal();
    generarFacturaPDF(completada);
  };

  // Cerrar el formulario con una venta en curso: dejarla PENDIENTE (CU_06_03)
  // o anularla y liberar el stock reservado (CU_06_02).
  const cerrarModalDescartando = async () => {
    if (!ventaActiva) {
      cerrarModal();
      return;
    }
    if (carrito.length === 0) {
      // Sin líneas: se anula para no dejar un registro PENDIENTE huérfano.
      await ejecutar(() => api.post(`/ventas/${ventaActiva.id_venta}/anular`));
      cerrarModal();
      return;
    }
    const r = await Swal.fire({
      icon: 'warning',
      title: '¿Qué deseas hacer con esta venta?',
      text: 'Puedes dejarla PENDIENTE para continuarla después, o cancelarla: se liberará el stock reservado y quedará ANULADA en el historial.',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Dejar pendiente',
      denyButtonText: 'Cancelar venta',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: 'var(--amber-action)',
      denyButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--text-muted)',
      background: 'var(--bg-card)',
      color: 'var(--text-main)'
    });
    if (r.isConfirmed) {
      handleGuardarObservaciones();
      cerrarModal();
    } else if (r.isDenied) {
      if (await ejecutar(() => api.post(`/ventas/${ventaActiva.id_venta}/anular`), `Venta ${ventaActiva.id_venta} cancelada`)) cerrarModal();
    }
  };

  // Solo una venta PENDIENTE se cancela (anula); una COMPLETADA nunca.
  const handleCancelarPendienteDesdeHistorial = async (venta) => {
    if (venta.estado !== 'PENDIENTE') return;
    const confirmado = await showAlert.confirm('¿Cancelar esta venta pendiente?', 'Se liberará el stock reservado.');
    if (!confirmado) return;
    if (await ejecutar(() => api.post(`/ventas/${venta.id_venta}/anular`), `Venta ${venta.id_venta} cancelada`)) recargar();
  };

  const filteredVentas = ventas.filter((v) =>
    (v.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.id_venta.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productosFiltrados = catalogo.filter((prod) => prod.nombre.toLowerCase().includes(productoSearch.toLowerCase()));
  const hayProductosEdad = carrito.some((item) => requiereEdad(item.id_producto));

  const styles = {
    bgCard: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };

  const estadoBadgeStyle = (estado) => {
    if (estado === 'COMPLETADA') return { backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)' };
    if (estado === 'ANULADA') return { backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' };
    return { backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' };
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Ventas Web</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>Gestión y control de pedidos generados en la plataforma web</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
            <input
              type="text"
              placeholder="Buscar venta o cliente..."
              className="form-control ps-5 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '240px' }}
            />
          </div>
          <FechaRangoFilter desde={filtroDesde} hasta={filtroHasta} onDesdeChange={setFiltroDesde} onHastaChange={setFiltroHasta} />
          <button
            className="btn fw-semibold d-flex align-items-center gap-2 text-white px-3"
            style={{ backgroundColor: jornadaAbierta ? 'var(--amber-action)' : 'var(--text-muted)', border: 'none', opacity: jornadaAbierta ? 1 : 0.6 }}
            onClick={() => handleOpenModal()}
            title={jornadaAbierta ? undefined : 'Abre una jornada primero'}
          >
            <Plus size={18} />
            <span>Registrar</span>
          </button>
        </div>
      </div>

      {!jornadaAbierta && (
        <div className="alert d-flex align-items-center gap-2 mb-4" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', border: 'none', borderRadius: '10px' }}>
          <ShieldExclamation size={18} />
          <span className="small fw-semibold">No hay una jornada abierta — abre una desde el menú "Jornada" para poder registrar ventas.</span>
        </div>
      )}

      {/* Tabla de Ventas */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: styles.bgCard }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ID VENTA</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CLIENTE</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>FECHA</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>PRODUCTOS</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-end" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>TOTAL</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4" style={{ color: styles.mutedColor }}>
                    No se encontraron registros de ventas web.
                  </td>
                </tr>
              ) : (
                filteredVentas.map((v) => (
                  <tr key={v.id_venta} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold text-nowrap" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{v.id_venta}</td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>{v.cliente || 'Venta de mostrador'}</td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>{new Date(v.fecha_hora_venta).toLocaleString('es-CO')}</td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {v.detalles.map((p) => (
                        <div key={p.id_lote}>- {p.producto} (x{Number(p.cantidad)}) • {p.id_lote}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-end fw-bold text-nowrap" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      $ {formato(v.total_venta)}
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <span className="badge px-3 py-1" style={estadoBadgeStyle(v.estado)}>{v.estado}</span>
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--brand-blue)' }} title="Ver detalle" onClick={() => { setSelectedVenta(v); setShowDetailModal(true); }}>
                          <Eye size={18} />
                        </button>
                        {v.estado === 'COMPLETADA' && (
                          <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--amber-action)' }} title="Descargar factura" onClick={() => descargarFactura(v.id_venta)}>
                            <Printer size={18} />
                          </button>
                        )}
                        {v.estado === 'PENDIENTE' && (
                          <>
                            <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--amber-action)' }} title="Continuar" onClick={() => handleOpenModal(v)}>
                              <PlayFill size={18} />
                            </button>
                            <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--brand-danger)' }} title="Cancelar" onClick={() => handleCancelarPendienteDesdeHistorial(v)}>
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', zIndex: 1050 }}>
         <div className="modal-dialog modal-xl modal-dialog-centered">
           <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.bgCard, color: styles.textColor, borderRadius: '16px' }}>
             <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
               <div className="d-flex align-items-center gap-2">
                 <CartCheck size={20} color="var(--amber-action)" />
                 <h5 className="modal-title fw-bold m-0">
                   {ventaActiva ? `Venta ${ventaActiva.id_venta} (PENDIENTE)` : 'Registrar venta web'}
                 </h5>
               </div>
               <button type="button" className="btn-close shadow-none btn-close-themed" onClick={cerrarModalDescartando}></button>
             </div>

             <div className="modal-body p-4">
               <div className="row g-3 mb-4">
                 <div className="col-md-6">
                   <label className="form-label small fw-semibold">Cliente <span style={{ color: 'var(--brand-danger)' }}>*</span></label>
                   <select
                     className="form-select"
                     value={idCliente ?? ''}
                     disabled={ocupado}
                     onChange={(e) => handleCambiarCliente(e.target.value)}
                     style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                   >
                     {clientesActivos.map((c) => (
                       <option key={c.id_cliente} value={c.id_cliente}>
                         {c.nombres} {c.apellidos}{!c.fecha_nacimiento && c.id_cliente !== CONSUMIDOR_FINAL ? ' — sin fecha de nacimiento' : ''}
                       </option>
                     ))}
                   </select>
                   {/* Consumidor Final está exento de la verificación de edad (decisión de negocio). */}
                   {hayProductosEdad && idCliente !== CONSUMIDOR_FINAL && clienteSeleccionado && !clienteSeleccionado.fecha_nacimiento && (
                     <div className="small mt-1 d-flex align-items-center gap-1" style={{ color: 'var(--brand-danger)' }}>
                       <ShieldExclamation size={12} />
                       Hay productos +18: el cliente necesita fecha de nacimiento y ser mayor de edad.
                     </div>
                   )}
                 </div>
               </div>

               <div className="row g-4">
                 <div className="col-lg-8 d-flex flex-column gap-3">
                 <div>
                   <label className="form-label small fw-semibold">Agregar producto</label>
                   <div className="position-relative mb-2">
                     <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
                     <input
                       type="text"
                       className="form-control form-control-sm ps-5"
                       placeholder="Buscar producto por nombre..."
                       value={productoSearch}
                       onChange={(e) => setProductoSearch(e.target.value)}
                       style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                     />
                   </div>
                   <div className="rounded-3" style={{ border: `1px solid ${styles.borderCol}`, maxHeight: '220px', overflowY: 'auto' }}>
                     {productosFiltrados.map((prod) => {
                       const dias = diasParaVencer(prod);
                       const stockDisponible = Number(prod.disponible);
                       return (
                         <div key={prod.id_producto} className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom gap-2" style={{ borderColor: styles.borderCol }}>
                           <div>
                             <div className="fw-semibold small d-flex align-items-center gap-2">
                               {prod.nombre}
                               {prod.requiere_verificacion_edad && (
                                 <span className="badge" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', fontSize: '0.65rem' }}>+18</span>
                               )}
                             </div>
                             <div className="d-flex align-items-center gap-2">
                               <span className="small" style={{ color: styles.mutedColor }}>
                                 ${formato(prod.precio_venta_actual)} • {stockDisponible} disp.
                               </span>
                               {dias != null && (
                                 <span className="badge d-inline-flex align-items-center gap-1" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)', fontWeight: 500 }}>
                                   <ClockHistory size={10} />
                                   Por vencer ({dias}d)
                                 </span>
                               )}
                             </div>
                           </div>
                           <div className="d-flex align-items-center gap-2 flex-shrink-0">
                             <QuantityStepper
                               value={cantidadesBusqueda[prod.id_producto] || 1}
                               max={stockDisponible || undefined}
                               onChange={(v) => setCantidadesBusqueda((prev) => ({ ...prev, [prod.id_producto]: v }))}
                             />
                             <button type="button" className="btn btn-sm p-1" style={{ color: 'var(--amber-action)' }} onClick={() => handleAgregarProducto(prod)} title="Agregar a la venta" disabled={stockDisponible === 0 || ocupado}>
                               <Plus size={20} />
                             </button>
                           </div>
                         </div>
                       );
                     })}
                     {productosFiltrados.length === 0 && (
                       <div className="text-center py-3 small" style={{ color: styles.mutedColor }}>No se encontraron productos.</div>
                     )}
                   </div>
                 </div>
               <div className="table-responsive">
                 <table className="table align-middle mb-0" style={{ color: styles.textColor }}>
                   <thead>
                     <tr style={{ borderColor: styles.borderCol }}>
                       <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Producto</th>
                       <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Cant.</th>
                       <th className="small text-uppercase text-end" style={{ color: styles.mutedColor }}>Precio</th>
                       <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Lote</th>
                       <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Acción</th>
                     </tr>
                   </thead>
                   <tbody>
                     {carrito.length === 0 ? (
                       <tr>
                         <td colSpan="5" className="text-center py-4" style={{ color: styles.mutedColor }}>Agrega productos para iniciar la venta.</td>
                       </tr>
                     ) : (
                       carrito.map((item) => {
                         const disponibleExtra = Number(catalogo.find((p) => p.id_producto === item.id_producto)?.disponible || 0);
                         return (
                           <tr key={item.id_producto} style={{ borderColor: styles.borderCol }}>
                             <td className="fw-semibold">
                               {item.producto}
                               {requiereEdad(item.id_producto) && (
                                 <span className="badge ms-2" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', fontSize: '0.65rem' }}>+18</span>
                               )}
                             </td>
                             <td className="text-center">
                               <QuantityStepper value={item.cantidad} max={item.cantidad + disponibleExtra} disabled={ocupado} onChange={(v) => handleCambiarCantidad(item.id_producto, v)} />
                             </td>
                             <td className="text-end">${formato(item.subtotal)}</td>
                             <td><span className="small">{item.lotes.join(', ')}</span></td>
                             <td className="text-center">
                               <button type="button" className="btn btn-sm text-danger" disabled={ocupado} onClick={() => handleQuitarProducto(item.id_producto)}>
                                 <Trash size={15} />
                               </button>
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>

                 </div>

                 <div className="col-lg-4">
                   <div className="position-sticky" style={{ top: 0 }}>
                   <div className="rounded-3 p-3" style={{ backgroundColor: 'var(--bg-main)', border: `1px solid ${styles.borderCol}` }}>
                     <div className="d-flex justify-content-between small" style={{ color: styles.mutedColor }}>
                       <span>Subtotal (base gravable)</span>
                       <span>${formato(ventaActiva?.base_gravable)}</span>
                     </div>
                     <div className="d-flex justify-content-between small mb-2" style={{ color: styles.mutedColor }}>
                       <span>IVA</span>
                       <span>${formato(ventaActiva?.iva)}</span>
                     </div>
                     <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ borderColor: styles.borderCol }}>
                       <span className="fw-semibold">Total</span>
                       <span className="fw-bold fs-4" style={{ color: 'var(--amber-action)' }}>
                         ${formato(ventaActiva?.total_venta)}
                       </span>
                     </div>
                   </div>
               <div className="rounded-3 p-3 mt-3" style={{ backgroundColor: 'var(--bg-main)', border: `1px solid ${styles.borderCol}` }}>
                 <h6 className="fw-bold small mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--amber-action)' }}>
                   <CashCoin size={16} /> Método de pago <span style={{ color: 'var(--brand-danger)' }}>*</span>
                 </h6>
                 <select
                   className="form-select form-select-sm"
                   value={metodoPago}
                   disabled={ocupado}
                   onChange={(e) => handleCambiarMetodoPago(e.target.value)}
                   style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                 >
                   {metodosPago.map((m) => (
                     <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
                   ))}
                 </select>
               </div>

               <div className="mt-3">
                 <label className="form-label small text-muted">Observaciones <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
                 <textarea
                   className="form-control form-control-sm"
                   rows="2"
                   maxLength={255}
                   value={observaciones}
                   onChange={(e) => setObservaciones(e.target.value)}
                   onBlur={handleGuardarObservaciones}
                   style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                 />
               </div>
                   </div>
                 </div>
               </div>
             </div>

             <div className="modal-footer border-0 p-4 pt-0">
               <button type="button" className="btn btn-outline-secondary" onClick={cerrarModalDescartando} disabled={ocupado}>
                 Cerrar
               </button>
               <button
                 type="button"
                 className="btn text-white"
                 style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}
                 onClick={handleConfirmarVenta}
                 disabled={!ventaActiva || carrito.length === 0 || ocupado}
               >
                 Confirmar venta
               </button>
             </div>
           </div>
         </div>
        </div>
      )}

      <VentaDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedVenta(null); }}
        venta={selectedVenta}
      />
    </div>
  );
};
