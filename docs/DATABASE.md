# Database Schema — StockBar

Documentación de la estructura de base de datos relacional (MySQL 8.0+ / MariaDB 10.5+). **Este es el script físico vigente** (`/scripts/sch.sql`), ya probado contra un servidor real, y reemplaza el template preliminar anterior. Confirma nombres exactos de tablas, columnas, vistas y triggers; los pendientes reales de cierre de sprint quedan en la sección 7.

---

## 1. Niveles de organización de datos

La base de datos está estructurada en **3 niveles** que agrupan las tablas por función:

### Nivel 1 — Catálogos
`categoria`, `producto`, `producto_proveedor`, `proveedor`, `contacto_proveedor`, `cliente`, `metodo_pago`, `unidad_medida`, `motivo_baja`. Relativamente estáticas (bajo volumen de cambios).

### Nivel 2 — Seguridad
`rol`, `permiso`, `rol_permiso`, `usuario`, `recuperacion_contrasena`. Autenticación, autorización y recuperación de acceso.

### Nivel 3 — Maestro‑Detalle
Tablas transaccionales con relaciones padre/hijo: `compra` → `lote` (una compra siempre genera lotes), `venta` → `detalle_venta` → `venta_pago`, más `jornada` (turno de caja) y `baja_inventario` (mermas/vencimientos).

---

## 2. Tablas por nivel

### Nivel 1: Catálogos

#### `categoria`
Agrupa productos (Licores, Cerveza, Cigarrillos, Snacks) y es la **única propietaria de la tarifa de IVA** que se cobra al cliente final.

```
Campos:
  - id_categoria (INT UNSIGNED, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(50), UNIQUE, NOT NULL)
  - descripcion (VARCHAR(200), nullable)
  - margen_defecto_porcentaje (DECIMAL(5,2), NOT NULL, >= 0)
  - porcentaje_iva (DECIMAL(5,2), NOT NULL, DEFAULT 19.00, 0–100)
      19.00 general; 5.00 para Licores (tarifa diferencial licores/vinos/
      aperitivos >15° vigente en Colombia desde abril 2026). Editable por
      un administrador si la ley cambia, sin tocar código ni el frontend.
  - requiere_verificacion_edad (BOOLEAN, NOT NULL, DEFAULT FALSE)
  - estado (BOOLEAN, NOT NULL, DEFAULT TRUE)

Índices:
  - PK: id_categoria
  - UNIQUE: nombre
```

**Importante:** el impuesto al consumo de licores/cigarrillos (monofásico, pagado por el productor/importador) **no vive aquí ni en ninguna tabla de StockBar** — ya está diluido en `lote.precio_unitario_compra`. `categoria.porcentaje_iva` es exclusivamente el IVA que el cajero cobra al cliente final.

#### `producto`
Artículos vendibles. **No tiene columna de stock** — el stock siempre se calcula desde `lote` (ver `vw_stock_producto`, sección 3).

```
Campos:
  - id_producto (INT UNSIGNED, PK, AUTO_INCREMENT)
  - codigo_sku (VARCHAR(30), UNIQUE, NOT NULL)
  - nombre (VARCHAR(120), NOT NULL)
  - descripcion (VARCHAR(255), nullable)
  - id_categoria (INT UNSIGNED, FK → categoria.id_categoria, NOT NULL)
  - id_unidad_medida (SMALLINT UNSIGNED, FK → unidad_medida.id_unidad_medida, NOT NULL)
  - margen_personalizado_porcentaje (DECIMAL(5,2), nullable, >= 0)
  - maneja_vencimiento (BOOLEAN, NOT NULL, DEFAULT TRUE)
      Solo una bandera de validación: exige fecha_vencimiento al crear un
      lote nuevo para este producto. No crea lotes por sí sola — los
      lotes solo nacen de una compra (ver `lote` más abajo).
  - stock_minimo (DECIMAL(10,2), NOT NULL, DEFAULT 0, >= 0)
  - estado (BOOLEAN, NOT NULL, DEFAULT TRUE)
  - fecha_creacion (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

Índices:
  - PK: id_producto
  - UNIQUE: codigo_sku
  - FK: id_categoria, id_unidad_medida (InnoDB indexa automáticamente cada FK)
```

#### `producto_proveedor`
Relación opcional N:N — qué proveedores suministran cada producto y a qué precio de referencia.

