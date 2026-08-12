-- ==========================================================
-- MIGRACIÓN 0004 — Liquidaciones: stock que cae directo a stock, vendido
-- por mayor y por unidad, con cantidad mínima de compra configurable POR
-- PRODUCTO (algunos desde 1 unidad, otros solo en packs de 2, 6, etc.,
-- según lo que vaya llegando). Portado del prototipo local (TIO ZADAKA).
--
-- Cambios:
--  1. Tres columnas nuevas en perfumes: es_liquidacion, precio_liquidacion,
--     liquidacion_unidad_minima. Las policies de "perfumes" ya son a nivel
--     de fila ("catalogo publico" / "catalogo admin escribe"), así que
--     cubren estas columnas nuevas automáticamente — no hace falta ninguna
--     policy adicional.
--  2. Trigger en carrito_items que rechaza un insert/update con cantidad
--     por debajo del mínimo del producto. Hoy agregarAlCarrito /
--     actualizarCantidadCarrito (assets/js/api.js) escriben DIRECTO a esta
--     tabla vía supabase-js, sin pasar por ninguna función — sin este
--     trigger, cualquiera podría mandar cantidad=1 a un producto que exige
--     mínimo 6, no solo evitando el stepper del sitio sino llamando a la
--     REST API directo.
--  3. crear_pedido_directo(): el checkout calculaba precio_final con la
--     fórmula de descuento de tienda en dos loops separados (uno valida
--     stock y suma el total, el otro inserta detalle_pedido). Ambos ahora
--     usan precio_liquidacion cuando es_liquidacion=true — sin este
--     cambio, cualquier compra de un producto en liquidación se cobraría
--     de más (precio de tienda regular en vez del precio de liquidación).
--     El resto de la función (validación de dirección, carrito vacío,
--     mensaje de stock insuficiente, insert de envíos, limpieza del
--     carrito) queda idéntico.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase — PRIMERO en el
-- proyecto de staging, recién después en producción (ver OPERACIONES.md §2).
-- ==========================================================

-- 1. Columnas nuevas en perfumes -----------------------------------------

alter table perfumes
    add column if not exists es_liquidacion boolean default false,
    add column if not exists precio_liquidacion numeric(10,2),
    add column if not exists liquidacion_unidad_minima int default 1;

alter table perfumes drop constraint if exists chk_liquidacion_precio_valor;
alter table perfumes add constraint chk_liquidacion_precio_valor
    check (precio_liquidacion is null or precio_liquidacion > 0);

alter table perfumes drop constraint if exists chk_liquidacion_unidad_minima;
alter table perfumes add constraint chk_liquidacion_unidad_minima
    check (liquidacion_unidad_minima >= 1);

alter table perfumes drop constraint if exists chk_liquidacion_precio;
alter table perfumes add constraint chk_liquidacion_precio
    check (es_liquidacion = false or precio_liquidacion is not null);

-- 2. Trigger: cantidad mínima al agregar/actualizar carrito_items --------
-- BEFORE porque rechaza el insert/update entero si no cumple el mínimo (no
-- lo corrige en silencio: el cliente debe ver el motivo exacto, igual que
-- hacía el backend Express en TIO ZADAKA). security definer + search_path
-- fijo por consistencia con el resto de triggers de este esquema
-- (fn_actualizar_stock_reservado, fn_crear_inventario_inicial, etc.).

create function fn_validar_minimo_liquidacion() returns trigger as $$
declare
    v_es_liquidacion boolean;
    v_minimo int;
    v_nombre varchar(150);
begin
    select es_liquidacion, liquidacion_unidad_minima, nombre
      into v_es_liquidacion, v_minimo, v_nombre
      from perfumes
      where id = new.id_producto;

    if v_es_liquidacion and new.cantidad < v_minimo then
        raise exception 'Este producto de liquidación requiere un mínimo de % unidades (%)', v_minimo, v_nombre;
    end if;

    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_validar_minimo_liquidacion on carrito_items;
create trigger trg_validar_minimo_liquidacion
before insert or update on carrito_items
for each row execute function fn_validar_minimo_liquidacion();

-- 3. crear_pedido_directo(): precio de liquidación en el checkout --------
-- Firma sin cambios, así que "create or replace" alcanza (no hace falta
-- "drop function" primero). Único cambio real frente a la versión actual:
-- la expresión de precio_final en los dos loops pasa de la fórmula de
-- descuento de tienda a un CASE que prioriza precio_liquidacion cuando
-- es_liquidacion=true — igual al patrón que ya usa TIO ZADAKA en sus
-- consultas SQL de carrito.routes.js / pedidos.routes.js.

create or replace function crear_pedido_directo(p_id_direccion bigint) returns bigint as $$
declare
    v_id_pedido bigint;
    v_monto_total numeric(10,2) := 0;
    v_item record;
begin
    if not exists (select 1 from direcciones_cliente where id = p_id_direccion and id_cliente = auth.uid()) then
        raise exception 'Dirección no válida';
    end if;

    if not exists (select 1 from carrito_items where id_cliente = auth.uid()) then
        raise exception 'El carrito está vacío';
    end if;

    for v_item in
        select ci.id_producto, ci.cantidad,
               case when p.es_liquidacion then p.precio_liquidacion
                    else round(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2) end as precio_final,
               coalesce(i.stock_disponible, 0) as stock_disponible,
               p.nombre
        from carrito_items ci
        join perfumes p on p.id = ci.id_producto
        left join inventario i on i.id_producto = p.id
        where ci.id_cliente = auth.uid()
    loop
        if v_item.cantidad > v_item.stock_disponible then
            raise exception 'Stock insuficiente para "%": disponible %', v_item.nombre, v_item.stock_disponible;
        end if;
        v_monto_total := v_monto_total + (v_item.cantidad * v_item.precio_final);
    end loop;

    insert into pedidos (id_cliente, tipo_pedido, id_direccion_entrega, monto_total, monto_saldo_pendiente)
    values (auth.uid(), 'Directo_Tienda', p_id_direccion, v_monto_total, v_monto_total)
    returning id into v_id_pedido;

    for v_item in
        select ci.id_producto, ci.cantidad,
               case when p.es_liquidacion then p.precio_liquidacion
                    else round(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2) end as precio_final
        from carrito_items ci join perfumes p on p.id = ci.id_producto
        where ci.id_cliente = auth.uid()
    loop
        insert into detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_aplicado)
        values (v_id_pedido, v_item.id_producto, v_item.cantidad, v_item.precio_final);

        update inventario set stock_fisico = stock_fisico - v_item.cantidad where id_producto = v_item.id_producto;
    end loop;

    insert into envios (id_pedido, estado_envio) values (v_id_pedido, 'Preparando');
    delete from carrito_items where id_cliente = auth.uid();

    return v_id_pedido;
end;
$$ language plpgsql security definer set search_path = public;
