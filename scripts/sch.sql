-- =============================================================================
-- StockBar - Database Schema (Template)
-- =============================================================================
-- 
-- NOTA IMPORTANTE:
-- Este es un TEMPLATE preliminar basado en el diseño arquitectónico del proyecto.
-- El script definitivo y optimizado se entregará en el SPRINT 08.
-- 
-- Este template sirve como referencia y punto de partida para:
--   - Estructurar la base de datos en las 3 capas (Catálogos, Seguridad, Maestro-Detalle)
--   - Definir triggers de desnormalización controlada
--   - Crear vistas de solo lectura para reportes/dashboard
--
-- Cambios esperados en Sprint 08:
--   - Validaciones (CHECK, DEFAULT)
--   - Índices optimizados
--   - Triggers reales y completos
--   - Scripts de datos iniciales
--   - Particionamiento (si aplica)
--
-- =============================================================================

SET CHARSET utf8mb4;
SET COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- NIVEL 1: CATÁLOGOS
-- =============================================================================

-- Tabla: categorias
-- Agrupa productos por tipo (Licores, Cigarrillos, Confitería, etc.)
CREATE TABLE IF NOT EXISTS categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_estado (estado),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: productos
-- Artículos individuales: botellas, cigarrillos, dulces, etc.
CREATE TABLE IF NOT EXISTS productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    categoria_id INT NOT NULL,
    precio_costo DECIMAL(10, 2),
    precio_venta DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    sku VARCHAR(50) UNIQUE,
    estado ENUM('activo', 'inactivo', 'descontinuado') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    INDEX idx_estado (estado),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: proveedores
-- Empresas/personas que suministran productos
CREATE TABLE IF NOT EXISTS proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_estado (estado),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: clientes
-- Compradores (pueden ser anónimos)
CREATE TABLE IF NOT EXISTS clientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150),
    telefono VARCHAR(20),
    email VARCHAR(100),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_estado (estado),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- NIVEL 2: SEGURIDAD
-- =============================================================================

