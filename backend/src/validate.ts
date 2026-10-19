// Esquemas comunes de validación de entrada (frontera de confianza de la API).
import { z } from 'zod';

export const texto = (max: number) => z.string().trim().min(1, 'Campo obligatorio').max(max);
// Texto opcional: '' y undefined se guardan como NULL.
export const opcional = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => v || null);

export const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD');
export const tipoDocumento = z.enum(['CC', 'CE', 'TI', 'PAS', 'NIT']);
export const correo = z.string().trim().toLowerCase().max(100).pipe(z.email('Correo electrónico inválido'));
export const dinero = z.number().min(0).max(9_999_999_999.99);
export const porcentaje = z.number().min(0).max(100);
export const cantidad = z.number().positive('La cantidad debe ser mayor que cero').max(99_999_999.99);
export const contrasena = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña admite máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe tener al menos una letra')
  .regex(/\d/, 'La contraseña debe tener al menos un número');

export const idMetodoPago = z.string().regex(/^[A-Z]{3}$/, 'Método de pago inválido');
export const idCliente = z.string().regex(/^CLI-\d{5}$/, 'Cliente inválido');

// Filtros de listado (?q=&desde=&hasta=&estado=)
export const filtros = z.object({
  q: z.string().trim().max(100).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  estado: z.string().trim().max(12).optional(),
});

export const estado = z.object({ estado: z.boolean() });
