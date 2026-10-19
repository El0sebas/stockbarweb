# StockBar — API REST

Backend único para la web (React) y la app móvil (Flutter). Node.js + Express 5 + TypeScript + MySQL (`mysql2`), JWT y RBAC. Sigue el diagrama C3: **Módulo de Seguridad** (middleware JWT/RBAC) → **controladores por dominio** → **repositorios** (único lugar con SQL) → MySQL.

La lógica dura (stock por lote, IVA congelado, edad, vencimientos, estados PENDIENTE/COMPLETADA/ANULADA) vive en los triggers y procedimientos de `/scripts/sch.sql` (V6). El backend no la duplica: orquesta transacciones, asigna los códigos (`CMP-000001`, `VTA-000001`…), reparte las ventas por lote (FEFO) y traduce los errores de los triggers a respuestas HTTP con su mensaje en español.

## Puesta en marcha

1. Crear la base de datos con el script físico. **Importante en Windows:** cargarlo como UTF-8 o los mensajes de los triggers quedan con tildes rotas (`d├¡as`):
   ```
   mysql --default-character-set=utf8mb4 -u root -p < scripts/sch.sql
   ```
2. Crear un usuario MySQL para la app (no usar `root` en producción) con permisos `SELECT, INSERT, UPDATE, DELETE, EXECUTE` sobre `stockbar`.
3. `cd backend && npm install`
4. Copiar `.env.example` a `.env` y completar (mínimo `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` de 32+ caracteres, `ADMIN_CORREO`, `ADMIN_CONTRASENA`).
5. `npm run dev` (desarrollo) o `npm run build && npm start` (producción). Para la nube (contenedor, HTTPS, volumen de facturas, SMTP) ver [`/docs/DESPLIEGUE.md`](../docs/DESPLIEGUE.md) y el `Dockerfile`.

En el primer arranque, si la tabla `usuario` está vacía, se crea el **administrador principal** con `ADMIN_*`, y siempre se asegura el cliente **Consumidor Final** (`CLI-00000`).

### Pruebas

`npm test` corre un flujo de extremo a extremo contra MySQL real (compra → stock → jornada → venta FEFO con IVA y edad → anulaciones → bajas → dashboard → RBAC → recuperación de contraseña). Necesita una base **de prueba recién creada** con `sch.sql` (se niega a correr si ya hay usuarios) y un `.env.test` con las mismas variables que `.env`. Nunca apuntarlo a producción.

## Estructura

```
src/
  server.ts            arranque (HTTP/HTTPS), seed inicial, baja diaria de vencidos
  app.ts               middlewares (helmet, CORS, JSON) y montaje de rutas
  config.ts            variables de entorno
  db.ts                pool mysql2, transacciones, generador de códigos PREFIJO-NNN
  errors.ts            errores HTTP y traducción de errores MySQL / SIGNAL de triggers
  validate.ts          esquemas zod comunes (frontera de confianza)
  mail.ts              SMTP (nodemailer)
  seed.ts              administrador principal + Consumidor Final
  middleware/auth.ts   Módulo de Seguridad: JWT + requierePermiso (RBAC)
  controllers/         auth · seguridad · inventario · compras · ventas · dashboard
  repositories/        SQL por dominio (usa las vistas vw_* para lecturas derivadas)
test/flujo.test.ts
```

## Autenticación y permisos

- `POST /api/auth/login` devuelve `{ token, usuario }`. Enviar `Authorization: Bearer <token>` en todo lo demás. El token dura `JWT_EXPIRA` (8 h por defecto, un turno).
- En cada petición se recargan el usuario y sus permisos desde la BD: desactivar un usuario o su rol, o cambiar los permisos del rol, aplica de inmediato aunque el token siga vigente. Cambiar la contraseña (recuperación o edición) invalida todos los tokens emitidos antes: el token lleva una huella de `contrasena_hash`. Cerrar sesión revoca ese token en una lista en memoria (sin tocar la BD). Esa lista se vacía si la API se reinicia, y entonces un token cerrado vuelve a valer hasta que vence (`JWT_EXPIRA`).
- Solo un usuario con rol Administrador puede asignar el rol Administrador o editar, activar, desactivar o eliminar a otro administrador (`GESTIONAR_USUARIOS` no basta para escalar privilegios). La cuenta del administrador principal solo la edita él mismo.
- Los permisos son los 11 de `sch.sql`. Administrador los tiene todos; Empleado: `GESTIONAR_CLIENTES`, `GESTIONAR_VENTAS`, `GESTIONAR_JORNADAS`, `GESTIONAR_BAJAS`.
- Errores: `{ "error": "mensaje" }` (400 validación con `detalles`, 401 sesión, 403 permiso, 404, 409 conflicto/duplicado/FK, 422 regla de negocio de un trigger).

