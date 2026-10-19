// Arranque inicial: sch.sql deja a la aplicación crear el primer
// administrador (administrador principal) y el cliente "Consumidor Final".
import bcrypt from 'bcryptjs';
import { withTx } from './db.js';
import { CONSUMIDOR_FINAL, clientesRepo } from './repositories/clientes.repository.js';
import { seguridadRepo } from './repositories/seguridad.repository.js';
import { contrasena } from './validate.js';

export async function inicializar() {
  if (!(await seguridadRepo.hayUsuarios())) {
    const correo = process.env.ADMIN_CORREO;
    const clave = process.env.ADMIN_CONTRASENA;
    if (!correo || !clave) {
      throw new Error('La base de datos no tiene usuarios: defina ADMIN_CORREO y ADMIN_CONTRASENA para crear el administrador principal.');
    }
    contrasena.parse(clave);
    await withTx(async (conn) =>
      seguridadRepo.crearUsuario(
        conn,
        {
          tipo_documento: process.env.ADMIN_TIPO_DOCUMENTO || 'CC',
          numero_documento: process.env.ADMIN_NUMERO_DOCUMENTO || '0000000001',
          nombres: process.env.ADMIN_NOMBRES || 'Administrador',
          apellidos: process.env.ADMIN_APELLIDOS || 'Principal',
          correo: correo.toLowerCase(),
          telefono: null,
          id_rol: 'ADM',
        },
        await bcrypt.hash(clave, 12),
        true,
      ),
    );
    console.log(`Administrador principal creado: ${correo}`);
  }

  if (!(await clientesRepo.cliente(CONSUMIDOR_FINAL))) {
    await withTx((conn) =>
      clientesRepo.crear(
        conn,
        {
          tipo_documento: 'CC', numero_documento: '0000000000', nombres: 'Consumidor', apellidos: 'Final',
          fecha_nacimiento: null, genero: null, ciudad: null, direccion: null, telefono: null, correo: null,
        },
        CONSUMIDOR_FINAL,
      ),
    );
    console.log('Cliente "Consumidor Final" creado');
  }
}
