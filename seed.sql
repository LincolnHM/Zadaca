-- ==========================================================
-- MAISON ZADACA IMPORTACIONES — DATOS DE EJEMPLO (SEED)
-- Ejecutar después de bd.sql
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- UBIGEO (principales ciudades de Perú)
-- ==========================================
INSERT INTO ubigeo (codigo_ubigeo, departamento, provincia, distrito) VALUES
('150101','Lima','Lima','Lima'),
('150122','Lima','Lima','Miraflores'),
('150140','Lima','Lima','San Isidro'),
('150135','Lima','Lima','San Borja'),
('150132','Lima','Lima','San Miguel'),
('040101','Arequipa','Arequipa','Arequipa'),
('130101','La Libertad','Trujillo','Trujillo'),
('140101','Lambayeque','Chiclayo','Chiclayo'),
('200101','Piura','Piura','Piura'),
('080101','Cusco','Cusco','Cusco'),
('120101','Junín','Huancayo','Huancayo'),
('220101','San Martín','Moyobamba','Moyobamba');

-- ==========================================
-- CLIENTES DE PRUEBA
-- Admin  -> correo: admin@maisonzadaca.com   / clave: Zadaca2026!
-- Cliente-> correo: cliente@demo.com         / clave: Cliente123!
-- ==========================================
INSERT INTO clientes (dni_ce_ruc, id_rol, nombres, apellidos, correo, telefono, contrasena_hash, correo_verificado) VALUES
('00000001', 1, 'Equipo', 'Zadaca', 'admin@maisonzadaca.com', '+51 987654321', crypt('Zadaca2026!', gen_salt('bf')), TRUE),
('45678912', 2, 'Fiorella', 'Ramírez', 'cliente@demo.com', '+51 912345678', crypt('Cliente123!', gen_salt('bf')), TRUE),
('41234567', 2, 'Jorge', 'Delgado', 'jorge.delgado@mail.com', '+51 923456781', crypt('Cliente123!', gen_salt('bf')), TRUE),
('47654321', 2, 'Camila', 'Torres', 'camila.torres@mail.com', '+51 934567812', crypt('Cliente123!', gen_salt('bf')), TRUE),
('43219876', 2, 'Renzo', 'Vega', 'renzo.vega@mail.com', '+51 945678123', crypt('Cliente123!', gen_salt('bf')), TRUE);

INSERT INTO direcciones_cliente (dni_cliente, etiqueta, direccion_detalle, codigo_ubigeo, tipo_despacho, predeterminada) VALUES
('45678912', 'Casa', 'Av. Larco 345, Dpto 502', '150122', 'Domicilio', TRUE),
('41234567', 'Oficina', 'Jr. Comercio 120', '140101', 'Agencia_Shalom', TRUE);

