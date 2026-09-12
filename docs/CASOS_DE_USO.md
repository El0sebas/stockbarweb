# Casos de uso — StockBar (Web + Móvil)

Describe el flujo real de cada subproceso tal como está implementado hoy en `stockbar-web` (React) y `stockbar_mobile` (Flutter). Es una foto del comportamiento actual del frontend mock, no un diseño aspiracional — cuando exista el backend, la lógica de negocio aquí descrita (validaciones, generación de ids, descuento de stock, transiciones de estado) migra a la capa de negocio (Node/Express) según `CLAUDE.md`, pero el flujo desde el punto de vista del actor se mantiene igual.

Ver también `CONTEXTO_FRONTEND.md` (inventario de pantallas/componentes) y `SISTEMA_DE_DISENO.md` (tokens visuales).

## Actores

| Actor | Descripción |
|---|---|
| **Administrador** | Acceso total: los 10 subprocesos en web. En móvil: Acceso, Inicio (Dashboard) y Ventas. |
| **Empleado Auxiliar** | Acceso operativo restringido a Productos (solo consulta), Clientes y Ventas. En móvil: solo Acceso y Ventas (sin Dashboard). |
| **Sistema** | Actor no humano: genera identificadores, valida stock por lote, descuenta inventario, bloquea transiciones de estado inválidas. |

## Convenciones usadas en este documento

- **Precondición** / **Postcondición**: estado del sistema antes/después del caso de uso.
- **Flujo principal**: camino feliz, numerado.
- **Flujos alternativos**: variantes o desvíos válidos (ej. edición en vez de creación).
- **Excepciones**: validaciones que interrumpen el flujo con un mensaje de error.
- Regla transversal: **el cambio de estado nunca ocurre en un formulario de creación/edición**, solo desde el listado (ver UC-07, UC-10, UC-12, UC-19).

---

# Parte 1 — Web (`stockbar-web`)

## UC-01 — Iniciar sesión

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** El usuario tiene una cuenta activa en el catálogo de usuarios.
**Flujo principal:**
1. El actor abre la aplicación y ve el formulario de login (correo, contraseña).
2. Ingresa sus credenciales y presiona "Iniciar Sesión".
3. El sistema busca un usuario cuyo correo y contraseña coincidan.
4. El sistema valida que el usuario tenga `estado = Activo`.
5. El sistema redirige al Dashboard y carga el `MainLayout` (sidebar según el rol).

**Excepciones:**
- **E1 — Credenciales inválidas:** no existe coincidencia de correo/contraseña → mensaje de error, permanece en login.
- **E2 — Usuario inactivo:** coincide pero `estado = Inactivo` → mensaje de error, no se permite el acceso aunque la contraseña sea correcta.

**Postcondición:** Sesión iniciada; el sidebar muestra únicamente los módulos permitidos por el rol del usuario.

## UC-02 — Recuperar contraseña

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Ninguna (accesible desde la pantalla de login).
**Flujo principal:**
1. El actor pulsa "¿Olvidaste tu contraseña?".
2. El sistema muestra un flujo simulado de recuperación (sin envío real de correo aún — pendiente de integración SMTP según `CLAUDE.md`).
**Postcondición:** Ninguna persistente en esta versión mock.

## UC-03 — Cerrar sesión

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Sesión iniciada.
**Flujo principal:**
1. El actor abre el menú desplegable del ícono de perfil en el header.
2. Selecciona "Cerrar Sesión".
3. El sistema vuelve a la pantalla de login.
**Postcondición:** Sesión finalizada.

## UC-04 — Gestionar roles

**Actor(es):** Administrador
**Precondición:** Sesión iniciada como Administrador.
**Flujo principal (crear):**
1. El actor abre "Roles" y pulsa "Nuevo".
2. Completa nombre, descripción y marca los módulos permitidos (checklist de 9 módulos: Roles, Usuarios, Categorías, Productos, Proveedores, Compras, Clientes, Ventas, Reportes).
3. Guarda. El sistema genera el código (`ROL-0N`) y agrega el rol al catálogo.
4. El rol nuevo aparece de inmediato como opción en el selector de rol de Usuarios (UC-05).

**Flujos alternativos:**
- **A1 — Editar:** mismo formulario, precargado; el código no es editable.
- **A2 — Ver detalle:** modal de solo lectura con permisos marcados.
- **A3 — Eliminar:** confirmación → se quita del catálogo (no valida aquí si hay usuarios con ese rol — pendiente de reforzar cuando exista backend).

