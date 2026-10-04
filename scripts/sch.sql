-- ============================================================
-- STOCKBAR - BASE DE DATOS (MySQL 8.0.16+ / MariaDB 10.5+)
-- Versión 5 (V4 + producto_proveedor restaurada).
--
-- Requisitos: MySQL 8.0.16+ (CHECK reales) o MariaDB 10.5+.
-- Las funciones se crean DETERMINISTIC para poder crearse sin SUPER con
-- binlog STATEMENT (alternativa: SET GLOBAL log_bin_trust_function_creators=1).
--
-- ============================================================
-- QUÉ CAMBIÓ EN LA V5 Y POR QUÉ
-- ============================================================
--
-- PRODUCTO POR PROVEEDOR (se RESTAURA la tabla producto_proveedor):
--    Relación MUCHOS A MUCHOS: un producto lo pueden proporcionar varios
--    proveedores y un proveedor proporciona varios productos. La forma
--    normalizada de resolverla es una tabla intermedia con llave primaria
--    compuesta (id_producto, id_proveedor), sin más columnas, por lo que no
--    repite ningún dato.
--
--    No es redundante con la compra:
--      producto_proveedor        = CATÁLOGO: qué proveedores pueden entregar
--                                  cada producto. Existe antes de cualquier
--                                  compra y se llena al crear/editar el
--                                  producto (se seleccionan sus proveedores).
--      compra / detalle_compra   = TRANSACCIÓN: qué se compró realmente,
--                                  a quién, cuándo y a qué precio.
--
--    Uso en la aplicación: al registrar una compra se elige el proveedor de
--    la factura y se listan solo los productos asociados a él
--    (vw_productos_por_proveedor). Sin este catálogo, un producto nunca
--    comprado a un proveedor no podría aparecer en el listado.
--
--    detalle_compra NO referencia a producto_proveedor: el proveedor sigue
--    siendo dato del encabezado de la compra. Por eso editar el catálogo
--    (agregar o quitar un proveedor de un producto) no invalida compras ya
--    registradas, y cambiar el proveedor de una compra no invalida sus
--    líneas.
--
-- Todo lo demás es idéntico a la V4:
--
-- 1) RECUPERACIÓN DE CONTRASEÑA: sin tabla propia. usuario guarda UN token
--    vigente (token_recuperacion_hash y token_recuperacion_expira).
--    NULL = no hay recuperación en curso.
--
-- 2) LOTES Y PRECIO: para StockBar un lote ES la fecha de vencimiento de un
--    producto.
--      lote            = (producto, fecha de vencimiento). Único.
--      compra          = encabezado (proveedor, usuario, forma de pago,
--                        factura, fecha).
--      detalle_compra  = qué lote entró en esa compra, con su cantidad y su
--                        precio unitario. PK compuesta (compra, lote).
--    El stock de un lote = entradas de compras REGISTRADAS - ventas
--    (PENDIENTE/COMPLETADA) - bajas.
--
-- 3) LLAVES PRIMARIAS: ninguna tabla usa AUTO_INCREMENT. Las llaves las
--    define el analista y las asigna la aplicación:
--      - Identificadores del negocio: id_producto = código (SKU),
--        id_proveedor = NIT, id_rol = identificación del rol (HU_04),
--        id_permiso = código del permiso, catálogos = código de 3 letras.
--      - Entidades numeradas por el sistema: prefijo + consecutivo con
--        formato fijo, validado con CHECK:
--        CAT-001, USR-0001, CLI-00001, JOR-000001, CMP-000001,
--        LOT-000001, BAJ-000001, VTA-000001.
--      - Detalles y relaciones: llave compuesta con su maestro:
--        detalle_compra(compra, lote), detalle_venta(venta, lote),
--        contacto_proveedor(proveedor, nro_contacto),
--        producto_proveedor(producto, proveedor).
--    Las columnas llave usan ascii_bin (sensibles a mayúsculas, el formato
--    se valida con REGEXP).
--
-- 4) FORMA DE PAGO: UNA sola por compra y UNA sola por venta (HU_39, HU_58).
--    Los totales de compra y de jornada NO se guardan: se calculan
--    (vw_totales_compra, vw_totales_jornada).
--
-- 5) usuario.fecha_nacimiento no existe: la verificación de edad usa
--    cliente.fecha_nacimiento.
--
-- Decisiones heredadas que se mantienen:
--   * rol sin descripción y categoria sin estado.
--   * venta.id_cliente NULLABLE (venta de mostrador) y verificación de edad.
--   * venta PENDIENTE -> COMPLETADA y stock reservado desde PENDIENTE.
--   * UNIQUE (proveedor, factura), ruta_factura, IVA por categoría congelado
--     por línea de venta, un solo administrador principal, una jornada
--     abierta, un contacto principal por proveedor.
--   * metodo_pago y contacto_proveedor sin "estado": un método de pago es
--     un catálogo fijo (Efectivo, Nequi, Bancolombia) y un contacto que ya
--     no sirve se elimina (ninguna tabla lo referencia).
--   * producto.precio_venta_actual (precio final con IVA; el histórico vive
--     en detalle_venta).
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
DROP TABLE IF EXISTS detalle_compra;
DROP TABLE IF EXISTS lote;
DROP TABLE IF EXISTS compra;
DROP TABLE IF EXISTS jornada;
DROP TABLE IF EXISTS producto_proveedor;
DROP TABLE IF EXISTS contacto_proveedor;
DROP TABLE IF EXISTS proveedor;
DROP TABLE IF EXISTS cliente;
DROP TABLE IF EXISTS recuperacion_contrasena; -- retirada en v2
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
    id_rol VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_rol_id CHECK (id_rol REGEXP '^[A-Z0-9_-]{2,10}$')
) ENGINE=InnoDB;

