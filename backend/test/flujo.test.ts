// Prueba de extremo a extremo contra MySQL real (triggers y vistas incluidos).
// Requiere una base de datos de PRUEBA recién creada con /scripts/sch.sql y
// variables en .env.test (ver README). Nunca apuntar a la base de producción.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { seguridadRepo } from '../src/repositories/seguridad.repository.js';
import { inicializar } from '../src/seed.js';

let base = '';
let servidor: ReturnType<typeof app.listen>;
let admin = '';

const hoyMas = (dias: number) => new Date(Date.now() + dias * 86400000).toLocaleDateString('sv-SE');

async function api(metodo: string, ruta: string, body?: unknown, token = admin) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const login = async (correo: string, contrasena: string) => (await api('POST', '/auth/login', { correo, contrasena }, '')).data.token;

before(async () => {
  if (await seguridadRepo.hayUsuarios()) {
    throw new Error('La BD de prueba ya tiene datos: recárguela con scripts/sch.sql antes de correr las pruebas.');
  }
  await inicializar();
  servidor = app.listen(0);
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
});

after(async () => {
  servidor.close();
  await pool.end();
});

test('flujo completo: compra → stock → jornada → venta → bajas → dashboard', async () => {
  assert.equal((await api('GET', '/health', undefined, '')).status, 200);
  assert.equal((await api('POST', '/auth/login', { correo: process.env.ADMIN_CORREO, contrasena: 'mala123x' }, '')).status, 401);
  admin = await login(process.env.ADMIN_CORREO!, process.env.ADMIN_CONTRASENA!);
  assert.ok(admin);
  assert.equal((await api('GET', '/usuarios', undefined, '')).status, 401);

  // Proveedor con un solo contacto principal
  const nit = '900123456-1';
  assert.equal((await api('POST', '/proveedores', { id_proveedor: nit, razon_social: 'Distribuidora de Licores de Antioquia' })).status, 201);
  await api('POST', `/proveedores/${nit}/contactos`, { nombres: 'Carlos', apellidos: 'Pérez', telefono: '3104567890', es_principal: true });
  await api('POST', `/proveedores/${nit}/contactos`, { nombres: 'María', apellidos: 'Gómez', telefono: '3209876543', es_principal: true });
  const prov = (await api('GET', `/proveedores/${nit}`)).data;
  assert.equal(prov.contactos.filter((c: any) => c.es_principal).length, 1);
  assert.equal(prov.contacto_principal, 'María Gómez');

  // Productos: SKU propio y código generado
  const agu = await api('POST', '/productos', {
    id_producto: 'AGU-750', nombre: 'Aguardiente Antioqueño 750ml', id_categoria: 'CAT-001', id_unidad_medida: 'BOT',
    precio_venta_actual: 65000, stock_minimo: 5, proveedores: [nit],
  });
  assert.equal(agu.status, 201, JSON.stringify(agu.data));
  const pap = await api('POST', '/productos', {
    nombre: 'Papas Margarita', id_categoria: 'CAT-004', id_unidad_medida: 'PAQ', precio_venta_actual: 4500,
    maneja_vencimiento: false, stock_minimo: 15, proveedores: [nit],
  });
  assert.equal(pap.data.id_producto, 'PROD-01');

  // Compra: vencimiento < 15 días lo rechaza el trigger
  const mala = await api('POST', '/compras', {
    id_proveedor: nit, id_metodo_pago: 'EFE', fecha_compra: hoyMas(0),
    detalles: [{ id_producto: 'AGU-750', fecha_vencimiento: hoyMas(5), cantidad: 1, precio_unitario_compra: 1 }],
  });
  assert.equal(mala.status, 422);
  assert.match(mala.data.error, /15 días/);

  const compra = await api('POST', '/compras', {
    id_proveedor: nit, id_metodo_pago: 'NEQ', numero_factura_proveedor: 'FAC-1092', fecha_compra: hoyMas(0),
    detalles: [
      { id_producto: 'AGU-750', fecha_vencimiento: hoyMas(60), cantidad: 10, precio_unitario_compra: 40000 },
      { id_producto: 'PROD-01', cantidad: 20, precio_unitario_compra: 2500 },
    ],
  });
  assert.equal(compra.status, 201, JSON.stringify(compra.data));
  assert.equal(compra.data.estado, 'PENDIENTE');
  assert.equal(compra.data.total_compra, 450000);
  assert.equal((await api('GET', '/productos/AGU-750')).data.stock_actual, 0, 'PENDIENTE no suma stock');

  const registrada = await api('POST', `/compras/${compra.data.id_compra}/completar`);
  assert.equal(registrada.data.estado, 'REGISTRADA');
  const aguDet = (await api('GET', '/productos/AGU-750')).data;
  assert.equal(aguDet.stock_actual, 10);
  assert.equal(aguDet.lotes.length, 1);
  assert.equal((await api('POST', `/compras/${compra.data.id_compra}/anular`)).status, 422);

  // Factura: el contenido debe coincidir con el tipo declarado
  const subir = (contenido: string, tipo: string) => {
    const fd = new FormData();
    fd.append('factura', new Blob([contenido], { type: tipo }), 'factura');
    return fetch(`${base}/compras/${compra.data.id_compra}/factura`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: fd });
  };
  assert.equal((await subir('<script>alert(1)</script>', 'application/pdf')).status, 422);
  assert.equal((await subir('%PDF-1.4 prueba', 'application/pdf')).status, 200);

  // Ventas exigen jornada abierta
  assert.equal((await api('POST', '/ventas', { id_metodo_pago: 'EFE' })).status, 409);
  assert.equal((await api('POST', '/jornadas/abrir')).status, 201);
  assert.equal((await api('POST', '/jornadas/abrir')).status, 409);

  // Consumidor Final está exento de la verificación de edad (decisión de negocio)
  const cf = await api('POST', '/ventas', { id_metodo_pago: 'EFE', productos: [{ id_producto: 'AGU-750', cantidad: 1 }] });
  assert.equal(cf.status, 201, JSON.stringify(cf.data));
  assert.equal(cf.data.id_cliente, 'CLI-00000');
  assert.equal((await api('POST', `/ventas/${cf.data.id_venta}/anular`)).data.estado, 'ANULADA');

  const snacks = await api('POST', '/ventas', { id_metodo_pago: 'EFE', productos: [{ id_producto: 'PROD-01', cantidad: 2 }], completar: true });
  assert.equal(snacks.status, 201, JSON.stringify(snacks.data));
  assert.equal(snacks.data.estado, 'COMPLETADA');
  assert.equal(snacks.data.total_venta, 9000);
  assert.ok(Math.abs(snacks.data.iva - (9000 - 9000 / 1.19)) < 0.02);

  // Cliente adulto y cliente menor
  const adulto = (await api('POST', '/clientes', { numero_documento: '1017223344', nombres: 'Andrés', apellidos: 'Pérez', fecha_nacimiento: '1990-05-12' })).data;
  const menor = (await api('POST', '/clientes', { numero_documento: '1020445566', nombres: 'Laura', apellidos: 'Gómez', fecha_nacimiento: hoyMas(-365 * 16) })).data;
  assert.equal(adulto.id_cliente, 'CLI-00001');

  // Carrito PENDIENTE: el stock queda reservado desde el primer producto
  const v = (await api('POST', '/ventas', { id_cliente: adulto.id_cliente, id_metodo_pago: 'NEQ' })).data;
  await api('POST', `/ventas/${v.id_venta}/productos`, { id_producto: 'AGU-750', cantidad: 3 });
  const v4 = await api('PUT', `/ventas/${v.id_venta}/productos/AGU-750`, { cantidad: 4 });
  assert.equal(v4.data.total_venta, 260000);
  assert.equal((await api('GET', '/productos/AGU-750')).data.stock_actual, 6);
  assert.equal((await api('POST', `/ventas/${v.id_venta}/productos`, { id_producto: 'AGU-750', cantidad: 100 })).status, 409);

  // Cambiar a un cliente menor revalida las líneas y se rechaza
  const aMenor = await api('PUT', `/ventas/${v.id_venta}`, { id_cliente: menor.id_cliente, id_metodo_pago: 'NEQ' });
  assert.equal(aMenor.status, 422);
  assert.match(aMenor.data.error, /18/);

  const completada = await api('POST', `/ventas/${v.id_venta}/completar`);
  assert.equal(completada.data.estado, 'COMPLETADA');
  assert.equal(completada.data.detalles[0].porcentaje_impuesto_aplicado, 5);
  assert.ok(Math.abs(completada.data.base_gravable - 260000 / 1.05) < 0.02);
  // Una venta COMPLETADA nunca se anula
  const anularCompletada = await api('POST', `/ventas/${v.id_venta}/anular`);
  assert.equal(anularCompletada.status, 422);
  assert.match(anularCompletada.data.error, /No se puede anular una venta COMPLETADA/);
  assert.equal((await api('GET', `/ventas/${v.id_venta}`)).data.estado, 'COMPLETADA');
  assert.equal((await api('POST', `/ventas/${v.id_venta}/productos`, { id_producto: 'PROD-01', cantidad: 1 })).status, 422);

  // Anular una PENDIENTE libera el stock; no se cierra jornada con pendientes
  const pend = (await api('POST', '/ventas', { id_cliente: adulto.id_cliente, id_metodo_pago: 'EFE', productos: [{ id_producto: 'AGU-750', cantidad: 2 }] })).data;
  assert.equal((await api('GET', '/productos/AGU-750')).data.stock_actual, 4);
  assert.equal((await api('POST', '/jornadas/cerrar')).status, 409);
  assert.equal((await api('POST', `/ventas/${pend.id_venta}/anular`)).data.estado, 'ANULADA');
  assert.equal((await api('GET', '/productos/AGU-750')).data.stock_actual, 6);

  // Bajas
  const baja = await api('POST', '/bajas', { id_lote: aguDet.lotes[0].id_lote, id_motivo_baja: 'DAN', cantidad: 1 });
  assert.equal(baja.status, 201, JSON.stringify(baja.data));
  assert.equal((await api('POST', '/bajas', { id_lote: aguDet.lotes[0].id_lote, id_motivo_baja: 'DAN', cantidad: 100 })).status, 422);
  assert.equal((await api('GET', '/productos/AGU-750')).data.stock_actual, 5);
  // CU_07_03: editar la baja ajusta el stock (el trigger revalida el disponible)
  assert.equal((await api('PUT', `/bajas/${baja.data.baja.id_baja}`, { id_motivo_baja: 'DAN', cantidad: 2 })).status, 200);
  assert.equal((await api('GET', '/productos/AGU-750')).data.stock_actual, 4);
  assert.equal((await api('PUT', `/bajas/${baja.data.baja.id_baja}`, { id_motivo_baja: 'DAN', cantidad: 100 })).status, 422);

  // Jornada: resumen y cierre
  const jornada = (await api('GET', '/jornadas/actual')).data;
  const detalleJ = (await api('GET', `/jornadas/${jornada.id_jornada}`)).data;
  assert.equal(detalleJ.resumen.ventas_completadas, 2);
  assert.equal(detalleJ.resumen.total_vendido, 269000);
  assert.equal((await api('POST', '/jornadas/cerrar')).status, 200);

  // Dashboard
  const dash = (await api('GET', '/dashboard')).data;
  assert.equal(dash.ventas.total, 269000);
  assert.equal(dash.mas_vendido.id_producto, 'AGU-750');
  assert.equal(dash.categoria_lider.categoria, 'Licores');
  assert.equal(dash.stock_por_producto.find((s: any) => s.id_producto === 'AGU-750').semaforo, 'ALERTA');

  // Borrados protegidos por FK
  assert.equal((await api('DELETE', '/productos/AGU-750')).status, 409);
  assert.equal((await api('DELETE', '/categorias/CAT-001')).status, 409);
  assert.equal((await api('PATCH', '/clientes/CLI-00000/estado', { estado: false })).status, 422);
});

