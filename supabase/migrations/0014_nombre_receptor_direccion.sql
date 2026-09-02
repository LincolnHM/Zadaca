-- ==========================================================
-- MIGRACIÓN 0014 — "¿Quién recoge/recibe el pedido?" en direcciones_cliente.
-- Antes no había forma de indicar que la persona que recibe o recoge el
-- pedido en una dirección es distinta al titular de la cuenta (frecuente en
-- Agencia_Shalom/Agencia_Olva y Recojo_En_Tienda). Columna opcional -- si
-- se deja vacía, se asume que recoge/recibe el propio titular.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ==========================================================

alter table direcciones_cliente add column nombre_receptor varchar(150);
