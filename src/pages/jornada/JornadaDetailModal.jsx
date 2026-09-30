import React from 'react';
import { ClockHistory, CashCoin, Person, Calendar3 } from 'react-bootstrap-icons';
import { calcularTotalesVenta } from '../../utils/impuestos';

// Desglose de una jornada (abierta o ya cerrada): ventas completadas, total
// vendido, base/IVA y forma de pago. Antes esto solo se mostraba una vez, al
// momento de cerrar la jornada abierta; ahora es "ver detalle" desde el
// historial, disponible para cualquier jornada en cualquier momento.
export const JornadaDetailModal = ({ show, onClose, jornada, ventas, metodosPago }) => {
  if (!show || !jornada) return null;

  const ventasDeLaJornada = ventas.filter((v) => v.id_jornada === jornada.id_jornada && v.estado === 'COMPLETADA');

  const totales = calcularTotalesVenta(
    ventasDeLaJornada.flatMap((v) => (v.productos || []).map((p) => ({ precio: p.precio, cantidad: p.cantidad, porcentajeIva: p.porcentajeIva })))
  );

  const totalesPorMetodo = metodosPago.map((m) => ({
    nombre: m.nombre,
    total: ventasDeLaJornada
      .flatMap((v) => v.pagos || [])
      .filter((p) => p.id_metodo_pago === m.id_metodo_pago)
      .reduce((acc, p) => acc + Number(p.monto), 0)
  })).filter((m) => m.total > 0);

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-main)'
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <CashCoin size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalle de Jornada</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: styles.borderCol }}>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: jornada.estado === 'ABIERTA' ? 'var(--success-soft-bg)' : 'var(--border-color)',
                  color: jornada.estado === 'ABIERTA' ? 'var(--brand-success)' : styles.mutedColor,
                  borderRadius: '12px'
                }}
              >
                {jornada.estado}
              </span>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Calendar3 size={16} />
                    <span className="small">Apertura</span>
                  </div>
                  <span className="fw-semibold">{new Date(jornada.fecha_hora_apertura).toLocaleString('es-CO')}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Person size={16} />
                    <span className="small">Abrió</span>
                  </div>
                  <span className="fw-semibold">{jornada.usuario_apertura}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Calendar3 size={16} />
                    <span className="small">Cierre</span>
                  </div>
                  <span className="fw-semibold">{jornada.fecha_hora_cierre ? new Date(jornada.fecha_hora_cierre).toLocaleString('es-CO') : '—'}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1" style={{ color: styles.mutedColor }}>
                    <Person size={16} />
                    <span className="small">Cerró</span>
                  </div>
                  <span className="fw-semibold">{jornada.usuario_cierre || '—'}</span>
                </div>
              </div>
            </div>

            <p className="small m-0 d-flex align-items-center gap-2" style={{ color: styles.mutedColor }}>
              <ClockHistory size={14} /> Resumen de ventas completadas en esta jornada:
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
                  <div className="fw-bold fs-5" style={{ color: 'var(--amber-action)' }}>$ {Math.round(totales.total).toLocaleString()}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>Base gravable</div>
                  <div className="fw-semibold">$ {Math.round(totales.baseGravable).toLocaleString()}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="small" style={{ color: styles.mutedColor }}>IVA recaudado</div>
                  <div className="fw-semibold">$ {Math.round(totales.iva).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {totalesPorMetodo.length > 0 ? (
              <div className="p-3 rounded-3" style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.borderCol}` }}>
                <div className="small fw-semibold mb-2" style={{ color: styles.mutedColor }}>Desglose por método de pago</div>
                {totalesPorMetodo.map((m) => (
                  <div key={m.nombre} className="d-flex justify-content-between small">
                    <span>{m.nombre}</span>
                    <span className="fw-semibold">$ {Math.round(m.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small m-0 text-center py-2" style={{ color: styles.mutedColor }}>
                Sin ventas completadas en esta jornada todavía.
              </p>
            )}
          </div>

          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button
              type="button"
              className="btn btn-sm px-4 fw-medium"
              style={{ backgroundColor: 'var(--border-color)', color: styles.textColor, border: 'none' }}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
