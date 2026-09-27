-- ==========================================================
-- MIGRACIÓN 0018 — Inventario real (frascos cerrados/abiertos), kardex de
-- movimientos, gastos para la contabilidad, pedidos registrados a mano desde
-- el admin (WhatsApp / tienda física, con o sin cuenta del cliente) y anulación
-- de pedidos que devuelve el stock.
--
-- Qué cambia:
--  1. inventario.frascos_abiertos: cuántos frascos hay ABIERTOS para decantar
--     (en la fila del decant). stock_fisico sigue siendo los frascos CERRADOS
--     que se venden en tienda (en la fila del perfume entero).
--  2. perfumes.id_perfume_tienda: en un decant, apunta al perfume entero de
--     tienda del que salen sus frascos -- así "Abrir frasco" descuenta 1 cerrado
--     de tienda y suma 1 abierto al decant en un solo paso.
--  3. movimientos_inventario (kardex): cada cambio de stock (venta, anulación,
--     ingreso, merma, apertura de frasco, conteo) queda registrado con fecha,
--     motivo, pedido y quién lo hizo. Lo llenan triggers -- no depende de que
--     el panel se acuerde de escribirlo.
--  4. gastos: egresos del negocio (mercadería, envíos, empaques...) para que la
--     Contabilidad calcule la utilidad del mes.
--  5. pedidos: id_cliente pasa a ser opcional (venta por WhatsApp o en tienda
--     sin cuenta) y cada pedido guarda una "foto" de los datos de envío
--     (nombre, DNI, teléfono, agencia, destino, quién recibe) para imprimir la
--     etiqueta aunque el cliente edite su dirección después. Canal de venta y
--     anulación (cancelado + motivo).
--  6. registrar_pedido_manual(), cancelar_pedido(), ajustar_inventario(),
--     abrir_frasco_decant(): funciones solo-Admin que hacen todo lo anterior en
--     una sola transacción.
--  7. crear_pedido_directo() (checkout web): guarda la foto de envío, descuenta
--     los ml del decant vendido y registra la venta en el kardex.
--
-- Ejecutar UNA vez en Supabase → SQL Editor, ANTES de subir los cambios del
-- panel admin (el panel nuevo ya lee estas columnas). Es idempotente: si se
-- corre dos veces no duplica nada.
-- ==========================================================

-- ---------- 1. Frascos abiertos + vínculo decant → perfume de tienda ----------
alter table inventario add column if not exists frascos_abiertos int not null default 0;
alter table inventario drop constraint if exists chk_frascos_abiertos_no_negativo;
alter table inventario add constraint chk_frascos_abiertos_no_negativo check (frascos_abiertos >= 0);

-- Con stock real (1 a 15 frascos por perfume), la alerta de 5 marcaba casi todo el catálogo
-- como "stock bajo". 2 avisa cuando de verdad queda poco; se sigue pudiendo editar por perfume.
alter table inventario alter column stock_minimo_alerta set default 2;
update inventario set stock_minimo_alerta = 2 where stock_minimo_alerta = 5;

alter table perfumes add column if not exists id_perfume_tienda bigint references perfumes(id) on delete set null;
alter table perfumes drop constraint if exists chk_perfume_tienda_solo_decant;
alter table perfumes add constraint chk_perfume_tienda_solo_decant
    check (id_perfume_tienda is null or (es_decant and id_perfume_tienda <> id));
create index if not exists idx_perfumes_perfume_tienda on perfumes(id_perfume_tienda) where id_perfume_tienda is not null;

comment on column inventario.frascos_abiertos is 'Solo decants: frascos abiertos que se están usando para decantar. stock_fisico = frascos cerrados (en la fila del perfume entero de tienda).';
comment on column perfumes.id_perfume_tienda is 'Solo decants: perfume entero de tienda del que salen sus frascos (Abrir frasco descuenta 1 cerrado de ese perfume).';

