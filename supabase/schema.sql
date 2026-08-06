-- ==========================================================
-- MAISON ZADACA — ESQUEMA SUPABASE
-- Ejecutar completo en el SQL Editor de tu proyecto Supabase
-- ==========================================================

-- ==========================================
-- 1. UBICACIÓN Y PERFILES (auth.users ya lo maneja Supabase)
-- ==========================================
create table ubigeo (
    codigo_ubigeo char(6) primary key,
    departamento varchar(50) not null,
    provincia varchar(50) not null,
    distrito varchar(50) not null
);

create table perfiles (
    id uuid primary key references auth.users(id) on delete cascade,
    dni_ce_ruc varchar(15) unique,
    nombres varchar(100) not null,
    apellidos varchar(100) not null,
    correo varchar(150),
    telefono varchar(20),
    rol varchar(20) not null default 'Cliente' check (rol in ('Cliente', 'Admin')),
    fecha_registro timestamp default now()
);

-- crea automáticamente el perfil cuando alguien se registra vía Supabase Auth
-- (copia el correo de auth.users porque esa tabla no es consultable desde
-- el cliente con la anon key; así el panel admin puede listar clientes)
create function fn_crear_perfil_nuevo_usuario() returns trigger as $$
begin
    insert into public.perfiles (id, nombres, apellidos, correo, dni_ce_ruc, telefono)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nombres', ''),
        coalesce(new.raw_user_meta_data->>'apellidos', ''),
        new.email,
        new.raw_user_meta_data->>'dni_ce_ruc',
        new.raw_user_meta_data->>'telefono'
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger trg_crear_perfil_nuevo_usuario
after insert on auth.users
for each row execute function fn_crear_perfil_nuevo_usuario();

-- SEGURIDAD: la policy "perfil propio editar" (más abajo) deja a cada cliente actualizar SU
-- FILA, pero por sí sola no impide que mande rol='Admin' en el mismo update y se autoascienda.
-- Este trigger revierte cualquier cambio de rol que no venga de un admin, sin importar qué
-- policy de UPDATE lo permita.
create function fn_bloquear_autoascenso_admin() returns trigger as $$
begin
    if new.rol is distinct from old.rol and not is_admin() then
        new.rol := old.rol;
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_bloquear_autoascenso_admin
before update on perfiles
for each row execute function fn_bloquear_autoascenso_admin();

create table direcciones_cliente (
    id bigint generated always as identity primary key,
    id_cliente uuid not null references perfiles(id) on delete cascade,
    etiqueta varchar(50),
    direccion_detalle text not null,
    codigo_ubigeo char(6) not null references ubigeo(codigo_ubigeo),
    tipo_despacho varchar(30) check (tipo_despacho in ('Domicilio', 'Agencia_Shalom', 'Agencia_Olva', 'Recojo_En_Tienda')),
    agencia_nombre varchar(100),
    predeterminada boolean default false
);

-- ==========================================
-- 2. CATÁLOGO DE PERFUMES E INVENTARIO
-- ==========================================
create table perfumes (
    id bigint generated always as identity primary key,
    slug varchar(180) unique not null,
    nombre varchar(150) not null,
    marca varchar(100) not null,
    genero varchar(20) not null default 'Unisex' check (genero in ('Hombre', 'Mujer', 'Unisex')),
    familia_olfativa varchar(50),
    concentracion varchar(50),
    mililitros int not null check (mililitros > 0),
    descripcion text,
    notas_olfativas text,
    precio_tienda_regular numeric(10,2) not null check (precio_tienda_regular > 0),
    descuento_tienda_porcentaje numeric(5,2) default 0 check (descuento_tienda_porcentaje between 0 and 100),
    precio_consolidado_fijo numeric(10,2) not null check (precio_consolidado_fijo > 0),
    -- costo real de traer el producto a Perú (referencia interna del admin, nunca se muestra al cliente)
    costo_importacion_pen numeric(10,2) check (costo_importacion_pen is null or costo_importacion_pen >= 0),
    costo_importacion_usd numeric(10,2) check (costo_importacion_usd is null or costo_importacion_usd >= 0),
    -- false = el precio de venta aún es solo el costo (placeholder de importación); la Calculadora de
    -- Márgenes del admin lo pone en true al aplicarle un margen real. Sirve para no publicar por error
    -- productos que todavía se venderían al costo.
    margen_aplicado boolean not null default false,
    estado varchar(30) default 'Disponible' check (estado in ('Disponible', 'Agotado', 'Bajo_Pedido')),
    es_nuevo boolean default false,
    es_bestseller boolean default false,
    imagen_url text,
    fecha_creacion timestamp default now(),
    constraint chk_precio_consolidado_menor check (precio_consolidado_fijo <= precio_tienda_regular)
);

