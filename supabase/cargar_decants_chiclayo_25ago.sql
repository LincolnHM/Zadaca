-- ==========================================================
-- CARGA DE DECANTS (Chiclayo, 25 ago 2026) — catálogo real que pasó el
-- dueño en su lista de precios ("DECANTS PUESTO EN CHICLAYO"): 22 perfumes,
-- cada uno en 5ml y 10ml, con su propio precio.
--
-- REQUISITO: correr primero supabase/migrations/0011_decants.sql (agrega
-- las columnas es_decant / id_decant_grupo) — sin eso este script falla.
--
-- Cada perfume se carga como 2 filas de "perfumes" (una por tamaño), igual
-- que cualquier producto del catálogo: precio y stock propios. La fila de
-- 5ml queda como "raíz" (id_decant_grupo null, es la que se ve en la
-- tarjeta de decants/) y la de 10ml apunta a ella con id_decant_grupo —
-- así en la ficha de producto salen las dos como pastillas de tamaño.
--
-- Marca: se tomó de los mismos perfumes ya cargados en el catálogo de
-- botella completa (ver supabase/actualizar_catalogo_vip_15ago.sql y
-- supabase/correccion_marca_y_duplicados.sql) para no inventar una marca
-- distinta a la que ya usas. Dos casos sin dato confiable, marcados 'Por
-- Definir' para que los revises:
--   - "Noble Bush": no encontré ese nombre exacto en tu catálogo (existe
--     "Noble Blush" de Lattafa, pero es un nombre distinto -- no asumí
--     que sea el mismo producto).
--   - "Rome Imagine": asumí Bharara por ir junto a "Rome Pour Homme" en tu
--     lista (Bharara sí tiene esa línea "Rome"), pero no tengo el dato
--     confirmado en el catálogo existente -- confírmalo si puedes.
--
-- Se corrigieron 2 typos evidentes del nombre para que no se vean mal en
-- una página pública: "Yara Pinck" -> "Yara Pink", "Odissey Aqua" ->
-- "Odyssey Aqua" (nombre real de la línea Armaf que ya usas en el resto
-- del catálogo).
--
-- Stock: tu lista de precios no trae cantidades, así que cada tamaño
-- queda con 10 unidades de stock por defecto (placeholder). AJUSTA el
-- stock real por tamaño desde el panel admin: Productos -> filtro "Solo
-- Decants" -> editar "Stock físico" de cada tarjeta y Guardar.
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase (staging primero si
-- tienes uno, ver supabase/OPERACIONES.md §2).
-- ==========================================================

