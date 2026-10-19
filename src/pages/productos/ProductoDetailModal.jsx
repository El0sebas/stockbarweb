import React from 'react';
import { BoxSeam, Tag, CurrencyDollar, Layers, ShieldExclamation, ExclamationTriangle } from 'react-bootstrap-icons';
import { getEstadoVencimiento } from '../../utils/stock';
import { useApi } from '../../hooks/useApi';

// Detalle (CU_03_04): stock de vw_stock_producto, lotes de vw_stock_lotes
// (solo lectura, nacen en Compras) y proveedores del catálogo.
export const ProductoDetailModal = ({ show, onClose, producto: resumen, onDarDeBaja }) => {
  const { data: detalle } = useApi(show && resumen ? `/productos/${resumen.id_producto}` : null);

  if (!show || !resumen) return null;

  const producto = detalle?.id_producto === resumen.id_producto ? detalle : resumen;
  const proveedoresProducto = producto.proveedores ?? [];
  const porcentajeIva = producto.porcentaje_iva;
  const margenEfectivo = producto.margen_personalizado_porcentaje != null
    ? { valor: producto.margen_personalizado_porcentaje, origen: 'personalizado' }
    : { valor: producto.margen_defecto_porcentaje, origen: 'de la categoría' };
  const lotesProducto = producto.lotes ?? [];
  const stockActual = producto.stock_actual;

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    detailBoxBg: 'var(--bg-main)',
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content border-0 shadow-lg"
          style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}
        >
          {/* Header */}
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <BoxSeam size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalles del Producto</h5>
            </div>
            <button
              type="button"
              className="btn-close shadow-none btn-close-themed"
              onClick={onClose}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: styles.borderCol }}>
              <div>
                <span className="badge px-2 py-1 mb-1 fw-bold" style={{ backgroundColor: 'var(--amber-action)', color: '#FFFFFF' }}>
                  {producto.id_producto}
                </span>
                <h4 className="fw-bold m-0">{producto.nombre}</h4>
                {producto.fecha_creacion && (
                  <div className="small mt-1" style={{ color: styles.mutedColor }}>
                    Creado el {new Date(producto.fecha_creacion).toLocaleDateString('es-CO')}
                  </div>
                )}
              </div>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: producto.estado
                    ? ('var(--success-soft-bg)')
                    : ('var(--danger-soft-bg)'),
                  color: producto.estado
                    ? ('var(--brand-success)')
                    : ('var(--brand-danger)'),
                  borderRadius: '12px'
                }}
              >
                {producto.estado ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="row g-3">
              {/* Categoría */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Tag size={16} />
                    <span className="small">Categoría</span>
                  </div>
                  <span className="fw-semibold">{producto.categoria}</span>
                </div>
              </div>

              {/* Precio de venta */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <CurrencyDollar size={16} />
                    <span className="small">Precio de Venta</span>
                  </div>
                  <span className="fw-bold" style={{ color: 'var(--amber-action)' }}>
                    $ {Number(producto.precio_venta_actual).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Stock Actual: siempre calculado desde los lotes, nunca editable */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Layers size={16} />
                    <span className="small">Stock Actual (calculado)</span>
                  </div>
                  <span className="fw-semibold fs-5">{stockActual} {producto.unidad_medida}</span>
                </div>
              </div>

              {/* Stock Mínimo */}
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <ShieldExclamation size={16} />
                    <span className="small">Stock Mínimo</span>
                  </div>
                  <span className="fw-semibold fs-5">{producto.stock_minimo} {producto.unidad_medida}</span>
                </div>
              </div>

              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Descripción</div>
                  <div className="fw-medium mt-1">{producto.descripcion || 'Sin descripción registrada'}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>% IVA (de la categoría)</div>
                  <div className="fw-semibold mt-1">{porcentajeIva}%</div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Margen de ganancia ({margenEfectivo.origen})</div>
                  <div className="fw-semibold mt-1">{margenEfectivo.valor != null ? `${margenEfectivo.valor}%` : '—'}</div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Maneja vencimiento / lote</div>
                  <div className="fw-semibold mt-1">{producto.maneja_vencimiento ? 'Sí' : 'No'}</div>
                </div>
              </div>

              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Proveedores que surten este producto</div>
                  {proveedoresProducto.length === 0 ? (
                    <div className="small mt-1" style={{ color: styles.mutedColor }}>Ninguno afiliado todavía.</div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2 mt-1">
                      {proveedoresProducto.map((prov) => (
                        <span
                          key={prov.id_proveedor}
                          className="badge px-2 py-1"
                          style={{ backgroundColor: 'var(--border-color)', color: styles.textColor }}
                        >
                          {prov.proveedor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-12">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.detailBoxBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-2" style={{ color: styles.mutedColor }}>
                    <Layers size={16} />
                    <span className="small fw-semibold">Lotes (solo lectura — se crean desde Compras)</span>
                  </div>
                  {lotesProducto.length === 0 ? (
                    <div className="small" style={{ color: styles.mutedColor }}>Este producto todavía no tiene lotes registrados.</div>
                  ) : (
                    <table className="table table-sm align-middle m-0" style={{ color: styles.textColor }}>
                      <thead>
                        <tr>
                          <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Lote</th>
                          <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}>Disponible</th>
                          <th className="small text-uppercase" style={{ color: styles.mutedColor }}>Vence</th>
                          <th className="small text-uppercase text-center" style={{ color: styles.mutedColor }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotesProducto.map((lote) => {
                          const estado = getEstadoVencimiento(lote.fecha_vencimiento);
                          return (
                            <tr key={lote.id_lote}>
                              <td className="small">{lote.id_lote}</td>
                              <td className="small text-center">{lote.cantidad_disponible} un.</td>
                              <td className="small">
                                <span style={{ color: styles.mutedColor }}>{lote.fecha_vencimiento || 'Sin vencimiento'}</span>
                                {estado === 'vencido' && (
                                  <span className="badge ms-2" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>Vencido</span>
                                )}
                                {estado === 'por_vencer' && (
                                  <span className="badge ms-2" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)' }}>Por vencer</span>
                                )}
                              </td>
                              <td className="text-center">
                                {estado && Number(lote.cantidad_disponible) > 0 && onDarDeBaja && (
                                  <button
                                    type="button"
                                    className="btn btn-sm p-1 border-0"
                                    style={{ color: 'var(--brand-danger)' }}
                                    title="Dar de baja este lote"
                                    onClick={() => onDarDeBaja({ ...lote, id_producto: producto.id_producto, producto: producto.nombre })}
                                  >
                                    <ExclamationTriangle size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button
              type="button"
              className="btn btn-sm px-4 fw-medium"
              style={{ backgroundColor: 'var(--border-color)', color: styles.textColor, border: 'none' }}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};