import React, { useState } from 'react';
import { Search, PlusLg, ExclamationTriangle } from 'react-bootstrap-icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useAuth } from '../../context/AuthContext';
import { defaultLotes } from '../../data/defaultLotes';
import { defaultProductos } from '../../data/defaultProductos';
import { defaultMotivosBaja } from '../../data/defaultMotivosBaja';
import { defaultBajas } from '../../data/defaultBajas';
import { showToast } from '../../utils/alerts';
import { aplicarBaja } from '../../utils/bajas';
import { BajaFormModal } from './BajaFormModal';

export const BajasPage = () => {
  const [lotes, setLotes] = usePersistentState('stockbar_lotes', defaultLotes);
  const [productos] = usePersistentState('stockbar_productos', defaultProductos);
  const [motivos] = usePersistentState('stockbar_motivos_baja', defaultMotivosBaja);
  const [bajas, setBajas] = usePersistentState('stockbar_bajas', defaultBajas);
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);

  const getProducto = (codigo) => productos.find((p) => p.codigo === codigo);
  const getLote = (idLote) => lotes.find((l) => l.id_lote === idLote);
  const getMotivo = (id) => motivos.find((m) => m.id_motivo_baja === id)?.nombre || 'N/A';

  const handleSaveBaja = (bajaParcial) => {
    const { nuevosLotes, nuevasBajas } = aplicarBaja({
      lotes,
      bajas,
      baja: {
        ...bajaParcial,
        id_usuario: currentUser?.id_usuario || null,
        usuario: currentUser?.nombre || 'N/A'
      }
    });
    setLotes(nuevosLotes);
    setBajas(nuevasBajas);
    setShowFormModal(false);
    showToast('success', 'Baja registrada y stock del lote actualizado');
  };

  const filteredBajas = bajas.filter((b) => {
    const lote = getLote(b.id_lote);
    const producto = lote ? getProducto(lote.producto_codigo) : null;
    const term = searchTerm.toLowerCase();
    return (
      (producto?.nombre || '').toLowerCase().includes(term) ||
      getMotivo(b.id_motivo_baja).toLowerCase().includes(term) ||
      (b.usuario || '').toLowerCase().includes(term)
    );
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
            onClick={() => setShowFormModal(true)}
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
            </tr>
          </thead>
          <tbody>
            {filteredBajas.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4" style={{ color: styles.mutedColor }}>
                  No hay bajas registradas todavía.
                </td>
              </tr>
            ) : (
              filteredBajas.map((b) => {
                const lote = getLote(b.id_lote);
                const producto = lote ? getProducto(lote.producto_codigo) : null;
                return (
                  <tr key={b.id_baja} style={{ borderBottom: `1px solid ${styles.borderCol}` }}>
                    <td className="py-3 small" style={{ color: styles.mutedColor }}>
                      {new Date(b.fecha_hora).toLocaleString('es-CO')}
                    </td>
                    <td className="py-3">
                      <div className="fw-semibold">{producto?.nombre || 'Producto eliminado'}</div>
                      <div className="small" style={{ color: styles.mutedColor }}>
                        Lote {lote?.numero_lote_proveedor || `#${b.id_lote}`}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="badge d-inline-flex align-items-center gap-1" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>
                        <ExclamationTriangle size={11} />
                        {getMotivo(b.id_motivo_baja)}
                      </span>
                    </td>
                    <td className="py-3 text-center fw-bold">{b.cantidad} un.</td>
                    <td className="py-3 small" style={{ color: styles.mutedColor }}>{b.usuario || 'N/A'}</td>
                    <td className="py-3 small" style={{ color: styles.mutedColor }}>{b.observaciones || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <BajaFormModal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveBaja}
        lotes={lotes}
        productos={productos}
        motivos={motivos}
      />
    </div>
  );
};
