-- ==========================================================
-- CATÁLOGO: nombres correctos, fotos y perfumes del stock que faltaban (sep 2026)
--
-- Correr DESPUÉS de migrations/0018 y de cargar_stock_real_sep2026.sql. Idempotente: se
-- puede volver a correr sin duplicar nada.
--
-- 1. Pone el nombre y la marca oficiales a los perfumes del conteo de stock (el catálogo
--    importado del Excel/PDF traía nombres como "Q.a. Fursan", "Khamra Qawa", "C.D.N. Intense",
--    "Odyssey Mfga", marcas "Por Definir"...). El slug (la URL) NO cambia: los links ya
--    compartidos siguen funcionando.
-- 2. Oculta (no borra) 3 filas duplicadas del mismo perfume que quedaban sin stock.
-- 3. Asigna foto a los 7 productos activos que no tenían.
-- 4. Crea los perfumes del conteo que no existían en el catálogo, con su stock.
-- ==========================================================

begin;

select set_config('zadaca.motivo', 'Conteo', true);
select set_config('zadaca.nota', 'Alta de perfumes del conteo de septiembre 2026', true);

-- ---------- 1. Nombres y marcas oficiales ----------
update perfumes p set nombre = v.nombre, marca = coalesce(v.marca, p.marca)
from (values
    (1,   '9PM', null),                                  -- era "9 PM"
    (351, '9PM', null),                                  -- decant, era "9PM Clásico"
    (6,   '9PM Elixir', null),                           -- era "9PM Elixir EAU DE Parfum"
    (9,   '9PM Night Out', null),                        -- era "9pm Nigh Out"
    (19,  'Amber Oud Gold Edition', null),               -- era "Amber Gold" (120 ml)
    (511, 'Amber Oud Gold Edition', null),               -- decant, era "Haramain Amber Oud"
    (24,  'Club de Nuit Intense Man', null),             -- era "C.D.N. Intense"
    (470, 'Club de Nuit Intense Man', null),
    (40,  'Odyssey Mandarin Sky', null),                 -- 200 ml
    (181, 'Odyssey Mandarin Sky', 'Armaf'),              -- 100 ml, era "Por Definir — Mandarin SKY"
    (377, 'Odyssey Mandarin Sky', null),                 -- decant
    (436, 'Odyssey Mega', null),                         -- era "Odyssey Mfga" (duplicado, se oculta abajo)
    (465, 'Odyssey Mega', null),                         -- decant, era "Odyssey Mfga"
    (53,  'Rome Pour Homme', null),                      -- era "Bharara Mast Perfume Rome Pour Homme"
    (363, 'Rome Pour Homme', null),                      -- decant, era "Rome Pour Homme EDP"
    (238, 'Rome Extradose', null),                       -- era "Rome Extradose By Bharara"
    (369, 'Asad', null),                                 -- decant, era "Asad Black"
    (500, 'Eclaire Pistache', null),                     -- decant, era "Eclaire Pistacho"
    (103, 'Khamrah', null),                              -- era "Khamra Clasic"
    (104, 'Khamrah Qahwa', null),                        -- era "Khamra Qawa"
    (361, 'Khamrah Qahwa', null),                        -- decant, era "Khamra Qahwa"
    (117, 'Qaed Al Fursan', null),                       -- era "Q.a. Fursan"
    (475, 'Qaed Al Fursan Untamed', null),               -- decant, era "Qaed Untamed"
    (125, 'Bade''e Al Oud Sublime', null),               -- era "Sublime"
    (349, 'Bade''e Al Oud Sublime', null),
    (176, 'Bade''e Al Oud Noble Blush', null),           -- era "Lattafa Bade'e Al Oud Noble Blush"
    (496, 'Bade''e Al Oud Noble Blush', null),
    (219, 'Bade''e Al Oud Honor & Glory', null),         -- era "BADEE HONOR GLORY"
    (345, 'Bade''e Al Oud Honor & Glory', null),         -- decant, era "Honor y Glory"
    (497, 'Bade''e Al Oud Amethyst', null),              -- decant (morado), era "Amethyst"
    (498, 'Bade''e Al Oud Oud for Glory', null),         -- decant (negro), era "Oud For Glory"
    (129, 'Yara Moi', null),                             -- era "Yara MOI"
    (445, 'Yara', null),                                 -- el Yara original (rosado)
    (339, 'Yara', null),                                 -- decant, era "Yara Pink"
    (200, 'Hawas Ice', null),                            -- era "Hawas ICE"
    (255, 'Hawas Malibu', null),                         -- era "HAWAS MALIBU"
    (203, 'Hawas Tropical', null),                       -- era "Hawas Tropical Eau Parfum"
    (220, 'Rayhaan Tropical Vibe', null),                -- era "Rayhaan Tropical Vibe EDP 3.4 fl oz"
    (232, 'Fakhar Rose', null),                          -- era "Fakhar Rose Eau de Parfu"
    (330, 'Eros Flame', null),                           -- era "Eros Flame Edp Men"
    (447, 'Dunescape Dubai', null),                      -- era "Dunascape Dubai"
    (509, 'Dunescape Dubai', null),
    (73,  'Le Beau Le Parfum', null),                    -- era "Jean Paul Gaultier Le Beau Le Parfum M EDP"
    (54,  'Pharaoh Ramesses', null),                     -- era "Pharaoh Ramesses Bharara"
    (102, 'Hayaati', null),                              -- era "Hayati EDP"
    (100, 'Haya', null),                                 -- era "Haya Eau Parfum"
    (134, 'Art of Universe', null),                      -- era "Arte DEL Universo Unisex EDP - DE Lattafa Pride"
    (507, 'Art of Universe', null),
    (147, 'Pisa', null),                                 -- era "Pride Pisa"
    (222, 'Eter Arabian Sky', null),                     -- era "Armaf Eter Arabian Sky"
    (233, 'Angham', null),                               -- era "Angham Lattafa"
    (274, '212 VIP Black', null),                        -- era "212 Vip Black Edp Men"
    (453, 'Uomo Intense', 'Stallion'),                   -- era "Por Definir — Uomo Intense"
    (518, 'Uomo Intense', 'Stallion'),
    (476, 'Candy Apple', 'Tubbees'),                     -- decant, era "Por Definir — Tubbes Candy Apple"
    (167, 'Delilah', 'Maison Alhambra'),                 -- era "Por Definir — Delilah"
    (455, 'Game of Spades Bid', 'Jo Milano Paris'),      -- era "Game Of Spades Bio" (el verde)
    (524, 'Game of Spades Bid', 'Jo Milano Paris'),
    (448, 'Nitro White', 'Dumont'),                      -- la línea Nitro es de Dumont, no Rasasi
    (510, 'Nitro White', 'Dumont'),
    (182, 'Nitro Red Intensely', 'Dumont'),
    (258, 'Nitro Red', 'Dumont'),
    (259, 'Nitro Elixir', 'Dumont'),
    (260, 'Nitro Intense', 'Dumont'),
    (261, 'Nitro Gold', 'Dumont')
) as v(id, nombre, marca)
where p.id = v.id;

