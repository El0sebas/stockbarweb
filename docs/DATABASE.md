# Database Schema — StockBar

Documentación de la estructura de base de datos relacional (MySQL 8.0+ / MariaDB 10.5+). **Este es el script físico vigente** (`/scripts/sch.sql`, versión 3), ya probado contra un servidor real. Confirma nombres exactos de tablas, columnas, vistas y triggers; los pendientes reales de cierre de sprint quedan en la sección 7.

**v3 (observaciones de la profesora) — resumen de cambios respecto a v2:**
1. **Llaves primarias semánticas, sin `AUTO_INCREMENT` en ninguna tabla.** La aplicación asigna cada id con el formato que le corresponde (ver sección 2.1).
2. **`lote` redefinida:** un lote ES `(producto, fecha_vencimiento)`, ya no pertenece 1:1 a una compra. `detalle_compra` pasa a ser la verdadera relación M:N entre `compra` y `lote` (PK compuesta `id_compra, id_lote`), con la cantidad y el precio de esa entrada.
3. **Pago único:** se elimina `venta_pago`. `compra` y `venta` tienen cada una **un solo** `id_metodo_pago` (HU_39/HU_58 piden "forma/método de pago" en singular).
4. Vista nueva `vw_totales_jornada` (la Ficha pide el historial de jornadas con sus totales de venta) y `vw_detalle_compra`.
5. `usuario.fecha_nacimiento` sigue sin existir (decisión de negocio, no de la profesora — ver v2): nunca tuvo uso real, la verificación de edad siempre usa `cliente.fecha_nacimiento`.

Detalle completo, comentario por comentario, en el encabezado de `scripts/sch.sql`.

---

## 1. Niveles de organización de datos

La base de datos está estructurada en **3 niveles** que agrupan las tablas por función:

### Nivel 1 — Catálogos
`categoria`, `producto`, `proveedor`, `contacto_proveedor`, `cliente`, `metodo_pago`, `unidad_medida`, `motivo_baja`. Relativamente estáticas (bajo volumen de cambios).

### Nivel 2 — Seguridad
`rol`, `permiso`, `rol_permiso`, `usuario`. Autenticación, autorización y recuperación de acceso (el token de recuperación vive como dos columnas de `usuario`, no como tabla aparte — ver sección 2).

### Nivel 3 — Maestro‑Detalle
Tablas transaccionales con relaciones padre/hijo: `compra` → `detalle_compra` ←→ `lote` (una compra tiene detalles; cada detalle apunta a un lote, y el mismo lote puede recibir entradas de varias compras), `venta` → `detalle_venta` → `lote`, más `jornada` (turno de caja) y `baja_inventario` (mermas/vencimientos).

---

## 2.1. Formato de llaves primarias (v3 — sin AUTO_INCREMENT)

Ninguna tabla usa `AUTO_INCREMENT`. Cada PK la asigna la aplicación, en una de tres formas:

| Tipo | Tablas | Formato | Ejemplo |
|---|---|---|---|
| **Identificador que ya existe en el negocio** | `producto` (SKU), `proveedor` (NIT), `rol`, `permiso`, `metodo_pago`, `unidad_medida`, `motivo_baja` | libre, validado por `REGEXP` | `producto = 'CERV-PIL-330'`, `proveedor = '900123456-7'` |
| **Numerado por la app, prefijo + consecutivo** | `categoria`, `usuario`, `cliente`, `jornada`, `compra`, `lote`, `baja_inventario`, `venta` | `PREFIJO-NNNN…` validado por `CHECK ... REGEXP` | `CAT-001`, `USR-0001`, `CLI-00001`, `JOR-000001`, `CMP-000001`, `LOT-000001`, `BAJ-000001`, `VTA-000001` |
| **Detalle, llave compuesta con su maestro** | `detalle_compra(id_compra, id_lote)`, `detalle_venta(id_venta, id_lote)`, `contacto_proveedor(id_proveedor, nro_contacto)` | sin código propio | — |

Todas las columnas llave usan `CHARACTER SET ascii COLLATE ascii_bin` (sensibles a mayúsculas). La app asigna el siguiente consecutivo de cada prefijo dentro de la misma transacción (`SELECT MAX(...) ... FOR UPDATE`); el `CHECK` de cada tabla rechaza cualquier id que no cumpla el formato exacto.

---

## 2. Tablas por nivel

### Nivel 1: Catálogos

#### `categoria`
Agrupa productos (Licores, Cerveza, Cigarrillos, Snacks) y es la **única propietaria de la tarifa de IVA** que se cobra al cliente final.

