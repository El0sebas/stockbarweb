import React from 'react';

// Switch deslizante reutilizado por Usuarios, Productos, Métodos de Pago y Ventas
// para representar cambios de estado (subproceso "cambiar estado" de la arquitectura).
export const StatusToggle = ({
  active,
  onToggle,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
  disabled = false,
  activeColor = 'var(--brand-success)',
  width = 140,
}) => {
  return (
    <div
      className="position-relative d-inline-flex align-items-center p-1 rounded-pill"
      onClick={disabled ? undefined : onToggle}
      title={disabled ? undefined : 'Cambiar estado'}
      style={{
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        width,
        height: 36,
        userSelect: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div
        className="position-absolute rounded-pill shadow-sm"
        style={{
          top: 3,
          bottom: 3,
          left: active ? 3 : 'calc(50% - 1px)',
          width: 'calc(50% - 2px)',
          backgroundColor: active ? activeColor : 'var(--text-muted)',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease',
        }}
      />
      <div
        className="w-50 text-center position-relative z-1 fw-bold"
        style={{ color: active ? '#FFFFFF' : 'var(--text-muted)', fontSize: '0.75rem', transition: 'color 0.2s ease' }}
      >
        {activeLabel}
      </div>
      <div
        className="w-50 text-center position-relative z-1 fw-bold"
        style={{ color: !active ? '#FFFFFF' : 'var(--text-muted)', fontSize: '0.75rem', transition: 'color 0.2s ease' }}
      >
        {inactiveLabel}
      </div>
    </div>
  );
};
