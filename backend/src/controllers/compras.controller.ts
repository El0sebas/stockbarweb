// Controlador de Compras (C3): ingreso de facturas de proveedores y suma de
// mercancía por lote. Flujo (sch.sql nota 4): la compra nace PENDIENTE (su
// stock no cuenta), se completa a REGISTRADA (stock vendible, inmutable) o se
// anula mientras siga PENDIENTE.
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { config } from '../config.js';
import { withTx } from '../db.js';
import { HttpError, noEncontrado } from '../errors.js';
import { requierePermiso } from '../middleware/auth.js';
import { comprasRepo, type CabeceraCompra, type LineaCompra } from '../repositories/compras.repository.js';
import { proveedoresRepo } from '../repositories/proveedores.repository.js';
import { cantidad, dinero, fecha, filtros, idMetodoPago, opcional } from '../validate.js';

const r = Router();
// Acotado a /compras: el router se monta en /api junto a los demás.
r.use('/compras', requierePermiso('GESTIONAR_COMPRAS'));

const compraBody = z.object({
  id_proveedor: z.string().min(1, 'Seleccione un proveedor').max(20),
  id_metodo_pago: idMetodoPago,
  numero_factura_proveedor: opcional(40),
  fecha_compra: fecha,
  observaciones: opcional(255),
  detalles: z
    .array(
      z.object({
        id_producto: z.string().min(1).max(30),
        fecha_vencimiento: fecha.nullish().transform((v) => v ?? null),
        cantidad,
        precio_unitario_compra: dinero,
      }),
    )
    .min(1, 'Agregue al menos un producto a la compra'),
  // true = registrar de una vez (PENDIENTE -> REGISTRADA en la misma transacción).
  completar: z.boolean().default(false),
});

// Proveedor activo y cada producto activo y surtido por ese proveedor
// (el formulario solo lista vw_productos_por_proveedor); luego las líneas.
async function guardarLineas(conn: PoolConnection, id: string, c: CabeceraCompra, detalles: LineaCompra[]) {
  if (!(await proveedoresRepo.activo(c.id_proveedor, conn))) {
    throw new HttpError(422, 'El proveedor no existe o está inactivo');
  }
  const productos = [...new Set(detalles.map((d) => d.id_producto))];
  const validos = await comprasRepo.productosValidos(conn, c.id_proveedor, productos);
  const invalidos = productos.filter((p) => !validos.includes(p));
  if (invalidos.length) {
    throw new HttpError(422, `Productos inactivos o no asociados a este proveedor: ${invalidos.join(', ')}`);
  }
  for (const d of detalles) await comprasRepo.agregarDetalle(conn, id, d);
}

r.get('/compras', async (req, res) => {
  res.json(await comprasRepo.compras(filtros.parse(req.query)));
});

r.get('/compras/:id', async (req, res) => {
  const compra = await comprasRepo.compra(req.params.id);
  if (!compra) throw noEncontrado('La compra solicitada');
  res.json(compra);
});

r.post('/compras', async (req, res) => {
  const { detalles, completar, ...cabecera } = compraBody.parse(req.body);
  const id = await withTx(async (conn) => {
    const idCompra = await comprasRepo.crear(conn, cabecera, req.usuario!.id_usuario);
    await guardarLineas(conn, idCompra, cabecera, detalles);
    if (completar) await comprasRepo.completar(conn, idCompra);
    return idCompra;
  });
  res.status(201).json(await comprasRepo.compra(id));
});

// Editar solo mientras está PENDIENTE: reemplaza cabecera y líneas.
r.put('/compras/:id', async (req, res) => {
  const { detalles, completar, ...cabecera } = compraBody.parse(req.body);
  await withTx(async (conn) => {
    const actual = await comprasRepo.estadoParaEditar(conn, req.params.id);
    if (!actual) throw noEncontrado('La compra seleccionada');
    if (actual.estado !== 'PENDIENTE') {
      throw new HttpError(422, `No se puede editar una compra ${actual.estado}; solo mientras está PENDIENTE.`);
    }
    await comprasRepo.actualizarCabecera(conn, req.params.id, cabecera);
    await comprasRepo.borrarDetalles(conn, req.params.id);
    await guardarLineas(conn, req.params.id, cabecera, detalles);
    if (completar) await comprasRepo.completar(conn, req.params.id);
  });
  res.json(await comprasRepo.compra(req.params.id));
});

r.post('/compras/:id/completar', async (req, res) => {
  await withTx(async (conn) => {
    const actual = await comprasRepo.estadoParaEditar(conn, req.params.id);
    if (!actual) throw noEncontrado('La compra seleccionada');
    if (actual.estado !== 'PENDIENTE') throw new HttpError(422, `La compra ya está ${actual.estado}.`);
    await comprasRepo.completar(conn, req.params.id);
  });
  res.json(await comprasRepo.compra(req.params.id));
});

// Solo mientras está PENDIENTE: una compra REGISTRADA nunca se anula
// (doble barrera con trg_validar_anulacion_compra).
r.post('/compras/:id/anular', async (req, res) => {
  await withTx(async (conn) => {
    const actual = await comprasRepo.estadoParaEditar(conn, req.params.id);
    if (!actual) throw noEncontrado('La compra seleccionada');
    if (actual.estado !== 'PENDIENTE') {
      throw new HttpError(422, `No se puede anular una compra ${actual.estado}: solo mientras está PENDIENTE.`);
    }
    await comprasRepo.anular(conn, req.params.id);
  });
  res.json(await comprasRepo.compra(req.params.id));
});

// ---------------------------------------------------------------- Factura digitalizada
// PDF o imagen, máximo 5 MB, guardada fuera del código (UPLOAD_DIR) con un
// nombre derivado del id de compra, nunca del nombre que manda el cliente.
const TIPOS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
// El mimetype lo declara el cliente: se confirma con la firma real del archivo.
const FIRMAS: Record<string, (b: Buffer) => boolean> = {
  '.pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  '.jpg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};
const dirFacturas = path.join(config.uploadDir, 'facturas');
fs.mkdirSync(dirFacturas, { recursive: true });

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    TIPOS[file.mimetype] ? cb(null, true) : cb(new HttpError(422, 'La factura debe ser PDF, JPG, PNG o WEBP')),
});

r.post('/compras/:id/factura', subida.single('factura'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Adjunte el archivo en el campo "factura"');
  const extension = TIPOS[req.file.mimetype];
  if (!FIRMAS[extension](req.file.buffer)) throw new HttpError(422, 'El contenido del archivo no corresponde a un PDF o imagen válida');
  const compra = await comprasRepo.compra(String(req.params.id));
  if (!compra) throw noEncontrado('La compra seleccionada');
  const archivo = `${compra.id_compra}${extension}`;
  if (compra.ruta_factura && compra.ruta_factura !== archivo) {
    fs.rmSync(path.join(dirFacturas, path.basename(compra.ruta_factura)), { force: true });
  }
  fs.writeFileSync(path.join(dirFacturas, archivo), req.file.buffer);
  await comprasRepo.guardarRutaFactura(compra.id_compra, archivo);
  res.json({ mensaje: 'Factura adjuntada', ruta_factura: archivo });
});

r.get('/compras/:id/factura', async (req, res) => {
  const compra = await comprasRepo.compra(req.params.id);
  if (!compra?.ruta_factura) throw noEncontrado('La factura de esta compra');
  const archivo = path.join(dirFacturas, path.basename(compra.ruta_factura));
  if (!fs.existsSync(archivo)) throw noEncontrado('El archivo de la factura');
  res.download(archivo);
});

export default r;
