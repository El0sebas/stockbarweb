# Contexto de frontend — StockBar (para rediseño en Figma)

Este documento resume el estado **actual e implementado** del frontend (web + móvil), para usarlo como referencia al editar la plantilla de Figma. No es un plan a futuro: todo lo aquí descrito ya funciona en código. Ver también `SISTEMA_DE_DISENO.md` para colores/tokens exactos.

Repos: `stockbar-web` (React + Bootstrap 5) y `stockbar_mobile` (Flutter). Ambos son **mock-only**: no hay backend todavía, los datos viven en `localStorage` (web) o en memoria (móvil), con catálogos semilla compartidos entre pantallas para que todo esté correlacionado.

---

## 1. Web — Inventario de pantallas

| Módulo | Página (listado) | Modales |
|---|---|---|
| Dashboard | `DashboardPage` | — |
| Roles | `RolesPage` | `RolFormModal`, `RolDetailModal` |
| Usuarios | `UsuariosPage` | `UsuarioFormModal`, `UsuarioDetailModal` |
| Categorías | `CategoriasPage` | `CategoriaFormModal`, `CategoriaDetailModal` |
| Productos | `ProductosPage` | `ProductoFormModal`, `ProductoDetailModal` |
| Proveedores | `ProveedoresPage` | `ProveedorFormModal`, `ProveedorDetailModal` |
| Métodos de Pago | `MetodosPagoPage` | `MetodoPagoFormModal` |
| Compras | `ComprasPage` | `ComprasFormModal` (también hace de detalle/edición) |
| Clientes | `ClientesPage` | `ClienteFormModal`, `ClienteDetailModal` |
| Ventas | `VentasPage` | Modal de registro embebido en la misma página |

Layout: `MainLayout` (header + sidebar + contenido) envuelve todas las páginas tras el login (`Login.jsx`).

### Dashboard (`DashboardPage`)

4 tarjetas KPI + 3 gráficas de barras + lista de alertas, **todo calculado sobre datos reales** (no hay cifras inventadas):

- **KPIs**: Ingresos por Ventas (suma de ventas `Completado`), Productos Activos, Compras Pendientes, Alertas de Stock (productos con `stockActual <= stockMinimo`).
- **Gráficas** (`BarList`): Ventas por estado (Completado/Pendiente), Compras por estado (Recibida/Pendiente), Stock por producto (top 6, en rojo si está en alerta).
- **Alertas de bajo stock**: lista con nombre, categoría y badge "actual / mín."

### Roles (`RolesPage`)

Tabla: código, nombre, descripción, cantidad de permisos, acciones. El rol "Administrador" es de sistema (`isSystem: true`) — sus acciones de editar/eliminar aparecen deshabilitadas con tooltip explicando por qué, en vez de ocultarse. El formulario permite marcar permisos por módulo (checklist de 9 módulos: Roles, Usuarios, Categorías, Productos, Proveedores, Compras, Clientes, Ventas, Reportes) — granularidad a nivel de módulo, no de permiso individual (ej. no distingue `VENTAS_CREAR` de `VENTAS_VER`).

### Usuarios (`UsuariosPage`)

Comparte clave de almacenamiento con el login: un usuario creado aquí puede iniciar sesión de inmediato. Columnas: documento, usuario (nombre+correo), teléfono, rol (badge con color determinístico por hash — cualquier rol nuevo obtiene un color consistente sin tocar código), estado, acciones. El selector de rol en el formulario lee el catálogo real de `RolesPage` (crear un rol nuevo lo hace aparecer aquí automáticamente). El usuario "Administrador" semilla tiene edición/eliminación bloqueadas igual que el rol.

### Categorías (`CategoriasPage`)

CRUD simple: código, nombre, descripción, estado (aquí el estado es informativo, sin toggle — las categorías no tienen ciclo de vida complejo).

### Productos (`ProductosPage`)

Columnas: código, nombre, categoría, precio de venta, % impuesto, stock (badge rojo si `stock <= stockMinimo`), estado (`StatusToggle`), acciones. Campos del formulario incluyen `precio_incluye_impuesto` y `maneja_vencimiento` (booleanos).

