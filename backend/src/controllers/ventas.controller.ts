// Controlador de Ventas (C3): clientes, jornadas de caja y facturación.
// Lo consumen igual la web y la app móvil (POS): toda la regla vive aquí y
// en los triggers, nunca en el cliente.
import { Router } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { withTx } from '../db.js';
import { HttpError, noEncontrado } from '../errors.js';
import { requierePermiso } from '../middleware/auth.js';
import { CONSUMIDOR_FINAL, clientesRepo } from '../repositories/clientes.repository.js';
import { jornadasRepo } from '../repositories/jornadas.repository.js';
import { ventasRepo } from '../repositories/ventas.repository.js';
import { cantidad, correo, estado, fecha, filtros, idCliente, idMetodoPago, opcional, texto, tipoDocumento } from '../validate.js';

const r = Router();
const SIN_JORNADA = "No hay jornada abierta. Debes abrir una jornada (menú 'Jornada') antes de poder registrar ventas.";

// ---------------------------------------------------------------- Clientes (CU_08_xx)
const clienteBody = z.object({
  tipo_documento: tipoDocumento.default('CC'),
  numero_documento: texto(20),
  nombres: texto(60),
  apellidos: texto(60),
  fecha_nacimiento: fecha.nullish().or(z.literal('')).transform((v) => v || null),
  genero: opcional(20),
  ciudad: opcional(60),
  direccion: opcional(150),
  telefono: opcional(20),
  correo: correo.nullish().or(z.literal('')).transform((v) => v || null),
});

const protegido = (id: string) => {
  if (id === CONSUMIDOR_FINAL) {
    throw new HttpError(422, 'Cliente protegido: "Consumidor Final" es la opción por defecto del punto de venta');
  }
};

// El selector de cliente de Ventas también lo usa.
r.get('/clientes', requierePermiso('GESTIONAR_CLIENTES', 'GESTIONAR_VENTAS'), async (req, res) => {
  const f = z
    .object({ q: z.string().trim().max(100).optional(), estado: z.enum(['true', 'false']).transform((v) => v === 'true').optional() })
    .parse(req.query);
  res.json(await clientesRepo.clientes(f));
});

r.get('/clientes/:id', requierePermiso('GESTIONAR_CLIENTES', 'GESTIONAR_VENTAS'), async (req, res) => {
  const cliente = await clientesRepo.cliente(req.params.id);
  if (!cliente) throw noEncontrado('El cliente solicitado');
  res.json(cliente);
});

r.post('/clientes', requierePermiso('GESTIONAR_CLIENTES'), async (req, res) => {
  const body = clienteBody.parse(req.body);
  const id = await withTx((conn) => clientesRepo.crear(conn, body));
  res.status(201).json(await clientesRepo.cliente(id));
});

r.put('/clientes/:id', requierePermiso('GESTIONAR_CLIENTES'), async (req, res) => {
  protegido(req.params.id);
  const body = clienteBody.parse(req.body);
  if (!(await clientesRepo.actualizar(req.params.id, body)).affectedRows) throw noEncontrado('El cliente seleccionado');
  res.json(await clientesRepo.cliente(req.params.id));
});

r.patch('/clientes/:id/estado', requierePermiso('GESTIONAR_CLIENTES'), async (req, res) => {
  protegido(req.params.id);
  const body = estado.parse(req.body);
  if (!(await clientesRepo.cambiarEstado(req.params.id, body.estado)).affectedRows) {
    throw noEncontrado('El cliente seleccionado');
  }
  res.json({ mensaje: `Estado actualizado a ${body.estado ? 'Activo' : 'Inactivo'}` });
});

// Con ventas asociadas la FK lo impide (409).
r.delete('/clientes/:id', requierePermiso('GESTIONAR_CLIENTES'), async (req, res) => {
  protegido(req.params.id);
  if (!(await clientesRepo.eliminar(req.params.id)).affectedRows) throw noEncontrado('El cliente seleccionado');
  res.json({ mensaje: 'Cliente eliminado exitosamente' });
});

// ---------------------------------------------------------------- Jornadas (CU_05_xx)
// El indicador "Jornada abierta / Sin jornada" lo muestran todas las pantallas.
r.get('/jornadas/actual', async (_req, res) => {
  res.json((await jornadasRepo.abierta()) ?? null);
});

r.get('/jornadas', requierePermiso('GESTIONAR_JORNADAS'), async (req, res) => {
  res.json(await jornadasRepo.jornadas(filtros.parse(req.query)));
});

r.get('/jornadas/:id', requierePermiso('GESTIONAR_JORNADAS'), async (req, res) => {
  const jornada = await jornadasRepo.jornada(req.params.id);
  if (!jornada) throw noEncontrado('La jornada solicitada');
  res.json(jornada);
});

const observacionesBody = z.object({ observaciones: opcional(255) }).default({ observaciones: null });

