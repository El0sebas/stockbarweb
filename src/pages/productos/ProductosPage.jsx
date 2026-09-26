import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { ProductoDetailModal } from './ProductoDetailModal';
import { ProductoFormModal } from './ProductoFormModal';
import { showToast } from '../../utils/alerts';
import { generateNextIdentifier } from '../../utils/identifiers';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultProductos } from '../../data/defaultProductos';
import { defaultCategorias } from '../../data/defaultCategorias';
import { defaultLotes } from '../../data/defaultLotes';
import { defaultMotivosBaja } from '../../data/defaultMotivosBaja';
import { defaultBajas } from '../../data/defaultBajas';
import { defaultProductoProveedor } from '../../data/defaultProductoProveedor';
import { getStockDisponible } from '../../utils/stock';
import { aplicarBaja } from '../../utils/bajas';
import { useAuth } from '../../context/AuthContext';
import { BajaFormModal } from '../bajas/BajaFormModal';

export const ProductosPage = () => {
  const [productos, setProductos] = usePersistentState('stockbar_productos', defaultProductos);
  const [categorias] = usePersistentState('stockbar_categorias', defaultCategorias);
  const [lotes, setLotes] = usePersistentState('stockbar_lotes', defaultLotes);
  const [motivos] = usePersistentState('stockbar_motivos_baja', defaultMotivosBaja);
  const [bajas, setBajas] = usePersistentState('stockbar_bajas', defaultBajas);
  const [productoProveedor, setProductoProveedor] = usePersistentState('stockbar_producto_proveedor', defaultProductoProveedor);
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');

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

  const handleSaveBaja = (bajaParcial) => {
    const { nuevosLotes, nuevasBajas } = aplicarBaja({
      lotes,
      bajas,
      baja: {
        ...bajaParcial,
        id_usuario: currentUser?.id_usuario || null,
        usuario: currentUser?.nombre || 'N/A'
      }
    });
    setLotes(nuevosLotes);
    setBajas(nuevasBajas);
    setShowBajaModal(false);
    setLoteParaBaja(null);
    showToast('success', 'Baja registrada y stock del lote actualizado');
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

  const handleToggleEstado = (prod) => {
    const nuevoEstado = prod.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setProductos(productos.map(p => p.codigo === prod.codigo ? { ...p, estado: nuevoEstado } : p));
    showToast('success', `Estado actualizado a ${nuevoEstado}`);
  };

  const handleSaveProducto = (formData) => {
    const { proveedoresSeleccionados = [], ...productoData } = formData;
    let codigoProducto;
    if (selectedProducto) {
      codigoProducto = productoData.codigo;
      setProductos(productos.map(p => p.codigo === codigoProducto ? productoData : p));
      showToast('success', 'Producto actualizado exitosamente');
    } else {
      codigoProducto = generateNextIdentifier({ items: productos, key: 'codigo', prefix: 'PROD', pad: 2, separator: '-' });
      setProductos([...productos, { ...productoData, codigo: codigoProducto }]);
      showToast('success', `Producto ${codigoProducto} creado exitosamente`);
    }
    setProductoProveedor([
      ...productoProveedor.filter((pp) => pp.id_producto !== codigoProducto),
      ...proveedoresSeleccionados.map((idProveedor) => ({
        id_producto: codigoProducto,
        id_proveedor: idProveedor,
        precio_referencia: null,
        estado: 'Activo'
      }))
    ]);
    setShowFormModal(false);
    setSelectedProducto(null);
  };

  const handleConfirmDelete = () => {
    if (selectedProducto) {
      setProductos(productos.filter(p => p.codigo !== selectedProducto.codigo));
      showToast('success', 'Producto eliminado exitosamente');
    }
    setShowDeleteModal(false);
    setSelectedProducto(null);
  };

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <td colSpan="7" className="text-center py-4" style={{ color: styles.mutedColor }}>
                    No se encontraron productos registrados.
                  </td>
                </tr>
              ) : (
                filteredProductos.map((prod) => {
                  const stockActual = getStockDisponible(lotes, prod.codigo);
                  const porcentajeIva = categorias.find((c) => c.nombre === prod.categoria)?.porcentaje_iva ?? 19;
                  return (
                  <tr key={prod.codigo} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>
                      {prod.codigo}
                    </td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      {prod.nombre}
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {prod.categoria}
                    </td>
                    <td className="py-3 px-4 text-end fw-bold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      $ {Number(prod.precioVenta).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center small" style={{ backgroundColor: 'transparent', color: styles.mutedColor }}>
                      {porcentajeIva}%
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <span
                        className="badge px-2 py-1"
                        style={{
                          backgroundColor: stockActual <= prod.stockMinimo
                            ? ('var(--danger-soft-bg)')
                            : ('var(--border-color)'),
                          color: stockActual <= prod.stockMinimo
                            ? 'var(--brand-danger)'
                            : styles.textColor
                        }}
                      >
                        {stockActual} un.
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={prod.estado === 'Activo'} onToggle={() => handleToggleEstado(prod)} />
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
        onDarDeBaja={handleDarDeBaja}
      />

      <BajaFormModal
        show={showBajaModal}
        onClose={() => { setShowBajaModal(false); setLoteParaBaja(null); }}
        onSave={handleSaveBaja}
        lotes={lotes}
        productos={productos}
        motivos={motivos}
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