-- ==========================================================
-- CARGA DE DECANTS — lote 3 (02 sep 2026): las 5 fotos de "perfumes
-- decants/" que el lote 2 había dejado sin cargar por no tener ninguna
-- referencia en el catálogo. Se identificó la marca exacta mirando el
-- frasco en cada foto (todas traen el nombre bien visible), así que ya no
-- hace falta un id de referencia del catálogo -- estos 5 perfumes son
-- nuevos, no existían en ninguna presentación todavía.
--
-- Mismo patrón que los lotes 1 y 2: 2 filas por perfume (5ml raíz + 10ml
-- hijo). Precios PLACEHOLDER, calibrados contra perfumes de esa misma
-- marca (o de nivel similar) ya cargados en el catálogo -- AJUSTA el
-- precio real desde el panel admin (Productos -> filtro "Solo Decants" ->
-- edita "Precio tienda"/"Precio consolidado" y Guardar, o "+ Tamaño" para
-- agregarle más tamaños después). Stock: placeholder de 10 unidades por
-- tamaño, mismo motivo -- AJÚSTALO también.
--
-- Aventus (Creed) va con tipo_casa 'Nicho' y un precio bastante más alto
-- que el resto -- Creed es una casa artesanal de lujo, no comparable en
-- precio a las casas de diseñador del resto del catálogo (Aventus se
-- vende usualmente 2-3x más caro que un Dior o Chanel en el mercado
-- peruano). Revísalo con cuidado antes de publicarlo.
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ==========================================================

-- 1. Dior Homme Intense (Dior) — Hombre, Eau de Parfum, Diseñador
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('dior-homme-intense-decant-5ml', 'Homme Intense', 'Dior', 'Hombre', 'Eau de Parfum', 5, 'Decant de Homme Intense (Dior), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/dior-homme-intense-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'dior-homme-intense-decant-10ml', 'Homme Intense', 'Dior', 'Hombre', 'Eau de Parfum', 10, 'Decant de Homme Intense (Dior), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/dior-homme-intense-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 2. Bleu De Chanel (Chanel) — Hombre, Eau de Parfum, Diseñador
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('chanel-bleu-de-chanel-decant-5ml', 'Bleu De Chanel', 'Chanel', 'Hombre', 'Eau de Parfum', 5, 'Decant de Bleu De Chanel (Chanel), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Diseñador', 'assets/img/perfumes/chanel-bleu-de-chanel-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'chanel-bleu-de-chanel-decant-10ml', 'Bleu De Chanel', 'Chanel', 'Hombre', 'Eau de Parfum', 10, 'Decant de Bleu De Chanel (Chanel), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Diseñador', 'assets/img/perfumes/chanel-bleu-de-chanel-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 3. Invictus Parfum (Paco Rabanne) — Hombre, Parfum, Diseñador
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('paco-rabanne-invictus-parfum-decant-5ml', 'Invictus Parfum', 'Paco Rabanne', 'Hombre', 'Parfum', 5, 'Decant de Invictus Parfum (Paco Rabanne), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 35, 35, true, 'Diseñador', 'assets/img/perfumes/paco-rabanne-invictus-parfum-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'paco-rabanne-invictus-parfum-decant-10ml', 'Invictus Parfum', 'Paco Rabanne', 'Hombre', 'Parfum', 10, 'Decant de Invictus Parfum (Paco Rabanne), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 55, 55, true, 'Diseñador', 'assets/img/perfumes/paco-rabanne-invictus-parfum-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 4. The Most Wanted (Azzaro) — Hombre, Eau de Parfum, Diseñador
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('azzaro-the-most-wanted-decant-5ml', 'The Most Wanted', 'Azzaro', 'Hombre', 'Eau de Parfum', 5, 'Decant de The Most Wanted (Azzaro), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 30, 30, true, 'Diseñador', 'assets/img/perfumes/azzaro-the-most-wanted-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'azzaro-the-most-wanted-decant-10ml', 'The Most Wanted', 'Azzaro', 'Hombre', 'Eau de Parfum', 10, 'Decant de The Most Wanted (Azzaro), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 50, 50, true, 'Diseñador', 'assets/img/perfumes/azzaro-the-most-wanted-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 5. Aventus (Creed) — Hombre, Eau de Parfum, Nicho (fragancia mucho más cara que el resto -- revisa el precio con más cuidado)
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, es_nuevo, activo)
  values ('creed-aventus-decant-5ml', 'Aventus', 'Creed', 'Hombre', 'Eau de Parfum', 5, 'Decant de Aventus (Creed), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Nicho', 'assets/img/perfumes/creed-aventus-decant.png', true, true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
  select 'creed-aventus-decant-10ml', 'Aventus', 'Creed', 'Hombre', 'Eau de Parfum', 10, 'Decant de Aventus (Creed), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 90, 90, true, 'Nicho', 'assets/img/perfumes/creed-aventus-decant.png', true, raiz.id, true, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;
