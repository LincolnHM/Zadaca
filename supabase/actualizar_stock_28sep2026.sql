-- ==========================================================
-- STOCK DE LA TIENDA — conteo del 28/09/2026
--
-- Pegar completo en Supabase → SQL Editor → Run (después de la migración 0020). Se puede
-- volver a correr: siempre deja el inventario igual a estas dos listas.
--
-- Viene de dos listas del negocio:
--   A) "CONTABILIDAD DE PERFUMES" (conteo): "ASAD BORBOM - 1 ABIERTO - 8 CERRADOS"
--        abierto  = frasco en uso para decantar → frascos_abiertos del DECANT
--        cerrado  = frasco sellado a la venta   → stock_fisico del perfume de TIENDA
--   B) Lista con precios (mercadería que se SUMA a la tienda): "MANDARIN SKY ELIXIR - 20
--      unidades / 170 soles" → +20 frascos cerrados y precio de tienda S/ 170.
--
-- En el Kardex (panel → Inventario → Historial) queda la lista A como "Conteo" y la B como
-- "Ingreso". Todo lo que no figura en ninguna de las dos queda en 0.
-- ==========================================================

begin;

-- ---------- 1. Nombres correctos y productos que faltaban ----------
update perfumes p
set nombre = v.nombre,
    marca = coalesce(v.marca, p.marca),
    tipo_casa = coalesce(v.tipo_casa, p.tipo_casa),
    genero = coalesce(v.genero, p.genero)
from (values
    -- El Qaed Al Fursan original es el frasco NEGRO; el "Qaed blanco" del conteo es el
    -- Unlimited (frasco blanco). El catálogo lo tenía como "Qaed Ultimati".
    (437, 'Qaed Al Fursan Unlimited', null, null, null),
    (474, 'Qaed Al Fursan Unlimited', null, null, null),
    (41,  'Odyssey Mandarin Sky Elixir', null, null, null),     -- era "... Limited Edition"
    (373, 'Odyssey Mandarin Sky Elixir', null, null, null),     -- decant
    (28,  'Club de Nuit Urban Man Elixir', null, null, null),   -- era "CDN Urban MAN Elixir"
    (18,  'Amber Oud Gold Edition', null, null, null),          -- 100 ml (el de 120 ml es el id 19)
    (43,  'Odyssey Spectra', null, null, null),                 -- era "Odyssey Spectra Unisex EDP - DE Armaf"
    (187, 'The Kingdom', 'Lattafa', 'Árabe', 'Hombre'),         -- marca "Por Definir"
    (178, 'Liquid Brun', 'French Avenue', 'Árabe', null),       -- marca "Por Definir"
    (21,  'Club de Nuit Precieux IV', null, null, null),        -- era "Armaf Club DE Nuit Precieux IV"
    (191, 'Yum Yum', 'Armaf', 'Árabe', null),                   -- marca "Por Definir"
    (30,  'Club de Nuit Maleka', null, null, null),             -- era "Club DE Nuit Maleka Women EDP"
    (110, 'Jassor', null, null, null),                          -- era "Lattafa Jassor"
    (218, 'Khamrah Waha', null, null, null)                     -- era "KHAMRAH WAhA"
) as v(id, nombre, marca, tipo_casa, genero)
where p.id = v.id;

-- La foto del Maleka era la del Club de Nuit Woman: se usa la de su decant.
update perfumes set imagen_url = (select imagen_url from perfumes where id = 471) where id = 30;

-- "Set mini Le Male" no existía en el catálogo.
insert into perfumes (slug, nombre, marca, genero, tipo_casa, concentracion, mililitros, es_decant, activo, estado,
                      precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, imagen_url, descripcion)
values ('jean-paul-gaultier-set-mini-le-male', 'Set Mini Le Male', 'Jean Paul Gaultier', 'Hombre', 'Diseñador', 'Eau de Toilette', 28,
        false, true, 'Disponible', 300, 300, true, 'assets/img/perfumes/jean-paul-gaultier-set-mini-le-male.jpg',
        'Set de 4 miniaturas de 7 ml de Jean Paul Gaultier para hombre.')
