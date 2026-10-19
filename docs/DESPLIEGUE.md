# Despliegue de StockBar en la nube

Guía para publicar StockBar con la arquitectura aprobada: frontend web, API y
MySQL en la nube, y en el local solo los equipos cliente (PC y Android). No hay
servidor físico en el local (CLAUDE.md, regla 11). El diagrama de despliegue C4
formal sigue pendiente (Sprint 09).

```
Navegador / app Flutter ──HTTPS 443──▶ Frontend estático (React compilado)
                         └─HTTPS 443──▶ Balanceador TLS ──▶ API Node (contenedor) ──TLS──▶ MySQL gestionado
                                                              │
                                                              └─▶ Volumen persistente (facturas de compra)
                                                              └─▶ SMTP externo (recuperación de contraseña)
```

## 1. Base de datos (MySQL gestionado)

1. Crea una instancia MySQL 8.0 o posterior con zona horaria UTC (la API fija `-05:00` en cada sesión).
2. Carga el esquema con **utf8mb4**. Sin esa opción, los mensajes de los triggers (en español) llegan mal codificados:
   ```bash
   mysql --default-character-set=utf8mb4 -h <host> -u <admin> -p < scripts/sch.sql
   ```
   Las funciones están declaradas `DETERMINISTIC`, así que se crean sin el privilegio SUPER aunque el binlog esté activo. Si el proveedor igual las rechaza, activa `log_bin_trust_function_creators=1` en su grupo de parámetros.
3. Crea un usuario solo para la aplicación, con permisos únicamente sobre `stockbar`:
   ```sql
   CREATE USER 'stockbar_app'@'%' IDENTIFIED BY '<clave larga>' REQUIRE SSL;
   GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON stockbar.* TO 'stockbar_app'@'%';
   ```
4. Restringe el acceso de red a la IP o red privada de la API. La base de datos nunca debe quedar abierta a internet.
5. Activa los respaldos automáticos diarios del proveedor.

## 2. API (`backend/`)

Imagen de contenedor: `backend/Dockerfile`. Compila TypeScript, corre como usuario sin privilegios y trae un healthcheck en `/api/health`.

```bash
cd backend
docker build -t stockbar-api .
```

Variables de entorno obligatorias en producción (lista completa en `backend/.env.example`):

| Variable | Valor en producción |
|---|---|
| `NODE_ENV` | `production` (la imagen ya lo define) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Datos del usuario `stockbar_app` |
| `DB_SSL` / `DB_SSL_CA` | `true` y, si el proveedor la entrega, la ruta a su CA |
| `JWT_SECRET` | Aleatorio, 32 caracteres o más (`openssl rand -hex 32`). Si cambia, se cierran todas las sesiones |
| `CORS_ORIGINS` | Dominio HTTPS exacto del frontend, p. ej. `https://stockbar.tu-dominio.com`. Sin él la API no arranca |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Servicio de correo externo. Sin él no llega el token de recuperación |
| `ADMIN_CORREO`, `ADMIN_CONTRASENA` | Solo para el primer arranque: crean el administrador principal si no hay usuarios. Quítalas después |

Guarda los secretos en el gestor de secretos del proveedor, nunca en el repositorio ni en la imagen.

**HTTPS.** Lo normal es que el balanceador del proveedor termine el TLS en el puerto 443 y reenvíe al contenedor (puerto 3000). La API confía en un proxy (`trust proxy 1`), así que el límite de intentos de login usa la IP real del cliente. Si no hay balanceador, define `SSL_KEY` y `SSL_CERT` y el proceso sirve HTTPS directamente.

**Facturas de compra.** Se guardan en `UPLOAD_DIR` (`/data/uploads` en la imagen). Monta ahí un volumen persistente. Si no, se pierden en cada redespliegue. Incluye ese volumen en los respaldos. Con más de una réplica de la API, el volumen debe ser compartido (por ejemplo NFS o EFS).

**Tareas automáticas.** La baja de lotes vencidos corre al iniciar sesión y una vez al día dentro del proceso. No se necesita un cron externo.

**Apagado.** Ante `SIGTERM`, la API deja terminar las peticiones en curso y cierra el pool de MySQL (máximo 10 s).

## 3. Frontend web (raíz del repositorio)

```bash
echo "VITE_API_URL=https://api.tu-dominio.com/api" > .env.production.local
npm ci
npm run build                            # genera dist/
```

Publica `dist/` en un hosting estático con HTTPS (bucket con CDN, Netlify, Vercel, Nginx, etc.). La aplicación tiene una sola ruta, así que no hace falta reescribir URLs.

Si el frontend y la API comparten dominio (el proxy reenvía `/api` a la API), deja `VITE_API_URL` vacío.

## 4. App móvil (Flutter)

Usa la misma API y la misma URL HTTPS que la web. No requiere otro backend ni variables nuevas. `CORS_ORIGINS` no aplica a la app nativa.

## 5. Verificación después de desplegar

1. `GET https://api.tu-dominio.com/api/health` responde `{"estado":"ok"}`. Esto confirma que hay conexión con MySQL.
2. Inicia sesión con el administrador principal y cambia su contraseña. Luego quita `ADMIN_CONTRASENA` de la configuración.
3. Prueba "¿Olvidaste tu contraseña?" para confirmar que el correo llega.
4. Registra una compra con factura adjunta, redespliega la API y comprueba que la factura sigue descargándose (volumen persistente).
5. Abre una jornada, registra una venta y verifica el stock y el dashboard.

## 6. Todo en un equipo con Docker (pruebas y sustentación)

`docker-compose.yml` levanta MySQL, la API y la web compilada (nginx) en una sola máquina. No reemplaza el despliegue en la nube: no tiene HTTPS ni respaldos.

```bash
cp .env.example .env          # completar la sección "Docker local"
docker compose up -d --build  # web en http://localhost:8080
```

- **MySQL** (`mysql:8.4`) carga `scripts/sch.sql` solo la primera vez (volumen `stockbar-mysql`). No publica puertos.
- **API**: la imagen de `backend/Dockerfile`, con el usuario `stockbar_app`. Las facturas van al volumen `stockbar-facturas`. No publica puertos: solo se llega a ella por nginx.
- **Web**: el `Dockerfile` de la raíz compila la web y la sirve con nginx (`nginx.conf`), que reenvía `/api` a la API. Web y API comparten origen, así que no hace falta `VITE_API_URL`.
- Sin `SMTP_*` en `.env`, "¿Olvidaste tu contraseña?" no envía el correo.
- `docker compose down -v` borra la base y las facturas.

## 7. Pruebas antes de cada despliegue

```bash
cd backend && npm run typecheck && npm test   # contra una BD de PRUEBA recién cargada con sch.sql
cd .. && npm run lint && npm run build
```
