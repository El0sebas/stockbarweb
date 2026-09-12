# Resumen Técnico Completo — Proyecto StockBar

> Documento consolidado a partir de la Ficha de Proyecto aprobada, los entregables de Arquitectura de Hardware y Software, los diagramas C4 (C1‑C2‑C3) y la guía de teoría del color. Sirve como base para generar `CLAUDE.md` y para el desarrollo del sistema.

---

## 1. Contexto del negocio

**StockBar** es una microempresa de economía popular (Buenos Aires, barrio 13 de Noviembre, Medellín) dedicada a la venta de licores, cigarrillos y confitería, atendida por venta directa en ventanilla.

- **Cliente / representante legal:** Juan David Posso.
- **Roles actuales del negocio:**
  - **Administrador (Propietario):** compra mercancía, fija precios, controla el dinero y toma decisiones administrativas.
  - **Empleado Auxiliar:** atiende clientes, organiza el punto de venta y apoya operativamente.
- **Operación actual (manual):** el propietario compra a un único proveedor, calcula precios y los anota en un cuaderno; las ventas se registran en el mismo cuaderno; los pagos son en efectivo, Nequi o Bancolombia; el faltante de stock se reporta por WhatsApp al final del día.
- **Problemas que motivan el proyecto:** pérdida/deterioro de facturas físicas, errores en cálculo de precios y márgenes, falta de respaldo digital, descuadres entre inventario real y registrado, dependencia de un único proveedor, y errores/omisiones en la reposición manual de stock.
- **Objetivo general:** desarrollar un sistema **web + móvil** de gestión administrativa (ventas, compras, inventario, proveedores, clientes, reportes) que digitalice y automatice estos procesos.
- **Diferenciador frente a antecedentes similares (Tostao Café-Bar, Barbería/tienda de abarrotes de referencia):** StockBar incorpora un **módulo móvil de ventas** visible también para el administrador, algo que los proyectos de referencia no ofrecían.
- **Fechas del proyecto formativo (SENA – Tecnología en Análisis y Desarrollo de Software, ficha 3062785):** inicio 12/mayo/2025 — terminación 30/junio/2026.

---

## 2. Alcance funcional (procesos y subprocesos)

El sistema se organiza en **10 subprocesos** agrupados en 4 grandes procesos, cada uno con operaciones CRUD + cambio de estado (salvo donde se indica):

| Proceso | Subproceso | Operaciones |
|---|---|---|
| **Usuarios** | Roles | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado, **asignar permisos** |
| **Usuarios** | Usuarios | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado |
| **Usuarios** | Acceso | Iniciar sesión, recuperar contraseña, cerrar sesión (seguro) |
| **Compras** | Categorías de producto | Registrar, buscar, listar, ver detalle, editar, eliminar |
| **Compras** | Productos | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado |
| **Compras** | Proveedores | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado |
| **Compras** | Compras | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado |
| **Ventas** | Clientes | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado |
| **Ventas** | Ventas | Registrar, buscar, listar, ver detalle, editar, eliminar, cambiar estado |
| **Dashboard** | Reportes/Estadísticas | Visualizar, filtrar, generar reportes (gráficos, indicadores, tablas comparativas), **exportar a PDF/Excel**, alertas de bajo stock y variaciones de ingresos/egresos |

**Alcance Web:** todos los subprocesos anteriores (Administrador con control total; Empleado Auxiliar con permisos restringidos para ventas/clientes).

**Alcance Móvil (Flutter, POS):**
- Acceso (login, recuperar contraseña, logout seguro).
- Ventas (CRUD + cambio de estado), pensado para el Empleado Auxiliar en mostrador; visible también para el Administrador.

---

## 3. Arquitectura de software

### 3.1 Patrón arquitectónico
**Arquitectura por Capas (Layered Architecture)** bajo modelo **Cliente/Servidor vía API REST**.

| Capa | Detalle |
|---|---|
| **Presentación (Frontend Web)** | React.js + Bootstrap 5 — panel administrativo y ventas web (Administrador y Empleado Auxiliar) |
| **Presentación (Frontend Móvil)** | Flutter — app táctil de ventas rápidas (POS) para Empleado Auxiliar |
| **Negocio (Backend)** | Node.js + Express + TypeScript — expone API REST, autenticación JWT, RBAC, lógica de los 10 subprocesos |
| **Datos (Persistencia)** | MySQL — modelo relacional con integridad referencial y propiedades ACID |

### 3.2 Justificación de la elección
- **Escalabilidad / lógica centralizada:** la lógica de negocio (p. ej. "descontar inventario") vive una sola vez en Node.js y es consumida tanto por React como por Flutter, evitando desajustes de información entre plataformas.
- **Eficiencia en el punto de venta:** Flutter compila una app nativa fluida sin recargas de página, crítica para la agilidad en ventanilla.
- **Velocidad de desarrollo UI:** Bootstrap 5 acelera la construcción de tablas, modales y alertas del panel administrativo.
- **Seguridad y normalización:** el backend Node.js actúa como "escudo"; ningún cliente accede directo a MySQL.

