import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { CategoriaFormModal } from './CategoriaFormModal';
import { CategoriaDetailModal } from './CategoriaDetailModal';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';

export const CategoriasPage = () => {
  const { data: categorias, recargar } = useApi('/categorias', []);

  const [searchTerm, setSearchTerm] = useState('');
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedCategoria, setSelectedCategoria] = useState(null);

  const handleOpenCreate = () => {
    setSelectedCategoria(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (cat) => {
    setSelectedCategoria(cat);
    setShowFormModal(true);
  };

  const handleOpenDetail = (cat) => {
    setSelectedCategoria(cat);
    setShowDetailModal(true);
  };

  const handleOpenDelete = (cat) => {
    setSelectedCategoria(cat);
    setShowDeleteModal(true);
  };

  const handleSaveCategoria = async (categoriaData) => {
    const ok = selectedCategoria
      ? await ejecutar(() => api.put(`/categorias/${selectedCategoria.id_categoria}`, categoriaData), 'Categoría actualizada exitosamente')
      : await ejecutar(() => api.post('/categorias', categoriaData), (c) => `Categoría ${c.id_categoria} creada exitosamente`);
    if (!ok) return;
    setShowFormModal(false);
    recargar();
  };

  // Con productos asociados el backend lo impide (409).
  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (await ejecutar(() => api.del(`/categorias/${selectedCategoria.id_categoria}`), 'Categoría eliminada exitosamente')) recargar();
  };

  const filteredCategorias = categorias.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id_categoria.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Categorías</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>Gestión de familias y grupos de productos</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
            <input
              type="text"
              placeholder="Buscar categoría..."
              className="form-control ps-5 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '240px' }}
            />
          </div>
          <button 
            className="btn fw-semibold d-flex align-items-center gap-2 text-white px-3" 
            style={{ backgroundColor: 'var(--amber-action)', border: 'none' }} 
            onClick={handleOpenCreate}
          >
            <PlusLg size={16} />
            <span>Nueva</span>
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: styles.bgCard }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CÓDIGO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>NOMBRE</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>DESCRIPCIÓN</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>% IVA</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategorias.map((cat) => (
                <tr key={cat.id_categoria} style={{ borderColor: styles.borderCol }}>
                  <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{cat.id_categoria}</td>
                  <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>{cat.nombre}</td>
                  <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>{cat.descripcion}</td>
                  <td className="py-3 px-4 text-center fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>{cat.porcentaje_iva ?? 19}%</td>
                  <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                    <RowActions
                      onView={() => handleOpenDetail(cat)}
                      onEdit={() => handleOpenEdit(cat)}
                      onDelete={() => handleOpenDelete(cat)}
                    />
                  </td>
                </tr>
              ))}
              {filteredCategorias.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                    No se encontraron categorías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CategoriaFormModal 
        show={showFormModal} 
        onClose={() => setShowFormModal(false)} 
        onSave={handleSaveCategoria} 
        categoria={selectedCategoria} 
      />

      <CategoriaDetailModal 
        show={showDetailModal} 
        onClose={() => setShowDetailModal(false)} 
        categoria={selectedCategoria} 
      />

      <ConfirmDeleteModal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        onConfirm={handleConfirmDelete} 
        itemName={selectedCategoria?.nombre} 
      />
    </div>
  );
};