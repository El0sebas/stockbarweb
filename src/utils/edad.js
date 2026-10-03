// Espejo de TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) en
// sp_validar_detalle_venta: edad por fecha exacta, no por año calendario.
export const getEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumpleEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumpleEsteAno) edad -= 1;
  return edad;
};

const EDAD_MINIMA = 18;

// Espejo del rechazo de sp_validar_detalle_venta cuando la categoría exige
// verificación de edad: mismo texto que lanzaría la BD, para no inventar un
// mensaje genérico de "error del servidor".
//
// Una venta de mostrador (sin cliente específico) o al cliente genérico
// "Consumidor Final" (id_cliente 'CLI-00000') no exige documento de
// identidad: se confía en la verificación visual del cajero, igual que en
// un mostrador real. El bloqueo por edad solo aplica cuando se elige un
// cliente registrado específico (con nombre y documento propios).
export const validarEdadCliente = (cliente) => {
  if (!cliente || cliente.id_cliente === 'CLI-00000') {
    return null;
  }
  if (!cliente.fecha_nacimiento) {
    return 'El cliente no tiene fecha de nacimiento válida para comprar productos con verificación de edad.';
  }
  if (getEdad(cliente.fecha_nacimiento) < EDAD_MINIMA) {
    return 'El cliente no cumple la edad mínima de 18 años.';
  }
  return null;
};