-- ---------- 2. Kardex de movimientos de inventario ----------
create table if not exists movimientos_inventario (
    id bigint generated always as identity primary key,
    id_producto bigint not null references perfumes(id) on delete cascade,
    tipo varchar(30) not null check (tipo in ('Ingreso', 'Venta', 'Anulacion_Venta', 'Apertura_Decant', 'Frasco_Terminado', 'Ajuste', 'Merma', 'Conteo')),
    delta_cerrados int not null default 0,
    delta_abiertos int not null default 0,
    delta_ml numeric(7,1) not null default 0,
    cerrados_resultante int,
    abiertos_resultante int,
    ml_resultante numeric(7,1),
    id_pedido bigint references pedidos(id) on delete set null,
    nota text,
    id_usuario uuid references perfiles(id) on delete set null,
    fecha timestamp not null default now()
);
create index if not exists idx_movimientos_fecha on movimientos_inventario(fecha desc);
create index if not exists idx_movimientos_producto on movimientos_inventario(id_producto, fecha desc);

alter table movimientos_inventario enable row level security;
drop policy if exists "movimientos admin lee" on movimientos_inventario;
create policy "movimientos admin lee" on movimientos_inventario for select using (is_admin());
-- Sin policy de insert/update/delete a propósito: solo los triggers de abajo (security
-- definer) escriben acá, así el historial no se puede maquillar desde el navegador.

-- El motivo de cada cambio lo fijan las funciones de abajo con set_config('zadaca.motivo', ...)
-- dentro de su transacción. Si el stock se cambia por otro camino (tarjeta de producto del
-- admin, SQL Editor) queda como 'Ajuste'. zadaca.sin_log = '1' apaga el registro (solo lo usa
-- el script de carga inicial para no llenar el kardex de ceros).
create or replace function fn_log_movimiento_inventario() returns trigger as $$
declare
    v_motivo text := coalesce(nullif(current_setting('zadaca.motivo', true), ''), 'Ajuste');
    v_pedido text := nullif(current_setting('zadaca.id_pedido', true), '');
    v_nota text := nullif(current_setting('zadaca.nota', true), '');
begin
    if coalesce(current_setting('zadaca.sin_log', true), '') = '1' then
        return null;
    end if;
    if new.stock_fisico is distinct from old.stock_fisico or new.frascos_abiertos is distinct from old.frascos_abiertos then
        insert into movimientos_inventario (id_producto, tipo, delta_cerrados, delta_abiertos, cerrados_resultante, abiertos_resultante, id_pedido, nota, id_usuario)
        values (
            new.id_producto, v_motivo,
            coalesce(new.stock_fisico, 0) - coalesce(old.stock_fisico, 0),
            coalesce(new.frascos_abiertos, 0) - coalesce(old.frascos_abiertos, 0),
            new.stock_fisico, new.frascos_abiertos,
            v_pedido::bigint, v_nota, auth.uid()
        );
    end if;
    return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_log_movimiento_inventario on inventario;
create trigger trg_log_movimiento_inventario
after update of stock_fisico, frascos_abiertos on inventario
for each row execute function fn_log_movimiento_inventario();

create or replace function fn_log_movimiento_ml() returns trigger as $$
declare
    v_motivo text := coalesce(nullif(current_setting('zadaca.motivo', true), ''), 'Ajuste');
    v_pedido text := nullif(current_setting('zadaca.id_pedido', true), '');
    v_nota text := nullif(current_setting('zadaca.nota', true), '');
begin
    if coalesce(current_setting('zadaca.sin_log', true), '') = '1' then
        return null;
    end if;
    if new.mililitros_restantes is distinct from old.mililitros_restantes then
        insert into movimientos_inventario (id_producto, tipo, delta_ml, ml_resultante, id_pedido, nota, id_usuario)
        values (
            new.id, v_motivo,
            coalesce(new.mililitros_restantes, 0) - coalesce(old.mililitros_restantes, 0),
            new.mililitros_restantes,
            v_pedido::bigint, v_nota, auth.uid()
        );
    end if;
    return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_log_movimiento_ml on perfumes;
create trigger trg_log_movimiento_ml
after update of mililitros_restantes on perfumes
for each row execute function fn_log_movimiento_ml();

