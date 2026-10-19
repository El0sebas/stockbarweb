import React, { useState } from 'react';
import { Search, PlusLg, ShieldCheck, LockFill } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { EstadoFilter } from '../../components/common/EstadoFilter';
import { RolFormModal } from './RolFormModal';
import { RolDetailModal } from './RolDetailModal';
import { showToast, showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';

// El rol ADMINISTRADOR está protegido (no se edita, elimina ni desactiva).
const esAdmin = (rol) => rol?.nombre === 'ADMINISTRADOR';

export const RolesPage = () => {
  const { data: roles, recargar } = useApi('/roles', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRol, setSelectedRol] = useState(null);

  const handleOpenCreate = () => {
    setSelectedRol(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (rol) => {
    if (esAdmin(rol)) {
      showToast('error', 'El rol de Administrador no se puede modificar');
      return;
    }
    setSelectedRol(rol);
    setShowFormModal(true);
  };

  const handleOpenDetail = (rol) => {
    setSelectedRol(rol);
    setShowDetailModal(true);
  };

  const handleOpenDelete = (rol) => {
    if (esAdmin(rol)) {
      showToast('error', 'El rol de Administrador no se puede eliminar');
      return;
    }
    setSelectedRol(rol);
    setShowDeleteModal(true);
  };

  const handleSaveRol = async ({ nombre, permisos }) => {
    const ok = selectedRol
      ? await ejecutar(() => api.put(`/roles/${selectedRol.id_rol}`, { nombre, permisos }), 'Rol actualizado exitosamente')
      : await ejecutar(() => api.post('/roles', { nombre, permisos }), (r) => `Rol ${r.id_rol} creado exitosamente`);
    if (!ok) return;
    setShowFormModal(false);
    recargar();
  };

  // Espejo de trg_proteger_rol_administrador: el rol ADMINISTRADOR nunca se
  // desactiva. Cualquier otro rol (incluido EMPLEADO) sí puede.
  const handleToggleEstado = async (rol) => {
    if (esAdmin(rol)) {
      showAlert.error('No permitido', 'El rol ADMINISTRADOR no puede desactivarse.');
      return;
    }
    if (await ejecutar(() => api.patch(`/roles/${rol.id_rol}/estado`, { estado: !rol.estado }), (r) => r.mensaje)) recargar();
  };

  const handleConfirmDelete = async () => {
    if (esAdmin(selectedRol)) return;
    setShowDeleteModal(false);
    if (await ejecutar(() => api.del(`/roles/${selectedRol.id_rol}`), 'Rol eliminado exitosamente')) recargar();
  };

  const filteredRoles = roles.filter(r =>
    (r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id_rol.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filtroEstado || (r.estado ? 'Activo' : 'Inactivo') === filtroEstado)
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
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Roles y Permisos</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>Control de perfiles de usuario y accesos al sistema</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
            <input
              type="text"
              placeholder="Buscar rol..."
              className="form-control ps-5 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '240px' }}
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

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: styles.bgCard }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CÓDIGO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ROL</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>PERMISOS</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((rol) => (
                <tr key={rol.id_rol} style={{ borderColor: styles.borderCol }}>
                  <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{rol.id_rol}</td>
                  <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>
                    <div className="d-flex align-items-center gap-2">
                      {esAdmin(rol) ? <LockFill size={16} color="var(--brand-danger)" title="Rol protegido" /> : <ShieldCheck size={16} color="var(--amber-action)" />}
                      {rol.nombre}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                    <span className="badge px-2 py-1" style={{ backgroundColor: 'var(--border-color)', color: styles.textColor }}>
                      {rol.permisos.length} permisos
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                    {esAdmin(rol) ? (
                      <span className="badge px-3 py-2 fw-medium" style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)', borderRadius: '12px' }} title="El rol ADMINISTRADOR no puede desactivarse">
                        Activo
                      </span>
                    ) : (
                      <StatusToggle active={rol.estado} onToggle={() => handleToggleEstado(rol)} />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                    <RowActions
                      onView={() => handleOpenDetail(rol)}
                      onEdit={() => handleOpenEdit(rol)}
                      onDelete={() => handleOpenDelete(rol)}
                      disabledReason={esAdmin(rol) ? 'El rol de Administrador no se puede modificar' : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RolFormModal show={showFormModal} onClose={() => setShowFormModal(false)} onSave={handleSaveRol} rol={selectedRol} />
      <RolDetailModal show={showDetailModal} onClose={() => setShowDetailModal(false)} rol={selectedRol} />
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} itemName={selectedRol?.nombre} />
    </div>
  );
};