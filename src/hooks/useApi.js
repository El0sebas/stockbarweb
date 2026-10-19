import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { showToast } from '../utils/alerts';

// Carga una ruta GET de la API y la vuelve a pedir cuando cambia la ruta
// (p. ej. al cambiar un filtro). ruta = null no consulta nada.
export const useApi = (ruta, inicial = null) => {
  const [data, setData] = useState(inicial);
  const [cargando, setCargando] = useState(!!ruta);

  const recargar = useCallback(async () => {
    if (!ruta) return;
    setCargando(true);
    try {
      setData(await api.get(ruta));
    } catch (e) {
      if (e.status !== 401) showToast('error', e.message);
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { data, cargando, recargar };
};
