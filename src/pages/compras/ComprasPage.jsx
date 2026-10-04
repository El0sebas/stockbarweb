import React, { useState } from 'react';
import { PlusLg, Search, BagCheck, XCircle, CheckCircle } from 'react-bootstrap-icons';
import { CompraFormModal } from './ComprasFormModal';
import { CompraDetailModal } from './CompraDetailModal';
import { RowActions } from '../../components/common/RowActions';
import { FechaRangoFilter } from '../../components/common/FechaRangoFilter';
import { estaEnRangoFecha } from '../../utils/fechas';
import { generateNextIdentifier } from '../../utils/identifiers';
import { showToast, showAlert } from '../../utils/alerts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultCompras } from '../../data/defaultCompras';
import { defaultLotes } from '../../data/defaultLotes';
import { defaultDetalleCompra } from '../../data/defaultDetalleCompra';
import { defaultMetodosPago } from '../../data/defaultMetodosPago';
import { useAuth } from '../../context/AuthContext';

export const ComprasPage = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [compras, setCompras] = usePersistentState('stockbar_compras', defaultCompras);
  // Un lote ES (producto, fecha_vencimiento) — v3. Varias compras del mismo
  // producto con el mismo vencimiento suman al MISMO lote (cantidad_disponible),
  // nunca crean lotes duplicados. detalle_compra es el historial inmutable
  // de qué trajo cada compra y a qué precio (ver docs/DATABASE.md).
  const [lotes, setLotes] = usePersistentState('stockbar_lotes', defaultLotes);
  const [detalleCompra, setDetalleCompra] = usePersistentState('stockbar_detalle_compra', defaultDetalleCompra);
  const [metodosPago] = usePersistentState('stockbar_metodos_pago', defaultMetodosPago);

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

  const nextFactura = generateNextIdentifier({
    items: compras,
    key: 'numero_factura_proveedor',
    prefix: 'FAC',
    pad: 4,
    separator: '-'
  });

  const resolverNombreMetodoPago = (idMetodoPago) =>
    metodosPago.find((m) => m.id_metodo_pago === idMetodoPago)?.nombre || 'N/A';

  // v3: un lote ES (producto, fecha_vencimiento). Busca un lote existente
  // con esa identidad (nunca crea uno duplicado); si no existe, lo crea.
  // Cada línea también queda registrada en detalle_compra (historial
  // inmutable de qué trajo esta compra y a qué precio) — mirror de
  // sp_agregar_detalle_compra. v6: NO toca cantidad_disponible — eso solo
  // ocurre al completar la compra (fn_stock_lote solo suma REGISTRADA).
  const crearDetalleCompraPendiente = (idCompra, items) => {
    let siguienteNumero = lotes.reduce((max, l) => Math.max(max, Number(l.id_lote.split('-')[1]) || 0), 0);
    const lotesActualizados = lotes.map((l) => ({ ...l }));
    const nuevasEntradas = [];

    (items || []).forEach((item) => {
      let lote = lotesActualizados.find(
        (l) => l.id_producto === item.producto_codigo && (l.fecha_vencimiento || null) === (item.fecha_vencimiento || null)
      );
      if (!lote) {
        siguienteNumero += 1;
        lote = {
          id_lote: `LOT-${String(siguienteNumero).padStart(6, '0')}`,
          id_producto: item.producto_codigo,
          fecha_vencimiento: item.fecha_vencimiento || null,
          cantidad_disponible: 0
        };
        lotesActualizados.push(lote);
      }
      nuevasEntradas.push({
        id_compra: idCompra,
        id_lote: lote.id_lote,
        cantidad: Number(item.cantidad),
        precio_unitario_compra: Number(item.costoUnitario)
      });
    });

    setLotes(lotesActualizados);
    setDetalleCompra((prevDetalle) => [...prevDetalle, ...nuevasEntradas]);
  };

  // Espejo de sp_completar_compra: PENDIENTE -> REGISTRADA. Solo ahora el
  // stock de sus líneas cuenta (fn_stock_lote solo suma compras REGISTRADA).
  const completarCompra = (idCompra) => {
    const entradas = detalleCompra.filter((dc) => dc.id_compra === idCompra);
    setLotes((prev) => prev.map((l) => {
      const aportes = entradas.filter((dc) => dc.id_lote === l.id_lote);
      if (aportes.length === 0) return l;
      const totalAportado = aportes.reduce((acc, dc) => acc + Number(dc.cantidad), 0);
      return { ...l, cantidad_disponible: Number(l.cantidad_disponible) + totalAportado };
    }));
    setCompras((prev) => prev.map((c) => (c.id_compra === idCompra ? { ...c, estado: 'REGISTRADA' } : c)));
  };

  const crearCompra = (compra, estadoInicial) => {
    const facturaGenerada = (compra.numero_factura_proveedor || nextFactura).trim();
    const idCompra = generateNextIdentifier({ items: compras, key: 'id_compra', prefix: 'CMP', pad: 6, separator: '-' });
    setCompras(prev => [{
      ...compra,
      id_compra: idCompra,
      numero_factura_proveedor: facturaGenerada,
      estado: estadoInicial,
      id_usuario: currentUser?.id_usuario || null,
      usuario: currentUser?.nombre || 'N/A',
      fecha_registro: new Date().toISOString()
    }, ...prev]);
    crearDetalleCompraPendiente(idCompra, compra.items);
    return { idCompra, facturaGenerada };
  };

  // v6: toda compra nace PENDIENTE (espejo de venta); "Registrar Compra" la
  // crea y la completa en el mismo paso (su stock cuenta de inmediato).
  const handleSaveCompra = (compra) => {
    const { idCompra, facturaGenerada } = crearCompra(compra, 'PENDIENTE');
    completarCompra(idCompra);
    showToast('success', `Compra ${facturaGenerada} registrada`);
    setShowFormModal(false);
    setSelectedCompra(null);
  };

  const handleGuardarCompraPendiente = (compra) => {
    const { facturaGenerada } = crearCompra(compra, 'PENDIENTE');
    showToast('success', `Compra ${facturaGenerada} guardada como pendiente`);
    setShowFormModal(false);
    setSelectedCompra(null);
  };

  const handleCompletarCompra = (compra) => {
    completarCompra(compra.id_compra);
    showToast('success', `Compra ${compra.numero_factura_proveedor} registrada`);
    setShowDetailModal(false);
  };

  // Espejo de trg_validar_anulacion_compra (v6): solo se puede anular
  // mientras está PENDIENTE. Su stock nunca contó, así que no hay nada que
  // revertir en los lotes.
  const handleAnularCompra = async (compra) => {
    const confirmado = await showAlert.confirm('¿Anular esta compra pendiente?', 'Esta acción no se puede deshacer.');
    if (!confirmado) return;

    setCompras(prev => prev.map(item => item.id_compra === compra.id_compra ? { ...item, estado: 'ANULADA' } : item));
    showToast('success', `Compra ${compra.numero_factura_proveedor} anulada`);
    setShowDetailModal(false);
  };

  return (
    <div className="card border-0 shadow-sm p-4" style={{ backgroundColor: styles.cardBg, borderRadius: '12px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: styles.textColor }}>Registro de Compras</h4>
          <p className="small m-0" style={{ color: styles.mutedColor }}>Facturas de ingreso de mercancía para reabastecer stock</p>
        </div>

        <div className="d-flex align-items-center gap-2">
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
            className="btn fw-semibold text-white d-flex align-items-center gap-2 px-3"
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
                <td className="py-3 fw-bold" style={{ color: 'var(--amber-action)' }}>{c.numero_factura_proveedor}</td>
                <td className="py-3 fw-semibold">
                  <BagCheck className="me-2" color="var(--brand-blue)" />
                  {c.proveedor}
                </td>
                <td className="py-3 small" style={{ color: styles.mutedColor }}>{resolverNombreMetodoPago(c.id_metodo_pago)}</td>
                <td className="py-3" style={{ color: styles.mutedColor }}>{c.fecha_compra}</td>
                <td className="py-3 fw-bold">$ {Number(c.total).toLocaleString()}</td>
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
        onGuardarPendiente={handleGuardarCompraPendiente}
        compra={selectedCompra}
        nextFactura={nextFactura}
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