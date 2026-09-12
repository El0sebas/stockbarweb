# Database Schema — StockBar

Documentación de la estructura de base de datos relacional (MySQL). **Nota:** este es un esquema preliminar basado en los 10 subprocesos y los niveles documentados en el proyecto (Catálogos, Seguridad, Maestro‑Detalle). El script SQL definitivo se entregará en el **Sprint 08**; cuando llegue, este documento se actualizará con la estructura final, índices y triggers reales.

---

## 1. Niveles de organización de datos

La base de datos está estructurada en **3 niveles** que agrupan las tablas por función:

### Nivel 1 — Catálogos
Tablas de referencia que definen los productos, categorías, proveedores y clientes del negocio. Son relativamente estáticas (bajo volumen de cambios).

### Nivel 2 — Seguridad
Tablas de autenticación, autorización y auditoría: usuarios, roles, permisos y sesiones. Gestión de acceso al sistema.

### Nivel 3 — Maestro‑Detalle
Tablas transaccionales de negocio con relaciones padre/hijo: compras (cabecera/detalle), ventas (cabecera/detalle) y movimientos de inventario.

---

## 2. Tablas por nivel

### Nivel 1: Catálogos

#### `categorias`
Agrupa productos por tipos (Licores, Cigarrillos, Confitería, etc.).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(100), UNIQUE, NOT NULL)
  - descripcion (TEXT, nullable)
  - estado (ENUM: 'activo', 'inactivo')
  - fecha_creacion (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - UNIQUE: nombre
```

#### `productos`
Artículos individuales que se venden (botellas, cigarrillos, dulces, etc.).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(150), NOT NULL)
  - categoria_id (INT, FK → categorias.id, NOT NULL)
  - precio_costo (DECIMAL(10,2), nullable)
  - precio_venta (DECIMAL(10,2), NOT NULL)
  - stock (INT, DEFAULT 0)
  - stock_minimo (INT, DEFAULT 5) — umbral para alertas de bajo stock
  - sku (VARCHAR(50), UNIQUE, nullable) — código de artículo
  - estado (ENUM: 'activo', 'inactivo', 'descontinuado')
  - fecha_creacion (TIMESTAMP)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - FK: categoria_id
  - UNIQUE: sku
  - INDEX: estado (para filtros rápidos)
```

#### `proveedores`
Empresas o personas que suministran los productos a StockBar.

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(150), NOT NULL)
  - contacto (VARCHAR(100), nullable)
  - telefono (VARCHAR(20), nullable)
  - email (VARCHAR(100), nullable)
  - direccion (VARCHAR(255), nullable)
  - estado (ENUM: 'activo', 'inactivo')
  - fecha_creacion (TIMESTAMP)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - INDEX: estado
```

#### `clientes`
Personas que compran en StockBar (datos opcionales para reportes de frecuencia/preferencias).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(150), nullable) — puede ser anónimo
  - telefono (VARCHAR(20), nullable)
  - email (VARCHAR(100), nullable)
  - fecha_registro (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - estado (ENUM: 'activo', 'inactivo')
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - INDEX: estado
```

---

### Nivel 2: Seguridad

#### `roles`
Perfiles de acceso del sistema (Administrador, Empleado Auxiliar, etc.).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(100), UNIQUE, NOT NULL) — p. ej. 'Administrador', 'Auxiliar_Ventas'
  - descripcion (TEXT, nullable)
  - estado (ENUM: 'activo', 'inactivo', DEFAULT 'activo')
  - fecha_creacion (TIMESTAMP)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - UNIQUE: nombre
```

#### `permisos`
Acciones discretas que se pueden permitir o denegar (p. ej. VENTAS_CREAR, COMPRAS_REGISTRAR, USUARIOS_ELIMINAR).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - nombre (VARCHAR(100), UNIQUE, NOT NULL)
  - descripcion (TEXT, nullable)
  - modulo (VARCHAR(50), nullable) — p. ej. 'ventas', 'compras', 'seguridad'
  - estado (ENUM: 'activo', 'inactivo', DEFAULT 'activo')
  - fecha_creacion (TIMESTAMP)

Índices:
  - PK: id
  - UNIQUE: nombre
  - INDEX: modulo
```