-- El Game of Spades verde (Bid) es el "Game of verde" del conteo: su decant tiene 1 frasco abierto.
update inventario set frascos_abiertos = 1 where id_producto = 524 and frascos_abiertos = 0;
update perfumes set estado = 'Disponible' where id = 524;

-- ---------- 2. Duplicados sin stock: se ocultan (no se borran) ----------
-- 436 "Odyssey Mfga" = 42 Odyssey Mega · 130 "Yara Rosa" = 445 Yara · 33 = 222 Eter Arabian Sky
update perfumes p set activo = false
from inventario i
where i.id_producto = p.id and p.id in (436, 130, 33) and i.stock_fisico = 0;

-- ---------- 3. Fotos de los productos activos que no tenían ----------
update perfumes set imagen_url = (select imagen_url from perfumes where id = 42) where id in (436, 465) and imagen_url is null;
update perfumes set imagen_url = 'assets/img/perfumes/stallion-uomo-intense.avif' where id in (453, 518);
update perfumes set imagen_url = 'assets/img/perfumes/jo-milano-game-of-spades-bid.jpg' where id in (455, 524);
update perfumes set imagen_url = (select imagen_url from perfumes where id = 310) where id = 318 and imagen_url is null;

-- ---------- 4. Perfumes del conteo que no existían ----------
-- Decants con frasco abierto: se venden desde ya. Precios = el nivel más usado en tus decants
-- (árabes 15/25/35 · 18/28/40 los de gama más alta · diseñador 20/40/60): revísalos en
-- Productos → Solo Decants.
insert into perfumes (slug, nombre, marca, genero, tipo_casa, concentracion, mililitros, es_decant, activo, estado,
                      precio_3ml, precio_5ml, precio_10ml, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado,
                      imagen_url, notas_olfativas)
