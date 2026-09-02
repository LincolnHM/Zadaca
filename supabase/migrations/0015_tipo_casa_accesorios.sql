-- ==========================================================
-- MIGRACIÓN 0015 — Agrega 'Accesorios' como valor válido de tipo_casa.
-- Hasta ahora tipo_casa era solo para clasificar la CASA de un perfume
-- (Árabe/Diseñador/Nicho, ver migración 0007) -- pero el catálogo ya
-- vende algo que no es un perfume (Frasco Probador de Vidrio 1ml, ver
-- supabase/agregar_frasco_probador_1ml.sql), que no encaja en ninguna de
-- esas 3. En vez de una columna aparte, se reutiliza tipo_casa con un
-- cuarto valor -- ya es el campo que tanto el filtro del catálogo como el
-- del panel admin usan para "qué tipo de producto es esto".
--
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ==========================================================

alter table perfumes drop constraint perfumes_tipo_casa_check;
alter table perfumes add constraint perfumes_tipo_casa_check check (tipo_casa in ('Árabe', 'Diseñador', 'Nicho', 'Accesorios'));

-- Reclasifica el Frasco Probador de Vidrio 1ml (las 4 presentaciones por cantidad) de
-- "sin definir" a "Accesorios" -- también se le quita cualquier marca de liquidación que se le
-- haya puesto a mano desde el panel admin, porque no es un producto de liquidación (precio y
-- stock normales, no por mayor con mínimo de compra).
update perfumes
set tipo_casa = 'Accesorios', es_liquidacion = false, precio_liquidacion = null, liquidacion_unidad_minima = 1
where slug like 'maison-zadaca-frasco-probador-1ml-%';
