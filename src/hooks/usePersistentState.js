import { useState, useEffect } from 'react';

// Mismo patrón de persistencia en localStorage usado en Login/Auth (mock de datos
// mientras no exista el backend). Evita que cada módulo pierda su información
// al navegar entre pestañas del menú lateral (cada vista se desmonta al cambiar de tab).
const SYNC_EVENT = 'stockbar-persistent-state';

export const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Un componente que nunca se desmonta (ej. MainLayout, para el indicador
  // de jornada del header) solo hidrata su estado UNA vez al montar. Sin
  // este listener, cualquier escritura hecha por otra pantalla montada
  // después (Jornada, Ventas) queda invisible ahí hasta recargar la página.
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail?.key === key) {
        setState(e.detail.value);
      }
    };
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, [key]);

  const setPersistentState = (value) => {
    setState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // localStorage no disponible (modo privado, cuota excedida, etc.)
      }
      // Notificar a otras instancias fuera de este render/commit: hacerlo
      // síncrono aquí dispara un setState de OTRO componente mientras este
      // todavía se está renderizando (React lo rechaza con un warning).
      queueMicrotask(() => {
        try {
          window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key, value: next } }));
        } catch {
          // no-op
        }
      });
      return next;
    });
  };

  return [state, setPersistentState];
};