CREATE TABLE permiso (
    id_permiso VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    modulo VARCHAR(40) NOT NULL,
    CONSTRAINT ck_permiso_id CHECK (id_permiso REGEXP '^[A-Z_]{3,30}$')
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (
    id_rol VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_permiso VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    -- La HU_04 permite editar la identificación del rol: se propaga.
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON UPDATE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES permiso(id_permiso)
) ENGINE=InnoDB;

CREATE TABLE metodo_pago (
    id_metodo_pago CHAR(3) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    CONSTRAINT ck_metodo_pago_id CHECK (id_metodo_pago REGEXP '^[A-Z]{3}$')
) ENGINE=InnoDB;

CREATE TABLE unidad_medida (
    id_unidad_medida CHAR(3) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    CONSTRAINT ck_unidad_medida_id CHECK (id_unidad_medida REGEXP '^[A-Z]{3}$')
) ENGINE=InnoDB;

CREATE TABLE motivo_baja (
    id_motivo_baja CHAR(3) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    CONSTRAINT ck_motivo_baja_id CHECK (id_motivo_baja REGEXP '^[A-Z]{3}$')
) ENGINE=InnoDB;

CREATE TABLE categoria (
    id_categoria CHAR(7) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    margen_defecto_porcentaje DECIMAL(5,2) NOT NULL,
    -- IVA de la categoría (19.00 general, 5.00 Licores). Se congela por
    -- línea en detalle_venta.porcentaje_impuesto_aplicado.
    porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    requiere_verificacion_edad BOOLEAN NOT NULL DEFAULT FALSE,
    -- Sin "estado": la ficha no lista cambio de estado para categorías.
    CONSTRAINT ck_categoria_id CHECK (id_categoria REGEXP '^CAT-[0-9]{3}$'),
    CONSTRAINT ck_categoria_margen CHECK (margen_defecto_porcentaje >= 0),
    CONSTRAINT ck_categoria_iva CHECK (porcentaje_iva >= 0 AND porcentaje_iva <= 100)
) ENGINE=InnoDB;

-- -------------------------
-- SEGURIDAD / USUARIOS
-- -------------------------
CREATE TABLE usuario (
    id_usuario CHAR(8) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    tipo_documento VARCHAR(5) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    id_rol VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    -- Recuperación de contraseña (Subproceso de Acceso): hash del token
    -- enviado por correo y su vencimiento. Ambos NULL = sin recuperación.
    token_recuperacion_hash VARCHAR(255) NULL,
    token_recuperacion_expira TIMESTAMP NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    -- Primer ADMINISTRADOR del sistema: nadie puede desactivarlo.
    es_admin_principal BOOLEAN NOT NULL DEFAULT FALSE,
    -- Columna generada = índice único parcial (a lo sumo un admin principal).
    admin_principal_unico TINYINT
        GENERATED ALWAYS AS (CASE WHEN es_admin_principal = TRUE THEN 1 END) STORED,
    UNIQUE KEY uq_admin_principal_unico (admin_principal_unico),
    UNIQUE KEY uq_usuario_token_recuperacion (token_recuperacion_hash),
    CONSTRAINT ck_usuario_id CHECK (id_usuario REGEXP '^USR-[0-9]{4}$'),
    CONSTRAINT ck_usuario_tipo_documento CHECK (tipo_documento IN ('CC','CE','TI','PAS','NIT')),
    CONSTRAINT ck_usuario_token_coherente CHECK (
        (token_recuperacion_hash IS NULL AND token_recuperacion_expira IS NULL)
        OR
        (token_recuperacion_hash IS NOT NULL AND token_recuperacion_expira IS NOT NULL)
    ),
    CONSTRAINT uq_usuario_documento UNIQUE (tipo_documento, numero_documento),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------
-- TERCEROS
-- -------------------------
CREATE TABLE cliente (
    id_cliente CHAR(9) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
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
    CONSTRAINT ck_cliente_id CHECK (id_cliente REGEXP '^CLI-[0-9]{5}$'),
    CONSTRAINT ck_cliente_tipo_documento CHECK (tipo_documento IN ('CC','CE','TI','PAS','NIT')),
    CONSTRAINT uq_cliente_documento UNIQUE (tipo_documento, numero_documento)
    -- fecha_nacimiento no futura: trigger (CURDATE no es válido en CHECK).
) ENGINE=InnoDB;

CREATE TABLE proveedor (
    id_proveedor VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,           -- NIT del proveedor
    razon_social VARCHAR(120) NOT NULL,
    nombre_comercial VARCHAR(120),
    ciudad VARCHAR(60),
    direccion VARCHAR(150),
    telefono_principal VARCHAR(20),
    correo_principal VARCHAR(100),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_proveedor_nit CHECK (id_proveedor REGEXP '^[0-9]{5,15}(-[0-9])?$')
) ENGINE=InnoDB;

CREATE TABLE contacto_proveedor (
    id_proveedor VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    nro_contacto SMALLINT UNSIGNED NOT NULL,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    cargo VARCHAR(60),
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(100),
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    -- Índice único parcial simulado: un solo contacto principal por proveedor.
    id_proveedor_principal VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin
        GENERATED ALWAYS AS (CASE WHEN es_principal = TRUE THEN id_proveedor END) STORED,
    PRIMARY KEY (id_proveedor, nro_contacto),
    UNIQUE KEY uq_contacto_principal (id_proveedor_principal),
    CONSTRAINT ck_contacto_nro CHECK (nro_contacto > 0),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
) ENGINE=InnoDB;

-- -------------------------
-- PRODUCTOS
-- -------------------------
CREATE TABLE producto (
    id_producto VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,            -- código (SKU) del producto
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),
    id_categoria CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_unidad_medida CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    margen_personalizado_porcentaje DECIMAL(5,2),
    precio_venta_actual DECIMAL(12,2) NOT NULL,                 -- precio final con IVA; el margen solo sugiere. Histórico: detalle_venta
    maneja_vencimiento BOOLEAN NOT NULL DEFAULT TRUE,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_producto_codigo CHECK (id_producto REGEXP '^[A-Z0-9-]{3,30}$'),
    CONSTRAINT ck_producto_margen CHECK (margen_personalizado_porcentaje IS NULL OR margen_personalizado_porcentaje >= 0),
    CONSTRAINT ck_producto_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT ck_producto_precio_venta CHECK (precio_venta_actual >= 0),
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    FOREIGN KEY (id_unidad_medida) REFERENCES unidad_medida(id_unidad_medida)
) ENGINE=InnoDB;

-- Relación N:M producto - proveedor (catálogo). Se llena al crear/editar el
-- producto (se seleccionan los proveedores que lo proporcionan) y filtra la
-- lista de productos al registrar una compra. Desmarcar un proveedor elimina
-- la fila; el historial de compras no se afecta (no depende de esta tabla).
CREATE TABLE producto_proveedor (
    id_producto VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_proveedor VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    PRIMARY KEY (id_producto, id_proveedor),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
) ENGINE=InnoDB;

-- -------------------------
-- JORNADAS
-- -------------------------
CREATE TABLE jornada (
    id_jornada CHAR(10) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    id_usuario_apertura CHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    fecha_hora_apertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_cierre CHAR(8) CHARACTER SET ascii COLLATE ascii_bin,
    fecha_hora_cierre TIMESTAMP NULL,
    estado VARCHAR(10) NOT NULL DEFAULT 'ABIERTA',
    observaciones VARCHAR(255),
    -- Índice único parcial simulado: una sola jornada ABIERTA.
    estado_abierta_unico VARCHAR(10)
        GENERATED ALWAYS AS (CASE WHEN estado = 'ABIERTA' THEN 'ABIERTA' END) STORED,
    UNIQUE KEY uq_una_jornada_abierta (estado_abierta_unico),
    CONSTRAINT ck_jornada_id CHECK (id_jornada REGEXP '^JOR-[0-9]{6}$'),
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
    id_compra CHAR(10) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,              -- número de compra
    id_proveedor VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_usuario CHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_metodo_pago CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,            -- forma de pago (HU_39)
    numero_factura_proveedor VARCHAR(40),
    ruta_factura VARCHAR(255),
    fecha_compra DATE NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(12) NOT NULL DEFAULT 'REGISTRADA',
    observaciones VARCHAR(255),
    CONSTRAINT ck_compra_id CHECK (id_compra REGEXP '^CMP-[0-9]{6}$'),
    CONSTRAINT ck_compra_estado CHECK (estado IN ('REGISTRADA','ANULADA')),
    CONSTRAINT uq_factura_proveedor UNIQUE (id_proveedor, numero_factura_proveedor),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
) ENGINE=InnoDB;

-- Un lote ES la fecha de vencimiento de un producto.
-- No guarda precio ni cantidad: eso pertenece a la compra (detalle_compra).
CREATE TABLE lote (
    id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    id_producto VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    fecha_vencimiento DATE NULL,              -- NULL = producto sin vencimiento
    -- Hace único (producto, vencimiento) también cuando no hay fecha.
    fecha_vencimiento_clave DATE
        GENERATED ALWAYS AS (IFNULL(fecha_vencimiento, '9999-12-31')) STORED,
    CONSTRAINT ck_lote_id CHECK (id_lote REGEXP '^LOT-[0-9]{6}$'),
    CONSTRAINT uq_lote_producto_vencimiento UNIQUE (id_producto, fecha_vencimiento_clave),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
) ENGINE=InnoDB;

-- Detalle de la compra (maestro-detalle): qué lote entró, cuánto y a qué precio.
CREATE TABLE detalle_compra (
    id_compra CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    precio_unitario_compra DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id_compra, id_lote),
    CONSTRAINT ck_detalle_compra_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_compra_precio CHECK (precio_unitario_compra >= 0),
    FOREIGN KEY (id_compra) REFERENCES compra(id_compra),
    FOREIGN KEY (id_lote) REFERENCES lote(id_lote)
) ENGINE=InnoDB;