create table imagenes_perfume (
    id bigint generated always as identity primary key,
    id_producto bigint not null references perfumes(id) on delete cascade,
    url text not null,
    orden int default 0,
    es_principal boolean default false
);

create table inventario (
    id_producto bigint primary key references perfumes(id) on delete cascade,
    stock_fisico int default 0 check (stock_fisico >= 0),
    stock_reservado_consolidados int default 0 check (stock_reservado_consolidados >= 0),
    stock_disponible int generated always as (stock_fisico - stock_reservado_consolidados) stored,
    stock_minimo_alerta int default 5
);

create function fn_crear_inventario_inicial() returns trigger as $$
begin
    insert into inventario (id_producto) values (new.id);
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_crear_inventario_inicial
after insert on perfumes
for each row execute function fn_crear_inventario_inicial();

create table resenas (
    id bigint generated always as identity primary key,
    id_cliente uuid not null references perfiles(id) on delete cascade,
    id_producto bigint references perfumes(id) on delete cascade,
    calificacion smallint not null check (calificacion between 1 and 5),
    comentario text,
    aprobado boolean default false,
    fecha_creacion timestamp default now()
);

create table favoritos (
    id_cliente uuid not null references perfiles(id) on delete cascade,
    id_producto bigint not null references perfumes(id) on delete cascade,
    fecha_agregado timestamp default now(),
    primary key (id_cliente, id_producto)
);

create table carrito_items (
    id bigint generated always as identity primary key,
    id_cliente uuid not null references perfiles(id) on delete cascade,
    id_producto bigint not null references perfumes(id) on delete cascade,
    cantidad int not null default 1 check (cantidad > 0),
    fecha_agregado timestamp default now(),
    constraint uq_carrito_item unique (id_cliente, id_producto)
);

create table newsletter_suscriptores (
    id bigint generated always as identity primary key,
    correo varchar(150) unique not null,
    fecha_suscripcion timestamp default now(),
    activo boolean default true
);

create table solicitudes_cotizacion (
    id bigint generated always as identity primary key,
    -- id_cliente es opcional: la cotización está abierta a visitantes sin cuenta (flujo por WhatsApp).
    -- Si no hay cuenta, nombre_contacto + telefono_contacto son la única forma de ubicar al cliente.
    id_cliente uuid references perfiles(id) on delete cascade,
    nombre_contacto varchar(150),
    telefono_contacto varchar(20),
    correo_contacto varchar(150),
    nombre_perfume_solicitado varchar(150) not null,
    marca_solicitada varchar(100) not null,
    concentracion varchar(50),
    mililitros int,
    notas_cliente text,
    fecha_solicitud timestamp default now(),
    precio_cotizado_tienda numeric(10,2),
    precio_cotizado_consolidado numeric(10,2),
    estado varchar(30) default 'Pendiente' check (estado in ('Pendiente', 'Cotizado', 'Aceptado', 'Rechazado', 'Convertido_A_Producto')),
    id_producto_creado bigint references perfumes(id),
    constraint chk_cotizacion_tiene_contacto check (id_cliente is not null or telefono_contacto is not null)
);

-- ==========================================
-- 3. CONSOLIDADOS
-- ==========================================
create table consolidados (
    id bigint generated always as identity primary key,
    codigo_campana varchar(50) unique not null,
    fecha_apertura timestamp not null,
    fecha_cierre_programada timestamp not null,
    fecha_cierre_real timestamp,
    minimo_unidades int default 4 check (minimo_unidades >= 4),
    total_unidades_acumuladas int default 0 check (total_unidades_acumuladas >= 0),
    estado varchar(30) default 'Borrador' check (estado in ('Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito', 'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado')),
    notas_admin text
);

create table historial_estados_consolidado (
    id bigint generated always as identity primary key,
    id_consolidado bigint not null references consolidados(id) on delete cascade,
    estado varchar(30) not null,
    descripcion_publica text,
    fecha_evento timestamp default now()
);