```
Campos:
  - id_producto (INT UNSIGNED, FK → producto.id_producto)
  - id_proveedor (INT UNSIGNED, FK → proveedor.id_proveedor)
  - precio_referencia (DECIMAL(12,2), nullable, >= 0)
  - estado (BOOLEAN, NOT NULL, DEFAULT TRUE)

Índices:
  - PK compuesta: (id_producto, id_proveedor)
```

#### `proveedor` / `contacto_proveedor`
Empresas que suministran productos, y sus contactos.

```
proveedor:
  - id_proveedor (INT UNSIGNED, PK, AUTO_INCREMENT)
  - nit (VARCHAR(20), UNIQUE, NOT NULL)
  - razon_social (VARCHAR(120), NOT NULL)
  - nombre_comercial (VARCHAR(120), nullable)
  - ciudad, direccion, telefono_principal, correo_principal (nullable)
  - fecha_registro (TIMESTAMP), estado (BOOLEAN, DEFAULT TRUE)

contacto_proveedor:
  - id_contacto (INT UNSIGNED, PK, AUTO_INCREMENT)
  - id_proveedor (FK → proveedor.id_proveedor, NOT NULL)
  - nombres, apellidos (NOT NULL), cargo, telefono (NOT NULL), correo
  - es_principal (BOOLEAN), estado (BOOLEAN)
  - Un solo contacto "principal activo" por proveedor (columna generada
    + UNIQUE KEY, simula el índice parcial de Postgres que MySQL no tiene).
```

#### `cliente`
Compradores. Puede no existir en una venta de mostrador (`venta.id_cliente` es NULLABLE), pero si el producto exige verificación de edad, la venta rechaza clientes sin `fecha_nacimiento` válida.

```
Campos:
  - id_cliente (INT UNSIGNED, PK, AUTO_INCREMENT)
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
- `metodo_pago` (id_metodo_pago, nombre UNIQUE, estado) — Efectivo, Nequi, Bancolombia.
- `unidad_medida` (id_unidad_medida, nombre UNIQUE) — Unidad, Botella, Six-pack, Cajetilla, Paquete.
- `motivo_baja` (id_motivo_baja, nombre UNIQUE) — Vencimiento, Daño/Rotura, Ajuste de inventario, Pérdida/Robo.

---

### Nivel 2: Seguridad

#### `rol`, `permiso`, `rol_permiso`
```
rol:            id_rol, nombre (UNIQUE), estado
permiso:        id_permiso, nombre (UNIQUE), descripcion, modulo
rol_permiso:    PK compuesta (id_rol, id_permiso)
```

#### `usuario`
```
Campos:
  - id_usuario (INT UNSIGNED, PK, AUTO_INCREMENT)
  - tipo_documento (CHECK IN ('CC','CE','TI','PAS','NIT'))
  - numero_documento
  - nombres, apellidos (NOT NULL)
  - correo (VARCHAR(100), UNIQUE, NOT NULL)
  - telefono (nullable)
  - id_rol (FK → rol.id_rol, NOT NULL)
  - contrasena_hash (VARCHAR(255), NOT NULL) — Argon2id o bcrypt, nunca texto plano
  - fecha_nacimiento (DATE, NOT NULL)
  - fecha_registro (TIMESTAMP), estado (BOOLEAN)

Índices:
  - PK: id_usuario
  - UNIQUE: correo, (tipo_documento, numero_documento)
```

#### `recuperacion_contrasena`
Token de un solo uso enviado por SMTP para el flujo de "olvidé mi contraseña".
```
  - id_token (PK), id_usuario (FK), token (UNIQUE)
  - fecha_generacion, fecha_expiracion (CHECK: expiracion > generacion)
  - usado (BOOLEAN, DEFAULT FALSE)
```

---

### Nivel 3: Maestro‑Detalle

#### `jornada`
Turno de caja. Solo puede existir **una jornada ABIERTA a la vez** (columna generada + UNIQUE KEY). Una venta solo puede completarse si su jornada está ABIERTA.
```
  - id_jornada (PK), id_usuario_apertura (FK), fecha_hora_apertura
  - id_usuario_cierre (FK, nullable), fecha_hora_cierre (nullable)
  - estado (CHECK IN ('ABIERTA','CERRADA'))
  - observaciones