values
    ('carolina-herrera-212-vip-black-decant', '212 VIP Black', 'Carolina Herrera', 'Hombre', 'Diseñador', 'Eau de Parfum', 100, true, true, 'Disponible', 20, 40, 60, 60, 60, true,
     (select imagen_url from perfumes where id = 274), null),
    ('maison-alhambra-delilah-decant', 'Delilah', 'Maison Alhambra', 'Mujer', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 15, 25, 35, 35, 35, true,
     (select imagen_url from perfumes where id = 167), 'Floral, Frutal, Rosa, Almizcle, Vainilla'),
    ('lattafa-angham-decant', 'Angham', 'Lattafa', 'Unisex', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 18, 28, 40, 40, 40, true,
     (select imagen_url from perfumes where id = 233), null),
    ('rasasi-hawas-fire-decant', 'Hawas Fire', 'Rasasi', 'Hombre', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 18, 28, 40, 40, 40, true,
     (select imagen_url from perfumes where id = 199), null),
    ('armaf-eter-arabian-sky-decant', 'Eter Arabian Sky', 'Armaf', 'Unisex', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 18, 28, 40, 40, 40, true,
     (select imagen_url from perfumes where id = 222), null),
    ('maison-alhambra-glacier-bold-decant', 'Glacier Bold', 'Maison Alhambra', 'Unisex', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 15, 25, 35, 35, 35, true,
     'assets/img/perfumes/maison-alhambra-glacier-bold.jpg', 'Coco, Tonka, Bergamota, Dulce, Cremoso'),
    ('maison-alhambra-glacier-ultra-decant', 'Glacier Ultra', 'Maison Alhambra', 'Hombre', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 15, 25, 35, 35, 35, true,
     'assets/img/perfumes/maison-alhambra-glacier-ultra.jpg', 'Canela, Pimienta, Limón, Lavanda, Vainilla, Ámbar'),
    ('maison-alhambra-glacier-pour-homme-decant', 'Glacier Pour Homme', 'Maison Alhambra', 'Hombre', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 15, 25, 35, 35, 35, true,
     'assets/img/perfumes/maison-alhambra-glacier-pour-homme.jpg', 'Lavanda, Menta, Cardamomo, Vainilla, Tonka, Ámbar'),
    ('paco-rabanne-1-million-elixir-decant', '1 Million Elixir', 'Paco Rabanne', 'Hombre', 'Diseñador', 'Parfum Intense', 100, true, true, 'Disponible', 20, 40, 60, 60, 60, true,
     'assets/img/perfumes/rabanne-1-million-elixir.jpg', 'Manzana, Rosa, Cedro, Osmanto, Vainilla'),
    ('yves-saint-laurent-myslf-decant', 'MYSLF Eau de Parfum', 'Yves Saint Laurent', 'Hombre', 'Diseñador', 'Eau de Parfum', 100, true, true, 'Disponible', 20, 40, 60, 60, 60, true,
     'assets/img/perfumes/ysl-myslf-eau-de-parfum.jpg', 'Bergamota, Azahar, Pachulí, Amaderado, Fresco'),
    ('paco-rabanne-invictus-aqua-decant', 'Invictus Aqua', 'Paco Rabanne', 'Hombre', 'Diseñador', 'Eau de Toilette', 100, true, true, 'Disponible', 20, 40, 60, 60, 60, true,
     'assets/img/perfumes/rabanne-invictus-aqua.jpg', 'Acuático, Marino, Ámbar, Amaderado, Fresco'),
    ('rasasi-hawas-exotic-decant', 'Hawas Exotic', 'Rasasi', 'Hombre', 'Árabe', 'Eau de Parfum', 100, true, true, 'Disponible', 18, 28, 40, 40, 40, true,
     'assets/img/perfumes/rasasi-hawas-exotic.jpg', 'Coco, Lavanda, Cardamomo, Iris, Ámbar'),
    -- "Supremacy plomo": se asumió Supremacy Silver (el plateado). Queda OCULTO hasta que lo confirmes.
    ('afnan-supremacy-silver-decant', 'Supremacy Silver', 'Afnan', 'Hombre', 'Árabe', 'Eau de Parfum', 100, true, false, 'Disponible', 15, 25, 35, 35, 35, true,
     'assets/img/perfumes/afnan-supremacy-silver.jpg', 'Piña, Bergamota, Grosella, Almizcle, Amaderado')
on conflict (slug) do nothing;

-- Frascos cerrados que no tenían producto de tienda. Quedan OCULTOS y con margen_aplicado =
-- false (aparecen en la Calculadora de Márgenes como pendientes): pon su precio de venta y
-- actívalos en Productos cuando quieras venderlos enteros.
insert into perfumes (slug, nombre, marca, genero, tipo_casa, concentracion, mililitros, es_decant, activo, estado,
                      precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, imagen_url, notas_olfativas)