on conflict (slug) do nothing;

-- ---------- 2. Precios de tienda de la lista B ----------
-- Se activan los que estaban ocultos (Amber Oud Gold 100 ml, Odyssey Spectra, Precieux IV,
-- Maleka). El precio de consolidado no puede quedar por encima del de tienda: si lo estaba,
-- baja al de tienda; y si todavía era el precio de costo copiado (sin margen), sube al de tienda.
update perfumes p
set precio_tienda_regular = v.precio,
    descuento_tienda_porcentaje = 0,
    precio_consolidado_fijo = case
        when not p.margen_aplicado and p.precio_consolidado_fijo = p.precio_tienda_regular then v.precio
        else least(p.precio_consolidado_fijo, v.precio)
    end,
    margen_aplicado = true,
    activo = true,
    estado = 'Disponible'
from (values
    (41, 170), (50, 220), (28, 160), (18, 200), (43, 140), (457, 490), (187, 140), (233, 145),
    (178, 170), (125, 130), (117, 130), (21, 210), (191, 160), (274, 330), (30, 165), (91, 160),
    (110, 155), (218, 175), (73, 450)
) as v(id, precio)
where p.id = v.id;

-- ---------- 3. Decant ↔ perfume de tienda (botón "Abrir frasco" y "Llévalo completo") ----------
update perfumes d set id_perfume_tienda = v.tienda
from (values (373, 41), (469, 28), (464, 43), (499, 187), (471, 30), (474, 437), (492, 218)) as v(decant, tienda)
where d.id = v.decant;

-- ---------- 4. Lista A — frascos CERRADOS (conteo) ----------
select set_config('zadaca.motivo', 'Conteo', true);
select set_config('zadaca.nota', 'Conteo del 28/09/2026', true);

with lista(clave, cerrados) as (values
    ('90', 8),     -- Asad Bourbon
    ('1', 14),     -- 9PM
    ('181', 3),    -- Mandarin Sky 100 ml
    ('42', 2),     -- Odyssey Mega
    ('125', 3),    -- Sublime
    ('maison-alhambra-glacier-bold-100ml', 2),
    ('maison-alhambra-glacier-ultra-100ml', 1),
    ('219', 1),    -- Bade'e Al Oud blanco (Honor & Glory)
    ('176', 11),   -- Bade'e Al Oud rosado (Noble Blush)
    ('3', 9),      -- 9AM Dive
    ('447', 14),   -- Dunescape
    ('437', 6),    -- Qaed Al Fursan blanco (Unlimited)
    ('199', 2),    -- Hawas Fire
    ('255', 2),    -- Hawas Malibu
    ('442', 1),    -- Hawas Chrome
    ('203', 1),    -- Hawas Tropical
    ('53', 4),     -- Rome celeste (Rome Pour Homme)
    ('238', 1),    -- Rome Extradose (la lista lo trae 2 veces: ver nota al final)
    ('448', 1),    -- Nitro White
    ('89', 3),     -- Asad clásico
    ('91', 5),     -- Asad Elixir ("5 ABIERTO" en la lista: se toma como 5 cerrados)
    ('24', 1),     -- Club de Nuit Intense
    ('453', 3),    -- Stallion Uomo Intense
    ('40', 9),     -- Mandarin Sky 200 ml
    ('439', 1),    -- Hawas Lava Gold
    ('rasasi-hawas-exotic-100ml', 1),
    ('445', 3),    -- Yara pink
    ('129', 1),    -- Yara blanco (Moi)
    ('131', 1),    -- Yara amarillo (Tous)
    ('102', 2),    -- Hayati
    ('19', 15),    -- Amber Oud Gold Edition 120 ml
    ('41', 5),     -- Mandarin Sky Elixir ("5 sellados")
    ('6', 1)       -- 9PM Elixir
)
update inventario i
set stock_fisico = coalesce(l.cerrados, 0)
from perfumes p
left join lista l on l.clave = p.id::text or l.clave = p.slug
where i.id_producto = p.id and not p.es_decant
  and i.stock_fisico is distinct from coalesce(l.cerrados, 0);