### Proveedores (`ProveedoresPage`)

CRUD estándar: código, nombre, contacto, teléfono, estado (`StatusToggle`), acciones.

### Métodos de Pago (`MetodosPagoPage`)

Catálogo simple (id, nombre, estado) consumido dinámicamente por los selectores de método de pago en Ventas y Compras — desactivar un método aquí lo quita de esos selectores de inmediato.

### Compras (`ComprasPage` + `ComprasFormModal`)

- Listado: factura, proveedor, método, fecha, total, estado, acciones.
- **Estado de una sola vía**: nace `Pendiente`, se marca `Recibida` con un clic en el badge del listado (no se puede revertir). No hay selector de estado en el formulario.
- El formulario arma la compra por proveedor → productos del proveedor → cantidad/costo/lote/vencimiento. Cada línea agregada recibe un **id generado por el sistema** (nunca editable por el usuario).
- Diseño en dos columnas: datos de cabecera arriba, tabla de líneas agregadas abajo con total calculado.

### Ventas (`VentasPage`)

- Listado: ID venta, cliente, fecha, productos (resumen), total, estado.
- **Estado de una sola vía**: nace `Pendiente`, se marca `Completado` con un clic en el switch del listado (bloqueado una vez completado).
- Modal "Registrar venta web": cliente + método de pago (dropdowns) arriba; **lista buscable de productos** (no tarjetas en fila) con un input de búsqueda y, junto al precio, un badge secundario ámbar "Por vencer (Nd)" **solo si** el lote más próximo vence en ≤15 días — es una sugerencia visual, nunca bloquea ni prioriza nada.
- Sistema de **lotes real**: cada producto puede tener varios lotes con fecha de vencimiento y cantidad disponible; el stock mostrado es la suma de lotes vigentes; al vender se descuenta en orden **FEFO** (primero el lote que vence antes).

---

## 2. Móvil (Flutter) — Inventario de pantallas

Alcance: **Acceso + Ventas** (según la ficha del proyecto), con Dashboard/Inicio agregado para el rol Administrador.

| Pantalla | Archivo | Quién la ve |
|---|---|---|
| Login | `login_screen.dart` | Todos |
| Recuperar contraseña | `_RecoverySheet` (dentro de login_screen.dart) | Todos, desde login |
| Inicio (Dashboard) | `main_layout.dart` → `HomeScreen` | Solo Administrador |
| Ventas | `ventas_screen.dart` | Todos (Administrador y Empleado Auxiliar) |

No existe pantalla de Stock independiente — se retiró intencionalmente para ceñirse al alcance de la ficha (Acceso + Ventas); el Dashboard sigue mostrando una alerta de stock crítico como KPI, sin una pantalla CRUD dedicada.

### Login (`login_screen.dart`)

- Logo StockBar (3 barras de colores, isotipo propio) + toggle de tema arriba a la derecha.
- Campos correo/contraseña con mostrar/ocultar contraseña, checkbox "Recordar usuario".
- "¿Olvidaste tu contraseña?" abre un bottom sheet con flujo de 2 pasos: generar token → ingresar token + nueva contraseña (mock, sin envío de correo real).
- Autentica contra `mockUsuarios` (mismo criterio que el login web: username/password planos porque es mock, sin backend).

### Inicio / Dashboard (`HomeScreen`, dentro de `main_layout.dart`)

3 tarjetas apiladas, calculadas sobre datos reales (mismo criterio que el dashboard web):
- **Ingresos** (suma de ventas `Listo`) + cantidad total de ventas.
- **Stock Crítico** (productos con stock disponible ≤5, calculado por lotes).
- **Ventas Pendientes** (conteo).

### Ventas (`ventas_screen.dart`)

