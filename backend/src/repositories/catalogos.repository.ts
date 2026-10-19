import type { PoolConnection } from 'mysql2/promise';
import { exec, like, nextId, q, q1 } from '../db.js';

export interface DatosCategoria {
  nombre: string;
  descripcion: string | null;
  margen_defecto_porcentaje: number;
  porcentaje_iva: number;
  requiere_verificacion_edad: boolean;
}

const COLS_CATEGORIA = `c.id_categoria, c.nombre, c.descripcion, c.margen_defecto_porcentaje, c.porcentaje_iva,
  c.requiere_verificacion_edad, (SELECT COUNT(*) FROM producto p WHERE p.id_categoria = c.id_categoria) AS productos`;

export const catalogosRepo = {
  // Catálogos fijos de solo lectura (sembrados por sch.sql).
  metodosPago: () => q('SELECT id_metodo_pago, nombre FROM metodo_pago ORDER BY nombre'),
  unidadesMedida: () => q('SELECT id_unidad_medida, nombre FROM unidad_medida ORDER BY nombre'),
  motivosBaja: () => q('SELECT id_motivo_baja, nombre FROM motivo_baja ORDER BY nombre'),

  // ---------- Categorías ----------
  categorias: (texto?: string) =>
    q(
      `SELECT ${COLS_CATEGORIA} FROM categoria c
       WHERE (? IS NULL OR CONCAT_WS(' ', c.id_categoria, c.nombre) LIKE ?) ORDER BY c.id_categoria`,
      [like(texto), like(texto)],
    ),

  categoria: (id: string) => q1(`SELECT ${COLS_CATEGORIA} FROM categoria c WHERE c.id_categoria = ?`, [id]),

  async crearCategoria(conn: PoolConnection, c: DatosCategoria) {
    const id = await nextId(conn, 'categoria', 'id_categoria', 'CAT', 3);
    await exec(
      `INSERT INTO categoria (id_categoria, nombre, descripcion, margen_defecto_porcentaje, porcentaje_iva,
         requiere_verificacion_edad) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, c.nombre, c.descripcion, c.margen_defecto_porcentaje, c.porcentaje_iva, c.requiere_verificacion_edad],
      conn,
    );
    return id;
  },

  // El IVA nuevo solo aplica a ventas futuras: el de ventas pasadas está
  // congelado en detalle_venta.porcentaje_impuesto_aplicado.
  actualizarCategoria: (id: string, c: DatosCategoria) =>
    exec(
      `UPDATE categoria SET nombre = ?, descripcion = ?, margen_defecto_porcentaje = ?, porcentaje_iva = ?,
         requiere_verificacion_edad = ? WHERE id_categoria = ?`,
      [c.nombre, c.descripcion, c.margen_defecto_porcentaje, c.porcentaje_iva, c.requiere_verificacion_edad, id],
    ),

  eliminarCategoria: (id: string) => exec('DELETE FROM categoria WHERE id_categoria = ?', [id]),
};