**Excepciones:**
- **E1 — Rol de sistema:** el rol "Administrador" tiene editar/eliminar deshabilitados (botones visibles pero inactivos, con tooltip explicando por qué) — no se puede modificar ni borrar.

**Postcondición:** Catálogo de roles actualizado; correlacionado con Usuarios.

## UC-05 — Gestionar usuarios

**Actor(es):** Administrador
**Precondición:** Sesión iniciada como Administrador; existe al menos un rol en el catálogo.
**Flujo principal (crear):**
1. El actor abre "Usuarios" y pulsa "Nuevo Usuario".
2. Completa documento, nombre, correo, teléfono, contraseña y elige un rol del catálogo real (UC-04).
3. Guarda. El sistema genera `id_usuario`, fija `estado = Activo` y `fechaRegistro`.
4. El usuario puede iniciar sesión de inmediato (UC-01) con las credenciales recién creadas.

**Flujos alternativos:**
- **A1 — Editar:** el campo contraseña se deja vacío para conservar la actual; si se escribe algo, se sobrescribe.
- **A2 — Cambiar estado:** desde el listado, un switch Activo/Inactivo (reversible en ambos sentidos).

**Excepciones:**
- **E1 — Usuario "Administrador" semilla:** edición/eliminación bloqueadas con tooltip, igual que UC-04/E1.

**Postcondición:** Catálogo de usuarios actualizado; correlacionado con Login (UC-01) y Roles (UC-04).

## UC-06 — Gestionar categorías

**Actor(es):** Administrador
**Precondición:** Sesión iniciada.
**Flujo principal:** CRUD estándar — código (autogenerado), nombre, descripción. Sin cambio de estado interactivo (las categorías no tienen ciclo de vida propio en esta versión).
**Postcondición:** Catálogo de categorías disponible como filtro en Productos.

## UC-07 — Gestionar productos

**Actor(es):** Administrador (CRUD completo); Empleado Auxiliar (solo consulta, sin crear/editar/eliminar/cambiar estado).
**Precondición:** Sesión iniciada; existen categorías (UC-06).
**Flujo principal (crear):**
1. El Administrador abre "Productos" y pulsa "Nuevo".
2. Completa nombre, descripción, categoría, precio de venta, % de impuesto, si el precio incluye impuesto, si maneja vencimiento, stock actual y stock mínimo.
3. Guarda. El sistema genera el código (`PROD-0N`) y fija `estado = Activo`.

**Flujos alternativos:**
- **A1 — Editar / Ver detalle / Eliminar:** estándar vía `RowActions`.
- **A2 — Cambiar estado:** switch Activo/Inactivo en el listado (reversible).

**Excepciones:**
- **E1 — Stock bajo:** si `stockActual <= stockMinimo`, el listado y el Dashboard (UC-13) muestran una alerta visual (badge rojo) automáticamente — no requiere acción del actor.

**Postcondición:** Catálogo de productos disponible para Compras (UC-10) y Ventas (UC-12).

## UC-08 — Gestionar proveedores

**Actor(es):** Administrador
**Precondición:** Sesión iniciada.
**Flujo principal:** CRUD estándar — código (autogenerado), nombre, contacto, teléfono, correo. Cambio de estado Activo/Inactivo (reversible) desde el listado.
**Postcondición:** Catálogo de proveedores disponible para Compras (UC-10).

## UC-09 — Gestionar métodos de pago

**Actor(es):** Administrador
**Precondición:** Sesión iniciada.
**Flujo principal:** CRUD estándar (id autogenerado, nombre). Cambio de estado Activo/Inactivo desde el listado.
**Excepciones:**
- **E1 — Desactivar un método en uso:** al marcarlo Inactivo, desaparece de inmediato de los selectores de método de pago en Ventas (UC-12) y Compras (UC-10) — no afecta ventas/compras ya registradas con ese método.
**Postcondición:** Catálogo correlacionado en tiempo real con Ventas y Compras.

## UC-10 — Registrar y recibir una compra

**Actor(es):** Administrador
**Precondición:** Sesión iniciada; existen proveedores (UC-08), productos y métodos de pago activos (UC-09).
**Flujo principal:**
1. El actor abre "Compras" y pulsa "Registrar Compra".
2. Selecciona un proveedor; el sistema muestra solo los productos asociados a ese proveedor.
3. Por cada producto: cantidad, costo unitario y, si el producto maneja vencimiento, número de lote y fecha de vencimiento.
4. Pulsa "+" para agregar la línea. El sistema **genera un id de línea** (`id_detalle`) — nunca editable por el actor.
5. Repite el paso 3–4 para más productos; el sistema calcula el total acumulado.
6. Completa el número de factura (autogenerado, editable solo si es necesario), método de pago y ruta de factura.
7. Confirma "Registrar Compra". El sistema crea el registro con `estado = Pendiente`.
8. Desde el listado, el actor pulsa el badge "Pendiente" para marcarla **"Recibida"** (una sola vía: no puede volver a Pendiente).

