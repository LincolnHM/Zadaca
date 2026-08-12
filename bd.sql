-- ==========================================================
-- MAISON ZADACA IMPORTACIONES — BASE DE DATOS
-- PostgreSQL
-- ==========================================================

-- ==========================================
-- 1. UBICACIÓN, USUARIOS Y LOGÍSTICA
-- ==========================================
CREATE TABLE ubigeo (
    codigo_ubigeo CHAR(6) PRIMARY KEY,
    departamento VARCHAR(50) NOT NULL,
    provincia VARCHAR(50) NOT NULL,
    distrito VARCHAR(50) NOT NULL
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL -- 'Admin', 'Cliente'
);

CREATE TABLE clientes (
    dni_ce_ruc VARCHAR(15) PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES roles(id),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    contrasena_hash VARCHAR(255) NOT NULL,
    correo_verificado BOOLEAN DEFAULT FALSE,
    estado_activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE direcciones_cliente (
    id SERIAL PRIMARY KEY,
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc) ON DELETE CASCADE,
    etiqueta VARCHAR(50), -- Ej: 'Casa', 'Oficina'
    direccion_detalle TEXT NOT NULL,
    codigo_ubigeo CHAR(6) NOT NULL REFERENCES ubigeo(codigo_ubigeo),
    tipo_despacho VARCHAR(30) CHECK (tipo_despacho IN ('Domicilio', 'Agencia_Shalom', 'Agencia_Olva', 'Recojo_En_Tienda')),
    agencia_nombre VARCHAR(100),
    predeterminada BOOLEAN DEFAULT FALSE
);

