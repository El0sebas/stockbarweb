import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { ClienteFormModal } from './ClienteFormModal';
import { ClienteDetailModal } from './ClienteDetailModal';
import { showToast, showAlert } from '../../utils/alerts';
import { generateNextId } from '../../utils/identifiers';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultClientes } from '../../data/defaultClientes';

export const ClientesPage = () => {
  const [clientes, setClientes] = usePersistentState('stockbar_clientes', defaultClientes);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const handleOpenCreate = () => { setSelectedCliente(null); setShowFormModal(true); };
  const handleOpenEdit = (c) => { setSelectedCliente(c); setShowFormModal(true); };
  const handleOpenDetail = (c) => { setSelectedCliente(c); setShowDetailModal(true); };
  const handleOpenDelete = (c) => { setSelectedCliente(c); setShowDeleteModal(true); };

  const handleToggleEstado = (c) => {
    const nuevoEstado = c.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setClientes(clientes.map(x => x.id_cliente === c.id_cliente ? { ...x, estado: nuevoEstado } : x));
    showToast('success', `Estado actualizado a ${nuevoEstado}`);
  };

  const handleSaveCliente = (formData) => {
    // Espejo de uq_cliente_documento: (tipo_documento, numero_documento) es
    // único. No es un trigger con SIGNAL propio (es un UNIQUE KEY), así que
    // el mensaje aquí describe la regla en vez de citar un texto literal.
    const yaExiste = clientes.some((c) =>
      c.tipo_documento === formData.tipo_documento &&
      c.numero_documento === formData.numero_documento &&
      c.id_cliente !== selectedCliente?.id_cliente
    );
    if (yaExiste) {
      showAlert.error('Documento duplicado', 'Ya existe un cliente registrado con ese tipo y número de documento.');
      return;
    }

    // Espejo exacto de sp_validar_cliente (trg_validar_cliente_ins/upd).
    if (formData.fecha_nacimiento && new Date(formData.fecha_nacimiento) > new Date()) {
      showAlert.error('Fecha inválida', 'La fecha de nacimiento no puede ser una fecha futura.');
      return;
    }

    if (selectedCliente) {
      setClientes(clientes.map(c => c.id_cliente === selectedCliente.id_cliente ? { ...selectedCliente, ...formData } : c));
      showToast('success', 'Cliente actualizado exitosamente');
    } else {
      const nuevoId = generateNextId(clientes, 'id_cliente');
      setClientes([...clientes, { ...formData, id_cliente: nuevoId, estado: 'Activo' }]);
      showToast('success', `Cliente ${nuevoId} creado exitosamente`);
    }
    setShowFormModal(false);
    setSelectedCliente(null);
  };

  const handleConfirmDelete = () => {
    if (selectedCliente) {
      setClientes(clientes.filter(c => c.id_cliente !== selectedCliente.id_cliente));
      showToast('success', 'Cliente eliminado exitosamente');
    }
    setShowDeleteModal(false);
    setSelectedCliente(null);
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero_documento.includes(searchTerm) ||
    (c.correo && c.correo.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Directorio de Clientes</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>Registro para facturación y fidelización en el punto de venta</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
            <input type="text" placeholder="Buscar cliente..." className="form-control ps-5 shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '240px' }} />
          </div>
          <button className="btn fw-semibold d-flex align-items-center gap-2 text-white px-3" style={{ backgroundColor: 'var(--amber-action)', border: 'none' }} onClick={handleOpenCreate}>
            <PlusLg size={16} /><span>Nuevo</span>
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: styles.bgCard, transition: 'background-color 0.3s ease' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>DOCUMENTO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>CLIENTE</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>TELÉFONO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-4" style={{ color: styles.mutedColor }}>No se encontraron clientes registrados.</td></tr>
              ) : (
                filteredClientes.map((cli) => (
                  <tr key={cli.id_cliente} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{cli.tipo_documento} {cli.numero_documento}</td>
                    <td className="py-3 px-4" style={{ backgroundColor: 'transparent' }}>
                      <div className="fw-semibold" style={{ color: styles.textColor }}>{cli.nombre_completo}</div>
                      <div className="small" style={{ color: styles.mutedColor }}>{cli.correo}</div>
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.textColor, backgroundColor: 'transparent' }}>{cli.telefono}</td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={cli.estado === 'Activo'} onToggle={() => handleToggleEstado(cli)} />
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <RowActions
                        onView={() => handleOpenDetail(cli)}
                        onEdit={() => handleOpenEdit(cli)}
                        onDelete={() => handleOpenDelete(cli)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClienteFormModal show={showFormModal} onClose={() => setShowFormModal(false)} onSave={handleSaveCliente} cliente={selectedCliente} />
      <ClienteDetailModal show={showDetailModal} onClose={() => setShowDetailModal(false)} cliente={selectedCliente} />
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} itemName={selectedCliente?.nombre_completo} />
    </div>
  );
};