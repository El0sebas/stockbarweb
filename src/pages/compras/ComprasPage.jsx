import React, { useState } from 'react';
import { PlusLg, Search, BagCheck } from 'react-bootstrap-icons';
import { CompraFormModal } from './ComprasFormModal';
import { CompraDetailModal } from './CompraDetailModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { RowActions } from '../../components/common/RowActions';
import { StatusToggle } from '../../components/common/StatusToggle';
import { generateNextIdentifier } from '../../utils/identifiers';
import { showToast } from '../../utils/alerts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultCompras } from '../../data/defaultCompras';
import { defaultLotes } from '../../data/defaultLotes';

export const ComprasPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [compras, setCompras] = usePersistentState('stockbar_compras', defaultCompras);
  // Cada línea de una compra crea un lote real (nunca un lote suelto ni un
  // stock editable en Productos): ver utils/stock.js y docs/DATABASE.md.
  const [lotes, setLotes] = usePersistentState('stockbar_lotes', defaultLotes);

  const styles = {
    cardBg: 'var(--bg-card)',
    borderCol: 'var(--border-color)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    inputBg: 'var(--bg-main)'
  };

  const filteredCompras = compras.filter(c =>
    (c.numero_factura_proveedor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.proveedor || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nextFactura = generateNextIdentifier({
    items: compras,
    key: 'numero_factura_proveedor',
    prefix: 'FAC',
    pad: 4,
    separator: '-'
  });

  // Reemplaza los lotes que pertenecían a esta compra (si la estaban
  // editando) por los que vienen en sus líneas actuales — cada línea de
  // compra es, siempre, un lote real (ver docs/DATABASE.md).
  const sincronizarLotes = (idCompra, items) => {
    setLotes((prev) => {
      const sinEstaCompra = prev.filter((l) => l.id_compra !== idCompra);
      let siguienteId = sinEstaCompra.reduce((max, l) => Math.max(max, l.id_lote), 0) + 1;
      const nuevosLotes = (items || []).map((item) => ({
        id_lote: siguienteId++,
        id_compra: idCompra,
        producto_codigo: item.producto_codigo,
        cantidad: item.cantidad,
        cantidad_disponible: item.cantidad,
        precio_unitario_compra: item.costoUnitario,
        fecha_vencimiento: item.fecha_vencimiento || null,
        numero_lote_proveedor: item.numero_lote || null
      }));
      return [...sinEstaCompra, ...nuevosLotes];
    });
  };

  const handleSaveCompra = (compra) => {
    if (selectedCompra) {
      setCompras(prev => prev.map(item => item.id === selectedCompra.id ? { ...item, ...compra } : item));
      sincronizarLotes(selectedCompra.id, compra.items);
      showToast('success', 'Compra actualizada correctamente');
    } else {
      const facturaGenerada = (compra.numero_factura_proveedor || nextFactura).trim();
      const idCompra = Date.now();
      setCompras(prev => [{ ...compra, id: idCompra, numero_factura_proveedor: facturaGenerada, estado: 'Pendiente' }, ...prev]);
      sincronizarLotes(idCompra, compra.items);
      showToast('success', `Compra ${facturaGenerada} registrada exitosamente`);
    }
    setShowFormModal(false);
    setSelectedCompra(null);
  };

  // El cambio de estado vive solo en el listado, y es de una sola vía:
  // una vez "Recibida" no puede regresar a "Pendiente".
  const handleMarcarRecibida = (compra) => {
    if (compra.estado === 'Recibida') return;
    setCompras(prev => prev.map(item => item.id === compra.id ? { ...item, estado: 'Recibida' } : item));
    showToast('success', `Compra ${compra.numero_factura_proveedor} marcada como recibida`);
  };

  const handleConfirmDelete = () => {
    if (selectedCompra) {
      setCompras(prev => prev.filter(item => item.id !== selectedCompra.id));
      setLotes(prev => prev.filter(l => l.id_compra !== selectedCompra.id));
      showToast('success', 'Compra eliminada exitosamente');
    }
    setShowDeleteModal(false);
    setSelectedCompra(null);
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
            {filteredCompras.map((c) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${styles.borderCol}` }}>
                <td className="py-3 fw-bold" style={{ color: 'var(--amber-action)' }}>{c.numero_factura_proveedor}</td>
                <td className="py-3 fw-semibold">
                  <BagCheck className="me-2" color="var(--brand-blue)" />
                  {c.proveedor}
                </td>
                <td className="py-3 small" style={{ color: styles.mutedColor }}>{c.metodoPago || 'Efectivo'}</td>
                <td className="py-3" style={{ color: styles.mutedColor }}>{c.fecha_compra}</td>
                <td className="py-3 fw-bold">$ {Number(c.total).toLocaleString()}</td>
                <td className="py-3">
                  <StatusToggle
                    active={c.estado === 'Recibida'}
                    onToggle={() => handleMarcarRecibida(c)}
                    activeLabel="Recibida"
                    inactiveLabel="Pendiente"
                    disabled={c.estado === 'Recibida'}
                  />
                </td>
                <td className="py-3 text-center">
                  <RowActions
                    onView={() => { setSelectedCompra(c); setShowDetailModal(true); }}
                    onEdit={() => { setSelectedCompra(c); setShowFormModal(true); }}
                    onDelete={() => { setSelectedCompra(c); setShowDeleteModal(true); }}
                    disabledReason={c.estado !== 'Pendiente' ? 'Solo se puede editar o eliminar mientras la compra esté Pendiente' : undefined}
                  />
                </td>
              </tr>
            ))}
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
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={selectedCompra?.numero_factura_proveedor}
      />
    </div>
  );
};