# CLAUDE.md — Proyecto StockBar

Este archivo da contexto a Claude (Claude Code / asistente) para trabajar en este repositorio de forma consistente con la arquitectura y las reglas del proyecto. Basado en: Ficha de Proyecto aprobada, Entregables de Arquitectura de Hardware/Software, diagramas C1‑C2‑C3 y guía de Teoría del Color. Ver `RESUMEN_TECNICO_STOCKBAR.md` para el detalle completo.

## 1. Qué es StockBar

Sistema web + móvil de gestión administrativa (compras, inventario, ventas, proveedores, clientes, reportes) para una microempresa de licores/cigarrillos/confitería con dos roles: **Administrador** (control total) y **Empleado Auxiliar** (permisos restringidos, foco en ventas en ventanilla).

## 2. Stack tecnológico (no cambiar sin justificación)

| Capa | Tecnología |
|---|---|
| Frontend Web | React.js + Bootstrap 5 |
| Frontend Móvil (POS) | Flutter |
| Backend | Node.js + Express + TypeScript, API REST |
| Autenticación | JWT |
| Autorización | RBAC (roles y permisos) |
| Base de datos | MySQL (relacional, ACID) |
| Notificaciones | SMTP (servicio de correo externo, para credenciales/recuperación de contraseña) |

## 3. Reglas arquitectónicas obligatorias

1. **Arquitectura por capas estricta**: Presentación (React/Flutter) → Negocio (Node.js/Express) → Datos (MySQL). Los clientes **nunca** acceden directo a la base de datos; todo pasa por la API REST.
2. **Un solo backend para ambos frontends.** La lógica de negocio (cálculo de totales, descuento de inventario, validaciones) se implementa **una sola vez** en el backend y es consumida tanto por la web como por la app móvil. No duplicar lógica de negocio en el cliente.
3. **Los frontends son "tontos"**: no deben mantener estado de negocio persistente local ni ser fuente de verdad. Si el backend o la conexión fallan, se asume que la app queda inoperativa (no se debe intentar implementar modo offline salvo que se pida explícitamente).
4. **RBAC en middleware, no en la UI.** Toda validación de permisos (`VENTAS_CREAR`, `COMPRAS_REGISTRAR`, gestión de catálogo, gestión de usuarios/roles, etc.) se aplica en middleware de Express antes de llegar al controlador. Ocultar botones en el frontend es solo complemento, nunca el mecanismo de seguridad real.
5. **HTTPS obligatorio** para toda comunicación cliente-API (puerto 443). No proponer HTTP plano para producción.
6. **Separación de controladores por dominio**, siguiendo el diagrama C3: `Controlador de Ventas`, `Controlador de Compras`, `Controlador de Inventario` (categorías/productos/proveedores/alertas de stock), más el `Módulo de Seguridad (Auth)`. Mantener esta separación al crear nuevos endpoints; no mezclar lógica de ventas dentro del controlador de compras, etc.
7. **Repositorio de Datos como única puerta a MySQL** (vía `mysql2` o equivalente). Los controladores no ejecutan SQL directamente: invocan métodos del repositorio.
8. **Base de datos organizada en 3 niveles**: Catálogos (categorías, productos, proveedores, clientes), Seguridad (usuarios, roles, permisos, sesiones), Maestro‑Detalle (compras y ventas con cabecera/detalle). Todo modelo de datos nuevo debe encajar en uno de estos niveles.
9. **Rendimiento del inventario vía triggers, no vía polling desde el cliente.** El descuento/actualización de stock tras una venta debe resolverse con triggers en MySQL (desnormalización controlada por rendimiento), de forma que la actualización sea casi instantánea en el punto de venta.
10. **Acceso a datos de solo lectura (reportes/dashboard, detalle de producto, recibo de venta) a través de VISTAS SQL (`vw_...`), no de joins repetidos en el código de aplicación.** Esta es la convención de este proyecto. Vistas confirmadas en el script físico vigente (`/scripts/sch.sql`, ver `/docs/DATABASE.md` sección 3):
    - `vw_stock_lotes` — lotes con su cantidad disponible ya calculada; filtrar por `id_producto` para el detalle de producto (solo lectura).
    - `vw_stock_producto` — stock total por producto y bandera de bajo stock; única fuente del "stock actual" (nunca un campo editable en `producto`).
    - `vw_totales_venta` — desglose base gravable / IVA / total por venta, para el carrito y el recibo.

    Antes de crear una vista nueva, revisar si una existente puede reutilizarse o extenderse. Toda vista nueva debe documentarse en `/docs/DATABASE.md` (sección 3) y en `/scripts/sch.sql`.
11. **No hay servidores on-premise.** El despliegue asume infraestructura cloud (frontend web, backend, MySQL) más equipos locales (PC, smartphone/tablet Android, router ISP, switch, access point Wi‑Fi privado, firewall). No proponer arquitecturas que dependan de un servidor físico local.

## 4. Los 10 subprocesos del sistema (alcance funcional de referencia)

