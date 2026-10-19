# StockBar

Sistema de gestión para una microempresa de licores, cigarrillos y confitería: compras, inventario por lotes, ventas en ventanilla, proveedores, clientes, jornadas de caja y reportes. Tiene dos roles: **Administrador** (todo) y **Empleado** (ventas, jornada, clientes y bajas).

- **Web:** React + Bootstrap 5 (esta carpeta).
- **API:** Node.js + Express + TypeScript, JWT y permisos por rol ([`backend/`](backend/README.md)).
- **Base de datos:** MySQL; las reglas de stock, IVA, edad y vencimientos viven en triggers ([`scripts/sch.sql`](scripts/sch.sql), documentado en [`docs/DATABASE.md`](docs/DATABASE.md)).

## Probarlo completo con Docker

Requiere Docker Desktop.

```bash
cp .env.example .env      # completar la sección "Docker local" (contraseñas y JWT_SECRET)
docker compose up -d --build
```

Abrir <http://localhost:8080> e iniciar sesión con `ADMIN_CORREO` / `ADMIN_CONTRASENA` del `.env`. La primera vez MySQL carga `scripts/sch.sql` y la API crea el administrador principal.

- Ver los registros: `docker compose logs -f api`
- Apagar: `docker compose down` (los datos quedan guardados)
- Borrar todo y empezar de cero: `docker compose down -v`

Esto es para pruebas y demostraciones en un equipo. La producción va en la nube con HTTPS: ver [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Desarrollo

```bash
# API (necesita MySQL con scripts/sch.sql cargado y backend/.env, ver backend/README.md)
cd backend && npm install && npm run dev

# Web (en otra terminal; Vite reenvía /api al puerto 3000)
npm install && npm run dev
```

Antes de subir cambios: `cd backend && npm run typecheck && npm test` (contra una base de **prueba**) y `npm run lint && npm run build` en la raíz.
