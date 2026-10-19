// Repositorio de Datos (C3): única puerta a MySQL. Solo los archivos de
// src/repositories usan estas funciones; los controladores nunca ejecutan SQL.
import mysql, { type PoolConnection, type ResultSetHeader } from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL llega como number, no como string
  dateStrings: ['DATE'], // DATE se mantiene 'YYYY-MM-DD' (sin corrimiento de zona)
  // BOOLEAN de MySQL es TINYINT(1): se entrega como true/false.
  typeCast: (field, next) => {
    if (field.type === 'TINY' && field.length === 1) {
      const v = field.string();
      return v === null ? null : v === '1';
    }
    return next();
  },
});

// La sesión usa la zona del negocio: CURDATE() de los triggers (vencimiento,
// edad) y NOW() del cierre de jornada dependen de ella.
pool.on('connection', (conn) => {
  conn.query('SET time_zone = ?', [config.db.timezone]);
});

export type Conn = PoolConnection | typeof pool;

export async function q<T = any>(sql: string, params: unknown[] = [], conn: Conn = pool): Promise<T[]> {
  const [rows] = await conn.query(sql, params);
  return rows as T[];
}

export async function q1<T = any>(sql: string, params: unknown[] = [], conn: Conn = pool): Promise<T | undefined> {
  return (await q<T>(sql, params, conn))[0];
}

export async function exec(sql: string, params: unknown[] = [], conn: Conn = pool): Promise<ResultSetHeader> {
  const [res] = await conn.query(sql, params);
  return res as ResultSetHeader;
}

// lecturaConfirmada (READ COMMITTED): cada consulta ve lo último confirmado.
// La usan ventas y bajas: tras esperar el bloqueo de un lote, los triggers
// deben validar el stock real, no la "foto" tomada al empezar la transacción.
// Un interbloqueo (1213) revierte la transacción completa: se reintenta.
export async function withTx<T>(
  fn: (conn: PoolConnection) => Promise<T>,
  opciones: { lecturaConfirmada?: boolean } = {},
): Promise<T> {
  for (let intento = 1; ; intento++) {
    const conn = await pool.getConnection();
    try {
      if (opciones.lecturaConfirmada) await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await conn.beginTransaction();
      const resultado = await fn(conn);
      await conn.commit();
      return resultado;
    } catch (e: any) {
      await conn.rollback();
      if (e?.errno !== 1213 || intento >= 3) throw e;
    } finally {
      conn.release();
    }
  }
}

// Siguiente código PREFIJO-NNN dentro de la transacción (DATABASE.md 2.1).
// tabla/columna/prefijo son constantes del código, nunca entrada del usuario.
export async function nextId(conn: PoolConnection, tabla: string, columna: string, prefijo: string, digitos: number) {
  const fila = await q1<{ n: number | null }>(
    `SELECT MAX(CAST(SUBSTRING(${columna}, ?) AS UNSIGNED)) AS n FROM ${tabla} WHERE ${columna} LIKE ? FOR UPDATE`,
    [prefijo.length + 2, `${prefijo}-%`],
    conn,
  );
  return `${prefijo}-${String(Number(fila?.n ?? 0) + 1).padStart(digitos, '0')}`;
}

// Patrón para LIKE con los comodines del usuario escapados; null = sin filtro.
export const like = (texto?: string | null) => (texto ? `%${texto.replace(/[\\%_]/g, '\\$&')}%` : null);
