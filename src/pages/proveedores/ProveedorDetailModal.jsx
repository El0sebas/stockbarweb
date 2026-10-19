import React, { useState } from 'react';
import { Building, Person, Telephone, Envelope, StarFill, Star, PlusLg, Trash, Calendar3 } from 'react-bootstrap-icons';
import { showToast } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { ejecutar } from '../../utils/accion';

// onCambio: avisa al listado (columna "contacto principal") que hubo cambios.
export const ProveedorDetailModal = ({ show, onClose, proveedor: resumen, onCambio }) => {
  const { data: detalle, recargar } = useApi(show && resumen ? `/proveedores/${resumen.id_proveedor}` : null);
  const [formVisible, setFormVisible] = useState(false);
  const [nuevoContacto, setNuevoContacto] = useState({ nombres: '', apellidos: '', cargo: '', telefono: '', correo: '', es_principal: false });

  if (!show || !resumen) return null;

  // Mientras llega el detalle se muestra la fila del listado.
  const proveedor = detalle?.id_proveedor === resumen.id_proveedor ? detalle : resumen;
  const contactosProveedor = proveedor.contactos ?? [];
  const base = `/proveedores/${proveedor.id_proveedor}/contactos`;
  const tras = async (promesa) => {
    if (await promesa) {
      recargar();
      onCambio?.();
    }
  };

  // Un solo contacto principal por proveedor: el backend desmarca el
  // anterior en la misma transacción.
  const handleAgregarContacto = async (e) => {
    e.preventDefault();
    if (!nuevoContacto.nombres.trim() || !nuevoContacto.apellidos.trim() || !nuevoContacto.telefono.trim()) {
      showToast('error', 'Nombres, apellidos y teléfono son obligatorios');
      return;
    }
    const ok = await ejecutar(() => api.post(base, nuevoContacto), 'Contacto agregado');
    if (!ok) return;
    setNuevoContacto({ nombres: '', apellidos: '', cargo: '', telefono: '', correo: '', es_principal: false });
    setFormVisible(false);
    tras(ok);
  };

  const handleMarcarPrincipal = (contacto) =>
    tras(ejecutar(() => api.patch(`${base}/${contacto.nro_contacto}/principal`), 'Contacto principal actualizado'));

  const handleQuitarContacto = (contacto) =>
    tras(ejecutar(() => api.del(`${base}/${contacto.nro_contacto}`), 'Contacto eliminado'));

  const styles = {
    modalBg: 'var(--bg-card)',
    textColor: 'var(--text-main)',
    mutedColor: 'var(--text-muted)',
    borderCol: 'var(--border-color)',
    cardBg: 'var(--bg-main)',
    inputBg: 'var(--bg-input)',
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.modalBg, color: styles.textColor, borderRadius: '12px' }}>
          <div className="modal-header border-bottom p-3 px-4" style={{ borderColor: styles.borderCol }}>
            <div className="d-flex align-items-center gap-2">
              <Building size={20} color="var(--amber-action)" />
              <h5 className="modal-title fw-bold m-0">Detalle del Proveedor</h5>
            </div>
            <button type="button" className="btn-close shadow-none btn-close-themed" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 d-flex flex-column gap-4">
            <div className="d-flex justify-content-between align-items-center p-3 rounded-3" style={{ backgroundColor: styles.cardBg, border: `1px solid ${styles.borderCol}` }}>
              <div>
                <span className="small fw-semibold text-uppercase" style={{ color: 'var(--amber-action)', fontSize: '0.75rem' }}>{proveedor.id_proveedor}</span>
                <h4 className="fw-bold m-0 mt-1" style={{ color: styles.textColor }}>{proveedor.razon_social}</h4>
                {proveedor.nombre_comercial && (
                  <div className="small" style={{ color: styles.mutedColor }}>{proveedor.nombre_comercial}</div>
                )}
              </div>
              <span
                className="badge px-3 py-2 fw-medium"
                style={{
                  backgroundColor: proveedor.estado ? 'var(--success-soft-bg)' : 'var(--danger-soft-bg)',
                  color: proveedor.estado ? 'var(--brand-success)' : 'var(--brand-danger)',
                  borderRadius: '12px'
                }}
              >
                {proveedor.estado ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                  <Person size={18} style={{ color: styles.mutedColor }} />
                  <div>
                    <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>NIT</span>
                    <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.id_proveedor}</span>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                  <Telephone size={18} style={{ color: styles.mutedColor }} />
                  <div>
                    <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Teléfono Principal</span>
                    <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.telefono_principal || 'No especificado'}</span>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                  <Envelope size={18} style={{ color: styles.mutedColor }} />
                  <div>
                    <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Correo Principal</span>
                    <span className="fw-semibold" style={{ color: styles.textColor }}>{proveedor.correo_principal || 'No especificado'}</span>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                  <Building size={18} style={{ color: styles.mutedColor }} />
                  <div>
                    <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Ciudad / Dirección</span>
                    <span className="fw-semibold" style={{ color: styles.textColor }}>{[proveedor.ciudad, proveedor.direccion].filter(Boolean).join(' — ') || 'No especificado'}</span>
                  </div>
                </div>
              </div>
              {proveedor.fecha_registro && (
                <div className="col-6">
                  <div className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ backgroundColor: styles.cardBg }}>
                    <Calendar3 size={18} style={{ color: styles.mutedColor }} />
                    <div>
                      <span className="d-block small text-muted" style={{ fontSize: '0.75rem' }}>Registrado el</span>
                      <span className="fw-semibold" style={{ color: styles.textColor }}>{new Date(proveedor.fecha_registro).toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold" style={{ color: styles.mutedColor }}>Contactos</span>
                <button type="button" className="btn btn-sm d-flex align-items-center gap-1" style={{ color: 'var(--amber-action)' }} onClick={() => setFormVisible((v) => !v)}>
                  <PlusLg size={14} /> Agregar contacto
                </button>
              </div>

              {formVisible && (
                <form onSubmit={handleAgregarContacto} className="p-3 rounded-3 mb-2 row g-2" style={{ backgroundColor: styles.cardBg, border: `1px solid ${styles.borderCol}` }}>
                  <div className="col-6">
                    <input type="text" placeholder="Nombres" required className="form-control form-control-sm" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={nuevoContacto.nombres} onChange={(e) => setNuevoContacto((p) => ({ ...p, nombres: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <input type="text" placeholder="Apellidos" required className="form-control form-control-sm" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={nuevoContacto.apellidos} onChange={(e) => setNuevoContacto((p) => ({ ...p, apellidos: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <input type="text" placeholder="Cargo (opcional)" className="form-control form-control-sm" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={nuevoContacto.cargo} onChange={(e) => setNuevoContacto((p) => ({ ...p, cargo: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <input type="text" placeholder="Teléfono" required className="form-control form-control-sm" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={nuevoContacto.telefono} onChange={(e) => setNuevoContacto((p) => ({ ...p, telefono: e.target.value }))} />
                  </div>
                  <div className="col-8">
                    <input type="email" placeholder="Correo (opcional)" className="form-control form-control-sm" style={{ backgroundColor: styles.inputBg, borderColor: styles.borderCol, color: styles.textColor }} value={nuevoContacto.correo} onChange={(e) => setNuevoContacto((p) => ({ ...p, correo: e.target.value }))} />
                  </div>
                  <div className="col-4 d-flex align-items-center">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="nuevoPrincipal" checked={nuevoContacto.es_principal} onChange={(e) => setNuevoContacto((p) => ({ ...p, es_principal: e.target.checked }))} />
                      <label className="form-check-label small" htmlFor="nuevoPrincipal">Principal</label>
                    </div>
                  </div>
                  <div className="col-12 d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFormVisible(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-sm text-white" style={{ backgroundColor: 'var(--amber-action)', border: 'none' }}>Guardar contacto</button>
                  </div>
                </form>
              )}

              {contactosProveedor.length === 0 ? (
                <div className="small text-center py-3" style={{ color: styles.mutedColor }}>Este proveedor no tiene contactos registrados.</div>
              ) : (
                contactosProveedor.map((c) => (
                  <div key={c.nro_contacto} className="d-flex justify-content-between align-items-center p-2 rounded-2 mb-1" style={{ backgroundColor: styles.cardBg }}>
                    <div>
                      <div className="fw-semibold small d-flex align-items-center gap-2">
                        {c.nombres} {c.apellidos}
                        {c.es_principal && <span className="badge" style={{ backgroundColor: 'var(--amber-soft-bg)', color: 'var(--amber-action)', fontSize: '0.65rem' }}>Principal</span>}
                      </div>
                      <div className="small" style={{ color: styles.mutedColor }}>{c.cargo || 'Sin cargo'} • {c.telefono}{c.correo ? ` • ${c.correo}` : ''}</div>
                    </div>
                    <div className="d-flex gap-2">
                      {!c.es_principal && (
                        <button type="button" className="btn btn-sm p-1 border-0" title="Marcar como principal" style={{ color: 'var(--amber-action)' }} onClick={() => handleMarcarPrincipal(c)}>
                          <Star size={16} />
                        </button>
                      )}
                      {c.es_principal && <StarFill size={16} color="var(--amber-action)" className="align-self-center" />}
                      <button type="button" className="btn btn-sm p-1 border-0 text-danger" title="Quitar contacto" onClick={() => handleQuitarContacto(c)}>
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="modal-footer border-top p-3" style={{ borderColor: styles.borderCol }}>
            <button type="button" className="btn fw-bold px-4 text-white border-0" style={{ backgroundColor: 'var(--amber-action)' }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
