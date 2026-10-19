import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const noEncontrado = (que: string) => new HttpError(404, `${que} no se encuentra disponible`);

// Mensajes para las llaves UNIQUE del sch.sql (el resto cae en el genérico).
const DUPLICADOS: [string, string][] = [
  ['uq_una_jornada_abierta', 'Ya hay una jornada abierta. Debes cerrar la jornada actual antes de abrir una nueva.'],
  ['uq_factura_proveedor', 'Esa factura ya fue registrada para este proveedor.'],
  ['_documento', 'Ya existe un registro con ese tipo y número de documento.'],
  ['usuario.correo', 'Ya existe un usuario con ese correo.'],
  ['.nombre', 'Ya existe un registro con ese nombre.'],
  ['detalle_compra.PRIMARY', 'La compra tiene dos líneas con el mismo producto y vencimiento; únelas en una sola.'],
  ['PRIMARY', 'Ya existe un registro con ese código.'],
];

// Traduce los errores de MySQL. Los SIGNAL '45000' de los triggers ya traen
// el mensaje de negocio en español: se devuelve tal cual.
function errorMysql(err: any): HttpError | null {
  switch (err?.errno) {
    case 1644: // SIGNAL SQLSTATE '45000'
      return new HttpError(422, err.sqlMessage);
    case 1062: {
      const msg = DUPLICADOS.find(([llave]) => String(err.sqlMessage).includes(llave))?.[1];
      return new HttpError(409, msg ?? 'El registro ya existe.');
    }
    case 1451:
      return new HttpError(409, 'No es posible eliminar el registro porque tiene información asociada.');
    case 1452:
      return new HttpError(422, 'Uno de los registros referenciados no existe.');
    case 3819: {
      const ck = /'([^']+)'/.exec(err.sqlMessage)?.[1] ?? '';
      return new HttpError(422, `Dato con formato inválido (${ck}).`);
    }
    case 1406:
      return new HttpError(422, 'Uno de los campos supera la longitud permitida.');
    default:
      return null;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera los 5 MB.' : err.message });
    return;
  }
  const http = err instanceof HttpError ? err : errorMysql(err);
  if (http) {
    res.status(http.status).json({ error: http.message });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
