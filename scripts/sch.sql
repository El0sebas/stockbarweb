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
-- Ver el historial de cambios respecto al físico original de PostgreSQL en
-- versiones anteriores de este script (control de versiones / docs/DATABASE.md).
-- Cambios de esta revisión (segunda pasada del dueño del proyecto sobre el
-- prototipo publicado):
--
-- 1) QUITADO rol.descripcion y permiso.descripcion: no se usan en ningún
--    formulario (el rol se identifica por nombre, el permiso se asigna
--    desde la matriz de la sección 9, ninguno se gestiona como entidad con
--    ficha propia). La matriz de historias de usuario menciona una
--    descripción opcional para rol, pero se decidió no incluirla.
--
-- 2) QUITADO categoria.estado: la Ficha de Proyecto aprobada no lista
--    "cambio de estado" en el alcance del subproceso de categorías (a
--    diferencia de producto, proveedor, compra, cliente, venta, usuario y
--    rol, que sí lo listan). La matriz de historias de usuario sí la
--    menciona, pero se sigue el criterio de la ficha aprobada.
--
-- 3) AGREGADO usuario.es_admin_principal + trg_proteger_admin_principal:
--    marca al primer usuario ADMINISTRADOR que existió en el sistema.
--    Restricción única (columna GENERATED, mismo truco que jornada y
--    contacto_proveedor) garantiza que nunca haya más de uno. Un trigger
--    bloquea desactivarlo y bloquea cambiar la marca una vez puesta. La
--    app lo crea una sola vez en el arranque inicial, nunca editable desde
--    el UI. "Solo un admin puede desactivar a otro" y "nadie puede
--    desactivarse a sí mismo" son reglas de la capa de aplicación (dependen
--    de quién hizo la petición autenticada, algo que un trigger no puede
--    ver), no columnas ni triggers nuevos.
--
-- 4) AGREGADO trg_proteger_rol_administrador: el rol ADMINISTRADOR no se
--    puede desactivar (UPDATE rol SET estado=FALSE sobre ese rol se
--    rechaza). El rol EMPLEADO (o cualquier rol nuevo) sí se puede
--    activar/desactivar libremente.
--
-- 5) CAMBIO sp_validar_lote: el mínimo para fecha_vencimiento pasa de "no
--    anterior a fecha_compra" a "al menos 15 días posterior a
--    fecha_compra". Evita registrar mercancía que llega ya vencida o a
--    punto de vencer. Se compara contra fecha_compra (no CURDATE()) a
--    propósito, para poder seguir registrando compras históricas/atrasadas
--    sin que la fecha del sistema rompa la regla.
--
-- 6) AGREGADO sp_dar_baja_lotes_vencidos(p_id_usuario): da de baja sola
--    (motivo 'Vencimiento') todos los lotes de compras REGISTRADA con
--    fecha_vencimiento < CURDATE() y stock disponible > 0. La BD no puede
--    "despertarse sola" cada día: el backend debe llamarlo una vez al día
--    (cron de aplicación, ej. node-cron a las 00:05) con el id de un
--    usuario "sistema" o del administrador que corre el proceso. No se usó
--    el EVENT SCHEDULER de MySQL porque muchos hostings administrados lo
--    traen desactivado.
--
-- 7) NOTA (no es cambio de esquema): el cliente "Consumidor Final"
--    (numero_documento='0000000000', sin fecha_nacimiento a propósito) no
--    se siembra aquí para no chocar con los IDs fijos de los scripts de
--    datos de prueba — la aplicación lo crea una sola vez en el arranque
--    inicial, igual que el primer admin_principal.
--
-- Cambios heredados de revisiones previas (ver docs/DATABASE.md para el
-- detalle completo): venta.id_cliente nullable, UNIQUE
-- (id_proveedor, numero_factura_proveedor) en compra, compra.ruta_factura,
-- flujo de venta PENDIENTE/COMPLETADA/ANULADA con reserva de stock desde
-- la primera línea, bloqueo simétrico de detalle_venta y venta_pago sobre
-- ventas COMPLETADA, categoria.porcentaje_iva + requiere_verificacion_edad,
-- detalle_venta.porcentaje_impuesto_aplicado congelado por trigger.
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
    -- QUITADO: se decidió que el rol NO lleva descripción (pedido explícito
    -- del negocio), aunque la matriz de historias de usuario la menciona
    -- como campo opcional. El nombre del rol es suficiente.
    estado BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE permiso (
    id_permiso SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL UNIQUE,
    -- QUITADO: descripcion por permiso no se usa en ningún formulario (el
    -- permiso solo se asigna a un rol, no se gestiona como entidad propia
    -- con ficha detallada); nombre + modulo ya son autoexplicativos.
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
    -- QUITADO: la ficha aprobada NO lista "cambio de estado" en el alcance
    -- del subproceso de categorías (sí lo lista para producto, proveedor,
    -- compra, cliente, venta, usuario y rol) — a diferencia de la matriz de
    -- historias de usuario, que sí la menciona. Se sigue el criterio de la
    -- ficha aprobada por ser el documento de alcance vigente; si el negocio
    -- confirma que sí la necesita, es un ALTER TABLE de una sola columna.
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
    -- AGREGADO: marca al primer usuario ADMINISTRADOR que existió en el
    -- sistema (el que crea el flujo de instalación inicial). Nunca se
    -- expone editable en el UI; la app la fija en TRUE una sola vez, al
    -- crear ese primer admin. Protege contra el bloqueo total del sistema
    -- (nadie puede desactivar a ese usuario, ni siquiera él mismo).
    es_admin_principal BOOLEAN NOT NULL DEFAULT FALSE,
    -- CAMBIO: mismo truco de columna GENERATED que ya usan jornada y
    -- contacto_proveedor para simular un índice único parcial en MySQL:
    -- garantiza que a lo sumo un usuario en todo el sistema tenga esta marca.
    id_usuario_admin_principal INT UNSIGNED
        GENERATED ALWAYS AS (CASE WHEN es_admin_principal = TRUE THEN 1 END) STORED,
    UNIQUE KEY uq_admin_principal_unico (id_usuario_admin_principal),
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
    ruta_factura VARCHAR(255),
    fecha_compra DATE NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(12) NOT NULL DEFAULT 'REGISTRADA',
    observaciones VARCHAR(255),
    CONSTRAINT ck_compra_estado CHECK (estado IN ('REGISTRADA','ANULADA')),
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
    id_cliente INT UNSIGNED NULL,
    id_jornada INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    fecha_hora_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    precio_unitario_venta DECIMAL(12,2) NOT NULL,
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
-- PROTECCIÓN DE ROL ADMINISTRADOR Y ADMIN PRINCIPAL
-- AGREGADO: pedido explícito del negocio — el rol ADMINISTRADOR nunca se
-- puede desactivar, y el primer usuario administrador del sistema tampoco
-- (ni él mismo). "Solo un administrador puede desactivar a otro" y "nadie
-- puede desactivarse a sí mismo" quedan como reglas de la capa de
-- aplicación (dependen de quién hizo la petición autenticada); aquí solo
-- se protege el dato en sí.
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

    -- CAMBIO: se endurece de "no anterior a la fecha de compra" a "al menos
    -- 15 días después de la fecha de compra" — no se pueden registrar
    -- productos ya vencidos o próximos a vencer. Se compara contra
    -- fecha_compra y no CURDATE() para no romper el registro de compras
    -- históricas/atrasadas.
    IF p_fecha_vencimiento IS NOT NULL AND p_fecha_vencimiento < DATE_ADD(v_fecha_compra, INTERVAL 15 DAY) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha de vencimiento debe ser al menos 15 días posterior a la fecha de compra (no se pueden registrar productos ya vencidos o próximos a vencer).';
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

-- AGREGADO: baja automática de lotes ya vencidos (pedido explícito del
-- negocio). El backend debe llamarlo una vez al día (cron de aplicación)
-- con el id de un usuario "sistema" o del administrador que corre el
-- proceso. No se usa el EVENT SCHEDULER de MySQL porque muchos hostings
-- administrados lo traen desactivado.
DROP PROCEDURE IF EXISTS sp_dar_baja_lotes_vencidos;
DELIMITER $$
CREATE PROCEDURE sp_dar_baja_lotes_vencidos(IN p_id_usuario INT UNSIGNED)
BEGIN
    DECLARE v_id_motivo SMALLINT UNSIGNED;
    SELECT id_motivo_baja INTO v_id_motivo FROM motivo_baja WHERE nombre = 'Vencimiento';

    INSERT INTO baja_inventario (id_lote, id_motivo_baja, cantidad, id_usuario, observaciones)
    SELECT l.id_lote, v_id_motivo, fn_stock_lote(l.id_lote), p_id_usuario, 'Baja automática por vencimiento'
    FROM lote l
    JOIN compra c ON c.id_compra = l.id_compra
    WHERE l.fecha_vencimiento IS NOT NULL
      AND l.fecha_vencimiento < CURDATE()
      AND c.estado = 'REGISTRADA'
      AND fn_stock_lote(l.id_lote) > 0;
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

INSERT INTO permiso (nombre, modulo) VALUES
('GESTIONAR_ROLES', 'SEGURIDAD'),
('GESTIONAR_USUARIOS', 'SEGURIDAD'),
('GESTIONAR_CATEGORIAS', 'COMPRAS'),
('GESTIONAR_PRODUCTOS', 'COMPRAS'),
('GESTIONAR_PROVEEDORES', 'COMPRAS'),
('GESTIONAR_COMPRAS', 'COMPRAS'),
('GESTIONAR_CLIENTES', 'VENTAS'),
('GESTIONAR_VENTAS', 'VENTAS'),
('VER_REPORTES', 'DASHBOARD');

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

-- NOTA: el cliente genérico "Consumidor Final" para ventas de mostrador NO
-- se siembra aquí (rompería los id_cliente fijos que usan los scripts de
-- datos de prueba). Igual que el primer usuario administrador, lo crea la
-- aplicación una sola vez en el arranque inicial (INSERT ... si no existe
-- ya un cliente con numero_documento='0000000000').

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
-- 2. Flujo obligatorio de una venta:
--       BEGIN
--       INSERT venta (queda en PENDIENTE por defecto)
--       INSERT detalle_venta (...)
--       INSERT venta_pago (...)
--       CALL sp_completar_venta(id_venta);   -- o UPDATE venta SET estado='COMPLETADA'
--       COMMIT;
--
-- 3. La edad mínima está fijada en 18 en el trigger porque la ficha del
--    proyecto solo exige verificación de edad, sin una edad configurable.
--
-- 4. La anulación de una venta (PENDIENTE o COMPLETADA) libera el stock
--    porque fn_stock_lote solo descuenta ventas PENDIENTE/COMPLETADA.
--
-- 5. Las operaciones concurrentes sobre el mismo lote deben ejecutarse
--    dentro de transacciones y, para máxima robustez, bloquear el lote
--    con SELECT ... FOR UPDATE en la capa de servicio antes de calcular
--    y consumir stock.
--
-- 6. El backend debe llamar sp_dar_baja_lotes_vencidos(p_id_usuario) una
--    vez al día (cron de aplicación) con el id de un usuario "sistema".
--
-- 7. En el arranque inicial de la aplicación (una sola vez, cuando todavía
--    no existen esas filas): crear el primer usuario ADMINISTRADOR con
--    es_admin_principal=TRUE, y el cliente "Consumidor Final"
--    (numero_documento='0000000000', sin fecha_nacimiento). Ningún endpoint
--    posterior debe poder tocar es_admin_principal.