test('RBAC, protección del admin principal y recuperación de contraseña', async () => {
  const yo = (await api('GET', '/auth/me')).data;
  assert.equal(yo.es_admin_principal, true);
  assert.equal((await api('PATCH', `/usuarios/${yo.id_usuario}/estado`, { estado: false })).status, 422);
  assert.equal((await api('POST', '/roles', { nombre: 'SIN PERMISOS', permisos: [] })).status, 400);
  assert.equal((await api('PUT', '/roles/ADM', { nombre: 'ADMINISTRADOR', permisos: ['VER_REPORTES'] })).status, 422);

  const emp = await api('POST', '/usuarios', {
    numero_documento: '1000000002', nombres: 'Juan David', apellidos: 'Posso', correo: 'empleado@stockbar.com',
    id_rol: 'EMP', contrasena: 'Empleado123',
  });
  assert.equal(emp.status, 201, JSON.stringify(emp.data));
  const tokenEmp = await login('empleado@stockbar.com', 'Empleado123');
  assert.equal((await api('GET', '/usuarios', undefined, tokenEmp)).status, 403);
  assert.equal((await api('GET', '/compras', undefined, tokenEmp)).status, 403);
  assert.equal((await api('GET', '/dashboard', undefined, tokenEmp)).status, 403);
  assert.equal((await api('GET', '/ventas/catalogo', undefined, tokenEmp)).status, 200);
  assert.equal((await api('GET', '/ventas/mi-resumen', undefined, tokenEmp)).status, 200);

  // GESTIONAR_USUARIOS sin ser Administrador no permite escalar privilegios
  await api('POST', '/roles', { id_rol: 'GES', nombre: 'GESTOR', permisos: ['GESTIONAR_USUARIOS', 'GESTIONAR_ROLES'] });
  const gestor = await api('POST', '/usuarios', {
    numero_documento: '1000000003', nombres: 'Ana', apellidos: 'Ruiz', correo: 'gestor@stockbar.com', id_rol: 'GES', contrasena: 'Gestor1234',
  });
  const tokenGes = await login('gestor@stockbar.com', 'Gestor1234');
  const datosGestor = { numero_documento: '1000000003', nombres: 'Ana', apellidos: 'Ruiz', correo: 'gestor@stockbar.com' };
  assert.equal((await api('PUT', `/usuarios/${gestor.data.id_usuario}`, { ...datosGestor, id_rol: 'ADM' }, tokenGes)).status, 403);
  assert.equal((await api('PUT', `/usuarios/${yo.id_usuario}`, { ...datosGestor, correo: 'x@stockbar.com', id_rol: 'ADM', contrasena: 'Robada1234' }, tokenGes)).status, 403);
  assert.equal((await api('DELETE', `/usuarios/${yo.id_usuario}`, undefined, tokenGes)).status, 422);
  assert.equal((await api('PUT', `/usuarios/${emp.data.id_usuario}`, { numero_documento: '1000000002', nombres: 'Juan David', apellidos: 'Posso', correo: 'empleado@stockbar.com', id_rol: 'EMP' }, tokenGes)).status, 200);

  // Cerrar sesión invalida el token en el servidor
  const tokenSalida = await login('gestor@stockbar.com', 'Gestor1234');
  assert.equal((await api('POST', '/auth/logout', undefined, tokenSalida)).status, 204);
  assert.equal((await api('GET', '/auth/me', undefined, tokenSalida)).status, 401);
  assert.equal((await api('GET', '/auth/me', undefined, tokenGes)).status, 200, 'solo se cierra ese dispositivo');

  // Desactivarlo corta su sesión aunque el JWT siga vigente
  await api('PATCH', `/usuarios/${emp.data.id_usuario}/estado`, { estado: false });
  assert.equal((await api('GET', '/ventas/catalogo', undefined, tokenEmp)).status, 401);

  // Recuperación: token de un solo uso enviado por correo (en pruebas, a consola)
  const avisos: string[] = [];
  const warn = console.warn;
  console.warn = (m: string) => avisos.push(String(m));
  assert.equal((await api('POST', '/auth/recuperar', { correo: process.env.ADMIN_CORREO }, '')).status, 200);
  console.warn = warn;
  const token = /\b[0-9a-f]{64}\b/.exec(avisos.join('\n'))?.[0];
  assert.ok(token, 'el correo debe llevar el token');
  assert.equal((await api('POST', '/auth/restablecer', { token, contrasena: 'NuevaClave2026' }, '')).status, 200);
  assert.equal((await api('POST', '/auth/restablecer', { token, contrasena: 'OtraClave2026' }, '')).status, 400);
  assert.ok(await login(process.env.ADMIN_CORREO!, 'NuevaClave2026'));
  // Cambiar la contraseña invalida los tokens emitidos antes
  const viejo = await api('GET', '/auth/me');
  assert.equal(viejo.status, 401);
  assert.match(viejo.data.error, /contraseña cambió/);
});