Al implementar features, ubicarlas dentro de uno de estos subprocesos y respetar el patrón CRUD + cambio de estado (salvo Acceso y Dashboard, que tienen su propio patrón):

1. Roles (incluye asignación de permisos)
2. Usuarios
3. Acceso (login, recuperar contraseña, logout)
4. Categorías de producto
5. Productos
6. Proveedores
7. Compras
8. Clientes
9. Ventas
10. Dashboard / Reportes (visualizar, filtrar, exportar PDF/Excel, alertas de bajo stock)

**Alcance móvil (Flutter):** solo Acceso y Ventas. No implementar en móvil subprocesos fuera de este alcance salvo instrucción explícita del usuario.

## 5. Identidad visual (aplicar en todo componente de UI)

- **Color primario:** `#1A365D` (azul profundo) — estructura y navegación.
- **Color de acento:** `#F59E0B` (ámbar) — botones de acción y alertas. Usar con moderación (no dominar la interfaz).
- **Neutros:** `#F8FAFC` y `#E2E8F0` — fondos y superficies.
- **Regla de composición:** 60% neutro (fondos/aire) · 30% estructura (navegación/datos) · 10% acción (botones/alertas).
- **Soportar modo claro y modo oscuro** con la misma paleta base; el modo oscuro es funcional (turnos nocturnos en bares), no solo estético.
- **El color comunica estado**, no decora: errores junto al campo que falla, confirmaciones de éxito que no bloquean el flujo, alertas visuales claras para bajo stock.

## 6. Seguridad — checklist al escribir código

- [ ] ¿La contraseña se compara contra un hash (no texto plano)?
- [ ] ¿El endpoint valida el JWT antes de ejecutar lógica de negocio?
- [ ] ¿El middleware de permisos RBAC corre antes del controlador?
- [ ] ¿Los datos sensibles (contraseñas, tokens) viajan solo por HTTPS?
- [ ] ¿El flujo de recuperación de contraseña usa un token de un solo uso enviado por correo (SMTP)?
- [ ] ¿Ningún cliente (React/Flutter) recibe credenciales de la base de datos ni la consulta directamente?

## 7. Documentación de base de datos

La estructura de datos y el acceso a la base de datos están documentados en dos archivos que deben consultarse juntos:

- **`/docs/DATABASE.md`** — Modelo de datos completo:
  - Descripción de las 3 capas (Catálogos, Seguridad, Maestro‑Detalle).
  - Definición de todas las tablas con campos, tipos, índices y foreign keys.
  - Vistas SQL (`vw_stock_lotes`, `vw_stock_producto`, `vw_totales_venta`) — **usar estas vistas, no joins repetidos**, en todo endpoint de dashboard/reportes/detalle de producto/recibo.
  - Triggers para desnormalización controlada y reglas de negocio (`trg_validar_detalle_venta_ins/upd` congela `porcentaje_impuesto_aplicado` e `id_lote` descuenta stock vía `fn_stock_lote`, `trg_validar_cierre_venta_*` valida cuadre de pago, etc. — lista completa en la sección 4).
  - Convenciones de nomenclatura.

- **`/scripts/sch.sql`** — Script SQL físico vigente, ya probado contra un servidor real, que:
  - Crea todas las tablas (incluye `lote`, `jornada`, `venta_pago`, `categoria.porcentaje_iva`, `compra.ruta_factura`).
  - Declara los triggers, funciones y procedimientos.
  - Crea las vistas.
  - Incluye datos iniciales (roles, permisos por defecto, categorías con su IVA, métodos de pago, unidades de medida, motivos de baja).

**Regla obligatoria:** Antes de crear una nueva vista o modificar el modelo de datos, consultar `/docs/DATABASE.md` y actualizarlo junto con `/scripts/sch.sql`. No crear tablas, vistas o triggers sin documentarlos primero.

## 8. Qué falta por definir (no asumir, preguntar o marcar como pendiente)

- Diagrama de Clases y Modelo Relacional en notación UML/IE (Sprint 05) — `/scripts/sch.sql` y `/docs/DATABASE.md` ya son la fuente de verdad de columnas/tipos/relaciones; falta el diagrama visual formal.
- Diagrama de Despliegue C4 formal (Sprint 09).
- Manuales Técnico y de Usuario (v1‑v4).
- Matriz de historias de usuario con criterios de aceptación.

Si una tarea requiere información de alguno de estos puntos y no está en el repositorio, señalarlo explícitamente en vez de inventar el esquema.

## 9. Documentos de referencia

1. **Para el contexto completo del negocio y la arquitectura:**  
   `RESUMEN_TECNICO_STOCKBAR.md` en la raíz — detalle narrativo, contexto de negocio, justificaciones, ventajas/desventajas, diagramas C1‑C2‑C3, cronograma de sprints.

2. **Para entender dónde va cada archivo en el repo:**  
   `/docs/ESTRUCTURA_CARPETAS.txt` — guía visual de la organización del código, convención de nomenclatura, checklist de primeros pasos.