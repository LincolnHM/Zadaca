-- ==========================================================
-- Precio real (reemplaza el placeholder) + tamaño de 3ml para los 16
-- decants de diseñador/nicho de los lotes 2 y 3 (02 sep 2026).
--
-- Precios indicados por el dueño:
--   Diseñador (14 perfumes): 3ml S/20, 5ml S/30, 10ml S/60
--   Nicho (2 perfumes -- Creed Aventus y Erba Pura): 3ml S/29, 5ml S/45, 10ml S/89
--
-- Precio consolidado = mismo que precio tienda (igual que el resto de los
-- decants del catálogo -- no participan del flujo de importación por
-- campaña, ver notas en los scripts de carga anteriores).
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ==========================================================

/* ---------- 1. Actualiza el precio de los 5ml (raíz) y 10ml (hijo) que ya existían ---------- */

-- Diseñador: 5ml -> S/30
update perfumes set precio_tienda_regular = 30, precio_consolidado_fijo = 30
where id in (385, 387, 389, 391, 393, 395, 397, 399, 403, 405, 407, 409, 411, 413);

-- Diseñador: 10ml -> S/60
update perfumes set precio_tienda_regular = 60, precio_consolidado_fijo = 60
where id in (386, 388, 390, 392, 394, 396, 398, 400, 404, 406, 408, 410, 412, 414);

-- Nicho (Erba Pura, Aventus): 5ml -> S/45
update perfumes set precio_tienda_regular = 45, precio_consolidado_fijo = 45
where id in (401, 415);

-- Nicho (Erba Pura, Aventus): 10ml -> S/89
update perfumes set precio_tienda_regular = 89, precio_consolidado_fijo = 89
where id in (402, 416);

/* ---------- 2. Agrega el tamaño de 3ml a cada uno de los 16, apuntando a su raíz ---------- */

-- Diseñador (S/20 el 3ml)
insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
values
  ('giorgio-armani-acqua-di-gio-profondo-decant-3ml', 'Acqua Di Gio Profondo', 'Giorgio Armani', 'Hombre', 'Parfum', 3, 'Decant de Acqua Di Gio Profondo (Giorgio Armani), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/giorgio-armani-acqua-di-gio-profondo-decant.webp', true, 385, true, true),
  ('dior-sauvage-decant-3ml', 'Sauvage', 'Dior', 'Hombre', 'Eau de Parfum', 3, 'Decant de Sauvage (Dior), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/dior-sauvage-decant.png', true, 387, true, true),
  ('versace-eros-flame-decant-3ml', 'Eros Flame', 'Versace', 'Hombre', 'Eau de Parfum', 3, 'Decant de Eros Flame (Versace), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/versace-eros-flame-decant.png', true, 389, true, true),
  ('paco-rabanne-invictus-victory-elixir-decant-3ml', 'Invictus Victory Elixir', 'Paco Rabanne', 'Hombre', 'Elixir de Parfum', 3, 'Decant de Invictus Victory Elixir (Paco Rabanne), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/paco-rabanne-invictus-victory-elixir-decant.png', true, 391, true, true),
  ('jean-paul-gaultier-le-beau-le-parfum-decant-3ml', 'Le Beau Le Parfum', 'Jean Paul Gaultier', 'Hombre', 'Parfum', 3, 'Decant de Le Beau Le Parfum (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-beau-le-parfum-decant.png', true, 393, true, true),
  ('jean-paul-gaultier-le-male-elixir-decant-3ml', 'Le Male Elixir', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 3, 'Decant de Le Male Elixir (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-decant.png', true, 395, true, true),
  ('jean-paul-gaultier-le-male-le-parfum-decant-3ml', 'Le Male Le Parfum Intense', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 3, 'Decant de Le Male Le Parfum Intense (Jean Paul Gaultier), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/jean-paul-gaultier-le-male-le-parfum-decant.png', true, 397, true, true),
  ('valentino-born-in-roma-decant-3ml', 'Uomo Born In Roma', 'Valentino', 'Hombre', 'Eau de Parfum', 3, 'Decant de Uomo Born In Roma (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/valentino-born-in-roma-decant.png', true, 399, true, true),
  ('valentino-born-in-roma-extradosis-decant-3ml', 'Uomo Born In Roma Extradosis', 'Valentino', 'Hombre', 'Extrait de Parfum', 3, 'Decant de Uomo Born In Roma Extradosis (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/valentino-born-in-roma-extradosis-decant.webp', true, 403, true, true),
  ('valentino-born-intense-decant-3ml', 'Born Intense', 'Valentino', 'Unisex', 'Eau de Parfum', 3, 'Decant de Born Intense (Valentino), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/valentino-born-intense-decant.png', true, 405, true, true),
  ('dior-homme-intense-decant-3ml', 'Homme Intense', 'Dior', 'Hombre', 'Eau de Parfum', 3, 'Decant de Homme Intense (Dior), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/dior-homme-intense-decant.png', true, 407, true, true),
  ('chanel-bleu-de-chanel-decant-3ml', 'Bleu De Chanel', 'Chanel', 'Hombre', 'Eau de Parfum', 3, 'Decant de Bleu De Chanel (Chanel), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/chanel-bleu-de-chanel-decant.png', true, 409, true, true),
  ('paco-rabanne-invictus-parfum-decant-3ml', 'Invictus Parfum', 'Paco Rabanne', 'Hombre', 'Parfum', 3, 'Decant de Invictus Parfum (Paco Rabanne), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/paco-rabanne-invictus-parfum-decant.png', true, 411, true, true),
  ('azzaro-the-most-wanted-decant-3ml', 'The Most Wanted', 'Azzaro', 'Hombre', 'Eau de Parfum', 3, 'Decant de The Most Wanted (Azzaro), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 20, 20, true, 'Diseñador', 'assets/img/perfumes/azzaro-the-most-wanted-decant.png', true, 413, true, true);

-- Nicho (S/29 el 3ml)
insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, tipo_casa, imagen_url, es_decant, id_decant_grupo, es_nuevo, activo)
values
  ('xerjoff-erba-pura-decant-3ml', 'Erba Pura', 'Xerjoff', 'Unisex', 'Eau de Parfum', 3, 'Decant de Erba Pura (Xerjoff), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 29, 29, true, 'Nicho', 'assets/img/perfumes/xerjoff-erba-pura-decant.png', true, 401, true, true),
  ('creed-aventus-decant-3ml', 'Aventus', 'Creed', 'Hombre', 'Eau de Parfum', 3, 'Decant de Aventus (Creed), fraccionado del frasco original — 100% original, ideal para probar antes de llevar el frasco completo.', 29, 29, true, 'Nicho', 'assets/img/perfumes/creed-aventus-decant.png', true, 415, true, true);

/* ---------- 3. Da stock a los 16 tamaños de 3ml recién creados ---------- */
update inventario set stock_fisico = 10
where id_producto in (select id from perfumes where slug like '%-decant-3ml' and id_decant_grupo in (
  385, 387, 389, 391, 393, 395, 397, 399, 403, 405, 407, 409, 411, 413, 401, 415
));