-- ==========================================
-- CATÁLOGO DE PERFUMES
-- ==========================================
INSERT INTO perfumes (slug, nombre, marca, genero, familia_olfativa, concentracion, mililitros, descripcion, notas_olfativas, precio_tienda_regular, descuento_tienda_porcentaje, precio_consolidado_fijo, estado, es_nuevo, es_bestseller) VALUES
('sauvage-elixir-dior-100ml', 'Sauvage Elixir', 'Dior', 'Hombre', 'Amaderado Especiado', 'Parfum', 100, 'Intenso y magnético, con una potencia excepcional. Un ícono reinventado en su máxima concentración.', 'Salida: Canela, Pimienta de Sichuan | Corazón: Lavanda | Fondo: Ámbar, Vainilla', 520.00, 10.00, 430.00, 'Disponible', TRUE, TRUE),
('bleu-de-chanel-parfum-100ml', 'Bleu de Chanel', 'Chanel', 'Hombre', 'Amaderado Aromático', 'Parfum', 100, 'La expresión más sensual y misteriosa de Bleu de Chanel.', 'Salida: Cedro, Menta | Corazón: Lavanda, Jengibre | Fondo: Sándalo, Ámbar', 590.00, 0.00, 480.00, 'Disponible', FALSE, TRUE),
('aventus-creed-100ml', 'Aventus', 'Creed', 'Hombre', 'Afrutado Amaderado', 'Eau de Parfum', 100, 'El perfume masculino más icónico de la casa Creed. Poder, éxito y elegancia.', 'Salida: Piña, Bergamota, Grosella Negra | Corazón: Rosa, Jazmín | Fondo: Musgo de Roble, Ámbar Gris', 780.00, 0.00, 650.00, 'Disponible', FALSE, TRUE),
('erba-pura-xerjoff-100ml', 'Erba Pura', 'Xerjoff', 'Unisex', 'Floral Afrutado', 'Eau de Parfum', 100, 'Frescura mediterránea con flor de naranja de Sicilia y una base almizclada envolvente.', 'Salida: Bergamota, Piña | Corazón: Flor de Naranja | Fondo: Almizcle, Ámbar', 690.00, 0.00, 580.00, 'Disponible', TRUE, FALSE),
('le-beau-le-parfum-jpg-100ml', 'Le Beau Le Parfum', 'Jean Paul Gaultier', 'Hombre', 'Oriental Cítrico', 'Parfum', 100, 'Versión intensa y solar de Le Beau, con coco tropical y vainilla.', 'Salida: Cítricos | Corazón: Coco | Fondo: Vainilla, Cashmere Wood', 430.00, 15.00, 360.00, 'Disponible', FALSE, FALSE),
('good-girl-carolina-herrera-80ml', 'Good Girl', 'Carolina Herrera', 'Mujer', 'Floral Amaderado', 'Eau de Parfum', 80, 'Femenina, seductora y llena de contrastes, en su icónico frasco tacón.', 'Salida: Almendra, Café | Corazón: Jazmín, Tuberosa | Fondo: Cacao, Haba Tonka', 480.00, 0.00, 400.00, 'Disponible', FALSE, TRUE),
('libre-yves-saint-laurent-90ml', 'Libre', 'Yves Saint Laurent', 'Mujer', 'Floral Amaderado', 'Eau de Parfum', 90, 'Un choque de lavanda masculina y flor de azahar femenina. Libertad en su máxima expresión.', 'Salida: Lavanda, Casis | Corazón: Flor de Naranja | Fondo: Vainilla, Almizcle', 470.00, 0.00, 390.00, 'Disponible', TRUE, FALSE),
('la-vie-est-belle-lancome-75ml', 'La Vie Est Belle', 'Lancôme', 'Mujer', 'Floral Gourmand', 'Eau de Parfum', 75, 'Una declaración de felicidad. Iris, praliné y vainilla en armonía perfecta.', 'Salida: Pera, Grosella Negra | Corazón: Iris, Jazmín | Fondo: Praliné, Vainilla, Pachulí', 460.00, 0.00, 385.00, 'Disponible', FALSE, TRUE),
('le-male-elixir-jpg-125ml', 'Le Male Elixir', 'Jean Paul Gaultier', 'Hombre', 'Oriental Especiado', 'Parfum', 125, 'La evolución más oscura y seductora de Le Male. Lavanda especiada con miel y ámbar.', 'Salida: Lavanda | Corazón: Miel, Especias | Fondo: Ámbar, Cuero', 450.00, 0.00, 375.00, 'Disponible', FALSE, FALSE),
('1-million-paco-rabanne-100ml', '1 Million', 'Paco Rabanne', 'Hombre', 'Especiado Amaderado', 'Eau de Toilette', 100, 'Audaz, magnético y adictivo, en su icónico frasco lingote de oro.', 'Salida: Toronja, Menta | Corazón: Canela, Especias | Fondo: Cuero, Ámbar', 340.00, 20.00, 280.00, 'Disponible', FALSE, TRUE),
('black-opium-ysl-90ml', 'Black Opium', 'Yves Saint Laurent', 'Mujer', 'Oriental Vainillado', 'Eau de Parfum', 90, 'Adictivo, seductor y lleno de energía. Café negro y vainilla en un frasco de esmalte negro.', 'Salida: Café, Pera | Corazón: Jazmín, Almendra Amarga | Fondo: Vainilla, Pachulí', 460.00, 0.00, 385.00, 'Disponible', FALSE, FALSE),
('acqua-di-gio-profumo-armani-75ml', 'Acqua di Giò Profumo', 'Giorgio Armani', 'Hombre', 'Aromático Acuático', 'Eau de Parfum', 75, 'La firma marina de Armani en su versión más profunda e intensa.', 'Salida: Bergamota, Salvia | Corazón: Notas Marinas, Geranio | Fondo: Pachulí, Incienso', 420.00, 0.00, 350.00, 'Disponible', FALSE, FALSE),
('tobacco-vanille-tom-ford-100ml', 'Tobacco Vanille', 'Tom Ford', 'Unisex', 'Oriental Especiado', 'Eau de Parfum', 100, 'Cálido, envolvente y lujoso. Una de las fragancias de nicho más buscadas del mundo.', 'Salida: Tabaco, Especias | Corazón: Haba Tonka, Vainilla | Fondo: Cacao, Madera Seca', 890.00, 0.00, 740.00, 'Bajo_Pedido', FALSE, TRUE),
('phantom-paco-rabanne-100ml', 'Phantom', 'Paco Rabanne', 'Hombre', 'Aromático Fougère', 'Eau de Toilette', 100, 'Futurista y tecnológico, con un frasco recargable en forma de altavoz inteligente.', 'Salida: Manzana, Lavanda | Corazón: Haba Tonka | Fondo: Cachemira, Ámbar', 350.00, 0.00, 290.00, 'Disponible', TRUE, FALSE),
('flowerbomb-viktor-rolf-90ml', 'Flowerbomb', 'Viktor & Rolf', 'Mujer', 'Floral Oriental', 'Eau de Parfum', 90, 'Una explosión floral adictiva en un frasco joya inconfundible.', 'Salida: Té Verde, Bergamota | Corazón: Jazmín, Orquídea, Rosa | Fondo: Pachulí, Vainilla', 520.00, 0.00, 435.00, 'Disponible', FALSE, FALSE),
('the-scent-hugo-boss-100ml', 'The Scent', 'Hugo Boss', 'Hombre', 'Aromático Especiado', 'Eau de Toilette', 100, 'Magnético y elegante, con la inconfundible nota de maninka.', 'Salida: Jengibre, Limón | Corazón: Lavanda | Fondo: Cuero, Maninka', 310.00, 10.00, 260.00, 'Disponible', FALSE, FALSE),
('erba-pura-oro-xerjoff-50ml', 'Erba Pura Oro', 'Xerjoff', 'Unisex', 'Floral Afrutado', 'Extrait de Parfum', 50, 'Versión concentrada y aún más lujosa del icónico Erba Pura.', 'Salida: Bergamota, Piña | Corazón: Flor de Naranja | Fondo: Almizcle Blanco, Ámbar', 750.00, 0.00, 625.00, 'Agotado', FALSE, FALSE),
('gentleman-givenchy-100ml', 'Gentleman Réserve Privée', 'Givenchy', 'Hombre', 'Amaderado Especiado', 'Eau de Parfum', 100, 'Elegancia oscura con un corazón de iris y ron añejo.', 'Salida: Pimienta Rosa | Corazón: Iris, Ron | Fondo: Cuero, Vainilla', 480.00, 0.00, 400.00, 'Disponible', FALSE, FALSE),
('mon-guerlain-intense-90ml', 'Mon Guerlain Intense', 'Guerlain', 'Mujer', 'Floral Amaderado', 'Eau de Parfum', 90, 'Una versión más intensa y sensual del icónico Mon Guerlain.', 'Salida: Lavanda | Corazón: Jazmín Sambac | Fondo: Vainilla, Haba Tonka', 490.00, 0.00, 410.00, 'Disponible', TRUE, FALSE),
('interlude-man-amouage-100ml', 'Interlude Man', 'Amouage', 'Hombre', 'Oriental Ahumado', 'Eau de Parfum', 100, 'Denso, ahumado y filosófico. Una fragancia de nicho de culto.', 'Salida: Incienso, Bergamota | Corazón: Especias, Clavo | Fondo: Ládano, Musgo de Roble', 950.00, 0.00, 790.00, 'Bajo_Pedido', FALSE, FALSE),
('si-passione-armani-100ml', 'Sì Passione', 'Giorgio Armani', 'Mujer', 'Floral Afrutado', 'Eau de Parfum', 100, 'Vibrante, apasionado y elegante, con un corazón de flor de azahar.', 'Salida: Grosella Negra, Bergamota | Corazón: Flor de Azahar | Fondo: Pachulí, Vainilla', 470.00, 5.00, 395.00, 'Disponible', FALSE, TRUE),
('eros-versace-100ml', 'Eros', 'Versace', 'Hombre', 'Amaderado Aromático', 'Eau de Toilette', 100, 'Potencia y pasión mediterránea en un frasco inspirado en la escultura clásica.', 'Salida: Menta, Manzana Verde | Corazón: Ámbar Geranio, Canela | Fondo: Cedro, Vainilla', 330.00, 0.00, 275.00, 'Disponible', FALSE, TRUE),
('olympea-paco-rabanne-80ml', 'Olympéa', 'Paco Rabanne', 'Mujer', 'Floral Salado', 'Eau de Parfum', 80, 'Sensual y magnética, con la firma inconfundible de la sal y la vainilla.', 'Salida: Flor de Casis, Mandarina | Corazón: Jazmín Sambac, Sal | Fondo: Vainilla, Cashmeran', 400.00, 0.00, 335.00, 'Disponible', FALSE, FALSE),
('layton-parfums-de-marly-125ml', 'Layton', 'Parfums de Marly', 'Hombre', 'Aromático Especiado', 'Eau de Parfum', 125, 'Elegancia francesa contemporánea con manzana, lavanda y vainilla.', 'Salida: Manzana, Bergamota | Corazón: Lavanda, Geranio | Fondo: Vainilla, Cardamomo', 680.00, 0.00, 570.00, 'Disponible', TRUE, TRUE);

