-- ============================================================
-- STOCKBAR - BASE DE DATOS COMPLETA
-- Port a MySQL 8.0+ / MariaDB 10.5+ del script original en PostgreSQL
-- (stockbar_schema.sql), para alinear con la Arquitectura de Software
-- y de Hardware ya aprobadas (ambas especifican MySQL como motor).
--
-- Requisitos del servidor:
--   * MySQL 8.0.16+ (soporte real de CHECK constraints) o MariaDB 10.5+.
--   * Las funciones (fn_stock_lote, fn_total_venta, fn_total_pagado) se
--     crean como DETERMINISTIC para poder crearse sin privilegio SUPER
--     con binlog en modo STATEMENT. Alternativa: ejecutar antes
--     `SET GLOBAL log_bin_trust_function_creators = 1;` y quitar la
--     palabra DETERMINISTIC de las tres funciones.
--
-- CAMBIOS respecto al script original (PostgreSQL) que subiste, y por qué:
--
-- 1) venta.id_cliente pasa de NOT NULL a NULLABLE.
--    El original bloqueaba la venta de mostrador sin cliente formal, que
--    es justo el flujo que describe la ficha del proyecto (cliente llega
--    a la vitrina, pide el producto, paga) y que el propio proyecto ya
--    había probado como caso de negocio explícito (venta sin cliente,
--    con reversión de stock al anular). La verificación de edad para
--    categorías restringidas NO se debilita: sigue exigiendo un cliente
--    con fecha de nacimiento válida cuando el producto lo requiere.
--
-- 2) UNIQUE (id_proveedor, numero_factura_proveedor) agregado en compra.
--    Evita registrar dos veces la misma factura del mismo proveedor;
--    ya era un caso de negocio probado en la versión anterior del
--    proyecto y no tenía respaldo en el script que subiste.
--
-- 3) AGREGADO: compra.ruta_factura (VARCHAR). Faltaba por completo en el
--    físico que subiste. La ficha del proyecto justifica TODO el sistema
--    en que "la conservación física de las facturas... conlleva riesgo
--    de deterioro, extravío o desorganización, dificultando la
--    trazabilidad". Sin un campo para la factura digitalizada, la base
--    de datos no resuelve ese problema central: solo registra que hubo
--    una compra, no el comprobante que reemplaza al papel.
--
-- 4) Índices en columnas FK: no hace falta agregarlos a mano. A
--    diferencia de PostgreSQL, InnoDB crea automáticamente un índice por
--    cada columna de llave foránea. El hallazgo de rendimiento que te
--    marqué sobre el script en Postgres no aplica aquí.
--
-- 5) MySQL no tiene "constraint triggers" diferibles (no existe
--    DEFERRABLE INITIALLY DEFERRED). El original validaba "pagos = total"
--    al COMMIT, lo que permitía insertar la venta ya COMPLETADA y recién
--    validar al final de la transacción. Aquí se introduce un estado
--    intermedio venta.estado = 'PENDIENTE' (nuevo, no estaba en el
--    original): el flujo obligatorio pasa a ser INSERT venta (PENDIENTE)
--    -> INSERT detalle_venta -> INSERT venta_pago -> UPDATE venta SET
--    estado='COMPLETADA' (este último paso dispara la validación de
--    cuadre). Es exactamente el flujo que las notas del script original
--    ya recomendaban como buena práctica; aquí queda forzado por diseño.
--
-- 6) A raíz del punto 5 encontré una condición de carrera que el diseño
--    original no cubría: si el stock disponible solo descuenta ventas
--    COMPLETADAS, dos ventas PENDIENTES simultáneas podrían "reservar"
--    las mismas unidades de un lote sin que ninguna se entere hasta el
--    momento de completarlas (nada vuelve a validar cantidades al
--    cerrar). Corregido en fn_stock_lote: ahora descuenta ventas en
--    estado PENDIENTE o COMPLETADA (no solo COMPLETADA), de modo que
--    agregar un producto al carrito reserva el stock de inmediato, igual
--    que en un punto de venta real. La anulación de una venta PENDIENTE
--    libera el stock automáticamente por el mismo motivo.
--
-- 7) AGREGADO: bloqueo simétrico en detalle_venta. El original ya
--    impedía tocar los pagos de una venta COMPLETADA
--    (fn_bloquear_pago_venta_cerrada) pero no impedía agregar líneas de
--    producto nuevas a una venta ya cerrada. Se agregó el mismo bloqueo
--    para detalle_venta.
--
-- 8) cliente.fecha_nacimiento <= fecha actual: en el original era un
--    CHECK constraint con CURRENT_DATE. MySQL 8 prohíbe funciones no
--    deterministas (CURRENT_DATE, NOW, etc.) dentro de un CHECK
--    constraint, así que esa regla se movió a un trigger
--    (trg_validar_cliente_ins/upd). Es un detalle puramente de
--    compatibilidad, no cambia la regla de negocio.
--
-- 9) AGREGADO: sp_completar_venta(id_venta) como procedimiento de
--    conveniencia para el paso final del flujo del punto 5 (equivale a
--    UPDATE venta SET estado='COMPLETADA'; se agrega solo para que la
--    capa de aplicación tenga un único punto de entrada, siguiendo el
--    mismo patrón de procedimientos que ya usaba este proyecto en su
--    script de pruebas anterior, ej. sp_validar_cantidades_lotes_venta).
--
-- IMPORTANTE: si te quedas con este físico en MySQL, los documentos
-- casos_prueba_stockbar.md, casos_explicados.md y stockbar_datos_prueba.sql
-- quedan desactualizados (tablas, triggers y hasta el flujo de venta
-- PENDIENTE/COMPLETADA cambiaron) y conviene regenerarlos contra este
-- script. Avísame si quieres que los rehaga.
-- ============================================================

