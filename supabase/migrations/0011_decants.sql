-- ==========================================================
-- MIGRACIÓN 0011 — Decants: fracciones pequeñas de un perfume (3ml/5ml/10ml,
-- etc.) vendidas con stock propio, agrupadas bajo una misma ficha con
-- selector de tamaño. Mismo criterio que "Liquidaciones" (migración 0004):
-- cada tamaño es una fila normal de `perfumes` (con su propio precio,
-- stock e inventario 1:1 vía el trigger existente
-- fn_crear_inventario_inicial), así que TODO el carrito, el checkout
-- (crear_pedido_directo) y las políticas RLS de "perfumes" siguen
-- funcionando sin ningún cambio -- para ese código, un tamaño de decant es
-- un producto más.
--
-- Cambios:
--  1. Dos columnas nuevas en perfumes:
--     - es_decant: marca cualquier fila (raíz o tamaño hijo) que pertenece
--       a una familia de decants.
--     - id_decant_grupo: null en la fila "raíz" (la que se crea primero);
--       en las filas "hijas" apunta al id de la raíz. Raíz + hijas =
--       los tamaños que se muestran juntos en la ficha de producto.
--  2. Como las políticas de "perfumes" ya son a nivel de fila, cubren
--     estas columnas nuevas automáticamente -- no hace falta ninguna
--     policy, trigger ni cambio en crear_pedido_directo().
--
-- Ejecutar una sola vez en el SQL Editor de Supabase -- PRIMERO en el
-- proyecto de staging, recién después en producción (ver OPERACIONES.md §2).
-- ==========================================================

alter table perfumes
    add column if not exists es_decant boolean not null default false,
    add column if not exists id_decant_grupo bigint references perfumes(id) on delete set null;

alter table perfumes drop constraint if exists chk_decant_grupo_requiere_flag;
alter table perfumes add constraint chk_decant_grupo_requiere_flag
    check (id_decant_grupo is null or es_decant = true);

alter table perfumes drop constraint if exists chk_decant_grupo_no_autoreferencia;
alter table perfumes add constraint chk_decant_grupo_no_autoreferencia
    check (id_decant_grupo is null or id_decant_grupo <> id);

create index if not exists idx_perfumes_decant_grupo on perfumes(id_decant_grupo) where id_decant_grupo is not null;