## Endpoints (`/api`)

| Método y ruta | Permiso | Notas |
|---|---|---|
| **Acceso** | | |
| `POST /auth/login` | público | Al entrar da de baja los lotes vencidos (CU_10_01). Límite de intentos fallidos por IP. |
| `POST /auth/recuperar` `{correo}` | público | Envía por SMTP un token de un solo uso (30 min). Solo se guarda su hash. |
| `POST /auth/restablecer` `{token, contrasena}` | público | |
| `GET /auth/me` · `POST /auth/logout` | sesión | Logout revoca ese token en el servidor (lista en memoria); no cierra la jornada. |
| **Roles y usuarios** | | |
| `GET /permisos` | ROLES | |
| `GET /roles` · `GET /roles/:id` | ROLES (lista también USUARIOS) | |
| `POST /roles` · `PUT /roles/:id` `{id_rol?, nombre, permisos[]}` | ROLES | Mínimo un permiso. `id_rol` opcional (si no, `ROL-NN`); editarlo se propaga. ADMINISTRADOR no se edita ni elimina. |
| `PATCH /roles/:id/estado` `{estado}` · `DELETE /roles/:id` | ROLES | No se elimina con usuarios asociados. |
| `GET /usuarios?q&id_rol&estado` · `GET /usuarios/:id` | USUARIOS | |
| `POST /usuarios` · `PUT /usuarios/:id` | USUARIOS | Contraseña: 8+ caracteres con letra y número; en PUT vacía = se conserva. |
| `PATCH /usuarios/:id/estado` · `DELETE /usuarios/:id` | USUARIOS | Solo un Administrador desactiva; nadie se desactiva/elimina a sí mismo; el admin principal está protegido. |
| **Inventario** | | |
| `GET /metodos-pago` · `/unidades-medida` · `/motivos-baja` · `/categorias` · `/categorias/:id` | sesión | Catálogos de lectura para los formularios. |
| `POST/PUT/DELETE /categorias[/:id]` | CATEGORIAS | Código `CAT-NNN` automático. |
| `GET /productos?q&id_categoria&estado&bajo_stock` · `GET /productos/:id` | PRODUCTOS, COMPRAS, BAJAS o REPORTES | Stock desde `vw_stock_producto`; el detalle trae proveedores y lotes (`vw_stock_lotes`). |
| `POST /productos` · `PUT /productos/:id` | PRODUCTOS | `id_producto` (SKU) opcional al crear (si no, `PROD-NN`); `proveedores[]` mínimo uno. |
| `PATCH /productos/:id/estado` · `DELETE /productos/:id` | PRODUCTOS | No se elimina si ya tiene lotes. |
| `GET /proveedores` · `GET /proveedores/:id` | PROVEEDORES, PRODUCTOS o COMPRAS | El detalle trae sus contactos. |
| `GET /proveedores/:id/productos` | COMPRAS o PROVEEDORES | Lo que surte (filtra el formulario de compra). |
| `POST /proveedores` (`id_proveedor` = NIT) · `PUT` · `PATCH …/estado` · `DELETE` | PROVEEDORES | |
| `POST /proveedores/:id/contactos` · `PUT/DELETE …/contactos/:nro` · `PATCH …/contactos/:nro/principal` | PROVEEDORES | Un solo contacto principal. |
| `GET /bajas?q&desde&hasta` · `GET /bajas/:id` · `GET /bajas/lotes?q` | BAJAS | `/bajas/lotes`: lotes con stock para el selector. |
| `POST /bajas` `{id_lote, id_motivo_baja, cantidad, observaciones?}` · `PUT /bajas/:id` | BAJAS | El usuario sale de la sesión. |
| **Compras** | COMPRAS | |
| `GET /compras?q&desde&hasta&estado` · `GET /compras/:id` | | Total por `vw_totales_compra`, líneas por `vw_detalle_compra`. |
| `POST /compras` · `PUT /compras/:id` | | `{id_proveedor, id_metodo_pago, numero_factura_proveedor?, fecha_compra, observaciones?, detalles:[{id_producto, fecha_vencimiento?, cantidad, precio_unitario_compra}], completar?}`. Nace PENDIENTE; `completar:true` la registra de una vez. PUT solo en PENDIENTE. |
| `POST /compras/:id/completar` · `POST /compras/:id/anular` | | Anular solo mientras está PENDIENTE. |
| `POST /compras/:id/factura` (multipart, campo `factura`) · `GET /compras/:id/factura` | | PDF/JPG/PNG/WEBP hasta 5 MB, guardada en `UPLOAD_DIR`. |
| **Clientes y jornadas** | | |
| `GET /clientes` · `GET /clientes/:id` | CLIENTES o VENTAS | |
| `POST /clientes` · `PUT` · `PATCH …/estado` · `DELETE` | CLIENTES | Consumidor Final (`CLI-00000`) protegido. |
| `GET /jornadas/actual` | sesión | `null` si no hay jornada abierta. |
| `GET /jornadas?q&desde&hasta` · `GET /jornadas/:id` | JORNADAS | El detalle trae totales, base gravable, IVA y desglose por método de pago. |
| `POST /jornadas/abrir` · `POST /jornadas/cerrar` `{observaciones?}` | JORNADAS | Una sola abierta; no se cierra con ventas PENDIENTES. |
| **Ventas** | VENTAS | |
| `GET /ventas?q&desde&hasta&estado&mias&id_jornada` · `GET /ventas/:id` | | Con líneas (`vw_detalle_venta`) y totales (`vw_totales_venta`). El detalle es la base de la factura PDF. |
| `GET /ventas/catalogo?q` | | Productos activos con stock vendible, IVA, verificación de edad y próximo vencimiento. |
| `GET /ventas/mi-resumen` | | Ventas del usuario en la jornada abierta (app móvil). |
| `POST /ventas` `{id_cliente?, id_metodo_pago, observaciones?, productos?:[{id_producto, cantidad}], completar?}` | | Crea la venta PENDIENTE en la jornada abierta (cliente omitido = Consumidor Final). Con `productos` y `completar:true` registra todo en una llamada (POS móvil). |
| `PUT /ventas/:id` `{id_cliente, id_metodo_pago, observaciones?}` | | Revalida las líneas (p. ej. edad del nuevo cliente). |
| `POST /ventas/:id/productos` `{id_producto, cantidad}` | | Suma unidades. Reparte por FEFO entre lotes y reserva el stock. |
| `PUT /ventas/:id/productos/:idProducto` `{cantidad}` · `DELETE …` | | Fija la cantidad total (0 = quitar). |
| `POST /ventas/:id/completar` · `POST /ventas/:id/anular` | | Anular solo mientras está PENDIENTE (libera el stock). |
| **Dashboard** | REPORTES | |
| `GET /dashboard?desde&hasta` | | Ventas (total, base, IVA, pendientes), stock y alertas, más vendido, categoría líder, ventas por método de pago y por categoría, top 5, compras registradas, semáforo de stock por producto y lotes por vencer (15 días). La exportación PDF/Excel la arma el cliente con estos datos. |

