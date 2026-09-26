import { generateNextId } from './identifiers';

// Espejo de trg_validar_baja_ins: la BD rechaza sola una baja con cantidad
// <= 0 o mayor al disponible del lote. Solo mostramos el mensaje, no lo
// recalculamos con otra lógica.
export const validarCantidadBaja = (cantidad, disponible) => {
  if (!cantidad || cantidad <= 0) {
    return 'La cantidad de la baja debe ser mayor que cero.';
  }
  if (cantidad > disponible) {
    return 'La baja supera la cantidad disponible del lote.';
  }
  return null;
};

// Aplica una baja ya validada: descuenta el lote (mismo criterio que
// fn_stock_lote, que resta ventas + bajas) y agrega el registro al
// historial. Reutilizado por BajasPage y por el acceso rápido desde
// ProductoDetailModal para no duplicar la regla en dos sitios.
export const aplicarBaja = ({ lotes, bajas, baja }) => {
  const idBaja = generateNextId(bajas, 'id_baja');
  const nuevaBaja = { id_baja: idBaja, fecha_hora: new Date().toISOString(), ...baja };

  const nuevosLotes = lotes.map((l) =>
    l.id_lote === baja.id_lote
      ? { ...l, cantidad_disponible: Number(l.cantidad_disponible) - Number(baja.cantidad) }
      : l
  );

  return { nuevosLotes, nuevasBajas: [nuevaBaja, ...bajas] };
};

// Mirror de sp_dar_baja_lotes_vencidos: en la BD real esto lo dispara un cron
// diario (no existe aquí, ver ComprasFormModal/instrucciones), así que en
// este mock se ejecuta una vez por login como sustituto pragmático. Da de
// baja automáticamente (motivo "Vencimiento") todo lote de una compra
// REGISTRADA cuya fecha_vencimiento ya pasó y que aún tiene stock.
export const generarBajasPorVencimiento = ({ lotes, bajas, idUsuario, usuario }) => {
  const hoy = new Date().toISOString().split('T')[0];
  const lotesVencidos = lotes.filter(
    (l) => l.estado_compra !== 'ANULADA' && l.fecha_vencimiento && l.fecha_vencimiento < hoy && Number(l.cantidad_disponible) > 0
  );

  let nuevosLotes = lotes;
  let nuevasBajas = bajas;

  lotesVencidos.forEach((lote) => {
    const resultado = aplicarBaja({
      lotes: nuevosLotes,
      bajas: nuevasBajas,
      baja: {
        id_lote: lote.id_lote,
        id_motivo_baja: 1,
        cantidad: Number(lote.cantidad_disponible),
        observaciones: 'Baja automática por vencimiento (sp_dar_baja_lotes_vencidos).',
        id_usuario: idUsuario,
        usuario
      }
    });
    nuevosLotes = resultado.nuevosLotes;
    nuevasBajas = resultado.nuevasBajas;
  });

  return { nuevosLotes, nuevasBajas, cantidadGenerada: lotesVencidos.length };
};
