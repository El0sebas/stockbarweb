import React, { useState } from 'react';
import { PlusLg, Search, BagCheck, XCircle } from 'react-bootstrap-icons';
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
  // con esa identidad y le suma la cantidad (nunca crea uno duplicado);
  // si no existe, lo crea. Cada línea también queda registrada en
  // detalle_compra (historial inmutable de qué trajo esta compra y a qué
  // precio) — mirror de sp_agregar_detalle_compra.
  const registrarEntradasCompra = (idCompra, items) => {
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
      lote.cantidad_disponible = Number(lote.cantidad_disponible) + Number(item.cantidad);
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

  const handleSaveCompra = (compra) => {
    // v3: compra.estado solo admite REGISTRADA/ANULADA — editar una compra ya
    // ANULADA no tiene sentido (trg_validar_anulacion_compra la bloquearía).
    // No hay edición de una compra ya registrada en esta vista — ver RowActions.
    const facturaGenerada = (compra.numero_factura_proveedor || nextFactura).trim();
    const idCompra = generateNextIdentifier({ items: compras, key: 'id_compra', prefix: 'CMP', pad: 6, separator: '-' });
    setCompras(prev => [{
      ...compra,
      id_compra: idCompra,
      numero_factura_proveedor: facturaGenerada,
      estado: 'REGISTRADA',
      id_usuario: currentUser?.id_usuario || null,
      usuario: currentUser?.nombre || 'N/A',
      fecha_registro: new Date().toISOString()
    }, ...prev]);
    // v3: una compra REGISTRADA cuenta como stock y es vendible de inmediato
    // — ya no existe el paso intermedio "marcar como recibida".
    registrarEntradasCompra(idCompra, compra.items);
    showToast('success', `Compra ${facturaGenerada} registrada`);
    setShowFormModal(false);
    setSelectedCompra(null);
  };

  // Espejo de trg_validar_anulacion_compra: solo se puede anular si ninguno
  // de sus lotes ya tiene ventas/bajas que dependan de lo que esta compra
  // aportó. REGISTRADA -> ANULADA es la única transición válida y es terminal.
  const handleAnularCompra = async (compra) => {
    const confirmado = await showAlert.confirm('¿Anular esta compra?', 'Se revertirá el stock que aportó. Esta acción no se puede deshacer.');
    if (!confirmado) return;

    const entradas = detalleCompra.filter((dc) => dc.id_compra === compra.id_compra);

    const stockInsuficiente = entradas.some((dc) => {
      const lote = lotes.find((l) => l.id_lote === dc.id_lote);
      return !lote || Number(lote.cantidad_disponible) < dc.cantidad;
    });
    if (stockInsuficiente) {
      showAlert.error('No se puede anular', 'Uno o más lotes de esta compra ya tienen ventas o bajas que dependen de ese stock.');
      return;
    }

    setLotes((prev) => prev.map((l) => {
      const entrada = entradas.find((dc) => dc.id_lote === l.id_lote);
      return entrada ? { ...l, cantidad_disponible: Number(l.cantidad_disponible) - entrada.cantidad } : l;
    }));
    setCompras(prev => prev.map(item => item.id_compra === compra.id_compra ? { ...item, estado: 'ANULADA' } : item));
    showToast('success', `Compra ${compra.numero_factura_proveedor} anulada`);
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
              // v3: REGISTRADA -> ANULADA es la única transición, y es terminal.
              // Ya no existe edición de una compra registrada (sus lotes ya
              // pueden tener ventas/bajas encima) ni el paso "recibida".
              const registrada = c.estado === 'REGISTRADA';
              const estadoColores = {
                REGISTRADA: { bg: 'var(--success-soft-bg)', color: 'var(--brand-success)' },
                ANULADA: { bg: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }
              }[c.estado];
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
                  {registrada ? (
                    <button
                      type="button"
                      className="badge px-3 py-2 border-0 d-flex align-items-center gap-1"
                      style={{ backgroundColor: estadoColores.bg, color: estadoColores.color, cursor: 'pointer' }}
                      title="Anular compra"
                      onClick={() => handleAnularCompra(c)}
                    >
                      {c.estado} <XCircle size={12} />
                    </button>
                  ) : (
                    <span className="badge px-3 py-2" style={{ backgroundColor: estadoColores.bg, color: estadoColores.color }}>
                      {c.estado}
                    </span>
                  )}
                </td>
                <td className="py-3 text-center">
                  <RowActions
                    onView={() => { setSelectedCompra(c); setShowDetailModal(true); }}
                    hideEdit
                    hideDelete
                  />
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
        compra={selectedCompra}
        nextFactura={nextFactura}
      />

      <CompraDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedCompra(null); }}
        compra={selectedCompra}
        onAnular={handleAnularCompra}
      />
    </div>
  );
};