-- ---------- 3. Gastos (contabilidad) ----------
create table if not exists gastos (
    id bigint generated always as identity primary key,
    fecha date not null default current_date,
    categoria varchar(40) not null default 'Otros' check (categoria in ('Mercadería', 'Envíos', 'Empaques', 'Publicidad', 'Alquiler', 'Servicios', 'Sueldos', 'Impuestos', 'Otros')),
    descripcion varchar(200) not null,
    monto numeric(10,2) not null check (monto > 0),
    metodo_pago varchar(50),
    id_admin uuid references perfiles(id) on delete set null default auth.uid(),
    fecha_registro timestamp not null default now()
);
create index if not exists idx_gastos_fecha on gastos(fecha);

alter table gastos enable row level security;
drop policy if exists "gastos solo admin" on gastos;
create policy "gastos solo admin" on gastos for all using (is_admin()) with check (is_admin());

-- ---------- 4. Pedidos: cliente opcional, foto de envío, canal y anulación ----------
alter table pedidos alter column id_cliente drop not null;

alter table pedidos
    add column if not exists canal varchar(20) not null default 'Web',
    add column if not exists cliente_nombre varchar(150),
    add column if not exists cliente_dni varchar(15),
    add column if not exists cliente_telefono varchar(20),
    add column if not exists envio_tipo varchar(30),
    add column if not exists envio_agencia varchar(150),
    add column if not exists envio_departamento varchar(50),
    add column if not exists envio_provincia varchar(50),
    add column if not exists envio_distrito varchar(50),
    add column if not exists envio_direccion text,
    add column if not exists envio_receptor_nombre varchar(150),
    add column if not exists envio_receptor_dni varchar(15),
    add column if not exists envio_receptor_telefono varchar(20),
    add column if not exists cancelado boolean not null default false,
    add column if not exists fecha_cancelacion timestamp,
    add column if not exists motivo_cancelacion text,
    -- true = al crearse este pedido ya se descontaron los ml de sus decants (desde esta
    -- migración). Los pedidos anteriores nunca los descontaron, así que anularlos no debe
    -- "devolver" ml que nunca salieron del frasco.
    add column if not exists ml_descontado boolean not null default false;
alter table pedidos alter column ml_descontado set default true;

alter table pedidos drop constraint if exists chk_pedido_canal;
alter table pedidos add constraint chk_pedido_canal check (canal in ('Web', 'WhatsApp', 'Tienda', 'Instagram', 'Facebook', 'TikTok', 'Otro'));
alter table pedidos drop constraint if exists chk_pedido_envio_tipo;
alter table pedidos add constraint chk_pedido_envio_tipo check (envio_tipo is null or envio_tipo in ('Domicilio', 'Agencia_Shalom', 'Agencia_Olva', 'Recojo_En_Tienda'));
alter table pedidos drop constraint if exists chk_pedido_tiene_cliente;
alter table pedidos add constraint chk_pedido_tiene_cliente check (id_cliente is not null or cliente_nombre is not null);

create index if not exists idx_pedidos_fecha on pedidos(fecha_creacion);

-- Notas internas del admin en tabla aparte (no en "pedidos"): la policy "pedidos propios"
-- deja al cliente leer TODAS las columnas de su pedido, y una nota interna ("no contesta",
-- "debe saldo") no debe llegarle nunca.
create table if not exists pedidos_notas_admin (
    id_pedido bigint primary key references pedidos(id) on delete cascade,
    nota text not null default '',
    actualizado_en timestamp not null default now()
);
alter table pedidos_notas_admin enable row level security;
drop policy if exists "notas pedido solo admin" on pedidos_notas_admin;
create policy "notas pedido solo admin" on pedidos_notas_admin for all using (is_admin()) with check (is_admin());

-- Foto de envío para los pedidos que ya existían (desde el perfil y la dirección elegida).
update pedidos pe set
    cliente_nombre = coalesce(pe.cliente_nombre, nullif(trim(coalesce(pf.nombres, '') || ' ' || coalesce(pf.apellidos, '')), '')),
    cliente_dni = coalesce(pe.cliente_dni, pf.dni_ce_ruc),
    cliente_telefono = coalesce(pe.cliente_telefono, pf.telefono)
from perfiles pf
where pf.id = pe.id_cliente and pe.cliente_nombre is null;

