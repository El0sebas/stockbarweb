import { exec, like, q, q1, type Conn } from '../db.js';

export interface DatosProveedor {
  razon_social: string;
  nombre_comercial: string | null;
  ciudad: string | null;
  direccion: string | null;
  telefono_principal: string | null;
  correo_principal: string | null;
}

export interface DatosContacto {
  nombres: string;
  apellidos: string;
  cargo: string | null;
  telefono: string;
  correo: string | null;
}

const SELECT_PROVEEDOR = `
  SELECT pr.id_proveedor, pr.razon_social, pr.nombre_comercial, pr.ciudad, pr.direccion,
    pr.telefono_principal, pr.correo_principal, pr.fecha_registro, pr.estado,
    (SELECT CONCAT_WS(' ', cp.nombres, cp.apellidos) FROM contacto_proveedor cp
      WHERE cp.id_proveedor = pr.id_proveedor AND cp.es_principal) AS contacto_principal
  FROM proveedor pr`;

const COLS_CONTACTO = 'id_proveedor, nro_contacto, nombres, apellidos, cargo, telefono, correo, es_principal';

export const proveedoresRepo = {
  proveedores: (f: { q?: string; estado?: boolean }) =>
    q(
      `${SELECT_PROVEEDOR}
       WHERE (? IS NULL OR pr.estado = ?)
         AND (? IS NULL OR CONCAT_WS(' ', pr.id_proveedor, pr.razon_social, pr.nombre_comercial) LIKE ?)
       ORDER BY pr.razon_social`,
      [f.estado ?? null, f.estado ?? null, like(f.q), like(f.q)],
    ),

  async proveedor(id: string) {
    const proveedor = await q1(`${SELECT_PROVEEDOR} WHERE pr.id_proveedor = ?`, [id]);
    if (!proveedor) return undefined;
    const contactos = await q(
      `SELECT ${COLS_CONTACTO} FROM contacto_proveedor WHERE id_proveedor = ? ORDER BY es_principal DESC, nro_contacto`,
      [id],
    );
    return { ...proveedor, contactos };
  },

  activo: async (id: string, conn?: Conn) =>
    !!(await q1('SELECT 1 FROM proveedor WHERE id_proveedor = ? AND estado', [id], conn)),

  // Productos que surte (formulario de compra). Solo productos activos.
  productos: (id: string) =>
    q(
      `SELECT pp.id_producto, pp.producto, p.maneja_vencimiento, p.id_unidad_medida
       FROM vw_productos_por_proveedor pp JOIN producto p ON p.id_producto = pp.id_producto
       WHERE pp.id_proveedor = ? AND pp.producto_activo ORDER BY pp.producto`,
      [id],
    ),

  crear: (id: string, p: DatosProveedor) =>
    exec(
      `INSERT INTO proveedor (id_proveedor, razon_social, nombre_comercial, ciudad, direccion,
         telefono_principal, correo_principal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, p.razon_social, p.nombre_comercial, p.ciudad, p.direccion, p.telefono_principal, p.correo_principal],
    ),

  actualizar: (id: string, p: DatosProveedor) =>
    exec(
      `UPDATE proveedor SET razon_social = ?, nombre_comercial = ?, ciudad = ?, direccion = ?,
         telefono_principal = ?, correo_principal = ? WHERE id_proveedor = ?`,
      [p.razon_social, p.nombre_comercial, p.ciudad, p.direccion, p.telefono_principal, p.correo_principal, id],
    ),

  cambiarEstado: (id: string, estado: boolean) =>
    exec('UPDATE proveedor SET estado = ? WHERE id_proveedor = ?', [estado, id]),

  // Los contactos pertenecen al proveedor y se van con él; si tiene productos
  // o compras asociados la FK lo impide y la transacción revierte todo.
  async eliminar(conn: Conn, id: string) {
    await exec('DELETE FROM contacto_proveedor WHERE id_proveedor = ?', [id], conn);
    return exec('DELETE FROM proveedor WHERE id_proveedor = ?', [id], conn);
  },

  // ---------- Contactos ----------
  contacto: (id: string, nro: number) =>
    q1(`SELECT ${COLS_CONTACTO} FROM contacto_proveedor WHERE id_proveedor = ? AND nro_contacto = ?`, [id, nro]),

  async crearContacto(conn: Conn, id: string, c: DatosContacto) {
    const fila = await q1(
      'SELECT COALESCE(MAX(nro_contacto), 0) + 1 AS nro FROM contacto_proveedor WHERE id_proveedor = ? FOR UPDATE',
      [id],
      conn,
    );
    await exec(
      `INSERT INTO contacto_proveedor (id_proveedor, nro_contacto, nombres, apellidos, cargo, telefono, correo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, fila.nro, c.nombres, c.apellidos, c.cargo, c.telefono, c.correo],
      conn,
    );
    return Number(fila.nro);
  },

  actualizarContacto: (id: string, nro: number, c: DatosContacto) =>
    exec(
      `UPDATE contacto_proveedor SET nombres = ?, apellidos = ?, cargo = ?, telefono = ?, correo = ?
       WHERE id_proveedor = ? AND nro_contacto = ?`,
      [c.nombres, c.apellidos, c.cargo, c.telefono, c.correo, id, nro],
    ),

  eliminarContacto: (id: string, nro: number) =>
    exec('DELETE FROM contacto_proveedor WHERE id_proveedor = ? AND nro_contacto = ?', [id, nro]),

  // Un solo contacto principal por proveedor (uq_contacto_principal): se
  // desmarca el anterior antes de marcar el nuevo.
  async marcarPrincipal(conn: Conn, id: string, nro: number) {
    await exec('UPDATE contacto_proveedor SET es_principal = FALSE WHERE id_proveedor = ? AND es_principal', [id], conn);
    return exec(
      'UPDATE contacto_proveedor SET es_principal = TRUE WHERE id_proveedor = ? AND nro_contacto = ?',
      [id, nro],
      conn,
    );
  },
};