#### `rol_permisos`
Tabla de asociación muchos‑a‑muchos entre roles y permisos (configura qué puede hacer cada rol).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - rol_id (INT, FK → roles.id, NOT NULL)
  - permiso_id (INT, FK → permisos.id, NOT NULL)
  - fecha_asignacion (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - FK: rol_id, permiso_id
  - UNIQUE: (rol_id, permiso_id) — evita duplicados
```

#### `usuarios`
Cuentas de acceso al sistema (Administrador y Empleado Auxiliar).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - email (VARCHAR(150), UNIQUE, NOT NULL)
  - hash_contraseña (VARCHAR(255), NOT NULL) — BCRYPT o similar, nunca texto plano
  - nombre (VARCHAR(150), NOT NULL)
  - rol_id (INT, FK → roles.id, NOT NULL)
  - estado (ENUM: 'activo', 'inactivo', 'suspendido', DEFAULT 'activo')
  - ultimo_acceso (DATETIME, nullable)
  - fecha_creacion (TIMESTAMP)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - UNIQUE: email
  - FK: rol_id
  - INDEX: estado
```

#### `sesiones` (opcional, recomendado para auditoría)
Registro de accesos para auditoría y detección de actividades sospechosas.

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - usuario_id (INT, FK → usuarios.id, NOT NULL)
  - token_jwt (VARCHAR(500), nullable) — para validación rápida
  - ip_direccion (VARCHAR(45), nullable)
  - fecha_inicio (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - fecha_cierre (DATETIME, nullable)
  - estado (ENUM: 'activa', 'cerrada')

Índices:
  - PK: id
  - FK: usuario_id
  - INDEX: estado
```

---

### Nivel 3: Maestro‑Detalle

#### `compras` (cabecera)
Documento de entrada de mercancía desde un proveedor.

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - proveedor_id (INT, FK → proveedores.id, NOT NULL)
  - numero_factura (VARCHAR(50), nullable)
  - fecha_compra (DATE, NOT NULL)
  - total (DECIMAL(12,2), NOT NULL) — suma calculada de compra_detalle
  - estado (ENUM: 'pendiente', 'recibida', 'completada', 'cancelada', DEFAULT 'pendiente')
  - observaciones (TEXT, nullable)
  - usuario_id (INT, FK → usuarios.id, nullable) — quién registró la compra
  - fecha_creacion (TIMESTAMP)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - FK: proveedor_id, usuario_id
  - INDEX: estado, fecha_compra
  - UNIQUE: numero_factura (por proveedor)
```

#### `compra_detalle` (detalle)
Líneas de la compra: producto, cantidad, precio unitario.

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - compra_id (INT, FK → compras.id, NOT NULL)
  - producto_id (INT, FK → productos.id, NOT NULL)
  - cantidad (INT, NOT NULL, > 0)
  - precio_unitario (DECIMAL(10,2), NOT NULL)
  - subtotal (DECIMAL(12,2), NOT NULL) — cantidad * precio_unitario

Índices:
  - PK: id
  - FK: compra_id, producto_id
  - INDEX: compra_id (búsquedas rápidas de líneas por compra)
```

#### `ventas` (cabecera)
Transacción de venta a un cliente.

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - cliente_id (INT, FK → clientes.id, nullable) — cliente anónimo si es NULL
  - usuario_id (INT, FK → usuarios.id, NOT NULL) — quién registra la venta
  - fecha_venta (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
  - total (DECIMAL(12,2), NOT NULL) — suma de venta_detalle
  - metodo_pago (ENUM: 'efectivo', 'nequi', 'bancolombia', 'transferencia', 'otro')
  - estado (ENUM: 'completada', 'devuelta', 'cancelada', DEFAULT 'completada')
  - referencia_pago (VARCHAR(100), nullable) — id de transacción externa (Nequi, etc.)
  - observaciones (TEXT, nullable)
  - fecha_modificacion (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

Índices:
  - PK: id
  - FK: cliente_id, usuario_id
  - INDEX: estado, fecha_venta, metodo_pago
```

#### `venta_detalle` (detalle)
Líneas de la venta: producto, cantidad, precio (al momento de venta, puede diferir del precio actual del producto).

```
Campos:
  - id (INT, PK, AUTO_INCREMENT)
  - venta_id (INT, FK → ventas.id, NOT NULL)
  - producto_id (INT, FK → productos.id, NOT NULL)
  - cantidad (INT, NOT NULL, > 0)
  - precio_unitario (DECIMAL(10,2), NOT NULL) — precio de venta en el momento
  - subtotal (DECIMAL(12,2), NOT NULL) — cantidad * precio_unitario

Índices:
  - PK: id
  - FK: venta_id, producto_id
  - INDEX: venta_id
```

---

## 3. Vistas SQL (para dashboard, reportes, datos de solo lectura)

Las vistas **reducen la complejidad** del backend al concentrar joins y cálculos en la BD. El backend consulta vistas, no escribe en ellas; el controlador de reportes/dashboard las consume tal cual.

### `vw_inventario_actual`
Estado actual de stock por producto, con indicador de bajo stock.

```sql
-- Pseudocódigo SQL (sintaxis final en Sprint 08)
SELECT 
    p.id,
    p.nombre,
    c.nombre AS categoria,
    p.stock,
    p.stock_minimo,
    CASE WHEN p.stock <= p.stock_minimo THEN 'BAJO' ELSE 'OK' END AS alerta_stock,
    p.precio_venta,
    p.estado
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
WHERE p.estado = 'activo'
ORDER BY p.stock, c.nombre;
```

**Uso en backend:** `GET /api/dashboard/inventario` → consulta esta vista y la retorna al frontend para la tabla de inventario.

### `vw_ventas_detalle`
Resumen de ventas con cliente, productos, totales y detalles de pago.

```sql
-- Pseudocódigo
SELECT 
    v.id AS venta_id,
    v.fecha_venta,
    COALESCE(cl.nombre, 'Cliente Anónimo') AS cliente,
    u.nombre AS vendedor,
    GROUP_CONCAT(p.nombre SEPARATOR ', ') AS productos,
    SUM(vd.cantidad) AS total_items,
    v.total,
    v.metodo_pago,
    v.estado
FROM ventas v
LEFT JOIN clientes cl ON v.cliente_id = cl.id
JOIN usuarios u ON v.usuario_id = u.id
JOIN venta_detalle vd ON v.id = vd.venta_id
JOIN productos p ON vd.producto_id = p.id
GROUP BY v.id
ORDER BY v.fecha_venta DESC;
```

**Uso en backend:** `GET /api/dashboard/ventas` → para el dashboard administrativo y exportación de reportes de ventas.

### `vw_compras_detalle`
Resumen de compras con proveedor, productos y totales.

```sql
-- Pseudocódigo
SELECT 
    c.id AS compra_id,
    c.fecha_compra,
    pr.nombre AS proveedor,
    c.numero_factura,
    GROUP_CONCAT(p.nombre SEPARATOR ', ') AS productos,
    SUM(cd.cantidad) AS total_items,
    c.total,
    c.estado
FROM compras c
JOIN proveedores pr ON c.proveedor_id = pr.id
JOIN compra_detalle cd ON c.id = cd.compra_id
JOIN productos p ON cd.producto_id = p.id
GROUP BY c.id
ORDER BY c.fecha_compra DESC;
```

**Uso en backend:** `GET /api/dashboard/compras` — para análisis de aprovisionamiento.

### `vw_kpis_dashboard`
Indicadores principales para el panel del administrador (ingresos, egresos, productos más vendidos, variaciones).

```sql
-- Pseudocódigo
SELECT 
    DATE(v.fecha_venta) AS fecha,
    SUM(v.total) AS ingresos_dia,
    COUNT(DISTINCT v.id) AS num_ventas,
    (SELECT SUM(c.total) FROM compras c WHERE DATE(c.fecha_compra) = DATE(v.fecha_venta)) AS egresos_dia,
    (SELECT nombre FROM productos p 
     JOIN venta_detalle vd ON p.id = vd.producto_id 
     WHERE vd.venta_id IN (SELECT id FROM ventas WHERE DATE(fecha_venta) = DATE(v.fecha_venta))
     GROUP BY p.id ORDER BY SUM(vd.cantidad) DESC LIMIT 1) AS producto_mas_vendido
FROM ventas v
GROUP BY DATE(v.fecha_venta)
ORDER BY fecha DESC
LIMIT 30;
```

**Uso en backend:** `GET /api/dashboard/kpis` — para gráficos, tarjetas de resumen y alertas.

### `vw_usuarios_roles_permisos`
Matriz de usuarios, sus roles asignados y los permisos que hereda cada rol (para pantalla de administración de accesos).

```sql
-- Pseudocódigo
SELECT 
    u.id AS usuario_id,
    u.email,
    u.nombre,
    r.nombre AS rol,
    GROUP_CONCAT(pe.nombre SEPARATOR '; ') AS permisos,
    u.estado
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos pe ON rp.permiso_id = pe.id
GROUP BY u.id
ORDER BY u.email;
```

**Uso en backend:** `GET /api/admin/usuarios-roles-permisos` — para auditoría y gestión de accesos.

---

## 4. Triggers (desnormalización controlada por rendimiento)

Los triggers garantizan que ciertos cálculos y actualizaciones ocurran **automáticamente en la base de datos**, evitando latencia en la app y asegurando consistencia.

### `tr_descuento_inventario_post_venta`
**Evento:** Después de insertar una línea en `venta_detalle`.  
**Acción:** Restar la cantidad vendida del stock en `productos.stock`.

```sql
-- Pseudocódigo
AFTER INSERT ON venta_detalle FOR EACH ROW
BEGIN
    UPDATE productos 
    SET stock = stock - NEW.cantidad
    WHERE id = NEW.producto_id;
END;
```

**Beneficio:** El descuento de inventario es **instantáneo** y transacional (si la venta se revierte, el stock se restaura automáticamente).

### `tr_actualizar_fecha_modificacion`
**Evento:** Antes de actualizar en cualquier tabla.  
**Acción:** Llenar el campo `fecha_modificacion` con el timestamp actual.

```sql
-- Pseudocódigo, aplica a todas las tablas con campo fecha_modificacion
BEFORE UPDATE ON [tabla] FOR EACH ROW
BEGIN
    SET NEW.fecha_modificacion = NOW();
END;
```

### `tr_recalcular_total_compra` (optional)
**Evento:** Después de insertar/actualizar `compra_detalle`.  
**Acción:** Recalcular el total en la cabecera `compras.total`.

```sql
-- Pseudocódigo
AFTER INSERT ON compra_detalle FOR EACH ROW
BEGIN
    UPDATE compras 
    SET total = (SELECT SUM(subtotal) FROM compra_detalle WHERE compra_id = NEW.compra_id)
    WHERE id = NEW.compra_id;
END;
```

---

## 5. Convenciones y buenas prácticas

1. **Nombres de tablas en singular en inglés** (o plural en español, consistentemente): `producto` o `productos`, nunca mezclar.
2. **Primary Key:** siempre `id`, auto-incremento, INT o BIGINT.
3. **Foreign Keys:** nombre patrón `tabla_id` (p. ej. `categoria_id`, `usuario_id`).
4. **Timestamps:** `fecha_creacion` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP, inmutable) y `fecha_modificacion` (TIMESTAMP ON UPDATE, se actualiza con triggers).
5. **Estados:** usar ENUM cuando hay un conjunto fijo y pequeño de valores (activo/inactivo, pendiente/completada, etc.).
6. **Precios/dinero:** DECIMAL(12,2) mínimo, nunca FLOAT.
7. **Contraseñas:** nunca texto plano; siempre hash (BCRYPT, Argon2, etc.) y mínimo 255 caracteres en la columna.
8. **Campos sensibles:** no registrar tokens JWT completos; usar columnas de sesión dedicadas.
9. **Índices:** sobre campos usados en WHERE, JOIN, ORDER BY y GROUP BY.
10. **Vistas:** nombrarlas con prefijo `vw_` para distinguirlas de tablas.

---

## 6. Relaciones entre tablas (diagrama entidad‑relación)

```
Catálogos (Nivel 1):
  categorias ──→ productos (1:N)
  proveedores (stand‑alone)
  clientes (stand‑alone)

Seguridad (Nivel 2):
  roles ──→ rol_permisos ←── permisos (N:N)
  usuarios → roles (N:1)
  usuarios → sesiones (1:N)

Maestro‑Detalle (Nivel 3):
  compras ──→ compra_detalle ←── productos
  proveedores ──→ compras (1:N)
  usuarios ──→ compras (1:N) [auditoría: quién registró]

  ventas ──→ venta_detalle ←── productos
  clientes ──→ ventas (1:N) [puede ser NULL: cliente anónimo]
  usuarios ──→ ventas (1:N) [auditoría: quién registró]

Cascadas:
  - Si un proveedor se elimina: compras asociadas se marcan como inactivas (ON DELETE SET NULL) o se rechazan (ON DELETE RESTRICT).
  - Si un producto se elimina: líneas de compra_detalle y venta_detalle quedan intactas (histórico); el producto se marca como 'descontinuado'.
  - Si un usuario se elimina: sus compras y ventas se mantienen con referencia a su ID (auditoría histórica).
```

---

## 7. Pendientes del Sprint 08

Cuando se entregue el script SQL definitivo del proyecto:

- [ ] Confirmar todos los tipos de datos (DECIMAL vs NUMERIC, VARCHAR vs CHAR, etc.).
- [ ] Validar índices y performance (EXPLAIN PLAN).
- [ ] Confirmar nombres exactos de tablas, columnas y vistas.
- [ ] Confirmar triggers y su lógica de negocio.
- [ ] Agregar constraints de CHECK (p. ej. precio_venta > 0, stock >= 0).
- [ ] Definir estrategia de particionamiento (si aplica para tablas históricas grandes).
- [ ] Script de datos iniciales (roles por defecto, permisos, categorías de referencia).

---

## 8. Cómo actualizar este documento

1. **Si cambia el modelo de datos:** editar la sección 2 (Tablas).
2. **Si se agregan vistas:** editar la sección 3.
3. **Si se agregan/modifican triggers:** editar la sección 4.
4. **Cuando llegue Sprint 08:** reemplazar pseudocódigos SQL con scripts reales y confirmar todas las convenciones.