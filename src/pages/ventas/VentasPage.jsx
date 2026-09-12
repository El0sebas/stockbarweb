import React, { useState } from 'react';
import { Search, Plus, Trash, CartCheck, ClockHistory } from 'react-bootstrap-icons';
import { showToast } from '../../utils/alerts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { defaultVentas, defaultCatalogoVentas } from '../../data/defaultVentas';
import { generateNextIdentifier } from '../../utils/identifiers';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { VentaDetailModal } from './VentaDetailModal';
import { VentaEditModal } from './VentaEditModal';

// Un lote se sugiere como "por vencer" si su fecha está a 15 días o menos;
// es solo una sugerencia visual, no bloquea ni prioriza automáticamente nada.
const DIAS_SUGERENCIA_VENCIMIENTO = 15;

export const VentasPage = () => {
  // Mismo catálogo que MetodosPagoPage: activar/crear un método ahí lo hace
  // disponible aquí de inmediato, en vez de mantener una lista fija aparte.
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);
  const metodosPagoActivos = metodosPago.filter((m) => m.estado === 'Activo');

  const [ventas, setVentas] = usePersistentState('stockbar_ventas', defaultVentas);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [productoSearch, setProductoSearch] = useState('');
  const [cliente, setCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState(metodosPagoActivos[0]?.nombre || 'Efectivo');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [carrito, setCarrito] = useState([]);

  const [catalogoProductos, setCatalogoProductos] = usePersistentState('stockbar_catalogo_ventas', defaultCatalogoVentas);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);

  const getAvailableLots = (producto) => {
    if (!producto || !producto.maneja_vencimiento) return [];
    return (producto.lotes || [])
      .filter((lote) => Number(lote.cantidad_disponible) > 0 && new Date(lote.fecha_vencimiento) > new Date())
      .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
  };

  const getTotalAvailableStock = (producto) =>
    getAvailableLots(producto).reduce((total, lote) => total + Number(lote.cantidad_disponible), 0);

  // Solo una sugerencia visual: el lote más próximo a vencer dentro del rango.
  const getSugerenciaVencimiento = (producto) => {
    const proximo = getAvailableLots(producto)[0];
    if (!proximo) return null;
    const dias = Math.ceil((new Date(proximo.fecha_vencimiento) - new Date()) / 86400000);
    return dias <= DIAS_SUGERENCIA_VENCIMIENTO ? { ...proximo, dias } : null;
  };

  const handleOpenModal = () => {
    setCliente('');
    setMetodoPago(metodosPagoActivos[0]?.nombre || 'Efectivo');
    setReferenciaPago('');
    setCarrito([]);
    setProductoSearch('');
    setShowModal(true);
  };

  const handleAddProductoToVenta = (prod) => {
    const availableLots = getAvailableLots(prod);
    if (prod.maneja_vencimiento && availableLots.length === 0) {
      showToast('error', `El producto ${prod.nombre} no tiene lote disponible o ya venció.`);
      return;
    }

    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === prod.id);
      const maxQty = prod.maneja_vencimiento ? getTotalAvailableStock(prod) : Number.MAX_SAFE_INTEGER;

      if (existe) {
        if (existe.cantidad + 1 > maxQty) {
          showToast('error', 'No hay suficiente stock disponible según la fecha de vencimiento.');
          return prev;
        }

        return prev.map((item) =>
          item.id === prod.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                loteInfo: item.loteInfo || availableLots[0]
              }
            : item
        );
      }

      return [
        ...prev,
        {
          ...prod,
          cantidad: 1,
          loteInfo: prod.maneja_vencimiento ? availableLots[0] : null
        }
      ];
    });
  };

  const handleRemoveFromCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotalCarrito = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const handleSaveVenta = (e) => {
    e.preventDefault();
    if (!cliente.trim()) {
      showToast('error', 'Por favor ingresa el nombre del cliente');
      return;
    }
    if (carrito.length === 0) {
      showToast('error', 'Agrega al menos un producto a la venta');
      return;
    }

    const updatedCatalog = catalogoProductos.map((producto) => ({
      ...producto,
      lotes: (producto.lotes || []).map((lote) => ({ ...lote }))
    }));

    for (const item of carrito) {
      const producto = updatedCatalog.find((p) => p.id === item.id);
      if (!producto) continue;

      if (producto.maneja_vencimiento) {
        const availableLots = getAvailableLots(producto);
        const requiredQty = item.cantidad;

        if (availableLots.length === 0 || getTotalAvailableStock(producto) < requiredQty) {
          showToast('error', `No hay stock válido para ${producto.nombre} por vencimiento.`);
          return;
        }

        let remaining = requiredQty;

        for (const lote of availableLots) {
          if (remaining <= 0) break;
          const target = producto.lotes.find((l) => l.id_lote === lote.id_lote);
          if (!target) continue;
          const take = Math.min(remaining, Number(target.cantidad_disponible));
          target.cantidad_disponible -= take;
          remaining -= take;
        }

        if (remaining > 0) {
          showToast('error', `No es posible vender ${item.cantidad} unidades de ${producto.nombre}.`);
          return;
        }
      }
    }

    setCatalogoProductos(updatedCatalog);

    const nuevaVenta = {
      idVenta: generateNextIdentifier({ items: ventas, key: 'idVenta', prefix: 'VNT', pad: 3, separator: '-' }),
      cliente,
      metodoPago: metodoPago,
      referenciaPago: referenciaPago.trim() || 'N/A',
      fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
      productos: carrito.map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio: item.precio,
        lote: item.loteInfo?.numero_lote || 'Sin lote'
      })),
      total: subtotalCarrito,
      // El estado se administra únicamente desde el listado (ver handleToggleEstado).
      estado: 'Pendiente'
    };

    setVentas((prev) => [nuevaVenta, ...prev]);
    setCarrito([]);
    setCliente('');
    setMetodoPago(metodosPagoActivos[0]?.nombre || 'Efectivo');
    setReferenciaPago('');
    setShowModal(false);
    showToast('success', 'Venta registrada validando lote y vencimiento');
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

  const handleToggleEstado = (idVenta) => {
    const ventaActual = ventas.find(v => v.idVenta === idVenta);
    // Si ya está completado, no hace nada (bloqueado)
    if (ventaActual?.estado === 'Completado') return;

    setVentas(prev => prev.map(v => {
      if (v.idVenta === idVenta) {
        showToast('success', `La venta ${idVenta} ha sido marcada como completada`);
        return { ...v, estado: 'Completado' };
      }
      return v;
    }));
  };

  // Editar y eliminar solo están disponibles mientras la venta esté
  // Pendiente; una vez Completada quedan bloqueadas (regla de una sola vía).
  const handleOpenDetail = (venta) => {
    setSelectedVenta(venta);
    setShowDetailModal(true);
  };

  const handleOpenEdit = (venta) => {
    setSelectedVenta(venta);
    setShowEditModal(true);
  };

  const handleSaveEdit = (ventaActualizada) => {
    setVentas((prev) => prev.map((v) => (v.idVenta === ventaActualizada.idVenta ? ventaActualizada : v)));
    setShowEditModal(false);
    setSelectedVenta(null);
    showToast('success', `Venta ${ventaActualizada.idVenta} actualizada`);
  };

  const handleOpenDelete = (venta) => {
    setSelectedVenta(venta);
    setShowDeleteModal(true);
  };

  // Al eliminar una venta pendiente, se repone el stock que había reservado
  // (mismo lote, por nombre + número de lote) en vez de dejarlo perdido.
  const handleConfirmDelete = () => {
    if (selectedVenta) {
      setCatalogoProductos((prev) =>
        prev.map((producto) => {
          const itemsDelProducto = selectedVenta.productos.filter((p) => p.nombre === producto.nombre);
          if (itemsDelProducto.length === 0) return producto;

          return {
            ...producto,
            lotes: (producto.lotes || []).map((lote) => {
              const item = itemsDelProducto.find((p) => p.lote === lote.numero_lote);
              return item ? { ...lote, cantidad_disponible: Number(lote.cantidad_disponible) + item.cantidad } : lote;
            })
          };
        })
      );
      setVentas((prev) => prev.filter((v) => v.idVenta !== selectedVenta.idVenta));
      showToast('success', `Venta ${selectedVenta.idVenta} eliminada y stock repuesto`);
    }
    setShowDeleteModal(false);
    setSelectedVenta(null);
  };

  return (
    <div className="container-fluid p-0">
      {/* Cabecera y buscador */}
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
            style={{ backgroundColor: 'var(--amber-action)', border: 'none' }} 
            onClick={handleOpenModal}
          >
            <Plus size={18} />
            <span>Registrar</span>
          </button>
        </div>
      </div>

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
                  <tr key={v.idVenta} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{v.idVenta}</td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>{v.cliente}</td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>{v.fecha}</td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {v.productos.map((p, idx) => (
                        <div key={idx}>- {p.nombre} (x{p.cantidad}){p.lote ? ` • ${p.lote}` : ''}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-end fw-bold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      $ {Number(v.total).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle
                        active={v.estado === 'Completado'}
                        onToggle={() => handleToggleEstado(v.idVenta)}
                        activeLabel="Completado"
                        inactiveLabel="Pendiente"
                        disabled={v.estado === 'Completado'}
                      />
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <RowActions
                        onView={() => handleOpenDetail(v)}
                        onEdit={() => handleOpenEdit(v)}
                        onDelete={() => handleOpenDelete(v)}
                        disabledReason={v.estado !== 'Pendiente' ? 'Solo se puede editar o eliminar mientras la venta esté Pendiente' : undefined}
                      />
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
                 <h5 className="modal-title fw-bold m-0">Registrar venta web</h5>
               </div>
               <button type="button" className="btn-close shadow-none btn-close-themed" onClick={() => setShowModal(false)}></button>
             </div>

             <form onSubmit={handleSaveVenta}>
               <div className="modal-body p-4">
                 <div className="row g-3 mb-4">
                   <div className="col-md-6">
                     <label className="form-label small fw-semibold">Cliente</label>
                     <input
                       type="text"
                       className="form-control"
                       value={cliente}
                       onChange={(e) => setCliente(e.target.value)}
                       placeholder="Nombre del cliente"
                       style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                     />
                   </div>
                   <div className="col-md-3">
                     <label className="form-label small fw-semibold">Método de pago</label>
                     <select
                       className="form-select"
                       value={metodoPago}
                       onChange={(e) => setMetodoPago(e.target.value)}
                       style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                     >
                       {metodosPagoActivos.map((m) => (
                         <option key={m.id_metodo_pago} value={m.nombre}>{m.nombre}</option>
                       ))}
                     </select>
                   </div>
                   <div className="col-md-3">
                     <label className="form-label small fw-semibold">Referencia</label>
                     <input
                       type="text"
                       className="form-control"
                       value={referenciaPago}
                       onChange={(e) => setReferenciaPago(e.target.value)}
                        placeholder="Opcional"
                       style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                     />
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
                     <div
                       className="rounded-3"
                       style={{ border: `1px solid ${styles.borderCol}`, maxHeight: '220px', overflowY: 'auto' }}
                     >
                       {catalogoProductos
                         .filter((prod) => prod.nombre.toLowerCase().includes(productoSearch.toLowerCase()))
                         .map((prod) => {
                           const sugerencia = getSugerenciaVencimiento(prod);
                           return (
                             <div
                               key={prod.id}
                               className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
                               style={{ borderColor: styles.borderCol }}
                             >
                               <div>
                                 <div className="fw-semibold small">{prod.nombre}</div>
                                 <div className="d-flex align-items-center gap-2">
                                   <span className="small" style={{ color: styles.mutedColor }}>
                                     ${new Intl.NumberFormat('es-CO').format(prod.precio)}
                                   </span>
                                   {sugerencia && (
                                     <span
                                       className="badge d-inline-flex align-items-center gap-1"
                                       style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)', fontWeight: 500 }}
                                       title={`Lote ${sugerencia.numero_lote} vence el ${sugerencia.fecha_vencimiento}`}
                                     >
                                       <ClockHistory size={10} />
                                       Por vencer ({sugerencia.dias}d)
                                     </span>
                                   )}
                                 </div>
                               </div>
                               <button
                                 type="button"
                                 className="btn btn-sm p-1"
                                 style={{ color: 'var(--amber-action)' }}
                                 onClick={() => handleAddProductoToVenta(prod)}
                                 title="Agregar a la venta"
                               >
                                 <Plus size={20} />
                               </button>
                             </div>
                           );
                         })}
                       {catalogoProductos.filter((prod) => prod.nombre.toLowerCase().includes(productoSearch.toLowerCase())).length === 0 && (
                         <div className="text-center py-3 small" style={{ color: styles.mutedColor }}>
                           No se encontraron productos.
                         </div>
                       )}
                     </div>
                   </div>
                   <div className="col-md-5">
                     <div className="rounded-3 p-3" style={{ backgroundColor: 'var(--bg-main)', border: `1px solid ${styles.borderCol}` }}>
                       <div className="small text-muted">Total estimado</div>
                       <div className="fw-bold fs-4" style={{ color: 'var(--amber-action)' }}>
                         ${new Intl.NumberFormat('es-CO').format(subtotalCarrito)}
                       </div>
                     </div>
                   </div>
                 </div>

                 <div className="table-responsive">
                   <table className="table align-middle mb-0" style={{ color: styles.textColor }}>
                     <thead>
                       <tr style={{ borderColor: styles.borderCol }}>
                         <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Producto</th>
                         <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Cant.</th>
                         <th className="small text-uppercase text-end" style={{ color: styles.mutedColor }}>Precio</th>
                         <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Lote/Vencimiento</th>
                         <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Acción</th>
                       </tr>
                     </thead>
                     <tbody>
                       {carrito.length === 0 ? (
                         <tr>
                           <td colSpan="5" className="text-center py-4" style={{ color: styles.mutedColor }}>
                             Agrega productos para iniciar la venta.
                           </td>
                         </tr>
                       ) : (
                         carrito.map((item) => (
                           <tr key={item.id} style={{ borderColor: styles.borderCol }}>
                             <td className="fw-semibold">{item.nombre}</td>
                             <td className="text-center">{item.cantidad}</td>
                             <td className="text-end">${new Intl.NumberFormat('es-CO').format(item.precio * item.cantidad)}</td>
                             <td>
                               {item.maneja_vencimiento && item.loteInfo ? (
                                 <span className="small">
                                   {item.loteInfo.numero_lote} • {item.loteInfo.fecha_vencimiento}
                                 </span>
                               ) : (
                                 <span className="small text-muted">Sin control de vencimiento</span>
                               )}
                             </td>
                             <td className="text-center">
                               <button type="button" className="btn btn-sm text-danger" onClick={() => handleRemoveFromCarrito(item.id)}>
                                 <Trash size={15} />
                               </button>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>

               <div className="modal-footer border-0 p-4 pt-0">
                 <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                   Cancelar
                 </button>
                 <button type="submit" className="btn text-white" style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}>
                   Confirmar venta
                 </button>
               </div>
             </form>
           </div>
         </div>
        </div>
      )}

      <VentaDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedVenta(null); }}
        venta={selectedVenta}
      />

      <VentaEditModal
        show={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedVenta(null); }}
        onSave={handleSaveEdit}
        venta={selectedVenta}
        metodosPagoActivos={metodosPagoActivos}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedVenta(null); }}
        onConfirm={handleConfirmDelete}
        itemName={selectedVenta?.idVenta}
      />
    </div>
  );
};