create table detalle_consolidado (
    id bigint generated always as identity primary key,
    id_consolidado bigint not null references consolidados(id),
    id_cliente uuid not null references perfiles(id),
    id_producto bigint not null references perfumes(id),
    cantidad int not null check (cantidad > 0),
    precio_consolidado_aplicado numeric(10,2) not null check (precio_consolidado_aplicado > 0),
    -- a qué dirección (o "Recojo en tienda") quiere el cliente que llegue este pedido — se
    -- arrastra al pedido real cuando el admin cierra la campaña (generar_pedidos_de_consolidado)
    id_direccion_entrega bigint references direcciones_cliente(id),
    fecha_reserva timestamp default now(),
    estado_item varchar(30) default 'Reservado' check (estado_item in ('Reservado', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'))
);

create function fn_actualizar_total_consolidado() returns trigger as $$
begin
    update consolidados
    set total_unidades_acumuladas = coalesce((
        select sum(cantidad) from detalle_consolidado
        where id_consolidado = coalesce(new.id_consolidado, old.id_consolidado)
          and estado_item <> 'Cancelado'
    ), 0)
    where id = coalesce(new.id_consolidado, old.id_consolidado);
    return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_actualizar_total_consolidado
after insert or update or delete on detalle_consolidado
for each row execute function fn_actualizar_total_consolidado();

create function fn_actualizar_stock_reservado() returns trigger as $$
declare
    v_producto bigint := coalesce(new.id_producto, old.id_producto);
begin
    update inventario
    set stock_reservado_consolidados = coalesce((
        select sum(cantidad) from detalle_consolidado
        where id_producto = v_producto and estado_item <> 'Cancelado'
    ), 0)
    where id_producto = v_producto;
    return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_actualizar_stock_reservado
after insert or update or delete on detalle_consolidado
for each row execute function fn_actualizar_stock_reservado();

-- Vista pública SIN datos personales (nada de id_cliente): solo lo necesario para mostrar
-- "cuánta gente ya reservó cada perfume" en la página del consolidado. Es necesaria porque
-- detalle_consolidado tiene RLS a nivel de fila (cada cliente ve solo sus propias reservas) —
-- sin esta vista, esa lista salía vacía para cualquier visitante que no fuera el dueño de la
-- reserva o admin, aunque la barra de progreso general sí funcionara (esa usa un contador
-- aparte en la tabla consolidados). Las vistas en Postgres, por defecto, evalúan el RLS de
-- las tablas de abajo con los permisos de quien la creó (aquí, el rol que corre este script
-- en el SQL Editor, que sí puede ver todas las filas) — por eso agrega el total de todos los
-- clientes sin exponer quién reservó qué.
create view consolidado_resumen_publico as
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
where dc.estado_item <> 'Cancelado'
group by dc.id_consolidado, p.id, p.slug, p.nombre, p.marca, p.imagen_url;

grant select on consolidado_resumen_publico to anon, authenticated;

-- ==========================================
-- 4. PEDIDOS, PAGOS Y ENVÍOS
-- ==========================================
create table pedidos (
    id bigint generated always as identity primary key,
    id_cliente uuid not null references perfiles(id),
    tipo_pedido varchar(30) check (tipo_pedido in ('Directo_Tienda', 'Consolidado')),
    id_consolidado_asociado bigint references consolidados(id),
    id_direccion_entrega bigint references direcciones_cliente(id) on delete restrict,
    monto_total numeric(10,2) not null default 0 check (monto_total >= 0),
    monto_adelanto_pagado numeric(10,2) not null default 0 check (monto_adelanto_pagado >= 0),
    monto_saldo_pendiente numeric(10,2) not null default 0 check (monto_saldo_pendiente >= 0),
    estado_pago varchar(20) default 'Pendiente' check (estado_pago in ('Pendiente', 'Parcial', 'Completado')),
    fecha_creacion timestamp default now(),
    constraint chk_pedido_tipo_consolidado check (
        (tipo_pedido = 'Consolidado' and id_consolidado_asociado is not null) or
        (tipo_pedido = 'Directo_Tienda' and id_consolidado_asociado is null)
    )
);

create table detalle_pedido (
    id bigint generated always as identity primary key,
    id_pedido bigint not null references pedidos(id) on delete cascade,
    id_producto bigint not null references perfumes(id),
    cantidad int not null check (cantidad > 0),
    precio_unitario_aplicado numeric(10,2) not null check (precio_unitario_aplicado > 0),
    subtotal numeric(10,2) generated always as (cantidad * precio_unitario_aplicado) stored
);

create table pagos (
    id bigint generated always as identity primary key,
    id_pedido bigint not null references pedidos(id) on delete cascade,
    monto numeric(10,2) not null check (monto > 0),
    tipo_pago varchar(30) check (tipo_pago in ('Adelanto', 'Saldo_Final', 'Abono_Parcial')),
    metodo_pago varchar(50) check (metodo_pago in ('Yape', 'Plin', 'Transferencia_Bancaria', 'Tarjeta', 'PagoEfectivo', 'Efectivo')),
    -- El comprobante (captura de Yape/Plin/transferencia) se resuelve por WhatsApp, no se
    -- sube al sitio: el admin registra acá el pago ya confirmado en esa conversación.
    estado_pago varchar(20) default 'Aprobado' check (estado_pago in ('Aprobado', 'Anulado')),
    fecha_pago timestamp default now()
);

-- Mantiene pedidos.monto_adelanto_pagado / monto_saldo_pendiente / estado_pago en sincronía
-- con la suma real de pagos Aprobados. Antes esto se dejaba a mano desde el admin (fuente de
-- descuadres); ahora es automático apenas un pago pasa a Aprobado, se edita o se elimina.
create function fn_actualizar_montos_pedido() returns trigger as $$
declare
    v_pedido bigint := coalesce(new.id_pedido, old.id_pedido);
    v_total numeric(10,2);
    v_pagado numeric(10,2);
begin
    select monto_total into v_total from pedidos where id = v_pedido;
    select coalesce(sum(monto), 0) into v_pagado from pagos where id_pedido = v_pedido and estado_pago = 'Aprobado';

    update pedidos
    set monto_adelanto_pagado = v_pagado,
        monto_saldo_pendiente = greatest(v_total - v_pagado, 0),
        estado_pago = case
            when v_pagado <= 0 then 'Pendiente'
            when v_pagado >= v_total then 'Completado'
            else 'Parcial'
        end
    where id = v_pedido;
    return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_actualizar_montos_pedido
after insert or update or delete on pagos
for each row execute function fn_actualizar_montos_pedido();

create table envios (
    id bigint generated always as identity primary key,
    id_pedido bigint not null references pedidos(id) on delete cascade,
    numero_guia_seguimiento varchar(100),
    empresa_transporte varchar(50),
    estado_envio varchar(30) check (estado_envio in ('Preparando', 'En_Agencia', 'En_Ruta', 'Entregado', 'Devuelto')),
    fecha_actualizacion timestamp default now()
);

create table auditoria_log (
    id bigint generated always as identity primary key,
    id_admin uuid references perfiles(id),
    accion varchar(100) not null,
    tabla_afectada varchar(50) not null,
    datos_anteriores_json jsonb,
    datos_nuevos_json jsonb,
    fecha timestamp default now()
);

-- Checkout: convierte el carrito del cliente autenticado en un pedido
-- Directo_Tienda. security definer porque necesita descontar stock
-- (tabla solo editable por Admin vía RLS) de forma controlada; toda
-- la lógica interna sigue restringida al auth.uid() que la invoca.
create function crear_pedido_directo(p_id_direccion bigint) returns bigint as $$
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
               round(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2) as precio_final,
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
               round(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2) as precio_final
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

-- Reserva en un consolidado. El precio se calcula acá adentro (nunca se confía en un precio
-- que mande el cliente) y se valida que la campaña siga abierta Y dentro de su fecha límite
-- antes de aceptar la reserva (antes solo miraba el estado, así que si el admin se olvidaba
-- de cerrarla el día programado, el sitio seguía aceptando reservas indefinidamente). También
-- exige una dirección de entrega del cliente y, si ya tenía una reserva viva del mismo
-- perfume en esta campaña, suma la cantidad a esa fila en vez de crear una fila aparte.
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

-- Cierre de campaña → pedidos reales. Agrupa las reservas "Reservado" de un consolidado por
-- cliente y genera un pedido (tipo_pedido='Consolidado') con su detalle por cada uno, para
-- que a partir de ahí los pagos y el seguimiento de saldo funcionen igual que en tienda
-- directa. Las reservas usadas quedan en estado_item='Convertido_A_Pedido' para no
-- duplicarse si se corre de nuevo. Solo Admin. Devuelve cuántos pedidos se crearon.
create function generar_pedidos_de_consolidado(p_id_consolidado bigint) returns integer as $$
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

-- Calculadora de márgenes: recalcula precio_tienda_regular y precio_consolidado_fijo
-- a partir de costo_importacion_pen para todo el catálogo (o solo lo que aún no tiene
-- margen aplicado, según p_solo_sin_margen). Solo Admin puede ejecutarla. Devuelve
-- cuántos productos se actualizaron.
create function aplicar_margen_masivo(
    p_margen_consolidado numeric,
    p_margen_tienda numeric,
    p_solo_sin_margen boolean default true
) returns integer as $$
declare
    v_filas integer;
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    if p_margen_consolidado is null or p_margen_tienda is null or p_margen_consolidado < 0 or p_margen_tienda < 0 then
        raise exception 'Los márgenes deben ser números positivos';
    end if;
    if p_margen_tienda < p_margen_consolidado then
        raise exception 'El margen de tienda regular no puede ser menor al margen consolidado';
    end if;

    update perfumes
    set precio_consolidado_fijo = round(costo_importacion_pen * (1 + p_margen_consolidado / 100.0), 2),
        precio_tienda_regular = round(costo_importacion_pen * (1 + p_margen_tienda / 100.0), 2),
        margen_aplicado = true
    where costo_importacion_pen is not null
      and costo_importacion_pen > 0
      and (p_solo_sin_margen is false or margen_aplicado is false);

    get diagnostics v_filas = row_count;
    return v_filas;
end;
$$ language plpgsql security definer set search_path = public;

-- ==========================================
-- 5. NOTIFICACIONES (en la app + gancho opcional para correo)
-- ==========================================
create table notificaciones (
    id bigint generated always as identity primary key,
    id_cliente uuid not null references perfiles(id) on delete cascade,
    tipo varchar(30) not null check (tipo in ('Consolidado', 'Cotizacion', 'Pago', 'Pedido')),
    titulo varchar(150) not null,
    mensaje text not null,
    url_destino text,
    leido boolean not null default false,
    fecha_creacion timestamp default now()
);

create index idx_notificaciones_cliente on notificaciones(id_cliente, leido);

-- Avisa a todo cliente con reserva activa en el consolidado cuando cambia de estado
-- (ej. "en tránsito", "en aduanas") — hoy solo se veía si el cliente entraba a la campaña.
create function fn_notificar_cambio_consolidado() returns trigger as $$
begin
    insert into notificaciones (id_cliente, tipo, titulo, mensaje, url_destino)
    select distinct dc.id_cliente,
           'Consolidado',
           'Tu consolidado ' || c.codigo_campana || ' cambió de estado',
           coalesce(new.descripcion_publica, 'Nuevo estado: ' || new.estado),
           'consolidado.html?id=' || new.id_consolidado
    from detalle_consolidado dc
    join consolidados c on c.id = dc.id_consolidado
    where dc.id_consolidado = new.id_consolidado
      and dc.estado_item <> 'Cancelado';
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notificar_cambio_consolidado
after insert on historial_estados_consolidado
for each row execute function fn_notificar_cambio_consolidado();

-- Avisa al cliente cuando el admin responde/actualiza su cotización (si dejó cuenta creada;
-- las cotizaciones de invitados sin cuenta se atienden por WhatsApp, no tienen a quién notificar aquí).
create function fn_notificar_cotizacion() returns trigger as $$
begin
    if new.id_cliente is not null and new.estado is distinct from old.estado then
        insert into notificaciones (id_cliente, tipo, titulo, mensaje, url_destino)
        values (
            new.id_cliente,
            'Cotizacion',
            'Tu cotización fue actualizada',
            new.marca_solicitada || ' — ' || new.nombre_perfume_solicitado || ': ' || replace(new.estado, '_', ' '),
            'cuenta.html?tab=cotizaciones'
        );
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notificar_cotizacion
after update on solicitudes_cotizacion
for each row execute function fn_notificar_cotizacion();

-- Avisa al cliente cuando el admin le registra un pago (siempre nace Aprobado — el
-- comprobante se resuelve por WhatsApp, ver "estado_pago" arriba) o si lo anula por error.
create function fn_notificar_pago() returns trigger as $$
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
            'cuenta.html?tab=pedidos'
        );
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notificar_pago
after insert or update on pagos
for each row execute function fn_notificar_pago();

-- ==========================================
-- 6. ANTI-SPAM (uso exclusivo de Edge Functions con la service role; sin políticas
--    públicas a propósito — un cliente normal no debe poder leer ni tocar esta tabla)
-- ==========================================
create table rate_limits (
    clave varchar(120) not null,
    ventana timestamp not null,
    conteo int not null default 1,
    primary key (clave, ventana)
);

-- ==========================================
-- 7. ÍNDICES
-- ==========================================
create index idx_perfumes_marca on perfumes(marca);
create index idx_perfumes_genero on perfumes(genero);
create index idx_perfumes_estado on perfumes(estado);
create index idx_direcciones_cliente on direcciones_cliente(id_cliente);
create index idx_pedidos_cliente on pedidos(id_cliente);
create index idx_detalle_consolidado_consolidado on detalle_consolidado(id_consolidado);
create index idx_detalle_consolidado_cliente on detalle_consolidado(id_cliente);
create index idx_resenas_producto on resenas(id_producto);

-- ==========================================
-- 8. ROW LEVEL SECURITY
-- ==========================================
alter table perfiles enable row level security;
alter table direcciones_cliente enable row level security;
alter table perfumes enable row level security;
alter table imagenes_perfume enable row level security;
alter table inventario enable row level security;
alter table resenas enable row level security;
alter table favoritos enable row level security;
alter table carrito_items enable row level security;
alter table newsletter_suscriptores enable row level security;
alter table solicitudes_cotizacion enable row level security;
alter table consolidados enable row level security;
alter table historial_estados_consolidado enable row level security;
alter table detalle_consolidado enable row level security;
alter table pedidos enable row level security;
alter table detalle_pedido enable row level security;
alter table pagos enable row level security;
alter table envios enable row level security;
alter table ubigeo enable row level security;
alter table notificaciones enable row level security;
-- rate_limits: RLS habilitado a propósito SIN políticas — nadie con anon/authenticated puede
-- leer ni escribir aquí. Solo la Edge Function (con la service role, que ignora RLS) la usa.
alter table rate_limits enable row level security;

create function is_admin() returns boolean as $$
    select exists (select 1 from perfiles where id = auth.uid() and rol = 'Admin');
$$ language sql security definer stable;

-- Catálogo: lectura pública, escritura solo Admin
create policy "catalogo publico" on perfumes for select using (true);
create policy "catalogo admin escribe" on perfumes for all using (is_admin()) with check (is_admin());
create policy "imagenes publico" on imagenes_perfume for select using (true);
create policy "imagenes admin escribe" on imagenes_perfume for all using (is_admin()) with check (is_admin());
create policy "inventario publico" on inventario for select using (true);
create policy "inventario admin escribe" on inventario for all using (is_admin()) with check (is_admin());
create policy "ubigeo publico" on ubigeo for select using (true);

-- Consolidados: lectura pública, escritura solo Admin
create policy "consolidados publico" on consolidados for select using (true);
create policy "consolidados admin escribe" on consolidados for all using (is_admin()) with check (is_admin());
create policy "historial publico" on historial_estados_consolidado for select using (true);
create policy "historial admin escribe" on historial_estados_consolidado for all using (is_admin()) with check (is_admin());

-- Reseñas: lectura pública de aprobadas, cada quien crea las suyas
create policy "resenas aprobadas publicas" on resenas for select using (aprobado = true or id_cliente = auth.uid() or is_admin());
-- "and aprobado = false": sin esto, cualquier cliente podía mandar aprobado=true en el mismo
-- insert y su reseña se publicaba sola, sin pasar por moderación del admin.
create policy "resenas propias insertar" on resenas for insert with check (id_cliente = auth.uid() and aprobado = false);
create policy "resenas admin modera" on resenas for update using (is_admin());

-- Perfiles: cada quien ve/edita el suyo, admin ve todos
create policy "perfil propio" on perfiles for select using (id = auth.uid() or is_admin());
create policy "perfil propio editar" on perfiles for update using (id = auth.uid());
-- Necesaria para que un Admin pueda ascender/quitar Admin a otra cuenta desde el panel
-- (Clientes → Hacer Admin). El trigger fn_bloquear_autoascenso_admin sigue siendo la
-- barrera real contra que alguien se autoascienda: esta policy sola no lo permite, solo
-- habilita que un Admin edite perfiles ajenos.
create policy "perfil admin gestiona" on perfiles for update using (is_admin());

-- Todo lo demás: cada cliente solo ve/gestiona lo suyo
create policy "direcciones propias" on direcciones_cliente for all using (id_cliente = auth.uid() or is_admin()) with check (id_cliente = auth.uid());
create policy "favoritos propios" on favoritos for all using (id_cliente = auth.uid()) with check (id_cliente = auth.uid());
create policy "carrito propio" on carrito_items for all using (id_cliente = auth.uid()) with check (id_cliente = auth.uid());
create policy "cotizaciones propias" on solicitudes_cotizacion for select using (id_cliente = auth.uid() or is_admin());
-- Permite cotizar sin cuenta (id_cliente null) siempre que deje un teléfono de contacto;
-- si hay sesión, la fila debe quedar atada a ese usuario (no puede insertar a nombre de otro).
create policy "cotizaciones insertar" on solicitudes_cotizacion for insert with check (
    (auth.uid() is not null and id_cliente = auth.uid())
    or (auth.uid() is null and id_cliente is null and telefono_contacto is not null)
);
create policy "cotizaciones admin responde" on solicitudes_cotizacion for update using (is_admin());

-- SEGURIDAD: sin policy de insert directo — antes cualquier cliente podía mandar el
-- precio_consolidado_aplicado que quisiera (ej. reservar a S/0.01). Ahora se reserva
-- exclusivamente vía reservar_en_consolidado(), que calcula el precio ella misma.
create policy "detalle_consolidado propio" on detalle_consolidado for select using (id_cliente = auth.uid() or is_admin());
create policy "detalle_consolidado admin gestiona" on detalle_consolidado for all using (is_admin()) with check (is_admin());

-- SEGURIDAD: a propósito NO hay policy que deje al cliente hacer un insert directo en
-- "pedidos" ni en "detalle_pedido". Si la hubiera, cualquiera podría insertar un pedido con
-- monto_total inventado (ej. S/0.01) o un detalle_pedido con precio_unitario_aplicado falso.
-- El único camino para un pedido de tienda directa es la función crear_pedido_directo()
-- (security definer: corre con permisos de sistema, calcula el precio ella misma desde
-- "perfumes" y descuenta stock — el cliente nunca manda el precio). El admin sigue pudiendo
-- crear/editar pedidos manualmente vía su propia policy.
create policy "pedidos propios" on pedidos for select using (id_cliente = auth.uid() or is_admin());
create policy "pedidos admin gestiona" on pedidos for all using (is_admin()) with check (is_admin());

create policy "detalle_pedido propio" on detalle_pedido for select using (
    exists (select 1 from pedidos p where p.id = id_pedido and (p.id_cliente = auth.uid() or is_admin()))
);
create policy "detalle_pedido admin gestiona" on detalle_pedido for all using (is_admin()) with check (is_admin());

-- El pago se registra solo desde el admin (el comprobante se resuelve por WhatsApp, no hay
-- subida de archivos ni insert del cliente acá).
create policy "pagos propios" on pagos for select using (
    exists (select 1 from pedidos p where p.id = id_pedido and (p.id_cliente = auth.uid() or is_admin()))
);
create policy "pagos admin gestiona" on pagos for all using (is_admin()) with check (is_admin());

create policy "envios propios" on envios for select using (
    exists (select 1 from pedidos p where p.id = id_pedido and (p.id_cliente = auth.uid() or is_admin()))
);
create policy "envios admin gestiona" on envios for all using (is_admin()) with check (is_admin());

-- Newsletter: cualquiera puede suscribirse, nadie puede leer la lista salvo admin
create policy "newsletter suscribirse" on newsletter_suscriptores for insert with check (true);
create policy "newsletter admin lee" on newsletter_suscriptores for select using (is_admin());

-- Notificaciones: cada quien ve y marca como leídas las suyas; solo los triggers (security
-- definer) insertan, así que no hace falta una política de insert para clientes.
create policy "notificaciones propias" on notificaciones for select using (id_cliente = auth.uid() or is_admin());
create policy "notificaciones marcar leidas" on notificaciones for update using (id_cliente = auth.uid()) with check (id_cliente = auth.uid());

