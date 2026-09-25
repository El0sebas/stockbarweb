import React, { useState } from 'react';
import { ClockHistory, DoorOpen, DoorClosed, CashCoin } from 'react-bootstrap-icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useAuth } from '../../context/AuthContext';
import { defaultJornadas } from '../../data/defaultJornadas';
import { defaultVentas } from '../../data/defaultVentas';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { getJornadaAbierta } from '../../utils/jornada';
import { calcularTotalesVenta } from '../../utils/impuestos';
import { generateNextId } from '../../utils/identifiers';
import { showToast, showAlert } from '../../utils/alerts';

export const JornadaPage = () => {
  const [jornadas, setJornadas] = usePersistentState('stockbar_jornadas', defaultJornadas);
  const [ventas] = usePersistentState('stockbar_ventas', defaultVentas);
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);
  const { currentUser } = useAuth();
  const [showCierreModal, setShowCierreModal] = useState(false);

  const jornadaAbierta = getJornadaAbierta(jornadas);

  const handleAbrirJornada = () => {
    // Espejo de uq_una_jornada_abierta: no debería poder pasar (el botón ya
    // se deshabilita si hay una abierta), pero se revalida igual.
    if (getJornadaAbierta(jornadas)) {
      showAlert.error('Ya hay una jornada abierta', 'Debes cerrar la jornada actual antes de abrir una nueva.');
      return;
    }
    const nuevaJornada = {
      id_jornada: generateNextId(jornadas, 'id_jornada'),
      id_usuario_apertura: currentUser?.id_usuario || null,
      usuario_apertura: currentUser?.nombre || 'N/A',
      fecha_hora_apertura: new Date().toISOString(),
      id_usuario_cierre: null,
      usuario_cierre: null,
      fecha_hora_cierre: null,
      estado: 'ABIERTA',
      observaciones: ''
    };
    setJornadas((prev) => [nuevaJornada, ...prev]);
    showToast('success', 'Jornada abierta. Ya puedes registrar ventas.');
  };

  const ventasDeLaJornada = jornadaAbierta
    ? ventas.filter((v) => v.id_jornada === jornadaAbierta.id_jornada && v.estado === 'COMPLETADA')
    : [];

  const totalesJornada = calcularTotalesVenta(
    ventasDeLaJornada.flatMap((v) => (v.productos || []).map((p) => ({ precio: p.precio, cantidad: p.cantidad, porcentajeIva: p.porcentajeIva })))
  );

  const totalesPorMetodo = metodosPago.map((m) => ({
    nombre: m.nombre,
    total: ventasDeLaJornada
      .flatMap((v) => v.pagos || [])
      .filter((p) => p.id_metodo_pago === m.id_metodo_pago)
      .reduce((acc, p) => acc + Number(p.monto), 0)
  })).filter((m) => m.total > 0);

  const handleConfirmarCierre = () => {
    setJornadas((prev) => prev.map((j) =>
      j.id_jornada === jornadaAbierta.id_jornada
        ? {
            ...j,
            estado: 'CERRADA',
            id_usuario_cierre: currentUser?.id_usuario || null,
            usuario_cierre: currentUser?.nombre || 'N/A',
            fecha_hora_cierre: new Date().toISOString()
          }
        : j
    ));
    setShowCierreModal(false);
    showToast('success', 'Jornada cerrada correctamente');
  };

  const styles = {
    cardBg: 'var(--bg-card)',
    borderCol: 'var(--border-color)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    inputBg: 'var(--bg-main)'
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="card border-0 shadow-sm p-4" style={{ backgroundColor: styles.cardBg, borderRadius: '12px' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            {jornadaAbierta ? (
              <DoorOpen size={28} color="var(--brand-success)" />
            ) : (
              <DoorClosed size={28} color="var(--text-muted)" />
            )}
            <div>
              <h4 className="fw-bold mb-1" style={{ color: styles.textColor }}>
                {jornadaAbierta ? 'Jornada abierta' : 'Sin jornada abierta'}
              </h4>
              <p className="small m-0" style={{ color: styles.mutedColor }}>
                {jornadaAbierta
                  ? `Desde ${new Date(jornadaAbierta.fecha_hora_apertura).toLocaleString('es-CO')} por ${jornadaAbierta.usuario_apertura}`
                  : 'Debes abrir una jornada antes de poder registrar ventas.'}
              </p>
            </div>
          </div>

          {jornadaAbierta ? (
            <button
              className="btn fw-semibold text-white px-4"
              style={{ backgroundColor: 'var(--brand-danger)', border: 'none', borderRadius: '8px' }}
              onClick={() => setShowCierreModal(true)}
            >
              Cerrar jornada
            </button>
          ) : (
            <button
              className="btn fw-semibold text-white px-4"
              style={{ backgroundColor: 'var(--amber-action)', border: 'none', borderRadius: '8px' }}
              onClick={handleAbrirJornada}
            >
              Abrir jornada
            </button>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm p-4" style={{ backgroundColor: styles.cardBg, borderRadius: '12px' }}>
        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: styles.textColor }}>
          <ClockHistory size={18} /> Historial de jornadas
        </h5>
        <div className="table-responsive">
          <table className="table align-middle" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${styles.borderCol}` }}>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Apertura</th>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Usuario apertura</th>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Cierre</th>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Usuario cierre</th>
                <th className="small text-uppercase fw-bold py-2 text-center" style={{ color: styles.mutedColor }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {jornadas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4" style={{ color: styles.mutedColor }}>
                    Todavía no se ha abierto ninguna jornada.
                  </td>
                </tr>
              ) : (
                jornadas.map((j) => (
                  <tr key={j.id_jornada} style={{ borderBottom: `1px solid ${styles.borderCol}` }}>
                    <td className="py-2 small">{new Date(j.fecha_hora_apertura).toLocaleString('es-CO')}</td>
                    <td className="py-2 small">{j.usuario_apertura}</td>
                    <td className="py-2 small" style={{ color: styles.mutedColor }}>
                      {j.fecha_hora_cierre ? new Date(j.fecha_hora_cierre).toLocaleString('es-CO') : '—'}
                    </td>
                    <td className="py-2 small" style={{ color: styles.mutedColor }}>{j.usuario_cierre || '—'}</td>
                    <td className="py-2 text-center">
                      <span
                        className="badge px-3 py-1"
                        style={{
                          backgroundColor: j.estado === 'ABIERTA' ? 'var(--success-soft-bg)' : 'var(--border-color)',
                          color: j.estado === 'ABIERTA' ? 'var(--brand-success)' : styles.mutedColor
                        }}
                      >
                        {j.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCierreModal && jornadaAbierta && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.cardBg, color: styles.textColor, borderRadius: '12px' }}>
              <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
                <div className="d-flex align-items-center gap-2">
                  <CashCoin size={20} color="var(--amber-action)" />
                  <h5 className="modal-title fw-bold m-0">Cerrar jornada</h5>
                </div>
                <button type="button" className="btn-close shadow-none btn-close-themed" onClick={() => setShowCierreModal(false)}></button>
              </div>
              <div className="modal-body p-4 d-flex flex-column gap-3">
                <p className="small m-0" style={{ color: styles.mutedColor }}>
                  Resumen de ventas completadas en esta jornada (calculado, no se pide conteo manual de caja):
                </p>
                <div className="row g-2">
                  <div className="col-6">
                    <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                      <div className="small" style={{ color: styles.mutedColor }}>Ventas completadas</div>
                      <div className="fw-bold fs-5">{ventasDeLaJornada.length}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                      <div className="small" style={{ color: styles.mutedColor }}>Total vendido</div>
                      <div className="fw-bold fs-5" style={{ color: 'var(--amber-action)' }}>$ {Math.round(totalesJornada.total).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                      <div className="small" style={{ color: styles.mutedColor }}>Base gravable</div>
                      <div className="fw-semibold">$ {Math.round(totalesJornada.baseGravable).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                      <div className="small" style={{ color: styles.mutedColor }}>IVA recaudado</div>
                      <div className="fw-semibold">$ {Math.round(totalesJornada.iva).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                {totalesPorMetodo.length > 0 && (
                  <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                    <div className="small fw-semibold mb-2" style={{ color: styles.mutedColor }}>Desglose por método de pago</div>
                    {totalesPorMetodo.map((m) => (
                      <div key={m.nombre} className="d-flex justify-content-between small">
                        <span>{m.nombre}</span>
                        <span className="fw-semibold">$ {Math.round(m.total).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
                <button type="button" className="btn border-0 text-secondary fw-medium" onClick={() => setShowCierreModal(false)}>Cancelar</button>
                <button type="button" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--brand-danger)' }} onClick={handleConfirmarCierre}>
                  Confirmar cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
