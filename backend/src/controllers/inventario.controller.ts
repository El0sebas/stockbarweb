// Controlador de Inventario (C3): categorías, productos, proveedores,
// bajas de inventario y alertas de stock.
import { Router } from 'express';
import { z } from 'zod';
import { withTx } from '../db.js';
import { noEncontrado } from '../errors.js';
import { requierePermiso } from '../middleware/auth.js';
import { bajasRepo } from '../repositories/bajas.repository.js';
import { catalogosRepo } from '../repositories/catalogos.repository.js';
import { productosRepo } from '../repositories/productos.repository.js';
import { proveedoresRepo } from '../repositories/proveedores.repository.js';
import { cantidad, correo, dinero, estado, filtros, opcional, porcentaje, texto } from '../validate.js';

const r = Router();
const bool = z.enum(['true', 'false']).transform((v) => v === 'true').optional();

// ---------------------------------------------------------------- Catálogos fijos
// Lectura para cualquier usuario autenticado: los usan los formularios.
r.get('/metodos-pago', async (_req, res) => {
  res.json(await catalogosRepo.metodosPago());
});
r.get('/unidades-medida', async (_req, res) => {
  res.json(await catalogosRepo.unidadesMedida());
});
r.get('/motivos-baja', async (_req, res) => {
  res.json(await catalogosRepo.motivosBaja());
});

// ---------------------------------------------------------------- Categorías (CU_02_xx)
const categoriaBody = z.object({
  nombre: texto(50),
  descripcion: opcional(200),
  margen_defecto_porcentaje: z.number().min(0).max(999.99).default(0),
  porcentaje_iva: porcentaje,
  requiere_verificacion_edad: z.boolean().default(false),
});

r.get('/categorias', async (req, res) => {
  res.json(await catalogosRepo.categorias(filtros.parse(req.query).q));
});

r.get('/categorias/:id', async (req, res) => {
  const categoria = await catalogosRepo.categoria(req.params.id);
  if (!categoria) throw noEncontrado('La categoría solicitada');
  res.json(categoria);
});

r.post('/categorias', requierePermiso('GESTIONAR_CATEGORIAS'), async (req, res) => {
  const body = categoriaBody.parse(req.body);
  const id = await withTx((conn) => catalogosRepo.crearCategoria(conn, body));
  res.status(201).json(await catalogosRepo.categoria(id));
});

r.put('/categorias/:id', requierePermiso('GESTIONAR_CATEGORIAS'), async (req, res) => {
  const body = categoriaBody.parse(req.body);
  if (!(await catalogosRepo.actualizarCategoria(req.params.id, body)).affectedRows) {
    throw noEncontrado('La categoría seleccionada');
  }
  res.json(await catalogosRepo.categoria(req.params.id));
});

// Con productos asociados la FK lo impide (409).
r.delete('/categorias/:id', requierePermiso('GESTIONAR_CATEGORIAS'), async (req, res) => {
  if (!(await catalogosRepo.eliminarCategoria(req.params.id)).affectedRows) {
    throw noEncontrado('La categoría seleccionada');
  }
  res.json({ mensaje: 'Categoría eliminada exitosamente' });
});

// ---------------------------------------------------------------- Productos (CU_03_xx)
const productoBody = z.object({
  nombre: texto(120),
  descripcion: opcional(255),
  id_categoria: z.string().regex(/^CAT-\d{3}$/, 'Debe seleccionar una categoría'),
  id_unidad_medida: z.string().regex(/^[A-Z]{3}$/, 'Debe seleccionar una unidad de medida'),
  margen_personalizado_porcentaje: z.number().min(0).max(999.99).nullish().transform((v) => v ?? null),
  precio_venta_actual: dinero,
  maneja_vencimiento: z.boolean().default(true),
  stock_minimo: z.number().min(0).max(99_999_999.99).default(0),
  proveedores: z.array(z.string().max(20)).min(1, 'Un producto debe estar asociado a al menos un proveedor'),
});

r.get(
  '/productos',
  requierePermiso('GESTIONAR_PRODUCTOS', 'GESTIONAR_COMPRAS', 'GESTIONAR_BAJAS', 'VER_REPORTES'),
  async (req, res) => {
    const f = z
      .object({ q: z.string().trim().max(100).optional(), id_categoria: z.string().max(7).optional(), estado: bool, bajo_stock: bool })
      .parse(req.query);
    res.json(await productosRepo.productos(f));
  },
);

r.get(
  '/productos/:id',
  requierePermiso('GESTIONAR_PRODUCTOS', 'GESTIONAR_COMPRAS', 'GESTIONAR_BAJAS', 'VER_REPORTES'),
  async (req, res) => {
    const producto = await productosRepo.producto(req.params.id);
    if (!producto) throw noEncontrado('El producto solicitado');
    res.json(producto);
  },
);