```
Campos:
  - id_categoria (CHAR(7), PK) — formato CAT-001 (CHECK REGEXP '^CAT-[0-9]{3}$')
  - nombre (VARCHAR(50), UNIQUE, NOT NULL)
  - descripcion (VARCHAR(200), nullable)
  - margen_defecto_porcentaje (DECIMAL(5,2), NOT NULL, >= 0)
  - porcentaje_iva (DECIMAL(5,2), NOT NULL, DEFAULT 19.00, 0–100)
      19.00 general; 5.00 para Licores (tarifa diferencial licores/vinos/
      aperitivos >15° vigente en Colombia). Editable por un administrador
      si la ley cambia, sin tocar código ni el frontend.
  - requiere_verificacion_edad (BOOLEAN, NOT NULL, DEFAULT FALSE)

Índices:
  - PK: id_categoria
  - UNIQUE: nombre
```

**Sin `estado`:** la Ficha de Proyecto aprobada no lista "cambio de estado" en el alcance del subproceso de categorías (a diferencia de producto, proveedor, compra, cliente, venta, usuario y rol, que sí lo listan) — se sigue ese criterio aunque la Matriz de Historias de Usuario mencione un estado.

**Importante:** el impuesto al consumo de licores/cigarrillos (monofásico, pagado por el productor/importador) **no vive aquí ni en ninguna tabla de StockBar** — ya está diluido en `detalle_compra.precio_unitario_compra`. `categoria.porcentaje_iva` es exclusivamente el IVA que el cajero cobra al cliente final.

#### `producto`
Artículos vendibles. **No tiene columna de stock** — el stock siempre se calcula desde `lote` (ver `vw_stock_producto`, sección 3). El `id_producto` **es** el código SKU del negocio, no un número interno.

```
Campos:
  - id_producto (VARCHAR(30), PK) — código/SKU asignado por el negocio
      (CHECK REGEXP '^[A-Z0-9-]{3,30}$')
  - nombre (VARCHAR(120), NOT NULL)
  - descripcion (VARCHAR(255), nullable)
  - id_categoria (CHAR(7), FK → categoria.id_categoria, NOT NULL)
  - id_unidad_medida (CHAR(3), FK → unidad_medida.id_unidad_medida, NOT NULL)
  - margen_personalizado_porcentaje (DECIMAL(5,2), nullable, >= 0)
  - maneja_vencimiento (BOOLEAN, NOT NULL, DEFAULT TRUE)
      Solo una bandera de validación: exige fecha_vencimiento al crear un
      lote nuevo para este producto. No crea lotes por sí sola — los
      lotes solo nacen de una compra (ver `lote` más abajo).
  - precio_venta_actual (DECIMAL(12,2), NOT NULL, >= 0) — V4: precio final vigente; margen_defecto/personalizado solo sugieren. Histórico en detalle_venta.precio_unitario_venta
  - stock_minimo (DECIMAL(10,2), NOT NULL, DEFAULT 0, >= 0)
  - estado (BOOLEAN, NOT NULL, DEFAULT TRUE)
  - fecha_creacion (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

Índices:
  - PK: id_producto
  - FK: id_categoria, id_unidad_medida (InnoDB indexa automáticamente cada FK)
```

> **Eliminada `producto_proveedor`.** Qué proveedor suministró qué producto (y a qué precio) ya se sabe por `compra.id_proveedor → detalle_compra → lote.id_producto`; mantener la tabla aparte era redundante y ninguna historia de usuario pide un catálogo producto‑proveedor independiente de las compras reales.

#### `proveedor` / `contacto_proveedor`
Empresas que suministran productos, y sus contactos. `id_proveedor` **es** el NIT del proveedor.

```
proveedor:
  - id_proveedor (VARCHAR(20), PK) — el NIT (CHECK REGEXP '^[0-9]{5,15}(-[0-9])?$')
  - razon_social (VARCHAR(120), NOT NULL)
  - nombre_comercial (VARCHAR(120), nullable)
  - ciudad, direccion, telefono_principal, correo_principal (nullable)
  - fecha_registro (TIMESTAMP), estado (BOOLEAN, DEFAULT TRUE)

contacto_proveedor:
  - id_proveedor (FK → proveedor.id_proveedor) + nro_contacto (SMALLINT UNSIGNED)
      PK COMPUESTA (id_proveedor, nro_contacto) — nro_contacto es un
      consecutivo por proveedor (1, 2, 3…), no un id global.
  - nombres, apellidos (NOT NULL), cargo, telefono (NOT NULL), correo
  - es_principal (BOOLEAN), estado (BOOLEAN)
  - Un solo contacto "principal activo" por proveedor (columna generada
    + UNIQUE KEY, simula el índice parcial de Postgres que MySQL no tiene).
```