-- -------------------------
-- BAJAS
-- -------------------------
CREATE TABLE baja_inventario (
    id_baja CHAR(10) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_motivo_baja CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario CHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    observaciones VARCHAR(255),
    CONSTRAINT ck_baja_id CHECK (id_baja REGEXP '^BAJ-[0-9]{6}$'),
    CONSTRAINT ck_baja_cantidad CHECK (cantidad > 0),
    FOREIGN KEY (id_lote) REFERENCES lote(id_lote),
    FOREIGN KEY (id_motivo_baja) REFERENCES motivo_baja(id_motivo_baja),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- -------------------------
-- VENTAS
-- -------------------------
CREATE TABLE venta (
    id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,               -- número de venta / factura
    id_cliente CHAR(9) CHARACTER SET ascii COLLATE ascii_bin NULL,                    -- NULL = venta de mostrador
    id_jornada CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_usuario CHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_metodo_pago CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,            -- método de pago (HU_58)
    fecha_hora_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE',
    observaciones VARCHAR(255),
    CONSTRAINT ck_venta_id CHECK (id_venta REGEXP '^VTA-[0-9]{6}$'),
    CONSTRAINT ck_venta_estado CHECK (estado IN ('PENDIENTE','COMPLETADA','ANULADA')),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_jornada) REFERENCES jornada(id_jornada),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago)
) ENGINE=InnoDB;

