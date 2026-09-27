-- ==========================================================
-- MIGRACIÓN 0019 — Consolidados manejados desde el admin, productos libres en
-- pedidos, datos legales de la empresa y Libro de Reclamaciones virtual.
--
-- 1. detalle_pedido admite líneas "libres" (nombre + precio escritos a mano, sin producto
--    del catálogo): para encargos de consolidado cotizados por WhatsApp de perfumes que no
--    están en la web. Se suman al total igual que cualquier otra línea.
-- 2. registrar_pedido_manual() (migración 0018) ahora también registra pedidos de
--    CONSOLIDADO (encargo/importación): van asociados a una campaña, usan el precio
--    consolidado por defecto y NO descuentan stock (se importan bajo pedido).
-- 3. configuracion_sitio suma los datos legales (razón social, RUC, domicilio fiscal, correo
--    para reclamos y datos personales) que muestran las políticas y el pie de página.
-- 4. libro_reclamaciones: Libro de Reclamaciones virtual (Código de Protección y Defensa del
--    Consumidor, Ley 29571, y su reglamento). El cliente registra por
--    registrar_reclamo(), que asigna el número correlativo; solo el admin lee y responde.
--
-- Ejecutar una vez en Supabase → SQL Editor, DESPUÉS de la 0018 y antes de subir el
-- código. Es idempotente.
-- ==========================================================

-- ---------- 1. Líneas libres en detalle_pedido ----------
alter table detalle_pedido alter column id_producto drop not null;
alter table detalle_pedido add column if not exists descripcion_libre varchar(200);
alter table detalle_pedido drop constraint if exists chk_detalle_producto_o_libre;
alter table detalle_pedido add constraint chk_detalle_producto_o_libre
    check (id_producto is not null or nullif(trim(descripcion_libre), '') is not null);
comment on column detalle_pedido.descripcion_libre is 'Línea escrita a mano por el admin (perfume fuera del catálogo): nombre del producto. id_producto queda null.';