-- ==========================================
-- STOCK INICIAL (inventario ya creado por trigger al insertar perfumes)
-- ==========================================
UPDATE inventario SET stock_fisico = 18 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'sauvage-elixir-dior-100ml');
UPDATE inventario SET stock_fisico = 12 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'bleu-de-chanel-parfum-100ml');
UPDATE inventario SET stock_fisico = 9  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'aventus-creed-100ml');
UPDATE inventario SET stock_fisico = 15 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'erba-pura-xerjoff-100ml');
UPDATE inventario SET stock_fisico = 20 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'le-beau-le-parfum-jpg-100ml');
UPDATE inventario SET stock_fisico = 14 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'good-girl-carolina-herrera-80ml');
UPDATE inventario SET stock_fisico = 16 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'libre-yves-saint-laurent-90ml');
UPDATE inventario SET stock_fisico = 11 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'la-vie-est-belle-lancome-75ml');
UPDATE inventario SET stock_fisico = 13 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'le-male-elixir-jpg-125ml');
UPDATE inventario SET stock_fisico = 25 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = '1-million-paco-rabanne-100ml');
UPDATE inventario SET stock_fisico = 17 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'black-opium-ysl-90ml');
UPDATE inventario SET stock_fisico = 10 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'acqua-di-gio-profumo-armani-75ml');
UPDATE inventario SET stock_fisico = 4  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'tobacco-vanille-tom-ford-100ml');
UPDATE inventario SET stock_fisico = 19 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'phantom-paco-rabanne-100ml');
UPDATE inventario SET stock_fisico = 8  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'flowerbomb-viktor-rolf-90ml');
UPDATE inventario SET stock_fisico = 22 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'the-scent-hugo-boss-100ml');
UPDATE inventario SET stock_fisico = 0  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'erba-pura-oro-xerjoff-50ml');
UPDATE inventario SET stock_fisico = 7  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'gentleman-givenchy-100ml');
UPDATE inventario SET stock_fisico = 12 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'mon-guerlain-intense-90ml');
UPDATE inventario SET stock_fisico = 3  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'interlude-man-amouage-100ml');
UPDATE inventario SET stock_fisico = 15 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'si-passione-armani-100ml');
UPDATE inventario SET stock_fisico = 24 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'eros-versace-100ml');
UPDATE inventario SET stock_fisico = 18 WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'olympea-paco-rabanne-80ml');
UPDATE inventario SET stock_fisico = 9  WHERE id_producto = (SELECT id FROM perfumes WHERE slug = 'layton-parfums-de-marly-125ml');