### 3.3 Ventajas reflejadas en el proyecto
- **Modularidad:** los 10 subprocesos están desacoplados (modificar Ventas no afecta Proveedores).
- **Independencia tecnológica:** cambiar el frontend (web o móvil) no obliga a tocar backend ni base de datos.
- **Testabilidad:** las funciones críticas (cálculo de caja, validación de inventario) pueden probarse en Node.js con Postman antes de construir la interfaz.

### 3.4 Desventajas y mitigaciones
| Desventaja | Mitigación aplicada |
|---|---|
| Latencia por múltiples capas (Flutter/React → Node.js → MySQL → respuesta) | **Desnormalización controlada por rendimiento** mediante **triggers automatizados** en la BD, para que las actualizaciones de inventario sean casi instantáneas |
| Dependencia absoluta de la capa de negocio (front "tonto", sin datos locales persistentes; si Node.js o internet fallan, ambas apps quedan inoperativas) | Conexión estable a internet (Router ISP local) + despliegue del backend en infraestructura Cloud confiable |

---

## 4. Arquitectura C4 (diagramas del proyecto)

### C1 — Contexto
- **Actores:** Administrador (Propietario) — gestiona el negocio y consulta reportes; Empleado Auxiliar — registra transacciones de venta.
- **Sistema:** Sistema StockBar — plataforma de gestión de inventario y POS de uso interno.
- **Sistema externo:** Servicio de Correo Electrónico — recibe solicitudes SMTP del sistema para envío de credenciales y tokens de recuperación de contraseña.

### C2 — Contenedores
- **Aplicación Web (Administrativa/POS)** — Contenedor React.js + Bootstrap 5. Interfaz principal; permite al admin gestionar todo el sistema y al empleado facturar bajo permisos RBAC. Consume la API REST vía HTTPS (puerto 443).
- **Aplicación Móvil (POS)** — Contenedor Flutter. Interfaz táctil exclusiva para registro rápido de ventas en mostrador. Consume la misma API REST (HTTP/JSON, puerto 443).
- **Servidor API REST** — Contenedor Node.js + Express + TypeScript. Centraliza la lógica de negocio, calcula totales y aplica las reglas del sistema. Envía peticiones de notificación al servicio de correo y lee/escribe en la BD (TCP/IP, puerto 3306).
- **Base de Datos Relacional (MySQL)** — Almacena los datos estructurados en niveles: **Catálogos, Seguridad y Maestro‑Detalle**.
- **Servicio de Correo Electrónico** (externo) — credenciales y tokens de recuperación.

### C3 — Componentes (dentro del Servidor API REST)
- **Módulo de Seguridad (Auth)** — Middleware Express + JWT. Gestiona autenticación y valida accesos por rol (RBAC). Recibe credenciales/token de sesión desde ambas apps cliente y valida permisos (`VENTAS_CREAR`, `COMPRAS_REGISTRAR`, permisos de catálogo, etc.) mediante middleware hacia cada controlador.
- **Controlador de Ventas** — procesa facturación, calcula totales y formatea la salida.
- **Controlador de Compras** — gestiona el ingreso de facturas de proveedores y suma de mercancía.
- **Controlador de Inventario** — maneja catálogos de categorías, productos y alertas de stock.
- **Repositorio de Datos** — componente MySQL2 que maneja la conexión nativa y ejecuta sentencias SQL (INSERT/UPDATE) invocadas por los tres controladores; también consulta el hash de contraseñas para el módulo de Auth.
- Todos los controladores invocan métodos de persistencia del Repositorio de Datos, que ejecuta las sentencias SQL directamente en MySQL.

---

## 5. Arquitectura de hardware e infraestructura

### 5.1 Equipos cliente (local)
- **PC/laptop:** acceso web principal del Administrador (reportes, inventario, roles); también disponible para el Empleado Auxiliar (facturación bajo permisos restringidos).
- **Smartphone/Tablet Android:** terminal POS móvil priorizada para el Empleado Auxiliar en ventanilla.

### 5.2 Equipos de red (local)
- **Router ISP** — conecta LAN con WAN.
- **Switch** — interconexión cableada (UTP) de equipos locales.
- **Access Point** — Wi‑Fi privada y oculta exclusiva para dispositivos StockBar (separada de redes públicas).
- **Firewall** — filtrado perimetral de tráfico malicioso.

