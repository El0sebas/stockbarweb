import React, { useState } from 'react';
import { Dash, Plus } from 'react-bootstrap-icons';

// Selector de cantidad reutilizado en Compras y Ventas: escribir el número
// directamente o ajustarlo con -/+, en vez de forzar a agregar de a una
// unidad por clic.
// Lo que se escribe a mano se confirma al salir del campo o con Enter: en el
// carrito cada cambio es una llamada a la API que bloquea el campo, y
// confirmar por tecla impedía escribir "12".
export const QuantityStepper = ({ value, onChange, min = 1, max, disabled = false }) => {
  const [borrador, setBorrador] = useState(null);
  const clamp = (v) => {
    let next = Number.isFinite(v) ? v : min;
    if (max !== undefined) next = Math.min(next, max);
    return Math.max(min, next);
  };
  const confirmar = () => {
    if (borrador === null) return;
    const next = clamp(Number(borrador));
    setBorrador(null);
    if (next !== value) onChange(next);
  };

  const btnStyle = {
    width: '28px',
    height: '28px',
    padding: 0,
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-main)',
  };

  return (
    <div className="d-flex align-items-center gap-1">
      <button
        type="button"
        className="btn d-flex align-items-center justify-content-center"
        style={btnStyle}
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
      >
        <Dash size={12} />
      </button>
      <input
        type="number"
        className="form-control form-control-sm text-center shadow-none"
        style={{ width: '52px', backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        value={borrador ?? value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), confirmar())}
      />
      <button
        type="button"
        className="btn d-flex align-items-center justify-content-center"
        style={btnStyle}
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        <Plus size={12} />
      </button>
    </div>
  );
};