values
    ('maison-alhambra-glacier-bold-100ml', 'Glacier Bold', 'Maison Alhambra', 'Unisex', 'Árabe', 'Eau de Parfum', 100, false, false, 'Disponible', 150, 150, false,
     'assets/img/perfumes/maison-alhambra-glacier-bold.jpg', 'Coco, Tonka, Bergamota, Dulce, Cremoso'),
    ('maison-alhambra-glacier-ultra-100ml', 'Glacier Ultra', 'Maison Alhambra', 'Hombre', 'Árabe', 'Eau de Parfum', 100, false, false, 'Disponible', 150, 150, false,
     'assets/img/perfumes/maison-alhambra-glacier-ultra.jpg', 'Canela, Pimienta, Limón, Lavanda, Vainilla, Ámbar'),
    ('rasasi-hawas-exotic-100ml', 'Hawas Exotic', 'Rasasi', 'Hombre', 'Árabe', 'Eau de Parfum', 100, false, false, 'Disponible', 190, 190, false,
     'assets/img/perfumes/rasasi-hawas-exotic.jpg', 'Coco, Lavanda, Cardamomo, Iris, Ámbar')
on conflict (slug) do nothing;

-- Vínculos decant → perfume de tienda (para "Abrir frasco" y para que la web muestre
-- "¿Quieres probarlo antes?" / "Llévalo completo").
update perfumes d set id_perfume_tienda = t.id
from (values
    ('carolina-herrera-212-vip-black-decant', 274),
    ('maison-alhambra-delilah-decant', 167),
    ('lattafa-angham-decant', 233),
    ('rasasi-hawas-fire-decant', 199),
    ('armaf-eter-arabian-sky-decant', 222)
) as v(slug, id_tienda)
join perfumes t on t.id = v.id_tienda
where d.slug = v.slug;

update perfumes d set id_perfume_tienda = t.id
from (values
    ('maison-alhambra-glacier-bold-decant', 'maison-alhambra-glacier-bold-100ml'),
    ('maison-alhambra-glacier-ultra-decant', 'maison-alhambra-glacier-ultra-100ml'),
    ('rasasi-hawas-exotic-decant', 'rasasi-hawas-exotic-100ml')
) as v(slug_decant, slug_tienda)
join perfumes t on t.slug = v.slug_tienda
where d.slug = v.slug_decant;

-- Stock del conteo para lo recién creado (el trigger de alta ya les creó su fila en inventario).
update inventario i set frascos_abiertos = 1
from perfumes p
where p.id = i.id_producto and i.frascos_abiertos = 0 and p.slug in (
    'carolina-herrera-212-vip-black-decant', 'maison-alhambra-delilah-decant', 'lattafa-angham-decant',
    'rasasi-hawas-fire-decant', 'armaf-eter-arabian-sky-decant', 'maison-alhambra-glacier-bold-decant',
    'maison-alhambra-glacier-ultra-decant', 'maison-alhambra-glacier-pour-homme-decant', 'paco-rabanne-1-million-elixir-decant',
    'yves-saint-laurent-myslf-decant', 'paco-rabanne-invictus-aqua-decant', 'rasasi-hawas-exotic-decant', 'afnan-supremacy-silver-decant');

update inventario i set stock_fisico = v.cerrados
from (values ('maison-alhambra-glacier-bold-100ml', 2), ('maison-alhambra-glacier-ultra-100ml', 1), ('rasasi-hawas-exotic-100ml', 1)) as v(slug, cerrados)
join perfumes p on p.slug = v.slug
where i.id_producto = p.id and i.stock_fisico = 0;

commit;

-- Revisión
select p.id, case when p.es_decant then 'Decant' else 'Tienda' end as tipo, p.marca, p.nombre, p.activo,
       i.stock_fisico as cerrados, i.frascos_abiertos as abiertos, p.imagen_url is not null as tiene_foto
from perfumes p join inventario i on i.id_producto = p.id
where p.slug like '%glacier%' or p.slug like '%hawas-exotic%' or p.slug like '%1-million-elixir%' or p.slug like '%myslf%'
   or p.slug like '%invictus-aqua%' or p.slug like '%supremacy-silver%' or p.slug in ('carolina-herrera-212-vip-black-decant',
   'maison-alhambra-delilah-decant', 'lattafa-angham-decant', 'rasasi-hawas-fire-decant', 'armaf-eter-arabian-sky-decant') or p.id = 524
order by p.marca, p.nombre, tipo;

-- ==========================================================
-- QUEDA PENDIENTE (confirmar y cargar a mano en Inventario):
--   "Versace blue azul", "Dolce Gabbana", "Qaed negro", "Scandal rojo", "Scandal azul",
--   "Antonio Banderas", "Beach Party", "Nitro plomo", "Bharara King loción" y la 2ª línea
--   de "Rome Extradose" (1 abierto / 4 cerrados).
-- ==========================================================
