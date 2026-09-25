import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, PersonCircle, BoxArrowRight, DoorOpen, DoorClosed } from 'react-bootstrap-icons';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultJornadas } from '../../data/defaultJornadas';
import { getJornadaAbierta } from '../../utils/jornada';

export const MainLayout = ({ children, activeTab, setActiveTab, onLogout }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  // Solo lectura aquí: el indicador se mantiene igual sin importar la
  // pantalla activa, el propio módulo Jornada es quien lo cambia.
  const [jornadas] = usePersistentState('stockbar_jornadas', defaultJornadas);
  const jornadaAbierta = getJornadaAbierta(jornadas);

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Menú Lateral */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Área de Contenido Principal */}
      <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <header
          className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="d-flex align-items-center gap-3">
            <h5 className="m-0 fw-bold text-capitalize" style={{ color: 'var(--text-main)' }}>
              {activeTab}
            </h5>
            <button
              className="btn btn-sm d-flex align-items-center gap-1 px-2 py-1 border-0"
              onClick={() => setActiveTab('jornada')}
              title={jornadaAbierta ? `Abierta por ${jornadaAbierta.usuario_apertura}` : 'Sin jornada abierta'}
              style={{
                backgroundColor: jornadaAbierta ? 'var(--success-soft-bg)' : 'var(--danger-soft-bg)',
                color: jornadaAbierta ? 'var(--brand-success)' : 'var(--brand-danger)',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              {jornadaAbierta ? <DoorOpen size={13} /> : <DoorClosed size={13} />}
              {jornadaAbierta ? 'Jornada abierta' : 'Sin jornada'}
            </button>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Botón Cambiar Tema */}
            <button
              className="btn btn-link p-0 text-decoration-none"
              onClick={toggleTheme}
              title="Cambiar tema"
            >
              {isDarkMode ? <Sun size={20} color="var(--amber-action)" /> : <Moon size={20} color="var(--text-muted)" />}
            </button>

            {/* Perfil con menú desplegable */}
            <div className="dropdown">
              <button
                className="btn p-0 border-0 bg-transparent dropdown-toggle icon-dropdown-toggle d-flex align-items-center"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="Cuenta"
              >
                <PersonCircle size={24} style={{ color: 'var(--text-muted)' }} />
              </button>
              <ul
                className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2 py-2"
                style={{ backgroundColor: 'var(--bg-card)', minWidth: '180px' }}
              >
                <li>
                  <span className="dropdown-item-text small fw-semibold" style={{ color: 'var(--text-main)' }}>
                    {currentUser?.nombre || 'Administrador'}
                  </span>
                </li>
                <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border-color)' }} /></li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 text-danger"
                    onClick={onLogout}
                  >
                    <BoxArrowRight size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* Contenido de la vista activa */}
        <main className="p-4 flex-grow-1">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};