#### `cliente`
Compradores. Puede no existir en una venta de mostrador (`venta.id_cliente` es NULLABLE), pero si el producto exige verificación de edad, la venta rechaza clientes sin `fecha_nacimiento` válida.

```
Campos:
  - id_cliente (CHAR(9), PK) — formato CLI-00001 (CHECK REGEXP '^CLI-[0-9]{5}$')
  - tipo_documento (VARCHAR(5), CHECK IN ('CC','CE','TI','PAS','NIT'))
  - numero_documento (VARCHAR(20))
  - nombres, apellidos (NOT NULL)
  - fecha_nacimiento (DATE, nullable — validada por trigger, no CHECK: MySQL
    prohíbe CURRENT_DATE dentro de un CHECK)
  - genero, ciudad, direccion, telefono, correo (nullable)
  - fecha_registro (TIMESTAMP), estado (BOOLEAN)

Índices:
  - PK: id_cliente
  - UNIQUE: (tipo_documento, numero_documento)
```

#### Catálogos de apoyo
- `metodo_pago` (`id_metodo_pago CHAR(3)` p. ej. `EFE`, `nombre` UNIQUE, `estado`) — Efectivo, Nequi, Bancolombia.
- `unidad_medida` (`id_unidad_medida CHAR(3)` p. ej. `UND`, `nombre` UNIQUE) — Unidad, Botella, Six-pack, Cajetilla, Paquete.
- `motivo_baja` (`id_motivo_baja CHAR(3)` p. ej. `VEN`, `nombre` UNIQUE) — Vencimiento, Daño/Rotura, Ajuste de inventario, Pérdida/Robo.

---

### Nivel 2: Seguridad

#### `rol`, `permiso`, `rol_permiso`
```
rol:            id_rol (VARCHAR(10), p. ej. 'ADM'/'EMP'), nombre (UNIQUE), estado
permiso:        id_permiso (VARCHAR(30), p. ej. 'GESTIONAR_ROLES' — el código ES el nombre), modulo
rol_permiso:    PK compuesta (id_rol, id_permiso); FK id_rol con ON UPDATE CASCADE
                (la HU_04 permite editar la identificación del rol: se propaga)
```

**Sin `descripcion` en `rol` ni `nombre` separado en `permiso`:** ninguno se gestiona como entidad con ficha propia — el rol se identifica por su `nombre` (UNIQUE) y el permiso por su propio código (`id_permiso` es a la vez identificador y nombre legible, p. ej. `GESTIONAR_ROLES`).

**Protección del rol `ADMINISTRADOR`:** `trg_proteger_rol_administrador` rechaza `UPDATE rol SET estado=FALSE` cuando `nombre='ADMINISTRADOR'`. Cualquier otro rol (incluido `EMPLEADO`) se activa/desactiva libremente.

**Regla de aplicación (no de BD):** un rol no se puede crear sin al menos un permiso asignado. La BD no puede validarlo en el `INSERT INTO rol` porque los permisos se asignan después en `rol_permiso`; el backend debe envolver "crear rol" + "asignar permisos" en una transacción y rechazar el conjunto si el arreglo de permisos viene vacío.

#### `usuario`
```
Campos:
  - id_usuario (CHAR(8), PK) — formato USR-0001 (CHECK REGEXP '^USR-[0-9]{4}$')
  - tipo_documento (CHECK IN ('CC','CE','TI','PAS','NIT'))
  - numero_documento
  - nombres, apellidos (NOT NULL)
  - correo (VARCHAR(100), UNIQUE, NOT NULL)
  - telefono (nullable)
  - id_rol (VARCHAR(10), FK → rol.id_rol, NOT NULL, ON UPDATE CASCADE)
  - contrasena_hash (VARCHAR(255), NOT NULL) — Argon2id o bcrypt, nunca texto plano
  - token_recuperacion_hash (VARCHAR(255), nullable, UNIQUE)
  - token_recuperacion_expira (TIMESTAMP, nullable)
  - fecha_registro (TIMESTAMP), estado (BOOLEAN)
  - es_admin_principal (BOOLEAN, NOT NULL, DEFAULT FALSE) — marca al primer
    ADMINISTRADOR que existió en el sistema. Nunca editable desde el UI; la
    app la fija en TRUE una sola vez, en el arranque inicial.

Índices:
  - PK: id_usuario
  - UNIQUE: correo, (tipo_documento, numero_documento), token_recuperacion_hash
  - UNIQUE: admin_principal_unico (columna GENERATED sobre es_admin_principal
    — a lo sumo un usuario en todo el sistema puede tener esta marca).

CHECK:
  - ck_usuario_token_coherente: token_recuperacion_hash y
    token_recuperacion_expira deben ser ambos NULL o ambos NOT NULL.
```