- Listado ("Historial de Transacciones") con buscador, cada venta muestra ícono de estado (✓ verde si "Listo", reloj ámbar si "Pendiente"), cliente, método, total, y un botón "Marcar como listo" (una sola vía, desaparece una vez completada).
- FAB "Nueva Venta" abre un bottom sheet con:
  - Cliente + Método de pago (dropdowns, en columna si la pantalla es angosta).
  - **Buscador de productos** + lista vertical (mismo patrón que la web: nada de tarjetas en fila). Cada fila muestra precio + stock disponible, y el badge ámbar "Por vencer (Nd)" si aplica.
  - Al tocar "+" se abre un **diálogo para elegir cuántas unidades** entregar (stepper −/+, tope = stock real disponible), en vez de agregar 1 unidad a ciegas.
  - Carrito con cada línea mostrando el **lote asignado**, y un stepper −/+ para ajustar la cantidad después de agregada.
  - Total general y botón "Confirmar Venta", siempre visibles (el contenido de en medio es lo único que hace scroll, para que nunca haya overflow).
  - Al confirmar, se **descuenta stock real** de los lotes (FEFO), igual que en la web.

---

## 3. Modelo de datos (mock, compartido entre pantallas)

Todo vive en `src/data/*.js` (web) o `lib/data/mock_data.dart` (móvil) — una sola fuente por entidad, nunca copias locales por pantalla.

- **Roles**: `codigo, nombre, descripcion, permisos[], isSystem`. Semilla: Administrador (system) y Empleado_Auxiliar.
- **Usuarios**: `id_usuario, documento, nombre, correo, telefono, rol, password, estado, fechaRegistro`.
- **Productos**: `codigo, nombre, descripcion, categoria, precioVenta, porcentaje_impuesto, precio_incluye_impuesto, maneja_vencimiento, stockActual, stockMinimo, estado` (web) — en móvil, el stock es por `lotes[]` (`id_lote, numero_lote, fecha_vencimiento, cantidad_disponible`), no un número plano.
- **Métodos de pago**: `id_metodo_pago, nombre, estado`.
- **Compras**: `id, factura, proveedor, metodoPago, rutaFactura, fecha, total, estado` + líneas con `id_detalle` generado por el sistema.
- **Ventas**: `idVenta, cliente, fecha, productos[], total, estado, metodoPago, referenciaPago`.
- **Ventas (catálogo de lotes)**: cada producto vendible tiene `lotes[]` con `id_lote, numero_lote, fecha_vencimiento, cantidad_disponible` — el stock real es la suma de lotes vigentes (no vencidos, con cantidad > 0), ordenados por fecha de vencimiento ascendente (FEFO).

---

## 4. Reglas de negocio/UX que deben respetarse en cualquier rediseño

1. **El cambio de estado vive solo en el listado**, nunca en un formulario de creación/edición.
2. **Ventas y Compras son de una sola vía** (Pendiente → Completado/Recibida, sin regreso); Usuarios/Productos/Proveedores/Clientes/Métodos de Pago son reversibles (Activo ⇄ Inactivo).
3. **Ningún id es editable por el usuario** — todos los identificadores (usuarios, roles, líneas de compra, ventas) los genera el sistema.
4. **Los catálogos están correlacionados**: crear un rol lo hace aparecer en el selector de Usuarios; activar/desactivar un método de pago se refleja de inmediato en Ventas/Compras; un usuario creado puede loguearse de inmediato.
5. **"Por vencer" es una sugerencia visual secundaria**, nunca el elemento dominante ni un bloqueo — se muestra como badge junto al precio, no como el estilo principal del ítem.
6. **El color comunica estado real**, no decora — ver `SISTEMA_DE_DISENO.md`, sección 6.
7. **Modo oscuro es funcional, no cosmético** (turnos nocturnos en bares) — toda pantalla debe verse bien en ambos modos con el mismo par de tokens.
8. **Frontend "tonto"**: toda esta lógica (descuento de stock, cálculo de totales, una-sola-vía) hoy vive en el cliente porque no hay backend, pero conceptualmente pertenece al backend (Node/Express) según la arquitectura definida — un rediseño no debería asumir que el cliente seguirá siendo la fuente de verdad.