```

#### `compra` (cabecera)
```
Campos:
  - id_compra (INT UNSIGNED, PK, AUTO_INCREMENT)
  - id_proveedor (FK → proveedor.id_proveedor, NOT NULL)
  - id_usuario (FK → usuario.id_usuario, NOT NULL)
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

Una compra ANULADA no puede reactivarse, y no puede anularse si alguno de sus lotes ya tuvo movimiento (venta o baja) — ver `trg_validar_anulacion_compra`.

#### `lote` (detalle de compra — también es el inventario)
**Todo lote nace de una compra**; `id_compra` es `NOT NULL` y no existe un lote suelto. Cada línea que se agrega en el formulario de Compras crea una fila aquí.
```
Campos:
  - id_lote (INT UNSIGNED, PK, AUTO_INCREMENT)
  - id_compra (FK → compra.id_compra, NOT NULL)
  - id_producto (FK → producto.id_producto, NOT NULL)
  - cantidad (DECIMAL(10,2), NOT NULL, > 0) — cantidad comprada, inmutable
  - precio_unitario_compra (DECIMAL(12,2), NOT NULL, >= 0)
  - fecha_vencimiento (DATE, nullable — obligatoria si producto.maneja_vencimiento)
  - numero_lote_proveedor (VARCHAR(40), nullable)

Índices:
  - PK: id_lote
  - FK: id_compra, id_producto
```

El **stock disponible no es una columna**: se calcula con `fn_stock_lote(id_lote)` = `cantidad` − unidades vendidas en ventas PENDIENTE/COMPLETADA − unidades dadas de baja. Ver `vw_stock_lotes` / `vw_stock_producto`.

#### `baja_inventario`
Mermas: vencimiento, daño, ajuste, pérdida/robo. Resta contra `fn_stock_lote`.
```
  - id_baja (PK), id_lote (FK), id_motivo_baja (FK), cantidad (> 0)
  - fecha_hora, id_usuario (FK), observaciones
```

#### `venta` (cabecera)
```
Campos:
  - id_venta (INT UNSIGNED, PK, AUTO_INCREMENT)
  - id_cliente (FK → cliente.id_cliente, NULLABLE — venta de mostrador sin cliente formal)
  - id_jornada (FK → jornada.id_jornada, NOT NULL)
  - id_usuario (FK → usuario.id_usuario, NOT NULL)
  - fecha_hora_venta (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - estado (VARCHAR(12), CHECK IN ('PENDIENTE','COMPLETADA','ANULADA'), DEFAULT 'PENDIENTE')
  - observaciones (nullable)
```

Flujo obligatorio: `INSERT venta` (queda PENDIENTE) → `INSERT detalle_venta` (una o más líneas) → `INSERT venta_pago` (uno o más pagos) → `CALL sp_completar_venta(id_venta)` (dispara la validación de cuadre total = pagado). Una venta ANULADA no puede reactivarse; anular una PENDIENTE libera el stock reservado.

#### `detalle_venta`
```
Campos:
  - id_detalle_venta (PK)
  - id_venta (FK → venta.id_venta, NOT NULL)
  - id_lote (FK → lote.id_lote, NOT NULL)
  - cantidad (DECIMAL(10,2), NOT NULL, > 0)
  - precio_unitario_venta (DECIMAL(12,2), NOT NULL, >= 0)
      Precio FINAL que paga el cliente, con el IVA ya incluido — igual
      que en cualquier mostrador real. El frontend NUNCA suma el IVA
      aparte al armar el carrito.
  - porcentaje_impuesto_aplicado (DECIMAL(5,2), NOT NULL, DEFAULT 0, 0–100)
      La rellena automáticamente `trg_validar_detalle_venta_ins/upd` desde
      `categoria.porcentaje_iva` en el momento de la venta, y queda
      congelada ahí para siempre. El frontend/API nunca la envía ni la
      escribe a mano.
```

#### `venta_pago`
```
  - id_venta_pago (PK), id_venta (FK), id_metodo_pago (FK)
  - monto (DECIMAL(12,2), > 0), referencia_transaccion (nullable)
```
No se pueden modificar/eliminar pagos de una venta ya COMPLETADA.

---

## 3. Vistas SQL (solo lectura, para dashboard, detalle de producto y recibos)

