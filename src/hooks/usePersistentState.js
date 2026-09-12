import { useState } from 'react';

// Mismo patrón de persistencia en localStorage usado en Login/Auth (mock de datos
// mientras no exista el backend). Evita que cada módulo pierda su información
// al navegar entre pestañas del menú lateral (cada vista se desmonta al cambiar de tab).
export const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setPersistentState = (value) => {
    setState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // localStorage no disponible (modo privado, cuota excedida, etc.)
      }
      return next;
    });
  };

  return [state, setPersistentState];
};