-- ---------- 5. Lista A — frascos ABIERTOS (decants) ----------
with lista(clave, abiertos) as (values
    ('371', 1), ('351', 1), ('377', 1), ('465', 1), ('349', 1),
    ('maison-alhambra-glacier-bold-decant', 1), ('maison-alhambra-glacier-ultra-decant', 1), ('maison-alhambra-glacier-pour-homme-decant', 1),
    ('497', 1),   -- Bade'e Al Oud morado (Amethyst)
    ('498', 1),   -- Bade'e Al Oud negro (Oud for Glory)
    ('345', 1), ('496', 1), ('463', 1), ('337', 1), ('500', 1), ('509', 1),
    ('476', 1),   -- Tubbees Candy Apple
    ('474', 1),   -- Qaed Al Fursan blanco (Unlimited)
    ('473', 1),   -- Qaed negro (Qaed Al Fursan original)
    ('361', 1), ('490', 1),
    ('367', 2),   -- Bharara King: 2 abiertos
    ('513', 1), ('514', 1),   -- Pharaoh 1 y 2
    ('394', 1),   -- JPG "Le Male verde" (Le Beau Le Parfum)
    ('carolina-herrera-212-vip-black-decant', 1),
    ('paco-rabanne-1-million-elixir-decant', 1),
    ('529', 1),   -- YSL "líneas blancas" (Y EDP)
    ('yves-saint-laurent-myslf-decant', 1),
    ('389', 1),   -- Versace rojo (Eros Flame)
    ('355', 1), ('353', 1),   -- 9PM Night Out, 9PM Elixir
    ('521', 1), ('519', 1), ('520', 1),   -- Rayhaan Wolf, Aquatica, Tropical Vibe
    ('rasasi-hawas-fire-decant', 1), ('478', 1), ('487', 1), ('480', 1),
    ('363', 1), ('516', 1), ('515', 1),   -- Rome celeste, Extradose, Paradox
    ('375', 1),   -- Odyssey Aqua
    ('510', 1), ('369', 1), ('495', 1), ('493', 1),
    ('524', 1),   -- Game of Spades verde (Bid)
    ('379', 1),   -- Game of Spades No Limit
    ('475', 1), ('470', 1), ('518', 1),
    ('paco-rabanne-invictus-aqua-decant', 1),
    ('484', 1), ('rasasi-hawas-exotic-decant', 1), ('359', 1), ('357', 1),
    ('464', 1), ('466', 1), ('467', 1),   -- Odyssey Spectra, Limoni, Coffee
    ('339', 1), ('494', 1), ('341', 1), ('343', 1),   -- Yara, Moi, Tous, Candy
    ('afnan-supremacy-silver-decant', 1),
    ('507', 1), ('508', 1), ('504', 1), ('503', 1),   -- University (Art of Universe), Pisa, Hayati, Hayati Florence
    ('maison-alhambra-delilah-decant', 1),
    ('511', 1),   -- Al Haramain Gold Edition
    ('lattafa-angham-decant', 1),
    ('armaf-eter-arabian-sky-decant', 1),   -- "Arabian"
    ('501', 1), ('502', 1),   -- Fakhar Rose, Haya
    ('492', 1),   -- Khamrah Waha
    ('373', 1)    -- Mandarin Sky Elixir
)
update inventario i
set frascos_abiertos = coalesce(l.abiertos, 0)
from perfumes p
left join lista l on l.clave = p.id::text or l.clave = p.slug
where i.id_producto = p.id and p.es_decant and p.id_decant_grupo is null
  and i.frascos_abiertos is distinct from coalesce(l.abiertos, 0);

-- Un decant con frasco abierto se vende (Disponible); sin frasco abierto no se puede servir.
update perfumes p
set estado = case when coalesce(i.frascos_abiertos, 0) > 0 then 'Disponible' else 'Agotado' end
from inventario i
where i.id_producto = p.id and p.es_decant and p.id_decant_grupo is null
  and p.estado is distinct from (case when coalesce(i.frascos_abiertos, 0) > 0 then 'Disponible' else 'Agotado' end);

