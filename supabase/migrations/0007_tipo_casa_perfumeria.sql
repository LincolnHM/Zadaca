-- ==========================================================
-- MIGRACIÓN 0007 — Filtro por tipo de casa de perfumería (Árabe / Diseñador / Nicho)
--
-- El catálogo mezcla tres tipos de casa muy distintos (perfumería árabe
-- económica tipo Lattafa, diseñador de moda tipo Dior/Versace, y nicho
-- artesanal tipo Xerjoff/Montale) sin ninguna forma de filtrar por eso en
-- el catálogo público. Se agrega la columna tipo_casa y se clasifican las
-- 217 filas del seed real según su marca.
--
-- La clasificación por marca es una heurística editorial, no un dato
-- técnico del perfume — algunas marcas son discutibles (ej. Bharara es una
-- marca de Miami, no árabe en sentido estricto, pero se vende y percibe
-- en este catálogo junto a Lattafa/Armaf por su estilo oud/opulento). Si
-- no coincide con cómo Maison Zadaca categoriza su propio catálogo,
-- corrígela libremente desde el panel admin (Productos → editar → Tipo de
-- Casa) fila por fila, o ajusta los UPDATE de abajo por marca.
-- ==========================================================

alter table perfumes add column tipo_casa varchar(20) check (tipo_casa in ('Árabe', 'Diseñador', 'Nicho'));
create index idx_perfumes_tipo_casa on perfumes(tipo_casa);

-- ---------- Árabe: casas de Medio Oriente / estilo árabe-oud económico ----------
update perfumes set tipo_casa = 'Árabe'
where marca in ('Afnan', 'Al Haramain', 'Armaf', 'Bharara', 'Fragrance World', 'French Avenue', 'Lattafa', 'Lattafa Pride', 'Paris Corner', 'Rasasi');

-- ---------- Diseñador: casas de moda ----------
update perfumes set tipo_casa = 'Diseñador'
where marca in ('Azzaro', 'Burberry', 'Carolina Herrera', 'Chanel', 'Dior', 'Dolce & Gabbana', 'Emporio Armani', 'Giorgio Armani', 'Givenchy', 'Jean Paul Gaultier', 'Nautica', 'Paco Rabanne', 'Valentino', 'Versace', 'Yves Saint Laurent');

-- ---------- Nicho: casas artesanales / de autor ----------
update perfumes set tipo_casa = 'Nicho'
where marca in ('Mancera', 'Montale', 'Xerjoff');

-- Las filas con marca 'Por Definir' (34 en el seed real) quedan sin tipo_casa a propósito,
-- igual que quedan sin clasificar en marca — corrígelas junto con la marca cuando se sepa
-- cuál es cuál (ver nota en seed.sql).
