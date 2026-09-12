import React, { useState } from 'react';
import { Search, PlusLg } from 'react-bootstrap-icons';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { MetodoPagoFormModal } from './MetodoPagoFormModal';
import { showToast } from '../../utils/alerts';
import { generateNextIdentifier } from '../../utils/identifiers';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';

export const MetodosPagoPage = () => {
  const [metodos, setMetodos] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMetodo, setSelectedMetodo] = useState(null);

  const handleOpenCreate = () => { setSelectedMetodo(null); setShowFormModal(true); };
  const handleOpenEdit = (m) => { setSelectedMetodo(m); setShowFormModal(true); };
  const handleOpenDelete = (m) => { setSelectedMetodo(m); setShowDeleteModal(true); };

  const handleToggleEstado = (m) => {
    const nuevoEstado = m.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setMetodos(metodos.map(x => x.id_metodo_pago === m.id_metodo_pago ? { ...x, estado: nuevoEstado } : x));
    showToast('success', `Estado actualizado a ${nuevoEstado}`);
  };

  const handleSaveMetodo = (data) => {
    if (selectedMetodo) {
      setMetodos(metodos.map(m => m.id_metodo_pago === data.id_metodo_pago ? { ...m, nombre: data.nombre } : m));
      showToast('success', 'Método de pago actualizado exitosamente');
    } else {
      const nuevoId = Number(generateNextIdentifier({ items: metodos, key: 'id_metodo_pago' }));
      setMetodos([...metodos, { nombre: data.nombre, id_metodo_pago: nuevoId, estado: 'Activo' }]);
      showToast('success', `Método de pago ${nuevoId} creado exitosamente`);
    }
    setShowFormModal(false);
  };

  const handleConfirmDelete = () => {
    setMetodos(metodos.filter(m => m.id_metodo_pago !== selectedMetodo.id_metodo_pago));
    showToast('success', 'Método de pago eliminado exitosamente');
    setShowDeleteModal(false);
  };

  const filteredMetodos = metodos.filter(m =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h3 className="fw-bold m-0" style={{ color: styles.textColor }}>Métodos de Pago</h3>
          <p className="m-0 small" style={{ color: styles.mutedColor }}>Gestión de formas de pago aceptadas en el sistema</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
            <input type="text" placeholder="Buscar método..." className="form-control ps-5 shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '240px' }} />
          </div>
          <button className="btn fw-semibold d-flex align-items-center gap-2 text-white px-3" style={{ backgroundColor: 'var(--amber-action)', border: 'none' }} onClick={handleOpenCreate}>
            <PlusLg size={16} /><span>Nuevo</span>
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: styles.bgCard }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle m-0" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderColor: styles.borderCol }}>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ID</th>
                <th className="py-3 px-4 small text-uppercase fw-bold" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>NOMBRE</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ESTADO</th>
                <th className="py-3 px-4 small text-uppercase fw-bold text-center" style={{ color: styles.mutedColor, backgroundColor: 'transparent' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredMetodos.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4" style={{ color: styles.mutedColor }}>No se encontraron métodos de pago.</td></tr>
              ) : (
                filteredMetodos.map((metodo) => (
                  <tr key={metodo.id_metodo_pago} style={{ borderColor: styles.borderCol }}>
                    <td className="py-3 px-4 fw-bold" style={{ color: 'var(--amber-action)', backgroundColor: 'transparent' }}>{metodo.id_metodo_pago}</td>
                    <td className="py-3 px-4 fw-semibold" style={{ backgroundColor: 'transparent', color: styles.textColor }}>{metodo.nombre}</td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <StatusToggle active={metodo.estado === 'Activo'} onToggle={() => handleToggleEstado(metodo)} />
                    </td>
                    <td className="py-3 px-4 text-center" style={{ backgroundColor: 'transparent' }}>
                      <RowActions
                        onEdit={() => handleOpenEdit(metodo)}
                        onDelete={() => handleOpenDelete(metodo)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MetodoPagoFormModal show={showFormModal} onClose={() => setShowFormModal(false)} onSave={handleSaveMetodo} metodo={selectedMetodo} />
      <ConfirmDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleConfirmDelete} itemName={selectedMetodo?.nombre} />
    </div>
  );
};