-- Tabla: roles
-- Perfiles de acceso (Administrador, Empleado Auxiliar, etc.)
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: permisos
-- Acciones discretas que pueden permitirse/denegarse
CREATE TABLE IF NOT EXISTS permisos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    modulo VARCHAR(50),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_modulo (modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: rol_permisos
-- Asociación N:N entre roles y permisos
CREATE TABLE IF NOT EXISTS rol_permisos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_rol_permisos_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rol_permisos_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
    UNIQUE KEY uk_rol_permiso (rol_id, permiso_id),
    INDEX idx_rol_id (rol_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: usuarios
-- Cuentas de acceso al sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL UNIQUE,
    hash_contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol_id INT NOT NULL,
    estado ENUM('activo', 'inactivo', 'suspendido') DEFAULT 'activo',
    ultimo_acceso DATETIME,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
    INDEX idx_email (email),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: sesiones
-- Registro de accesos (auditoría)
CREATE TABLE IF NOT EXISTS sesiones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token_jwt VARCHAR(500),
    ip_direccion VARCHAR(45),
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre DATETIME,
    estado ENUM('activa', 'cerrada') DEFAULT 'activa',
    
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- NIVEL 3: MAESTRO-DETALLE
-- =============================================================================

-- Tabla: compras (cabecera)
-- Documento de entrada de mercancía
CREATE TABLE IF NOT EXISTS compras (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proveedor_id INT NOT NULL,
    numero_factura VARCHAR(50),
    fecha_compra DATE NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    estado ENUM('pendiente', 'recibida', 'completada', 'cancelada') DEFAULT 'pendiente',
    observaciones TEXT,
    usuario_id INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    CONSTRAINT fk_compras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_compra (fecha_compra),
    INDEX idx_proveedor_id (proveedor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: compra_detalle (detalle)
-- Líneas de la compra
CREATE TABLE IF NOT EXISTS compra_detalle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compra_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    
    CONSTRAINT fk_compra_detalle_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    CONSTRAINT fk_compra_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    INDEX idx_compra_id (compra_id),
    INDEX idx_producto_id (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: ventas (cabecera)
-- Transacción de venta a un cliente
CREATE TABLE IF NOT EXISTS ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_id INT,
    usuario_id INT NOT NULL,
    fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(12, 2) NOT NULL,
    metodo_pago ENUM('efectivo', 'nequi', 'bancolombia', 'transferencia', 'otro'),
    estado ENUM('completada', 'devuelta', 'cancelada') DEFAULT 'completada',
    referencia_pago VARCHAR(100),
    observaciones TEXT,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_venta (fecha_venta),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_cliente_id (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: venta_detalle (detalle)
-- Líneas de la venta
CREATE TABLE IF NOT EXISTS venta_detalle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    
    CONSTRAINT fk_venta_detalle_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT fk_venta_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
    INDEX idx_venta_id (venta_id),
    INDEX idx_producto_id (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger: Descuento de inventario post-venta
-- Cada vez que se inserta una línea en venta_detalle, desconta el stock en productos
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_descuento_inventario_post_venta
AFTER INSERT ON venta_detalle
FOR EACH ROW
BEGIN
    UPDATE productos 
    SET stock = stock - NEW.cantidad
    WHERE id = NEW.producto_id;
END //
DELIMITER ;

-- Trigger: Recalcular total de compra
-- Cada vez que se inserta/actualiza una línea en compra_detalle, recalcula el total de la compra
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_recalcular_total_compra
AFTER INSERT ON compra_detalle
FOR EACH ROW
BEGIN
    UPDATE compras 
    SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM compra_detalle WHERE compra_id = NEW.compra_id)
    WHERE id = NEW.compra_id;
END //
DELIMITER ;

-- Trigger: Recalcular total de venta
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_recalcular_total_venta
AFTER INSERT ON venta_detalle
FOR EACH ROW
BEGIN
    UPDATE ventas 
    SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM venta_detalle WHERE venta_id = NEW.venta_id)
    WHERE id = NEW.venta_id;
END //
DELIMITER ;

-- =============================================================================
-- VISTAS (solo lectura, para reportes y dashboard)
-- =============================================================================

-- Vista: Inventario actual con alertas de bajo stock
CREATE OR REPLACE VIEW vw_inventario_actual AS
SELECT 
    p.id,
    p.nombre AS producto,
    c.nombre AS categoria,
    p.stock,
    p.stock_minimo,
    CASE 
        WHEN p.stock <= p.stock_minimo THEN 'BAJO'
        ELSE 'OK'
    END AS alerta_stock,
    p.precio_venta,
    p.estado
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
WHERE p.estado = 'activo'
ORDER BY p.stock ASC, c.nombre ASC;

-- Vista: Detalle de ventas
CREATE OR REPLACE VIEW vw_ventas_detalle AS
SELECT 
    v.id AS venta_id,
    v.fecha_venta,
    COALESCE(cl.nombre, 'Cliente Anónimo') AS cliente,
    u.nombre AS vendedor,
    v.total,
    v.metodo_pago,
    v.estado,
    COUNT(vd.id) AS total_items
FROM ventas v
LEFT JOIN clientes cl ON v.cliente_id = cl.id
JOIN usuarios u ON v.usuario_id = u.id
LEFT JOIN venta_detalle vd ON v.id = vd.venta_id
GROUP BY v.id
ORDER BY v.fecha_venta DESC;

-- Vista: Detalle de compras
CREATE OR REPLACE VIEW vw_compras_detalle AS
SELECT 
    c.id AS compra_id,
    c.fecha_compra,
    pr.nombre AS proveedor,
    c.numero_factura,
    c.total,
    c.estado,
    COUNT(cd.id) AS total_items
FROM compras c
JOIN proveedores pr ON c.proveedor_id = pr.id
LEFT JOIN compra_detalle cd ON c.id = cd.compra_id
GROUP BY c.id
ORDER BY c.fecha_compra DESC;

-- Vista: KPIs del dashboard
CREATE OR REPLACE VIEW vw_kpis_dashboard AS
SELECT 
    DATE(v.fecha_venta) AS fecha,
    SUM(v.total) AS ingresos_dia,
    COUNT(DISTINCT v.id) AS num_ventas,
    (SELECT SUM(c.total) FROM compras c WHERE DATE(c.fecha_compra) = DATE(v.fecha_venta)) AS egresos_dia,
    COUNT(DISTINCT v.cliente_id) AS clientes_unicos
FROM ventas v
WHERE v.estado = 'completada'
GROUP BY DATE(v.fecha_venta)
ORDER BY fecha DESC
LIMIT 30;

-- Vista: Usuarios, roles y permisos
CREATE OR REPLACE VIEW vw_usuarios_roles_permisos AS
SELECT 
    u.id AS usuario_id,
    u.email,
    u.nombre,
    r.nombre AS rol,
    GROUP_CONCAT(DISTINCT pe.nombre SEPARATOR '; ') AS permisos,
    u.estado
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos pe ON rp.permiso_id = pe.id
GROUP BY u.id
ORDER BY u.email ASC;

-- =============================================================================
-- DATOS INICIALES (Ejemplo)
-- =============================================================================

-- Roles por defecto
INSERT IGNORE INTO roles (nombre, descripcion, estado) VALUES
('Administrador', 'Control total del sistema', 'activo'),
('Empleado_Auxiliar', 'Acceso restringido a ventas y clientes', 'activo');

-- Permisos por defecto (según los 10 subprocesos)
INSERT IGNORE INTO permisos (nombre, descripcion, modulo, estado) VALUES
-- Roles
('ROLES_LISTAR', 'Listar roles', 'seguridad', 'activo'),
('ROLES_CREAR', 'Crear rol', 'seguridad', 'activo'),
('ROLES_EDITAR', 'Editar rol', 'seguridad', 'activo'),
('ROLES_ELIMINAR', 'Eliminar rol', 'seguridad', 'activo'),
('ROLES_PERMISOS', 'Asignar permisos a rol', 'seguridad', 'activo'),

-- Usuarios
('USUARIOS_LISTAR', 'Listar usuarios', 'seguridad', 'activo'),
('USUARIOS_CREAR', 'Crear usuario', 'seguridad', 'activo'),
('USUARIOS_EDITAR', 'Editar usuario', 'seguridad', 'activo'),
('USUARIOS_ELIMINAR', 'Eliminar usuario', 'seguridad', 'activo'),

-- Acceso (implícito en la autenticación)
('ACCESO_LOGIN', 'Iniciar sesión', 'seguridad', 'activo'),
('ACCESO_RECUPERAR_CONTRASEÑA', 'Recuperar contraseña', 'seguridad', 'activo'),

-- Categorías
('CATEGORIAS_LISTAR', 'Listar categorías', 'compras', 'activo'),
('CATEGORIAS_CREAR', 'Crear categoría', 'compras', 'activo'),
('CATEGORIAS_EDITAR', 'Editar categoría', 'compras', 'activo'),
('CATEGORIAS_ELIMINAR', 'Eliminar categoría', 'compras', 'activo'),

-- Productos
('PRODUCTOS_LISTAR', 'Listar productos', 'compras', 'activo'),
('PRODUCTOS_CREAR', 'Crear producto', 'compras', 'activo'),
('PRODUCTOS_EDITAR', 'Editar producto', 'compras', 'activo'),
('PRODUCTOS_ELIMINAR', 'Eliminar producto', 'compras', 'activo'),

-- Proveedores
('PROVEEDORES_LISTAR', 'Listar proveedores', 'compras', 'activo'),
('PROVEEDORES_CREAR', 'Crear proveedor', 'compras', 'activo'),
('PROVEEDORES_EDITAR', 'Editar proveedor', 'compras', 'activo'),
('PROVEEDORES_ELIMINAR', 'Eliminar proveedor', 'compras', 'activo'),

-- Compras
('COMPRAS_LISTAR', 'Listar compras', 'compras', 'activo'),
('COMPRAS_CREAR', 'Crear compra', 'compras', 'activo'),
('COMPRAS_EDITAR', 'Editar compra', 'compras', 'activo'),
('COMPRAS_ELIMINAR', 'Eliminar compra', 'compras', 'activo'),

-- Clientes
('CLIENTES_LISTAR', 'Listar clientes', 'ventas', 'activo'),
('CLIENTES_CREAR', 'Crear cliente', 'ventas', 'activo'),
('CLIENTES_EDITAR', 'Editar cliente', 'ventas', 'activo'),
('CLIENTES_ELIMINAR', 'Eliminar cliente', 'ventas', 'activo'),

-- Ventas
('VENTAS_LISTAR', 'Listar ventas', 'ventas', 'activo'),
('VENTAS_CREAR', 'Crear venta', 'ventas', 'activo'),
('VENTAS_EDITAR', 'Editar venta', 'ventas', 'activo'),
('VENTAS_ELIMINAR', 'Eliminar venta', 'ventas', 'activo'),

-- Dashboard
('DASHBOARD_VER', 'Ver dashboard', 'reportes', 'activo'),
('DASHBOARD_EXPORTAR', 'Exportar reportes', 'reportes', 'activo');

-- Asignar todos los permisos al rol Administrador
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p WHERE r.nombre = 'Administrador';

-- Asignar permisos limitados al rol Empleado Auxiliar (solo ventas y clientes)
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id 
FROM roles r, permisos p 
WHERE r.nombre = 'Empleado_Auxiliar' 
AND p.modulo IN ('ventas', 'seguridad')
AND p.nombre NOT IN ('USUARIOS_CREAR', 'USUARIOS_EDITAR', 'USUARIOS_ELIMINAR', 'ROLES_LISTAR', 'ROLES_CREAR', 'ROLES_EDITAR', 'ROLES_ELIMINAR', 'ROLES_PERMISOS');

-- Categorías de ejemplo
INSERT IGNORE INTO categorias (nombre, descripcion, estado) VALUES
('Licores', 'Bebidas alcohólicas diversas', 'activo'),
('Cigarrillos', 'Marcas variadas de cigarrillos', 'activo'),
('Confitería', 'Dulces y snacks', 'activo');

-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================