El backend consulta estas vistas para todo lo que sea agregación o cálculo repetido; los controladores no reimplementan estos joins/fórmulas en el código de aplicación.

### `vw_stock_lotes`
Cada lote con su cantidad disponible ya calculada (`fn_stock_lote`). Filtrar por `id_producto` para mostrar, en el detalle de un producto, la lista de lotes de solo lectura que explica de dónde sale el stock.

```sql
SELECT l.id_lote, l.id_producto, p.codigo_sku, p.nombre AS producto,
       l.id_compra, l.cantidad AS cantidad_inicial,
       fn_stock_lote(l.id_lote) AS cantidad_disponible,
       l.precio_unitario_compra, l.fecha_vencimiento, p.maneja_vencimiento,
       c.fecha_compra, c.estado AS estado_compra
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto
JOIN compra c ON c.id_compra = l.id_compra;
```

### `vw_stock_producto`
Stock total por producto (suma de `vw_stock_lotes` de compras REGISTRADA) y bandera de bajo stock. **Esta es la única fuente del "stock actual" de un producto** — nunca un campo editable en `producto`.

```sql
SELECT p.id_producto, p.codigo_sku, p.nombre, p.stock_minimo,
       COALESCE(SUM(s.cantidad_disponible), 0) AS stock_actual,
       CASE WHEN COALESCE(SUM(s.cantidad_disponible), 0) <= p.stock_minimo THEN TRUE ELSE FALSE END AS bajo_stock
FROM producto p
LEFT JOIN vw_stock_lotes s ON s.id_producto = p.id_producto AND s.estado_compra = 'REGISTRADA'
GROUP BY p.id_producto, p.codigo_sku, p.nombre, p.stock_minimo;
```

### `vw_totales_venta`
Desglose fiscal de cada venta: base gravable, IVA y total, más el cuadre de pago. Úsala para pintar el desglose (subtotal / IVA / total) en el carrito y en el recibo — no reimplementar la fórmula en JS.

```sql
SELECT v.id_venta, v.estado,
       fn_base_gravable_venta(v.id_venta) AS base_gravable,
       fn_iva_venta(v.id_venta) AS iva,
       fn_total_venta(v.id_venta) AS total_venta,
       fn_total_pagado(v.id_venta) AS total_pagado,
       (fn_total_venta(v.id_venta) - fn_total_pagado(v.id_venta)) AS diferencia_pago
FROM venta v;
```

`base_gravable` se obtiene descontando el IVA congelado por línea de `precio_unitario_venta` (que ya lo incluye): `cantidad * precio_unitario_venta / (1 + porcentaje_impuesto_aplicado/100)`.

---

## 4. Triggers (desnormalización controlada por rendimiento)

| Trigger | Evento | Qué hace |
|---|---|---|
| `trg_validar_cliente_ins` / `_upd` | BEFORE INSERT/UPDATE `cliente` | Rechaza `fecha_nacimiento` futura (vía `sp_validar_cliente`; CHECK no puede usar `CURDATE()` en MySQL). |
| `trg_validar_lote_ins` / `_upd` | BEFORE INSERT/UPDATE `lote` | Exige `fecha_vencimiento` si `producto.maneja_vencimiento`; rechaza vencimiento anterior a la fecha de compra. |
| `trg_validar_baja_ins` / `_upd` | BEFORE INSERT/UPDATE `baja_inventario` | Rechaza una baja mayor al disponible del lote. |
| `trg_validar_detalle_venta_ins` / `_upd` | BEFORE INSERT/UPDATE `detalle_venta` | Valida jornada abierta, venta no ANULADA/COMPLETADA, stock disponible, vencimiento del lote y edad mínima (18) si la categoría lo exige; **rellena `porcentaje_impuesto_aplicado`** desde `categoria.porcentaje_iva`. |
| `trg_validar_venta_ins` / `_upd` | BEFORE INSERT/UPDATE `venta` | Si `estado = 'COMPLETADA'`: exige jornada ABIERTA, cliente activo (si hay) y usuario activo. |
| `trg_validar_cierre_venta_ins` / `_upd` | AFTER INSERT/UPDATE `venta` | Cuando `estado` pasa a `COMPLETADA`: exige al menos un detalle, total > 0 y `total_venta = total_pagado`. |
| `trg_bloquear_pago_ins` / `_upd` / `_del` | BEFORE INSERT/UPDATE/DELETE `venta_pago` | Bloquea cambios a los pagos de una venta ya COMPLETADA. |
| `trg_validar_anulacion_venta` | BEFORE UPDATE `venta` | Impide reactivar una venta ANULADA. |
| `trg_validar_anulacion_compra` | BEFORE UPDATE `compra` | Impide reactivar una compra ANULADA, y anular una compra cuyos lotes ya tuvieron movimientos. |
| `trg_validar_jornada_ins` / `_upd` | BEFORE INSERT/UPDATE `jornada` | Exige/prohíbe datos de cierre según el estado. |

