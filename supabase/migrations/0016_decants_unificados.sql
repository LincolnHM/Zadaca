-- ==========================================================
-- MIGRACIÓN 0016 — Decants: de "un tamaño = una fila" a "un perfume = una
-- fila con sus 3 precios adentro" (3ml/5ml/10ml), más un contador manual de
-- cuánto queda del frasco fuente.
--
-- Hasta ahora (migración 0011) cada tamaño de un decant era su propia fila
-- de `perfumes`, agrupada bajo una raíz vía id_decant_grupo. Eso obligaba al
-- admin a mantener 2-3 tarjetas casi idénticas por perfume y a un cliente le
-- cambiaba de slug/página al elegir otro tamaño. Ahora un decant vuelve a
-- ser UNA fila: sus 3 precios viven en columnas nuevas, y `mililitros`
-- (que ya existía) pasa a significar "cuánto contiene el frasco fuente del
-- que se decanta" (típicamente 100ml) en vez de una sola talla de venta.
--
-- Como el precio de un decant ya no vive en una sola columna
-- (precio_tienda_regular), el carrito y crear_pedido_directo() necesitan
-- saber QUÉ talla se agregó -- de ahí talla_ml en carrito_items y
-- detalle_pedido.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase -- PRIMERO en
-- staging, recién después en producción (ver OPERACIONES.md §2).
-- ==========================================================

-- ---------- 1. Columnas nuevas en perfumes ----------
-- Nulable: una talla en null significa "este perfume no se vende en esa
-- presentación" (los decants viejos de Árabe, ver cargar_decants_chiclayo_25ago.sql,
-- solo tienen 5ml/10ml, nunca 3ml). Se valida "al menos una talla con
-- precio" desde el formulario del admin, no acá con un check -- no todas
-- las combinaciones son iguales entre familias.
alter table perfumes
    add column if not exists precio_3ml numeric(10,2) check (precio_3ml is null or precio_3ml > 0),
    add column if not exists precio_5ml numeric(10,2) check (precio_5ml is null or precio_5ml > 0),
    add column if not exists precio_10ml numeric(10,2) check (precio_10ml is null or precio_10ml > 0),
    add column if not exists mililitros_restantes numeric(6,1) check (mililitros_restantes is null or mililitros_restantes >= 0);

comment on column perfumes.precio_3ml is 'Solo decants: precio de la presentación 3ml. Null = no se vende en esa talla.';
comment on column perfumes.precio_5ml is 'Solo decants: precio de la presentación 5ml. Null = no se vende en esa talla.';
comment on column perfumes.precio_10ml is 'Solo decants: precio de la presentación 10ml. Null = no se vende en esa talla.';
comment on column perfumes.mililitros_restantes is 'Solo decants: cuánto queda del frasco fuente (dato manual, interno del admin, no se muestra al cliente ni bloquea ventas). mililitros = capacidad total de ese frasco.';

-- ---------- 2. talla_ml en carrito_items y detalle_pedido ----------
-- 0 = "no aplica" (todo producto no-decant, y cualquier item de carrito que
-- haya quedado armado de ANTES de este deploy). El unique constraint del
-- carrito pasa a incluir talla_ml: antes un cliente solo podía tener UNA
-- fila en el carrito por producto; ahora puede tener una fila por
-- producto+talla (ej. 2 unidades de 3ml y 1 de 10ml del mismo decant).
alter table carrito_items add column if not exists talla_ml smallint not null default 0;
alter table carrito_items drop constraint if exists uq_carrito_item;
alter table carrito_items add constraint uq_carrito_item unique (id_cliente, id_producto, talla_ml);

alter table detalle_pedido add column if not exists talla_ml smallint not null default 0;
comment on column detalle_pedido.talla_ml is 'Solo decants: qué talla (3/5/10) se compró. 0 = no aplica (producto normal, o pedido de antes de este cambio).';