-- 1. Eclaire (Lattafa) — Mujer
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-eclaire-decant-5ml', 'Eclaire', 'Lattafa', 'Mujer', 'Eau de Parfum', 5, 'Decant de Eclaire (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-eclaire-decant-10ml', 'Eclaire', 'Lattafa', 'Mujer', 'Eau de Parfum', 10, 'Decant de Eclaire (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 2. Yara Pink (Lattafa) — Mujer
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-yara-pink-decant-5ml', 'Yara Pink', 'Lattafa', 'Mujer', 'Eau de Parfum', 5, 'Decant de Yara Pink (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-yara-pink-decant-10ml', 'Yara Pink', 'Lattafa', 'Mujer', 'Eau de Parfum', 10, 'Decant de Yara Pink (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 3. Yara Tous (Lattafa) — Mujer
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-yara-tous-decant-5ml', 'Yara Tous', 'Lattafa', 'Mujer', 'Eau de Parfum', 5, 'Decant de Yara Tous (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-yara-tous-decant-10ml', 'Yara Tous', 'Lattafa', 'Mujer', 'Eau de Parfum', 10, 'Decant de Yara Tous (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 4. Yara Candy (Lattafa) — Mujer
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-yara-candy-decant-5ml', 'Yara Candy', 'Lattafa', 'Mujer', 'Eau de Parfum', 5, 'Decant de Yara Candy (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-yara-candy-decant-10ml', 'Yara Candy', 'Lattafa', 'Mujer', 'Eau de Parfum', 10, 'Decant de Yara Candy (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 5. Honor y Glory (Lattafa) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-honor-y-glory-decant-5ml', 'Honor y Glory', 'Lattafa', 'Unisex', 'Eau de Parfum', 5, 'Decant de Honor y Glory (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-honor-y-glory-decant-10ml', 'Honor y Glory', 'Lattafa', 'Unisex', 'Eau de Parfum', 10, 'Decant de Honor y Glory (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 6. Noble Bush (Por Definir — revisar marca) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('por-definir-noble-bush-decant-5ml', 'Noble Bush', 'Por Definir', 'Unisex', 'Eau de Parfum', 5, 'Decant de Noble Bush, fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'por-definir-noble-bush-decant-10ml', 'Noble Bush', 'Por Definir', 'Unisex', 'Eau de Parfum', 10, 'Decant de Noble Bush, fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 7. Sublime (Lattafa) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-sublime-decant-5ml', 'Sublime', 'Lattafa', 'Unisex', 'Eau de Parfum', 5, 'Decant de Sublime (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-sublime-decant-10ml', 'Sublime', 'Lattafa', 'Unisex', 'Eau de Parfum', 10, 'Decant de Sublime (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 8. 9PM Clásico (Afnan) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('afnan-9pm-clasico-decant-5ml', '9PM Clásico', 'Afnan', 'Unisex', 'Eau de Parfum', 5, 'Decant de 9PM Clásico (Afnan), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'afnan-9pm-clasico-decant-10ml', '9PM Clásico', 'Afnan', 'Unisex', 'Eau de Parfum', 10, 'Decant de 9PM Clásico (Afnan), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 9. 9PM Elixir (Afnan) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('afnan-9pm-elixir-decant-5ml', '9PM Elixir', 'Afnan', 'Unisex', 'Eau de Parfum', 5, 'Decant de 9PM Elixir (Afnan), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 30, 30, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'afnan-9pm-elixir-decant-10ml', '9PM Elixir', 'Afnan', 'Unisex', 'Eau de Parfum', 10, 'Decant de 9PM Elixir (Afnan), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 50, 50, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 10. 9PM Night Out (Afnan) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('afnan-9pm-night-out-decant-5ml', '9PM Night Out', 'Afnan', 'Unisex', 'Eau de Parfum', 5, 'Decant de 9PM Night Out (Afnan), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 30, 30, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'afnan-9pm-night-out-decant-10ml', '9PM Night Out', 'Afnan', 'Unisex', 'Eau de Parfum', 10, 'Decant de 9PM Night Out (Afnan), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 50, 50, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 11. Hawas Ice (Rasasi) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('rasasi-hawas-ice-decant-5ml', 'Hawas Ice', 'Rasasi', 'Unisex', 'Eau de Parfum', 5, 'Decant de Hawas Ice (Rasasi), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'rasasi-hawas-ice-decant-10ml', 'Hawas Ice', 'Rasasi', 'Unisex', 'Eau de Parfum', 10, 'Decant de Hawas Ice (Rasasi), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 12. Hawas Elixir (Rasasi) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('rasasi-hawas-elixir-decant-5ml', 'Hawas Elixir', 'Rasasi', 'Unisex', 'Eau de Parfum', 5, 'Decant de Hawas Elixir (Rasasi), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'rasasi-hawas-elixir-decant-10ml', 'Hawas Elixir', 'Rasasi', 'Unisex', 'Eau de Parfum', 10, 'Decant de Hawas Elixir (Rasasi), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 13. Khamra Qahwa (Lattafa) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-khamra-qahwa-decant-5ml', 'Khamra Qahwa', 'Lattafa', 'Unisex', 'Eau de Parfum', 5, 'Decant de Khamra Qahwa (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-khamra-qahwa-decant-10ml', 'Khamra Qahwa', 'Lattafa', 'Unisex', 'Eau de Parfum', 10, 'Decant de Khamra Qahwa (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 14. Rome Pour Homme EDP (Bharara) — Hombre
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('bharara-rome-pour-homme-edp-decant-5ml', 'Rome Pour Homme EDP', 'Bharara', 'Hombre', 'Eau de Parfum', 5, 'Decant de Rome Pour Homme EDP (Bharara), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'bharara-rome-pour-homme-edp-decant-10ml', 'Rome Pour Homme EDP', 'Bharara', 'Hombre', 'Eau de Parfum', 10, 'Decant de Rome Pour Homme EDP (Bharara), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 15. Rome Imagine (Bharara — revisar marca) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('bharara-rome-imagine-decant-5ml', 'Rome Imagine', 'Bharara', 'Unisex', 'Eau de Parfum', 5, 'Decant de Rome Imagine (Bharara), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'bharara-rome-imagine-decant-10ml', 'Rome Imagine', 'Bharara', 'Unisex', 'Eau de Parfum', 10, 'Decant de Rome Imagine (Bharara), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 16. Bharara King (Bharara) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('bharara-bharara-king-decant-5ml', 'Bharara King', 'Bharara', 'Unisex', 'Eau de Parfum', 5, 'Decant de Bharara King (Bharara), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 30, 30, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'bharara-bharara-king-decant-10ml', 'Bharara King', 'Bharara', 'Unisex', 'Eau de Parfum', 10, 'Decant de Bharara King (Bharara), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 50, 50, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 17. Asad Black (Lattafa) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-asad-black-decant-5ml', 'Asad Black', 'Lattafa', 'Unisex', 'Eau de Parfum', 5, 'Decant de Asad Black (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-asad-black-decant-10ml', 'Asad Black', 'Lattafa', 'Unisex', 'Eau de Parfum', 10, 'Decant de Asad Black (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 18. Asad Bourbon (Lattafa) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-asad-bourbon-decant-5ml', 'Asad Bourbon', 'Lattafa', 'Unisex', 'Eau de Parfum', 5, 'Decant de Asad Bourbon (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-asad-bourbon-decant-10ml', 'Asad Bourbon', 'Lattafa', 'Unisex', 'Eau de Parfum', 10, 'Decant de Asad Bourbon (Lattafa), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 19. Mandarin Sky Elixir (Armaf) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('armaf-mandarin-sky-elixir-decant-5ml', 'Mandarin Sky Elixir', 'Armaf', 'Unisex', 'Eau de Parfum', 5, 'Decant de Mandarin Sky Elixir (Armaf), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 30, 30, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'armaf-mandarin-sky-elixir-decant-10ml', 'Mandarin Sky Elixir', 'Armaf', 'Unisex', 'Eau de Parfum', 10, 'Decant de Mandarin Sky Elixir (Armaf), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 45, 45, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 20. Odyssey Aqua (Armaf) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('armaf-odyssey-aqua-decant-5ml', 'Odyssey Aqua', 'Armaf', 'Unisex', 'Eau de Parfum', 5, 'Decant de Odyssey Aqua (Armaf), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'armaf-odyssey-aqua-decant-10ml', 'Odyssey Aqua', 'Armaf', 'Unisex', 'Eau de Parfum', 10, 'Decant de Odyssey Aqua (Armaf), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 21. Mandarin Sky (Armaf) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('armaf-mandarin-sky-decant-5ml', 'Mandarin Sky', 'Armaf', 'Unisex', 'Eau de Parfum', 5, 'Decant de Mandarin Sky (Armaf), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 25, 25, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'armaf-mandarin-sky-decant-10ml', 'Mandarin Sky', 'Armaf', 'Unisex', 'Eau de Parfum', 10, 'Decant de Mandarin Sky (Armaf), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;

-- 22. Game Of Spades No Limit (Lattafa Pride) — Unisex
with raiz as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, activo)
  values ('lattafa-pride-game-of-spades-no-limit-decant-5ml', 'Game Of Spades No Limit', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 5, 'Decant de Game Of Spades No Limit (Lattafa Pride), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 40, 40, true, 'Árabe', true, true)
  returning id
), hijo as (
  insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, es_decant, id_decant_grupo, activo)
  select 'lattafa-pride-game-of-spades-no-limit-decant-10ml', 'Game Of Spades No Limit', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 10, 'Decant de Game Of Spades No Limit (Lattafa Pride), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 60, 60, true, 'Árabe', true, raiz.id, true
  from raiz
  returning id
)
update inventario set stock_fisico = 10
from (select id from raiz union all select id from hijo) t
where inventario.id_producto = t.id;
