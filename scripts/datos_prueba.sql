-- ============================================================
-- DATOS DE PRUEBA — StockBar
-- Generado a partir de la ejecución real de los 53 casos de prueba
-- documentados en docs/CASOS_DE_PRUEBA_NORMALIZACION.docx.
-- Contiene ÚNICAMENTE los INSERT/UPDATE que la base de datos aceptó
-- (ver docs/CASOS_DE_PRUEBA_NORMALIZACION.docx para el detalle caso
-- por caso, incluidos los que el motor rechazó intencionalmente).
--
-- Requisito: ejecutar primero /scripts/sch.sql (crea el esquema y los
-- catálogos base). Luego:
--   mysql -u <usuario> -p stockbar < scripts/datos_prueba.sql
-- ============================================================

-- -------- NIVEL 1: catálogos (completan el mínimo de 5 registros) --------
INSERT INTO rol (nombre) VALUES ('SUPERVISOR'),('CAJERO'),('AUDITOR');

INSERT INTO metodo_pago (nombre) VALUES ('Daviplata'),('Tarjeta Débito');

INSERT INTO unidad_medida (nombre) VALUES ('Caja');

INSERT INTO motivo_baja (nombre) VALUES ('Devolución a proveedor');

INSERT INTO categoria (nombre, descripcion, margen_defecto_porcentaje, porcentaje_iva, requiere_verificacion_edad)
VALUES ('Bebidas no alcohólicas','Aguas, gaseosas y jugos',25.00,19.00,FALSE);

-- -------- NIVEL 2: tablas con FK --------
INSERT INTO usuario (tipo_documento,numero_documento,nombres,apellidos,correo,id_rol,contrasena_hash,es_admin_principal) VALUES
('CC','1000000001','Sebastián','Gómez Ortiz','sebastian.admin@stockbar.com',1,'$2b$12$hashusuario0000000000001',TRUE),
('CC','1000000002','María','Pérez López','maria.perez@stockbar.com',2,'$2b$12$hashusuario0000000000002',FALSE),
('CC','1000000003','Carlos','Ruiz Mena','carlos.ruiz@stockbar.com',2,'$2b$12$hashusuario0000000000003',FALSE),
('CC','1000000004','Laura','Díaz Nieto','laura.diaz@stockbar.com',3,'$2b$12$hashusuario0000000000004',FALSE),
('CC','1000000005','Jorge','Salas Vega','jorge.salas@stockbar.com',4,'$2b$12$hashusuario0000000000005',FALSE);

INSERT INTO recuperacion_contrasena (id_usuario, token, fecha_generacion, fecha_expiracion, usado) VALUES
(1,'a1f9c2000000000000000001','2026-09-28 08:00:00','2026-09-28 09:00:00',FALSE),
(2,'b7d31a000000000000000002','2026-09-28 08:05:00','2026-09-28 09:05:00',FALSE),
(3,'c930bd000000000000000003','2026-09-28 08:10:00','2026-09-28 09:10:00',TRUE),
(4,'d55e71000000000000000004','2026-09-28 08:15:00','2026-09-28 09:15:00',FALSE),
(5,'e02f44000000000000000005','2026-09-28 08:20:00','2026-09-28 09:20:00',FALSE);

INSERT INTO cliente (tipo_documento,numero_documento,nombres,apellidos,fecha_nacimiento) VALUES
('CC','2000000001','Ana','Martínez Soto','1985-03-12'),
('CE','2000000002','Felipe','Torres Gil','2011-05-01'),
('TI','2000000003','Valentina','Ríos Peña','2009-09-20'),
('CC','2000000004','Comercial','Andina', NULL),
('NIT','2000000005','Distribuciones JR','SAS', NULL);

INSERT INTO proveedor (nit, razon_social) VALUES
('900111222-1','Distribuidora Licores del Valle SAS'),
('900222333-2','Cervecería Nacional Proveedores SAS'),
('900333444-3','Tabacalera Andina Ltda'),
('900444555-4','Dulces y Snacks del Pacífico SAS'),
('900555666-5','Bebidas Premium Import SAS');