-- ---------- 2. registrar_pedido_manual: tienda o consolidado, con líneas libres ----------
-- p_pedido: igual que en la 0018 + tipo_pedido ('Directo_Tienda' | 'Consolidado') e
--           id_consolidado (obligatorio si es Consolidado).
-- p_items:  [{ id_producto, cantidad, talla_ml, precio? }]  producto del catálogo
--           [{ descripcion, cantidad, precio }]              línea libre (precio obligatorio)
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
    v_descripcion text;
    v_lineas jsonb := '[]'::jsonb;
    v_nombre text := nullif(trim(p_pedido->>'cliente_nombre'), '');
    v_canal text := coalesce(nullif(p_pedido->>'canal', ''), 'WhatsApp');
    v_tipo text := coalesce(nullif(p_pedido->>'tipo_pedido', ''), 'Directo_Tienda');
    v_id_consolidado bigint := nullif(p_pedido->>'id_consolidado', '')::bigint;
    v_es_consolidado boolean;
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
    if v_tipo not in ('Directo_Tienda', 'Consolidado') then
        raise exception 'Tipo de pedido no válido';
    end if;
    v_es_consolidado := v_tipo = 'Consolidado';
    if v_es_consolidado then
        if v_id_consolidado is null or not exists (select 1 from consolidados where id = v_id_consolidado) then
            raise exception 'Elige la campaña de consolidado del pedido';
        end if;
    else
        v_id_consolidado := null;
    end if;
    if v_id_cliente is not null and not exists (select 1 from perfiles where id = v_id_cliente) then
        v_id_cliente := null;
    end if;
    if v_estado_envio not in ('Preparando', 'En_Agencia', 'En_Ruta', 'Entregado', 'Devuelto') then
        v_estado_envio := 'Preparando';
    end if;

    -- 1) Precio de cada línea
    for v_item in select value from jsonb_array_elements(p_items) loop
        v_cantidad := coalesce(nullif(v_item->>'cantidad', '')::int, 0);
        if v_cantidad <= 0 then
            raise exception 'La cantidad de cada producto debe ser mayor a 0';
        end if;
        v_precio := nullif(v_item->>'precio', '')::numeric;

        if nullif(v_item->>'id_producto', '') is null then
            -- Línea libre: nombre y precio los pone el admin.
            v_descripcion := nullif(trim(v_item->>'descripcion'), '');
            if v_descripcion is null then
                raise exception 'Escribe el nombre del producto en cada línea libre';
            end if;
            if v_precio is null or v_precio <= 0 then
                raise exception 'Falta el precio de "%"', v_descripcion;
            end if;
            v_lineas := v_lineas || jsonb_build_object('id_producto', null, 'descripcion', left(v_descripcion, 200), 'cantidad', v_cantidad, 'talla_ml', 0, 'precio', v_precio, 'es_decant', false);
        else
            v_talla := coalesce(nullif(v_item->>'talla_ml', '')::int, 0);
            select p.id, p.nombre, p.marca, p.es_decant, p.es_liquidacion, p.precio_liquidacion, p.precio_consolidado_fijo,
                   p.precio_tienda_regular, p.descuento_tienda_porcentaje, p.precio_3ml, p.precio_5ml, p.precio_10ml
              into v_prod
              from perfumes p where p.id = (v_item->>'id_producto')::bigint;
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
            if v_precio is null then
                v_precio := case
                    when v_prod.es_decant and v_talla = 3 then v_prod.precio_3ml
                    when v_prod.es_decant and v_talla = 5 then v_prod.precio_5ml
                    when v_prod.es_decant and v_talla = 10 then v_prod.precio_10ml
                    when v_es_consolidado then v_prod.precio_consolidado_fijo
                    when v_prod.es_liquidacion then v_prod.precio_liquidacion
                    else round(v_prod.precio_tienda_regular * (1 - coalesce(v_prod.descuento_tienda_porcentaje, 0) / 100.0), 2)
                end;
            end if;
            if v_precio is null or v_precio <= 0 then
                raise exception 'Falta el precio de % — % (%)', v_prod.marca, v_prod.nombre, case when v_talla > 0 then v_talla || 'ml' else 'entero' end;
            end if;
            v_lineas := v_lineas || jsonb_build_object('id_producto', v_prod.id, 'descripcion', null, 'cantidad', v_cantidad, 'talla_ml', v_talla, 'precio', v_precio, 'es_decant', v_prod.es_decant);
        end if;
        v_total := v_total + v_cantidad * v_precio;
    end loop;

    -- 2) Stock de frascos cerrados (solo tienda: un consolidado se importa bajo pedido).
    if not v_es_consolidado then
        for v_falta in
            select p.marca, p.nombre, sum((l->>'cantidad')::int) as pide, coalesce(max(i.stock_fisico), 0) as hay
            from jsonb_array_elements(v_lineas) l
            join perfumes p on p.id = (l->>'id_producto')::bigint
            left join inventario i on i.id_producto = p.id
            where l->>'id_producto' is not null and not (l->>'es_decant')::boolean
            group by p.id, p.marca, p.nombre
            having sum((l->>'cantidad')::int) > coalesce(max(i.stock_fisico), 0)
        loop
            raise exception 'Stock insuficiente: % — % (quedan %, el pedido pide %)', v_falta.marca, v_falta.nombre, v_falta.hay, v_falta.pide;
        end loop;
    end if;

    insert into pedidos (
        id_cliente, tipo_pedido, id_consolidado_asociado, monto_total, monto_saldo_pendiente, canal,
        cliente_nombre, cliente_dni, cliente_telefono,
        envio_tipo, envio_agencia, envio_departamento, envio_provincia, envio_distrito, envio_direccion,
        envio_receptor_nombre, envio_receptor_dni, envio_receptor_telefono, ml_descontado
    )
    values (
        v_id_cliente, v_tipo, v_id_consolidado, v_total, v_total, v_canal,
        v_nombre, nullif(trim(p_pedido->>'cliente_dni'), ''), nullif(trim(p_pedido->>'cliente_telefono'), ''),
        v_envio_tipo, nullif(trim(p_pedido->>'envio_agencia'), ''), nullif(p_pedido->>'envio_departamento', ''),
        nullif(p_pedido->>'envio_provincia', ''), nullif(p_pedido->>'envio_distrito', ''), nullif(trim(p_pedido->>'envio_direccion'), ''),
        nullif(trim(p_pedido->>'envio_receptor_nombre'), ''), nullif(trim(p_pedido->>'envio_receptor_dni'), ''), nullif(trim(p_pedido->>'envio_receptor_telefono'), ''),
        not v_es_consolidado
    )
    returning id into v_id_pedido;

    perform set_config('zadaca.motivo', 'Venta', true);
    perform set_config('zadaca.id_pedido', v_id_pedido::text, true);
    perform set_config('zadaca.nota', 'Venta ' || v_canal, true);

    for v_item in select value from jsonb_array_elements(v_lineas) loop
        insert into detalle_pedido (id_pedido, id_producto, descripcion_libre, cantidad, precio_unitario_aplicado, talla_ml)
        values (v_id_pedido, nullif(v_item->>'id_producto', '')::bigint, v_item->>'descripcion', (v_item->>'cantidad')::int, (v_item->>'precio')::numeric, (v_item->>'talla_ml')::int);

        if not v_es_consolidado and v_item->>'id_producto' is not null then
            if (v_item->>'es_decant')::boolean then
                update perfumes
                set mililitros_restantes = greatest(mililitros_restantes - ((v_item->>'talla_ml')::int * (v_item->>'cantidad')::int), 0)
                where id = (v_item->>'id_producto')::bigint and mililitros_restantes is not null;
            else
                update inventario set stock_fisico = stock_fisico - (v_item->>'cantidad')::int
                where id_producto = (v_item->>'id_producto')::bigint;
            end if;
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