**Excepciones:**
- **E1 — Falta lote/vencimiento:** si el producto maneja vencimiento y no se completan esos campos, el sistema rechaza el agregado con un mensaje.
- **E2 — Factura o proveedor incompletos:** el sistema bloquea el guardado hasta completarlos.
- **E3 — Compra sin productos:** no se puede confirmar una compra sin al menos una línea.

**Postcondición:** Compra registrada, disponible en el Dashboard (UC-13) como "Compras Pendientes" hasta que se marque Recibida.

## UC-11 — Gestionar clientes

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Sesión iniciada.
**Flujo principal:** CRUD estándar — documento, nombre completo, teléfono, correo. Cambio de estado Activo/Inactivo (reversible) desde el listado.
**Postcondición:** Catálogo de clientes disponible para asociar a ventas (referencia por nombre, sin selector obligatorio en esta versión).

## UC-12 — Registrar una venta web

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Sesión iniciada; existen productos con stock disponible y al menos un método de pago activo.
**Flujo principal:**
1. El actor abre "Ventas" y pulsa "Registrar".
2. Ingresa el nombre del cliente y elige método de pago (y referencia opcional).
3. Busca un producto en la lista buscable (input de texto filtra por nombre).
4. Cada fila muestra precio y, si el lote más próximo vence en ≤15 días, un badge secundario "Por vencer (Nd)" — es solo una sugerencia visual.
5. Pulsa "+" junto al producto: el sistema agrega 1 unidad al carrito (toques repetidos suman más unidades del mismo producto).
6. Repite para más productos. El sistema muestra el total estimado en tiempo real.
7. Confirma "Confirmar venta". El sistema valida stock por lote, **descuenta del lote que vence primero (FEFO)** y crea la venta con `estado = Pendiente`.
8. Desde el listado, el actor pulsa el switch de la venta para marcarla **"Completado"** (una sola vía: bloqueado una vez completada).

**Excepciones:**
- **E1 — Sin stock disponible:** si no hay lotes vigentes con unidades suficientes, el sistema rechaza el agregado con un mensaje ("no tiene lote disponible o ya venció").
- **E2 — Cliente vacío o carrito vacío:** el sistema bloquea la confirmación.

**Postcondición:** Venta registrada; el stock del catálogo de productos vendibles queda descontado; el Dashboard refleja el nuevo ingreso una vez la venta pasa a Completado.

## UC-13 — Consultar el Dashboard

**Actor(es):** Administrador
**Precondición:** Sesión iniciada.
**Flujo principal:**
1. El actor abre "Inicio".
2. El sistema calcula y muestra en vivo: Ingresos por Ventas (suma de ventas Completado), Productos Activos, Compras Pendientes, Alertas de Stock.
3. Muestra tres gráficas de barras: Ventas por estado, Compras por estado, Stock por producto (top 6, en rojo si está en alerta).
4. Muestra una lista de productos por debajo del stock mínimo, si los hay.
**Postcondición:** Ninguna (solo lectura). Todo el contenido se recalcula sobre los datos reales de Productos (UC-07), Ventas (UC-12) y Compras (UC-10) — no hay cifras fijas.

---

# Parte 2 — Móvil (`stockbar_mobile`)

Alcance según `CLAUDE.md`: Acceso y Ventas. Se agregó Inicio (Dashboard) para el Administrador.

## UC-14 — Iniciar sesión (móvil)

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Igual que UC-01; mismo catálogo de usuarios que la web (conceptualmente — hoy son mocks independientes por no existir backend compartido).
**Flujo principal:**
1. El actor abre la app; ve el formulario con correo y contraseña (prellenado con el usuario de prueba), checkbox "Recordar usuario" y botón de tema arriba a la derecha.
2. Pulsa "Iniciar Turno".
3. El sistema valida correo+contraseña contra `mockUsuarios` y que `estado = Activo`.
4. Navega a `MainLayout`: Administrador ve Inicio + Ventas; Empleado Auxiliar ve solo Ventas (sin barra de navegación inferior, al ser una sola pantalla).

**Excepciones:** iguales a UC-01 (E1 credenciales inválidas, E2 usuario inactivo), mostradas como `SnackBar`.

**Postcondición:** Igual que UC-01.

## UC-15 — Recuperar contraseña (móvil)