**`usuario` NO tiene `fecha_nacimiento`.** Nunca tuvo un uso real en la aplicación: la verificación de edad para productos restringidos siempre lee `cliente.fecha_nacimiento` (la del comprador), nunca la del usuario que atiende la venta.

**Protección del admin principal:** `trg_proteger_admin_principal` rechaza desactivar a ese usuario (ni siquiera él mismo puede) y rechaza cambiar la marca una vez puesta. Dos reglas más viven en la capa de aplicación, no en la BD: solo un `ADMINISTRADOR` puede desactivar a otro usuario, y nadie puede desactivarse a sí mismo — el backend compara el `id_usuario` del JWT contra el `id_usuario` objetivo.

**Recuperación de contraseña sin tabla propia.** El flujo de "olvidé mi contraseña" (Subproceso de Acceso, HU_77) solo necesita un token vigente por usuario, no un historial — por eso son dos columnas de `usuario`, no una tabla de auditoría. La app genera un token aleatorio, guarda solo su **hash** y su vencimiento, envía el enlace por correo (SMTP) y, al usarse o vencer, pone ambas columnas en `NULL`.

---

### Nivel 3: Maestro‑Detalle

#### `jornada`
Turno de caja. Solo puede existir **una jornada ABIERTA a la vez** (columna generada + UNIQUE KEY). Una venta solo puede completarse si su jornada está ABIERTA.
```
  - id_jornada (CHAR(10), PK) — formato JOR-000001
  - id_usuario_apertura (FK), fecha_hora_apertura
  - id_usuario_cierre (FK, nullable), fecha_hora_cierre (nullable)
  - estado (CHECK IN ('ABIERTA','CERRADA'))
  - observaciones
```
El historial de jornadas con sus totales de venta (que pide la Ficha) se consulta por `vw_totales_jornada`, no por una columna guardada (sección 3).

#### `compra` (cabecera)
```
Campos:
  - id_compra (CHAR(10), PK) — formato CMP-000001
  - id_proveedor (FK → proveedor.id_proveedor, NOT NULL)
  - id_usuario (FK → usuario.id_usuario, NOT NULL)
  - id_metodo_pago (CHAR(3), FK → metodo_pago.id_metodo_pago, NOT NULL)
      "Forma de pago" (HU_39) — una sola por compra, no dividida.
  - numero_factura_proveedor (VARCHAR(40), nullable)
  - ruta_factura (VARCHAR(255), nullable) — URL/ruta del comprobante digitalizado
  - fecha_compra (DATE, NOT NULL)
  - fecha_registro (TIMESTAMP)
  - estado (VARCHAR(12), CHECK IN ('REGISTRADA','ANULADA'), DEFAULT 'REGISTRADA')
  - observaciones (VARCHAR(255), nullable)

Índices:
  - PK: id_compra
  - UNIQUE: (id_proveedor, numero_factura_proveedor) — evita registrar la misma factura dos veces
```

Dos estados: una compra nace `REGISTRADA` y su stock cuenta y es vendible **de inmediato**; desde `REGISTRADA` solo puede pasar a `ANULADA`, que es terminal (no puede reactivarse, y solo se permite si ninguno de sus lotes tiene ya movimientos de inventario) — ver `trg_validar_anulacion_compra`. El valor total **no se guarda**: se calcula en `vw_totales_compra`.

#### `lote` (producto + fecha de vencimiento — v3)
**Un lote ES la combinación `(producto, fecha_vencimiento)`, no una entrada de compra.** Si el mismo producto con el mismo vencimiento (o sin vencimiento) llega en compras distintas, es **el mismo lote** — sus entradas se acumulan vía `detalle_compra`. `lote` ya **no** guarda precio, cantidad, compra ni número de lote del proveedor: eso vive en `detalle_compra`.
```
Campos:
  - id_lote (CHAR(10), PK) — formato LOT-000001
  - id_producto (FK → producto.id_producto, NOT NULL)
  - fecha_vencimiento (DATE, nullable — NULL = producto sin vencimiento)
  - fecha_vencimiento_clave (DATE, GENERATED STORED = IFNULL(fecha_vencimiento, '9999-12-31'))
      Columna auxiliar: hace que el UNIQUE (producto, vencimiento) también
      funcione cuando el vencimiento es NULL (dos NULL no son "iguales"
      para una UNIQUE normal de SQL).

Índices:
  - PK: id_lote
  - UNIQUE: (id_producto, fecha_vencimiento_clave) — identidad real del lote
  - FK: id_producto
```

La identidad del lote (producto + vencimiento) **no se edita** una vez creado (`trg_validar_lote_upd` lo rechaza); si una compra trae un vencimiento distinto, la línea apunta a otro lote (el mismo producto puede tener varios lotes abiertos con vencimientos distintos).

