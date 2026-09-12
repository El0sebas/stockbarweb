import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, PersonCircle, BoxArrowRight } from 'react-bootstrap-icons';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const MainLayout = ({ children, activeTab, setActiveTab, onLogout }) => {
  const { isDarkMode, toggleTheme } = useTheme();

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
          <h5 className="m-0 fw-bold text-capitalize" style={{ color: 'var(--text-main)' }}>
            {activeTab}
          </h5>

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
                    Administrador
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
