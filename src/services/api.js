// Cliente de la API REST de StockBar. Es la ÚNICA fuente de datos del
// frontend: nada de negocio se guarda en el navegador, solo el token de sesión.
// VITE_API_URL apunta al backend (en desarrollo, Vite redirige /api al puerto 3000).
const BASE = import.meta.env.VITE_API_URL || '/api';
const CLAVE_TOKEN = 'stockbar_token';
export const EVENTO_SESION_EXPIRADA = 'stockbar-sesion-expirada';

// "Recordar usuario": localStorage sobrevive al cierre del navegador;
// si no, sessionStorage (se borra al cerrarlo).
export const sesion = {
  token: () => localStorage.getItem(CLAVE_TOKEN) || sessionStorage.getItem(CLAVE_TOKEN),
  guardar: (token, recordar) => {
    sesion.limpiar();
    (recordar ? localStorage : sessionStorage).setItem(CLAVE_TOKEN, token);
  },
  limpiar: () => {
    localStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_TOKEN);
  },
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function solicitud(metodo, ruta, body) {
  const token = sesion.token();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const esArchivo = body instanceof FormData;
  if (body !== undefined && !esArchivo) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + ruta, {
      method: metodo,
      headers,
      body: body === undefined ? undefined : esArchivo ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo establecer conexión con el servidor');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && token) window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA, { detail: data?.error }));
  if (!res.ok) {
    // Errores de validación: se muestra el primer campo que falló.
    const detalle = data?.detalles?.[0];
    throw new ApiError(res.status, detalle ? `${detalle.mensaje} (${detalle.campo})` : data?.error || 'Error inesperado del servidor');
  }
  return data;
}

export const api = {
  get: (ruta) => solicitud('GET', ruta),
  post: (ruta, body) => solicitud('POST', ruta, body ?? {}),
  put: (ruta, body) => solicitud('PUT', ruta, body),
  patch: (ruta, body) => solicitud('PATCH', ruta, body),
  del: (ruta) => solicitud('DELETE', ruta),
  // Archivos protegidos (factura de compra): se descargan con el token.
  async descargar(ruta, nombre) {
    const res = await fetch(BASE + ruta, { headers: { Authorization: `Bearer ${sesion.token()}` } });
    if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => null))?.error || 'No se pudo descargar el archivo');
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // revocar en el acto cancela la descarga en algunos navegadores
  },
};

// Construye ?a=1&b=2 omitiendo los filtros vacíos.
export const consulta = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));
  return q.toString() ? `?${q}` : '';
};