#### `detalle_compra` (la relación compra ↔ lote — v3)
PK compuesta `(id_compra, id_lote)`: qué lote recibió entradas en esa compra, cuánto y a qué precio. **El precio de compra vive aquí, una sola vez** (nunca en `lote`).
```
Campos:
  - id_compra (FK → compra.id_compra)
  - id_lote (FK → lote.id_lote)
      PK COMPUESTA (id_compra, id_lote)
  - cantidad (DECIMAL(10,2), NOT NULL, > 0) — cantidad de ESTA entrada
  - precio_unitario_compra (DECIMAL(12,2), NOT NULL, >= 0)
```

`sp_agregar_detalle_compra(compra, producto, vencimiento, cantidad, precio, lote_nuevo)` es el procedimiento de conveniencia que la app llama por cada línea: busca el lote por `(producto, vencimiento)`, lo crea si no existe (usando el id que la app ya generó), y agrega la entrada en `detalle_compra`. Un mismo `detalle_compra` no puede reducirse (editar/eliminar) por debajo del stock ya vendido o dado de baja de ese lote (`trg_validar_detalle_compra_upd/_del`).

**Baja automática de vencidos:** `sp_dar_baja_lotes_vencidos(p_id_usuario)` da de baja (motivo `VEN`) todos los lotes con `fecha_vencimiento < CURDATE()` y stock disponible > 0 (usa `GET_LOCK` para numerar `BAJ-######` sin colisiones si corre dos veces a la vez). La BD no se ejecuta sola: el backend debe llamarlo una vez al día (cron de aplicación, no el EVENT SCHEDULER de MySQL).

El **stock disponible no es una columna**: se calcula con `fn_stock_lote(id_lote)` = entradas de `detalle_compra` en compras `REGISTRADA` − unidades vendidas en ventas PENDIENTE/COMPLETADA − unidades dadas de baja. Ver `vw_stock_lotes` / `vw_stock_producto`.

#### `baja_inventario`
Mermas: vencimiento, daño, ajuste, pérdida/robo. Resta contra `fn_stock_lote`.
```
  - id_baja (CHAR(10), PK) — formato BAJ-000001
  - id_lote (FK), id_motivo_baja (FK), cantidad (> 0)
  - fecha_hora, id_usuario (FK), observaciones
```

#### `venta` (cabecera)
```
Campos:
  - id_venta (CHAR(10), PK) — formato VTA-000001
  - id_cliente (FK → cliente.id_cliente, NULLABLE — venta de mostrador sin cliente formal)
  - id_jornada (FK → jornada.id_jornada, NOT NULL)
  - id_usuario (FK → usuario.id_usuario, NOT NULL)
  - id_metodo_pago (CHAR(3), FK → metodo_pago.id_metodo_pago, NOT NULL)
      "Método de pago" (HU_58) — una sola por venta, no dividida.
  - fecha_hora_venta (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - estado (VARCHAR(12), CHECK IN ('PENDIENTE','COMPLETADA','ANULADA'), DEFAULT 'PENDIENTE')
  - observaciones (nullable)
```

Flujo obligatorio: `INSERT venta` (queda PENDIENTE, con su método de pago ya fijo) → `INSERT detalle_venta` (una o más líneas; reserva el stock del lote) → `CALL sp_completar_venta(id_venta)` (valida que tenga al menos un detalle y total > 0). Una venta ANULADA no puede reactivarse; anular una venta PENDIENTE o COMPLETADA libera el stock reservado.

> **Eliminada `venta_pago`.** La versión anterior permitía pago dividido en varios métodos; las historias de usuario (HU_58) piden "método de pago" en singular, así que `venta.id_metodo_pago` basta. El total pagado/pendiente ya no aplica como concepto — el total de la venta se calcula en `vw_totales_venta`.

#### `detalle_venta`
```
Campos:
  - id_venta (FK → venta.id_venta)
  - id_lote (FK → lote.id_lote)
      PK COMPUESTA (id_venta, id_lote)
  - cantidad (DECIMAL(10,2), NOT NULL, > 0)
  - precio_unitario_venta (DECIMAL(12,2), NOT NULL, >= 0)
      Precio FINAL que paga el cliente, con el IVA ya incluido — igual
      que en cualquier mostrador real. El frontend NUNCA suma el IVA
      aparte al armar el carrito.
  - porcentaje_impuesto_aplicado (DECIMAL(5,2), NOT NULL, DEFAULT 0, 0–100)
      La rellena automáticamente `trg_validar_detalle_venta_ins/upd` desde
      `categoria.porcentaje_iva` (vía `lote.id_producto → producto.id_categoria`)
      en el momento de la venta, y queda congelada ahí para siempre. El
      frontend/API nunca la envía ni la escribe a mano.
```

