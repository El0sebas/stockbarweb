import React from 'react';
import {
  House,
  ShieldCheck,
  People,
  Tag,
  BoxSeam,
  Truck,
  Bag,
  Person,
  Cart,
  ExclamationTriangle,
  DoorOpen
} from 'react-bootstrap-icons';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: House },
    { id: 'roles', label: 'Roles', icon: ShieldCheck },
    { id: 'usuarios', label: 'Usuarios', icon: People },
    { id: 'categorias', label: 'Categorías', icon: Tag },
    { id: 'productos', label: 'Productos', icon: BoxSeam },
    { id: 'proveedores', label: 'Proveedores', icon: Truck },
    { id: 'compras', label: 'Compras', icon: Bag },
    { id: 'bajas', label: 'Bajas', icon: ExclamationTriangle },
    { id: 'jornada', label: 'Jornada', icon: DoorOpen },
    { id: 'clientes', label: 'Clientes', icon: Person },
    { id: 'ventas', label: 'Ventas', icon: Cart },
  ];

  return (
    <aside
      className="d-flex flex-column p-3 border-end flex-shrink-0"
      style={{
        width: '220px',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <div>
        {/* Isotipo y Logotipo Oficial StockBar */}
        <div className="d-flex align-items-center gap-2 mb-4 px-2 pt-1">
          <div
            className="d-flex align-items-center justify-content-center rounded-2"
            style={{ width: '28px', height: '28px', backgroundColor: 'var(--amber-action)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="6" />
            </svg>
          </div>
          <span className="fs-5 fw-bold" style={{ color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            StockBar
          </span>
        </div>

        {/* Menú de Navegación */}
        <nav className="nav nav-pills flex-column gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab?.toLowerCase() === item.id;
            const itemColor = isActive ? 'var(--sidebar-active-text)' : 'var(--text-muted)';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="nav-link d-flex align-items-center gap-3 px-3 py-2 text-start border-0 w-100"
                style={{
                  backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: itemColor,
                  fontWeight: isActive ? '600' : '500',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={itemColor} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};