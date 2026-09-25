import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { ProveedorDetailModal } from './ProveedorDetailModal.jsx';
import { ProveedorFormModal } from './ProveedorFormModal.jsx';
import { showToast } from '../../utils/alerts';
import { generateNextIdentifier } from '../../utils/identifiers';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultProveedores } from '../../data/defaultProveedores';

export const ProveedoresPage = () => {
  const [proveedores, setProveedores] = usePersistentState('stockbar_proveedores', defaultProveedores);

  const [searchTerm, setSearchTerm] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedProveedor, setSelectedProveedor] = useState(null);

  const handleOpenCreate = () => {
    setSelectedProveedor(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (prov) => {
    setSelectedProveedor(prov);
    setShowFormModal(true);
  };

  const handleOpenDetail = (prov) => {
    setSelectedProveedor(prov);
    setShowDetailModal(true);
  };

  const handleOpenDelete = (prov) => {
    setSelectedProveedor(prov);
    setShowDeleteModal(true);
  };

  const handleToggleEstado = (prov) => {
    const nuevoEstado = prov.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setProveedores(proveedores.map(p => p.codigo === prov.codigo ? { ...p, estado: nuevoEstado } : p));
    showToast('success', `Estado actualizado a ${nuevoEstado}`);
  };

  const handleSaveProveedor = (formData) => {
    if (selectedProveedor) {
      setProveedores(proveedores.map(p => p.codigo === formData.codigo ? formData : p));
      showToast('success', 'Proveedor actualizado exitosamente');
    } else {
      const nuevoCodigo = generateNextIdentifier({ items: proveedores, key: 'codigo', prefix: 'PROV', pad: 2, separator: '-' });
      setProveedores([...proveedores, { ...formData, codigo: nuevoCodigo }]);
      showToast('success', `Proveedor ${nuevoCodigo} creado exitosamente`);
    }
    setShowFormModal(false);
    setSelectedProveedor(null);
  };

  const handleConfirmDelete = () => {
    if (selectedProveedor) {
      setProveedores(proveedores.filter(p => p.codigo !== selectedProveedor.codigo));
      showToast('success', 'Proveedor eliminado exitosamente');
    }
    setShowDeleteModal(false);
    setSelectedProveedor(null);
  };

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contacto.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Proveedores</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>
            Gestión de aliados comerciales y distribuidores
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
              placeholder="Buscar proveedor..."
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
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>PROVEEDOR</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CONTACTO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>TELÉFONO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4" style={{ color: styles.mutedColor }}>
                    No se encontraron proveedores registrados.
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((prov) => (
                  <tr key={prov.codigo} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>
                      {prov.codigo}
                    </td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      {prov.nombre}
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {prov.contacto}
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {prov.telefono}
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={prov.estado === 'Activo'} onToggle={() => handleToggleEstado(prov)} />
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <RowActions
                        onView={() => handleOpenDetail(prov)}
                        onEdit={() => handleOpenEdit(prov)}
                        onDelete={() => handleOpenDelete(prov)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProveedorFormModal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveProveedor}
        proveedor={selectedProveedor}
      />

      <ProveedorDetailModal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        proveedor={selectedProveedor}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={selectedProveedor?.nombre}
      />
    </div>
  );
};