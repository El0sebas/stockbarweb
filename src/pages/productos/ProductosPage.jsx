import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { EstadoFilter } from '../../components/common/EstadoFilter';
import { ProductoDetailModal } from './ProductoDetailModal';
import { ProductoFormModal } from './ProductoFormModal';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';
import { useAuth } from '../../context/AuthContext';
import { BajaFormModal } from '../bajas/BajaFormModal';

// El stock de cada producto viene de vw_stock_producto (nunca se edita aquí).
export const ProductosPage = () => {
  const { data: productos, recargar } = useApi('/productos', []);
  const { data: categorias } = useApi('/categorias', []);
  const { tienePermiso } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [loteParaBaja, setLoteParaBaja] = useState(null);

  const [selectedProducto, setSelectedProducto] = useState(null);

  const handleDarDeBaja = (lote) => {
    setLoteParaBaja(lote);
    setShowDetailModal(false);
    setShowBajaModal(true);
  };

  const handleBajaGuardada = () => {
    setShowBajaModal(false);
    setLoteParaBaja(null);
    recargar();
  };

  const handleOpenCreate = () => {
    setSelectedProducto(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (prod) => {
    setSelectedProducto(prod);
    setShowFormModal(true);
  };

  const handleOpenDetail = (prod) => {
    setSelectedProducto(prod);
    setShowDetailModal(true);
  };

  const handleOpenDelete = (prod) => {
    setSelectedProducto(prod);
    setShowDeleteModal(true);
  };

  const handleToggleEstado = async (prod) => {
    if (await ejecutar(() => api.patch(`/productos/${prod.id_producto}/estado`, { estado: !prod.estado }), (r) => r.mensaje)) recargar();
  };

  // Producto + producto_proveedor se guardan juntos en una transacción del backend.
  const handleSaveProducto = async (productoData) => {
    const ok = selectedProducto
      ? await ejecutar(() => api.put(`/productos/${selectedProducto.id_producto}`, productoData), 'Producto actualizado exitosamente')
      : await ejecutar(() => api.post('/productos', productoData), (p) => `Producto ${p.id_producto} creado exitosamente`);
    if (!ok) return;
    setShowFormModal(false);
    setSelectedProducto(null);
    recargar();
  };

  // Con lotes (compras/ventas) el backend lo impide: se desactiva en su lugar.
  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (await ejecutar(() => api.del(`/productos/${selectedProducto.id_producto}`), 'Producto eliminado exitosamente')) recargar();
    setSelectedProducto(null);
  };

  const filteredProductos = productos.filter(p =>
    (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filtroCategoria || p.categoria === filtroCategoria)
  );

  const styles = {
    bgCard: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Productos e Inventario</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>
            Gestión de existencias y precios en tiempo real
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search
              size={16}
              className="position-absolute top-50 start-0 translate-middle-y ms-3"
              style={{ color: styles.mutedColor }}
            />
            <input
              type="text"
              placeholder="Buscar producto..."
              className="form-control ps-5 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                backgroundColor: styles.inputBg,
                borderColor: styles.borderCol,
                color: styles.textColor,
                width: '240px'
              }}
            />
          </div>

          <EstadoFilter
            value={filtroCategoria}
            onChange={setFiltroCategoria}
            options={categorias.map((c) => c.nombre)}
            label="Todas las categorías"
          />

          <button
            className="btn fw-semibold d-flex align-items-center gap-2 text-white px-3"
            style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}
            onClick={handleOpenCreate}
          >
            <PlusLg size={16} />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      <div
        className="card border-0 shadow-sm rounded-3 overflow-hidden"
        style={{ backgroundColor: styles.bgCard, transition: 'background-color 0.3s ease' }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CÓDIGO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>PRODUCTO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CATEGORÍA</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-end" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>PRECIO VENTA</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>% IVA</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>STOCK</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4" style={{ color: styles.mutedColor }}>
                    No se encontraron productos registrados
                  </td>
                </tr>
              ) : (
                filteredProductos.map((prod) => {
                  return (
                  <tr key={prod.id_producto} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>
                      {prod.id_producto}
                    </td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      {prod.nombre}
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {prod.categoria}
                    </td>
                    <td className="py-3 px-4 text-end fw-bold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      $ {Number(prod.precio_venta_actual).toLocaleString('es-CO')}
                    </td>
                    <td className="py-3 px-4 text-center small" style={{ backgroundColor: 'transparent', color: styles.mutedColor }}>
                      {prod.porcentaje_iva}%
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <span
                        className="badge px-2 py-1"
                        style={{
                          backgroundColor: prod.bajo_stock
                            ? ('var(--danger-soft-bg)')
                            : ('var(--border-color)'),
                          color: prod.bajo_stock
                            ? 'var(--brand-danger)'
                            : styles.textColor
                        }}
                      >
                        {prod.stock_actual} un.
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={prod.estado} onToggle={() => handleToggleEstado(prod)} />
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <RowActions
                        onView={() => handleOpenDetail(prod)}
                        onEdit={() => handleOpenEdit(prod)}
                        onDelete={() => handleOpenDelete(prod)}
                      />
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductoFormModal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveProducto}
        producto={selectedProducto}
      />

      <ProductoDetailModal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        producto={selectedProducto}
        onDarDeBaja={tienePermiso('GESTIONAR_BAJAS') ? handleDarDeBaja : undefined}
      />

      <BajaFormModal
        show={showBajaModal}
        onClose={() => { setShowBajaModal(false); setLoteParaBaja(null); }}
        onGuardada={handleBajaGuardada}
        loteInicial={loteParaBaja}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={selectedProducto?.nombre}
      />
    </div>
  );
};