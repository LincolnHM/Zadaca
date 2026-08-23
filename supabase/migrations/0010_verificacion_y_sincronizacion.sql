-- ==========================================================
-- MIGRACIÓN 0010 — Verificación y sincronización completa
--
-- Script idempotente: seguro de ejecutar en el SQL Editor de Supabase las
-- veces que haga falta, sin importar si tu base ya tiene aplicadas todas,
-- algunas, o ninguna de las migraciones 0001-0009. Cada pieza usa
-- "if not exists" / "create or replace" / "drop ... if exists + create",
-- así que si algo ya estaba, simplemente lo deja igual (no duplica nada,
-- no borra datos, no falla por "ya existe").
--
-- Qué hace: deja en su versión FINAL correcta todo lo que fueron agregando
-- las migraciones 0001 a 0009 -- columnas de liquidaciones y tipo de casa,
-- la tabla de descuentos por volumen, el tope de aprobación de reservas
-- grandes, el stock de tienda separado del de consolidados, las URLs
-- limpias en las notificaciones, etc. Es la fuente de verdad para "¿mi
-- base de datos tiene todo activo?" -- después de correr esto, sí.
--
-- Ejecutar completo en el SQL Editor de tu proyecto Supabase (producción).
-- ==========================================================

-- ========================================================================
-- 1) COLUMNAS DE LIQUIDACIONES en perfumes (migración 0004)
-- ========================================================================
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

create or replace function fn_validar_minimo_liquidacion() returns trigger as $$
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

-- ========================================================================
-- 2) DESCUENTO POR VOLUMEN en consolidados (migración 0005)
-- ========================================================================
create table if not exists descuentos_volumen_consolidado (
    id bigint generated always as identity primary key,
    umbral_soles numeric(10,2) not null unique check (umbral_soles > 0),
    descuento_por_unidad numeric(10,2) not null check (descuento_por_unidad >= 0)
);

insert into descuentos_volumen_consolidado (umbral_soles, descuento_por_unidad) values
    (1000, 2), (5000, 4), (10000, 6), (30000, 8)
on conflict (umbral_soles) do nothing;

alter table descuentos_volumen_consolidado enable row level security;
drop policy if exists "descuentos volumen publico" on descuentos_volumen_consolidado;
create policy "descuentos volumen publico" on descuentos_volumen_consolidado for select using (true);
drop policy if exists "descuentos volumen admin escribe" on descuentos_volumen_consolidado;
create policy "descuentos volumen admin escribe" on descuentos_volumen_consolidado for all using (is_admin()) with check (is_admin());

create or replace function fn_descuento_por_monto(p_monto numeric) returns numeric as $$
    select coalesce(max(descuento_por_unidad), 0)
    from descuentos_volumen_consolidado
    where umbral_soles <= p_monto;
$$ language sql stable set search_path = public;

create or replace function progreso_volumen_consolidado(p_id_consolidado bigint)
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