CREATE TABLE auditoria_log (
    id SERIAL PRIMARY KEY,
    dni_usuario_admin VARCHAR(15) REFERENCES clientes(dni_ce_ruc),
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    datos_anteriores_json JSONB,
    datos_nuevos_json JSONB,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tokens_recuperacion (
    id SERIAL PRIMARY KEY,
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(30) CHECK (tipo IN ('Recuperar_Password', 'Verificar_Correo')) NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tokens_recuperacion_token ON tokens_recuperacion(token);

-- ==========================================
-- 2. CATÁLOGO DE PERFUMES ENTEROS E INVENTARIO
-- ==========================================
CREATE TABLE perfumes (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(180) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    genero VARCHAR(20) CHECK (genero IN ('Hombre', 'Mujer', 'Unisex')) NOT NULL DEFAULT 'Unisex',
    familia_olfativa VARCHAR(50), -- Ej: Amaderado, Floral, Cítrico, Oriental
    concentracion VARCHAR(50), -- Ej: Eau de Parfum, Parfum, Extrait
    mililitros INT NOT NULL CHECK (mililitros > 0), -- Ej: 50, 75, 100, 125, 200 ml
    descripcion TEXT,
    notas_olfativas TEXT, -- Ej: "Salida: Bergamota, Piña | Corazón: Jazmín | Fondo: Ámbar, Almizcle"
    precio_tienda_regular DECIMAL(10,2) NOT NULL CHECK (precio_tienda_regular > 0),
    descuento_tienda_porcentaje DECIMAL(5,2) DEFAULT 0.00 CHECK (descuento_tienda_porcentaje BETWEEN 0 AND 100),
    precio_consolidado_fijo DECIMAL(10,2) NOT NULL CHECK (precio_consolidado_fijo > 0),
    estado VARCHAR(30) CHECK (estado IN ('Disponible', 'Agotado', 'Bajo_Pedido')) DEFAULT 'Disponible',
    es_nuevo BOOLEAN DEFAULT FALSE,
    es_bestseller BOOLEAN DEFAULT FALSE,
    es_liquidacion BOOLEAN DEFAULT FALSE,
    precio_liquidacion DECIMAL(10,2) CHECK (precio_liquidacion IS NULL OR precio_liquidacion > 0),
    liquidacion_unidad_minima INT DEFAULT 1 CHECK (liquidacion_unidad_minima >= 1), -- cantidad mínima de compra: 1 = por unidad, mayor = solo por mayor (varía por producto según lo que caiga en stock)
    imagen_url TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_perfume_variante UNIQUE (nombre, marca, concentracion, mililitros),
    CONSTRAINT chk_precio_consolidado_menor CHECK (precio_consolidado_fijo <= precio_tienda_regular),
    CONSTRAINT chk_liquidacion_precio CHECK (es_liquidacion = FALSE OR precio_liquidacion IS NOT NULL)
);

CREATE TABLE imagenes_perfume (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT DEFAULT 0,
    es_principal BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_imagenes_perfume_producto ON imagenes_perfume(id_producto);

CREATE TABLE inventario (
    id_producto INT PRIMARY KEY REFERENCES perfumes(id) ON DELETE CASCADE,
    stock_fisico INT DEFAULT 0 CHECK (stock_fisico >= 0),
    stock_reservado_consolidados INT DEFAULT 0 CHECK (stock_reservado_consolidados >= 0),
    stock_disponible INT GENERATED ALWAYS AS (stock_fisico - stock_reservado_consolidados) STORED,
    stock_minimo_alerta INT DEFAULT 5 CHECK (stock_minimo_alerta >= 0)
);

CREATE TABLE solicitudes_cotizacion (
    id SERIAL PRIMARY KEY,
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc),
    nombre_perfume_solicitado VARCHAR(150) NOT NULL,
    marca_solicitada VARCHAR(100) NOT NULL,
    concentracion VARCHAR(50),
    mililitros INT,
    notas_cliente TEXT,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    precio_cotizado_tienda DECIMAL(10,2),
    precio_cotizado_consolidado DECIMAL(10,2),
    estado VARCHAR(30) CHECK (estado IN ('Pendiente', 'Cotizado', 'Aceptado', 'Rechazado', 'Convertido_A_Producto')) DEFAULT 'Pendiente',
    id_producto_creado INT REFERENCES perfumes(id) -- Si se crea como perfume oficial
);
CREATE INDEX idx_solicitudes_cliente ON solicitudes_cotizacion(dni_cliente);

CREATE TABLE resenas (
    id SERIAL PRIMARY KEY,
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc) ON DELETE CASCADE,
    id_producto INT REFERENCES perfumes(id) ON DELETE CASCADE,
    calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    aprobado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_resenas_producto ON resenas(id_producto);

CREATE TABLE favoritos (
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (dni_cliente, id_producto)
);

CREATE TABLE carrito_items (
    id SERIAL PRIMARY KEY,
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_carrito_item UNIQUE (dni_cliente, id_producto)
);

CREATE TABLE newsletter_suscriptores (
    id SERIAL PRIMARY KEY,
    correo VARCHAR(150) UNIQUE NOT NULL,
    fecha_suscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 3. CONSOLIDADOS Y TRAZABILIDAD
-- ==========================================
CREATE TABLE consolidados (
    id SERIAL PRIMARY KEY,
    codigo_campana VARCHAR(50) UNIQUE NOT NULL,
    fecha_apertura TIMESTAMP NOT NULL,
    fecha_cierre_programada TIMESTAMP NOT NULL,
    fecha_cierre_real TIMESTAMP,
    minimo_unidades INT DEFAULT 4 CHECK (minimo_unidades >= 4),
    total_unidades_acumuladas INT DEFAULT 0 CHECK (total_unidades_acumuladas >= 0),
    estado VARCHAR(30) CHECK (estado IN ('Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito', 'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado')) DEFAULT 'Borrador',
    notas_admin TEXT
);

CREATE TABLE historial_estados_consolidado (
    id SERIAL PRIMARY KEY,
    id_consolidado INT NOT NULL REFERENCES consolidados(id) ON DELETE CASCADE,
    estado VARCHAR(30) NOT NULL,
    descripcion_publica TEXT,
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_consolidado (
    id SERIAL PRIMARY KEY,
    id_consolidado INT NOT NULL REFERENCES consolidados(id),
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc),
    id_producto INT NOT NULL REFERENCES perfumes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_consolidado_aplicado DECIMAL(10,2) NOT NULL CHECK (precio_consolidado_aplicado > 0),
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_item VARCHAR(30) DEFAULT 'Reservado' CHECK (estado_item IN ('Reservado', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'))
);
CREATE INDEX idx_detalle_consolidado_consolidado ON detalle_consolidado(id_consolidado);
CREATE INDEX idx_detalle_consolidado_cliente ON detalle_consolidado(dni_cliente);
CREATE INDEX idx_detalle_consolidado_producto ON detalle_consolidado(id_producto);

-- ==========================================
-- 4. PEDIDOS, PAGOS Y ENVÍOS
-- ==========================================
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    dni_cliente VARCHAR(15) NOT NULL REFERENCES clientes(dni_ce_ruc),
    tipo_pedido VARCHAR(30) CHECK (tipo_pedido IN ('Directo_Tienda', 'Consolidado')),
    id_consolidado_asociado INT REFERENCES consolidados(id),
    id_direccion_entrega INT REFERENCES direcciones_cliente(id) ON DELETE RESTRICT,
    monto_total DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_total >= 0),
    monto_adelanto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_adelanto_pagado >= 0),
    monto_saldo_pendiente DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_saldo_pendiente >= 0),
    estado_pago VARCHAR(20) CHECK (estado_pago IN ('Pendiente', 'Parcial', 'Completado')) DEFAULT 'Pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pedido_tipo_consolidado CHECK (
        (tipo_pedido = 'Consolidado' AND id_consolidado_asociado IS NOT NULL) OR
        (tipo_pedido = 'Directo_Tienda' AND id_consolidado_asociado IS NULL)
    )
);
CREATE INDEX idx_pedidos_cliente ON pedidos(dni_cliente);
CREATE INDEX idx_pedidos_consolidado ON pedidos(id_consolidado_asociado);