-- ==========================================
-- CONSOLIDADOS (campañas de compra grupal activas)
-- ==========================================
INSERT INTO consolidados (codigo_campana, fecha_apertura, fecha_cierre_programada, minimo_unidades, estado, notas_admin) VALUES
('ZAD-2026-08', now() - interval '5 days', now() + interval '9 days', 12, 'Abierto', 'Consolidado de agosto — contenedor desde Miami.'),
('ZAD-2026-09', now() - interval '1 day', now() + interval '20 days', 15, 'Abierto', 'Consolidado de setiembre — recién abierto.'),
('ZAD-2026-07', now() - interval '40 days', now() - interval '10 days', 10, 'En_Almacen_Local', 'Consolidado de julio, ya nacionalizado, en preparación de entregas.');

INSERT INTO historial_estados_consolidado (id_consolidado, estado, descripcion_publica) VALUES
(1, 'Abierto', 'Campaña abierta. ¡Reserva tu perfume antes del cierre!'),
(2, 'Abierto', 'Campaña abierta. ¡Reserva tu perfume antes del cierre!'),
(3, 'Comprado_En_Transito', 'Pedido realizado a proveedor, en camino a Perú.'),
(3, 'En_Aduanas', 'Mercadería en proceso de nacionalización en aduanas.'),
(3, 'En_Almacen_Local', 'Mercadería nacionalizada. Preparando entregas y envíos.');

