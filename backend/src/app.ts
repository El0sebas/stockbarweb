import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import authController from './controllers/auth.controller.js';
import comprasController from './controllers/compras.controller.js';
import dashboardController from './controllers/dashboard.controller.js';
import inventarioController from './controllers/inventario.controller.js';
import seguridadController from './controllers/seguridad.controller.js';
import ventasController from './controllers/ventas.controller.js';
import { pool } from './db.js';
import { errorHandler, HttpError } from './errors.js';
import { autenticar } from './middleware/auth.js';

export const app = express();

// Detrás del balanceador HTTPS se confía en su X-Forwarded-For (IP real para
// el límite de intentos). Si el proceso sirve TLS él mismo no hay proxy, y
// confiar en esa cabecera permitiría falsear la IP.
app.set('trust proxy', config.tls.key ? false : 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ estado: 'ok' });
});

// Acceso es público (login, recuperación); todo lo demás exige JWT válido.
app.use('/api/auth', authController);
app.use('/api', autenticar, seguridadController, inventarioController, comprasController, ventasController, dashboardController);

app.use(() => {
  throw new HttpError(404, 'Ruta no encontrada');
});
app.use(errorHandler);
