-- ==========================================================
-- MIGRACIÓN 0001 — Consolidados: cierre por fecha, dirección de
-- entrega en la reserva, y fusión de reservas duplicadas
-- Ejecutar una sola vez en el SQL Editor de Supabase (producción)
-- ==========================================================

-- 1. La reserva ahora guarda a qué dirección (o "Recojo en tienda") quiere el
--    cliente que llegue su pedido, igual que ya se hace en tienda directa.
--    Nullable a nivel de base de datos (por si el admin necesita insertar una
--    reserva manual sin dirección); la función de abajo la exige siempre que
--    la reserva venga del sitio.
alter table detalle_consolidado
    add column if not exists id_direccion_entrega bigint references direcciones_cliente(id);

-- 2. reservar_en_consolidado — cambios:
--    a) Cierra por FECHA además de por estado: antes solo miraba
--       consolidados.estado = 'Abierto', así que si el admin se olvidaba de
--       cambiar el estado el mismo día del cierre programado, el sitio
--       seguía aceptando reservas indefinidamente.
--    b) Exige y guarda la dirección de entrega del cliente.
--    c) Si el cliente ya tenía una reserva viva del mismo perfume en esta
--       campaña, suma la cantidad a esa fila en vez de crear una fila nueva
--       (antes quedaban dos líneas separadas para el mismo perfume — el
--       total cobrado salía bien igual, pero era confuso de leer en "Mis
--       Reservas" y en el pedido final).
--    La firma cambia (se agrega p_id_direccion), así que se elimina la
--    versión anterior de 3 argumentos para no dejar dos funciones vivas.
drop function if exists reservar_en_consolidado(bigint, bigint, int);

create function reservar_en_consolidado(
    p_id_consolidado bigint,
    p_id_producto bigint,
    p_cantidad int,
    p_id_direccion bigint
) returns bigint as $$
declare
    v_id_detalle bigint;
    v_precio numeric(10,2);
begin
    if p_cantidad is null or p_cantidad <= 0 then
        raise exception 'La cantidad debe ser mayor a 0';
    end if;
    if not exists (
        select 1 from consolidados
        where id = p_id_consolidado and estado = 'Abierto' and fecha_cierre_programada > now()
    ) then
        raise exception 'Este consolidado ya no admite reservas (la campaña cerró o venció su fecha límite)';
    end if;
    if not exists (select 1 from direcciones_cliente where id = p_id_direccion and id_cliente = auth.uid()) then
        raise exception 'Selecciona una dirección de entrega válida';
    end if;

    select precio_consolidado_fijo into v_precio from perfumes where id = p_id_producto;
    if v_precio is null then
        raise exception 'Producto no encontrado';
    end if;

    select id into v_id_detalle
    from detalle_consolidado
    where id_consolidado = p_id_consolidado and id_cliente = auth.uid() and id_producto = p_id_producto
      and estado_item = 'Reservado';

    if v_id_detalle is not null then
        update detalle_consolidado
        set cantidad = cantidad + p_cantidad, id_direccion_entrega = p_id_direccion
        where id = v_id_detalle;
    else
        insert into detalle_consolidado (id_consolidado, id_cliente, id_producto, cantidad, precio_consolidado_aplicado, id_direccion_entrega)
        values (p_id_consolidado, auth.uid(), p_id_producto, p_cantidad, v_precio, p_id_direccion)
        returning id into v_id_detalle;
    end if;

    return v_id_detalle;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. generar_pedidos_de_consolidado — misma firma, solo se actualiza el
--    cuerpo para arrastrar la dirección de cada cliente hacia el pedido real
--    que se genera al cerrar la campaña (antes el pedido quedaba sin
--    dirección porque nadie la pedía en ningún punto del flujo).
create or replace function generar_pedidos_de_consolidado(p_id_consolidado bigint) returns integer as $$
declare
    v_cliente record;
    v_id_pedido bigint;
    v_creados integer := 0;
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    if exists (select 1 from consolidados where id = p_id_consolidado and estado = 'Abierto') then
        raise exception 'Cierra la campaña (cámbiale el estado) antes de generar los pedidos, para no dejar afuera reservas que lleguen después';
    end if;

    for v_cliente in
        select id_cliente,
               sum(cantidad * precio_consolidado_aplicado) as total,
               max(id_direccion_entrega) as id_direccion_entrega
        from detalle_consolidado
        where id_consolidado = p_id_consolidado and estado_item = 'Reservado'
        group by id_cliente
    loop
        insert into pedidos (id_cliente, tipo_pedido, id_consolidado_asociado, id_direccion_entrega, monto_total, monto_saldo_pendiente)
        values (v_cliente.id_cliente, 'Consolidado', p_id_consolidado, v_cliente.id_direccion_entrega, v_cliente.total, v_cliente.total)
        returning id into v_id_pedido;

        insert into detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_aplicado)
        select v_id_pedido, id_producto, cantidad, precio_consolidado_aplicado
        from detalle_consolidado
        where id_consolidado = p_id_consolidado and estado_item = 'Reservado' and id_cliente = v_cliente.id_cliente;

        insert into envios (id_pedido, estado_envio) values (v_id_pedido, 'Preparando');

        update detalle_consolidado
        set estado_item = 'Convertido_A_Pedido'
        where id_consolidado = p_id_consolidado and estado_item = 'Reservado' and id_cliente = v_cliente.id_cliente;

        v_creados := v_creados + 1;
    end loop;

    return v_creados;
end;
$$ language plpgsql security definer set search_path = public;
