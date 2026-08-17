-- ==========================================================
-- MIGRACIÓN 0008 — Bandera "activo" para ocultar productos sin borrarlos
--
-- El catálogo (327 productos al día de esta migración) mezcla el Excel VIP
-- vigente ('CONSOLIDADO VIP _ZADACA (1).xlsx', ~198 filas) con productos de
-- rondas anteriores que ya no se venden. Hasta ahora, la única forma de
-- "sacar" un producto del catálogo público era borrarlo -- pero eso arrastra
-- (on delete cascade) sus reseñas, favoritos y carritos, y si el producto
-- tiene un pedido o una reserva de consolidado real, el borrado directamente
-- falla (esas tablas no tienen cascade, ver detalle_pedido/detalle_consolidado
-- en schema.sql) porque se perdería historial de venta real.
--
-- "activo" resuelve esto: false = no aparece en catálogo de tienda ni de
-- consolidado ni en el buscador, pero la fila sigue existiendo con todo su
-- historial intacto y se puede reactivar en cualquier momento (por ejemplo
-- desde el panel admin). Todo lo existente parte en true -- no oculta nada
-- por sí sola; el script 'ocultar_no_vip_17ago.sql' es el que efectivamente
-- pone en false los productos que no están en el Excel vigente.
-- ==========================================================

alter table perfumes add column activo boolean not null default true;
create index idx_perfumes_activo on perfumes(activo);