**Actor(es):** Administrador, Empleado Auxiliar
**Flujo principal:**
1. El actor pulsa "¿Olvidaste tu contraseña?" → se abre un bottom sheet.
2. Ingresa su correo y pulsa "Generar token". El sistema genera un token simulado (`SB-xxxxx`) y lo muestra.
3. Ingresa el token (prellenado) y una nueva contraseña de mínimo 6 caracteres.
4. Pulsa "Guardar nueva contraseña". El sistema confirma el cambio (mock, sin persistencia real ni envío de correo).
**Postcondición:** Ninguna persistente en esta versión.

## UC-16 — Cerrar sesión (móvil)

**Actor(es):** Administrador, Empleado Auxiliar
**Flujo principal:**
1. El actor toca el avatar circular (iniciales) en el AppBar.
2. Se abre un bottom sheet con sus datos, opción de cambiar tema y "Cerrar Sesión".
3. Selecciona "Cerrar Sesión" → vuelve al login.
**Postcondición:** Sesión finalizada; pila de navegación limpiada (`pushAndRemoveUntil`).

## UC-17 — Consultar Inicio (Dashboard móvil)

**Actor(es):** Administrador
**Precondición:** Sesión iniciada como Administrador (el Empleado Auxiliar no tiene esta pestaña).
**Flujo principal:**
1. El actor abre la pestaña "Inicio".
2. El sistema calcula y muestra: Ingresos (suma de ventas "Listo") + cantidad total de ventas, Stock Crítico (productos con stock disponible por lote ≤5), Ventas Pendientes (conteo).
**Postcondición:** Ninguna (solo lectura); se recalcula sobre los mismos datos que administra Ventas (UC-18/19).

## UC-18 — Registrar una venta (móvil)

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Sesión iniciada; existen productos con stock disponible por lote.
**Flujo principal:**
1. El actor pulsa el botón flotante "Nueva Venta".
2. Elige cliente y método de pago (dropdowns).
3. Busca un producto en la lista buscable; cada fila muestra precio, stock disponible y, si aplica, el badge "Por vencer (Nd)".
4. Pulsa "+" sobre un producto: se abre un **diálogo para elegir cuántas unidades** entregar (stepper −/+, tope = stock real disponible por lote).
5. Confirma "Agregar": la línea se suma al carrito con el **lote asignado** (el que vence primero, FEFO) visible en la línea.
6. Puede ajustar la cantidad de cualquier línea del carrito con un stepper −/+ propio, o eliminarla.
7. Pulsa "Confirmar Venta". El sistema vuelve a validar stock por lote, **descuenta del lote correspondiente (FEFO)** y crea la venta con `estado = Pendiente`.

**Excepciones:**
- **E1 — Sin stock suficiente** (al elegir cantidad, al ajustar en el carrito, o al confirmar si algo cambió mientras tanto): el sistema muestra un aviso y no modifica nada.
- **E2 — Carrito vacío:** el botón "Confirmar Venta" permanece deshabilitado.

**Postcondición:** Venta creada como Pendiente; stock de lotes descontado; el carrito y los campos del formulario se reinician.

## UC-19 — Marcar una venta como lista (móvil)

**Actor(es):** Administrador, Empleado Auxiliar
**Precondición:** Existe al menos una venta en estado "Pendiente".
**Flujo principal:**
1. En el listado ("Historial de Transacciones"), el actor pulsa "Marcar como listo" sobre una venta pendiente.
2. El sistema cambia su estado a "Listo" (una sola vía: el botón desaparece, se reemplaza por el texto "Venta completada").
**Postcondición:** El Dashboard (UC-17) refleja el nuevo ingreso en la próxima consulta.

---

# Diferencias de flujo entre Web y Móvil (a tener en cuenta al documentar)

| Aspecto | Web | Móvil |
|---|---|---|
| Agregar producto a una venta | "+" agrega 1 unidad directamente; se repite el toque para sumar más | "+" abre un diálogo para elegir la cantidad exacta antes de agregar |
| Ajustar cantidad ya en el carrito | No existe — se quita y se vuelve a agregar | Stepper −/+ por línea |
| Modelo de stock | Plano por producto (`stockActual`/`stockMinimo`) en Productos; el catálogo de Ventas sí usa lotes | Siempre por lotes (`lotes[]`), con descuento FEFO real al confirmar |
| Pantallas del Administrador | 10 subprocesos completos | Acceso, Inicio, Ventas únicamente (sin Stock, Compras, Roles, etc. — fuera del alcance móvil definido) |
| Cerrar sesión | Dropdown del ícono de perfil en el header | Bottom sheet desde el avatar en el AppBar |