-- ---------- 3. Datos legales de la empresa ----------
alter table configuracion_sitio
    add column if not exists nombre_comercial text not null default 'Maison Zadaca',
    add column if not exists razon_social text,
    add column if not exists ruc varchar(11),
    add column if not exists domicilio_fiscal text,
    add column if not exists correo_legal text,
    add column if not exists telefono_contacto text not null default '+51 990 278 017',
    add column if not exists responsable_datos text,
    add column if not exists region_servidores text not null default 'Estados Unidos / Brasil (Supabase, Inc.)',
    add column if not exists politicas_actualizadas_el date not null default current_date;

alter table configuracion_sitio drop constraint if exists chk_ruc_formato;
alter table configuracion_sitio add constraint chk_ruc_formato check (ruc is null or ruc ~ '^(10|15|17|20)\d{9}$');

comment on column configuracion_sitio.correo_legal is 'Correo para reclamos y derechos sobre datos personales (ARCO). Si está vacío las páginas usan correo_contacto.';

-- ---------- 4. Libro de Reclamaciones virtual ----------
create sequence if not exists libro_reclamaciones_seq;

create table if not exists libro_reclamaciones (
    id bigint generated always as identity primary key,
    numero varchar(24) unique not null,
    fecha_registro timestamp not null default now(),
    tipo varchar(10) not null check (tipo in ('Reclamo', 'Queja')),
    consumidor_nombre varchar(150) not null,
    consumidor_documento_tipo varchar(10) not null check (consumidor_documento_tipo in ('DNI', 'CE', 'Pasaporte', 'RUC')),
    consumidor_documento varchar(20) not null,
    consumidor_domicilio text not null,
    consumidor_telefono varchar(20),
    consumidor_correo varchar(150) not null,
    es_menor boolean not null default false,
    apoderado_nombre varchar(150),
    bien_tipo varchar(10) not null check (bien_tipo in ('Producto', 'Servicio')),
    bien_descripcion text not null,
    monto_reclamado numeric(10,2) check (monto_reclamado is null or monto_reclamado >= 0),
    numero_pedido varchar(30),
    detalle text not null,
    pedido_consumidor text not null,
    respuesta_por varchar(10) not null default 'Correo' check (respuesta_por in ('Correo', 'Domicilio')),
    estado varchar(20) not null default 'Pendiente' check (estado in ('Pendiente', 'En_Proceso', 'Respondido')),
    respuesta text,
    fecha_respuesta timestamp,
    id_cliente uuid references perfiles(id) on delete set null,
    constraint chk_menor_con_apoderado check (not es_menor or nullif(trim(apoderado_nombre), '') is not null)
);
create index if not exists idx_reclamos_fecha on libro_reclamaciones(fecha_registro desc);

