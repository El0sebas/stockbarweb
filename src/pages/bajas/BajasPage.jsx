import React, { useState } from 'react';
import { Search, PlusLg, ExclamationTriangle, Eye, PencilSquare } from 'react-bootstrap-icons';
import { useApi } from '../../hooks/useApi';
import { BajaFormModal } from './BajaFormModal';
import { BajaDetailModal } from './BajaDetailModal';

export const BajasPage = () => {
  const { data: bajas, recargar } = useApi('/bajas', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBaja, setSelectedBaja] = useState(null);
  const [bajaEditar, setBajaEditar] = useState(null);

  const filteredBajas = bajas.filter((b) => {
    const term = searchTerm.toLowerCase();
    return [b.producto, b.id_lote, b.motivo, b.usuario].some((v) => (v || '').toLowerCase().includes(term));
  });

  const styles = {
    cardBg: 'var(--bg-card)',
    borderCol: 'var(--border-color)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    inputBg: 'var(--bg-main)'
  };

  return (
    <div className="card border-0 shadow-sm p-4" style={{ backgroundColor: styles.cardBg, borderRadius: '12px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: styles.textColor }}>Bajas de Inventario</h4>
          <p className="small m-0" style={{ color: styles.mutedColor }}>Vencimiento, daño, ajuste o pérdida/robo — siempre sobre un lote concreto</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="input-group" style={{ maxWidth: '260px' }}>
            <span className="input-group-text border-end-0" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Buscar por producto, motivo o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, color: styles.textColor, borderColor: styles.borderCol }}
            />
          </div>
          <button
            className="btn fw-semibold text-white d-flex align-items-center gap-2 px-3"
            style={{ backgroundColor: 'var(--brand-danger)', border: 'none', borderRadius: '8px' }}
            onClick={() => { setBajaEditar(null); setShowFormModal(true); }}
          >
            <PlusLg size={18} />
            <span>Dar de baja</span>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table align-middle" style={{ color: styles.textColor }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${styles.borderCol}` }}>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Fecha</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Producto / Lote</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Motivo</th>
              <th className="small text-uppercase fw-bold py-3 text-center" style={{ color: styles.mutedColor }}>Cantidad</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Usuario</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Observaciones</th>
              <th className="small text-uppercase fw-bold py-3 text-center" style={{ color: styles.mutedColor }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredBajas.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4" style={{ color: styles.mutedColor }}>
                  No hay bajas registradas todavía.
                </td>
              </tr>
            ) : (
              filteredBajas.map((b) => {
                return (
                  <tr key={b.id_baja} style={{ borderBottom: `1px solid ${styles.borderCol}` }}>
                    <td className="py-3 small" style={{ color: styles.mutedColor }}>
                      {new Date(b.fecha_hora).toLocaleString('es-CO')}
                    </td>
                    <td className="py-3">
                      <div className="fw-semibold">{b.producto}</div>
                      <div className="small" style={{ color: styles.mutedColor }}>
                        Lote {b.id_lote}{b.fecha_vencimiento ? ` • vence ${b.fecha_vencimiento}` : ''}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="badge d-inline-flex align-items-center gap-1" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>
                        <ExclamationTriangle size={11} />
                        {b.motivo}
                      </span>
                    </td>
                    <td className="py-3 text-center fw-bold">{b.cantidad} un.</td>
                    <td className="py-3 small" style={{ color: styles.mutedColor }}>{b.usuario || 'N/A'}</td>
                    <td className="py-3 small" style={{ color: styles.mutedColor }}>{b.observaciones || '—'}</td>
                    <td className="py-3 text-center">
                      <button
                        className="btn btn-sm p-1 border-0"
                        style={{ color: 'var(--brand-blue)' }}
                        title="Ver detalle"
                        onClick={() => { setSelectedBaja(b); setShowDetailModal(true); }}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="btn btn-sm p-1 border-0"
                        style={{ color: 'var(--amber-action)' }}
                        title="Editar baja"
                        onClick={() => { setBajaEditar(b); setShowFormModal(true); }}
                      >
                        <PencilSquare size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <BajaFormModal
        show={showFormModal}
        baja={bajaEditar}
        onClose={() => setShowFormModal(false)}
        onGuardada={() => { setShowFormModal(false); recargar(); }}
      />

      <BajaDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedBaja(null); }}
        baja={selectedBaja}
      />
    </div>
  );
};