### 5.3 Servicios en la nube (sin servidores on-premise)
- **Servidor Web (Frontend):** hospeda la interfaz React.js.
- **Servidor de Aplicaciones (Backend):** contenedor cloud que ejecuta Node.js (API REST).
- **Servidor de Base de Datos (MySQL):** almacenamiento centralizado y relacional con integridad referencial, en un servicio Cloud.

### 5.4 Protocolos de red

| Protocolo | Puerto | Función |
|---|---|---|
| TCP/IP | N/A | Entrega confiable de paquetes entre red local y nube |
| HTTP/HTTPS | 80 / 443 | Transferencia de interfaces web; HTTPS obligatorio para cifrar contraseñas y datos financieros |
| SSH | 22 | Administración remota segura de servidores Cloud |
| DNS | 53 | Resolución de nombres de dominio hacia IPs de los servidores en la nube |

---

## 6. Modelo de datos (estado actual y convenciones a seguir)

> **Nota importante:** en la documentación del proyecto entregada (ficha, entregables de arquitectura, diagramas C4) **no se incluye aún el script SQL ni el diagrama físico de base de datos** — según el cronograma de sprints, ese entregable corresponde al **Sprint 08 (Script y diagrama físico de Base de datos)**, posterior a los diagramas de Clases/Modelo Relacional del **Sprint 05**. Lo que sí está definido son los **niveles/capas de organización de datos** y las **reglas de rendimiento**:

- **Motor:** MySQL, relacional, con restricciones de integridad referencial y propiedades **ACID**.
- **Organización en 3 niveles** (mencionados en hardware y en C2):
  1. **Nivel 1 — Catálogos:** categorías, productos, proveedores, clientes.
  2. **Nivel 2 — Seguridad:** usuarios, roles, permisos, sesiones/tokens.
  3. **Nivel 3 — Maestro‑Detalle:** compras (cabecera/detalle), ventas (cabecera/detalle).
- **Triggers automatizados:** aplican "desnormalización controlada por rendimiento" para que el descuento/actualización de inventario tras una venta sea prácticamente instantáneo (mitiga la latencia de la arquitectura en capas).
- **Regla de acceso a datos (a seguir en el backend):** el **Servidor API REST es el único componente autorizado a hablar con MySQL** (puerto 3306); ningún cliente (React/Flutter) tiene acceso directo a la base de datos.
- **Convención recomendada para reportes/dashboard (basada en "usar vistas"):** dado que el Subproceso de Dashboard requiere datos en tiempo real, filtros, gráficos, indicadores y exportación a PDF/Excel, el Repositorio de Datos debe apoyarse en **VISTAS SQL (`vw_...`)** en lugar de construir joins complejos repetidos en cada endpoint. Ejemplos sugeridos de vistas a definir junto con el Sprint 08:
  - `vw_inventario_actual` (stock vigente por producto/categoría, con alerta de bajo stock).
  - `vw_ventas_detalle` (venta + cliente + productos + totales).
  - `vw_compras_detalle` (compra + proveedor + productos + totales).
  - `vw_kpis_dashboard` (ingresos, egresos, productos más vendidos, variaciones).
  - `vw_usuarios_roles_permisos` (para pantallas de administración de accesos).
- Esta convención debe confirmarse/ajustarse una vez se entregue el script y diagrama físico real de la base de datos (Sprint 08); este documento y `CLAUDE.md` deberán actualizarse en ese momento.

---

## 7. Seguridad

- **Autenticación:** JWT (JSON Web Tokens).
- **Autorización:** RBAC (Control de Acceso Basado en Roles) — el Administrador tiene control total; el Empleado Auxiliar tiene permisos restringidos (ventas/clientes).
- **Transporte:** HTTPS obligatorio (cifrado de contraseñas y datos financieros).
- **Recuperación de acceso:** flujo de "recuperar contraseña" vía token enviado por correo electrónico (SMTP) a través del Servicio de Correo Electrónico externo.
- **Aislamiento de red:** Wi‑Fi privada/oculta exclusiva y firewall perimetral en la infraestructura local.
- **Principio de menor privilegio a nivel de datos:** ningún cliente accede directamente a MySQL; todo pasa por el backend Node.js, que valida permisos vía middleware antes de tocar el Repositorio de Datos.

---

## 8. Identidad visual / UX (Teoría del Color aplicada)

- **Paleta primaria:** Azul profundo `#1A365D` (rgb 26,54,93) — estabiliza la experiencia, usado en navegación/estructura.
- **Paleta secundaria (acento):** Ámbar `#F59E0B` (rgb 245,158,11) — crea foco y dinamismo en botones/alertas, sin dominar la interfaz.
- **Neutros:** `#F8FAFC` (rgb 248,250,252) y `#E2E8F0` (rgb 226,232,240).
- **Contraste complementario:** azul (opuesto estable) + ámbar (equilibrado, dinámico).
- **Regla de composición 60‑30‑10:**
  - 60% Neutro → fondos y aire.
  - 30% Estructura → navegación y datos.
  - 10% Acción → botones y alertas.
