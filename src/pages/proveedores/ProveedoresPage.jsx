import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { EstadoFilter } from '../../components/common/EstadoFilter';
import { ProveedorDetailModal } from './ProveedorDetailModal.jsx';
import { ProveedorFormModal } from './ProveedorFormModal.jsx';
import { showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';

const NIT_REGEX = /^[0-9]{5,15}(-[0-9])?$/;

export const ProveedoresPage = () => {
  const { data: proveedores, recargar } = useApi('/proveedores', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

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

  const handleToggleEstado = async (prov) => {
    if (await ejecutar(() => api.patch(`/proveedores/${prov.id_proveedor}/estado`, { estado: !prov.estado }), (r) => r.mensaje)) recargar();
  };

  // v3: id_proveedor ES el NIT — lo escribe el usuario, la app no lo inventa.
  const handleSaveProveedor = async ({ nit: nitForm, ...datos }) => {
    const nit = (nitForm || '').trim();
    if (!NIT_REGEX.test(nit)) {
      showAlert.error('NIT inválido', 'El NIT debe tener entre 5 y 15 dígitos, con dígito de verificación opcional (ej: 900123456-1).');
      return;
    }
    const ok = selectedProveedor
      ? await ejecutar(() => api.put(`/proveedores/${selectedProveedor.id_proveedor}`, datos), 'Proveedor actualizado exitosamente')
      : await ejecutar(() => api.post('/proveedores', { ...datos, id_proveedor: nit }), `Proveedor ${nit} creado exitosamente`);
    if (!ok) return;
    setShowFormModal(false);
    setSelectedProveedor(null);
    recargar();
  };

  // Con productos o compras asociados el backend lo impide (409).
  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (await ejecutar(() => api.del(`/proveedores/${selectedProveedor.id_proveedor}`), 'Proveedor eliminado exitosamente')) recargar();
    setSelectedProveedor(null);
  };

  const filteredProveedores = proveedores.filter(p =>
    (p.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id_proveedor.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filtroEstado || (p.estado ? 'Activo' : 'Inactivo') === filtroEstado)
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

          <EstadoFilter value={filtroEstado} onChange={setFiltroEstado} options={['Activo', 'Inactivo']} />

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
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>NIT</th>
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
                  <tr key={prov.id_proveedor} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>
                      {prov.id_proveedor}
                    </td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                      {prov.razon_social}
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {prov.contacto_principal || 'Sin contacto'}
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>
                      {prov.telefono_principal}
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={prov.estado} onToggle={() => handleToggleEstado(prov)} />
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
        onCambio={recargar}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={selectedProveedor?.razon_social}
      />
    </div>
  );
};