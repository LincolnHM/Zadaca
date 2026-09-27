-- ==========================================================
-- CARGA DEL STOCK REAL — conteo físico de septiembre 2026
--
-- Requiere haber corrido antes migrations/0018_inventario_contabilidad_pedidos.sql.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a correr: siempre
-- deja el inventario exactamente como está en esta lista.
--
-- Cómo se lee la lista del negocio:
--   "ASAD BOURBON - 1 ABIERTO - 8 CERRADOS"
--     1 abierto  = frasco en uso para decantar → inventario.frascos_abiertos del DECANT
--     8 cerrados = frascos sellados a la venta → inventario.stock_fisico del perfume de TIENDA
--
-- El stock que tenía la base hasta hoy (9, 10, 11 ... 27 por producto) era de ejemplo, no real:
-- el paso 1 lo pone todo en 0 y los pasos siguientes cargan solo lo que está en la lista.
-- Todo lo que no figura queda en 0 (tienda) y sus decants como Agotado.
-- ==========================================================

begin;

-- 1) Borrar el stock de ejemplo (sin ensuciar el kardex con cientos de "ajustes a 0").
select set_config('zadaca.sin_log', '1', true);
update inventario set stock_fisico = 0, frascos_abiertos = 0
where stock_fisico <> 0 or frascos_abiertos <> 0;
select set_config('zadaca.sin_log', '', true);

-- Desde acá, cada cambio queda en el kardex como "Conteo".
select set_config('zadaca.motivo', 'Conteo', true);
select set_config('zadaca.nota', 'Carga inicial: conteo físico de septiembre 2026', true);

-- 2) Vincular cada decant con el perfume entero de tienda del que salen sus frascos
--    (lo usa el botón "Abrir frasco" del Inventario). (id decant, id perfume de tienda)
update perfumes p set id_perfume_tienda = v.tienda
from (values
    (371, 90),   -- Asad Bourbon
    (351, 1),    -- 9PM (frasco de 100 ml)
    (377, 181),  -- Mandarin Sky 100 ml
    (465, 42),   -- Odyssey Mega (el decant figura como "Odyssey Mfga")
    (349, 125),  -- Sublime
    (345, 219),  -- Bade'e Al Oud blanco = Honor & Glory
    (496, 176),  -- Bade'e Al Oud rosado = Noble Blush
    (463, 3),    -- 9AM → 9AM Dive
    (337, 95),   -- Eclaire
    (500, 235),  -- Eclaire Pistacho
    (509, 447),  -- Dunascape
    (473, 117),  -- Qaed Al Fursan
    (361, 104),  -- Khamrah Qahwa
    (490, 103),  -- Khamrah clásico
    (367, 50),   -- Bharara King
    (513, 54),   -- Pharaoh (1)            (perfume de tienda oculto)
    (514, 450),  -- Pharaoh Ramesses II
    (394, 73),   -- JPG "Le Male verde" → Le Beau Le Parfum
    (529, 460),  -- YSL "líneas blancas" → Y Eau de Parfum
    (389, 330),  -- Versace rojo → Eros Flame
    (355, 9),    -- 9PM Night Out
    (353, 6),    -- 9PM Elixir
    (520, 220),  -- Rayhaan Tropical Vibe
    (478, 255),  -- Hawas Malibu
    (487, 442),  -- Hawas Chrome
    (480, 203),  -- Hawas Tropical         (perfume de tienda oculto)
    (363, 53),   -- Rome "celeste" → Rome Pour Homme
    (516, 238),  -- Rome Extradose
    (515, 452),  -- Rome Paradox
    (510, 448),  -- Nitro White
    (369, 89),   -- Asad clásico
    (495, 91),   -- Asad Elixir
    (493, 128),  -- Yara Elixir
    (475, 119),  -- Qaed Untamed
    (470, 24),   -- Club de Nuit Intense
    (518, 453),  -- Stallion Uomo → Uomo Intense
    (484, 439),  -- Hawas Lava Gold
    (359, 198),  -- Hawas Elixir
    (357, 200),  -- Hawas Ice
    (466, 39),   -- Odyssey Limoni
    (339, 445),  -- Yara Pink
    (494, 129),  -- Yara blanco = Yara Moi
    (341, 131),  -- Yara amarillo = Yara Tous
    (343, 127),  -- Yara Candy
    (507, 134),  -- "University" → Art of Universe (perfume de tienda oculto)
    (508, 147),  -- Pisa                   (perfume de tienda oculto)
    (504, 102),  -- Hayati                 (perfume de tienda oculto)
    (503, 446),  -- Hayaati Florence
    (511, 19),   -- Al Haramain Amber Gold Edition 120 ml
    (501, 232),  -- Fakhar Rose
    (502, 100)   -- Haya                   (perfume de tienda oculto)
) as v(decant, tienda)
where p.id = v.decant;

