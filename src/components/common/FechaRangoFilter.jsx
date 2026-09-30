import React from 'react';

// Filtro por rango de fechas, reutilizado en Ventas, Compras y Jornada
// (registros históricos, donde filtrar por fecha es más útil que un simple
// estado). El estilo de fondo/borde ya lo resuelve la regla global de
// .form-control en index.css.
export const FechaRangoFilter = ({ desde, hasta, onDesdeChange, onHastaChange }) => (
  <div className="d-flex align-items-center gap-2">
    <input
      type="date"
      className="form-control"
      style={{ width: '155px' }}
      value={desde}
      onChange={(e) => onDesdeChange(e.target.value)}
      title="Desde"
    />
    <span className="small" style={{ color: 'var(--text-muted)' }}>a</span>
    <input
      type="date"
      className="form-control"
      style={{ width: '155px' }}
      value={hasta}
      onChange={(e) => onHastaChange(e.target.value)}
      title="Hasta"
    />
  </div>
);