// id_producto es el SKU del negocio; si no se envía se genera PROD-NN (CU_03_02).
r.post('/productos', requierePermiso('GESTIONAR_PRODUCTOS'), async (req, res) => {
  const body = productoBody
    .extend({ id_producto: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/, 'Código: 3 a 30 caracteres A-Z, 0-9 o -').optional() })
    .parse(req.body);
  const id = await withTx(async (conn) => {
    const idNuevo = body.id_producto ?? (await productosRepo.siguienteId(conn));
    await productosRepo.crear(conn, idNuevo, body, [...new Set(body.proveedores)]);
    return idNuevo;
  });
  res.status(201).json(await productosRepo.producto(id));
});

r.put('/productos/:id', requierePermiso('GESTIONAR_PRODUCTOS'), async (req, res) => {
  const body = productoBody.parse(req.body);
  await withTx(async (conn) => {
    const r1 = await productosRepo.actualizar(conn, req.params.id, body, [...new Set(body.proveedores)]);
    if (!r1.affectedRows) throw noEncontrado('El producto seleccionado');
  });
  res.json(await productosRepo.producto(req.params.id));
});

// Inactivo: no aparece para nuevas compras ni ventas, conserva su historial.
r.patch('/productos/:id/estado', requierePermiso('GESTIONAR_PRODUCTOS'), async (req, res) => {
  const body = estado.parse(req.body);
  if (!(await productosRepo.cambiarEstado(req.params.id, body.estado)).affectedRows) {
    throw noEncontrado('El producto seleccionado');
  }
  res.json({ mensaje: `Estado actualizado a ${body.estado ? 'Activo' : 'Inactivo'}` });
});

r.delete('/productos/:id', requierePermiso('GESTIONAR_PRODUCTOS'), async (req, res) => {
  await withTx(async (conn) => {
    if (!(await productosRepo.eliminar(conn, req.params.id)).affectedRows) throw noEncontrado('El producto seleccionado');
  });
  res.json({ mensaje: 'Producto eliminado exitosamente' });
});

// ---------------------------------------------------------------- Proveedores (CU_04_xx)
const proveedorBody = z.object({
  razon_social: texto(120),
  nombre_comercial: opcional(120),
  ciudad: opcional(60),
  direccion: opcional(150),
  telefono_principal: opcional(20),
  correo_principal: correo.nullish().or(z.literal('')).transform((v) => v || null),
});
const nit = z.string().trim().regex(/^\d{5,15}(-\d)?$/, 'NIT inválido (ej. 900123456-1)');

r.get(
  '/proveedores',
  requierePermiso('GESTIONAR_PROVEEDORES', 'GESTIONAR_PRODUCTOS', 'GESTIONAR_COMPRAS'),
  async (req, res) => {
    const f = z.object({ q: z.string().trim().max(100).optional(), estado: bool }).parse(req.query);
    res.json(await proveedoresRepo.proveedores(f));
  },
);

r.get(
  '/proveedores/:id',
  requierePermiso('GESTIONAR_PROVEEDORES', 'GESTIONAR_PRODUCTOS', 'GESTIONAR_COMPRAS'),
  async (req, res) => {
    const proveedor = await proveedoresRepo.proveedor(req.params.id);
    if (!proveedor) throw noEncontrado('El proveedor solicitado');
    res.json(proveedor);
  },
);

// Productos que surte el proveedor (filtra el formulario de compra).
r.get('/proveedores/:id/productos', requierePermiso('GESTIONAR_COMPRAS', 'GESTIONAR_PROVEEDORES'), async (req, res) => {
  res.json(await proveedoresRepo.productos(req.params.id));
});

// id_proveedor ES el NIT (no se genera un código propio).
r.post('/proveedores', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  const body = proveedorBody.extend({ id_proveedor: nit }).parse(req.body);
  await proveedoresRepo.crear(body.id_proveedor, body);
  res.status(201).json(await proveedoresRepo.proveedor(body.id_proveedor));
});

r.put('/proveedores/:id', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  const body = proveedorBody.parse(req.body);
  if (!(await proveedoresRepo.actualizar(req.params.id, body)).affectedRows) {
    throw noEncontrado('El proveedor seleccionado');
  }
  res.json(await proveedoresRepo.proveedor(req.params.id));
});

r.patch('/proveedores/:id/estado', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  const body = estado.parse(req.body);
  if (!(await proveedoresRepo.cambiarEstado(req.params.id, body.estado)).affectedRows) {
    throw noEncontrado('El proveedor seleccionado');
  }
  res.json({ mensaje: `Estado actualizado a ${body.estado ? 'Activo' : 'Inactivo'}` });
});