update pedidos pe set
    envio_tipo = coalesce(pe.envio_tipo, d.tipo_despacho),
    envio_agencia = coalesce(pe.envio_agencia, d.agencia_nombre),
    envio_direccion = coalesce(pe.envio_direccion, d.direccion_detalle),
    envio_departamento = coalesce(pe.envio_departamento, u.departamento),
    envio_provincia = coalesce(pe.envio_provincia, u.provincia),
    envio_distrito = coalesce(pe.envio_distrito, u.distrito),
    envio_receptor_nombre = coalesce(pe.envio_receptor_nombre, d.nombre_receptor)
from direcciones_cliente d
left join ubigeo u on u.codigo_ubigeo = d.codigo_ubigeo
where d.id = pe.id_direccion_entrega and pe.envio_tipo is null;

-- ---------- 5. Notificación de pago: sin cuenta no hay a quién notificar ----------
-- Un pedido registrado a mano puede no tener id_cliente -- sin este "if", registrarle un
-- pago intentaba insertar una notificación con id_cliente null y el pago entero fallaba.
create or replace function fn_notificar_pago() returns trigger as $$
declare
    v_cliente uuid;
    v_saldo numeric(10,2);
begin
    if (TG_OP = 'INSERT' and new.estado_pago = 'Aprobado')
       or (TG_OP = 'UPDATE' and new.estado_pago is distinct from old.estado_pago) then
        select id_cliente, monto_saldo_pendiente into v_cliente, v_saldo from pedidos where id = new.id_pedido;
        if v_cliente is null then
            return new;
        end if;
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

-- ---------- 6. Checkout web: foto de envío + ml de decants + kardex ----------
-- Mismo cuerpo que la versión de la migración 0016 (precio por talla, decants sin stock por
-- unidad), con tres agregados: guarda los datos de envío en el pedido, descuenta los ml del
-- frasco del decant vendido (si el admin lleva ese dato) y marca la venta en el kardex.
create or replace function crear_pedido_directo(p_id_direccion bigint) returns bigint as $$
declare
    v_id_pedido bigint;
    v_monto_total numeric(10,2) := 0;
    v_item record;
    v_perfil record;
    v_dir record;
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

    select nombres, apellidos, dni_ce_ruc, telefono into v_perfil from perfiles where id = auth.uid();
    select d.tipo_despacho, d.agencia_nombre, d.direccion_detalle, d.nombre_receptor, u.departamento, u.provincia, u.distrito
      into v_dir
      from direcciones_cliente d left join ubigeo u on u.codigo_ubigeo = d.codigo_ubigeo
      where d.id = p_id_direccion;

    insert into pedidos (
        id_cliente, tipo_pedido, id_direccion_entrega, monto_total, monto_saldo_pendiente, canal,
        cliente_nombre, cliente_dni, cliente_telefono,
        envio_tipo, envio_agencia, envio_departamento, envio_provincia, envio_distrito, envio_direccion, envio_receptor_nombre
    )
    values (
        auth.uid(), 'Directo_Tienda', p_id_direccion, v_monto_total, v_monto_total, 'Web',
        nullif(trim(coalesce(v_perfil.nombres, '') || ' ' || coalesce(v_perfil.apellidos, '')), ''), v_perfil.dni_ce_ruc, v_perfil.telefono,
        v_dir.tipo_despacho, v_dir.agencia_nombre, v_dir.departamento, v_dir.provincia, v_dir.distrito, v_dir.direccion_detalle, v_dir.nombre_receptor
    )
    returning id into v_id_pedido;

    perform set_config('zadaca.motivo', 'Venta', true);
    perform set_config('zadaca.id_pedido', v_id_pedido::text, true);
    perform set_config('zadaca.nota', 'Venta web', true);

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

        if v_item.es_decant then
            update perfumes
            set mililitros_restantes = greatest(mililitros_restantes - (v_item.talla_ml * v_item.cantidad), 0)
            where id = v_item.id_producto and mililitros_restantes is not null and v_item.talla_ml > 0;
        else
            update inventario set stock_fisico = stock_fisico - v_item.cantidad where id_producto = v_item.id_producto;
        end if;
    end loop;

    insert into envios (id_pedido, estado_envio) values (v_id_pedido, 'Preparando');
    delete from carrito_items where id_cliente = auth.uid();

    return v_id_pedido;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 7. Pedido registrado a mano desde el admin ----------
