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

export const ProductosPage = () => {
  const [productos, setProductos] = usePersistentState('stockbar_productos', defaultProductos);

  const [searchTerm, setSearchTerm] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedProducto, setSelectedProducto] = useState(null);

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
    if (selectedProducto) {
      setProductos(productos.map(p => p.codigo === formData.codigo ? formData : p));
      showToast('success', 'Producto actualizado exitosamente');
    } else {
      const nuevoCodigo = generateNextIdentifier({ items: productos, key: 'codigo', prefix: 'PROD', pad: 2, separator: '-' });
      setProductos([...productos, { ...formData, codigo: nuevoCodigo }]);
      showToast('success', `Producto ${nuevoCodigo} creado exitosamente`);
    }
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
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>IMP</th>
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
                filteredProductos.map((prod) => (
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
                      {prod.porcentaje_impuesto ?? prod.porcentajeImpuesto ?? 0}%
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <span
                        className="badge px-2 py-1"
                        style={{
                          backgroundColor: prod.stockActual <= prod.stockMinimo
                            ? ('var(--danger-soft-bg)')
                            : ('var(--border-color)'),
                          color: prod.stockActual <= prod.stockMinimo
                            ? 'var(--brand-danger)'
                            : styles.textColor
                        }}
                      >
                        {prod.stockActual} un.
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
                ))
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