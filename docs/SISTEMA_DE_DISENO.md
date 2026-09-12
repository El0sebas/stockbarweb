# Sistema de diseño — StockBar (Web + Móvil)

Extraído directamente del código implementado (no es aspiracional): `src/index.css` en la web y `lib/core/theme.dart` en móvil. Ambas plataformas comparten la misma paleta base; solo cambia cómo se aplica.

## 1. Paleta de color (tokens)

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| `--bg-main` | `#F8FAFC` | Fondo general de la app |
| `--bg-card` | `#FFFFFF` | Tarjetas, modales, header, sidebar |
| `--bg-input` | `#FFFFFF` | Fondo de inputs |
| `--bg-surface` | `#F1F5F9` | Fondo neutro de pistas de switches/superficies internas |
| `--text-main` | `#1A365D` | Texto principal (azul profundo, no negro puro) |
| `--text-muted` | `#64748B` | Texto secundario/labels |
| `--border-color` | `#E2E8F0` | Bordes de tarjetas, inputs, tablas |
| `--amber-action` | `#F59E0B` | Color de acción (botones primarios, iconos activos) |
| `--amber-action-hover` | `#D97706` | Hover de acción |
| `--sidebar-active-bg` | `#FEF3C7` | Fondo del ítem de menú activo |
| `--sidebar-active-text` | `#D97706` | Texto del ítem de menú activo |
| `--brand-blue` | `#3B82F6` | Acento informativo / "ver detalle" |
| `--brand-success` | `#10B981` | Estado positivo (Activo, Completado, Recibida) |
| `--brand-danger` | `#EF4444` | Estado negativo / alertas de stock |
| `--brand-purple` | `#A855F7` | Acento adicional (poco usado) |
| `--blue-soft-bg` | `#DBEAFE` | Fondo suave para íconos/badges azules |
| `--success-soft-bg` | `#D1FAE5` | Fondo suave para íconos/badges de éxito |
| `--danger-soft-bg` | `#FEE2E2` | Fondo suave para íconos/badges de peligro |
| `--amber-soft-bg` | `#FEF3C7` | Fondo suave para íconos/badges de acción/advertencia |
| `--overlay-scrim` | `rgba(15,23,42,.6)` | Fondo oscurecido detrás de modales |

### Modo oscuro (mismos tokens, valores distintos)

| Token | Hex/valor |
|---|---|
| `--bg-main` | `#0F172A` |
| `--bg-card` | `#182232` |
| `--bg-input` | `#0F172A` |
| `--bg-surface` | `#0F172A` |
| `--text-main` | `#F8FAFC` |
| `--text-muted` | `#94A3B8` |
| `--border-color` | `#233044` |
| `--amber-action` | `#F59E0B` (igual) |
| `--amber-action-hover` | `#FBBF24` |
| `--sidebar-active-bg` | `rgba(245,158,11,.22)` |
| `--sidebar-active-text` | `#F59E0B` |
| `--brand-blue` | `#60A5FA` |
| `--brand-success` | `#34D399` |
| `--brand-danger` | `#F87171` |
| `--overlay-scrim` | `rgba(2,6,23,.7)` |

**Regla de composición** (de la ficha del proyecto): 60% neutro (fondos) · 30% estructura (navegación/datos, azul) · 10% acción (ámbar). El ámbar nunca domina la interfaz — se reserva para botones primarios, iconos de acción y alertas.

**El color comunica estado, no decora**: verde = éxito/activo/completado, ámbar = pendiente/advertencia, rojo = peligro/inactivo/stock bajo, azul = informativo/neutro. Un mismo significado usa siempre el mismo color en toda la app (web y móvil).

## 2. Móvil (Flutter) — mapeo de colores

`lib/core/theme.dart` define los mismos conceptos con nombres propios:

| Concepto | Claro | Oscuro |
|---|---|---|
| Fondo | `lightBackground #F8FAFC` | `darkBackground #111827` |
| Tarjeta / Header | `lightCard #FFFFFF` | `darkCard #1F2937` |
| Input | `lightInput #F8FAFC` | `darkInput #111827` |
| Borde | `lightBorder #E2E8F0` | `darkBorder #374151` |
| Texto principal | `lightText #0F172A` | `darkText #F8FAFC` |
| Texto secundario | `lightMuted #64748B` | `darkMuted #94A3B8` |
| Acción (ámbar) | `actionAmber #F59E0B` (ambos modos) | |
| Estructura (azul) | `primaryBlue #1A365D` (ambos modos) | |
| Azul de logo | `logoBlue #3B82F6` | |
| Éxito / Peligro | `success #10B981` / `danger #EF4444` (ambos modos) | |

