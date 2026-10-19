import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { ClienteFormModal } from './ClienteFormModal';
import { ClienteDetailModal } from './ClienteDetailModal';
import { showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';

// Cliente genérico de mostrador, protegido (lo crea el backend al arrancar).
const CONSUMIDOR_FINAL = 'CLI-00000';

export const ClientesPage = () => {
  const { data: clientes, recargar } = useApi('/clientes', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  const handleOpenCreate = () => { setSelectedCliente(null); setShowFormModal(true); };
  const handleOpenEdit = (c) => { setSelectedCliente(c); setShowFormModal(true); };
  const handleOpenDetail = (c) => { setSelectedCliente(c); setShowDetailModal(true); };
  const handleOpenDelete = (c) => { setSelectedCliente(c); setShowDeleteModal(true); };

  const handleToggleEstado = async (c) => {
    if (c.id_cliente === CONSUMIDOR_FINAL) {
      showAlert.error('Cliente protegido', 'El cliente "Consumidor Final" no puede desactivarse: es la opción por defecto del punto de venta.');
      return;
    }
    if (await ejecutar(() => api.patch(`/clientes/${c.id_cliente}/estado`, { estado: !c.estado }), (r) => r.mensaje)) recargar();
  };

  // Documento duplicado y fecha de nacimiento futura los rechaza la BD
  // (uq_cliente_documento, trg_validar_cliente_ins/upd).
  const handleSaveCliente = async (formData) => {
    const ok = selectedCliente
      ? await ejecutar(() => api.put(`/clientes/${selectedCliente.id_cliente}`, formData), 'Cliente actualizado exitosamente')
      : await ejecutar(() => api.post('/clientes', formData), (c) => `Cliente ${c.id_cliente} creado exitosamente`);
    if (!ok) return;
    setShowFormModal(false);
    setSelectedCliente(null);
    recargar();
  };

  // Con ventas asociadas el backend lo impide (409).
  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (await ejecutar(() => api.del(`/clientes/${selectedCliente.id_cliente}`), 'Cliente eliminado exitosamente')) recargar();
    setSelectedCliente(null);
  };

  const filteredClientes = clientes.filter(c =>
    `${c.nombres} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                      <div className="fw-semibold" style={{ color: styles.textColor }}>{cli.nombres} {cli.apellidos}</div>
                      <div className="small" style={{ color: styles.mutedColor }}>{cli.correo}</div>
                    </td>
                    <td className="py-3 px-4 small" style={{ color: styles.textColor, backgroundColor: 'transparent' }}>{cli.telefono}</td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={cli.estado} onToggle={() => handleToggleEstado(cli)} />
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <RowActions
                        onView={() => handleOpenDetail(cli)}
                        onEdit={() => handleOpenEdit(cli)}
                        onDelete={() => handleOpenDelete(cli)}
                        disabledReason={cli.id_cliente === CONSUMIDOR_FINAL ? 'Cliente protegido: es la opción por defecto del punto de venta.' : undefined}
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
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} itemName={selectedCliente && `${selectedCliente.nombres} ${selectedCliente.apellidos}`} />
    </div>
  );
};