r.post('/jornadas/abrir', requierePermiso('GESTIONAR_JORNADAS'), async (req, res) => {
  const { observaciones } = observacionesBody.parse(req.body ?? {});
  const id = await withTx((conn) => jornadasRepo.abrir(conn, req.usuario!.id_usuario, observaciones));
  res.status(201).json({ mensaje: 'Jornada abierta. Ya puedes registrar ventas.', jornada: await jornadasRepo.jornada(id) });
});

// No se cierra con ventas PENDIENTES: quedarían con su stock reservado en una
// jornada cerrada, donde ya no se pueden completar.
r.post('/jornadas/cerrar', requierePermiso('GESTIONAR_JORNADAS'), async (req, res) => {
  const { observaciones } = observacionesBody.parse(req.body ?? {});
  const id = await withTx(async (conn) => {
    const abierta = await jornadasRepo.bloquearAbierta(conn, true);
    if (!abierta) throw new HttpError(409, 'No hay ninguna jornada abierta.');
    const pendientes = await jornadasRepo.ventasPendientes(conn, abierta.id_jornada);
    if (pendientes) {
      throw new HttpError(409, `Hay ${pendientes} venta(s) PENDIENTE(s) en la jornada. Complétalas o anúlalas antes de cerrarla.`);
    }
    await jornadasRepo.cerrar(conn, abierta.id_jornada, req.usuario!.id_usuario, observaciones);
    return abierta.id_jornada;
  });
  res.json({ mensaje: 'Jornada cerrada correctamente', jornada: await jornadasRepo.jornada(id) });
});

// ---------------------------------------------------------------- Ventas (CU_06_xx)
const ventas = Router();
r.use('/ventas', requierePermiso('GESTIONAR_VENTAS'), ventas);

const lineaBody = z.object({ id_producto: z.string().min(1).max(30), cantidad });
const cabeceraBody = z.object({
  // Omitido = "Consumidor Final" (opción por defecto del punto de venta).
  id_cliente: idCliente.nullish().transform((v) => (v === undefined ? CONSUMIDOR_FINAL : v)),
  id_metodo_pago: idMetodoPago,
  observaciones: opcional(255),
});

const redondear = (n: number) => Math.round(n * 100) / 100;
// Toda transacción de venta valida stock: lectura confirmada (ver withTx).
const txVenta = <T>(fn: (conn: PoolConnection) => Promise<T>) => withTx(fn, { lecturaConfirmada: true });

// Deja la cantidad del producto en la venta repartida por FEFO entre sus
// lotes vendibles. Las líneas anteriores se liberan primero, así su stock
// vuelve a contar como disponible. Precio: el vigente del producto.
async function fijarCantidad(conn: PoolConnection, idVenta: string, idProducto: string, total: number) {
  await ventasRepo.bloquearLotes(conn, idProducto);
  const producto = await ventasRepo.producto(conn, idProducto);
  if (!producto) throw noEncontrado(`El producto ${idProducto}`);
  if (total > 0 && !producto.estado) throw new HttpError(422, `El producto ${producto.nombre} está inactivo`);
  await ventasRepo.borrarLineasProducto(conn, idVenta, idProducto);
  let resta = redondear(total);
  if (resta <= 0) return;
  const lotes = await ventasRepo.lotesVendiblesFefo(conn, idProducto);
  const disponible = redondear(lotes.reduce((s, l) => s + l.cantidad_disponible, 0));
  if (disponible < resta) {
    throw new HttpError(409, `Stock insuficiente de ${producto.nombre}. Disponible: ${disponible}, solicitado: ${resta}.`);
  }
  for (const lote of lotes) {
    if (resta <= 0) break;
    const n = Math.min(resta, lote.cantidad_disponible);
    // El trigger valida jornada, vencimiento y edad, y congela el IVA.
    await ventasRepo.insertarLinea(conn, idVenta, lote.id_lote, n, producto.precio_venta_actual);
    resta = redondear(resta - n);
  }
}

// La venta solo se modifica mientras está PENDIENTE (bloqueada en la transacción).
async function ventaEditable(conn: PoolConnection, id: string, accion = 'modificar') {
  const venta = await ventasRepo.estadoParaEditar(conn, id);
  if (!venta) throw noEncontrado('La venta seleccionada');
  if (venta.estado !== 'PENDIENTE') {
    throw new HttpError(422, `No se puede ${accion} una venta ${venta.estado}: solo mientras está PENDIENTE.`);
  }
}

ventas.get('/', async (req, res) => {
  const f = filtros.extend({ mias: z.enum(['true', 'false']).optional(), id_jornada: z.string().max(10).optional() }).parse(req.query);
  res.json(await ventasRepo.ventas({ ...f, id_usuario: f.mias === 'true' ? req.usuario!.id_usuario : undefined }));
});

// Productos vendibles para el punto de venta (con stock, IVA y edad).
ventas.get('/catalogo', async (req, res) => {
  res.json(await ventasRepo.catalogo(filtros.parse(req.query).q));
});