alter table libro_reclamaciones enable row level security;
drop policy if exists "reclamos admin lee" on libro_reclamaciones;
create policy "reclamos admin lee" on libro_reclamaciones for select using (is_admin());
drop policy if exists "reclamos admin responde" on libro_reclamaciones;
create policy "reclamos admin responde" on libro_reclamaciones for update using (is_admin()) with check (is_admin());
-- Sin policy de insert ni delete: el cliente registra por registrar_reclamo() y una hoja de
-- reclamación no se borra (hay que conservarla).

-- Registra la hoja y devuelve su número correlativo y la fecha. Abierta a visitantes sin
-- cuenta (el Libro de Reclamaciones no puede exigir registrarse). Límite simple anti-spam:
-- 5 hojas por documento en 24 horas.
create or replace function registrar_reclamo(p jsonb)
returns table (numero varchar, fecha_registro timestamp) as $$
#variable_conflict use_column
declare
    v_numero varchar(24);
    v_fecha timestamp;
    v_doc text := nullif(trim(p->>'consumidor_documento'), '');
begin
    if nullif(trim(p->>'consumidor_nombre'), '') is null or v_doc is null
       or nullif(trim(p->>'consumidor_domicilio'), '') is null or nullif(trim(p->>'consumidor_correo'), '') is null
       or nullif(trim(p->>'bien_descripcion'), '') is null or nullif(trim(p->>'detalle'), '') is null
       or nullif(trim(p->>'pedido_consumidor'), '') is null then
        raise exception 'Completa todos los campos obligatorios';
    end if;
    if (p->>'consumidor_correo') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Revisa el correo electrónico';
    end if;
    if coalesce((p->>'es_menor')::boolean, false) and nullif(trim(p->>'apoderado_nombre'), '') is null then
        raise exception 'Si eres menor de edad, indica el nombre de tu padre, madre o apoderado';
    end if;
    if (select count(*) from libro_reclamaciones l where l.consumidor_documento = v_doc and l.fecha_registro > now() - interval '1 day') >= 5 then
        raise exception 'Ya registraste varias hojas hoy. Si necesitas agregar algo, escríbenos por WhatsApp.';
    end if;

    v_numero := 'LR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('libro_reclamaciones_seq')::text, 6, '0');

    insert into libro_reclamaciones (
        numero, tipo, consumidor_nombre, consumidor_documento_tipo, consumidor_documento, consumidor_domicilio,
        consumidor_telefono, consumidor_correo, es_menor, apoderado_nombre, bien_tipo, bien_descripcion,
        monto_reclamado, numero_pedido, detalle, pedido_consumidor, respuesta_por, id_cliente
    ) values (
        v_numero,
        case when p->>'tipo' = 'Queja' then 'Queja' else 'Reclamo' end,
        left(trim(p->>'consumidor_nombre'), 150),
        coalesce(nullif(p->>'consumidor_documento_tipo', ''), 'DNI'),
        left(v_doc, 20),
        trim(p->>'consumidor_domicilio'),
        left(nullif(trim(p->>'consumidor_telefono'), ''), 20),
        left(trim(p->>'consumidor_correo'), 150),
        coalesce((p->>'es_menor')::boolean, false),
        left(nullif(trim(p->>'apoderado_nombre'), ''), 150),
        case when p->>'bien_tipo' = 'Servicio' then 'Servicio' else 'Producto' end,
        trim(p->>'bien_descripcion'),
        nullif(p->>'monto_reclamado', '')::numeric,
        left(nullif(trim(p->>'numero_pedido'), ''), 30),
        trim(p->>'detalle'),
        trim(p->>'pedido_consumidor'),
        case when p->>'respuesta_por' = 'Domicilio' then 'Domicilio' else 'Correo' end,
        auth.uid()
    )
    returning libro_reclamaciones.fecha_registro into v_fecha;

    return query select v_numero, v_fecha;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function registrar_reclamo(jsonb) to anon, authenticated;

-- ==========================================================
-- FIN. Verifica:
--   select descripcion_libre from detalle_pedido limit 1;
--   select ruc, razon_social, correo_legal from configuracion_sitio;
--   select count(*) from libro_reclamaciones;
-- Luego completa en el panel → Configuración del Sitio: razón social, RUC, domicilio fiscal
-- y correo para reclamos (las políticas los muestran solos).
-- ==========================================================
