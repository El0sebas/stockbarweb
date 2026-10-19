// Servicio de Correo Electrónico externo (C1/C2), vía SMTP.
import nodemailer from 'nodemailer';
import { config } from './config.js';

const transporte = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function enviarCorreo(para: string, asunto: string, texto: string) {
  if (transporte) {
    await transporte.sendMail({ from: config.smtp.from, to: para, subject: asunto, text: texto });
    return;
  }
  // Sin SMTP: en desarrollo se muestra en consola; en producción nunca se
  // imprime el contenido (lleva tokens).
  if (config.produccion) console.error(`[correo] SMTP sin configurar: no se envió "${asunto}" a ${para}`);
  else console.warn(`[correo de desarrollo] Para: ${para} | ${asunto}\n${texto}`);
}