---

## 3. Vistas SQL (solo lectura — todo lo derivado se calcula, no se guarda)

El backend consulta estas vistas para todo lo que sea agregación o cálculo repetido; los controladores no reimplementan estos joins/fórmulas en el código de aplicación.

### `vw_stock_lotes`
Cada lote con su cantidad ingresada y disponible ya calculadas. Filtrar por `id_producto` para mostrar, en el detalle de un producto, la lista de lotes de solo lectura que explica de dónde sale el stock.

```sql
SELECT l.id_lote, l.id_producto, p.nombre AS producto, l.fecha_vencimiento,
       p.maneja_vencimiento,
       (SELECT COALESCE(SUM(dc.cantidad), 0) FROM detalle_compra dc
          JOIN compra c ON c.id_compra = dc.id_compra
         WHERE dc.id_lote = l.id_lote AND c.estado = 'REGISTRADA') AS cantidad_ingresada,
       fn_stock_lote(l.id_lote) AS cantidad_disponible
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto;
```

### `vw_stock_producto`
Stock total por producto (suma de `vw_stock_lotes` de todos sus lotes) y bandera de bajo stock. **Esta es la única fuente del "stock actual" de un producto** — nunca un campo editable en `producto`.

```sql
SELECT p.id_producto, p.nombre, p.stock_minimo,
       COALESCE(SUM(s.cantidad_disponible), 0) AS stock_actual,
       CASE WHEN COALESCE(SUM(s.cantidad_disponible), 0) <= p.stock_minimo THEN TRUE ELSE FALSE END AS bajo_stock
FROM producto p
LEFT JOIN vw_stock_lotes s ON s.id_producto = p.id_producto
GROUP BY p.id_producto, p.nombre, p.stock_minimo;
```

### `vw_detalle_compra`
Detalle de una compra con producto, vencimiento y subtotal ya resueltos por `JOIN` — para pintar la tabla de líneas en el formulario/detalle de compra.

```sql
SELECT dc.id_compra, l.id_producto, p.nombre AS producto, l.id_lote, l.fecha_vencimiento,
       dc.cantidad, dc.precio_unitario_compra,
       dc.cantidad * dc.precio_unitario_compra AS subtotal
FROM detalle_compra dc
JOIN lote l ON l.id_lote = dc.id_lote
JOIN producto p ON p.id_producto = l.id_producto;
```

### `vw_totales_compra`
Total de una compra = suma de sus `detalle_compra` (nunca una columna guardada).

```sql
SELECT c.id_compra, c.id_proveedor, c.fecha_compra, c.estado,
       COALESCE(SUM(dc.cantidad * dc.precio_unitario_compra), 0) AS total_compra
FROM compra c
LEFT JOIN detalle_compra dc ON dc.id_compra = c.id_compra
GROUP BY c.id_compra, c.id_proveedor, c.fecha_compra, c.estado;
```

### `vw_totales_venta`
Desglose fiscal de cada venta: base gravable, IVA y total. Úsala para pintar el desglose (subtotal / IVA / total) en el carrito y en el recibo — no reimplementar la fórmula en JS.

```sql
SELECT v.id_venta, v.estado,
       fn_base_gravable_venta(v.id_venta) AS base_gravable,
       fn_iva_venta(v.id_venta) AS iva,
       fn_total_venta(v.id_venta) AS total_venta,
       v.id_metodo_pago
FROM venta v;
```

`base_gravable` se obtiene descontando el IVA congelado por línea de `precio_unitario_venta` (que ya lo incluye): `cantidad * precio_unitario_venta / (1 + porcentaje_impuesto_aplicado/100)`.

### `vw_totales_jornada`
Historial de jornadas con sus totales de venta — la Ficha de Proyecto lo pide explícitamente en el Subproceso de Jornada ("revisar el historial de jornadas con sus totales de ventas").

```sql
SELECT j.id_jornada, j.estado, j.fecha_hora_apertura, j.id_usuario_apertura,
       j.fecha_hora_cierre, j.id_usuario_cierre,
       COUNT(v.id_venta) AS ventas_completadas,
       COALESCE(SUM(fn_total_venta(v.id_venta)), 0) AS total_ventas
FROM jornada j
LEFT JOIN venta v ON v.id_jornada = j.id_jornada AND v.estado = 'COMPLETADA'
GROUP BY j.id_jornada, j.estado, j.fecha_hora_apertura, j.id_usuario_apertura,
         j.fecha_hora_cierre, j.id_usuario_cierre;
```

---

## 4. Triggers y procedimientos

