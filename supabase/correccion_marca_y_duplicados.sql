-- ==========================================================
-- CORRECCION DE MARCA + LIMPIEZA DE DUPLICADOS (15 ago 2026, parte 3)
--
-- 1) MARCA: revisando "Por Definir" y otras filas contra la linea de
--    producto real. Encontrados con alta confianza:
--    - 'BAD BOY LE Parfum FOR MEN' estaba con marca Chanel -- Bad Boy es
--      de Carolina Herrera, no de Chanel.
--    - 'Chect Mate King Mujer' -- al buscarle foto (lote 4 de imágenes)
--      se confirmó contra la página del producto que NO es una variante
--      "mujer" de Check Mate King: es un producto distinto que se llama
--      'Armaf Checkmate Queen' (mismo diseño de pieza de ajedrez, corona
--      blanca en vez de la corona negra del Check Mate King). Se corrige
--      el nombre además de la marca (que ya estaba bien puesta en Armaf).
--    - "Lattafa Bade'e Al Oud Noble Blush" tenia "Lattafa" en el propio
--      nombre pero la marca decia Por Definir.
--    - 'Nitro RED Intensely' es la misma linea Nitro de Rasasi que ya
--      tiene 'Nitro Elixir' y 'Nitro Gold' con marca Rasasi.
--    - Las 4 filas "King Of King..." / "Nebula...by King of Kings" pasan
--      de marca 'Por Definir' a 'King of Kings' (el nombre real que
--      traen, mejor que el generico "Por Definir").
--    - 'Game Of Spades Diamond' y 'Game Of Spades High Roller' estaban
--      con marca 'Lattafa Pride', pero al buscarles foto se confirmó
--      contra jomilanoparis.com que esa edición puntual (Diamond / High
--      Roller) es de la casa JO MILANO PARIS, no de Lattafa Pride --
--      son dos casas distintas que usan el mismo concepto "Game of
--      Spades".
--
-- 2) DUPLICADOS: mismo perfume (mismo mililitraje, precio casi o
--    exactamente igual) cargado dos veces por typos o rondas de Excel
--    distintas. Se borra la copia con peor dato (sin marca real, sin
--    foto, o precio mas viejo) y se deja la buena. Son productos
--    agregados hace muy poco -- no deberian tener pedidos/reservas
--    todavia, pero si alguno SI tiene, el borrado (ON DELETE CASCADE)
--    se llevaria esa reserva tambien: revisa antes de correr si te
--    preocupa algun caso puntual.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- ---------- 1) Marca ----------
update perfumes set marca = 'Carolina Herrera', tipo_casa = 'Diseñador' where slug = 'chanel-bad-boy-le-parfum-for-men-50ml';
update perfumes set marca = 'Armaf', tipo_casa = 'Árabe', nombre = 'Checkmate Queen' where slug = 'por-definir-chect-mate-king-mujer-100ml';
update perfumes set marca = 'Lattafa', tipo_casa = 'Árabe' where slug = 'por-definir-lattafa-bade-e-al-oud-noble-blush-100ml';
update perfumes set marca = 'Rasasi', tipo_casa = 'Árabe' where slug = 'por-definir-nitro-red-intensely-100ml';
update perfumes set marca = 'King of Kings' where slug in ('por-definir-king-of-king-private-blend-chapter-i-100ml', 'por-definir-king-of-king-royal-amber-100ml', 'por-definir-king-of-king-royal-blue-100ml', 'por-definir-nebula-extreme-parfum-edp-by-king-of-kings-100ml');
update perfumes set marca = 'Jo Milano Paris', tipo_casa = 'Árabe' where slug in ('lattafa-pride-game-of-spades-diamond-100ml', 'lattafa-pride-game-of-spades-high-roller-100ml');

-- ---------- 2) Duplicados: se borra la copia peor, se deja la buena ----------
-- '9 P M Pour Femme' (Por Definir) == '9 PM Pour Femme' (Afnan)
delete from perfumes where slug = 'por-definir-9-p-m-pour-femme-100ml';
-- 'Azaro Perfum' sin foto == 'Azzaro Perfum' con foto
delete from perfumes where slug = 'azzaro-azaro-perfum-100ml';
-- 'Agnham' (Por Definir, sin foto, S/135) == 'Angham Lattafa' (Lattafa, con foto, S/135 -- mismo precio exacto)
delete from perfumes where slug = 'por-definir-agnham-100ml';
-- 'Honor AND Glory' (Por Definir, S/99) == 'BADEE HONOR GLORY' (Lattafa, S/99 -- mismo precio exacto)
delete from perfumes where slug = 'por-definir-honor-and-glory-100ml';
-- 'Malachite' (S/107) == 'Sceptre Malachite Eau De Parfum' (S/108 -- precio casi igual, misma familia)
delete from perfumes where slug = 'por-definir-malachite-100ml';
-- 'Bahara King' (typo, S/182) == 'Bharara King' (ortografia correcta, S/185, 100ml)
delete from perfumes where slug = 'bharara-bahara-king-100ml';
-- 'Hawas Kobra Eau De Parfum' (precio mas viejo S/154) == 'HAWAS KOBRA' (precio vigente S/160)
delete from perfumes where slug = 'rasasi-hawas-kobra-eau-de-parfum-100ml';
-- 'Hawas Malibú Eau De Parfum' (precio mas viejo S/150) == 'HAWAS MALIBU' (precio vigente S/160)
delete from perfumes where slug = 'rasasi-hawas-malibu-eau-de-parfum-100ml';
