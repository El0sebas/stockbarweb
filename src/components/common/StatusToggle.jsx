import React from 'react';

// Switch deslizante reutilizado por Usuarios, Productos, Proveedores, Clientes,
// Roles y Métodos de Pago para representar cambios de estado (subproceso
// "cambiar estado" de la arquitectura). Compacto (solo la inicial en la
// pastilla) con el nombre completo del estado debajo, en vez de una pastilla
// ancha con las dos palabras completas siempre visibles.
export const StatusToggle = ({
  active,
  onToggle,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
  disabled = false,
  activeColor = 'var(--brand-success)',
  width = 56,
}) => {
  return (
    <div className="d-inline-flex flex-column align-items-center gap-1">
      <div
        className="position-relative d-inline-flex align-items-center p-1 rounded-pill"
        onClick={disabled ? undefined : onToggle}
        title={disabled ? undefined : 'Cambiar estado'}
        style={{
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          width,
          height: 26,
          userSelect: 'none',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <div
          className="position-absolute rounded-pill shadow-sm"
          style={{
            top: 2,
            bottom: 2,
            left: active ? 2 : 'calc(50% - 1px)',
            width: 'calc(50% - 2px)',
            backgroundColor: active ? activeColor : 'var(--text-muted)',
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease',
          }}
        />
        <div
          className="w-50 text-center position-relative z-1 fw-bold"
          style={{ color: active ? '#FFFFFF' : 'var(--text-muted)', fontSize: '0.65rem', transition: 'color 0.2s ease' }}
        >
          {activeLabel[0]}
        </div>
        <div
          className="w-50 text-center position-relative z-1 fw-bold"
          style={{ color: !active ? '#FFFFFF' : 'var(--text-muted)', fontSize: '0.65rem', transition: 'color 0.2s ease' }}
        >
          {inactiveLabel[0]}
        </div>
      </div>
      <span
        className="fw-semibold"
        style={{ color: active ? activeColor : 'var(--text-muted)', fontSize: '0.65rem' }}
      >
        {active ? activeLabel : inactiveLabel}
      </span>
    </div>
  );
};
