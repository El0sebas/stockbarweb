import React, { useState } from 'react';
import { Search, Plus, Trash, CartCheck, ClockHistory, ShieldExclamation, CashCoin, PlayFill, XCircle, Eye } from 'react-bootstrap-icons';
import { showToast, showAlert } from '../../utils/alerts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useAuth } from '../../context/AuthContext';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { defaultVentas } from '../../data/defaultVentas';
import { defaultCategorias } from '../../data/defaultCategorias';
import { defaultClientes } from '../../data/defaultClientes';
import { defaultProductos } from '../../data/defaultProductos';
import { defaultLotes } from '../../data/defaultLotes';
import { defaultJornadas } from '../../data/defaultJornadas';
import { generateNextIdentifier, generateNextId } from '../../utils/identifiers';
import { calcularTotalesVenta, getPorcentajeIva } from '../../utils/impuestos';
import { validarEdadCliente } from '../../utils/edad';
import { getLotesVendibles, getStockDisponible, getEstadoVencimiento } from '../../utils/stock';
import { getJornadaAbierta } from '../../utils/jornada';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { VentaDetailModal } from './VentaDetailModal';

export const VentasPage = () => {
  const { currentUser } = useAuth();
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);
  const metodosPagoActivos = metodosPago.filter((m) => m.estado === 'Activo');

  const [ventas, setVentas] = usePersistentState('stockbar_ventas', defaultVentas);
  const [lotes, setLotes] = usePersistentState('stockbar_lotes', defaultLotes);
  const [productos] = usePersistentState('stockbar_productos', defaultProductos);
  const [categorias] = usePersistentState('stockbar_categorias', defaultCategorias);
  const [clientes] = usePersistentState('stockbar_clientes', defaultClientes);
  const [jornadas] = usePersistentState('stockbar_jornadas', defaultJornadas);
  const jornadaAbierta = getJornadaAbierta(jornadas);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [ventaActivaId, setVentaActivaId] = useState(null);
  const [productoSearch, setProductoSearch] = useState('');
  const [cantidadesBusqueda, setCantidadesBusqueda] = useState({});
  const [idCliente, setIdCliente] = useState('');
  const [metodoPagoNuevo, setMetodoPagoNuevo] = useState(metodosPagoActivos[0]?.id_metodo_pago || 1);
  const [montoNuevoPago, setMontoNuevoPago] = useState('');
  const [referenciaNuevoPago, setReferenciaNuevoPago] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);

  const ventaActiva = ventaActivaId ? ventas.find((v) => v.id_venta === ventaActivaId) : null;
  const productosActivos = productos.filter((p) => p.estado === 'Activo');
  const clientesActivos = clientes.filter((c) => c.estado === 'Activo');
  const clienteSeleccionado = idCliente ? clientes.find((c) => c.id_cliente === Number(idCliente)) : null;

  const getRequiereEdad = (nombreCategoria) =>
    Boolean(categorias.find((c) => c.nombre === nombreCategoria)?.requiere_verificacion_edad);

  // FEFO: lotes con stock real, sin vencer, ordenados por fecha_vencimiento
  // ascendente (los sin vencimiento no se excluyen — un lote siempre existe
  // aunque el producto no maneje vencimiento, ver docs/DATABASE.md).
  const getLotesFEFO = (codigoProducto) =>
    getLotesVendibles(lotes, codigoProducto)
      .filter((l) => Number(l.cantidad_disponible) > 0 && getEstadoVencimiento(l.fecha_vencimiento) !== 'vencido')
      .sort((a, b) => {
        if (!a.fecha_vencimiento && !b.fecha_vencimiento) return 0;
        if (!a.fecha_vencimiento) return 1;
        if (!b.fecha_vencimiento) return -1;
        return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
      });

  // Solo una sugerencia visual (mismo criterio de siempre): el lote más
  // próximo a vencer dentro del rango de 15 días.
  const getSugerenciaVencimiento = (codigoProducto) => {
    const proximo = getLotesFEFO(codigoProducto).find((l) => l.fecha_vencimiento);
    if (!proximo) return null;
    const dias = Math.ceil((new Date(proximo.fecha_vencimiento) - new Date()) / 86400000);
    return dias <= 15 ? { ...proximo, dias } : null;
  };

  const handleOpenModal = (ventaExistente = null) => {
    if (!jornadaAbierta) {
      showAlert.error('No hay jornada abierta', 'Debes abrir una jornada (menú "Jornada") antes de poder registrar ventas.');
      return;
    }
    setVentaActivaId(ventaExistente?.id_venta || null);
    setIdCliente(ventaExistente?.id_cliente ? String(ventaExistente.id_cliente) : '');
    setProductoSearch('');
    setCantidadesBusqueda({});
    setMetodoPagoNuevo(metodosPagoActivos[0]?.id_metodo_pago || 1);
    setMontoNuevoPago('');
    setReferenciaNuevoPago('');
    setShowModal(true);
  };

  const actualizarVenta = (idVenta, updater) => {
    setVentas((prev) => prev.map((v) => (v.id_venta === idVenta ? updater(v) : v)));
  };

  const recalcularTotal = (venta) =>
    calcularTotalesVenta(venta.productos.map((p) => ({ precio: p.precio, cantidad: p.cantidad, porcentajeIva: p.porcentajeIva }))).total;

  // Crea la venta PENDIENTE real en el "servidor" (stockbar_ventas) en el
  // momento del primer producto agregado — el carrito nunca es solo un
  // estado local del navegador.
  const crearVentaPendiente = () => {
    const idVenta = generateNextId(ventas, 'id_venta');
    const nuevaVenta = {
      id_venta: idVenta,
      idVenta: generateNextIdentifier({ items: ventas, key: 'idVenta', prefix: 'VNT', pad: 3, separator: '-' }),
      id_cliente: idCliente ? Number(idCliente) : null,
      cliente: clienteSeleccionado ? clienteSeleccionado.nombre_completo : 'Cliente de mostrador',
      id_jornada: jornadaAbierta.id_jornada,
      id_usuario: currentUser?.id_usuario || null,
      usuario: currentUser?.nombre || 'N/A',
      fecha_hora_venta: new Date().toISOString(),
      estado: 'PENDIENTE',
      observaciones: null,
      productos: [],
      pagos: [],
      total: 0
    };
    setVentas((prev) => [nuevaVenta, ...prev]);
    setVentaActivaId(idVenta);
    return idVenta;
  };

  const handleCambiarCliente = (value) => {
    setIdCliente(value);
    if (ventaActivaId) {
      const cli = value ? clientes.find((c) => c.id_cliente === Number(value)) : null;
      actualizarVenta(ventaActivaId, (v) => ({ ...v, id_cliente: cli?.id_cliente || null, cliente: cli ? cli.nombre_completo : 'Cliente de mostrador' }));
    }
  };

  const handleAgregarProducto = (prod) => {
    if (!jornadaAbierta) {
      showAlert.error('No hay jornada abierta', 'La venta no puede registrarse porque no hay una jornada ABIERTA.');
      return;
    }

    // Ayuda de UX: avisar antes de guardar (la BD vuelve a validar al confirmar).
    if (getRequiereEdad(prod.categoria)) {
      const mensajeEdad = validarEdadCliente(clienteSeleccionado);
      if (mensajeEdad) {
        showAlert.error('Verificación de edad requerida', mensajeEdad);
        return;
      }
    }

    const cantidadDeseada = cantidadesBusqueda[prod.codigo] || 1;
    const lotesFEFO = getLotesFEFO(prod.codigo);
    const totalDisponible = lotesFEFO.reduce((acc, l) => acc + Number(l.cantidad_disponible), 0);

    if (totalDisponible < cantidadDeseada) {
      showAlert.error('Stock insuficiente', 'La cantidad solicitada supera el disponible del lote.');
      return;
    }

    const idVenta = ventaActivaId || crearVentaPendiente();
    const porcentajeIva = getPorcentajeIva(categorias, prod.categoria);

    // Reparte la cantidad en una línea por lote (FEFO): cada línea de venta
    // referencia un solo lote, igual que detalle_venta.id_lote.
    let restante = cantidadDeseada;
    const consumo = [];
    for (const lote of lotesFEFO) {
      if (restante <= 0) break;
      const take = Math.min(restante, Number(lote.cantidad_disponible));
      consumo.push({ lote, take });
      restante -= take;
    }

    setLotes((prev) =>
      prev.map((l) => {
        const c = consumo.find((c) => c.lote.id_lote === l.id_lote);
        return c ? { ...l, cantidad_disponible: Number(l.cantidad_disponible) - c.take } : l;
      })
    );

    actualizarVenta(idVenta, (venta) => {
      const productosActualizados = [...venta.productos];
      consumo.forEach(({ lote, take }) => {
        const idx = productosActualizados.findIndex((p) => p.id_lote === lote.id_lote);
        if (idx >= 0) {
          productosActualizados[idx] = { ...productosActualizados[idx], cantidad: productosActualizados[idx].cantidad + take };
        } else {
          productosActualizados.push({
            id_lote: lote.id_lote,
            nombre: prod.nombre,
            categoria: prod.categoria,
            cantidad: take,
            precio: prod.precioVenta,
            lote: lote.numero_lote_proveedor || `#${lote.id_lote}`,
            porcentajeIva
          });
        }
      });
      const ventaActualizada = { ...venta, productos: productosActualizados };
      return { ...ventaActualizada, total: recalcularTotal(ventaActualizada) };
    });

    setCantidadesBusqueda((prev) => ({ ...prev, [prod.codigo]: 1 }));
  };

  const handleQuitarLinea = (idLote) => {
    if (!ventaActiva) return;
    const linea = ventaActiva.productos.find((p) => p.id_lote === idLote);
    if (!linea) return;

    setLotes((prev) => prev.map((l) => (l.id_lote === idLote ? { ...l, cantidad_disponible: Number(l.cantidad_disponible) + linea.cantidad } : l)));
    actualizarVenta(ventaActiva.id_venta, (venta) => {
      const productosActualizados = venta.productos.filter((p) => p.id_lote !== idLote);
      const ventaActualizada = { ...venta, productos: productosActualizados };
      return { ...ventaActualizada, total: recalcularTotal(ventaActualizada) };
    });
  };

  const handleCambiarCantidadLinea = (idLote, nuevaCantidad) => {
    if (!ventaActiva) return;
    const linea = ventaActiva.productos.find((p) => p.id_lote === idLote);
    const lote = lotes.find((l) => l.id_lote === idLote);
    if (!linea || !lote) return;

    const delta = nuevaCantidad - linea.cantidad;
    if (delta > Number(lote.cantidad_disponible)) {
      showToast('error', 'La cantidad solicitada supera el disponible del lote.');
      return;
    }

    setLotes((prev) => prev.map((l) => (l.id_lote === idLote ? { ...l, cantidad_disponible: Number(l.cantidad_disponible) - delta } : l)));
    actualizarVenta(ventaActiva.id_venta, (venta) => {
      const productosActualizados = venta.productos.map((p) => (p.id_lote === idLote ? { ...p, cantidad: nuevaCantidad } : p));
      const ventaActualizada = { ...venta, productos: productosActualizados };
      return { ...ventaActualizada, total: recalcularTotal(ventaActualizada) };
    });
  };

  const totalPagado = ventaActiva ? ventaActiva.pagos.reduce((acc, p) => acc + Number(p.monto), 0) : 0;
  const diferenciaPago = ventaActiva ? ventaActiva.total - totalPagado : 0;

  const handleAgregarPago = () => {
    if (!ventaActiva) return;
    const monto = Number(montoNuevoPago);
    if (!monto || monto <= 0) {
      showAlert.error('Monto inválido', 'El monto del pago debe ser mayor que cero.');
      return;
    }
    const metodo = metodosPago.find((m) => m.id_metodo_pago === Number(metodoPagoNuevo));
    actualizarVenta(ventaActiva.id_venta, (venta) => ({
      ...venta,
      pagos: [...venta.pagos, { id_metodo_pago: Number(metodoPagoNuevo), metodoPago: metodo?.nombre || 'N/A', monto, referencia_transaccion: referenciaNuevoPago.trim() || null }]
    }));
    setMontoNuevoPago('');
    setReferenciaNuevoPago('');
  };

  const handleQuitarPago = (index) => {
    if (!ventaActiva) return;
    actualizarVenta(ventaActiva.id_venta, (venta) => ({ ...venta, pagos: venta.pagos.filter((_, i) => i !== index) }));
  };

  // Libera el stock reservado por todas las líneas de una venta (cancelar
  // PENDIENTE o anular COMPLETADA usan la misma liberación).
  const liberarStockVenta = (venta) => {
    setLotes((prev) =>
      prev.map((l) => {
        const linea = venta.productos.find((p) => p.id_lote === l.id_lote);
        return linea ? { ...l, cantidad_disponible: Number(l.cantidad_disponible) + linea.cantidad } : l;
      })
    );
  };

  const handleConfirmarVenta = () => {
    if (!ventaActiva) {
      showToast('error', 'Agrega al menos un producto a la venta');
      return;
    }

    // Re-validación defensiva de edad (espejo de sp_validar_detalle_venta):
    // por si el cliente se deseleccionó después de agregar un +18.
    const itemRestringido = ventaActiva.productos.find((p) => getRequiereEdad(p.categoria));
    if (itemRestringido) {
      const mensajeEdad = validarEdadCliente(clienteSeleccionado);
      if (mensajeEdad) {
        showAlert.error('Verificación de edad requerida', mensajeEdad);
        return;
      }
    }

    // Espejo exacto de sp_validar_cierre_venta.
    if (ventaActiva.productos.length === 0) {
      showAlert.error('Venta rechazada', 'Una venta COMPLETADA debe tener al menos un detalle.');
      return;
    }
    if (ventaActiva.total <= 0) {
      showAlert.error('Venta rechazada', 'El total de la venta debe ser mayor que cero.');
      return;
    }
    if (ventaActiva.total !== totalPagado) {
      showAlert.error('Venta rechazada', 'El total de la venta no coincide con el total pagado.');
      return;
    }

    actualizarVenta(ventaActiva.id_venta, (venta) => ({ ...venta, estado: 'COMPLETADA' }));
    setShowModal(false);
    setVentaActivaId(null);
    showToast('success', `Venta ${ventaActiva.idVenta} completada`);
  };

  const cerrarModalDescartando = async () => {
    if (ventaActiva && ventaActiva.productos.length > 0) {
      const confirmado = await showAlert.confirm(
        '¿Cancelar esta venta?',
        'Se liberará el stock reservado y la venta quedará marcada como ANULADA en el historial.'
      );
      if (!confirmado) return;
      liberarStockVenta(ventaActiva);
      actualizarVenta(ventaActiva.id_venta, (venta) => ({ ...venta, estado: 'ANULADA' }));
    } else if (ventaActiva) {
      // Sin líneas todavía: se anula igual para no dejar un registro
      // PENDIENTE huérfano sin stock que liberar.
      actualizarVenta(ventaActiva.id_venta, (venta) => ({ ...venta, estado: 'ANULADA' }));
    }
    setShowModal(false);
    setVentaActivaId(null);
  };

  const handleCancelarPendienteDesdeHistorial = async (venta) => {
    const confirmado = await showAlert.confirm('¿Cancelar esta venta pendiente?', 'Se liberará el stock reservado.');
    if (!confirmado) return;
    liberarStockVenta(venta);
    actualizarVenta(venta.id_venta, (v) => ({ ...v, estado: 'ANULADA' }));
    showToast('success', `Venta ${venta.idVenta} cancelada`);
  };

  const handleAnularCompletada = async (venta) => {
    const confirmado = await showAlert.confirm('¿Anular esta venta?', 'El stock se repone y la venta queda marcada como ANULADA en el historial (no se borra).');
    if (!confirmado) return;
    liberarStockVenta(venta);
    actualizarVenta(venta.id_venta, (v) => ({ ...v, estado: 'ANULADA' }));
    setShowDetailModal(false);
    showToast('success', `Venta ${venta.idVenta} anulada`);
  };

  const filteredVentas = ventas.filter((v) =>
    v.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.idVenta.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{v.idVenta}</td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>{v.cliente}</td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>{new Date(v.fecha_hora_venta).toLocaleString('es-CO')}</td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {v.productos.map((p, idx) => (
                        <div key={idx}>- {p.nombre} (x{p.cantidad}){p.lote ? ` • ${p.lote}` : ''}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-end fw-bold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      $ {Number(v.total).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <span className="badge px-3 py-1" style={estadoBadgeStyle(v.estado)}>{v.estado}</span>
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--brand-blue)' }} title="Ver detalle" onClick={() => { setSelectedVenta(v); setShowDetailModal(true); }}>
                          <Eye size={18} />
                        </button>
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
                        {v.estado === 'COMPLETADA' && (
                          <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--brand-danger)' }} title="Anular" onClick={() => handleAnularCompletada(v)}>
                            <XCircle size={18} />
                          </button>
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
                   {ventaActiva ? `Venta ${ventaActiva.idVenta} (PENDIENTE)` : 'Registrar venta web'}
                 </h5>
               </div>
               <button type="button" className="btn-close shadow-none btn-close-themed" onClick={cerrarModalDescartando}></button>
             </div>

             <div className="modal-body p-4">
               <div className="row g-3 mb-4">
                 <div className="col-md-6">
                   <label className="form-label small fw-semibold">Cliente</label>
                   <select
                     className="form-select"
                     value={idCliente}
                     onChange={(e) => handleCambiarCliente(e.target.value)}
                     style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                   >
                     <option value="">Cliente de mostrador (sin registrar)</option>
                     {clientesActivos.map((c) => (
                       <option key={c.id_cliente} value={c.id_cliente}>
                         {c.nombre_completo}{!c.fecha_nacimiento ? ' — sin fecha de nacimiento' : ''}
                       </option>
                     ))}
                   </select>
                   {ventaActiva && ventaActiva.productos.some((p) => getRequiereEdad(p.categoria)) && (
                     <div className="small mt-1 d-flex align-items-center gap-1" style={{ color: 'var(--brand-danger)' }}>
                       <ShieldExclamation size={12} />
                       El carrito tiene productos +18: requiere cliente con fecha de nacimiento y mayor de edad.
                     </div>
                   )}
                 </div>
               </div>

               <div className="row g-3 mb-4">
                 <div className="col-md-7">
                   <label className="form-label small fw-semibold">Agregar producto</label>
                   <div className="position-relative mb-2">
                     <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
                     <input
                       type="text"
                       className="form-control form-control-sm ps-4"
                       placeholder="Buscar producto por nombre..."
                       value={productoSearch}
                       onChange={(e) => setProductoSearch(e.target.value)}
                       style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                     />
                   </div>
                   <div className="rounded-3" style={{ border: `1px solid ${styles.borderCol}`, maxHeight: '220px', overflowY: 'auto' }}>
                     {productosActivos
                       .filter((prod) => prod.nombre.toLowerCase().includes(productoSearch.toLowerCase()))
                       .map((prod) => {
                         const sugerencia = getSugerenciaVencimiento(prod.codigo);
                         const stockDisponible = getStockDisponible(lotes, prod.codigo);
                         return (
                           <div key={prod.codigo} className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom gap-2" style={{ borderColor: styles.borderCol }}>
                             <div>
                               <div className="fw-semibold small d-flex align-items-center gap-2">
                                 {prod.nombre}
                                 {getRequiereEdad(prod.categoria) && (
                                   <span className="badge" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', fontSize: '0.65rem' }}>+18</span>
                                 )}
                               </div>
                               <div className="d-flex align-items-center gap-2">
                                 <span className="small" style={{ color: styles.mutedColor }}>
                                   ${new Intl.NumberFormat('es-CO').format(prod.precioVenta)} • {stockDisponible} disp.
                                 </span>
                                 {sugerencia && (
                                   <span className="badge d-inline-flex align-items-center gap-1" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)', fontWeight: 500 }}>
                                     <ClockHistory size={10} />
                                     Por vencer ({sugerencia.dias}d)
                                   </span>
                                 )}
                               </div>
                             </div>
                             <div className="d-flex align-items-center gap-2 flex-shrink-0">
                               <QuantityStepper
                                 value={cantidadesBusqueda[prod.codigo] || 1}
                                 max={stockDisponible || undefined}
                                 onChange={(v) => setCantidadesBusqueda((prev) => ({ ...prev, [prod.codigo]: v }))}
                               />
                               <button type="button" className="btn btn-sm p-1" style={{ color: 'var(--amber-action)' }} onClick={() => handleAgregarProducto(prod)} title="Agregar a la venta" disabled={stockDisponible === 0}>
                                 <Plus size={20} />
                               </button>
                             </div>
                           </div>
                         );
                       })}
                     {productosActivos.filter((prod) => prod.nombre.toLowerCase().includes(productoSearch.toLowerCase())).length === 0 && (
                       <div className="text-center py-3 small" style={{ color: styles.mutedColor }}>No se encontraron productos.</div>
                     )}
                   </div>
                 </div>

                 <div className="col-md-5">
                   <div className="rounded-3 p-3" style={{ backgroundColor: 'var(--bg-main)', border: `1px solid ${styles.borderCol}` }}>
                     <div className="d-flex justify-content-between small" style={{ color: styles.mutedColor }}>
                       <span>Subtotal (base gravable)</span>
                       <span>${new Intl.NumberFormat('es-CO').format(Math.round((ventaActiva ? calcularTotalesVenta(ventaActiva.productos) : { baseGravable: 0 }).baseGravable))}</span>
                     </div>
                     <div className="d-flex justify-content-between small mb-2" style={{ color: styles.mutedColor }}>
                       <span>IVA</span>
                       <span>${new Intl.NumberFormat('es-CO').format(Math.round((ventaActiva ? calcularTotalesVenta(ventaActiva.productos) : { iva: 0 }).iva))}</span>
                     </div>
                     <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ borderColor: styles.borderCol }}>
                       <span className="fw-semibold">Total</span>
                       <span className="fw-bold fs-4" style={{ color: 'var(--amber-action)' }}>
                         ${new Intl.NumberFormat('es-CO').format(ventaActiva ? ventaActiva.total : 0)}
                       </span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="table-responsive mb-4">
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
                     {!ventaActiva || ventaActiva.productos.length === 0 ? (
                       <tr>
                         <td colSpan="5" className="text-center py-4" style={{ color: styles.mutedColor }}>Agrega productos para iniciar la venta.</td>
                       </tr>
                     ) : (
                       ventaActiva.productos.map((item) => {
                         const lote = lotes.find((l) => l.id_lote === item.id_lote);
                         return (
                           <tr key={item.id_lote} style={{ borderColor: styles.borderCol }}>
                             <td className="fw-semibold">
                               {item.nombre}
                               {getRequiereEdad(item.categoria) && (
                                 <span className="badge ms-2" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', fontSize: '0.65rem' }}>+18</span>
                               )}
                             </td>
                             <td className="text-center">
                               <QuantityStepper value={item.cantidad} max={item.cantidad + Number(lote?.cantidad_disponible || 0)} onChange={(v) => handleCambiarCantidadLinea(item.id_lote, v)} />
                             </td>
                             <td className="text-end">${new Intl.NumberFormat('es-CO').format(item.precio * item.cantidad)}</td>
                             <td><span className="small">{item.lote}</span></td>
                             <td className="text-center">
                               <button type="button" className="btn btn-sm text-danger" onClick={() => handleQuitarLinea(item.id_lote)}>
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

               <div className="rounded-3 p-3" style={{ backgroundColor: 'var(--bg-main)', border: `1px solid ${styles.borderCol}` }}>
                 <h6 className="fw-bold small mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--amber-action)' }}>
                   <CashCoin size={16} /> Pagos
                 </h6>
                 <div className="row g-2 align-items-end mb-3">
                   <div className="col-md-4">
                     <label className="form-label small text-muted">Método</label>
                     <select className="form-select form-select-sm" value={metodoPagoNuevo} onChange={(e) => setMetodoPagoNuevo(e.target.value)} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}>
                       {metodosPagoActivos.map((m) => (
                         <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
                       ))}
                     </select>
                   </div>
                   <div className="col-md-3">
                     <label className="form-label small text-muted">Monto</label>
                     <input type="number" min="0" className="form-control form-control-sm" value={montoNuevoPago} onChange={(e) => setMontoNuevoPago(e.target.value)} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} />
                   </div>
                   <div className="col-md-3">
                     <label className="form-label small text-muted">Referencia (opcional)</label>
                     <input type="text" className="form-control form-control-sm" value={referenciaNuevoPago} onChange={(e) => setReferenciaNuevoPago(e.target.value)} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} />
                   </div>
                   <div className="col-md-2 d-grid">
                     <button type="button" className="btn btn-sm text-white" style={{ backgroundColor: 'var(--amber-action)', border: 'none' }} onClick={handleAgregarPago} disabled={!ventaActiva}>
                       Agregar pago
                     </button>
                   </div>
                 </div>

                 {ventaActiva && ventaActiva.pagos.length > 0 && (
                   <div className="mb-3">
                     {ventaActiva.pagos.map((p, idx) => (
                       <div key={idx} className="d-flex justify-content-between align-items-center small py-1 border-bottom" style={{ borderColor: styles.borderCol }}>
                         <span>{p.metodoPago}{p.referencia_transaccion ? ` • ${p.referencia_transaccion}` : ''}</span>
                         <div className="d-flex align-items-center gap-2">
                           <span className="fw-semibold">${new Intl.NumberFormat('es-CO').format(p.monto)}</span>
                           <button type="button" className="btn btn-sm p-0 text-danger border-0" onClick={() => handleQuitarPago(idx)}><Trash size={13} /></button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="d-flex justify-content-between align-items-center">
                   <span className="small fw-semibold">
                     {diferenciaPago === 0 && ventaActiva ? (
                       <span style={{ color: 'var(--brand-success)' }}>Cuadrado ✓</span>
                     ) : diferenciaPago > 0 ? (
                       <span style={{ color: 'var(--brand-danger)' }}>Falta: ${new Intl.NumberFormat('es-CO').format(diferenciaPago)}</span>
                     ) : (
                       <span style={{ color: 'var(--brand-danger)' }}>Sobra: ${new Intl.NumberFormat('es-CO').format(Math.abs(diferenciaPago))}</span>
                     )}
                   </span>
                 </div>
               </div>
             </div>

             <div className="modal-footer border-0 p-4 pt-0">
               <button type="button" className="btn btn-outline-secondary" onClick={cerrarModalDescartando}>
                 Cancelar
               </button>
               <button
                 type="button"
                 className="btn text-white"
                 style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}
                 onClick={handleConfirmarVenta}
                 disabled={!ventaActiva || ventaActiva.productos.length === 0 || diferenciaPago !== 0}
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
        onAnular={handleAnularCompletada}
      />
    </div>
  );
};
