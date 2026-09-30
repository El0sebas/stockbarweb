import React from 'react';

// Selector de filtro por estado, reutilizado en las tablas de Roles, Usuarios,
// Productos, Proveedores, Compras, Ventas y Jornada. El estilo de fondo/borde
// ya lo resuelve la regla global de .form-select en index.css.
export const EstadoFilter = ({ value, onChange, options, label = 'Todos los estados' }) => (
  <select
    className="form-select"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ width: '190px' }}
  >
    <option value="">{label}</option>
    {options.map((op) => (
      <option key={op} value={op}>{op}</option>
    ))}
  </select>
);
