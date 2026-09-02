-- ==========================================================
-- CORREGIR STOCK — los 16 decants de los lotes 2 y 3 (02 sep 2026) se
-- crearon bien (marca, nombre, foto, precio -- todo correcto, verificado
-- contra la base en vivo), pero el paso que les ponía 10 unidades de
-- stock no surtió efecto: los 32 registros (5ml y 10ml de cada uno)
-- quedaron con stock_fisico = 0. Como el catálogo público (y /decants/)
-- solo muestra productos CON stock, por eso no aparecían aunque ya
-- existieran en la base.
--
-- Este script es un UPDATE directo por ID (sin CTEs) para no dejar
-- ninguna duda -- son los mismos 32 ids que insertaron los scripts
-- cargar_decants_lote2_02sep.sql y cargar_decants_lote3_02sep.sql.
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ==========================================================

update inventario
set stock_fisico = 10
where id_producto in (
  385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400,
  401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416
);