-- p_pedido: { canal, id_cliente?, cliente_nombre, cliente_dni, cliente_telefono, envio_tipo,
--             envio_agencia, envio_departamento, envio_provincia, envio_distrito,
--             envio_direccion, envio_receptor_nombre, envio_receptor_dni,
--             envio_receptor_telefono, estado_envio, notas_admin }
-- p_items:  [{ id_producto, cantidad, talla_ml (3/5/10 solo decants), precio? }]  -- precio
--           vacío = el de catálogo; si viene, es el precio pactado con el cliente.
-- p_pago:   { monto, metodo_pago } opcional -- pago/adelanto recibido en el momento.
-- Valida stock (sumado por perfume), descuenta frascos cerrados / ml de decant, registra la
-- venta en el kardex, crea el envío y el pago inicial. Devuelve el id del pedido.
create or replace function registrar_pedido_manual(p_pedido jsonb, p_items jsonb, p_pago jsonb default null) returns bigint as $$
declare
    v_id_pedido bigint;
    v_total numeric(10,2) := 0;
    v_item jsonb;
    v_prod record;
    v_falta record;
    v_cantidad int;
    v_talla int;
    v_precio numeric(10,2);
    v_lineas jsonb := '[]'::jsonb;
    v_nombre text := nullif(trim(p_pedido->>'cliente_nombre'), '');
    v_canal text := coalesce(nullif(p_pedido->>'canal', ''), 'WhatsApp');
    v_envio_tipo text := nullif(p_pedido->>'envio_tipo', '');
    v_estado_envio text := coalesce(nullif(p_pedido->>'estado_envio', ''), 'Preparando');
    v_id_cliente uuid := nullif(p_pedido->>'id_cliente', '')::uuid;
    v_monto_pago numeric(10,2) := nullif(p_pago->>'monto', '')::numeric;
    v_nota text := nullif(trim(p_pedido->>'notas_admin'), '');
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    if v_nombre is null then
        raise exception 'Ingresa el nombre del cliente';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'Agrega al menos un producto al pedido';
    end if;
    if v_id_cliente is not null and not exists (select 1 from perfiles where id = v_id_cliente) then
        v_id_cliente := null;
    end if;
    if v_estado_envio not in ('Preparando', 'En_Agencia', 'En_Ruta', 'Entregado', 'Devuelto') then
        v_estado_envio := 'Preparando';
    end if;

    -- 1) Precio de cada línea (el de catálogo, o el pactado si el admin lo escribió)
    for v_item in select value from jsonb_array_elements(p_items) loop
        v_cantidad := coalesce(nullif(v_item->>'cantidad', '')::int, 0);
        v_talla := coalesce(nullif(v_item->>'talla_ml', '')::int, 0);
        if v_cantidad <= 0 then
            raise exception 'La cantidad de cada producto debe ser mayor a 0';
        end if;

        select p.id, p.nombre, p.marca, p.es_decant, p.es_liquidacion, p.precio_liquidacion,
               p.precio_tienda_regular, p.descuento_tienda_porcentaje, p.precio_3ml, p.precio_5ml, p.precio_10ml
          into v_prod
          from perfumes p where p.id = nullif(v_item->>'id_producto', '')::bigint;
        if not found then
            raise exception 'Producto no encontrado (#%)', v_item->>'id_producto';
        end if;

        if v_prod.es_decant then
            if v_talla not in (3, 5, 10) then
                raise exception 'Elige la talla (3, 5 o 10 ml) del decant %', v_prod.nombre;
            end if;
        else
            v_talla := 0;
        end if;

        v_precio := nullif(v_item->>'precio', '')::numeric;
        if v_precio is null then
            v_precio := case
                when v_prod.es_decant and v_talla = 3 then v_prod.precio_3ml
                when v_prod.es_decant and v_talla = 5 then v_prod.precio_5ml
                when v_prod.es_decant and v_talla = 10 then v_prod.precio_10ml
                when v_prod.es_liquidacion then v_prod.precio_liquidacion
                else round(v_prod.precio_tienda_regular * (1 - coalesce(v_prod.descuento_tienda_porcentaje, 0) / 100.0), 2)
            end;
        end if;
        if v_precio is null or v_precio <= 0 then
            raise exception 'Falta el precio de % — % (%)', v_prod.marca, v_prod.nombre, case when v_talla > 0 then v_talla || 'ml' else 'entero' end;
        end if;

        v_lineas := v_lineas || jsonb_build_object('id_producto', v_prod.id, 'cantidad', v_cantidad, 'talla_ml', v_talla, 'precio', v_precio, 'es_decant', v_prod.es_decant);
        v_total := v_total + v_cantidad * v_precio;
    end loop;

    -- 2) Stock de frascos cerrados, sumado por perfume (dos líneas del mismo perfume salen del
    --    mismo stock). Los decants no se validan por unidad: salen del frasco abierto.
    for v_falta in
        select p.marca, p.nombre, sum((l->>'cantidad')::int) as pide, coalesce(max(i.stock_fisico), 0) as hay
        from jsonb_array_elements(v_lineas) l
        join perfumes p on p.id = (l->>'id_producto')::bigint
        left join inventario i on i.id_producto = p.id
        where not (l->>'es_decant')::boolean
        group by p.id, p.marca, p.nombre
        having sum((l->>'cantidad')::int) > coalesce(max(i.stock_fisico), 0)
    loop
        raise exception 'Stock insuficiente: % — % (quedan %, el pedido pide %)', v_falta.marca, v_falta.nombre, v_falta.hay, v_falta.pide;
    end loop;

    insert into pedidos (
        id_cliente, tipo_pedido, monto_total, monto_saldo_pendiente, canal,
        cliente_nombre, cliente_dni, cliente_telefono,
        envio_tipo, envio_agencia, envio_departamento, envio_provincia, envio_distrito, envio_direccion,
        envio_receptor_nombre, envio_receptor_dni, envio_receptor_telefono
    )
    values (
        v_id_cliente, 'Directo_Tienda', v_total, v_total, v_canal,
        v_nombre, nullif(trim(p_pedido->>'cliente_dni'), ''), nullif(trim(p_pedido->>'cliente_telefono'), ''),
        v_envio_tipo, nullif(trim(p_pedido->>'envio_agencia'), ''), nullif(p_pedido->>'envio_departamento', ''),
        nullif(p_pedido->>'envio_provincia', ''), nullif(p_pedido->>'envio_distrito', ''), nullif(trim(p_pedido->>'envio_direccion'), ''),
        nullif(trim(p_pedido->>'envio_receptor_nombre'), ''), nullif(trim(p_pedido->>'envio_receptor_dni'), ''), nullif(trim(p_pedido->>'envio_receptor_telefono'), '')
    )
    returning id into v_id_pedido;

    perform set_config('zadaca.motivo', 'Venta', true);
    perform set_config('zadaca.id_pedido', v_id_pedido::text, true);
    perform set_config('zadaca.nota', 'Venta ' || v_canal, true);

    for v_item in select value from jsonb_array_elements(v_lineas) loop
        insert into detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_aplicado, talla_ml)
        values (v_id_pedido, (v_item->>'id_producto')::bigint, (v_item->>'cantidad')::int, (v_item->>'precio')::numeric, (v_item->>'talla_ml')::int);

        if (v_item->>'es_decant')::boolean then
            update perfumes
            set mililitros_restantes = greatest(mililitros_restantes - ((v_item->>'talla_ml')::int * (v_item->>'cantidad')::int), 0)
            where id = (v_item->>'id_producto')::bigint and mililitros_restantes is not null;
        else
            update inventario set stock_fisico = stock_fisico - (v_item->>'cantidad')::int
            where id_producto = (v_item->>'id_producto')::bigint;
        end if;
    end loop;

    insert into envios (id_pedido, estado_envio, empresa_transporte)
    values (
        v_id_pedido, v_estado_envio,
        case v_envio_tipo when 'Agencia_Shalom' then 'Shalom' when 'Agencia_Olva' then 'Olva' else null end
    );

    if v_nota is not null then
        insert into pedidos_notas_admin (id_pedido, nota) values (v_id_pedido, v_nota);
    end if;

    if v_monto_pago is not null and v_monto_pago > 0 then
        insert into pagos (id_pedido, monto, tipo_pago, metodo_pago)
        values (
            v_id_pedido, least(v_monto_pago, v_total),
            case when v_monto_pago >= v_total then 'Saldo_Final' else 'Adelanto' end,
            nullif(p_pago->>'metodo_pago', '')
        );
    end if;

    return v_id_pedido;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function registrar_pedido_manual(jsonb, jsonb, jsonb) to authenticated;

