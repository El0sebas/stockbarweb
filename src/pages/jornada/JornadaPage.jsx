import React, { useState } from 'react';
import { ClockHistory, DoorOpen, DoorClosed, Search, Eye } from 'react-bootstrap-icons';
import { FechaRangoFilter } from '../../components/common/FechaRangoFilter';
import { estaEnRangoFecha } from '../../utils/fechas';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useAuth } from '../../context/AuthContext';
import { defaultJornadas } from '../../data/defaultJornadas';
import { defaultVentas } from '../../data/defaultVentas';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { getJornadaAbierta } from '../../utils/jornada';
import { generateNextIdentifier } from '../../utils/identifiers';
import { showToast, showAlert } from '../../utils/alerts';
import { JornadaDetailModal } from './JornadaDetailModal';
import Swal from 'sweetalert2';

export const JornadaPage = () => {
  const [jornadas, setJornadas] = usePersistentState('stockbar_jornadas', defaultJornadas);
  const [ventas] = usePersistentState('stockbar_ventas', defaultVentas);
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);
  const { currentUser } = useAuth();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const jornadaAbierta = getJornadaAbierta(jornadas);

  const handleAbrirJornada = () => {
    // Espejo de uq_una_jornada_abierta: no debería poder pasar (el botón ya
    // se deshabilita si hay una abierta), pero se revalida igual.
    if (getJornadaAbierta(jornadas)) {
      showAlert.error('Ya hay una jornada abierta', 'Debes cerrar la jornada actual antes de abrir una nueva.');
      return;
    }
    const nuevaJornada = {
      id_jornada: generateNextIdentifier({ items: jornadas, key: 'id_jornada', prefix: 'JOR', pad: 6, separator: '-' }),
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

  // Antes esto abría un modal con el desglose completo de la jornada y
  // pedía "Confirmar cierre" ahí mismo; ahora cerrar es solo una
  // confirmación simple — el desglose se ve aparte, en cualquier momento,
  // con "Ver detalle" desde el historial (ver JornadaDetailModal).
  const handleCerrarJornada = async () => {
    const { isConfirmed, value: observaciones } = await Swal.fire({
      icon: 'warning',
      title: '¿Cerrar jornada?',
      text: 'No podrás registrar más ventas hasta abrir una nueva jornada.',
      input: 'textarea',
      inputPlaceholder: 'Novedades del turno (opcional): faltantes, incidentes, etc.',
      showCancelButton: true,
      confirmButtonColor: 'var(--amber-action)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-card)',
      color: 'var(--text-main)',
      reverseButtons: true,
    });
    if (!isConfirmed) return;

    setJornadas((prev) => prev.map((j) =>
      j.id_jornada === jornadaAbierta.id_jornada
        ? {
            ...j,
            estado: 'CERRADA',
            id_usuario_cierre: currentUser?.id_usuario || null,
            usuario_cierre: currentUser?.nombre || 'N/A',
            fecha_hora_cierre: new Date().toISOString(),
            observaciones: (observaciones || '').trim()
          }
        : j
    ));
    showToast('success', 'Jornada cerrada correctamente');
  };

  const filteredJornadas = jornadas.filter((j) =>
    ((j.usuario_apertura || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.usuario_cierre || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    estaEnRangoFecha(j.fecha_hora_apertura, filtroDesde, filtroHasta)
  );

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
              onClick={handleCerrarJornada}
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
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
          <h5 className="fw-bold m-0 d-flex align-items-center gap-2" style={{ color: styles.textColor }}>
            <ClockHistory size={18} /> Historial de jornadas
          </h5>
          <div className="d-flex align-items-center gap-2">
            <div className="position-relative">
              <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: styles.mutedColor }} />
              <input
                type="text"
                placeholder="Buscar por usuario..."
                className="form-control ps-5 shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor, width: '220px' }}
              />
            </div>
            <FechaRangoFilter desde={filtroDesde} hasta={filtroHasta} onDesdeChange={setFiltroDesde} onHastaChange={setFiltroHasta} />
          </div>
        </div>
        <div className="table-responsive">
          <table className="table align-middle" style={{ color: styles.textColor }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${styles.borderCol}` }}>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Apertura</th>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Usuario apertura</th>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Cierre</th>
                <th className="small text-uppercase fw-bold py-2" style={{ color: styles.mutedColor }}>Usuario cierre</th>
                <th className="small text-uppercase fw-bold py-2 text-center" style={{ color: styles.mutedColor }}>Estado</th>
                <th className="small text-uppercase fw-bold py-2 text-center" style={{ color: styles.mutedColor }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredJornadas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4" style={{ color: styles.mutedColor }}>
                    {jornadas.length === 0 ? 'Todavía no se ha abierto ninguna jornada.' : 'No se encontraron jornadas con ese filtro.'}
                  </td>
                </tr>
              ) : (
                filteredJornadas.map((j) => (
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
                    <td className="py-2 text-center">
                      <button
                        className="btn btn-sm p-1 border-0"
                        style={{ color: 'var(--brand-blue)' }}
                        title="Ver detalle"
                        onClick={() => { setSelectedJornada(j); setShowDetailModal(true); }}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JornadaDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedJornada(null); }}
        jornada={selectedJornada}
        ventas={ventas}
        metodosPago={metodosPago}
      />
    </div>
  );
};
