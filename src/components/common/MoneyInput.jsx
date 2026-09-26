import React from 'react';

// Input de dinero (COP: sin decimales) que muestra separador de miles
// (2.500, 1.200.000...) mientras se escribe, pero entrega/recibe el número
// crudo — igual que los $ .toLocaleString() ya usados en tablas/recibos.
export const MoneyInput = ({ value, onChange, className = 'form-control shadow-none', style, placeholder, required, name, disabled }) => {
  const formatted = value === '' || value === null || value === undefined || Number.isNaN(Number(value))
    ? ''
    : Number(value).toLocaleString('es-CO');

  const handleChange = (e) => {
    const soloDigitos = e.target.value.replace(/\D/g, '');
    onChange(soloDigitos === '' ? '' : Number(soloDigitos));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      required={required}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      style={style}
      value={formatted}
      onChange={handleChange}
    />
  );
};
