-- ==========================================================
-- MIGRACIÓN 0017 — "Inspirado en" (a qué perfume de diseñador imita)
--
-- El catálogo real de decants/árabes se vende mucho por comparación ("es como tal perfume
-- de tal marca, pero más barato") -- el catálogo impreso (PDF actualizado) ya trae esa
-- referencia por perfume ("DUP: Ultra Male de Jean Paul Gaultier", etc.) pero el sitio no
-- tenía dónde guardarla. Se agrega como columna aparte de notas_olfativas (que es la lista de
-- acordes/familia olfativa, un dato distinto) para poder mostrarla como su propio badge en la
-- ficha de producto sin mezclarla con las notas.
-- ==========================================================

alter table perfumes add column inspirado_en varchar(150);
