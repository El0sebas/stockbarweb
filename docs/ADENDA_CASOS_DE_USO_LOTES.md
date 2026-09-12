# Adenda — Manejo de lotes en los Casos de Uso StockBar

Este documento complementa `Casos_de_Uso_Unificados_StockBar.pdf`. No reemplaza ningún CU existente: **actualiza** el contenido de CU-PRO-01/03/07, CU-COM-01/07 y CU-VEN-01/07 (y su equivalente móvil CU-VMOV-01/07) para reflejar que el inventario se maneja **por lote**, no por un contador de stock plano — que es como realmente está construido hoy en `stockbar-web` y `stockbar_mobile`.

Mismo formato de tabla que el resto del documento, para copiar y pegar directo.

---

## Concepto que faltaba: inventario por lote (FEFO)

Cada producto que maneja vencimiento no tiene un único número de "stock actual": tiene **uno o más lotes**, cada uno con su propio número de lote, fecha de vencimiento y cantidad disponible. El stock que se muestra en cualquier pantalla es **la suma de los lotes vigentes** (no vencidos, con cantidad > 0). Al vender, el sistema descuenta primero del lote que vence más pronto — **FEFO: First Expired, First Out** — nunca de un lote elegido al azar ni del más nuevo.

Esto afecta directamente tres subprocesos: Productos (define si el producto maneja vencimiento), Compras (es donde nacen/crecen los lotes) y Ventas (es donde se consumen).

---

## Actualización — Módulo: Inventario, Subproceso: Productos

**Código del CU:** CU-PRO-01 (actualiza la fila "Flujo Principal")
**Cambio:** en el paso 3, agregar el campo `maneja_vencimiento` (booleano) al formulario de registro.
**Flujo Principal (Básico) — reemplaza el punto 3-6:**
3. El Administrador ingresa Código (SKU), Nombre, Precio y marca si el producto **maneja vencimiento**.
4. Selecciona la Categoría.
5. Hace clic en 'Guardar'.
6. El sistema valida y guarda el producto. Si `maneja_vencimiento = true`, el producto queda **sin lotes** hasta su primera Compra (CU-COM-01); si es `false`, se administra con un stock simple.

**Código del CU:** CU-PRO-03 (actualiza "Descripción" y agrega excepción)
**Descripción (reemplaza):** Proyecta de manera general y paginada el catálogo entero de artículos del bar. Para productos que manejan vencimiento, el stock mostrado es **la suma de las unidades disponibles en todos sus lotes vigentes** (no vencidos y con cantidad > 0), no un campo aparte que pueda desincronizarse.
**Flujos Alternativos / Excepciones (agrega):**
- **A2. Sugerencia de vencimiento próximo:** si el lote vigente más próximo a vencer está a 15 días o menos, el sistema resalta el producto con un indicador "Por vencer (N días)" — es solo una sugerencia visual, nunca bloquea la venta ni prioriza nada por sí sola.

---

## Actualización — Módulo: Compras e Inventario, Subproceso: Compras

**Código del CU:** CU-COM-01 — Registrar compra
**Descripción (reemplaza):** Registra la entrada de mercancía al bar mediante una factura oficial del proveedor. Si el producto recibido maneja vencimiento, **crea un nuevo lote** (o incrementa uno existente con el mismo número de lote) en vez de sumar a un contador plano.
**Flujo Principal (Básico) — reemplaza el punto 3:**
3. Por cada producto recibido: cantidad y costo unitario. **Si el producto maneja vencimiento**, además: número de lote y fecha de vencimiento.
4. Al agregar la línea, el sistema genera un **id de línea/lote autogenerado** (nunca editable por el actor).
5. Guarda el registro. El sistema inserta la cabecera y detalles.
6. **Si el producto maneja vencimiento:** crea el lote con su `cantidad_disponible` = cantidad comprada. **Si no maneja vencimiento:** suma directamente al stock plano.

**Flujos Alternativos / Excepciones (agrega):**
- **A2. Falta lote o vencimiento:** si el producto maneja vencimiento y no se completan número de lote y fecha, el sistema rechaza el agregado de esa línea con un mensaje explícito, sin bloquear el resto de la compra.

**Código del CU:** CU-COM-07 — Cambiar estado (Compra)
**Nota de reconciliación (ver "Discrepancias" más abajo):** en la implementación actual la transición es **Pendiente → Recibida, de una sola vía** (sin `Anulada` ni reversión de stock). Si el equipo decide mantener `Anulada` con reversión como está en el PDF, esa reversión debe operar **por lote** (devolver la cantidad al lote específico que la originó), no a un contador plano.

---

## Actualización — Módulo: Ventas y Facturación, Subproceso: Ventas