CREATE TABLE detalle_venta (
    id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    -- Precio FINAL que paga el cliente (incluye IVA). Se conserva porque el
    -- precio cambia en el tiempo y no se reescribe el histórico.
    precio_unitario_venta DECIMAL(12,2) NOT NULL,
    -- IVA congelado por línea; lo rellena el trigger desde la categoría.
    porcentaje_impuesto_aplicado DECIMAL(5,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_venta, id_lote),
    CONSTRAINT ck_detalle_venta_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_venta_precio CHECK (precio_unitario_venta >= 0),
    CONSTRAINT ck_detalle_venta_iva CHECK (porcentaje_impuesto_aplicado >= 0 AND porcentaje_impuesto_aplicado <= 100),
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    FOREIGN KEY (id_lote) REFERENCES lote(id_lote)
) ENGINE=InnoDB;

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

-- Stock de un lote = entradas (compras REGISTRADAS) - ventas PENDIENTE o
-- COMPLETADA - bajas. Las PENDIENTE descuentan para reservar el stock.
DROP FUNCTION IF EXISTS fn_stock_lote;
DELIMITER $$
CREATE FUNCTION fn_stock_lote(p_id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_ingresado DECIMAL(10,2);
    DECLARE v_vendido DECIMAL(10,2);
    DECLARE v_dado_baja DECIMAL(10,2);

    SELECT COALESCE(SUM(dc.cantidad), 0) INTO v_ingresado
    FROM detalle_compra dc
    JOIN compra c ON c.id_compra = dc.id_compra
    WHERE dc.id_lote = p_id_lote
      AND c.estado = 'REGISTRADA';

    SELECT COALESCE(SUM(dv.cantidad), 0) INTO v_vendido
    FROM detalle_venta dv
    JOIN venta v ON v.id_venta = dv.id_venta
    WHERE dv.id_lote = p_id_lote
      AND v.estado IN ('PENDIENTE', 'COMPLETADA');

    SELECT COALESCE(SUM(bi.cantidad), 0) INTO v_dado_baja
    FROM baja_inventario bi
    WHERE bi.id_lote = p_id_lote;

    RETURN v_ingresado - v_vendido - v_dado_baja;
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS fn_total_venta;
DELIMITER $$
CREATE FUNCTION fn_total_venta(p_id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin)
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

-- Desglose de IVA: el precio de venta ya incluye IVA; la base gravable se
-- obtiene descontándolo con la tasa congelada en cada línea.
DROP FUNCTION IF EXISTS fn_base_gravable_venta;
DELIMITER $$
CREATE FUNCTION fn_base_gravable_venta(p_id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin)
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
CREATE FUNCTION fn_iva_venta(p_id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin)
RETURNS DECIMAL(14,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN fn_total_venta(p_id_venta) - fn_base_gravable_venta(p_id_venta);
END$$
DELIMITER ;

DROP FUNCTION IF EXISTS fn_total_pagado;      -- retirada en v3.1

-- ============================================================
-- VALIDACIÓN DE CLIENTE (fecha de nacimiento no futura)
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
-- PROTECCIÓN DEL ROL ADMINISTRADOR Y DEL ADMIN PRINCIPAL
-- (que nadie se desactive a sí mismo es regla de la capa de aplicación)
-- ============================================================

DROP TRIGGER IF EXISTS trg_proteger_rol_administrador;
DELIMITER $$
CREATE TRIGGER trg_proteger_rol_administrador BEFORE UPDATE ON rol
FOR EACH ROW
BEGIN
    IF OLD.nombre = 'ADMINISTRADOR' AND NEW.estado = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rol ADMINISTRADOR no puede desactivarse.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_proteger_admin_principal;
DELIMITER $$
CREATE TRIGGER trg_proteger_admin_principal BEFORE UPDATE ON usuario
FOR EACH ROW
BEGIN
    IF OLD.es_admin_principal = TRUE AND NEW.estado = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El administrador principal del sistema no puede desactivarse.';
    END IF;
    IF OLD.es_admin_principal <> NEW.es_admin_principal THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La marca de administrador principal no puede modificarse.';
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- LOTES (producto + fecha de vencimiento)
-- ============================================================

DROP TRIGGER IF EXISTS trg_validar_lote_ins;
DROP TRIGGER IF EXISTS trg_validar_lote_upd;
DELIMITER $$
CREATE TRIGGER trg_validar_lote_ins BEFORE INSERT ON lote
FOR EACH ROW
BEGIN
    DECLARE v_maneja_vencimiento BOOLEAN;
    SELECT maneja_vencimiento INTO v_maneja_vencimiento
    FROM producto WHERE id_producto = NEW.id_producto;

    IF v_maneja_vencimiento = TRUE AND NEW.fecha_vencimiento IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto requiere fecha de vencimiento.';
    END IF;
END$$

-- La identidad del lote (producto + vencimiento) no se edita: si la compra
-- cambia de vencimiento, la línea pasa a apuntar a otro lote.
CREATE TRIGGER trg_validar_lote_upd BEFORE UPDATE ON lote
FOR EACH ROW
BEGIN
    IF NEW.id_producto <> OLD.id_producto OR NOT (NEW.fecha_vencimiento <=> OLD.fecha_vencimiento) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El producto y la fecha de vencimiento de un lote no se pueden modificar.';
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- DETALLE DE COMPRA
-- ============================================================

-- Vencimiento al menos 15 días posterior a la fecha de compra (pedido del
-- negocio). Se compara con fecha_compra y no con CURDATE() para poder
-- registrar compras históricas.
DROP PROCEDURE IF EXISTS sp_validar_vencimiento_compra;
DELIMITER $$
CREATE PROCEDURE sp_validar_vencimiento_compra(
    IN p_id_compra CHAR(10) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_fecha_vencimiento DATE
)
BEGIN
    DECLARE v_fecha_compra DATE;
    DECLARE v_estado VARCHAR(12);

    SELECT fecha_compra, estado INTO v_fecha_compra, v_estado
    FROM compra WHERE id_compra = p_id_compra;

    IF v_estado IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La compra no existe.';
    END IF;

    IF v_estado = 'ANULADA' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se pueden modificar los detalles de una compra ANULADA.';
    END IF;

    IF p_fecha_vencimiento IS NOT NULL
       AND p_fecha_vencimiento < DATE_ADD(v_fecha_compra, INTERVAL 15 DAY) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El vencimiento debe ser al menos 15 días posterior a la fecha de compra.';
    END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_validar_detalle_compra_ins;
DROP TRIGGER IF EXISTS trg_validar_detalle_compra_upd;
DROP TRIGGER IF EXISTS trg_validar_detalle_compra_del;
DELIMITER $$
CREATE TRIGGER trg_validar_detalle_compra_ins BEFORE INSERT ON detalle_compra
FOR EACH ROW
BEGIN
    DECLARE v_vencimiento DATE;
    SELECT fecha_vencimiento INTO v_vencimiento FROM lote WHERE id_lote = NEW.id_lote;
    CALL sp_validar_vencimiento_compra(NEW.id_compra, v_vencimiento);
END$$

-- Editar una compra no puede dejar un lote con stock negativo (por ejemplo
-- reducir una cantidad que ya se vendió).
CREATE TRIGGER trg_validar_detalle_compra_upd BEFORE UPDATE ON detalle_compra
FOR EACH ROW
BEGIN
    DECLARE v_vencimiento DATE;
    DECLARE v_stock_resultante DECIMAL(10,2);

    SELECT fecha_vencimiento INTO v_vencimiento FROM lote WHERE id_lote = NEW.id_lote;
    CALL sp_validar_vencimiento_compra(NEW.id_compra, v_vencimiento);

    SET v_stock_resultante = fn_stock_lote(OLD.id_lote) - OLD.cantidad
        + IF(NEW.id_lote = OLD.id_lote AND NEW.id_compra = OLD.id_compra, NEW.cantidad, 0);
    IF v_stock_resultante < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede reducir esta entrada: el lote ya tiene ventas o bajas que la requieren.';
    END IF;
END$$

CREATE TRIGGER trg_validar_detalle_compra_del BEFORE DELETE ON detalle_compra
FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(12);
    SELECT estado INTO v_estado FROM compra WHERE id_compra = OLD.id_compra;
    IF v_estado = 'REGISTRADA' AND fn_stock_lote(OLD.id_lote) - OLD.cantidad < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede eliminar esta entrada: el lote ya tiene ventas o bajas que la requieren.';
    END IF;
END$$
DELIMITER ;

-- Conveniencia para la aplicación: busca el lote (producto + vencimiento) y
-- si no existe lo crea con el código que asignó la aplicación; luego agrega
-- la línea a la compra. Llamar dentro de la transacción de la compra.
DROP PROCEDURE IF EXISTS sp_agregar_detalle_compra;
DELIMITER $$
CREATE PROCEDURE sp_agregar_detalle_compra(
    IN p_id_compra CHAR(10) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_id_producto VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_fecha_vencimiento DATE,
    IN p_cantidad DECIMAL(10,2),
    IN p_precio_unitario_compra DECIMAL(12,2),
    IN p_id_lote_nuevo CHAR(10) CHARACTER SET ascii COLLATE ascii_bin          -- solo se usa si el lote aún no existe
)
BEGIN
    DECLARE v_id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin;

    CALL sp_validar_vencimiento_compra(p_id_compra, p_fecha_vencimiento);

    SELECT id_lote INTO v_id_lote
    FROM lote
    WHERE id_producto = p_id_producto
      AND fecha_vencimiento_clave = IFNULL(p_fecha_vencimiento, '9999-12-31');

    IF v_id_lote IS NULL THEN
        INSERT INTO lote (id_lote, id_producto, fecha_vencimiento)
        VALUES (p_id_lote_nuevo, p_id_producto, p_fecha_vencimiento);
        SET v_id_lote = p_id_lote_nuevo;
    END IF;

    INSERT INTO detalle_compra (id_compra, id_lote, cantidad, precio_unitario_compra)
    VALUES (p_id_compra, v_id_lote, p_cantidad, p_precio_unitario_compra);
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
    IF NEW.cantidad > fn_stock_lote(NEW.id_lote) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La baja supera la cantidad disponible del lote.';
    END IF;
END$$

CREATE TRIGGER trg_validar_baja_upd BEFORE UPDATE ON baja_inventario
FOR EACH ROW
BEGIN
    IF NEW.cantidad > fn_stock_lote(NEW.id_lote) + IF(NEW.id_lote = OLD.id_lote, OLD.cantidad, 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La baja supera la cantidad disponible del lote.';
    END IF;
END$$
DELIMITER ;

-- Baja automática de lotes vencidos (HU_50). El backend la invoca una vez al
-- día con el id del usuario "sistema". Como los códigos de baja los asigna
-- la aplicación con formato BAJ-######, el procedimiento continúa la
-- numeración existente; GET_LOCK evita que dos ejecuciones simultáneas
-- generen el mismo código.
DROP PROCEDURE IF EXISTS sp_dar_baja_lotes_vencidos;
DELIMITER $$
CREATE PROCEDURE sp_dar_baja_lotes_vencidos(IN p_id_usuario CHAR(8) CHARACTER SET ascii COLLATE ascii_bin)
BEGIN
    DECLARE v_ultimo INT;

    IF GET_LOCK('stockbar_codigo_baja', 10) = 1 THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(id_baja, 5) AS UNSIGNED)), 0) INTO v_ultimo
        FROM baja_inventario;

        INSERT INTO baja_inventario (id_baja, id_lote, id_motivo_baja, cantidad, id_usuario, observaciones)
        SELECT CONCAT('BAJ-', LPAD(v_ultimo + ROW_NUMBER() OVER (ORDER BY l.id_lote), 6, '0')),
               l.id_lote, 'VEN', fn_stock_lote(l.id_lote), p_id_usuario,
               'Baja automática por vencimiento'
        FROM lote l
        WHERE l.fecha_vencimiento IS NOT NULL
          AND l.fecha_vencimiento < CURDATE()
          AND fn_stock_lote(l.id_lote) > 0;

        DO RELEASE_LOCK('stockbar_codigo_baja');
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se pudo obtener el bloqueo para numerar las bajas automáticas.';
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- VALIDACIÓN DE VENTA: JORNADA, ESTADO, EDAD Y STOCK
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_detalle_venta;
DELIMITER $$
CREATE PROCEDURE sp_validar_detalle_venta(
    IN p_id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_id_lote CHAR(10) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_cantidad DECIMAL(10,2),
    IN p_cantidad_anterior DECIMAL(10,2),
    OUT p_porcentaje_iva DECIMAL(5,2)
)
BEGIN
    DECLARE v_disponible DECIMAL(10,2);
    DECLARE v_vencimiento DATE;
    DECLARE v_maneja_vencimiento BOOLEAN;
    DECLARE v_estado_venta VARCHAR(12);
    DECLARE v_id_jornada CHAR(10) CHARACTER SET ascii COLLATE ascii_bin;
    DECLARE v_cliente CHAR(9) CHARACTER SET ascii COLLATE ascii_bin;
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

    -- El producto del lote sale directamente de lote.
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
        -- v_cliente NULL (mostrador): no hay fila, queda NULL y se rechaza abajo.
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
    -- La tasa de IVA nunca la manda la app: se toma de la categoría.
    SET NEW.porcentaje_impuesto_aplicado = v_iva;
