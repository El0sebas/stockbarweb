import React, { useState } from 'react';
import { Search, PlusLg, People, PersonCheck, PersonX } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { EstadoFilter } from '../../components/common/EstadoFilter';
import { UsuarioDetailModal } from './UsuarioDetailModal';
import { UsuarioFormModal } from './UsuarioFormModal';
import { showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';
import { nombreUsuario, useAuth } from '../../context/AuthContext';
import { getRoleBadgeColors } from '../../utils/roleColors';

export const UsuariosPage = () => {
  const { data: usuarios, recargar } = useApi('/usuarios', []);
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

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

  // Alternar Estado Activo / Inactivo. Las reglas las aplica el backend
  // (admin principal protegido, solo un ADMINISTRADOR desactiva, nadie se
  // desactiva a sí mismo); aquí solo se avisa antes de llamar.
  const handleToggleEstado = async (user) => {
    if (user.es_admin_principal) {
      showAlert.error('No permitido', 'El administrador principal del sistema no puede desactivarse.');
      return;
    }
    if (user.estado && currentUser?.rol !== 'ADMINISTRADOR') {
      showAlert.error('No permitido', 'Solo un administrador puede desactivar usuarios.');
      return;
    }
    if (user.id_usuario === currentUser?.id_usuario) {
      showAlert.error('No permitido', 'No puedes desactivarte a ti mismo.');
      return;
    }

    if (await ejecutar(() => api.patch(`/usuarios/${user.id_usuario}/estado`, { estado: !user.estado }), (r) => r.mensaje)) recargar();
  };

  const handleSaveUsuario = async (formData) => {
    const ok = selectedUsuario
      ? await ejecutar(() => api.put(`/usuarios/${selectedUsuario.id_usuario}`, formData), 'Usuario actualizado exitosamente')
      : await ejecutar(() => api.post('/usuarios', formData), (u) => `Usuario ${nombreUsuario(u)} creado exitosamente`);
    if (!ok) return;
    setShowFormModal(false);
    setSelectedUsuario(null);
    recargar();
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (await ejecutar(() => api.del(`/usuarios/${selectedUsuario.id_usuario}`), 'Usuario eliminado exitosamente')) recargar();
    setSelectedUsuario(null);
  };

  const filteredUsuarios = usuarios.filter(u =>
    (nombreUsuario(u).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.numero_documento || '').includes(searchTerm) ||
      (u.correo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.rol || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filtroRol || u.rol === filtroRol)
  );

  const rolesDisponibles = [...new Set(usuarios.map((u) => u.rol).filter(Boolean))];

  const styles = {
    bgCard: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };

  const totalUsuarios = usuarios.length;
  const activos = usuarios.filter(u => u.estado).length;
  const inactivos = totalUsuarios - activos;

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
          <EstadoFilter value={filtroRol} onChange={setFiltroRol} options={rolesDisponibles} label="Todos los roles" />
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
                  const esUnoMismo = usr.id_usuario === currentUser?.id_usuario;
                  const puedeDesactivar = !usr.es_admin_principal && currentUser?.rol === 'ADMINISTRADOR' && !esUnoMismo;

                  return (
                    <tr key={usr.id_usuario} style={{ borderColor: styles.borderCol }}>
                      <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>
                        {usr.tipo_documento} {usr.numero_documento}
                      </td>
                      <td className="py-3 px-4" style={{ backgroundColor: 'transparent' }}>
                        <div className="fw-semibold" style={{ color: styles.textColor }}>{nombreUsuario(usr)}</div>
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
                        {usr.es_admin_principal ? (
                          <span className="badge px-3 py-2 fw-medium" style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)', borderRadius: '12px' }} title="Administrador principal: no puede desactivarse">
                            Activo
                          </span>
                        ) : (
                          <StatusToggle
                            active={usr.estado}
                            onToggle={() => handleToggleEstado(usr)}
                            disabled={!puedeDesactivar}
                          />
                        )}
                      </td>

                      <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                        <RowActions
                          onView={() => handleOpenDetail(usr)}
                          onEdit={() => handleOpenEdit(usr)}
                          onDelete={() => handleOpenDelete(usr)}
                          hideDelete={usr.es_admin_principal || usr.id_usuario === currentUser?.id_usuario}
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
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} itemName={nombreUsuario(selectedUsuario)} />
    </div>
  );
};