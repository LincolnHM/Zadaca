-- ==========================================================
-- MIGRACIÓN 0005 — Descuento por volumen en consolidados: cuánto más
-- lleva un cliente acumulado (en soles, sumando TODOS los perfumes que
-- reservó en esa campaña) más barata sale la unidad. Portado del Excel
-- del proveedor (CONSOLIDADO VIP ZADACA): el descuento es un monto FIJO
-- por unidad en cada escalón (S/2, S/4, S/6, S/8), igual para cualquier
-- perfume sin importar su precio — se verificó ese patrón contra las
-- ~105 filas del Excel que traían los 5 precios y se cumple en el 100%.
--
-- Escalones (acumulado del cliente en la campaña, incluyendo la reserva
-- que está haciendo):
--   Desde 4 unidades (mínimo de la campaña) ......... precio base
--   S/ 1,000+  ........................................ -S/2 por unidad
--   S/ 5,000+  ........................................ -S/4 por unidad
--   S/ 10,000+ ........................................ -S/6 por unidad
--   S/ 30,000+ ........................................ -S/8 por unidad
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- 1. Tabla de escalones ----------------------------------------------
-- Editable directo por Admin (o desde el SQL Editor) si el proveedor
-- cambia los montos o los descuentos más adelante — el resto del
-- sistema lee esta tabla, no tiene los números harcodeados.
create table descuentos_volumen_consolidado (
    id bigint generated always as identity primary key,
    umbral_soles numeric(10,2) not null unique check (umbral_soles > 0),
    descuento_por_unidad numeric(10,2) not null check (descuento_por_unidad >= 0)
);

insert into descuentos_volumen_consolidado (umbral_soles, descuento_por_unidad) values
    (1000, 2),
    (5000, 4),
    (10000, 6),
    (30000, 8);

alter table descuentos_volumen_consolidado enable row level security;
create policy "descuentos volumen publico" on descuentos_volumen_consolidado for select using (true);
create policy "descuentos volumen admin escribe" on descuentos_volumen_consolidado for all using (is_admin()) with check (is_admin());

-- 2. Descuento por unidad para un monto acumulado dado ----------------
create function fn_descuento_por_monto(p_monto numeric) returns numeric as $$
    select coalesce(max(descuento_por_unidad), 0)
    from descuentos_volumen_consolidado
    where umbral_soles <= p_monto;
$$ language sql stable set search_path = public;

-- 3. reservar_en_consolidado(): ahora calcula el precio por unidad según
-- el volumen acumulado del cliente en esa campaña. El acumulado "previo"
-- se mide con los precios YA aplicados en sus reservas anteriores; el
-- monto de ESTA reserva se estima al precio base (cantidad x precio de
-- lista) para decidir a qué escalón entra — evita el problema circular
-- de necesitar el descuento para calcular el monto que decide el
-- descuento. Si el precio resultante es distinto al de una reserva que
-- ya tenía para el mismo producto, se crea una fila aparte en vez de
-- fusionarla (para que cada fila represente "N unidades a un precio"
-- sin mezclar promedios).
create or replace function reservar_en_consolidado(
    p_id_consolidado bigint,
    p_id_producto bigint,
    p_cantidad int,
    p_id_direccion bigint
) returns bigint as $$
declare
    v_id_detalle bigint;
    v_precio_base numeric(10,2);
    v_precio_final numeric(10,2);
    v_acumulado_previo numeric(10,2);
    v_descuento numeric(10,2);
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

    select precio_consolidado_fijo into v_precio_base from perfumes where id = p_id_producto;
    if v_precio_base is null then
        raise exception 'Producto no encontrado';
    end if;

    select coalesce(sum(cantidad * precio_consolidado_aplicado), 0) into v_acumulado_previo
    from detalle_consolidado
    where id_consolidado = p_id_consolidado and id_cliente = auth.uid() and estado_item = 'Reservado';

    v_descuento := fn_descuento_por_monto(v_acumulado_previo + (v_precio_base * p_cantidad));
    v_precio_final := greatest(v_precio_base - v_descuento, 0.01);

    select id into v_id_detalle
    from detalle_consolidado
    where id_consolidado = p_id_consolidado and id_cliente = auth.uid() and id_producto = p_id_producto
      and estado_item = 'Reservado' and precio_consolidado_aplicado = v_precio_final;

    if v_id_detalle is not null then
        update detalle_consolidado
        set cantidad = cantidad + p_cantidad, id_direccion_entrega = p_id_direccion
        where id = v_id_detalle;
    else
        insert into detalle_consolidado (id_consolidado, id_cliente, id_producto, cantidad, precio_consolidado_aplicado, id_direccion_entrega)
        values (p_id_consolidado, auth.uid(), p_id_producto, p_cantidad, v_precio_final, p_id_direccion)
        returning id into v_id_detalle;
    end if;

    return v_id_detalle;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. RPC para el panel de reserva: cuánto lleva acumulado el cliente en
-- esta campaña, su descuento actual, y cuánto le falta para el próximo
-- escalón (para el indicador de progreso en consolidado.js).
create function progreso_volumen_consolidado(p_id_consolidado bigint)
returns table (
    total_acumulado numeric,
    descuento_actual numeric,
    siguiente_umbral numeric,
    siguiente_descuento numeric,
    falta_para_siguiente numeric
) as $$
declare
    v_total numeric(10,2);
begin
    if auth.uid() is null then
        raise exception 'Debes iniciar sesión';
    end if;

    select coalesce(sum(cantidad * precio_consolidado_aplicado), 0) into v_total
    from detalle_consolidado
    where id_consolidado = p_id_consolidado and id_cliente = auth.uid() and estado_item = 'Reservado';

    return query
    select
        v_total,
        fn_descuento_por_monto(v_total),
        u.umbral_soles,
        u.descuento_por_unidad,
        u.umbral_soles - v_total
    from descuentos_volumen_consolidado u
    where u.umbral_soles > v_total
    order by u.umbral_soles asc
    limit 1;

    if not found then
        return query select v_total, fn_descuento_por_monto(v_total), null::numeric, null::numeric, null::numeric;
    end if;
end;
$$ language plpgsql security definer stable set search_path = public;

grant execute on function progreso_volumen_consolidado(bigint) to authenticated;