-- 2b) El resto de decants se vincula solo si hay un perfume de tienda activo con la misma
--     marca y el mismo nombre (ej. Y Le Parfum). Los que no calcen se vinculan a mano desde
--     Inventario → Vincular.
update perfumes d set id_perfume_tienda = (
    select min(t.id) from perfumes t
    where not t.es_decant and t.activo
      and lower(t.marca) = lower(d.marca)
      and lower(regexp_replace(trim(t.nombre), '\s+', ' ', 'g')) = lower(regexp_replace(trim(d.nombre), '\s+', ' ', 'g'))
)
where d.es_decant and d.id_decant_grupo is null and d.id_perfume_tienda is null
  and exists (
    select 1 from perfumes t
    where not t.es_decant and t.activo
      and lower(t.marca) = lower(d.marca)
      and lower(regexp_replace(trim(t.nombre), '\s+', ' ', 'g')) = lower(regexp_replace(trim(d.nombre), '\s+', ' ', 'g'))
  );

-- 3) Frascos CERRADOS (stock de tienda). (id perfume de tienda, cantidad)
update inventario i set stock_fisico = v.cerrados
from (values
    (90, 8),    -- Asad Bourbon
    (1, 14),    -- 9PM 100 ml
    (181, 3),   -- Mandarin Sky 100 ml
    (40, 8),    -- Mandarin Sky 200 ml
    (42, 2),    -- Odyssey Mega
    (125, 3),   -- Sublime
    (219, 1),   -- Bade'e Al Oud blanco (Honor & Glory)
    (176, 11),  -- Bade'e Al Oud rosado (Noble Blush)
    (3, 9),     -- 9AM Dive
    (447, 10),  -- Dunascape
    (117, 4),   -- Qaed Al Fursan
    (6, 1),     -- 9PM Elixir
    (255, 2),   -- Hawas Malibu
    (442, 1),   -- Hawas Chrome
    (203, 1),   -- Hawas Tropical          (oculto en el catálogo)
    (199, 2),   -- Hawas Fire              (oculto en el catálogo, sin decant cargado)
    (53, 4),    -- Rome "celeste" (Rome Pour Homme)
    (238, 1),   -- Rome Extradose          (ver nota al final: la lista lo trae 2 veces)
    (448, 1),   -- Nitro White
    (89, 3),    -- Asad clásico
    (91, 5),    -- Asad Elixir (la lista dice "5 ABIERTO": se tomó como 5 cerrados)
    (24, 1),    -- Club de Nuit Intense
    (453, 3),   -- Stallion Uomo (Uomo Intense)
    (439, 1),   -- Hawas Lava Gold
    (445, 3),   -- Yara Pink
    (129, 1),   -- Yara Moi (blanco)
    (131, 1),   -- Yara Tous (amarillo)
    (102, 2),   -- Hayati                  (oculto en el catálogo)
    (19, 15)    -- Al Haramain Amber Gold Edition 120 ml
) as v(id, cerrados)
where i.id_producto = v.id;

-- 4) Frascos ABIERTOS (en uso para decants). (id decant, cantidad)
update inventario i set frascos_abiertos = v.abiertos
from (values
    (371, 1), (351, 1), (377, 1), (465, 1), (349, 1),
    (497, 1),  -- Bade'e Al Oud morado = Amethyst
    (498, 1),  -- Bade'e Al Oud negro = Oud for Glory
    (345, 1), (496, 1), (463, 1), (337, 1), (500, 1), (509, 1),
    (476, 1),  -- Tubbes Candy Apple
    (473, 1), (361, 1), (490, 1),
    (367, 2),  -- Bharara King: 2 abiertos
    (513, 1), (514, 1), (394, 1), (529, 1), (389, 1), (355, 1), (353, 1),
    (521, 1),  -- Rayhaan Wolf
    (519, 1),  -- Rayhaan Aquatica
    (520, 1), (478, 1), (487, 1), (480, 1), (363, 1), (516, 1), (515, 1),
    (375, 1),  -- Odyssey Aqua
    (510, 1), (369, 1), (495, 1), (493, 1),
    (379, 1),  -- Game of Spades No Limit
    (475, 1), (470, 1), (518, 1), (484, 1), (359, 1), (357, 1),
    (464, 1),  -- Odyssey Spectra
    (466, 1),
    (467, 1),  -- Odyssey Coffee
    (339, 1), (494, 1), (341, 1), (343, 1), (507, 1),
    (508, 1),  -- Pisa
    (504, 1), (503, 1), (511, 1), (501, 1),
    (502, 1)   -- Haya
) as v(id, abiertos)
where i.id_producto = v.id;

