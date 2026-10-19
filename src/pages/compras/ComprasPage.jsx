import React, { useState } from 'react';
import { PlusLg, Search, BagCheck, XCircle, CheckCircle } from 'react-bootstrap-icons';
import { CompraFormModal } from './ComprasFormModal';
import { CompraDetailModal } from './CompraDetailModal';
import { RowActions } from '../../components/common/RowActions';
import { FechaRangoFilter } from '../../components/common/FechaRangoFilter';
import { estaEnRangoFecha } from '../../utils/fechas';
import { showAlert } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';

export const ComprasPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  // Lotes, detalle_compra y stock los resuelve el backend (sp_agregar_detalle_compra,
  // sp_completar_compra): el lote es (producto, vencimiento) y solo suma stock
  // cuando la compra queda REGISTRADA.
  const { data: compras, recargar } = useApi('/compras', []);

  const styles = {
    cardBg: 'var(--bg-card)',
    borderCol: 'var(--border-color)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    inputBg: 'var(--bg-main)'
  };

  const filteredCompras = compras.filter(c =>
    ((c.numero_factura_proveedor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.proveedor || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    estaEnRangoFecha(c.fecha_compra, filtroDesde, filtroHasta)
  );

  // Toda compra nace PENDIENTE; "Registrar Compra" la crea y la completa en
  // la misma transacción (completar=true) y su stock cuenta de inmediato.
  // La factura digitalizada se adjunta después, ya con el id de la compra.
  const handleSaveCompra = async ({ archivoFactura, ...compra }, completar) => {
    const creada = await ejecutar(
      () => api.post('/compras', { ...compra, completar }),
      (c) => `Compra ${c.numero_factura_proveedor || c.id_compra} ${completar ? 'registrada' : 'guardada como pendiente'}`
    );
    if (!creada) return;
    if (archivoFactura) {
      const datos = new FormData();
      datos.append('factura', archivoFactura);
      await ejecutar(() => api.post(`/compras/${creada.id_compra}/factura`, datos));
    }
    setShowFormModal(false);
    setSelectedCompra(null);
    recargar();
  };

  const handleCompletarCompra = async (compra) => {
    const ok = await ejecutar(() => api.post(`/compras/${compra.id_compra}/completar`), `Compra ${compra.numero_factura_proveedor || compra.id_compra} registrada`);
    if (!ok) return;
    setShowDetailModal(false);
    recargar();
  };

  // Solo mientras está PENDIENTE (una compra REGISTRADA nunca se anula): su
  // stock nunca contó, así que no hay nada que revertir.
  const handleAnularCompra = async (compra) => {
    const confirmado = await showAlert.confirm('¿Anular esta compra pendiente?', 'Esta acción no se puede deshacer.');
    if (!confirmado) return;
    const ok = await ejecutar(() => api.post(`/compras/${compra.id_compra}/anular`), `Compra ${compra.numero_factura_proveedor || compra.id_compra} anulada`);
    if (!ok) return;
    setShowDetailModal(false);
    recargar();
  };

  return (
    <div className="card border-0 shadow-sm p-4" style={{ backgroundColor: styles.cardBg, borderRadius: '12px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: styles.textColor }}>Registro de Compras</h4>
          <p className="small m-0" style={{ color: styles.mutedColor }}>Facturas de ingreso de mercancía para reabastecer stock</p>
        </div>

        <div className="d-flex flex-wrap justify-content-md-end align-items-center gap-2">
          <div className="input-group" style={{ maxWidth: '260px' }}>
            <span className="input-group-text border-end-0" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.mutedColor }}>
              <Search size={16} />
            </span>
            <input 
              type="text" 
              className="form-control border-start-0" 
              placeholder="Buscar compra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, color: styles.textColor, borderColor: styles.borderCol }}
            />
          </div>
          <FechaRangoFilter desde={filtroDesde} hasta={filtroHasta} onDesdeChange={setFiltroDesde} onHastaChange={setFiltroHasta} />
          <button
            className="btn fw-semibold text-white d-flex align-items-center gap-2 px-3 text-nowrap"
            style={{ backgroundColor: 'var(--amber-action)', border: 'none', borderRadius: '8px' }}
            onClick={() => { setSelectedCompra(null); setShowFormModal(true); }}
          >
            <PlusLg size={18} />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table align-middle" style={{ color: styles.textColor }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${styles.borderCol}` }}>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>N° Factura</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Proveedor</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Método</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Fecha</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Total</th>
              <th className="small text-uppercase fw-bold py-3" style={{ color: styles.mutedColor }}>Estado</th>
              <th className="small text-uppercase fw-bold py-3 text-center" style={{ color: styles.mutedColor }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompras.map((c) => {
              // v6: PENDIENTE -> REGISTRADA (ya no se puede anular) o
              // PENDIENTE -> ANULADA (terminal). Ya no existe edición de una
              // compra registrada ni el paso "recibida".
              const estadoColores = {
                PENDIENTE: { bg: 'var(--amber-soft-bg)', color: 'var(--amber-action)' },
                REGISTRADA: { bg: 'var(--success-soft-bg)', color: 'var(--brand-success)' },
                ANULADA: { bg: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }
              }[c.estado] || { bg: 'var(--bg-main)', color: 'var(--text-muted)' };
              return (
              <tr key={c.id_compra} style={{ borderBottom: `1px solid ${styles.borderCol}` }}>
                <td className="py-3 fw-bold" style={{ color: 'var(--amber-action)' }}>{c.numero_factura_proveedor || c.id_compra}</td>
                <td className="py-3 fw-semibold">
                  <BagCheck className="me-2" color="var(--brand-blue)" />
                  {c.proveedor}
                </td>
                <td className="py-3 small" style={{ color: styles.mutedColor }}>{c.metodo_pago}</td>
                <td className="py-3" style={{ color: styles.mutedColor }}>{c.fecha_compra}</td>
                <td className="py-3 fw-bold">$ {Number(c.total_compra).toLocaleString('es-CO')}</td>
                <td className="py-3">
                  <span className="badge px-3 py-2" style={{ backgroundColor: estadoColores.bg, color: estadoColores.color }}>
                    {c.estado}
                  </span>
                </td>
                <td className="py-3 text-center">
                  <div className="d-flex justify-content-center gap-2">
                    <RowActions
                      onView={() => { setSelectedCompra(c); setShowDetailModal(true); }}
                      hideEdit
                      hideDelete
                    />
                    {c.estado === 'PENDIENTE' && (
                      <>
                        <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--brand-success)' }} title="Registrar (completar)" onClick={() => handleCompletarCompra(c)}>
                          <CheckCircle size={18} />
                        </button>
                        <button className="btn btn-sm p-1 border-0" style={{ color: 'var(--brand-danger)' }} title="Anular" onClick={() => handleAnularCompra(c)}>
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CompraFormModal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveCompra}
        compra={null}
      />

      <CompraDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedCompra(null); }}
        compra={selectedCompra}
        onAnular={handleAnularCompra}
        onCompletar={handleCompletarCompra}
      />
    </div>
  );
};