-- ---------- 8. Anular pedido (devuelve el stock) ----------
-- Los pagos ya registrados NO se tocan: si hubo que devolver dinero, el admin anula el pago
-- aparte (así la contabilidad refleja exactamente lo que pasó).
create or replace function cancelar_pedido(p_id_pedido bigint, p_motivo text default null) returns void as $$
declare
    v_pedido record;
    v_item record;
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    select id, id_cliente, tipo_pedido, cancelado, ml_descontado into v_pedido from pedidos where id = p_id_pedido for update;
    if not found then
        raise exception 'Pedido no encontrado';
    end if;
    if v_pedido.cancelado then
        raise exception 'Este pedido ya está anulado';
    end if;

    perform set_config('zadaca.motivo', 'Anulacion_Venta', true);
    perform set_config('zadaca.id_pedido', p_id_pedido::text, true);
    perform set_config('zadaca.nota', coalesce(nullif(trim(p_motivo), ''), 'Pedido anulado'), true);

    -- Un pedido de consolidado nunca descontó stock (se importa bajo pedido): no hay nada que devolver.
    if v_pedido.tipo_pedido = 'Directo_Tienda' then
        for v_item in
            select d.id_producto, d.cantidad, d.talla_ml, p.es_decant
            from detalle_pedido d join perfumes p on p.id = d.id_producto
            where d.id_pedido = p_id_pedido
        loop
            if v_item.es_decant then
                if v_pedido.ml_descontado then
                    update perfumes set mililitros_restantes = mililitros_restantes + (v_item.talla_ml * v_item.cantidad)
                    where id = v_item.id_producto and mililitros_restantes is not null and v_item.talla_ml > 0;
                end if;
            else
                update inventario set stock_fisico = stock_fisico + v_item.cantidad where id_producto = v_item.id_producto;
            end if;
        end loop;
    end if;

    update pedidos
    set cancelado = true, fecha_cancelacion = now(), motivo_cancelacion = nullif(trim(p_motivo), '')
    where id = p_id_pedido;

    if v_pedido.id_cliente is not null then
        insert into notificaciones (id_cliente, tipo, titulo, mensaje, url_destino)
        values (v_pedido.id_cliente, 'Pedido', 'Tu pedido fue anulado',
                'Anulamos tu pedido #' || p_id_pedido || '. Si tienes dudas, escríbenos por WhatsApp.', 'cuenta/?tab=pedidos');
    end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function cancelar_pedido(bigint, text) to authenticated;