-- ---------- 6. Lista B — mercadería que se suma a la tienda ----------
select set_config('zadaca.motivo', 'Ingreso', true);
select set_config('zadaca.nota', 'Ingreso a tienda — lista con precios del 28/09/2026', true);

with lista(clave, unidades) as (values
    ('41', 20),    -- Mandarin Sky Elixir · S/ 170
    ('50', 38),    -- Bharara King · S/ 220
    ('28', 6),     -- Club de Nuit Urban Elixir · S/ 160
    ('18', 6),     -- Al Haramain Gold Edition 100 ml · S/ 200
    ('43', 3),     -- Odyssey Spectra · S/ 140
    ('457', 2),    -- Valentino (Uomo Born in Roma) · S/ 490
    ('187', 4),    -- The Kingdom · S/ 140
    ('233', 4),    -- Angham · S/ 145
    ('178', 4),    -- Liquid Brun · S/ 170
    ('125', 15),   -- Sublime · S/ 130
    ('117', 4),    -- Qaed Al Fursan · S/ 130
    ('21', 3),     -- Club de Nuit Precieux · S/ 210
    ('191', 3),    -- Yum Yum · S/ 160
    ('274', 2),    -- 212 VIP Black · S/ 330
    ('30', 2),     -- Club de Nuit Maleka · S/ 165
    ('91', 2),     -- Asad Elixir · S/ 160
    ('110', 6),    -- Jassor · S/ 155
    ('218', 2),    -- Khamrah Waha · S/ 175
    ('73', 1),     -- Le Beau · S/ 450
    ('jean-paul-gaultier-set-mini-le-male', 1)   -- Set mini Le Male · S/ 300
)
update inventario i
set stock_fisico = i.stock_fisico + l.unidades
from perfumes p
join lista l on l.clave = p.id::text or l.clave = p.slug
where i.id_producto = p.id and not p.es_decant;

commit;

-- ---------- Revisión ----------
select p.id, p.marca, p.nombre, p.mililitros as ml, i.stock_fisico as cerrados,
       p.precio_tienda_regular as precio_tienda, p.precio_consolidado_fijo as precio_consolidado, p.activo
from perfumes p join inventario i on i.id_producto = p.id
where not p.es_decant and i.stock_fisico > 0
order by p.marca, p.nombre;

select count(*) filter (where i.frascos_abiertos > 0) as decants_con_frasco_abierto,
       sum(i.frascos_abiertos) as frascos_abiertos
from perfumes p join inventario i on i.id_producto = p.id
where p.es_decant and p.id_decant_grupo is null;

-- ==========================================================
-- SUPUESTOS (confirmar; se corrigen en segundos desde el panel → Inventario):
--   · "Qaed Al Fursan" de la lista con precios = el original (negro). El blanco es el Unlimited.
--   · "Valentino" = Uomo Born in Roma (100 ml) · "Le beau" = Le Beau Le Parfum (125 ml)
--   · "ALHARAMAIN gold edition 100 ml" = Amber Oud Gold Edition 100 ml (id 18, se activó)
--   · "club de nuit preciux" = Club de Nuit Precieux IV (el único Precieux del catálogo)
--   · "set mini Le Male" (sin cantidad en la lista) = 1 unidad
--
-- PENDIENTE (no hay a qué perfume cargarlo sin confirmar cuál es — ver Inventario):
--   "Versace blue azul", "Dolce Gabbana", "Scandal rojo", "Scandal azul", "Antonio Banderas"
--   (1 abierto, 1 cerrado), "Beach Party", "Nitro plomo" (1 abierto, 1 cerrado), "Bharara King
--   loción" y la 2ª línea de "Rome Extradose" (1 abierto / 4 cerrados).
-- Siguen OCULTOS hasta que les pongas precio y los actives en Productos: Glacier Bold, Glacier
-- Ultra, Hawas Exotic, Hawas Fire, Hawas Tropical, Hayati (tienen frascos cerrados).
-- ==========================================================