-- Detalle de líneas para pedidos 'Directo_Tienda' (los pedidos 'Consolidado'
-- ya tienen su detalle en detalle_consolidado)
CREATE TABLE detalle_pedido (
    id SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES perfumes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario_aplicado DECIMAL(10,2) NOT NULL CHECK (precio_unitario_aplicado > 0),
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario_aplicado) STORED
);
CREATE INDEX idx_detalle_pedido_pedido ON detalle_pedido(id_pedido);

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    tipo_pago VARCHAR(30) CHECK (tipo_pago IN ('Adelanto', 'Saldo_Final', 'Abono_Parcial')),
    metodo_pago VARCHAR(50) CHECK (metodo_pago IN ('Yape', 'Plin', 'Transferencia_Bancaria', 'Tarjeta', 'PagoEfectivo', 'Efectivo')),
    comprobante_url TEXT,
    estado_pago VARCHAR(20) CHECK (estado_pago IN ('Pendiente', 'Aprobado', 'Rechazado')) DEFAULT 'Pendiente',
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pagos_pedido ON pagos(id_pedido);

CREATE TABLE envios (
    id SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    numero_guia_seguimiento VARCHAR(100),
    empresa_transporte VARCHAR(50),
    estado_envio VARCHAR(30) CHECK (estado_envio IN ('Preparando', 'En_Agencia', 'En_Ruta', 'Entregado', 'Devuelto')),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_envios_pedido ON envios(id_pedido);

-- ==========================================
-- 5. ÍNDICES ADICIONALES
-- ==========================================
CREATE INDEX idx_perfumes_marca ON perfumes(marca);
CREATE INDEX idx_perfumes_genero ON perfumes(genero);
CREATE INDEX idx_perfumes_estado ON perfumes(estado);
CREATE INDEX idx_direcciones_cliente ON direcciones_cliente(dni_cliente);

-- ==========================================
-- 6. TRIGGERS DE INTEGRIDAD
-- ==========================================

-- Crea automáticamente el registro de inventario al dar de alta un perfume
CREATE OR REPLACE FUNCTION fn_crear_inventario_inicial() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventario (id_producto) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crear_inventario_inicial
AFTER INSERT ON perfumes
FOR EACH ROW EXECUTE FUNCTION fn_crear_inventario_inicial();

-- Mantiene sincronizado el total de unidades acumuladas de cada consolidado
-- (evita que el contador se desincronice de las reservas reales)
CREATE OR REPLACE FUNCTION fn_actualizar_total_consolidado() RETURNS TRIGGER AS $$
BEGIN
    UPDATE consolidados
    SET total_unidades_acumuladas = COALESCE((
        SELECT SUM(cantidad) FROM detalle_consolidado
        WHERE id_consolidado = COALESCE(NEW.id_consolidado, OLD.id_consolidado)
          AND estado_item <> 'Cancelado'
    ), 0)
    WHERE id = COALESCE(NEW.id_consolidado, OLD.id_consolidado);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_total_consolidado
AFTER INSERT OR UPDATE OR DELETE ON detalle_consolidado
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_total_consolidado();

-- Mantiene sincronizado el stock reservado por unidades comprometidas en
-- consolidados activos (evita sobreventa del stock físico real)
CREATE OR REPLACE FUNCTION fn_actualizar_stock_reservado() RETURNS TRIGGER AS $$
DECLARE
    v_producto INT := COALESCE(NEW.id_producto, OLD.id_producto);
BEGIN
    UPDATE inventario
    SET stock_reservado_consolidados = COALESCE((
        SELECT SUM(cantidad) FROM detalle_consolidado
        WHERE id_producto = v_producto AND estado_item <> 'Cancelado'
    ), 0)
    WHERE id_producto = v_producto;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_stock_reservado
AFTER INSERT OR UPDATE OR DELETE ON detalle_consolidado
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_reservado();

-- ==========================================
-- 7. DATOS BASE
-- ==========================================
INSERT INTO roles (nombre) VALUES ('Admin'), ('Cliente');
