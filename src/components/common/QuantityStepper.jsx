import React from 'react';
import { Dash, Plus } from 'react-bootstrap-icons';

// Selector de cantidad reutilizado en Compras y Ventas: escribir el número
// directamente o ajustarlo con -/+, en vez de forzar a agregar de a una
// unidad por clic.
export const QuantityStepper = ({ value, onChange, min = 1, max, disabled = false }) => {
  const clamp = (v) => {
    let next = Number.isFinite(v) ? v : min;
    if (max !== undefined) next = Math.min(next, max);
    return Math.max(min, next);
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
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
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