INSERT INTO contacto_proveedor (id_proveedor,nombres,apellidos,telefono,es_principal,estado) VALUES
(1,'Juan','Gómez','3001234567',TRUE,TRUE),
(2,'Paola','Jiménez','3002234567',TRUE,TRUE),
(3,'Andrés','León','3003234567',TRUE,TRUE),
(4,'Camila','Rojas','3004234567',TRUE,TRUE),
(5,'Diego','Castro','3005234567',TRUE,TRUE);

INSERT INTO producto (codigo_sku,nombre,id_categoria,id_unidad_medida,maneja_vencimiento,stock_minimo) VALUES
('LIC-AGU-750','Aguardiente Antioqueño 750ml',1,2,FALSE,10),
('CRV-CLB-6PK','Cerveza Club Colombia Six-pack',2,3,TRUE,20),
('CIG-MLB-ROJ','Marlboro Rojo Cajetilla',3,4,FALSE,15),
('SNK-PAP-MAR','Papas Margarita Paquete',4,5,TRUE,25),
('BEB-AGU-600','Agua Cristal 600ml',5,2,TRUE,30);

INSERT INTO producto_proveedor (id_producto,id_proveedor,precio_referencia) VALUES (1,1,28000),(2,2,22000),(3,3,7000),(4,4,2200),(5,5,1000);

INSERT INTO rol_permiso (id_rol,id_permiso) VALUES (3,4),(3,6),(3,8),(3,9),(3,11);

-- -------- NIVEL 3: maestro-detalle --------
INSERT INTO jornada (id_usuario_apertura, fecha_hora_apertura, id_usuario_cierre, fecha_hora_cierre, estado) VALUES
(2,'2026-09-20 08:00:00',2,'2026-09-20 20:00:00','CERRADA'),
(3,'2026-09-21 08:00:00',3,'2026-09-21 20:05:00','CERRADA'),
(5,'2026-09-22 08:00:00',5,'2026-09-22 19:50:00','CERRADA'),
(2,'2026-09-23 08:00:00',2,'2026-09-23 20:00:00','CERRADA');
INSERT INTO jornada (id_usuario_apertura, fecha_hora_apertura, estado) VALUES (3,'2026-09-30 08:00:00','ABIERTA');

-- Nace PENDIENTE (aún no cuenta como stock ni es vendible); se marca
-- RECIBIDA en cuanto llega la mercancía, igual que en el flujo real.
INSERT INTO compra (id_proveedor,id_usuario,numero_factura_proveedor,fecha_compra,estado) VALUES (1,4,'FAC-1001','2026-08-10','PENDIENTE');
INSERT INTO lote (id_compra,id_producto,cantidad,precio_unitario_compra,numero_lote_proveedor) VALUES (1,1,100,28000,'L-AGU-01');
UPDATE compra SET estado='RECIBIDA' WHERE id_compra=1;

INSERT INTO compra (id_proveedor,id_usuario,numero_factura_proveedor,fecha_compra,estado) VALUES (2,4,'FAC-2001','2026-08-11','RECIBIDA');
INSERT INTO lote (id_compra,id_producto,cantidad,precio_unitario_compra,fecha_vencimiento,numero_lote_proveedor) VALUES
(2,2,200,22000,'2026-12-15','L-CERV-01'),
(2,2,150,22500,'2027-01-10','L-CERV-02');

INSERT INTO compra (id_proveedor,id_usuario,numero_factura_proveedor,fecha_compra,estado) VALUES (3,4,'FAC-3001','2026-08-12','RECIBIDA');
INSERT INTO lote (id_compra,id_producto,cantidad,precio_unitario_compra,numero_lote_proveedor) VALUES (3,3,300,7000,'L-CIG-01');

INSERT INTO compra (id_proveedor,id_usuario,numero_factura_proveedor,fecha_compra,estado) VALUES (4,4,'FAC-4001','2026-08-13','RECIBIDA');
INSERT INTO lote (id_compra,id_producto,cantidad,precio_unitario_compra,fecha_vencimiento,numero_lote_proveedor) VALUES (4,4,500,2200,'2026-11-01','L-SNK-01');

