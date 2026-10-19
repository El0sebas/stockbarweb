import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeSlash, Sun, Moon, ShieldLock, CheckCircle } from 'react-bootstrap-icons';
import { showToast } from '../../utils/alerts';
import { api } from '../../services/api';

// Componente SVG para el isotipo oficial de barras de StockBar
const StockBarLogoIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="10" width="4" height="11" rx="1.5" fill="var(--amber-action)" />
    <rect x="10" y="6" width="4" height="15" rx="1.5" fill={'var(--text-main)'} />
    <rect x="17" y="2" width="4" height="19" rx="1.5" fill="var(--brand-blue)" />
  </svg>
);

// Acceso (CU_10_01..02). Credenciales, baja automática de vencidos y token
// de recuperación los resuelve el backend; aquí solo se capturan los datos.
export const Login = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState('request');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await login(email.trim(), password, recordar);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Cada envío genera un token nuevo e invalida el anterior: sin el bloqueo,
  // un doble clic deja inservible el primer correo.
  const handleRecoveryRequest = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const { mensaje } = await api.post('/auth/recuperar', { correo: recoverEmail.trim() });
      setRecoveryMode('reset');
      setRecoveryMessage(`${mensaje} Ingrésalo junto con tu nueva contraseña.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) {
      showToast('error', 'Debes ingresar el token y la nueva contraseña.');
      return;
    }
    try {
      const { mensaje } = await api.post('/auth/restablecer', { token: resetToken.trim(), contrasena: newPassword });
      setRecoveryMessage(mensaje);
      setRecoverEmail('');
      setResetToken('');
      setNewPassword('');
      setRecoveryMode('request');
      showToast('success', 'Contraseña actualizada');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const styles = {
    bgLeft: 'var(--bg-input)',
    bgRight: 'var(--bg-main)',
    cardBg: 'var(--bg-card)',
    text: 'var(--text-main)',
    titleText: 'var(--text-main)',
    brandTitle: 'var(--text-main)',
    brandSubtitle: 'var(--text-muted)',
    border: 'var(--border-color)',
    muted: 'var(--text-muted)',
    inputBg: 'var(--bg-main)',
  };

  return (
    <div className="d-flex w-100 flex-column flex-md-row position-relative" style={{ minHeight: '100vh', backgroundColor: styles.bgRight }}>
      
      {/* Botón Flotante para Cambiar Modo */}
      <div className="position-absolute top-0 end-0 p-3" style={{ zIndex: 10 }}>
        <button 
          onClick={toggleTheme} 
          className="btn btn-sm d-flex align-items-center gap-2 px-3 py-2 shadow-sm"
          style={{ 
            backgroundColor: styles.cardBg, 
            color: styles.text, 
            border: `1px solid ${styles.border}`,
            borderRadius: '20px',
            cursor: 'pointer'
          }}
        >
          {isDarkMode ? <Sun color="var(--amber-action)" size={18} /> : <Moon color="var(--text-main)" size={18} />}
          <span style={{ fontSize: '13px', fontWeight: '500' }}>{isDarkMode ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>

      {/* Lado Izquierdo: Branding, Logo y Copy Oficial */}
      <div 
        className="d-flex flex-column justify-content-between p-4 p-md-5 col-12 col-md-6 col-lg-6"
        style={{ 
          backgroundColor: styles.bgLeft, 
          borderRight: `1px solid ${styles.border}`,
          transition: 'all 0.3s ease' 
        }}
      >
        {/* Header con Isotipo + Nombre */}
        <div className="d-flex align-items-center gap-2">
          <StockBarLogoIcon size={24} />
          <span className="fw-bold fs-5" style={{ color: styles.brandTitle, letterSpacing: '-0.3px' }}>
            StockBar
          </span>
        </div>

        {/* Mensaje Principal e Icono Central */}
        <div className="my-auto py-5" style={{ maxWidth: '460px' }}>
          <div className="mb-4">
            <StockBarLogoIcon size={46} />
          </div>
          <h2 className="fw-bold mb-3 lh-sm" style={{ color: styles.brandTitle, fontSize: '1.85rem' }}>
            Gestión inteligente de inventario y punto de venta en tiempo real.
          </h2>
          <p className="fs-6 m-0" style={{ color: styles.brandSubtitle, lineHeight: '1.6' }}>
            Optimizado para bares, restaurantes y terminales de servicio rápido. Realiza aperturas y cierres de caja de manera segura.
          </p>
        </div>

        {/* Indicador inferior de sincronización */}
        <div className="d-flex align-items-center gap-2">
          <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--brand-success)', borderRadius: '50%', display: 'inline-block' }}></span>
        </div>
      </div>

      {/* Lado Derecho: Formulario de Iniciar Turno */}
      <div className="d-flex justify-content-center align-items-center p-4 col-12 col-md-6 col-lg-6">
        <div 
          className="card p-4 p-sm-5 shadow-sm w-100" 
          style={{ 
            maxWidth: '420px', 
            backgroundColor: styles.cardBg, 
            borderColor: styles.border,
            color: styles.text,
            borderRadius: '16px',
            transition: 'all 0.3s ease'
          }}
        >
          <h3 className="fw-bold mb-1" style={{ color: styles.titleText, fontSize: '1.5rem' }}>
            ¡Bienvenido de vuelta!
          </h3>
          <p className="small mb-4" style={{ color: styles.muted }}>
            Inicia sesión para abrir tu turno en caja
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Correo electrónico</label>
              <input 
                type="email" 
                className="form-control"
                placeholder="tu-correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ 
                  backgroundColor: styles.inputBg,
                  color: styles.text,
                  borderColor: styles.border,
                  padding: '10px 12px',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Contraseña</label>
              <div className="input-group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control border-end-0"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ 
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    borderColor: styles.border,
                    padding: '10px 12px',
                    borderTopLeftRadius: '8px',
                    borderBottomLeftRadius: '8px'
                  }}
                />
                <button 
                  type="button" 
                  className="btn border-start-0"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    backgroundColor: styles.inputBg,
                    borderColor: styles.border, 
                    color: styles.muted,
                    borderTopRightRadius: '8px',
                    borderBottomRightRadius: '8px'
                  }}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 small">
              <div className="form-check d-flex align-items-center gap-2">
                <input className="form-check-input mt-0" type="checkbox" id="rememberMe" style={{ accentColor: 'var(--amber-action)' }} checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                <label className="form-check-label" htmlFor="rememberMe" style={{ color: styles.muted, fontSize: '0.85rem' }}>
                  Recordar usuario
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(true)}
                className="btn btn-link p-0 fw-semibold"
                style={{ color: 'var(--amber-action)', textDecoration: 'none', fontSize: '0.85rem' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={enviando}
              className="btn w-100 fw-bold py-2 text-white shadow-sm"
              style={{ backgroundColor: 'var(--amber-action)', border: 'none', borderRadius: '8px', fontSize: '0.95rem' }}
            >
              Iniciar Turno
            </button>
          </form>
        </div>
      </div>

      {showRecoveryModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'var(--overlay-scrim)', zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: styles.cardBg, color: styles.text, borderRadius: '18px' }}>
              <div className="modal-header border-bottom px-4 py-3" style={{ borderColor: styles.border }}>
                <div className="d-flex align-items-center gap-2">
                  <ShieldLock color="var(--amber-action)" size={20} />
                  <h5 className="modal-title fw-bold m-0">Recuperación de contraseña</h5>
                </div>
                <button type="button" className="btn-close shadow-none btn-close-themed" onClick={() => setShowRecoveryModal(false)} />
              </div>

              <div className="modal-body p-4">
                {recoveryMode === 'request' ? (
                  <form onSubmit={handleRecoveryRequest}>
                    <label className="form-label small fw-semibold">Correo electrónico</label>
                    <input
                      type="email"
                      className="form-control mb-3"
                      value={recoverEmail}
                      onChange={(e) => setRecoverEmail(e.target.value)}
                      required
                      placeholder="usuario@stockbar.com"
                      style={{ backgroundColor: styles.inputBg, borderColor: styles.border, color: styles.text }}
                    />
                    <button type="submit" className="btn w-100 fw-bold text-white" style={{ backgroundColor: 'var(--amber-action)', border: 'none', borderRadius: '8px' }}>
                      Generar token
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordReset}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Token de recuperación</label>
                      <input
                        type="text"
                        className="form-control"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.border, color: styles.text }}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nueva contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ backgroundColor: styles.inputBg, borderColor: styles.border, color: styles.text }}
                      />
                    </div>
                    <button type="submit" className="btn w-100 fw-bold text-white" style={{ backgroundColor: 'var(--amber-action)', border: 'none', borderRadius: '8px' }}>
                      Guardar nueva contraseña
                    </button>
                  </form>
                )}

                {recoveryMessage && (
                  <div className="alert mt-3 mb-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--brand-success)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <CheckCircle size={16} />
                    <span className="small fw-semibold">{recoveryMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};