-- ---------- 9. Ajustes de inventario desde el panel ----------
-- p_es_delta = true: suma/resta (ingreso de mercadería, merma, frasco terminado).
-- p_es_delta = false: fija el valor exacto (conteo físico). null = no tocar ese dato.
-- Un decant que se queda sin frascos abiertos pasa solo a Agotado (y vuelve a Disponible
-- apenas se le suma uno), para no vender un decant que ya no se puede servir.
create or replace function ajustar_inventario(
    p_id_producto bigint,
    p_cerrados int default null,
    p_abiertos int default null,
    p_ml numeric default null,
    p_es_delta boolean default true,
    p_motivo text default 'Ajuste',
    p_nota text default null
) returns void as $$
declare
    v_actual record;
    v_nuevo_cerrados int;
    v_nuevo_abiertos int;
    v_es_decant boolean;
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    if p_motivo not in ('Ingreso', 'Ajuste', 'Merma', 'Conteo', 'Frasco_Terminado') then
        raise exception 'Motivo no válido: %', p_motivo;
    end if;
    select es_decant into v_es_decant from perfumes where id = p_id_producto;
    if not found then
        raise exception 'Producto no encontrado';
    end if;

    insert into inventario (id_producto) values (p_id_producto) on conflict (id_producto) do nothing;
    select stock_fisico, frascos_abiertos into v_actual from inventario where id_producto = p_id_producto for update;

    v_nuevo_cerrados := case when p_cerrados is null then v_actual.stock_fisico
                             when p_es_delta then v_actual.stock_fisico + p_cerrados else p_cerrados end;
    v_nuevo_abiertos := case when p_abiertos is null then v_actual.frascos_abiertos
                             when p_es_delta then v_actual.frascos_abiertos + p_abiertos else p_abiertos end;
    if v_nuevo_cerrados < 0 then
        raise exception 'No hay suficientes frascos cerrados (quedan %)', v_actual.stock_fisico;
    end if;
    if v_nuevo_abiertos < 0 then
        raise exception 'No hay frascos abiertos para descontar (quedan %)', v_actual.frascos_abiertos;
    end if;

    perform set_config('zadaca.motivo', p_motivo, true);
    perform set_config('zadaca.nota', coalesce(nullif(trim(p_nota), ''), ''), true);
    perform set_config('zadaca.id_pedido', '', true);

    update inventario
    set stock_fisico = v_nuevo_cerrados, frascos_abiertos = v_nuevo_abiertos
    where id_producto = p_id_producto;

    if p_ml is not null then
        update perfumes
        set mililitros_restantes = case when p_es_delta then greatest(coalesce(mililitros_restantes, 0) + p_ml, 0) else greatest(p_ml, 0) end
        where id = p_id_producto;
    end if;

    if v_es_decant and p_abiertos is not null then
        update perfumes
        set estado = case when v_nuevo_abiertos = 0 then 'Agotado'
                          when estado = 'Agotado' then 'Disponible'
                          else estado end
        where id = p_id_producto;
    end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function ajustar_inventario(bigint, int, int, numeric, boolean, text, text) to authenticated;

