import { useEffect } from 'react';
import { useApi } from './useApi';

const EVENTO = 'stockbar-jornada-cambio';

// Jornada ABIERTA actual (o null). El indicador del encabezado, Jornada y
// Ventas se mantienen sincronizados: quien abre/cierra avisa con
// notificarCambioJornada() y todos recargan desde la API.
export const useJornadaActual = () => {
  const { data, cargando, recargar } = useApi('/jornadas/actual');
  useEffect(() => {
    window.addEventListener(EVENTO, recargar);
    return () => window.removeEventListener(EVENTO, recargar);
  }, [recargar]);
  return { jornada: data, cargando, recargar };
};

export const notificarCambioJornada = () => window.dispatchEvent(new Event(EVENTO));