**Importante**: el AppBar de móvil usaba antes `primaryBlue` fijo en ambos modos (chocaba con el fondo blanco en modo claro). Se corrigió para que el header use el color de tarjeta del tema activo (blanco en claro, gris oscuro en oscuro), igual que el header de la web.

## 3. Tipografía

- **Web**: `'Inter', 'Segoe UI', Tahoma, sans-serif`.
- **Móvil**: Google Fonts *Poppins* (`GoogleFonts.poppinsTextTheme`).

## 4. Radios y sombras

- Botones e inputs: `border-radius: 0.8rem` (web).
- Modales: `border-radius: 1.1rem`, sombra `0 20px 40px rgba(15,23,42,.18)`.
- Badges: `border-radius: 999px` (pill).
- Tarjetas de KPI/dashboard: `border-radius: 12px`, borde `1px solid var(--border-color)`.
- Sombra ambiental estándar (`--shadow-soft`): `0 12px 30px rgba(15,23,42,.08)` en claro, más opaca en oscuro.

## 5. Componentes reutilizables (web)

Viven en `src/components/common/` y se usan en **todas** las tablas CRUD para que el mismo gesto/ícono signifique lo mismo en cualquier módulo:

- **`RowActions`** — trío de botones Ver (ojo, azul) / Editar (lápiz, ámbar) / Eliminar (basura, rojo). Soporta `hideEdit`, `hideDelete` y `disabledReason` (deshabilita editar/eliminar con tooltip explicando por qué, en vez de ocultar los botones — usado para el rol "Administrador" y el usuario semilla).
- **`StatusToggle`** — switch deslizante de dos posiciones (Activo/Inactivo por defecto, o Pendiente/Completado según el módulo). Estado inactivo siempre en gris neutro (`--text-muted`), nunca rojo ni ámbar — el rojo/ámbar se reserva para alertas reales.
- **`ConfirmDeleteModal`** — modal de confirmación de borrado, centralizado (antes había 7 copias casi idénticas).
- **`BarList`** — gráfica de barras horizontales simple: un color por fila (o color de estado), etiqueta directa nombre+valor, tooltip nativo. Usada en el Dashboard.

## 6. Regla de interacción: cambio de estado

**El cambio de estado vive siempre en el listado (tabla), nunca en los formularios de creación/edición.** Ningún modal de formulario tiene un `<select>` de "Estado".

Dos tipos de estado, con comportamiento distinto:

1. **Estados reversibles** (Activo ⇄ Inactivo): Usuarios, Productos, Proveedores, Clientes, Métodos de Pago. Se alternan libremente desde `StatusToggle` en la lista.
2. **Estados de flujo, de una sola vía**: Ventas (`Pendiente → Completado`) y Compras (`Pendiente → Recibida`). Una vez completado/recibido, no puede volver atrás — el guard vive en el handler (`if (estado === 'Completado') return;`).

## 7. Layout general (web)

- **Sidebar** fijo a la izquierda (220px), logo + navegación por íconos, sin botón de cerrar sesión (se movió al dropdown del perfil).
- **Header** superior: título de la sección activa + botón de tema (sol/luna) + dropdown de perfil (ícono `PersonCircle`) que despliega "Cerrar Sesión".
- **Footer** simple con copyright.
- Contenido principal: tarjetas `card` con `border-0 shadow-sm rounded-3`, tablas `table-hover align-middle`.

## 8. Layout general (móvil)

- **AppBar** con título "StockBar" + avatar circular (iniciales del usuario, fondo ámbar) que abre un `showModalBottomSheet` con: datos del usuario, cambiar tema, cerrar sesión.
- **BottomNavigationBar** con 2 ítems para Administrador (Inicio, Ventas); sin barra de navegación para Empleado Auxiliar (una sola pantalla: Ventas).
- Formularios largos van en `showModalBottomSheet` con `isScrollControlled: true`, altura `88%` de la pantalla, contenido intermedio scrollable y encabezado/total/botón de confirmar siempre fijos (para evitar overflow).
