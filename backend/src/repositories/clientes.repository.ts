import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1 } from '../db.js';

// Cliente genérico de mostrador; lo crea la app en el arranque (sch.sql).
export const CONSUMIDOR_FINAL = 'CLI-00000';

export interface DatosCliente {
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  genero: string | null;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
}

const COLS = `id_cliente, tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, ciudad,
  direccion, telefono, correo, fecha_registro, estado`;

export const clientesRepo = {
  clientes: (f: { q?: string; estado?: boolean }) =>
    q(
      `SELECT ${COLS} FROM cliente
       WHERE (? IS NULL OR estado = ?)
         AND (? IS NULL OR CONCAT_WS(' ', numero_documento, nombres, apellidos, correo) LIKE ?)
       ORDER BY id_cliente = '${CONSUMIDOR_FINAL}' DESC, nombres, apellidos`,
      [f.estado ?? null, f.estado ?? null, like(f.q), like(f.q)],
    ),

  cliente: (id: string) => q1(`SELECT ${COLS} FROM cliente WHERE id_cliente = ?`, [id]),

  async crear(conn: PoolConnection, c: DatosCliente, id?: string) {
    const idCliente = id ?? (await nextId(conn, 'cliente', 'id_cliente', 'CLI', 5));
    await exec(
      `INSERT INTO cliente (id_cliente, tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento,
         genero, ciudad, direccion, telefono, correo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idCliente, c.tipo_documento, c.numero_documento, c.nombres, c.apellidos, c.fecha_nacimiento, c.genero,
        c.ciudad, c.direccion, c.telefono, c.correo],
      conn,
    );
    return idCliente;
  },

  // trg_validar_cliente_ins/_upd rechazan una fecha de nacimiento futura.
  actualizar: (id: string, c: DatosCliente) =>
    exec(
      `UPDATE cliente SET tipo_documento = ?, numero_documento = ?, nombres = ?, apellidos = ?,
         fecha_nacimiento = ?, genero = ?, ciudad = ?, direccion = ?, telefono = ?, correo = ? WHERE id_cliente = ?`,
      [c.tipo_documento, c.numero_documento, c.nombres, c.apellidos, c.fecha_nacimiento, c.genero, c.ciudad,
        c.direccion, c.telefono, c.correo, id],
    ),

  cambiarEstado: (id: string, estado: boolean) =>
    exec('UPDATE cliente SET estado = ? WHERE id_cliente = ?', [estado, id]),

  eliminar: (id: string) => exec('DELETE FROM cliente WHERE id_cliente = ?', [id]),
};