INSERT INTO detalle_consolidado (id_consolidado, dni_cliente, id_producto, cantidad, precio_consolidado_aplicado) VALUES
(1, '45678912', (SELECT id FROM perfumes WHERE slug = 'aventus-creed-100ml'), 2, 650.00),
(1, '41234567', (SELECT id FROM perfumes WHERE slug = 'tobacco-vanille-tom-ford-100ml'), 1, 740.00),
(1, '47654321', (SELECT id FROM perfumes WHERE slug = 'aventus-creed-100ml'), 1, 650.00),
(1, '43219876', (SELECT id FROM perfumes WHERE slug = 'interlude-man-amouage-100ml'), 2, 790.00),
(2, '45678912', (SELECT id FROM perfumes WHERE slug = 'erba-pura-oro-xerjoff-50ml'), 3, 625.00);

-- ==========================================
-- RESEÑAS
-- ==========================================
INSERT INTO resenas (dni_cliente, id_producto, calificacion, comentario, aprobado) VALUES
('45678912', (SELECT id FROM perfumes WHERE slug = 'aventus-creed-100ml'), 5, 'La calidad es excepcional y el ajuste es perfecto. Zadaca es mi nueva tienda de confianza.', TRUE),
('41234567', (SELECT id FROM perfumes WHERE slug = 'sauvage-elixir-dior-100ml'), 5, 'Sensación de lujo, empaque premium y envío rápido. Totalmente recomendado.', TRUE),
('47654321', (SELECT id FROM perfumes WHERE slug = 'good-girl-carolina-herrera-80ml'), 5, 'Cada perfume que he comprado se ve incluso mejor en persona. Me encanta.', TRUE),
('43219876', (SELECT id FROM perfumes WHERE slug = '1-million-paco-rabanne-100ml'), 4, 'Muy buen precio comparado con tiendas por departamento. El consolidado vale la pena.', TRUE),
('45678912', NULL, 5, 'Excelente atención por WhatsApp, resolvieron todas mis dudas antes de comprar.', TRUE);
