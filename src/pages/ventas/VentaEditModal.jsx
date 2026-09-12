import React, { useState, useEffect } from 'react';
import { PencilSquare } from 'react-bootstrap-icons';

// Solo edita los datos de encabezado de la venta (cliente, método de pago,
// referencia). Los productos no son editables aquí: cambiar cantidades ya
// vendidas requeriría revertir y volver a aplicar el descuento de stock por
// lote, así que ese ajuste se hace eliminando la venta (repone el stock) y
// registrando una nueva — igual criterio que "Editar Compra" para cantidades.
export const VentaEditModal = ({ show, onClose, onSave, venta, metodosPagoActivos }) => {
  const [formData, setFormData] = useState({ cliente: '', metodoPago: '', referenciaPago: '' });

  useEffect(() => {
    if (venta) {
      setFormData({
        cliente: venta.cliente || '',
        metodoPago: venta.metodoPago || '',
        referenciaPago: venta.referenciaPago === 'N/A' ? '' : venta.referenciaPago || ''
      });
    }
  }, [venta, show]);

  if (!show || !venta) return null;

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    inputBg: 'var(--bg-input)',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cliente.trim()) return;
    onSave({
      ...venta,
      cliente: formData.cliente.trim(),
      metodoPago: formData.metodoPago,
      referenciaPago: formData.referenciaPago.trim() || 'N/A'
    });
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <PencilSquare size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Editar Venta {venta.idVenta}</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 d-flex flex-column gap-3">
              <p className="small m-0" style={{ color: styles.mutedColor }}>
                Solo se pueden corregir los datos de encabezado. Los productos y cantidades no son editables aquí.
              </p>
              <div>
                <label className="form-label small fw-semibold">Cliente</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                />
              </div>
              <div>
                <label className="form-label small fw-semibold">Método de pago</label>
                <select
                  className="form-select"
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                >
                  {metodosPagoActivos.map((m) => (
                    <option key={m.id_metodo_pago} value={m.nombre}>{m.nombre}</option>
                  ))}
                  {!metodosPagoActivos.some((m) => m.nombre === formData.metodoPago) && formData.metodoPago && (
                    <option value={formData.metodoPago}>{formData.metodoPago}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label small fw-semibold">Referencia de pago</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Opcional"
                  value={formData.referenciaPago}
                  onChange={(e) => setFormData({ ...formData, referenciaPago: e.target.value })}
                  style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }}
                />
              </div>
            </div>
            <div className="modal-footer border-top p-3 d-flex gap-2" style={{ borderColor: styles.borderCol }}>
              <button type="button" className="btn border-0 text-secondary fw-medium" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }}>
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
