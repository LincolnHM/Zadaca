-- ==========================================================
-- MIGRACIÓN 0021 — Las reservas de consolidado entran solo por el Carrito de Avión
--
-- Pegar en Supabase → SQL Editor → Run (después de la 0020). Se puede volver a correr.
--
-- reservar_en_consolidado() (una reserva por perfume) seguía disponible para cualquier cliente
-- con sesión: llamándola directo se podía reservar 1 sola unidad y saltarse el pedido mínimo
-- que valida reservar_carrito_avion(). La web ya no la usa (el carrito se confirma entero), así
-- que se le quita el permiso a los clientes. reservar_carrito_avion() la sigue usando por dentro
-- (corre como su dueño, por eso no le afecta).
-- ==========================================================

revoke execute on function reservar_en_consolidado(bigint, bigint, int, bigint) from public, anon, authenticated;

-- Revisión: debe decir false / false / true
select has_function_privilege('authenticated', 'reservar_en_consolidado(bigint, bigint, int, bigint)', 'execute') as clientes_reservan_suelto,
       has_function_privilege('anon', 'reservar_carrito_avion(bigint, jsonb, bigint)', 'execute') as anonimos_carrito,
       has_function_privilege('authenticated', 'reservar_carrito_avion(bigint, jsonb, bigint)', 'execute') as clientes_carrito;