-- ---------- 10. Abrir un frasco para decantar ----------
-- Descuenta 1 frasco cerrado del perfume de tienda vinculado (si p_descontar_tienda) y suma
-- 1 abierto + la capacidad del frasco en ml al decant. Si el decant estaba Agotado, vuelve a
-- Disponible.
create or replace function abrir_frasco_decant(p_id_decant bigint, p_descontar_tienda boolean default true, p_nota text default null) returns void as $$
declare
    v_decant record;
    v_ml_frasco int;
    v_cerrados int;
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    select id, nombre, es_decant, mililitros, id_perfume_tienda into v_decant from perfumes where id = p_id_decant;
    if not found or not v_decant.es_decant then
        raise exception 'El producto elegido no es un decant';
    end if;

    perform set_config('zadaca.motivo', 'Apertura_Decant', true);
    perform set_config('zadaca.nota', coalesce(nullif(trim(p_nota), ''), 'Frasco abierto para decants'), true);
    perform set_config('zadaca.id_pedido', '', true);

    v_ml_frasco := v_decant.mililitros;
    if p_descontar_tienda then
        if v_decant.id_perfume_tienda is null then
            raise exception 'Este decant no está vinculado a un perfume de tienda. Vincúlalo en Inventario o abre el frasco sin descontar de tienda.';
        end if;
        select i.stock_fisico, p.mililitros into v_cerrados, v_ml_frasco
        from inventario i join perfumes p on p.id = i.id_producto
        where i.id_producto = v_decant.id_perfume_tienda
        for update of i;
        if coalesce(v_cerrados, 0) <= 0 then
            raise exception 'No quedan frascos cerrados de este perfume en tienda';
        end if;
        update inventario set stock_fisico = stock_fisico - 1 where id_producto = v_decant.id_perfume_tienda;
    end if;

    insert into inventario (id_producto) values (p_id_decant) on conflict (id_producto) do nothing;
    update inventario set frascos_abiertos = frascos_abiertos + 1 where id_producto = p_id_decant;
    update perfumes
    set mililitros_restantes = coalesce(mililitros_restantes, 0) + coalesce(v_ml_frasco, mililitros),
        estado = case when estado = 'Agotado' then 'Disponible' else estado end
    where id = p_id_decant;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function abrir_frasco_decant(bigint, boolean, text) to authenticated;

-- ==========================================================
-- FIN. Verifica (deberían devolver filas sin error):
--   select frascos_abiertos from inventario limit 1;
--   select count(*) from movimientos_inventario;
--   select count(*) from gastos;
--   select canal, cliente_nombre, cancelado from pedidos limit 5;
-- Después corre supabase/cargar_stock_real_sep2026.sql para cargar el stock real.
-- ==========================================================