// "Mi resumen" del empleado en la jornada abierta (app móvil).
ventas.get('/mi-resumen', async (req, res) => {
  const jornada = await jornadasRepo.abierta();
  if (!jornada) {
    res.json({ jornada: null });
    return;
  }
  const filas = await ventasRepo.resumenUsuarioJornada(req.usuario!.id_usuario, jornada.id_jornada);
  const de = (estado: string) => filas.find((f) => f.estado === estado) ?? { ventas: 0, total: 0 };
  res.json({ jornada, completadas: de('COMPLETADA'), pendientes: de('PENDIENTE'), anuladas: de('ANULADA') });
});

ventas.get('/:id', async (req, res) => {
  const venta = await ventasRepo.venta(req.params.id);
  if (!venta) throw noEncontrado('La venta solicitada');
  res.json(venta);
});

// Crea la venta PENDIENTE en la jornada abierta. Con "productos" y
// completar=true registra la venta completa en una sola llamada (POS móvil).
ventas.post('/', async (req, res) => {
  const body = cabeceraBody
    .extend({ productos: z.array(lineaBody).default([]), completar: z.boolean().default(false) })
    .parse(req.body);
  const id = await txVenta(async (conn) => {
    // Exclusivo: las ventas nuevas se numeran de a una (ver ventasRepo.crear).
    const jornada = await jornadasRepo.bloquearAbierta(conn, true);
    if (!jornada) throw new HttpError(409, SIN_JORNADA);
    const idVenta = await ventasRepo.crear(conn, body, jornada.id_jornada, req.usuario!.id_usuario);
    const cantidades = new Map<string, number>();
    for (const p of body.productos) cantidades.set(p.id_producto, (cantidades.get(p.id_producto) ?? 0) + p.cantidad);
    // Orden fijo de productos = orden fijo de bloqueos entre ventas simultáneas.
    for (const [idProducto, total] of [...cantidades].sort(([a], [b]) => a.localeCompare(b))) {
      await fijarCantidad(conn, idVenta, idProducto, total);
    }
    if (body.completar) await ventasRepo.completar(conn, idVenta);
    return idVenta;
  });
  res.status(201).json(await ventasRepo.venta(id));
});

// Cambiar cliente, método de pago u observaciones. Las líneas se revalidan
// (p. ej. el nuevo cliente debe cumplir la verificación de edad).
ventas.put('/:id', async (req, res) => {
  const body = cabeceraBody.parse(req.body);
  await txVenta(async (conn) => {
    await ventaEditable(conn, req.params.id);
    await ventasRepo.actualizarCabecera(conn, req.params.id, body);
    await ventasRepo.revalidarLineas(conn, req.params.id);
  });
  res.json(await ventasRepo.venta(req.params.id));
});

// Agrega unidades de un producto al carrito (se suman a las que ya tenga).
ventas.post('/:id/productos', async (req, res) => {
  const body = lineaBody.parse(req.body);
  await txVenta(async (conn) => {
    await ventaEditable(conn, req.params.id);
    const actual = await ventasRepo.cantidadProducto(conn, req.params.id, body.id_producto);
    await fijarCantidad(conn, req.params.id, body.id_producto, actual + body.cantidad);
  });
  res.json(await ventasRepo.venta(req.params.id));
});

// Fija la cantidad total de un producto; 0 lo quita del carrito.
ventas.put('/:id/productos/:idProducto', async (req, res) => {
  const body = z.object({ cantidad: z.number().min(0).max(99_999_999.99) }).parse(req.body);
  await txVenta(async (conn) => {
    await ventaEditable(conn, req.params.id);
    await fijarCantidad(conn, req.params.id, req.params.idProducto, body.cantidad);
  });
  res.json(await ventasRepo.venta(req.params.id));
});

ventas.delete('/:id/productos/:idProducto', async (req, res) => {
  await txVenta(async (conn) => {
    await ventaEditable(conn, req.params.id);
    await fijarCantidad(conn, req.params.id, req.params.idProducto, 0);
  });
  res.json(await ventasRepo.venta(req.params.id));
});

// PENDIENTE -> COMPLETADA. sp_completar_venta + triggers exigen al menos una
// línea, total > 0 y jornada/cliente/usuario activos. La respuesta trae todo
// lo necesario para la factura PDF (CU_06_04).
ventas.post('/:id/completar', async (req, res) => {
  await txVenta(async (conn) => {
    await ventaEditable(conn, req.params.id);
    await ventasRepo.completar(conn, req.params.id);
  });
  res.json(await ventasRepo.venta(req.params.id));
});

// Regla de negocio sin excepciones: una venta COMPLETADA NUNCA se anula.
// Solo se anula (cancela) mientras está PENDIENTE, lo que libera el stock
// reservado. Doble barrera: esta validación + trg_validar_anulacion_venta.
ventas.post('/:id/anular', async (req, res) => {
  await txVenta(async (conn) => {
    await ventaEditable(conn, req.params.id, 'anular');
    await ventasRepo.anular(conn, req.params.id);
  });
  res.json(await ventasRepo.venta(req.params.id));
});

export default r;
