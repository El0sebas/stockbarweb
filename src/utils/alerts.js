import Swal from 'sweetalert2';

// SweetAlert2 renderiza su popup en <body>, por lo que puede leer directamente
// las variables CSS del tema activo (definidas en index.css) sin duplicar colores aquí.
const getColors = () => ({
  background: 'var(--bg-card)',
  color: 'var(--text-main)',
  confirmButtonColor: 'var(--amber-action)',
  cancelButtonColor: 'var(--text-muted)',
});

// Toast / Notificación rápida flotante
export const showToast = (icon, title) => {
  const { background, color } = getColors();
  
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon, // 'success' | 'error' | 'warning' | 'info'
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background,
    color,
  });
};

// Modales de Confirmación y Alerta
export const showAlert = {
  // Modal de éxito
  success: (title = '¡Operación Exitosa!', text = 'El registro se guardó correctamente.') => {
    const { background, color, confirmButtonColor } = getColors();
    return Swal.fire({
      icon: 'success',
      title,
      text,
      background,
      color,
      confirmButtonColor,
      confirmButtonText: 'Aceptar',
    });
  },

  // Modal de error
  error: (title = 'Error en la transacción', text = 'Stock insuficiente o datos inválidos.') => {
    const { background, color } = getColors();
    return Swal.fire({
      icon: 'error',
      title,
      text,
      background,
      color,
      confirmButtonColor: 'var(--brand-danger)',
      confirmButtonText: 'Entendido',
    });
  },

  // Modal de advertencia / confirmación (p. ej. Anular o Eliminar)
  confirm: async (title = '¿Desea realizar esta acción?', text = 'Esta operación modificará los registros del sistema.') => {
    const { background, color, confirmButtonColor, cancelButtonColor } = getColors();
    
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonColor,
      cancelButtonColor,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      background,
      color,
      reverseButtons: true,
    });

    return result.isConfirmed;
  },

  // Modal Informativo
  info: (title = 'Información del Sistema', text = 'El cierre de caja del turno ha sido archivado con éxito.') => {
    const { background, color, confirmButtonColor } = getColors();
    return Swal.fire({
      icon: 'info',
      title,
      text,
      background,
      color,
      confirmButtonColor,
      confirmButtonText: 'Aceptar',
    });
  }
};