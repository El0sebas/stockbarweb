import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { bajasRepo } from './repositories/bajas.repository.js';
import { seguridadRepo } from './repositories/seguridad.repository.js';
import { inicializar } from './seed.js';

await inicializar();

// HTTPS obligatorio en producción (CLAUDE.md regla 5): o lo termina el
// balanceador del proveedor cloud, o este proceso con SSL_KEY/SSL_CERT.
const servidor =
  config.tls.key && config.tls.cert
    ? https.createServer({ key: fs.readFileSync(config.tls.key), cert: fs.readFileSync(config.tls.cert) }, app)
    : http.createServer(app);
if (!(config.tls.key && config.tls.cert) && config.produccion) {
  console.warn('Sin SSL_KEY/SSL_CERT: este proceso sirve HTTP; exponerlo solo detrás de un proxy HTTPS.');
}

servidor.listen(config.port, () => {
  console.log(`API StockBar en ${config.tls.key ? 'https' : 'http'}://localhost:${config.port}/api`);
});

// HU_50: baja automática diaria de lotes vencidos (además de la que corre al
// iniciar sesión), a nombre del administrador principal.
async function bajaVencidos() {
  const admin = await seguridadRepo.adminPrincipal();
  if (admin) await bajasRepo.darBajaVencidos(admin.id_usuario);
}
const tarea = setInterval(
  () => bajaVencidos().catch((e) => console.error('Baja automática de vencidos falló:', e)),
  24 * 60 * 60 * 1000,
);

if (config.produccion && !config.smtp.host) {
  console.warn('SMTP_HOST sin configurar: la recuperación de contraseña no enviará correos.');
}

// Apagado ordenado (redeploy en la nube envía SIGTERM): deja terminar las
// peticiones en curso y cierra el pool de MySQL antes de salir.
for (const senal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(senal, () => {
    console.log(`${senal} recibido: cerrando la API...`);
    clearInterval(tarea);
    servidor.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