r.delete('/proveedores/:id', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  await withTx(async (conn) => {
    if (!(await proveedoresRepo.eliminar(conn, req.params.id)).affectedRows) throw noEncontrado('El proveedor seleccionado');
  });
  res.json({ mensaje: 'Proveedor eliminado exitosamente' });
});

// Contactos del proveedor (se gestionan desde su detalle).
const contactoBody = z.object({
  nombres: texto(60),
  apellidos: texto(60),
  cargo: opcional(60),
  telefono: texto(20),
  correo: correo.nullish().or(z.literal('')).transform((v) => v || null),
  es_principal: z.boolean().default(false),
});
const nroContacto = (v: string) => z.coerce.number().int().positive().parse(v);

r.post('/proveedores/:id/contactos', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  const body = contactoBody.parse(req.body);
  const nro = await withTx(async (conn) => {
    const n = await proveedoresRepo.crearContacto(conn, req.params.id, body);
    if (body.es_principal) await proveedoresRepo.marcarPrincipal(conn, req.params.id, n);
    return n;
  });
  res.status(201).json(await proveedoresRepo.contacto(req.params.id, nro));
});

r.put('/proveedores/:id/contactos/:nro', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  const body = contactoBody.parse(req.body);
  const nro = nroContacto(req.params.nro);
  await withTx(async (conn) => {
    if (!(await proveedoresRepo.actualizarContacto(req.params.id, nro, body)).affectedRows) {
      throw noEncontrado('El contacto seleccionado');
    }
    if (body.es_principal) await proveedoresRepo.marcarPrincipal(conn, req.params.id, nro);
  });
  res.json(await proveedoresRepo.contacto(req.params.id, nro));
});

r.patch('/proveedores/:id/contactos/:nro/principal', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  const nro = nroContacto(req.params.nro);
  await withTx(async (conn) => {
    if (!(await proveedoresRepo.marcarPrincipal(conn, req.params.id, nro)).affectedRows) {
      throw noEncontrado('El contacto seleccionado');
    }
  });
  res.json({ mensaje: 'Contacto principal actualizado' });
});

r.delete('/proveedores/:id/contactos/:nro', requierePermiso('GESTIONAR_PROVEEDORES'), async (req, res) => {
  if (!(await proveedoresRepo.eliminarContacto(req.params.id, nroContacto(req.params.nro))).affectedRows) {
    throw noEncontrado('El contacto seleccionado');
  }
  res.json({ mensaje: 'Contacto eliminado' });
});

// ---------------------------------------------------------------- Bajas de inventario (CU_07_xx)
const bajaBody = z.object({
  id_motivo_baja: z.string().regex(/^[A-Z]{3}$/, 'Seleccione el motivo de la baja'),
  cantidad,
  observaciones: opcional(255),
});

r.get('/bajas', requierePermiso('GESTIONAR_BAJAS'), async (req, res) => {
  res.json(await bajasRepo.bajas(filtros.parse(req.query)));
});

// Selector de lotes con stock (antes de /bajas/:id para no confundirse con un id).
r.get('/bajas/lotes', requierePermiso('GESTIONAR_BAJAS'), async (req, res) => {
  res.json(await bajasRepo.lotesConStock(filtros.parse(req.query).q));
});

r.get('/bajas/:id', requierePermiso('GESTIONAR_BAJAS'), async (req, res) => {
  const baja = await bajasRepo.baja(req.params.id);
  if (!baja) throw noEncontrado('La baja solicitada');
  res.json(baja);
});

// El usuario sale de la sesión, nunca del cuerpo de la petición.
r.post('/bajas', requierePermiso('GESTIONAR_BAJAS'), async (req, res) => {
  const body = bajaBody
    .extend({ id_lote: z.string({ error: 'Selecciona el lote que vas a dar de baja' }).regex(/^LOT-\d{6}$/, 'Selecciona el lote que vas a dar de baja') })
    .parse(req.body);
  const id = await withTx((conn) => bajasRepo.crear(conn, body.id_lote, body, req.usuario!.id_usuario), { lecturaConfirmada: true });
  res.status(201).json({ mensaje: 'Baja registrada y stock del lote actualizado', baja: await bajasRepo.baja(id) });
});

r.put('/bajas/:id', requierePermiso('GESTIONAR_BAJAS'), async (req, res) => {
  const body = bajaBody.parse(req.body);
  const r1 = await withTx((conn) => bajasRepo.actualizar(conn, req.params.id, body), { lecturaConfirmada: true });
  if (!r1?.affectedRows) throw noEncontrado('La baja seleccionada');
  res.json({ mensaje: 'Baja actualizada exitosamente', baja: await bajasRepo.baja(req.params.id) });
});

export default r;
