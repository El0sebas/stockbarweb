import { showAlert, showToast } from './alerts';

// Ejecuta una llamada a la API y muestra el resultado: toast de éxito o el
// mensaje de negocio que devolvió el backend (validación, trigger, permiso).
// Devuelve la respuesta, o null si falló.
export const ejecutar = async (llamada, exito) => {
  try {
    const respuesta = await llamada();
    if (exito) showToast('success', typeof exito === 'function' ? exito(respuesta) : exito);
    return respuesta ?? true;
  } catch (e) {
    if (e.status !== 401) showAlert.error('No se pudo completar la acción', e.message);
    return null;
  }
};
