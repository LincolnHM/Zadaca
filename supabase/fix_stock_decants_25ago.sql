-- Fix: los 44 decants cargados en cargar_decants_chiclayo_25ago.sql quedaron con
-- stock_fisico = 0 (el UPDATE final de cada bloque de ese script no se aplicó), por eso
-- decants/ los mostraba vacíos aunque ya existían en Admin -> Productos.
--
-- Este UPDATE es seguro de correr las veces que haga falta: solo toca el inventario de
-- productos marcados es_decant = true, no inserta ni borra nada.
--
-- Ejecutar en el SQL Editor de Supabase.
update inventario
set stock_fisico = 10
where id_producto in (select id from perfumes where es_decant = true);