-- ========================================================================
-- 3) APROBACIÓN DE RESERVAS GRANDES + STOCK DE TIENDA SEPARADO (migración 0006)
-- ========================================================================
alter table detalle_consolidado drop constraint if exists detalle_consolidado_estado_item_check;
alter table detalle_consolidado add constraint detalle_consolidado_estado_item_check
    check (estado_item in ('Reservado', 'Pendiente_Aprobacion', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'));

-- Elimina cualquier variante vieja (3 argumentos, de antes de la 0001) que pudiera seguir
-- viva en la base -- create or replace no reemplaza una función con una firma distinta.
drop function if exists reservar_en_consolidado(bigint, bigint, int);

-- Versión FINAL de reservar_en_consolidado (incorpora 0001 + 0005 + 0006: cierre por fecha,
-- dirección de entrega, descuento por volumen acumulado, y tope de aprobación en 10+ unidades
-- de un mismo perfume).
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

grant select on consolidado_resumen_publico to anon, authenticated;

-- stock_disponible de TIENDA ya no descuenta lo reservado en consolidados (son inventarios
-- independientes). Recrear la columna generada es seguro: es 100% derivada, no hay dato que
-- se pierda.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_name = 'inventario' and column_name = 'stock_disponible'
    ) then
        alter table inventario drop column stock_disponible;
    end if;
    alter table inventario add column stock_disponible int generated always as (stock_fisico) stored;
end $$;

update consolidados c set total_unidades_acumuladas = coalesce((
    select sum(cantidad) from detalle_consolidado where id_consolidado = c.id and estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
), 0);
update inventario i set stock_reservado_consolidados = coalesce((
    select sum(cantidad) from detalle_consolidado where id_producto = i.id_producto and estado_item not in ('Cancelado', 'Pendiente_Aprobacion')
), 0);

-- crear_pedido_directo(): versión final (0004) -- usa precio_liquidacion cuando corresponde.
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

-- generar_pedidos_de_consolidado(): sin cambios desde la 0001, se incluye acá para que este
-- script sea autosuficiente (no dependa de que la 0001 se haya corrido antes por separado).
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

-- ========================================================================
-- 4) TIPO DE CASA de perfumería (migración 0007)
-- ========================================================================
alter table perfumes add column if not exists tipo_casa varchar(20) check (tipo_casa in ('Árabe', 'Diseñador', 'Nicho'));
create index if not exists idx_perfumes_tipo_casa on perfumes(tipo_casa);

-- "and tipo_casa is null": no pisa clasificaciones que ya hayas corregido a mano desde el
-- panel admin en una corrida anterior de este mismo script.
update perfumes set tipo_casa = 'Árabe'
where tipo_casa is null and marca in ('Afnan', 'Al Haramain', 'Armaf', 'Bharara', 'Fragrance World', 'French Avenue', 'Lattafa', 'Lattafa Pride', 'Paris Corner', 'Rasasi');

update perfumes set tipo_casa = 'Diseñador'
where tipo_casa is null and marca in ('Azzaro', 'Burberry', 'Carolina Herrera', 'Chanel', 'Dior', 'Dolce & Gabbana', 'Emporio Armani', 'Giorgio Armani', 'Givenchy', 'Jean Paul Gaultier', 'Nautica', 'Paco Rabanne', 'Valentino', 'Versace', 'Yves Saint Laurent');

update perfumes set tipo_casa = 'Nicho'
where tipo_casa is null and marca in ('Mancera', 'Montale', 'Xerjoff');

-- ========================================================================
-- 5) BANDERA "activo" para ocultar productos sin borrarlos (migración 0008)
-- ========================================================================
alter table perfumes add column if not exists activo boolean not null default true;
create index if not exists idx_perfumes_activo on perfumes(activo);

-- ========================================================================
-- 6) URLs LIMPIAS en notificaciones (migración 0009)
-- ========================================================================
create or replace function fn_notificar_cambio_consolidado() returns trigger as $$
begin
    insert into notificaciones (id_cliente, tipo, titulo, mensaje, url_destino)
    select distinct dc.id_cliente,
           'Consolidado',
           'Tu consolidado ' || c.codigo_campana || ' cambió de estado',
           coalesce(new.descripcion_publica, 'Nuevo estado: ' || new.estado),
           'consolidado/?id=' || new.id_consolidado
    from detalle_consolidado dc
    join consolidados c on c.id = dc.id_consolidado
    where dc.id_consolidado = new.id_consolidado
      and dc.estado_item <> 'Cancelado';
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function fn_notificar_cotizacion() returns trigger as $$
begin
    if new.id_cliente is not null and new.estado is distinct from old.estado then
        insert into notificaciones (id_cliente, tipo, titulo, mensaje, url_destino)
        values (
            new.id_cliente,
            'Cotizacion',
            'Tu cotización fue actualizada',
            new.marca_solicitada || ' — ' || new.nombre_perfume_solicitado || ': ' || replace(new.estado, '_', ' '),
            'cuenta/?tab=cotizaciones'
        );
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function fn_notificar_pago() returns trigger as $$
declare
    v_cliente uuid;
    v_saldo numeric(10,2);