-- ---------- 3. crear_pedido_directo(): precio y stock por talla ----------
-- Mismo cuerpo que antes (ver migración original en schema.sql), con dos
-- cambios: el precio de un decant sale de precio_3ml/5ml/10ml según
-- ci.talla_ml (si talla_ml no es 3/5/10 -- p.ej. un item que quedó en el
-- carrito de antes de este deploy, con talla_ml=0 -- cae al mismo cálculo
-- de siempre con precio_tienda_regular, que conserva su valor histórico);
-- y un decant ya no valida ni descuenta stock por unidad (no tiene sentido
-- por talla cuando las 3 comparten un mismo frasco) -- solo exige que no
-- esté marcado Agotado.
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
        select ci.id_producto, ci.cantidad, ci.talla_ml,
               case
                   when p.es_decant and ci.talla_ml = 3 and p.precio_3ml is not null then p.precio_3ml
                   when p.es_decant and ci.talla_ml = 5 and p.precio_5ml is not null then p.precio_5ml
                   when p.es_decant and ci.talla_ml = 10 and p.precio_10ml is not null then p.precio_10ml
                   when p.es_liquidacion then p.precio_liquidacion
                   else round(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2)
               end as precio_final,
               coalesce(i.stock_disponible, 0) as stock_disponible,
               p.es_decant, p.estado, p.nombre
        from carrito_items ci
        join perfumes p on p.id = ci.id_producto
        left join inventario i on i.id_producto = p.id
        where ci.id_cliente = auth.uid()
    loop
        if v_item.es_decant then
            if v_item.estado = 'Agotado' then
                raise exception 'Este decant está agotado: %', v_item.nombre;
            end if;
        elsif v_item.cantidad > v_item.stock_disponible then
            raise exception 'Stock insuficiente para "%": disponible %', v_item.nombre, v_item.stock_disponible;
        end if;
        v_monto_total := v_monto_total + (v_item.cantidad * v_item.precio_final);
    end loop;

    insert into pedidos (id_cliente, tipo_pedido, id_direccion_entrega, monto_total, monto_saldo_pendiente)
    values (auth.uid(), 'Directo_Tienda', p_id_direccion, v_monto_total, v_monto_total)
    returning id into v_id_pedido;

    for v_item in
        select ci.id_producto, ci.cantidad, ci.talla_ml, p.es_decant,
               case
                   when p.es_decant and ci.talla_ml = 3 and p.precio_3ml is not null then p.precio_3ml
                   when p.es_decant and ci.talla_ml = 5 and p.precio_5ml is not null then p.precio_5ml
                   when p.es_decant and ci.talla_ml = 10 and p.precio_10ml is not null then p.precio_10ml
                   when p.es_liquidacion then p.precio_liquidacion
                   else round(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2)
               end as precio_final
        from carrito_items ci join perfumes p on p.id = ci.id_producto
        where ci.id_cliente = auth.uid()
    loop
        insert into detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_aplicado, talla_ml)
        values (v_id_pedido, v_item.id_producto, v_item.cantidad, v_item.precio_final, v_item.talla_ml);

        if not v_item.es_decant then
            update inventario set stock_fisico = stock_fisico - v_item.cantidad where id_producto = v_item.id_producto;
        end if;
    end loop;

    insert into envios (id_pedido, estado_envio) values (v_id_pedido, 'Preparando');
    delete from carrito_items where id_cliente = auth.uid();

    return v_id_pedido;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 4. Migra los decants existentes a una sola fila por familia ----------
-- Dinámico (no hardcodea IDs): junta el precio de cada talla (3/5/10) desde
-- la propia raíz y desde cada hija, según el `mililitros` de cada una.

-- 4a. La raíz puede ella misma ser una de las tallas (su propio mililitros).
update perfumes set precio_3ml = precio_tienda_regular where es_decant and id_decant_grupo is null and mililitros = 3;
update perfumes set precio_5ml = precio_tienda_regular where es_decant and id_decant_grupo is null and mililitros = 5;
update perfumes set precio_10ml = precio_tienda_regular where es_decant and id_decant_grupo is null and mililitros = 10;

-- 4b. Sube el precio de cada hija a su raíz, según el tamaño de la hija.
update perfumes r set precio_3ml = h.precio_tienda_regular
from perfumes h where h.id_decant_grupo = r.id and h.mililitros = 3;

update perfumes r set precio_5ml = h.precio_tienda_regular
from perfumes h where h.id_decant_grupo = r.id and h.mililitros = 5;

update perfumes r set precio_10ml = h.precio_tienda_regular
from perfumes h where h.id_decant_grupo = r.id and h.mililitros = 10;

-- 4c. Oculta las hijas (nunca se borran -- pueden tener pedidos en su historial,
-- y detalle_pedido las referencia sin on delete cascade). La raíz sigue activa
-- y desde ahora representa a la familia entera.
update perfumes set activo = false where es_decant and id_decant_grupo is not null;

-- 4d. mililitros de la raíz pasa a significar "Total frasco (ml)" -- 100 es
-- el tamaño real de frasco que maneja el negocio hoy; el dueño puede
-- corregirlo por perfume desde el admin si alguno es distinto.
-- mililitros_restantes queda sin dato (null) hasta que se cargue a mano.
update perfumes set mililitros = 100 where es_decant and id_decant_grupo is null;