-- 5) En la tienda, un decant con frasco abierto se vende (Disponible) y uno sin frasco abierto
--    no se puede servir (Agotado).
update perfumes p
set estado = case when coalesce(i.frascos_abiertos, 0) > 0 then 'Disponible' else 'Agotado' end
from inventario i
where i.id_producto = p.id and p.es_decant and p.id_decant_grupo is null;

commit;

-- 6) Revisión: todo lo que quedó con stock.
select p.id,
       case when p.es_decant then 'Decant' else 'Tienda' end as tipo,
       p.marca, p.nombre, p.mililitros as ml,
       i.stock_fisico as cerrados, i.frascos_abiertos as abiertos,
       p.activo
from perfumes p
join inventario i on i.id_producto = p.id
where i.stock_fisico > 0 or i.frascos_abiertos > 0
order by p.marca, p.nombre;

-- ==========================================================
-- PENDIENTE (no se pudo cargar solo — revisar en el panel → Inventario):
--
-- a) Sin producto en el catálogo (crearlo en Productos → "+ Agregar Decant" y/o
--    "+ Agregar Perfume", y luego cargar su stock en Inventario):
--      Glacier Bold (1 abierto, 2 cerrados) · Glacier Ultra (1 abierto, 1 cerrado)
--      Glacier Pour Homme (1 abierto) · Bharara King loción (1 abierto)
--      One Million Elixir (1 abierto) · YSL MYSLF (1 abierto) · Invictus Aqua (1 abierto)
--      Scandal rojo (1 abierto) · Scandal azul (1 abierto) · Antonio Banderas (1 abierto, 1 cerrado)
--      Hawas Exotic (1 abierto, 1 cerrado) · Supremacy plomo (1 abierto) · Beach Party (1 abierto)
--      Nitro plomo (1 abierto, 1 cerrado) · "Arabian" (1 abierto)
--
-- b) Tienen perfume de tienda pero no decant cargado (crear el decant y vincularlo):
--      212 VIP Black (1 abierto) · Delilah (1 abierto) · Angham (1 abierto)
--      Hawas Fire (1 abierto; sus 2 cerrados ya se cargaron arriba)
--
-- c) No se pudo saber cuál es — confirmar y cargar a mano:
--      "Versace blue azul" (¿Eros EDT? ¿Dylan Blue? ¿Blue Jeans?)
--      "Dolce Gabbana" (¿Light Blue mujer o Light Blue Pour Homme?)
--      "Game of verde" (¿cuál Game of Spades?) · "Qaed negro" (¿Qaed Ultimati?)
--      "ROME EXTRADOSE" aparece DOS veces (1 abierto/1 cerrado y 1 abierto/4 cerrados):
--      se cargó solo la primera; si la segunda es otro Rome, cárgalo en ese perfume.
--
-- d) Supuestos que conviene confirmar (ya cargados así):
--      9PM = frasco de 100 ml · 9AM = 9AM Dive · Bade'e blanco = Honor & Glory ·
--      JPG "Le Male verde" = Le Beau Le Parfum · YSL "líneas blancas" = Y EDP ·
--      Rome "celeste" = Rome Pour Homme · "University" = Art of Universe ·
--      Stallion Uomo = Uomo Intense · Asad Elixir "5 abierto" = 5 cerrados.
--
-- e) Hawas Tropical, Hawas Fire y Hayati tienen frascos cerrados pero su perfume de tienda
--    está OCULTO (activo = false): actívalo en Productos si quieres venderlo en la web.
--
-- f) Los ml que quedan en cada frasco abierto no venían en la lista: cárgalos en
--    Inventario (columna "ml") si quieres que cada venta de decant los vaya descontando.
-- ==========================================================