- **Modo claro / modo oscuro:** ambos usan la misma paleta base; el modo oscuro responde a un contexto real (bares, turnos nocturnos) — menor deslumbramiento y fatiga visual; el modo claro prioriza alta legibilidad con luz ambiental.
- **Pantallas contempladas en la guía visual:** login, acceso rápido en caja (claro/oscuro), dashboard administrativo (KPIs con acento ámbar), dashboard de turno, tabla de inventario, catálogo operativo de botellas (interfaz móvil), registro con alertas (el error se muestra junto al campo; el éxito confirma sin bloquear), registro táctil con feedback.
- **Principio rector:** *"El color no decora: informa, protege y guía."* — el color debe comunicar estado (error, éxito, alerta de stock), no ser solo estético.

---

## 9. Gestión del proyecto (metodología y entregables por sprint)

Proyecto formativo SENA (Tecnología en ADSO), desarrollado de forma **individual** por **Sebastian Madrigal Torres** (según el entregable de Arquitectura de Software; la ficha original del programa lista además a Nicole Estrella Ospina Echeverry como aprendiz asociada).

| Fase | Sprint | Entregables |
|---|---|---|
| **Requisitos** | 01 | Instrumentos de recolección de información, Mapa de Procesos |
| **Requisitos** | 02 | Ficha de Proyecto Aprobada, Facilitación gráfica v1 |
| **Requisitos** | 03 | Historias de usuario (procesos básicos), Manual Técnico v1 |
| **Análisis** | 04 | Historias de usuario con criterios de aceptación y estimaciones, Product Backlog refinado |
| **Análisis** | 05 | Diagramas de Clases, Modelo Relacional, Casos de uso + documentación |
| **Análisis** | 06 | Story Mapping, Wireframe (Balsamiq), Manual Técnico v2 |
| **Modelado** | 07 | Prototipo en Figma o prototipo base HTML/CSS |
| **Modelado** | 08 | **Script y diagrama físico de Base de Datos** |
| **Modelado** | 09 | Diagramas de Componentes y Despliegue, refinamiento del Diagrama de Clases, Manual Técnico v3 |
| **Construcción** | 10 | Código fuente, informe de evaluación de calidad, documentación de pruebas |
| **Implantación** | 11 | Capacitación de usuario, Manual de Usuario, Manual Técnico v4 |

> Los diagramas C1/C2/C3 y los entregables de Arquitectura de Hardware/Software corresponden conceptualmente a las fases de **Modelado** (Sprints 07‑09). El script/diagrama físico de BD (Sprint 08) sigue pendiente según lo revisado en los archivos del proyecto.

---

## 10. Archivos fuente revisados

| Archivo | Contenido |
|---|---|
| `Ficha_Proyecto_-_StockBar_aprobada.pdf` | Ficha técnica oficial SENA: problema, justificación, objetivos, antecedentes, alcance por subproceso (web/móvil), cronograma de sprints, control de cambios |
| `Entregable_-_Arquitectura_de_Hardware.docx` | Infraestructura híbrida: equipos cliente, red local, servicios cloud, protocolos |
| `Entregable_-_Arquitectura_de_Software.docx` | Arquitectura por capas, stack tecnológico, justificación, ventajas/desventajas y mitigaciones |
| `Diagrama_C1_Contexto.png` | Actores del sistema y sistema externo de correo |
| `Diagrama_C2_Contenedores.png` | Contenedores: Web (React/Bootstrap), Móvil (Flutter), API REST (Node/Express/TS), BD (MySQL) |
| `Diagrama_C3_Componentes.png` | Componentes internos del API REST: Auth, Controladores de Ventas/Compras/Inventario, Repositorio de Datos |
| `Teoría_del_Color_StockBar_2.pdf` | Paleta de color, reglas 60‑30‑10, modo claro/oscuro, principios de UX aplicados a las pantallas del sistema |

---

## 11. Vacíos / pendientes detectados (a resolver en próximos entregables)

1. **Diagrama de Clases y Modelo Relacional** (Sprint 05) — no incluido en los archivos actuales del proyecto.
2. **Script SQL y diagrama físico de la base de datos, incluyendo las VISTAS** (Sprint 08) — pendiente; este resumen solo documenta principios (niveles, ACID, triggers) y propone una convención de nomenclatura de vistas a validar.
3. **Diagrama de Despliegue formal** (Sprint 09) — los diagramas de hardware cubren la infraestructura pero no un diagrama de despliegue C4 explícito.
4. **Manual Técnico y Manual de Usuario** (versiones v1‑v4) — no incluidos en los archivos del proyecto compartidos.
5. **Matriz de historias de usuario con criterios de aceptación** — no incluida en los archivos del proyecto compartidos.