**Funciones auxiliares** (usadas por triggers y vistas, no expuestas al frontend): `fn_stock_lote`, `fn_total_venta`, `fn_base_gravable_venta`, `fn_iva_venta`, `fn_total_pagado`.

**Procedimientos de conveniencia**: `sp_completar_venta(id_venta)` para el paso final del flujo de venta (equivalente a `UPDATE venta SET estado='COMPLETADA'`).

---

## 5. Convenciones y buenas prácticas

1. **Tablas en singular, español** (`producto`, `venta`, `lote`), nunca mezclar con plural.
2. **Primary Key:** `id_<tabla>`, `INT UNSIGNED AUTO_INCREMENT` (`SMALLINT UNSIGNED` para catálogos pequeños como `rol`/`permiso`/`metodo_pago`/`unidad_medida`/`motivo_baja`).
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
  producto ──→ producto_proveedor ←── proveedor (N:N)
  proveedor ──→ contacto_proveedor (1:N)
  cliente (standalone)

Seguridad (Nivel 2):
  rol ──→ rol_permiso ←── permiso (N:N)
  usuario → rol (N:1)
  usuario → recuperacion_contrasena (1:N)

Maestro‑Detalle (Nivel 3):
  usuario ──→ jornada (1:N, apertura/cierre)

  proveedor ──→ compra (1:N)
  usuario ──→ compra (1:N) [auditoría]
  compra ──→ lote (1:N) ←── producto  [todo lote nace de una compra]
  lote ──→ baja_inventario (1:N) ←── motivo_baja

  cliente ──→ venta (1:N) [NULLABLE: venta de mostrador]
  jornada ──→ venta (1:N)
  usuario ──→ venta (1:N) [auditoría]
  venta ──→ detalle_venta (1:N) ←── lote  [nunca ←── producto directamente]
  venta ──→ venta_pago (1:N) ←── metodo_pago

Cascadas / reglas de borrado:
  - No hay ON DELETE CASCADE en las tablas transaccionales: todo histórico
    (lote, detalle_venta, venta_pago) se conserva; los "borrados" de
    negocio son cambios de estado (compra/venta → ANULADA, catálogos →
    estado = FALSE), nunca DELETE físico.
```

---

## 7. Pendientes reales (no asumir, señalar si bloquean una tarea)

- Diagrama de Clases y Modelo Relacional formal en notación UML/IE (Sprint 05) — este documento y `scripts/sch.sql` ya son la fuente de verdad de columnas/tipos/relaciones, falta el diagrama visual.
- Diagrama de Despliegue C4 formal (Sprint 09).
- Manuales Técnico y de Usuario (v1‑v4).
- Matriz de historias de usuario con criterios de aceptación.
- Tarifas de IVA de negocio: la tabla trae 5.00 % (Licores) / 19.00 % (resto) como referencia pública de la normativa colombiana 2026; deben confirmarse con el contador del negocio antes de producción (son datos, editables sin migración, no lógica de código).
- No hay todavía un backend Node/Express real que consuma este script — mientras eso no exista, el frontend web opera en modo mock (localStorage) reflejando estos mismos nombres de campo para que la futura integración sea un cambio de fuente de datos, no de forma.

---

## 8. Cómo actualizar este documento

1. **Si cambia el modelo de datos:** editar `scripts/sch.sql` primero, luego la sección 2 aquí.
2. **Si se agregan vistas:** igual orden — script primero, sección 3 después.
3. **Si se agregan/modifican triggers o funciones:** script primero, sección 4 después.
4. Todo campo que un formulario del frontend muestre o edite debe poder señalarse aquí como columna real (regla de oro del proyecto, ver `CLAUDE.md`).
