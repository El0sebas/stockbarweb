import React, { useState } from 'react';

// Valida en vivo los campos con `name` de un <form>: al salir de un campo
// (blur) y al corregirlo (change) muestra el error al instante, sin esperar
// a "Guardar". Los errores se pintan con <Field error={errors.nombre}>.
export const useFormValidation = () => {
  const [errors, setErrors] = useState({});

  const check = (el) => {
    if (!el.name || !el.validity) return true;
    const msg = el.checkValidity()
      ? ''
      : el.validity.valueMissing ? 'Campo obligatorio'
      : el.validity.typeMismatch ? 'Formato no válido'
      : el.validationMessage;
    setErrors((prev) => ((prev[el.name] || '') === msg ? prev : { ...prev, [el.name]: msg }));
    return !msg;
  };

  const formProps = (onSubmit) => ({
    noValidate: true,
    onBlur: (e) => check(e.target),
    onChange: (e) => errors[e.target.name] && check(e.target),
    onSubmit: (e) => {
      e.preventDefault();
      const invalidos = [...e.currentTarget.elements].filter((el) => el.name && !check(el));
      if (invalidos.length) return invalidos[0].focus();
      onSubmit(e);
    }
  });

  return { errors, formProps, resetErrors: () => setErrors({}) };
};

export const Field = ({ label, required, error, className = '', children }) => (
  <div className={`${className} ${error ? 'field-error' : ''}`}>
    <label className="form-label small fw-semibold">
      {label}{' '}
      {required
        ? <span style={{ color: 'var(--brand-danger)' }}>*</span>
        : <span className="fw-normal" style={{ color: 'var(--text-muted)' }}>(opcional)</span>}
    </label>
    {children}
    {error && <div className="small mt-1" style={{ color: 'var(--brand-danger)' }}>{error}</div>}
  </div>
);
