import fs from 'node:fs';
import path from 'node:path';

const env = (clave: string, porDefecto?: string): string => {
  const valor = process.env[clave] || porDefecto;
  if (valor === undefined) throw new Error(`Falta la variable de entorno ${clave} (ver .env.example)`);
  return valor;
};

const jwtSecret = env('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres');

const produccion = process.env.NODE_ENV === 'production';

export const config = {
  produccion,
  port: Number(env('PORT', '3000')),
  db: {
    host: env('DB_HOST', '127.0.0.1'),
    port: Number(env('DB_PORT', '3306')),
    user: env('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: env('DB_NAME', 'stockbar'),
    timezone: env('DB_TIMEZONE', '-05:00'),
    // MySQL gestionado en la nube suele exigir TLS: DB_SSL=true (y DB_SSL_CA
    // con el certificado del proveedor si no es de una CA pública).
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA ? fs.readFileSync(process.env.DB_SSL_CA) : undefined }
      : undefined,
  },
  jwtSecret,
  jwtExpira: env('JWT_EXPIRA', '8h'),
  // En producción no hay valor por defecto: debe ser el dominio real de la web.
  corsOrigins: env('CORS_ORIGINS', produccion ? undefined : 'http://localhost:5173').split(',').map((o) => o.trim()),
  tls: { key: process.env.SSL_KEY, cert: process.env.SSL_CERT },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(env('SMTP_PORT', '587')),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: env('SMTP_FROM', 'StockBar <no-reply@stockbar.com>'),
  },
  uploadDir: path.resolve(env('UPLOAD_DIR', './uploads')),
  // CU_10_02: el token de recuperación vale 30 minutos.
  minutosTokenRecuperacion: 30,
};