| Trigger | Evento | Qué hace |
|---|---|---|
| `trg_validar_cliente_ins` / `_upd` | BEFORE INSERT/UPDATE `cliente` | Rechaza `fecha_nacimiento` futura (vía `sp_validar_cliente`; CHECK no puede usar `CURDATE()` en MySQL). |
| `trg_proteger_rol_administrador` | BEFORE UPDATE `rol` | Rechaza desactivar el rol `ADMINISTRADOR`. |
| `trg_proteger_admin_principal` | BEFORE UPDATE `usuario` | Rechaza desactivar al admin principal y rechaza modificar la marca `es_admin_principal`. |
| `trg_validar_lote_ins` | BEFORE INSERT `lote` | Exige `fecha_vencimiento` si `producto.maneja_vencimiento`. |
| `trg_validar_lote_upd` | BEFORE UPDATE `lote` | Rechaza cambiar `id_producto` o `fecha_vencimiento` de un lote ya creado (la identidad del lote es inmutable). |
| `trg_validar_detalle_compra_ins` | BEFORE INSERT `detalle_compra` | Exige que el vencimiento del lote sea al menos 15 días posterior a `fecha_compra`, y que la compra no esté ANULADA. |
| `trg_validar_detalle_compra_upd` | BEFORE UPDATE `detalle_compra` | Igual validación de vencimiento; además rechaza reducir la cantidad si el lote ya tiene ventas/bajas que la requieren. |
| `trg_validar_detalle_compra_del` | BEFORE DELETE `detalle_compra` | Rechaza eliminar una entrada si el lote ya tiene ventas/bajas que la requieren. |
| `trg_validar_baja_ins` / `_upd` | BEFORE INSERT/UPDATE `baja_inventario` | Rechaza una baja mayor al disponible del lote. |
| `trg_validar_detalle_venta_ins` / `_upd` | BEFORE INSERT/UPDATE `detalle_venta` | Valida jornada abierta, venta no ANULADA/COMPLETADA, stock disponible, vencimiento del lote y edad mínima (18) si la categoría lo exige; **rellena `porcentaje_impuesto_aplicado`** desde `categoria.porcentaje_iva`. |
| `trg_validar_venta_ins` / `_upd` | BEFORE INSERT/UPDATE `venta` | Si `estado = 'COMPLETADA'`: exige jornada ABIERTA, cliente activo (si hay) y usuario activo. |
| `trg_validar_cierre_venta_ins` / `_upd` | AFTER INSERT/UPDATE `venta` | Cuando `estado` pasa a `COMPLETADA`: exige al menos un detalle y total > 0. |
| `trg_validar_anulacion_venta` | BEFORE UPDATE `venta` | Impide reactivar una venta ANULADA. |
| `trg_validar_anulacion_compra` | BEFORE UPDATE `compra` | Solo permite `REGISTRADA → ANULADA`, y solo si ninguno de sus lotes tiene ya movimientos de inventario (ventas o bajas); `ANULADA` es terminal. |
| `trg_validar_jornada_ins` / `_upd` | BEFORE INSERT/UPDATE `jornada` | Exige/prohíbe datos de cierre según el estado. |

**Funciones auxiliares** (usadas por triggers y vistas, no expuestas al frontend): `fn_stock_lote`, `fn_total_venta`, `fn_base_gravable_venta`, `fn_iva_venta`.

**Procedimientos de conveniencia**: `sp_agregar_detalle_compra(...)` (busca o crea el lote y agrega la entrada en una sola llamada); `sp_completar_venta(id_venta)` (paso final del flujo de venta); `sp_dar_baja_lotes_vencidos(id_usuario)` (baja automática diaria, con `GET_LOCK` para numerar `BAJ-######` sin colisiones concurrentes).

---

## 5. Convenciones y buenas prácticas

1. **Tablas en singular, español** (`producto`, `venta`, `lote`), nunca mezclar con plural.
2. **Primary Key:** semántica, asignada por la aplicación — ver sección 2.1. Ninguna tabla usa `AUTO_INCREMENT`.
3. **Foreign Keys:** patrón `id_<tabla_referenciada>`. InnoDB indexa automáticamente cada FK — no hace falta declarar índices adicionales a mano.
4. **Booleanos de estado:** `BOOLEAN` (no ENUM 'activo'/'inactivo'), `DEFAULT TRUE`.
5. **Estados de ciclo de vida** (`compra.estado`, `venta.estado`, `jornada.estado`): `VARCHAR` + `CHECK ... IN (...)`, no ENUM, para poder inspeccionar valores permitidos sin `SHOW COLUMNS`.
6. **Dinero:** `DECIMAL(12,2)` o `DECIMAL(14,2)` en agregados; nunca `FLOAT`.
7. **Porcentajes** (`porcentaje_iva`, `margen_*_porcentaje`): `DECIMAL(5,2)`, CHECK entre 0 y 100.
8. **Contraseñas:** nunca texto plano; `contrasena_hash VARCHAR(255)` con Argon2id o bcrypt.
9. **Vistas:** prefijo `vw_`. **Funciones:** prefijo `fn_`. **Procedimientos:** prefijo `sp_`. **Triggers:** prefijo `trg_`.
10. **Validaciones que dependen de la fecha actual** (`CURDATE()`, `NOW()`) van en un trigger + `SIGNAL SQLSTATE '45000'`, nunca en un CHECK constraint (MySQL 8 prohíbe funciones no deterministas ahí).