END$$

CREATE TRIGGER trg_validar_detalle_venta_upd BEFORE UPDATE ON detalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_iva DECIMAL(5,2);
    -- La cantidad anterior solo se devuelve al disponible si la línea sigue
    -- en el mismo lote y la misma venta.
    CALL sp_validar_detalle_venta(NEW.id_venta, NEW.id_lote, NEW.cantidad,
        IF(NEW.id_lote = OLD.id_lote AND NEW.id_venta = OLD.id_venta, OLD.cantidad, 0), v_iva);
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
    IN p_id_jornada CHAR(10) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_id_cliente CHAR(9) CHARACTER SET ascii COLLATE ascii_bin,
    IN p_id_usuario CHAR(8) CHARACTER SET ascii COLLATE ascii_bin
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    IF p_estado = 'COMPLETADA' THEN
        SELECT COUNT(*) INTO v_existe FROM jornada WHERE id_jornada = p_id_jornada AND estado = 'ABIERTA';
        IF v_existe = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede completar la venta: la jornada no está ABIERTA.';
        END IF;

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
-- CIERRE / COMPLETADO DE VENTA (reemplaza el CONSTRAINT TRIGGER DEFERRABLE)
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_cierre_venta;
DELIMITER $$
CREATE PROCEDURE sp_validar_cierre_venta(IN p_id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin)
BEGIN
    DECLARE v_total DECIMAL(14,2);
    DECLARE v_detalles INT;

    SELECT COUNT(*) INTO v_detalles FROM detalle_venta WHERE id_venta = p_id_venta;

    IF v_detalles = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una venta COMPLETADA debe tener al menos un detalle.';
    END IF;

    SET v_total = fn_total_venta(p_id_venta);

    IF v_total <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El total de la venta debe ser mayor que cero.';
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

