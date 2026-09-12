import React, { useState } from 'react';
import { Search, PlusLg, People, PersonCheck, PersonX } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { UsuarioDetailModal } from './UsuarioDetailModal';
import { UsuarioFormModal } from './UsuarioFormModal';
import { showToast } from '../../utils/alerts';
import { generateNextIdentifier } from '../../utils/identifiers';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultUsers } from '../../data/defaultUsers';
import { getRoleBadgeColors } from '../../utils/roleColors';

export const UsuariosPage = () => {
  // Misma clave de localStorage que Login ('stockbar_users'): un usuario creado
  // aquí puede iniciar sesión, y el admin semilla de Login aparece aquí.
  const [usuarios, setUsuarios] = usePersistentState('stockbar_users', defaultUsers);

  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  const handleOpenCreate = () => {
    setSelectedUsuario(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (user) => {
    setSelectedUsuario(user);
    setShowFormModal(true);
  };

  const handleOpenDetail = (user) => {
    setSelectedUsuario(user);
    setShowDetailModal(true);
  };

  const handleOpenDelete = (user) => {
    setSelectedUsuario(user);
    setShowDeleteModal(true);
  };

  // Alternar Estado Activo / Inactivo con el nuevo Switch
  const handleToggleEstado = (user) => {
    if (user.rol === 'Administrador') return; // Protección adicional

    const nuevoEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setUsuarios(usuarios.map(u => u.id_usuario === user.id_usuario ? { ...u, estado: nuevoEstado } : u));
    showToast('success', `Usuario ${nuevoEstado === 'Activo' ? 'activado' : 'inactivado'} exitosamente`);
  };

  const handleSaveUsuario = (formData) => {
    if (selectedUsuario) {
      setUsuarios(usuarios.map(u => u.id_usuario === selectedUsuario.id_usuario
        ? { ...u, ...formData, id_usuario: selectedUsuario.id_usuario, estado: selectedUsuario.estado }
        : u));
      showToast('success', 'Usuario actualizado exitosamente');
    } else {
      const nuevoId = generateNextIdentifier({ items: usuarios, key: 'id_usuario' });
      const fechaActual = new Date().toISOString().split('T')[0];
      setUsuarios([...usuarios, { ...formData, id_usuario: Number(nuevoId), estado: 'Activo', fechaRegistro: fechaActual }]);
      showToast('success', `Usuario ${formData.nombre} creado exitosamente`);
    }
    setShowFormModal(false);
    setSelectedUsuario(null);
  };

  const handleConfirmDelete = () => {
    if (selectedUsuario) {
      setUsuarios(usuarios.filter(u => u.id_usuario !== selectedUsuario.id_usuario));
      showToast('success', 'Usuario eliminado exitosamente');
    }
    setShowDeleteModal(false);
    setSelectedUsuario(null);
  };

  const filteredUsuarios = usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.documento || '').includes(searchTerm) ||
    (u.correo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.rol || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const styles = {
    bgCard: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };

  const totalUsuarios = usuarios.length;
  const activos = usuarios.filter(u => u.estado === 'Activo').length;
  const inactivos = usuarios.filter(u => u.estado === 'Inactivo').length;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Gestión de Usuarios</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>
            Control de cuentas, roles y permisos de acceso al sistema
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
            <input
              type="text"
              placeholder="Buscar usuario..."
              className="form-control ps-5 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '240px' }}
            />
          </div>
          <button className="btn fw-semibold d-flex align-items-center gap-2 text-white px-3" style={{ backgroundColor: 'var(--amber-action)', border: 'none' }} onClick={handleOpenCreate}>
            <PlusLg size={16} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-4">
          <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: styles.bgCard, color: styles.textColor }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="small m-0 fw-semibold" style={{ color: styles.mutedColor }}>Total Usuarios</p>
                <h4 className="fw-bold m-0 mt-1">{totalUsuarios}</h4>
              </div>
              <div className="p-3 rounded-circle" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--amber-action)' }}>
                <People size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-4">
          <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: styles.bgCard, color: styles.textColor }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="small m-0 fw-semibold" style={{ color: styles.mutedColor }}>Usuarios Activos</p>
                <h4 className="fw-bold m-0 mt-1 text-success">{activos}</h4>
              </div>
              <div className="p-3 rounded-circle" style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)' }}>
                <PersonCheck size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-4">
          <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: styles.bgCard, color: styles.textColor }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="small m-0 fw-semibold" style={{ color: styles.mutedColor }}>Inactivos / Bloqueados</p>
                <h4 className="fw-bold m-0 mt-1 text-danger">{inactivos}</h4>
              </div>
              <div className="p-3 rounded-circle" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>
                <PersonX size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: styles.bgCard, transition: 'background-color 0.3s ease' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>DOCUMENTO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>USUARIO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>TELÉFONO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ROL</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4" style={{ color: styles.mutedColor }}>No se encontraron usuarios registrados.</td>
                </tr>
              ) : (
                filteredUsuarios.map((usr) => {
                  const rolNombre = usr.rol || 'Sin rol';
                  const rolBadge = getRoleBadgeColors(rolNombre);
                  const isAdministrador = rolNombre === 'Administrador';

                  return (
                    <tr key={usr.id_usuario} style={{ borderColor: styles.borderCol }}>
                      <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>
                        {usr.documento}
                      </td>
                      <td className="py-3 px-4" style={{ backgroundColor: 'transparent' }}>
                        <div className="fw-semibold" style={{ color: styles.textColor }}>{usr.nombre}</div>
                        <div className="small" style={{ color: styles.mutedColor }}>{usr.correo}</div>
                      </td>
                      <td className="py-3 px-4 small" style={{ color: styles.textColor, backgroundColor: 'transparent' }}>
                        {usr.telefono}
                      </td>
                      <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                        <span className="badge px-3 py-2 fw-medium" style={{ backgroundColor: rolBadge.bg, color: rolBadge.color, borderRadius: '8px' }}>
                          {rolNombre}
                        </span>
                      </td>

                      {/* Columna de ESTADO interactiva */}
                      <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                        {isAdministrador ? (
                          <span className="badge px-3 py-2 fw-medium" style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)', borderRadius: '12px' }}>
                            Activo
                          </span>
                        ) : (
                          <StatusToggle active={usr.estado === 'Activo'} onToggle={() => handleToggleEstado(usr)} />
                        )}
                      </td>

                      <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                        <RowActions
                          onView={() => handleOpenDetail(usr)}
                          onEdit={() => handleOpenEdit(usr)}
                          onDelete={() => handleOpenDelete(usr)}
                          disabledReason={isAdministrador ? 'El usuario Administrador no se puede modificar' : undefined}
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

      <UsuarioFormModal show={showFormModal} onClose={() => setShowFormModal(false)} onSave={handleSaveUsuario} usuario={selectedUsuario} />
      <UsuarioDetailModal show={showDetailModal} onClose={() => setShowDetailModal(false)} usuario={selectedUsuario} />
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} itemName={selectedUsuario?.nombre} />
    </div>
  );
};