---

## 6. Relaciones entre tablas (diagrama entidad‑relación)

```
Catálogos (Nivel 1):
  categoria ──→ producto (1:N)
  proveedor ──→ contacto_proveedor (1:N)
  cliente (standalone)

Seguridad (Nivel 2):
  rol ──→ rol_permiso ←── permiso (N:N)
  usuario → rol (N:1)
  [token de recuperación = columnas de usuario, no es tabla aparte]

Maestro‑Detalle (Nivel 3):
  usuario ──→ jornada (1:N, apertura/cierre)

  proveedor ──→ compra (1:N)
  usuario ──→ compra (1:N) [auditoría]
  metodo_pago ──→ compra (1:N) [forma de pago única]
  producto ──→ lote (1:N) [lote = producto + vencimiento]
  compra ──→ detalle_compra ←── lote (N:N real: una compra trae varios
    lotes, y un lote puede recibir entradas de varias compras)
  lote ──→ baja_inventario (1:N) ←── motivo_baja

  cliente ──→ venta (1:N) [NULLABLE: venta de mostrador]
  jornada ──→ venta (1:N)
  usuario ──→ venta (1:N) [auditoría]
  metodo_pago ──→ venta (1:N) [método de pago único]
  venta ──→ detalle_venta (1:N) ←── lote  [nunca ←── producto directamente]

Cascadas / reglas de borrado:
  - No hay ON DELETE CASCADE en las tablas transaccionales: todo histórico
    (lote, detalle_compra, detalle_venta) se conserva; los "borrados" de
    negocio son cambios de estado (compra/venta → ANULADA, catálogos →
    estado = FALSE), nunca DELETE físico.
  - Excepción puntual: una entrada de detalle_compra SÍ puede eliminarse
    (trg_validar_detalle_compra_del), pero solo mientras su lote no tenga
    ventas ni bajas que dependan de ella.
```

---

## 7. Pendientes reales (no asumir, señalar si bloquean una tarea)

- Diagrama de Clases y Modelo Relacional formal en notación UML/IE (Sprint 05) — este documento y `scripts/sch.sql` ya son la fuente de verdad de columnas/tipos/relaciones, falta el diagrama visual.
- Diagrama de Despliegue C4 formal (Sprint 09).
- Manuales Técnico y de Usuario (v1‑v4).
- Matriz de historias de usuario con criterios de aceptación — este script referencia HU_04, HU_39, HU_50, HU_58 y HU_77 por número; el documento con el texto completo de cada HU no está en este repositorio.
- Tarifas de IVA de negocio: la tabla trae 5.00 % (Licores) / 19.00 % (resto) como referencia pública de la normativa colombiana; deben confirmarse con el contador del negocio antes de producción (son datos, editables sin migración, no lógica de código).
- No hay todavía un backend Node/Express real que consuma este script — mientras eso no exista, el frontend web opera en modo mock (localStorage) reflejando estos mismos nombres de campo para que la futura integración sea un cambio de fuente de datos, no de forma.
- **Migración v3 pendiente en el mock (web y móvil):** el frontend todavía usa ids numéricos autoincrementales (`id_producto: 1, 2, 3…`) en vez de los formatos semánticos de esta versión (SKU, NIT, `CMP-000001`, etc.), y `VentasPage`/`ComprasPage` todavía permiten pago dividido en varios métodos (`venta.pagos: []`), que ya no existe en el modelo v3 (un solo `id_metodo_pago`). Esto se está migrando — ver el estado real del código en `src/pages/` antes de asumir que ya coincide con este documento.

---

## 8. Cómo actualizar este documento

1. **Si cambia el modelo de datos:** editar `scripts/sch.sql` primero, luego la sección 2 aquí.
2. **Si se agregan vistas:** igual orden — script primero, sección 3 después.
3. **Si se agregan/modifican triggers o funciones:** script primero, sección 4 después.
4. Todo campo que un formulario del frontend muestre o edite debe poder señalarse aquí como columna real (regla de oro del proyecto, ver `CLAUDE.md`).