DROP PROCEDURE IF EXISTS sp_completar_venta;
DELIMITER $$
CREATE PROCEDURE sp_completar_venta(IN p_id_venta CHAR(10) CHARACTER SET ascii COLLATE ascii_bin)
BEGIN
    UPDATE venta SET estado = 'COMPLETADA' WHERE id_venta = p_id_venta;
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
    IF OLD.estado = 'ANULADA' AND NEW.estado <> 'ANULADA' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Una venta ANULADA no puede reactivarse. Debe registrarse una nueva venta.';
    END IF;
    -- Anular una venta PENDIENTE o COMPLETADA libera el stock: fn_stock_lote
    -- solo descuenta ventas PENDIENTE/COMPLETADA.
END$$
DELIMITER ;

-- ============================================================
-- ANULACIÓN DE COMPRA
-- Regla conservadora: no se anula si algún lote de la compra ya tiene
-- ventas (incluidas las PENDIENTE) o bajas.
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
            FROM detalle_compra dc
            WHERE dc.id_compra = NEW.id_compra
              AND (
                EXISTS (
                    SELECT 1 FROM detalle_venta dv
                    JOIN venta v ON v.id_venta = dv.id_venta
                    WHERE dv.id_lote = dc.id_lote
                      AND v.estado IN ('PENDIENTE', 'COMPLETADA')
                )
                OR EXISTS (
                    SELECT 1 FROM baja_inventario bi WHERE bi.id_lote = dc.id_lote
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
-- INTEGRIDAD DE JORNADAS
-- ============================================================

DROP PROCEDURE IF EXISTS sp_validar_jornada;
DELIMITER $$
CREATE PROCEDURE sp_validar_jornada(
    IN p_estado VARCHAR(10),
    IN p_fecha_cierre TIMESTAMP,
    IN p_id_usuario_cierre CHAR(8) CHARACTER SET ascii COLLATE ascii_bin
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
-- VISTAS DE CONSULTA (todo lo derivado se calcula, no se guarda)
-- ============================================================

-- Catálogo proveedor-producto: lista de productos por proveedor para el
-- formulario de compra, y de proveedores por producto para su ficha.
CREATE OR REPLACE VIEW vw_productos_por_proveedor AS
SELECT
    pr.id_proveedor,
    pr.razon_social AS proveedor,
    p.id_producto,
    p.nombre AS producto,
    p.estado AS producto_activo,
    pr.estado AS proveedor_activo
FROM producto_proveedor pp
JOIN proveedor pr ON pr.id_proveedor = pp.id_proveedor
JOIN producto p ON p.id_producto = pp.id_producto;

CREATE OR REPLACE VIEW vw_stock_lotes AS
SELECT
    l.id_lote,
    l.id_producto,
    p.nombre AS producto,
    l.fecha_vencimiento,
    p.maneja_vencimiento,
    (SELECT COALESCE(SUM(dc.cantidad), 0)
       FROM detalle_compra dc
       JOIN compra c ON c.id_compra = dc.id_compra
      WHERE dc.id_lote = l.id_lote AND c.estado = 'REGISTRADA') AS cantidad_ingresada,
    fn_stock_lote(l.id_lote) AS cantidad_disponible
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto;

CREATE OR REPLACE VIEW vw_stock_producto AS
SELECT
    p.id_producto,
    p.nombre,
    p.stock_minimo,
    COALESCE(SUM(s.cantidad_disponible), 0) AS stock_actual,
    CASE
        WHEN COALESCE(SUM(s.cantidad_disponible), 0) <= p.stock_minimo
        THEN TRUE ELSE FALSE
    END AS bajo_stock
FROM producto p
LEFT JOIN vw_stock_lotes s ON s.id_producto = p.id_producto
GROUP BY p.id_producto, p.nombre, p.stock_minimo;

-- Detalle de compra con producto, vencimiento y subtotal (por JOIN).
CREATE OR REPLACE VIEW vw_detalle_compra AS
SELECT
    dc.id_compra,
    l.id_producto,
    p.nombre AS producto,
    l.id_lote,
    l.fecha_vencimiento,
    dc.cantidad,
    dc.precio_unitario_compra,
    dc.cantidad * dc.precio_unitario_compra AS subtotal
FROM detalle_compra dc
JOIN lote l ON l.id_lote = dc.id_lote
JOIN producto p ON p.id_producto = l.id_producto;

CREATE OR REPLACE VIEW vw_totales_compra AS
SELECT
    c.id_compra,
    c.id_proveedor,
    c.fecha_compra,
    c.estado,
    COALESCE(SUM(dc.cantidad * dc.precio_unitario_compra), 0) AS total_compra
FROM compra c
LEFT JOIN detalle_compra dc ON dc.id_compra = c.id_compra
GROUP BY c.id_compra, c.id_proveedor, c.fecha_compra, c.estado;

CREATE OR REPLACE VIEW vw_totales_venta AS
SELECT
    v.id_venta,
    v.estado,
    fn_base_gravable_venta(v.id_venta) AS base_gravable,
    fn_iva_venta(v.id_venta) AS iva,
    fn_total_venta(v.id_venta) AS total_venta,
    v.id_metodo_pago
FROM venta v;

-- Historial de jornadas con su total de ventas (ficha: Subproceso de jornada).
CREATE OR REPLACE VIEW vw_totales_jornada AS
SELECT
    j.id_jornada,
    j.estado,
    j.fecha_hora_apertura,
    j.id_usuario_apertura,
    j.fecha_hora_cierre,
    j.id_usuario_cierre,
    COUNT(v.id_venta) AS ventas_completadas,
    COALESCE(SUM(fn_total_venta(v.id_venta)), 0) AS total_ventas
FROM jornada j
LEFT JOIN venta v ON v.id_jornada = j.id_jornada AND v.estado = 'COMPLETADA'
GROUP BY j.id_jornada, j.estado, j.fecha_hora_apertura, j.id_usuario_apertura,
         j.fecha_hora_cierre, j.id_usuario_cierre;

-- ============================================================
-- DATOS BASE
-- ============================================================

INSERT INTO rol (id_rol, nombre) VALUES
('ADM', 'ADMINISTRADOR'),
('EMP', 'EMPLEADO');

INSERT INTO permiso (id_permiso, modulo) VALUES
('GESTIONAR_ROLES', 'SEGURIDAD'),
('GESTIONAR_USUARIOS', 'SEGURIDAD'),
('GESTIONAR_CATEGORIAS', 'COMPRAS'),
('GESTIONAR_PRODUCTOS', 'COMPRAS'),
('GESTIONAR_PROVEEDORES', 'COMPRAS'),
('GESTIONAR_COMPRAS', 'COMPRAS'),
('GESTIONAR_BAJAS', 'COMPRAS'),
('GESTIONAR_CLIENTES', 'VENTAS'),
('GESTIONAR_VENTAS', 'VENTAS'),
('GESTIONAR_JORNADAS', 'VENTAS'),
('VER_REPORTES', 'DASHBOARD');

INSERT INTO metodo_pago (id_metodo_pago, nombre) VALUES
('EFE', 'Efectivo'),
('NEQ', 'Nequi'),
('BAN', 'Bancolombia');

INSERT INTO unidad_medida (id_unidad_medida, nombre) VALUES
('UND', 'Unidad'),
('BOT', 'Botella'),
('SIX', 'Six-pack'),
('CAJ', 'Cajetilla'),
('PAQ', 'Paquete');

INSERT INTO motivo_baja (id_motivo_baja, nombre) VALUES
('VEN', 'Vencimiento'),
('DAN', 'Daño/Rotura'),
('AJU', 'Ajuste de inventario'),
('PER', 'Pérdida/Robo');

-- IVA (Colombia): 19.00 general; 5.00 licores/vinos/aperitivos >15°.
-- Las tarifas deben confirmarse con el contador antes de producción.
INSERT INTO categoria
(id_categoria, nombre, descripcion, margen_defecto_porcentaje, porcentaje_iva, requiere_verificacion_edad)
VALUES
('CAT-001', 'Licores', 'Aguardientes, rones, tequilas y whiskys', 35.00, 5.00, TRUE),
('CAT-002', 'Cerveza', 'Cervezas y presentaciones relacionadas', 20.00, 19.00, TRUE),
('CAT-003', 'Cigarrillos', 'Productos de tabaco', 12.00, 19.00, TRUE),
('CAT-004', 'Snacks', 'Dulces, confitería y productos secos', 40.00, 19.00, FALSE);

-- El primer administrador y el cliente genérico "Consumidor Final" los crea
-- la aplicación en el arranque inicial.

-- Administrador: todos los permisos. Empleado: los de su operación diaria
-- (clientes, ventas, jornada y bajas, según los actores de la matriz).
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM rol r CROSS JOIN permiso p
WHERE r.id_rol = 'ADM';

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM rol r
JOIN permiso p ON p.id_permiso IN ('GESTIONAR_CLIENTES','GESTIONAR_VENTAS','GESTIONAR_JORNADAS','GESTIONAR_BAJAS')
WHERE r.id_rol = 'EMP';

-- ============================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================
-- 1. Hash de contraseña (y del token de recuperación) generado en la app
--    (Argon2id/bcrypt para contraseñas; el token se guarda hasheado).
--
-- 2. Códigos: la app asigna el siguiente consecutivo de cada prefijo dentro
--    de la misma transacción (SELECT MAX(...) ... FOR UPDATE). El CHECK de
--    cada tabla rechaza cualquier formato distinto.
--
-- 3. Flujo de producto:
--       BEGIN
--       INSERT producto (SKU, nombre, categoría, unidad, ...)
--       INSERT producto_proveedor (SKU, NIT)   -- una fila por proveedor
--                                              -- seleccionado en el formulario
--       COMMIT
--    Al editar el producto: marcar un proveedor inserta la fila; desmarcarlo
--    la elimina. Las compras ya registradas no se afectan.
--
-- 4. Flujo de compra:
--       BEGIN
--       INSERT compra (CMP-######, proveedor, usuario, forma de pago, ...)
--       -- el formulario lista los productos de vw_productos_por_proveedor
--       -- filtrados por el proveedor elegido en la factura
--       CALL sp_agregar_detalle_compra(compra, producto, vencimiento,
--                                      cantidad, precio, 'LOT-######')
--       ... una llamada por línea ...
--       COMMIT
--    Valor total = vw_totales_compra.
--
-- 5. Flujo de venta:
--       BEGIN
--       INSERT venta (VTA-######, método de pago, queda PENDIENTE)
--       INSERT detalle_venta (...)   -- reserva el stock del lote
--       CALL sp_completar_venta(id_venta);   -- valida que tenga detalle y total > 0
--       COMMIT
--
-- 6. Recuperación de contraseña: la app guarda en usuario el hash del token
--    y su vencimiento (ej. 24 h, HU_77); al restablecer o vencer pone ambas
--    columnas en NULL.
--
-- 7. FEFO: al vender, la app propone primero el lote con vencimiento más
--    cercano (vw_stock_lotes ordenada por fecha_vencimiento).
--
-- 8. Operaciones concurrentes sobre un lote: transacciones y
--    SELECT ... FOR UPDATE sobre el lote en la capa de servicio.
--
-- 9. Edad mínima 18 fijada en el trigger (la ficha no la parametriza).
--
-- 10. usuario.fecha_nacimiento no existe: la verificación de edad usa
--     siempre cliente.fecha_nacimiento.