INSERT INTO compra (id_proveedor,id_usuario,numero_factura_proveedor,fecha_compra,estado) VALUES (5,4,'FAC-5001','2026-08-14','PENDIENTE');
INSERT INTO lote (id_compra,id_producto,cantidad,precio_unitario_compra,fecha_vencimiento,numero_lote_proveedor) VALUES (5,5,1000,1000,'2027-03-01','L-AGUA-01');
UPDATE compra SET estado='ANULADA' WHERE id_compra=5;

-- Compra histórica con un lote que ya venció (candidato real para
-- sp_dar_baja_lotes_vencidos); cumplía la regla de los 15 días al momento
-- de la compra, pero ya pasó su fecha de vencimiento respecto a hoy.
INSERT INTO compra (id_proveedor,id_usuario,numero_factura_proveedor,fecha_compra,estado) VALUES (2,4,'FAC-2002','2026-01-01','RECIBIDA');
INSERT INTO lote (id_compra,id_producto,cantidad,precio_unitario_compra,fecha_vencimiento) VALUES (LAST_INSERT_ID(),2,50,21000,'2026-01-20');

INSERT INTO baja_inventario (id_lote,id_motivo_baja,cantidad,id_usuario) VALUES (2,2,10,5),(5,3,5,5);

-- -------- VENTAS (todas las variantes que el modelo aceptó) --------

-- Venta 1: mostrador, de contado, un solo producto/pago (COMPLETADA)
INSERT INTO venta (id_jornada,id_usuario) VALUES (5,5);
SET @v1 = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario_venta) VALUES (@v1,5,2,3200);
INSERT INTO venta_pago (id_venta,id_metodo_pago,monto) VALUES (@v1,1,6400);
CALL sp_completar_venta(@v1);

-- Venta 2: cliente identificado, pago electrónico único (COMPLETADA)
INSERT INTO venta (id_cliente,id_jornada,id_usuario) VALUES (1,5,5);
SET @v2 = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario_venta) VALUES (@v2,5,5,3000);
INSERT INTO venta_pago (id_venta,id_metodo_pago,monto) VALUES (@v2,2,15000);
CALL sp_completar_venta(@v2);

-- Venta 3: a crédito, pagada en 3 abonos con 3 formas de pago distintas (COMPLETADA)
INSERT INTO venta (id_cliente,id_jornada,id_usuario) VALUES (1,5,2);
SET @v3 = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario_venta) VALUES (@v3,1,3,42000);
INSERT INTO venta_pago (id_venta,id_metodo_pago,monto) VALUES (@v3,1,50000),(@v3,2,40000),(@v3,3,36000);
CALL sp_completar_venta(@v3);

-- Venta 4: multilínea con producto que exige verificación de edad (COMPLETADA)
INSERT INTO venta (id_cliente,id_jornada,id_usuario) VALUES (1,5,5);
SET @v4 = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario_venta) VALUES (@v4,1,1,45000),(@v4,4,2,8000),(@v4,5,3,3000);
INSERT INTO venta_pago (id_venta,id_metodo_pago,monto) VALUES (@v4,1,70000);
CALL sp_completar_venta(@v4);

-- Venta 5: PENDIENTE con stock reservado y luego ANULADA (libera el stock)
INSERT INTO venta (id_cliente,id_jornada,id_usuario) VALUES (1,5,5);
SET @v5 = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario_venta) VALUES (@v5,3,4,3600);
UPDATE venta SET estado='ANULADA' WHERE id_venta=@v5;

-- Venta 6: a crédito, PENDIENTE con abono parcial (aún no cuadra, no se completa)
INSERT INTO venta (id_cliente,id_jornada,id_usuario) VALUES (1,5,5);
SET @v6 = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta,id_lote,cantidad,precio_unitario_venta) VALUES (@v6,1,2,50000);
INSERT INTO venta_pago (id_venta,id_metodo_pago,monto) VALUES (@v6,1,60000);