`GET /api/health` (público) comprueba la conexión a MySQL.

## Decisiones y diferencias con otros documentos

- **Fuente de verdad: `sch.sql` V6.** Donde el Manual Técnico (capturas antiguas) difiere, manda el script: un solo método de pago por venta/compra (sin `venta_pago`); una venta COMPLETADA o una compra REGISTRADA **no se pueden anular** (el manual CU_06_08 aún muestra "Anular venta" sobre una COMPLETADA).
- **Consumidor Final y verificación de edad:** por decisión de negocio, a Consumidor Final (`CLI-00000`) y a la venta sin cliente se les vende cualquier producto; `sp_validar_detalle_venta` solo valida la edad de clientes registrados (`sch.sql` y `DATABASE.md` actualizados).
- **Cierre de jornada con ventas PENDIENTES:** se rechaza (regla agregada en el backend): esas ventas quedarían con stock reservado en una jornada cerrada donde ya no se pueden completar.
- **Recuperación de contraseña:** responde "No existe una cuenta registrada con ese correo" como pide CU_10_02, lo que permite averiguar qué correos existen. Si se prefiere, se cambia por un mensaje genérico.
- **Correo de bienvenida:** no incluye la contraseña; remite a "¿Olvidaste tu contraseña?".
- Vista nueva **`vw_detalle_venta`** (agregada a `sch.sql` y `DATABASE.md` sección 3).
- **Ventas simultáneas (varias cajas):** todo cambio de cantidad bloquea primero los lotes del producto (`ventasRepo.bloquearLotes`, siempre en el mismo orden) y las transacciones de ventas y bajas usan `READ COMMITTED` (`withTx(..., { lecturaConfirmada: true })`), para que los triggers validen el stock real tras esperar el bloqueo. Las ventas nuevas se numeran de a una bajo el bloqueo exclusivo de la jornada. `withTx` reintenta hasta 3 veces si MySQL detecta un interbloqueo. El test `ventas simultáneas del mismo producto` lo cubre.
- **Volumen:** probado con un año de datos sintéticos (≈62 mil ventas). Las pantallas de uso diario responden en menos de 0,5 s; el dashboard sin filtro de fechas, ~2 s. El stock se calcula sumando el historial (no hay columna de stock), así que estos tiempos crecen con los años.
- La baja automática de vencidos (HU_50) corre al iniciar sesión y cada 24 h mientras el servidor está arriba.