begin
    if (TG_OP = 'INSERT' and new.estado_pago = 'Aprobado')
       or (TG_OP = 'UPDATE' and new.estado_pago is distinct from old.estado_pago) then
        select id_cliente, monto_saldo_pendiente into v_cliente, v_saldo from pedidos where id = new.id_pedido;
        insert into notificaciones (id_cliente, tipo, titulo, mensaje, url_destino)
        values (
            v_cliente,
            'Pago',
            case when new.estado_pago = 'Aprobado' then 'Registramos tu pago' else 'Corregimos un pago de tu pedido' end,
            case when new.estado_pago = 'Aprobado'
                 then 'Confirmamos tu pago de ' || to_char(new.monto, 'FM999999990.00') || ' para el pedido #' || new.id_pedido || '.'
                      || case when v_saldo > 0 then ' Saldo pendiente: ' || to_char(v_saldo, 'FM999999990.00') || '.' else ' Pedido pagado por completo.' end
                 else 'Anulamos un pago registrado en tu pedido #' || new.id_pedido || '. Si tienes dudas, escríbenos por WhatsApp.'
            end,
            'cuenta/?tab=pedidos'
        );
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

update notificaciones set url_destino = regexp_replace(url_destino, '^consolidado\.html', 'consolidado/')
where url_destino like 'consolidado.html%';

update notificaciones set url_destino = regexp_replace(url_destino, '^cuenta\.html', 'cuenta/')
where url_destino like 'cuenta.html%';

-- ========================================================================
-- 7) De 0001/0002/0003 -- ya deberían estar aplicadas, se repiten acá solo
--    para que este script sea 100% autosuficiente (no asume nada corrido antes).
-- ========================================================================
alter table detalle_consolidado add column if not exists id_direccion_entrega bigint references direcciones_cliente(id);

alter table auditoria_log enable row level security;
drop policy if exists "auditoria admin lee" on auditoria_log;
create policy "auditoria admin lee" on auditoria_log for select using (is_admin());

create or replace function fn_bloquear_autoascenso_admin() returns trigger as $$
begin
    if new.rol is distinct from old.rol and auth.uid() is not null and not is_admin() then
        new.rol := old.rol;
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ========================================================================
-- 8) SEGURIDAD -- bloquea que un cliente reescriba su propia notificación
-- ========================================================================
-- La policy "notificaciones marcar leidas" (using id_cliente = auth.uid()) deja al cliente
-- hacer un UPDATE de su propia fila, pero no restringe QUÉ columnas puede cambiar -- hoy
-- cuenta.js/main.js solo tocan "leido" desde la UI, pero cualquiera con la anon key puede
-- mandar un PATCH directo a /rest/v1/notificaciones cambiando titulo/mensaje/url_destino a lo
-- que quiera. Como los pagos se confirman por WhatsApp (no hay comprobante subido al sitio),
-- alguien podría reescribir su propia notificación para que diga "Confirmamos tu pago..." y
-- usarlo como evidencia falsa. Mismo patrón que fn_bloquear_autoascenso_admin (perfiles.rol):
-- revierte cualquier columna que no sea "leido" al valor que ya tenía, sin bloquear el UPDATE
-- entero.
create function fn_bloquear_reescritura_notificacion() returns trigger as $$
begin
    if auth.uid() is not null and not is_admin() then
        new.tipo := old.tipo;
        new.titulo := old.titulo;
        new.mensaje := old.mensaje;
        new.url_destino := old.url_destino;
        new.id_cliente := old.id_cliente;
        new.fecha_creacion := old.fecha_creacion;
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_bloquear_reescritura_notificacion on notificaciones;
create trigger trg_bloquear_reescritura_notificacion
before update on notificaciones
for each row execute function fn_bloquear_reescritura_notificacion();

-- ==========================================================
-- FIN. Verifica al terminar (debería devolver filas / valores sin error):
--   select count(*) from descuentos_volumen_consolidado;         -- 4
--   select tipo_casa, count(*) from perfumes group by 1;          -- Árabe/Diseñador/Nicho/null
--   select column_name from information_schema.columns
--     where table_name='perfumes' and column_name in
--     ('es_liquidacion','tipo_casa','activo');                    -- 3 filas
-- ==========================================================
