-- ==========================================================
-- MIGRACIÓN 0006 — Dos problemas reales del negocio:
--
-- A) Un consolidado hoy no tiene ningún tope: cualquiera puede reservar
--    cualquier cantidad al instante (ej. 50 unidades "en broma") y ya
--    queda contada en el progreso de la campaña. Ahora, si una reserva
--    de UN mismo perfume llega a 10 unidades o más, queda en estado
--    'Pendiente_Aprobacion' — no cuenta en la barra de progreso ni en
--    lo que se le pide al proveedor (Contabilidad) hasta que el Admin la
--    apruebe. Para aprobarla o rechazarla no hace falta pantalla nueva:
--    el panel admin ya tenía un selector de estado por reserva (sección
--    "Consolidados" y "Todas las Reservas") — ahora ese selector incluye
--    la opción "Pendiente_Aprobacion", y el admin la cambia a "Reservado"
--    (aprobar) o "Cancelado" (rechazar) desde ahí mismo.
--
-- B) inventario.stock_disponible restaba stock_reservado_consolidados de
--    stock_fisico — es decir, cada reserva en un consolidado le comía
--    stock a la tienda directa, aunque son dos cosas distintas: la
--    tienda vende de lo que ya tienes físicamente, el consolidado se
--    importa bajo pedido y no depende de tu stock actual. Se separan:
--    stock_disponible (lo que ve el cliente en la tienda) ahora es
--    solo stock_fisico. stock_reservado_consolidados se seguía
--    calculando para que el admin siga viendo cuánto hay comprometido
--    en consolidados (panel de edición de producto), simplemente ya no
--    afecta lo que se puede comprar en tienda directa.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- ---------- A.1 — nuevo estado válido para reservas ----------
alter table detalle_consolidado drop constraint detalle_consolidado_estado_item_check;
alter table detalle_consolidado add constraint detalle_consolidado_estado_item_check
    check (estado_item in ('Reservado', 'Pendiente_Aprobacion', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'));

-- ---------- A.2 — reservar_en_consolidado(): agrega el tope de 10 unidades ----------
-- Mismo cálculo de precio por volumen de la migración 0005; lo único que cambia es que
-- ahora fusiona también con una fila que ya esté en 'Pendiente_Aprobacion' del mismo
-- producto/precio (para no crear una fila aparte si el cliente sigue sumando cantidad a
-- algo que ya estaba pendiente), y decide el estado final según el total acumulado en esa
-- fila tras la operación.
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
    v_cantidad_previa int;
    v_cantidad_total int;
    v_nuevo_estado varchar(30);
    -- A partir de esta cantidad (de un mismo perfume, en una misma reserva) se requiere
    -- aprobación manual del Admin antes de contar como reserva válida.
    c_umbral_aprobacion constant int := 10;
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

    -- El volumen acumulado (para el descuento por escalones) solo cuenta reservas ya
    -- aprobadas ('Reservado') — una reserva pendiente de aprobación no debe ayudar a nadie
    -- a bajar de precio todavía.
    select coalesce(sum(cantidad * precio_consolidado_aplicado), 0) into v_acumulado_previo
    from detalle_consolidado
    where id_consolidado = p_id_consolidado and id_cliente = auth.uid() and estado_item = 'Reservado';

    v_descuento := fn_descuento_por_monto(v_acumulado_previo + (v_precio_base * p_cantidad));
    v_precio_final := greatest(v_precio_base - v_descuento, 0.01);

    select id, cantidad into v_id_detalle, v_cantidad_previa
    from detalle_consolidado
    where id_consolidado = p_id_consolidado and id_cliente = auth.uid() and id_producto = p_id_producto
      and estado_item in ('Reservado', 'Pendiente_Aprobacion') and precio_consolidado_aplicado = v_precio_final;

    v_cantidad_total := coalesce(v_cantidad_previa, 0) + p_cantidad;
    v_nuevo_estado := case when v_cantidad_total >= c_umbral_aprobacion then 'Pendiente_Aprobacion' else 'Reservado' end;

    if v_id_detalle is not null then
        update detalle_consolidado
        set cantidad = v_cantidad_total, id_direccion_entrega = p_id_direccion, estado_item = v_nuevo_estado
        where id = v_id_detalle;
    else
        insert into detalle_consolidado (id_consolidado, id_cliente, id_producto, cantidad, precio_consolidado_aplicado, id_direccion_entrega, estado_item)
        values (p_id_consolidado, auth.uid(), p_id_producto, p_cantidad, v_precio_final, p_id_direccion, v_nuevo_estado)
        returning id into v_id_detalle;
    end if;

    return v_id_detalle;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- A.3 — el progreso de la campaña y el stock reservado ya no cuentan lo pendiente ----------
create or replace function fn_actualizar_total_consolidado() returns trigger as $$
begin
    update consolidados
    set total_unidades_acumuladas = coalesce((
        select sum(cantidad) from detalle_consolidado
        where id_consolidado = coalesce(new.id_consolidado, old.id_consolidado)
          and estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
    ), 0)
    where id = coalesce(new.id_consolidado, old.id_consolidado);
    return null;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function fn_actualizar_stock_reservado() returns trigger as $$
declare
    v_producto bigint := coalesce(new.id_producto, old.id_producto);
begin
    update inventario
    set stock_reservado_consolidados = coalesce((
        select sum(cantidad) from detalle_consolidado
        where id_producto = v_producto and estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
    ), 0)
    where id_producto = v_producto;
    return null;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- A.4 — la lista pública "Perfumes reservados en esta campaña" tampoco cuenta lo pendiente ----------
create or replace view consolidado_resumen_publico as
select
    dc.id_consolidado,
    p.id as id_producto,
    p.slug,
    p.nombre,
    p.marca,
    p.imagen_url,
    sum(dc.cantidad) as unidades_reservadas,
    max(dc.precio_consolidado_aplicado) as precio_consolidado_aplicado
from detalle_consolidado dc
join perfumes p on p.id = dc.id_producto
where dc.estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
group by dc.id_consolidado, p.id, p.slug, p.nombre, p.marca, p.imagen_url;

-- ---------- B — stock_disponible (tienda) ya no resta lo reservado en consolidados ----------
alter table inventario drop column stock_disponible;
alter table inventario add column stock_disponible int generated always as (stock_fisico) stored;

-- Recalcula los contadores existentes con las reglas nuevas (por si ya había reservas
-- 'Pendiente_Aprobacion' de antes de correr esta migración — no debería haber, pero no cuesta).
update consolidados c set total_unidades_acumuladas = coalesce((
    select sum(cantidad) from detalle_consolidado where id_consolidado = c.id and estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
), 0);
update inventario i set stock_reservado_consolidados = coalesce((
    select sum(cantidad) from detalle_consolidado where id_producto = i.id_producto and estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
), 0);