CREATE DATABASE IF NOT EXISTS stockbar
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stockbar;

-- -------------------------
-- LIMPIEZA (opcional)
-- -------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS venta_pago;
DROP TABLE IF EXISTS detalle_venta;
DROP TABLE IF EXISTS venta;
DROP TABLE IF EXISTS baja_inventario;
DROP TABLE IF EXISTS lote;
DROP TABLE IF EXISTS compra;
DROP TABLE IF EXISTS jornada;
DROP TABLE IF EXISTS producto_proveedor;
DROP TABLE IF EXISTS contacto_proveedor;
DROP TABLE IF EXISTS proveedor;
DROP TABLE IF EXISTS cliente;
DROP TABLE IF EXISTS recuperacion_contrasena;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS rol_permiso;
DROP TABLE IF EXISTS permiso;
DROP TABLE IF EXISTS metodo_pago;
DROP TABLE IF EXISTS unidad_medida;
DROP TABLE IF EXISTS motivo_baja;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS rol;
SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------
-- CATÁLOGOS
-- -------------------------
CREATE TABLE rol (
    id_rol SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE permiso (
    id_permiso SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    modulo VARCHAR(40) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (
    id_rol SMALLINT UNSIGNED NOT NULL,
    id_permiso SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol),
    FOREIGN KEY (id_permiso) REFERENCES permiso(id_permiso)
) ENGINE=InnoDB;

CREATE TABLE metodo_pago (
    id_metodo_pago SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE unidad_medida (
    id_unidad_medida SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE motivo_baja (
    id_motivo_baja SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE categoria (
    id_categoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    margen_defecto_porcentaje DECIMAL(5,2) NOT NULL,
    -- AGREGADO: IVA de la categoría (19.00 general, 5.00 para Licores por la
    -- tarifa diferencial de licores/vinos/aperitivos >15° en Colombia). Se
    -- congela por línea en detalle_venta.porcentaje_impuesto_aplicado para
    -- que un cambio futuro de tarifa no altere ventas ya registradas.
    porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    requiere_verificacion_edad BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_categoria_margen CHECK (margen_defecto_porcentaje >= 0),
    CONSTRAINT ck_categoria_iva CHECK (porcentaje_iva >= 0 AND porcentaje_iva <= 100)
) ENGINE=InnoDB;

-- -------------------------
-- SEGURIDAD / USUARIOS
-- -------------------------
CREATE TABLE usuario (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo_documento VARCHAR(5) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    id_rol SMALLINT UNSIGNED NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_usuario_tipo_documento CHECK (tipo_documento IN ('CC','CE','TI','PAS','NIT')),
    CONSTRAINT uq_usuario_documento UNIQUE (tipo_documento, numero_documento),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
) ENGINE=InnoDB;

CREATE TABLE recuperacion_contrasena (
    id_token INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_recuperacion_fechas CHECK (fecha_expiracion > fecha_generacion),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- -------------------------
-- TERCEROS
-- -------------------------
CREATE TABLE cliente (
    id_cliente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo_documento VARCHAR(5) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    fecha_nacimiento DATE,
    genero VARCHAR(20),
    ciudad VARCHAR(60),
    direccion VARCHAR(150),
    telefono VARCHAR(20),
    correo VARCHAR(100),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_cliente_tipo_documento CHECK (tipo_documento IN ('CC','CE','TI','PAS','NIT')),
    CONSTRAINT uq_cliente_documento UNIQUE (tipo_documento, numero_documento)
    -- CAMBIO: la validación "fecha_nacimiento no puede ser futura" se movió a
    -- un trigger (trg_validar_cliente_ins/upd) porque MySQL prohíbe funciones
    -- no deterministas (CURRENT_DATE) dentro de un CHECK constraint.
) ENGINE=InnoDB;

CREATE TABLE proveedor (
    id_proveedor INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nit VARCHAR(20) NOT NULL UNIQUE,
    razon_social VARCHAR(120) NOT NULL,
    nombre_comercial VARCHAR(120),
    ciudad VARCHAR(60),
    direccion VARCHAR(150),
    telefono_principal VARCHAR(20),
    correo_principal VARCHAR(100),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE contacto_proveedor (
    id_contacto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT UNSIGNED NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    cargo VARCHAR(60),
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(100),
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    -- CAMBIO: MySQL no soporta CREATE UNIQUE INDEX ... WHERE (índice parcial
    -- de Postgres). Se simula con una columna generada que solo tiene valor
    -- cuando la fila es "contacto principal activo"; varias filas con NULL
    -- coexisten sin problema, así que el UNIQUE KEY solo choca cuando dos
    -- contactos del mismo proveedor son principal+activo a la vez.
    id_proveedor_principal_activo INT UNSIGNED
        GENERATED ALWAYS AS (CASE WHEN es_principal = TRUE AND estado = TRUE THEN id_proveedor END) STORED,
    UNIQUE KEY uq_contacto_principal_activo (id_proveedor_principal_activo),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
) ENGINE=InnoDB;

-- -------------------------
-- PRODUCTOS
-- -------------------------
CREATE TABLE producto (
    id_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo_sku VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),
    id_categoria INT UNSIGNED NOT NULL,
    id_unidad_medida SMALLINT UNSIGNED NOT NULL,
    margen_personalizado_porcentaje DECIMAL(5,2),
    maneja_vencimiento BOOLEAN NOT NULL DEFAULT TRUE,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_producto_margen CHECK (margen_personalizado_porcentaje IS NULL OR margen_personalizado_porcentaje >= 0),
    CONSTRAINT ck_producto_stock_minimo CHECK (stock_minimo >= 0),
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    FOREIGN KEY (id_unidad_medida) REFERENCES unidad_medida(id_unidad_medida)
) ENGINE=InnoDB;

CREATE TABLE producto_proveedor (
    id_producto INT UNSIGNED NOT NULL,
    id_proveedor INT UNSIGNED NOT NULL,
    precio_referencia DECIMAL(12,2),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_producto, id_proveedor),
    CONSTRAINT ck_producto_proveedor_precio CHECK (precio_referencia IS NULL OR precio_referencia >= 0),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
) ENGINE=InnoDB;

-- -------------------------
-- JORNADAS
-- -------------------------
CREATE TABLE jornada (
    id_jornada INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario_apertura INT UNSIGNED NOT NULL,
    fecha_hora_apertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_cierre INT UNSIGNED,
    fecha_hora_cierre TIMESTAMP NULL,
    estado VARCHAR(10) NOT NULL DEFAULT 'ABIERTA',
    observaciones VARCHAR(255),
    -- CAMBIO: reemplaza CREATE UNIQUE INDEX ... WHERE estado='ABIERTA' de Postgres.
    estado_abierta_unico VARCHAR(10)
        GENERATED ALWAYS AS (CASE WHEN estado = 'ABIERTA' THEN 'ABIERTA' END) STORED,
    UNIQUE KEY uq_una_jornada_abierta (estado_abierta_unico),
    CONSTRAINT ck_jornada_estado CHECK (estado IN ('ABIERTA','CERRADA')),
    CONSTRAINT ck_jornada_cierre_coherente CHECK (
        (estado = 'ABIERTA' AND fecha_hora_cierre IS NULL AND id_usuario_cierre IS NULL)
        OR
        (estado = 'CERRADA' AND fecha_hora_cierre IS NOT NULL AND id_usuario_cierre IS NOT NULL)
    ),
    CONSTRAINT ck_jornada_fechas CHECK (fecha_hora_cierre IS NULL OR fecha_hora_cierre >= fecha_hora_apertura),
    FOREIGN KEY (id_usuario_apertura) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario_cierre) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- -------------------------
-- COMPRAS / LOTES
-- -------------------------
CREATE TABLE compra (
    id_compra INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    numero_factura_proveedor VARCHAR(40),
    -- AGREGADO: ver punto 3 del encabezado (no existía en el script subido).
    ruta_factura VARCHAR(255),
    fecha_compra DATE NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(12) NOT NULL DEFAULT 'REGISTRADA',
    observaciones VARCHAR(255),
    CONSTRAINT ck_compra_estado CHECK (estado IN ('REGISTRADA','ANULADA')),
    -- AGREGADO: ver punto 2 del encabezado.
    CONSTRAINT uq_factura_proveedor UNIQUE (id_proveedor, numero_factura_proveedor),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE lote (
    id_lote INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_compra INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    precio_unitario_compra DECIMAL(12,2) NOT NULL,
    fecha_vencimiento DATE,
    numero_lote_proveedor VARCHAR(40),
    CONSTRAINT ck_lote_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_lote_precio CHECK (precio_unitario_compra >= 0),
    FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
) ENGINE=InnoDB;

-- -------------------------
-- BAJAS
-- -------------------------
CREATE TABLE baja_inventario (
    id_baja INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_lote INT UNSIGNED NOT NULL,
    id_motivo_baja SMALLINT UNSIGNED NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT UNSIGNED NOT NULL,
    observaciones VARCHAR(255),
    CONSTRAINT ck_baja_cantidad CHECK (cantidad > 0),
    FOREIGN KEY (id_lote) REFERENCES lote(id_lote),
    FOREIGN KEY (id_motivo_baja) REFERENCES motivo_baja(id_motivo_baja),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- -------------------------
-- VENTAS
-- -------------------------
CREATE TABLE venta (
    id_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- CAMBIO: era NOT NULL en el script subido. Ver punto 1 del encabezado.
    id_cliente INT UNSIGNED NULL,
    id_jornada INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    fecha_hora_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- CAMBIO: se agrega 'PENDIENTE' como estado inicial. Ver punto 5 del
    -- encabezado (MySQL no tiene constraint triggers diferibles).
    estado VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE',
    observaciones VARCHAR(255),
    CONSTRAINT ck_venta_estado CHECK (estado IN ('PENDIENTE','COMPLETADA','ANULADA')),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_jornada) REFERENCES jornada(id_jornada),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE detalle_venta (
    id_detalle_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_venta INT UNSIGNED NOT NULL,
    id_lote INT UNSIGNED NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    -- precio_unitario_venta es el precio FINAL que paga el cliente (ya
    -- incluye el IVA), igual que en el mostrador real. No es un precio base.
    precio_unitario_venta DECIMAL(12,2) NOT NULL,
    -- AGREGADO: tasa de IVA vigente al momento de la venta, congelada por
    -- línea (mismo patrón que precio_unitario_venta). La rellena
    -- automáticamente trg_validar_detalle_venta_ins/upd desde la categoría
    -- del producto: no se recibe ni se confía en lo que mande la aplicación.
    porcentaje_impuesto_aplicado DECIMAL(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT ck_detalle_venta_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_venta_precio CHECK (precio_unitario_venta >= 0),
    CONSTRAINT ck_detalle_venta_iva CHECK (porcentaje_impuesto_aplicado >= 0 AND porcentaje_impuesto_aplicado <= 100),
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    FOREIGN KEY (id_lote) REFERENCES lote(id_lote)
) ENGINE=InnoDB;

CREATE TABLE venta_pago (
    id_venta_pago INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_venta INT UNSIGNED NOT NULL,
    id_metodo_pago SMALLINT UNSIGNED NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    referencia_transaccion VARCHAR(60),
    CONSTRAINT ck_venta_pago_monto CHECK (monto > 0),
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
) ENGINE=InnoDB;

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

DROP FUNCTION IF EXISTS fn_stock_lote;
DELIMITER $$
CREATE FUNCTION fn_stock_lote(p_id_lote INT UNSIGNED)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_cantidad DECIMAL(10,2);
    DECLARE v_vendido DECIMAL(10,2);
    DECLARE v_dado_baja DECIMAL(10,2);

    SELECT cantidad INTO v_cantidad FROM lote WHERE id_lote = p_id_lote;

    -- CAMBIO: se descuentan ventas PENDIENTES y COMPLETADAS (no solo
    -- COMPLETADAS como en el original). Ver punto 6 del encabezado: corrige
    -- una condición de carrera que introduce el estado PENDIENTE.
    SELECT COALESCE(SUM(dv.cantidad), 0) INTO v_vendido
    FROM detalle_venta dv
    JOIN venta v ON v.id_venta = dv.id_venta
    WHERE dv.id_lote = p_id_lote
      AND v.estado IN ('PENDIENTE', 'COMPLETADA');

    SELECT COALESCE(SUM(bi.cantidad), 0) INTO v_dado_baja
    FROM baja_inventario bi
    WHERE bi.id_lote = p_id_lote;

    RETURN v_cantidad - v_vendido - v_dado_baja;
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS fn_total_venta;
DELIMITER $$
CREATE FUNCTION fn_total_venta(p_id_venta INT UNSIGNED)
RETURNS DECIMAL(14,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);
    SELECT COALESCE(SUM(cantidad * precio_unitario_venta), 0) INTO v_total
    FROM detalle_venta
    WHERE id_venta = p_id_venta;
    RETURN v_total;
END$$
DELIMITER ;

-- AGREGADO: desglose de IVA para el recibo/reporte fiscal. precio_unitario_venta
-- ya incluye el IVA, así que la base gravable se obtiene descontándolo con la
-- tasa que quedó congelada por línea; el total de la venta (fn_total_venta)
-- no cambia.
DROP FUNCTION IF EXISTS fn_base_gravable_venta;
DELIMITER $$
CREATE FUNCTION fn_base_gravable_venta(p_id_venta INT UNSIGNED)
RETURNS DECIMAL(14,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_base DECIMAL(14,2);
    SELECT COALESCE(SUM(cantidad * precio_unitario_venta / (1 + porcentaje_impuesto_aplicado / 100)), 0)
      INTO v_base
    FROM detalle_venta
    WHERE id_venta = p_id_venta;
    RETURN v_base;
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS fn_iva_venta;
DELIMITER $$
CREATE FUNCTION fn_iva_venta(p_id_venta INT UNSIGNED)
RETURNS DECIMAL(14,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN fn_total_venta(p_id_venta) - fn_base_gravable_venta(p_id_venta);
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS fn_total_pagado;
DELIMITER $$
CREATE FUNCTION fn_total_pagado(p_id_venta INT UNSIGNED)
RETURNS DECIMAL(14,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);
    SELECT COALESCE(SUM(monto), 0) INTO v_total
    FROM venta_pago
    WHERE id_venta = p_id_venta;
    RETURN v_total;
END$$
DELIMITER ;

-- ============================================================
-- VALIDACIÓN DE CLIENTE (fecha de nacimiento no futura)
-- Ver punto 8 del encabezado: en Postgres era un CHECK; MySQL prohíbe
-- CURRENT_DATE dentro de un CHECK constraint.
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_cliente;
DELIMITER $$
CREATE PROCEDURE sp_validar_cliente(IN p_fecha_nacimiento DATE)
BEGIN
    IF p_fecha_nacimiento IS NOT NULL AND p_fecha_nacimiento > CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La fecha de nacimiento no puede ser una fecha futura.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_cliente_ins;
DROP TRIGGER IF EXISTS trg_validar_cliente_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_cliente_ins BEFORE INSERT ON cliente
FOR EACH ROW
BEGIN
    CALL sp_validar_cliente(NEW.fecha_nacimiento);
END$$

CREATE TRIGGER trg_validar_cliente_upd BEFORE UPDATE ON cliente
FOR EACH ROW
BEGIN
    CALL sp_validar_cliente(NEW.fecha_nacimiento);
END$$
DELIMITER ;

-- ============================================================
-- VALIDACIÓN DE LOTES
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_lote;
DELIMITER $$
CREATE PROCEDURE sp_validar_lote(
    IN p_id_producto INT UNSIGNED,
    IN p_fecha_vencimiento DATE,
    IN p_id_compra INT UNSIGNED
)
BEGIN
    DECLARE v_maneja_vencimiento BOOLEAN;
    DECLARE v_fecha_compra DATE;

    SELECT maneja_vencimiento INTO v_maneja_vencimiento
    FROM producto WHERE id_producto = p_id_producto;

    SELECT fecha_compra INTO v_fecha_compra
    FROM compra WHERE id_compra = p_id_compra;

    IF v_maneja_vencimiento = TRUE AND p_fecha_vencimiento IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto requiere fecha de vencimiento.';
    END IF;

    IF p_fecha_vencimiento IS NOT NULL AND p_fecha_vencimiento < v_fecha_compra THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha de vencimiento no puede ser anterior a la fecha de compra.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_lote_ins;
DROP TRIGGER IF EXISTS trg_validar_lote_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_lote_ins BEFORE INSERT ON lote
FOR EACH ROW
BEGIN
    CALL sp_validar_lote(NEW.id_producto, NEW.fecha_vencimiento, NEW.id_compra);
END$$

CREATE TRIGGER trg_validar_lote_upd BEFORE UPDATE ON lote
FOR EACH ROW
BEGIN
    CALL sp_validar_lote(NEW.id_producto, NEW.fecha_vencimiento, NEW.id_compra);
END$$
DELIMITER ;

-- ============================================================
-- VALIDACIÓN DE BAJAS
-- ============================================================

DROP TRIGGER IF EXISTS trg_validar_baja_ins;
DROP TRIGGER IF EXISTS trg_validar_baja_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_baja_ins BEFORE INSERT ON baja_inventario
FOR EACH ROW
BEGIN
    DECLARE v_disponible DECIMAL(10,2);
    SET v_disponible = fn_stock_lote(NEW.id_lote);
    IF NEW.cantidad > v_disponible THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La baja supera la cantidad disponible del lote.';
    END IF;
END$$

CREATE TRIGGER trg_validar_baja_upd BEFORE UPDATE ON baja_inventario
FOR EACH ROW
BEGIN
    DECLARE v_disponible DECIMAL(10,2);
    SET v_disponible = fn_stock_lote(NEW.id_lote) + OLD.cantidad;
    IF NEW.cantidad > v_disponible THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La baja supera la cantidad disponible del lote.';
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- VALIDACIÓN DE VENTA: JORNADA, ESTADO, EDAD Y STOCK
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_detalle_venta;
DELIMITER $$
CREATE PROCEDURE sp_validar_detalle_venta(
    IN p_id_venta INT UNSIGNED,
    IN p_id_lote INT UNSIGNED,
    IN p_cantidad DECIMAL(10,2),
    IN p_cantidad_anterior DECIMAL(10,2),
    -- AGREGADO: IVA de la categoría del producto vendido, devuelto al
    -- trigger para que congele el valor en detalle_venta.porcentaje_impuesto_aplicado.
    OUT p_porcentaje_iva DECIMAL(5,2)
)
BEGIN
    DECLARE v_disponible DECIMAL(10,2);
    DECLARE v_vencimiento DATE;
    DECLARE v_maneja_vencimiento BOOLEAN;
    DECLARE v_estado_venta VARCHAR(12);
    DECLARE v_id_jornada INT UNSIGNED;
    DECLARE v_cliente INT UNSIGNED;
    DECLARE v_requiere_edad BOOLEAN;
    DECLARE v_fecha_nacimiento DATE;
    DECLARE v_edad INT;
    DECLARE v_jornada_abierta INT DEFAULT 0;

    SELECT estado, id_jornada, id_cliente
      INTO v_estado_venta, v_id_jornada, v_cliente
    FROM venta WHERE id_venta = p_id_venta;

    IF v_estado_venta IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no existe.';
    END IF;

    IF v_estado_venta = 'ANULADA' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se pueden agregar detalles a una venta ANULADA.';
    END IF;

    -- AGREGADO: ver punto 7 del encabezado (el original no bloqueaba esto).
    IF v_estado_venta = 'COMPLETADA' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se pueden modificar los detalles de una venta ya COMPLETADA.';
    END IF;

    SELECT COUNT(*) INTO v_jornada_abierta
    FROM jornada WHERE id_jornada = v_id_jornada AND estado = 'ABIERTA';

    IF v_jornada_abierta = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La venta no puede registrarse porque su jornada no está ABIERTA.';
    END IF;

    SELECT l.fecha_vencimiento, p.maneja_vencimiento, c.requiere_verificacion_edad, c.porcentaje_iva
      INTO v_vencimiento, v_maneja_vencimiento, v_requiere_edad, p_porcentaje_iva
    FROM lote l
    JOIN producto p ON p.id_producto = l.id_producto
    JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE l.id_lote = p_id_lote;

    IF v_maneja_vencimiento IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El lote no existe.';
    END IF;

    SET v_disponible = fn_stock_lote(p_id_lote) + p_cantidad_anterior;

    IF p_cantidad > v_disponible THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad solicitada supera el disponible del lote.';
    END IF;

    IF v_maneja_vencimiento = TRUE AND v_vencimiento IS NOT NULL AND v_vencimiento < CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede vender el lote porque está vencido.';
    END IF;

    IF v_requiere_edad = TRUE THEN
        -- v_cliente puede ser NULL (venta de mostrador): la subconsulta no
        -- encuentra fila y v_fecha_nacimiento queda NULL, lo que dispara
        -- correctamente el rechazo de abajo. No hace falta un caso especial.
        SELECT fecha_nacimiento INTO v_fecha_nacimiento
        FROM cliente WHERE id_cliente = v_cliente;

        IF v_fecha_nacimiento IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'El cliente no tiene fecha de nacimiento válida para comprar productos con verificación de edad.';
        END IF;

        SET v_edad = TIMESTAMPDIFF(YEAR, v_fecha_nacimiento, CURDATE());

        IF v_edad < 18 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente no cumple la edad mínima de 18 años.';
        END IF;
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_detalle_venta_ins;
DROP TRIGGER IF EXISTS trg_validar_detalle_venta_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_detalle_venta_ins BEFORE INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_iva DECIMAL(5,2);
    CALL sp_validar_detalle_venta(NEW.id_venta, NEW.id_lote, NEW.cantidad, 0, v_iva);
    -- AGREGADO: la tasa de IVA nunca la manda el cliente/app, siempre se
    -- toma de la categoría del producto en el momento de la venta.
    SET NEW.porcentaje_impuesto_aplicado = v_iva;
END$$

CREATE TRIGGER trg_validar_detalle_venta_upd BEFORE UPDATE ON detalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_iva DECIMAL(5,2);
    CALL sp_validar_detalle_venta(NEW.id_venta, NEW.id_lote, NEW.cantidad, OLD.cantidad, v_iva);
    SET NEW.porcentaje_impuesto_aplicado = v_iva;
END$$
DELIMITER ;

-- ============================================================
-- VALIDACIÓN GENERAL DE VENTA (jornada / cliente / usuario activos)
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_venta;
DELIMITER $$
CREATE PROCEDURE sp_validar_venta(
    IN p_estado VARCHAR(12),
    IN p_id_jornada INT UNSIGNED,
    IN p_id_cliente INT UNSIGNED,
    IN p_id_usuario INT UNSIGNED
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    IF p_estado = 'COMPLETADA' THEN
        SELECT COUNT(*) INTO v_existe FROM jornada WHERE id_jornada = p_id_jornada AND estado = 'ABIERTA';
        IF v_existe = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede completar la venta: la jornada no está ABIERTA.';
        END IF;

        -- CAMBIO: id_cliente ahora es nullable; solo se valida si se registró uno.
        IF p_id_cliente IS NOT NULL THEN
            SELECT COUNT(*) INTO v_existe FROM cliente WHERE id_cliente = p_id_cliente AND estado = TRUE;
            IF v_existe = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente no existe o está inactivo.';
            END IF;
        END IF;

        SELECT COUNT(*) INTO v_existe FROM usuario WHERE id_usuario = p_id_usuario AND estado = TRUE;
        IF v_existe = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no existe o está inactivo.';
        END IF;
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_venta_ins;
DROP TRIGGER IF EXISTS trg_validar_venta_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_venta_ins BEFORE INSERT ON venta
FOR EACH ROW
BEGIN
    CALL sp_validar_venta(NEW.estado, NEW.id_jornada, NEW.id_cliente, NEW.id_usuario);
END$$

CREATE TRIGGER trg_validar_venta_upd BEFORE UPDATE ON venta
FOR EACH ROW
BEGIN
    CALL sp_validar_venta(NEW.estado, NEW.id_jornada, NEW.id_cliente, NEW.id_usuario);
END$$
DELIMITER ;

-- ============================================================
-- CIERRE / COMPLETADO DE VENTA
-- Ver punto 5 del encabezado: reemplaza el CONSTRAINT TRIGGER DEFERRABLE
-- de Postgres. Se dispara en AFTER INSERT/UPDATE cuando estado pasa a
-- COMPLETADA (en la práctica, siempre en el UPDATE final del flujo
-- PENDIENTE -> COMPLETADA, porque insertar directo como COMPLETADA falla
-- por no tener detalles todavía).
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_cierre_venta;
DELIMITER $$
CREATE PROCEDURE sp_validar_cierre_venta(IN p_id_venta INT UNSIGNED)
BEGIN
    DECLARE v_total DECIMAL(14,2);
    DECLARE v_pagado DECIMAL(14,2);
    DECLARE v_detalles INT;

    SELECT COUNT(*) INTO v_detalles FROM detalle_venta WHERE id_venta = p_id_venta;

    IF v_detalles = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una venta COMPLETADA debe tener al menos un detalle.';
    END IF;

    SET v_total = fn_total_venta(p_id_venta);
    SET v_pagado = fn_total_pagado(p_id_venta);

    IF v_total <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El total de la venta debe ser mayor que cero.';
    END IF;

    IF v_total <> v_pagado THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El total de la venta no coincide con el total pagado.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_cierre_venta_ins;
DROP TRIGGER IF EXISTS trg_validar_cierre_venta_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_cierre_venta_ins AFTER INSERT ON venta
FOR EACH ROW
BEGIN
    IF NEW.estado = 'COMPLETADA' THEN
        CALL sp_validar_cierre_venta(NEW.id_venta);
    END IF;
END$$

CREATE TRIGGER trg_validar_cierre_venta_upd AFTER UPDATE ON venta
FOR EACH ROW
BEGIN
    IF NEW.estado = 'COMPLETADA' AND OLD.estado <> 'COMPLETADA' THEN
        CALL sp_validar_cierre_venta(NEW.id_venta);
    END IF;
END$$
DELIMITER ;

-- Procedimiento de conveniencia para la capa de aplicación (punto 9).
DROP PROCEDURE IF EXISTS sp_completar_venta;
DELIMITER $$
CREATE PROCEDURE sp_completar_venta(IN p_id_venta INT UNSIGNED)
BEGIN
    UPDATE venta SET estado = 'COMPLETADA' WHERE id_venta = p_id_venta;
END$$
DELIMITER ;

-- ============================================================
-- REGLAS PARA PAGOS DE VENTAS COMPLETADAS
-- ============================================================

DROP PROCEDURE IF EXISTS sp_bloquear_pago_venta_cerrada;
DELIMITER $$
CREATE PROCEDURE sp_bloquear_pago_venta_cerrada(IN p_id_venta INT UNSIGNED)
BEGIN
    DECLARE v_estado VARCHAR(12);
    SELECT estado INTO v_estado FROM venta WHERE id_venta = p_id_venta;
    IF v_estado = 'COMPLETADA' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se pueden modificar pagos de una venta COMPLETADA. Anule la venta mediante el proceso correspondiente.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_bloquear_pago_ins;
DROP TRIGGER IF EXISTS trg_bloquear_pago_upd;
DROP TRIGGER IF EXISTS trg_bloquear_pago_del;
DELIMITER $$
CREATE TRIGGER trg_bloquear_pago_ins BEFORE INSERT ON venta_pago
FOR EACH ROW
BEGIN
    CALL sp_bloquear_pago_venta_cerrada(NEW.id_venta);
END$$

CREATE TRIGGER trg_bloquear_pago_upd BEFORE UPDATE ON venta_pago
FOR EACH ROW
BEGIN
    CALL sp_bloquear_pago_venta_cerrada(NEW.id_venta);
END$$

CREATE TRIGGER trg_bloquear_pago_del BEFORE DELETE ON venta_pago
FOR EACH ROW
BEGIN
    CALL sp_bloquear_pago_venta_cerrada(OLD.id_venta);
END$$
DELIMITER ;

-- ============================================================
-- ANULACIÓN DE VENTA
-- ============================================================

DROP TRIGGER IF EXISTS trg_validar_anulacion_venta;
DELIMITER $$
CREATE TRIGGER trg_validar_anulacion_venta BEFORE UPDATE ON venta
FOR EACH ROW
BEGIN
    IF OLD.estado <> NEW.estado THEN
        IF OLD.estado = 'ANULADA' AND NEW.estado = 'COMPLETADA' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Una venta ANULADA no puede reactivarse. Debe registrarse una nueva venta.';
        END IF;
        -- Anular una venta PENDIENTE (cancelar un carrito antes de cerrarlo) sí
        -- se permite: fn_stock_lote libera el stock automáticamente porque solo
        -- cuenta ventas PENDIENTE/COMPLETADA.
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- ANULACIÓN DE COMPRA
-- ============================================================

DROP TRIGGER IF EXISTS trg_validar_anulacion_compra;
DELIMITER $$
CREATE TRIGGER trg_validar_anulacion_compra BEFORE UPDATE ON compra
FOR EACH ROW
BEGIN
    DECLARE v_movimientos INT DEFAULT 0;

    IF OLD.estado <> NEW.estado THEN
        IF OLD.estado = 'REGISTRADA' AND NEW.estado = 'ANULADA' THEN
            SELECT COUNT(*) INTO v_movimientos
            FROM lote l
            WHERE l.id_compra = NEW.id_compra
              AND (
                EXISTS (
                    SELECT 1 FROM detalle_venta dv
                    JOIN venta v ON v.id_venta = dv.id_venta
                    WHERE dv.id_lote = l.id_lote
                      AND v.estado IN ('PENDIENTE', 'COMPLETADA')
                )
                OR EXISTS (
                    SELECT 1 FROM baja_inventario bi WHERE bi.id_lote = l.id_lote
                )
              );

            IF v_movimientos > 0 THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'No se puede anular la compra porque sus lotes ya tienen movimientos de inventario.';
            END IF;
        END IF;

        IF OLD.estado = 'ANULADA' AND NEW.estado = 'REGISTRADA' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una compra ANULADA no puede reactivarse.';
        END IF;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- PROTECCIÓN DE INTEGRIDAD DE JORNADAS
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_jornada;
DELIMITER $$
CREATE PROCEDURE sp_validar_jornada(
    IN p_estado VARCHAR(10),
    IN p_fecha_cierre TIMESTAMP,
    IN p_id_usuario_cierre INT UNSIGNED
)
BEGIN
    IF p_estado = 'CERRADA' AND (p_fecha_cierre IS NULL OR p_id_usuario_cierre IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una jornada CERRADA debe tener fecha/hora y usuario de cierre.';
    END IF;

    IF p_estado = 'ABIERTA' AND (p_fecha_cierre IS NOT NULL OR p_id_usuario_cierre IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una jornada ABIERTA no puede tener datos de cierre.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_jornada_ins;
DROP TRIGGER IF EXISTS trg_validar_jornada_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_jornada_ins BEFORE INSERT ON jornada
FOR EACH ROW
BEGIN
    CALL sp_validar_jornada(NEW.estado, NEW.fecha_hora_cierre, NEW.id_usuario_cierre);
END$$

CREATE TRIGGER trg_validar_jornada_upd BEFORE UPDATE ON jornada
FOR EACH ROW
BEGIN
    CALL sp_validar_jornada(NEW.estado, NEW.fecha_hora_cierre, NEW.id_usuario_cierre);
END$$
DELIMITER ;

-- ============================================================
-- VISTAS DE CONSULTA
-- ============================================================

CREATE OR REPLACE VIEW vw_stock_lotes AS
SELECT
    l.id_lote,
    l.id_producto,
    p.codigo_sku,
    p.nombre AS producto,
    l.id_compra,
    l.cantidad AS cantidad_inicial,
    fn_stock_lote(l.id_lote) AS cantidad_disponible,
    l.precio_unitario_compra,
    l.fecha_vencimiento,
    p.maneja_vencimiento,
    c.fecha_compra,
    c.estado AS estado_compra
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto
JOIN compra c ON c.id_compra = l.id_compra;

CREATE OR REPLACE VIEW vw_stock_producto AS
SELECT
    p.id_producto,
    p.codigo_sku,
    p.nombre,
    p.stock_minimo,
    COALESCE(SUM(s.cantidad_disponible), 0) AS stock_actual,
    CASE
        WHEN COALESCE(SUM(s.cantidad_disponible), 0) <= p.stock_minimo
        THEN TRUE ELSE FALSE
    END AS bajo_stock
FROM producto p
LEFT JOIN vw_stock_lotes s
    ON s.id_producto = p.id_producto
   AND s.estado_compra = 'REGISTRADA'
GROUP BY p.id_producto, p.codigo_sku, p.nombre, p.stock_minimo;

CREATE OR REPLACE VIEW vw_totales_venta AS
SELECT
    v.id_venta,
    v.estado,
    fn_base_gravable_venta(v.id_venta) AS base_gravable,
    fn_iva_venta(v.id_venta) AS iva,
    fn_total_venta(v.id_venta) AS total_venta,
    fn_total_pagado(v.id_venta) AS total_pagado,
    (fn_total_venta(v.id_venta) - fn_total_pagado(v.id_venta)) AS diferencia_pago
FROM venta v;

-- ============================================================
-- DATOS BASE
-- ============================================================

INSERT INTO rol (nombre) VALUES
('ADMINISTRADOR'),
('EMPLEADO');

INSERT INTO permiso (nombre, descripcion, modulo) VALUES
('GESTIONAR_ROLES', 'Registrar, editar, consultar y administrar roles y permisos', 'SEGURIDAD'),
('GESTIONAR_USUARIOS', 'Registrar, editar, consultar y administrar usuarios', 'SEGURIDAD'),
('GESTIONAR_CATEGORIAS', 'Administrar categorías de productos', 'COMPRAS'),
('GESTIONAR_PRODUCTOS', 'Administrar productos y existencias', 'COMPRAS'),
('GESTIONAR_PROVEEDORES', 'Administrar proveedores y contactos', 'COMPRAS'),
('GESTIONAR_COMPRAS', 'Registrar y administrar compras', 'COMPRAS'),
('GESTIONAR_CLIENTES', 'Administrar clientes', 'VENTAS'),
('GESTIONAR_VENTAS', 'Registrar y administrar ventas', 'VENTAS'),
('VER_REPORTES', 'Consultar dashboard y reportes', 'DASHBOARD');

INSERT INTO metodo_pago (nombre) VALUES
('Efectivo'),
('Nequi'),
('Bancolombia');

INSERT INTO unidad_medida (nombre) VALUES
('Unidad'),
('Botella'),
('Six-pack'),
('Cajetilla'),
('Paquete');

INSERT INTO motivo_baja (nombre) VALUES
('Vencimiento'),
('Daño/Rotura'),
('Ajuste de inventario'),
('Pérdida/Robo');

-- Tasas de IVA (Colombia, vigentes 2026): 19.00 general; 5.00 para
-- licores/vinos/aperitivos >15° (tarifa diferencial). Cerveza, cigarrillos
-- y snacks NO tienen tarifa reducida: pagan el IVA general del 19%.
INSERT INTO categoria
(nombre, descripcion, margen_defecto_porcentaje, porcentaje_iva, requiere_verificacion_edad)
VALUES
('Licores', 'Aguardientes, rones, tequilas y whiskys', 35.00, 5.00, TRUE),
('Cerveza', 'Cervezas y presentaciones relacionadas', 20.00, 19.00, TRUE),
('Cigarrillos', 'Productos de tabaco', 12.00, 19.00, TRUE),
('Snacks', 'Dulces, confitería y productos secos', 40.00, 19.00, FALSE);

-- Permisos del administrador
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r CROSS JOIN permiso p
WHERE r.nombre = 'ADMINISTRADOR';

-- Permisos básicos del empleado
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r
JOIN permiso p ON p.nombre IN (
    'GESTIONAR_CLIENTES',
    'GESTIONAR_VENTAS'
)
WHERE r.nombre = 'EMPLEADO';

-- ============================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================
-- 1. El hash de contraseña debe generarse en la aplicación con un algoritmo
--    seguro (Argon2id o bcrypt). Nunca guardar contraseñas en texto plano.
--
-- 2. Flujo obligatorio de una venta (ver punto 5 del encabezado):
--       BEGIN
--       INSERT venta (queda en PENDIENTE por defecto)
--       INSERT detalle_venta (...)
--       INSERT venta_pago (...)
--       CALL sp_completar_venta(id_venta);   -- o UPDATE venta SET estado='COMPLETADA'
--       COMMIT;
--    Este último paso es el que valida detalle + pagos. Si falla, la
--    aplicación puede reintentar corrigiendo detalle/pagos sin haber
--    perdido la cabecera (sigue en PENDIENTE) o anular la venta.
--
-- 3. La edad mínima está fijada en 18 en el trigger porque la ficha del
--    proyecto solo exige verificación de edad, sin una edad configurable.
--    Si el negocio requiere parametrizarla, crear un parámetro de config.
--
-- 4. La anulación de una venta (PENDIENTE o COMPLETADA) libera el stock
--    porque fn_stock_lote solo descuenta ventas PENDIENTE/COMPLETADA.
--
-- 5. Las operaciones concurrentes sobre el mismo lote deben ejecutarse
--    dentro de transacciones y, para máxima robustez, bloquear el lote
--    con SELECT ... FOR UPDATE en la capa de servicio antes de calcular
--    y consumir stock.