**Código del CU:** CU-VEN-01 — Registrar venta
**Descripción (reemplaza):** Genera la transacción de salida de mercancía. Para productos que manejan vencimiento, descuenta del **lote vigente que vence primero (FEFO)**; para productos sin vencimiento, descuenta del stock plano.
**Flujo Principal (Básico) — reemplaza el punto 2-3 y 7:**
2. Busca y selecciona los productos en una lista buscable; cada uno muestra el stock disponible real (suma de lotes vigentes) y, si aplica, el indicador "Por vencer (N días)".
3. Indica la cantidad a llevar de cada producto (el tope es siempre el stock real por lote, no un valor fijo).
7. Presiona 'Cobrar'/'Confirmar Venta'. El sistema **vuelve a validar el stock por lote** (por si cambió desde que se agregó al carrito) y, de ser válido, descuenta: primero del lote que vence antes, y si ese no alcanza, continúa con el siguiente lote vigente en orden de vencimiento, hasta completar la cantidad vendida.

**Flujos Alternativos / Excepciones (reemplaza A1):**
- **A1. Stock insuficiente (por lote):** si la suma de lotes vigentes no alcanza la cantidad solicitada, el sistema rechaza el agregado o la confirmación con un mensaje explícito — nunca vende contra un lote vencido, aunque tenga unidades físicas registradas.

**Postcondiciones (agrega):** El lote (o lotes) usados quedan con su `cantidad_disponible` reducida; un lote que llega a 0 deja de aparecer como disponible en futuras ventas aunque siga existiendo el registro histórico.

---

## Nuevo caso de uso — Gestión automática de lotes (FEFO)

**Código del CU:** CU-LOT-01
**Nombre del CU:** Calcular stock disponible y aplicar descuento FEFO
**Actor Principal:** Sistema (no hay pantalla dedicada a "Gestionar Lotes"; es lógica automática disparada por CU-COM-01 y CU-VEN-01)
**Descripción:** Determina, para cualquier producto que maneje vencimiento, cuántas unidades hay realmente disponibles y de cuál lote deben salir al momento de una venta.
**Precondiciones:** El producto tiene `maneja_vencimiento = true` y al menos un lote registrado.
**Flujo Principal (Básico):**
1. El sistema filtra los lotes del producto que tienen `cantidad_disponible > 0` y `fecha_vencimiento` posterior a hoy (los vencidos o agotados quedan fuera).
2. Ordena esos lotes de forma ascendente por fecha de vencimiento (el que vence primero, primero).
3. El **stock disponible** del producto es la suma de `cantidad_disponible` de esos lotes.
4. Ante una venta de N unidades, recorre los lotes en ese orden, tomando de cada uno hasta agotarlo o hasta completar N, actualizando `cantidad_disponible` en cada lote afectado.

**Flujos Alternativos / Excepciones:**
- **A1. Ningún lote vigente:** si todos los lotes están vencidos o en 0, el stock disponible es 0 y el producto no puede venderse aunque existan registros de lote con unidades físicas vencidas.

**Postcondiciones:** El inventario por lote queda consistente; el stock mostrado en Productos, Compras y Ventas siempre refleja la misma fuente.

---

## Módulo Móvil — mismo criterio

**Código del CU:** CU-VMOV-01 — Registrar venta (Móvil)
**Cambio:** aplica exactamente el mismo mecanismo de CU-VEN-01 / CU-LOT-01, con una diferencia de interacción: al tocar "+" sobre un producto, la app abre un **diálogo para elegir la cantidad exacta** a entregar (con el stock disponible por lote como tope) antes de agregarlo al carrito, en vez de sumar una unidad por toque. El lote asignado (FEFO) se muestra en la línea del carrito y puede ajustarse con un stepper −/+ antes de confirmar.

---

## Otras discrepancias detectadas (no relacionadas con lotes)

No las desarrollé en detalle porque no fue lo pedido, pero quedan señaladas para que decidan si las reconcilian con el código actual:

1. **CU-VEN-05 / CU-VEN-06 (Editar / Eliminar venta):** en la implementación actual, el módulo de Ventas web **no tiene edición ni eliminación** de una venta ya registrada — solo registrar y cambiar estado (Pendiente → Completado, de una sola vía). Si el PDF describe editar/eliminar como parte del alcance, es una funcionalidad pendiente de construir, no algo ya implementado.
2. **CU-COM-07 (Cambiar estado — Compra):** el PDF describe `Completado → Anulada` con reversión de stock; lo implementado es `Pendiente → Recibida`, de una sola vía, sin estado "Anulada" ni reversión.
3. **CU-ACC-01 (Bloqueo tras 3 intentos fallidos):** no implementado en ninguna plataforma todavía.
4. **CU-VMOV (todo el bloque "Ventas Móvil — Pedidos en Mesa"):** describe un modelo de mesas + PIN de Administrador para eliminar + edición de nota, que es más complejo que lo implementado hoy (historial simple de ventas + registrar + marcar como lista). Si el mesero/mesa es un requisito real del negocio, es un rediseño pendiente, no un ajuste menor.
5. **Actor de CU-VEN-01:** el PDF lo limita a "Empleado"; en el código, tanto Administrador como Empleado Auxiliar pueden registrar ventas.
