-- ==========================================================
-- CARGA DE DECANTS — lote 2 (02 sep 2026): 11 perfumes nuevos, a partir de
-- las fotos reales que el dueño agregó en "perfumes decants/" (carpeta en
-- la raíz del repo, fuera de assets/ -- no se sube al sitio publicado; las
-- fotos ya se copiaron con nombre limpio a assets/img/perfumes/*-decant.*).
--
-- Cada perfume se carga como 2 filas de "perfumes" (5ml raíz + 10ml hijo),
-- mismo patrón que supabase/cargar_decants_chiclayo_25ago.sql. Género,
-- concentración y tipo de casa se copiaron del mismo perfume ya cargado en
-- el catálogo de botella completa (para no inventar un dato que ya existe
-- ahí) -- ver el id de referencia en cada bloque.
--
-- Precios: son PLACEHOLDER, no vinieron con una lista de precios real.
-- Estos 11 son casas de diseñador/nicho notablemente más caras que el lote
-- 1 (botella completa S/292–739 los 100ml, contra ~S/100-150 de las Lattafa
-- del lote 1), así que se usó un escalón más alto (S/30-45 el 5ml, S/50-70
-- el 10ml según la casa) en vez del escalón estándar de S/25/S/40. AJUSTA
-- el precio real desde el panel admin: Productos -> filtro "Solo Decants"
-- -> edita "Precio tienda"/"Precio consolidado" y Guardar (o usa el nuevo
-- botón "+ Tamaño" de cada tarjeta para agregarle más tamaños después).
--
-- Stock: placeholder de 10 unidades por tamaño, mismo motivo que el lote 1
-- -- AJUSTA el stock real desde el panel admin (Productos -> editar "Stock
-- físico" -> Guardar).
--
-- Quedaron 5 fotos de esa carpeta SIN cargar porque no hay ninguna
-- referencia confiable en el catálogo (marca, precio, concentración) para
-- copiar y no se quiso adivinar un dato de un perfume que no se vende hoy:
--   Aventus_Creed.png          -> la casa Creed no existe en el catálogo
--   Bleu_de_Chanel_Parfum.png  -> la casa Chanel no existe en el catálogo
--   Homme_Intense.png          -> nombre demasiado genérico (¿Dior Homme
--                                  Intense? ¿Prada L'Homme Intense?), sin
--                                  forma de confirmar cuál es sin el dato
--   Invictus_Parfum.png        -> el catálogo solo tiene "Invictus Victory
--                                  Elixir" (edición distinta), no el
--                                  Invictus original/base
--   The_Most_Wanted.png        -> el catálogo solo tiene "Most Want
--                                  Intense" (flanker), no la edición base
-- Si me pasas marca/precio de referencia de estos 5, los agrego en un
-- lote aparte.
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ==========================================================

-- 1. Acqua Di Gio Profondo (Giorgio Armani) — Hombre, Parfum, Diseñador (ref. id 295)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('giorgio-armani-acqua-di-gio-profondo-decant-5ml', 'Acqua Di Gio Profondo', 'Giorgio Armani', 'Hombre', 'Parfum', 5, 'Decant de Acqua Di Gio Profondo (Giorgio Armani), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 35, 35, true, 'Diseñador', 'assets/img/perfumes/giorgio-armani-acqua-di-gio-profondo-decant.webp', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'giorgio-armani-acqua-di-gio-profondo-decant-10ml', 'Acqua Di Gio Profondo', 'Giorgio Armani', 'Hombre', 'Parfum', 10, 'Decant de Acqua Di Gio Profondo (Giorgio Armani), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 55, 55, true, 'Diseñador', 'assets/img/perfumes/giorgio-armani-acqua-di-gio-profondo-decant.webp', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 2. Dior Sauvage (Dior) — Hombre, Eau de Parfum, Diseñador (ref. id 60)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('dior-sauvage-decant-5ml', 'Sauvage', 'Dior', 'Hombre', 'Eau de Parfum', 5, 'Decant de Sauvage (Dior), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/dior-sauvage-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'dior-sauvage-decant-10ml', 'Sauvage', 'Dior', 'Hombre', 'Eau de Parfum', 10, 'Decant de Sauvage (Dior), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/dior-sauvage-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 3. Eros Flame (Versace) — Hombre, Eau de Parfum, Diseñador (ref. id 330)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('versace-eros-flame-decant-5ml', 'Eros Flame', 'Versace', 'Hombre', 'Eau de Parfum', 5, 'Decant de Eros Flame (Versace), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 30, 30, true, 'Diseñador', 'assets/img/perfumes/versace-eros-flame-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'versace-eros-flame-decant-10ml', 'Eros Flame', 'Versace', 'Hombre', 'Eau de Parfum', 10, 'Decant de Eros Flame (Versace), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 50, 50, true, 'Diseñador', 'assets/img/perfumes/versace-eros-flame-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 4. Invictus Victory Elixir (Paco Rabanne) — Hombre, Elixir de Parfum, Diseñador (ref. id 153)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('paco-rabanne-invictus-victory-elixir-decant-5ml', 'Invictus Victory Elixir', 'Paco Rabanne', 'Hombre', 'Elixir de Parfum', 5, 'Decant de Invictus Victory Elixir (Paco Rabanne), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 35, 35, true, 'Diseñador', 'assets/img/perfumes/paco-rabanne-invictus-victory-elixir-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'paco-rabanne-invictus-victory-elixir-decant-10ml', 'Invictus Victory Elixir', 'Paco Rabanne', 'Hombre', 'Elixir de Parfum', 10, 'Decant de Invictus Victory Elixir (Paco Rabanne), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 55, 55, true, 'Diseñador', 'assets/img/perfumes/paco-rabanne-invictus-victory-elixir-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 5. Le Beau Le Parfum (Jean Paul Gaultier) — Hombre, Parfum, Diseñador (ref. id 73)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('jean-paul-gaultier-le-beau-le-parfum-decant-5ml', 'Le Beau Le Parfum', 'Jean Paul Gaultier', 'Hombre', 'Parfum', 5, 'Decant de Le Beau Le Parfum (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-beau-le-parfum-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'jean-paul-gaultier-le-beau-le-parfum-decant-10ml', 'Le Beau Le Parfum', 'Jean Paul Gaultier', 'Hombre', 'Parfum', 10, 'Decant de Le Beau Le Parfum (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-beau-le-parfum-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 6. Le Male Elixir (Jean Paul Gaultier) — Hombre, Elixir de Parfum, Diseñador (ref. id 305)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('jean-paul-gaultier-le-male-elixir-decant-5ml', 'Le Male Elixir', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 5, 'Decant de Le Male Elixir (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 35, 35, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'jean-paul-gaultier-le-male-elixir-decant-10ml', 'Le Male Elixir', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 10, 'Decant de Le Male Elixir (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 55, 55, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 7. Le Male Le Parfum Intense (Jean Paul Gaultier) — Hombre, Eau de Parfum, Diseñador (ref. id 304)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('jean-paul-gaultier-le-male-le-parfum-decant-5ml', 'Le Male Le Parfum Intense', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 5, 'Decant de Le Male Le Parfum Intense (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 35, 35, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-male-le-parfum-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'jean-paul-gaultier-le-male-le-parfum-decant-10ml', 'Le Male Le Parfum Intense', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 10, 'Decant de Le Male Le Parfum Intense (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 55, 55, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-male-le-parfum-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 8. Valentino Uomo Born In Roma (Valentino) — Hombre, Eau de Parfum, Diseñador (ref. id 264)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('valentino-born-in-roma-decant-5ml', 'Uomo Born In Roma', 'Valentino', 'Hombre', 'Eau de Parfum', 5, 'Decant de Uomo Born In Roma (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/valentino-born-in-roma-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'valentino-born-in-roma-decant-10ml', 'Uomo Born In Roma', 'Valentino', 'Hombre', 'Eau de Parfum', 10, 'Decant de Uomo Born In Roma (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/valentino-born-in-roma-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 9. Erba Pura (Xerjoff) — Unisex, Eau de Parfum, Nicho (ref. id 212)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('xerjoff-erba-pura-decant-5ml', 'Erba Pura', 'Xerjoff', 'Unisex', 'Eau de Parfum', 5, 'Decant de Erba Pura (Xerjoff), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 45, 45, true, 'Nicho', 'assets/img/perfumes/xerjoff-erba-pura-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'xerjoff-erba-pura-decant-10ml', 'Erba Pura', 'Xerjoff', 'Unisex', 'Eau de Parfum', 10, 'Decant de Erba Pura (Xerjoff), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 70, 70, true, 'Nicho', 'assets/img/perfumes/xerjoff-erba-pura-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 10. Valentino Uomo Born In Roma Extradosis (Valentino) — Hombre, Extrait de Parfum, Diseñador (ref. id 206)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('valentino-born-in-roma-extradosis-decant-5ml', 'Uomo Born In Roma Extradosis', 'Valentino', 'Hombre', 'Extrait de Parfum', 5, 'Decant de Uomo Born In Roma Extradosis (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/valentino-born-in-roma-extradosis-decant.webp', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'valentino-born-in-roma-extradosis-decant-10ml', 'Uomo Born In Roma Extradosis', 'Valentino', 'Hombre', 'Extrait de Parfum', 10, 'Decant de Uomo Born In Roma Extradosis (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/valentino-born-in-roma-extradosis-decant.webp', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 11. Valentino Born Intense (Valentino) — Unisex, Eau de Parfum, Diseñador (ref. id 205)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('valentino-born-intense-decant-5ml', 'Born Intense', 'Valentino', 'Unisex', 'Eau de Parfum', 5, 'Decant de Born Intense (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/valentino-born-intense-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'valentino-born-intense-decant-10ml', 'Born Intense', 'Valentino', 'Unisex', 'Eau de Parfum', 10, 'Decant de Born Intense (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/valentino-born-intense-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;