test('ventas simultáneas del mismo producto: sin sobreventa ni interbloqueos', async () => {
  admin = await login(process.env.ADMIN_CORREO!, 'NuevaClave2026');
  const nit = '800555444-2';
  await api('POST', '/proveedores', { id_proveedor: nit, razon_social: 'Proveedor concurrencia' });
  await api('POST', '/productos', {
    id_producto: 'CONC-01', nombre: 'Producto concurrencia', id_categoria: 'CAT-004', id_unidad_medida: 'UND',
    precio_venta_actual: 1000, maneja_vencimiento: false, proveedores: [nit],
  });
  await api('POST', '/compras', {
    id_proveedor: nit, id_metodo_pago: 'EFE', fecha_compra: hoyMas(0), completar: true,
    detalles: [{ id_producto: 'CONC-01', cantidad: 30, precio_unitario_compra: 500 }],
  });
  assert.equal((await api('POST', '/jornadas/abrir')).status, 201);

  // 20 carritos agregan 3 unidades a la vez sobre 30 disponibles: entran 10.
  const carritos = [];
  for (let i = 0; i < 20; i++) carritos.push((await api('POST', '/ventas', { id_metodo_pago: 'EFE' })).data.id_venta);
  const respuestas = await Promise.all(carritos.map((id) => api('POST', `/ventas/${id}/productos`, { id_producto: 'CONC-01', cantidad: 3 })));
  const estados = respuestas.map((r) => r.status);
  assert.equal(estados.filter((s) => s === 200).length, 10, JSON.stringify(estados));
  assert.equal(estados.filter((s) => s === 409).length, 10, JSON.stringify(estados));
  assert.equal((await api('GET', '/productos/CONC-01')).data.stock_actual, 0);
});
