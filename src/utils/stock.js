// El stock nunca se calcula en el navegador: lo entrega la API desde
// vw_stock_producto / vw_stock_lotes. Aquí solo queda la señal visual de
// vencimiento para los badges.

// Un lote se sugiere como "por vencer" a 15 días o menos — es solo una señal
// visual, nunca bloquea ni prioriza nada por sí sola (el FEFO lo hace el backend).
export const DIAS_SUGERENCIA_VENCIMIENTO = 15;

// 'vencido' | 'por_vencer' | null — null cuando el lote no maneja
// vencimiento o todavía está lejos de vencer.
export const getEstadoVencimiento = (fechaVencimiento) => {
  if (!fechaVencimiento) return null;
  const dias = Math.ceil((new Date(`${fechaVencimiento}T00:00:00`) - new Date()) / 86400000);
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_SUGERENCIA_VENCIMIENTO) return 'por_vencer';
  return null;
};
