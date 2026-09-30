-- ==========================================================
-- MIGRACIÓN 0022 — Contabilidad: costo de cada venta, compras de mercadería en un solo paso y
-- comprobantes de gastos
--
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a correr sin problema.
--
-- 1. Cada línea vendida guarda su COSTO del momento (detalle_pedido.costo_unitario). Así la
--    contabilidad puede mostrar la ganancia real (ventas − costo de lo vendido − gastos) y un
--    cambio de costo mañana no altera las ganancias de ayer. Un decant toma el costo por ml de su
--    perfume entero vinculado. Cuando se carga el costo de un perfume por primera vez, sus ventas
--    pasadas que no tenían costo se completan solas.
-- 2. Gastos: proveedor y foto/PDF del comprobante (bucket PRIVADO "comprobantes": solo el admin
--    los ve, con links temporales).
-- 3. registrar_ingreso_mercaderia(): cuando llega mercadería, en UNA operación suma el stock,
--    actualiza el costo (promedio ponderado), el precio si cambió, publica lo que estaba oculto y
--    registra la compra como gasto de Mercadería.
-- ==========================================================

-- ---------- 1. Costo de cada venta ----------
alter table detalle_pedido add column if not exists costo_unitario numeric(10,2);
alter table detalle_pedido drop constraint if exists chk_detalle_costo_unitario;
alter table detalle_pedido add constraint chk_detalle_costo_unitario check (costo_unitario is null or costo_unitario >= 0);
comment on column detalle_pedido.costo_unitario is 'Costo por unidad al momento de la venta (para la ganancia). Decants: costo por ml del perfume entero × talla. Null = sin costo cargado.';

create or replace function fn_costo_unitario_producto(p_id_producto bigint, p_talla_ml int)
returns numeric as $$
declare
    v_producto record;
    v_tienda record;
begin
    select id, es_decant, costo_importacion_pen, id_perfume_tienda into v_producto from perfumes where id = p_id_producto;
    if not found then
        return null;
    end if;
    if not v_producto.es_decant then
        return v_producto.costo_importacion_pen;
    end if;
    -- Decant: se sirve del frasco del perfume entero vinculado → costo por ml × ml vendidos.
    if coalesce(p_talla_ml, 0) <= 0 or v_producto.id_perfume_tienda is null then
        return null;
    end if;
    select mililitros, costo_importacion_pen into v_tienda from perfumes where id = v_producto.id_perfume_tienda;
    if v_tienda.costo_importacion_pen is null or coalesce(v_tienda.mililitros, 0) <= 0 then
        return null;
    end if;
    return round(v_tienda.costo_importacion_pen / v_tienda.mililitros * p_talla_ml, 2);
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function fn_detalle_costo_unitario() returns trigger as $$
begin
    if new.costo_unitario is null and new.id_producto is not null then
        new.costo_unitario := fn_costo_unitario_producto(new.id_producto, new.talla_ml);
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_detalle_costo_unitario on detalle_pedido;
create trigger trg_detalle_costo_unitario
before insert on detalle_pedido
for each row execute function fn_detalle_costo_unitario();

-- Ventas que ya existen: se les pone el costo que hay cargado hoy (mejor aproximación posible).
update detalle_pedido d
set costo_unitario = fn_costo_unitario_producto(d.id_producto, d.talla_ml)
where d.costo_unitario is null and d.id_producto is not null;

-- Al cargar o cambiar el costo de un perfume (o vincular un decant), las ventas suyas y de sus
-- decants que todavía no tenían costo se completan. Las que ya tenían costo NO se tocan.
create or replace function fn_completar_costos_ventas() returns trigger as $$
begin
    update detalle_pedido d
    set costo_unitario = fn_costo_unitario_producto(d.id_producto, d.talla_ml)
    where d.costo_unitario is null
      and (d.id_producto = new.id
           or d.id_producto in (select p.id from perfumes p where p.id_perfume_tienda = new.id and p.es_decant));
    return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_completar_costos_ventas on perfumes;
create trigger trg_completar_costos_ventas
after update of costo_importacion_pen, id_perfume_tienda on perfumes
for each row
when (new.costo_importacion_pen is distinct from old.costo_importacion_pen or new.id_perfume_tienda is distinct from old.id_perfume_tienda)
execute function fn_completar_costos_ventas();

-- ---------- 2. Gastos: proveedor y comprobante ----------
alter table gastos add column if not exists proveedor varchar(120);
alter table gastos add column if not exists comprobante_path text;

do $$
begin
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do update
        set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

    drop policy if exists "comprobantes admin ve" on storage.objects;
    create policy "comprobantes admin ve" on storage.objects for select to authenticated
        using (bucket_id = 'comprobantes' and public.is_admin());
    drop policy if exists "comprobantes admin sube" on storage.objects;
    create policy "comprobantes admin sube" on storage.objects for insert to authenticated
        with check (bucket_id = 'comprobantes' and public.is_admin());
    drop policy if exists "comprobantes admin borra" on storage.objects;
    create policy "comprobantes admin borra" on storage.objects for delete to authenticated
        using (bucket_id = 'comprobantes' and public.is_admin());
exception when insufficient_privilege then
    raise notice 'No se pudo crear el bucket "comprobantes" desde SQL. Créalo en Supabase → Storage → New bucket (nombre: comprobantes, Public: NO) con políticas solo para administradores.';
end $$;

-- ---------- 3. Ingreso de mercadería en una sola operación ----------
-- p_items: [{"id_producto": 90, "cantidad": 5, "costo_unitario": 110, "precio_venta": 155, "publicar": false}, ...]
--          costo_unitario / precio_venta / publicar son opcionales.
-- p_gasto: {"fecha": "2026-09-30", "metodo_pago": "Yape", "proveedor": "..."} o null para no registrar gasto.
create or replace function registrar_ingreso_mercaderia(p_items jsonb, p_nota text default null, p_gasto jsonb default null)
returns table (id_producto bigint, cerrados int, costo_promedio numeric, total_compra numeric) as $$
#variable_conflict use_column
declare
    v_item jsonb;
    v_id bigint;
    v_cantidad int;
    v_costo numeric;
    v_precio numeric;
    v_publicar boolean;
    v_p record;
    v_stock int;
    v_nuevo_costo numeric;
    v_total_compra numeric := 0;
    v_resumen text := '';
    v_nota text := coalesce(nullif(trim(p_nota), ''), 'Ingreso de mercadería');
begin
    if not is_admin() then
        raise exception 'No autorizado';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'Agrega al menos un perfume con su cantidad';
    end if;

    for v_item in select value from jsonb_array_elements(p_items) loop
        begin
            v_id := (v_item ->> 'id_producto')::bigint;
            v_cantidad := (v_item ->> 'cantidad')::int;
            v_costo := nullif(v_item ->> 'costo_unitario', '')::numeric;
            v_precio := nullif(v_item ->> 'precio_venta', '')::numeric;
            v_publicar := coalesce((v_item ->> 'publicar')::boolean, false);
        exception when others then
            raise exception 'Hay una fila con datos no válidos';
        end;
        if v_cantidad is null or v_cantidad < 1 then
            raise exception 'Revisa las cantidades: deben ser mayores a 0';
        end if;
        if v_costo is not null and v_costo < 0 then
            raise exception 'El costo no puede ser negativo';
        end if;
        if v_precio is not null and v_precio <= 0 then
            raise exception 'El precio de venta debe ser mayor a 0';
        end if;

        select p.id, p.nombre, p.es_decant, p.costo_importacion_pen into v_p from perfumes p where p.id = v_id for update;
        if not found or v_p.es_decant then
            raise exception 'Perfume no válido para ingreso (id %)', v_id;
        end if;
        select coalesce(i.stock_fisico, 0) into v_stock from inventario i where i.id_producto = v_id;
        v_stock := coalesce(v_stock, 0);

        -- Costo promedio ponderado: lo que quedaba a su costo + lo que llegó a su costo.
        if v_costo is not null then
            v_nuevo_costo := case
                when v_p.costo_importacion_pen is null or v_stock <= 0 then v_costo
                else round((v_stock * v_p.costo_importacion_pen + v_cantidad * v_costo) / (v_stock + v_cantidad), 2)
            end;
            v_total_compra := v_total_compra + v_cantidad * v_costo;
        else
            v_nuevo_costo := v_p.costo_importacion_pen;
        end if;

        perform ajustar_inventario(v_id, v_cantidad, null, null, true, 'Ingreso', v_nota);

        update perfumes p
        set costo_importacion_pen = v_nuevo_costo,
            precio_tienda_regular = coalesce(v_precio, p.precio_tienda_regular),
            descuento_tienda_porcentaje = case when v_precio is not null then 0 else p.descuento_tienda_porcentaje end,
            precio_consolidado_fijo = case when v_precio is not null then least(p.precio_consolidado_fijo, v_precio) else p.precio_consolidado_fijo end,
            margen_aplicado = case when v_precio is not null then true else p.margen_aplicado end,
            activo = case when v_publicar then true else p.activo end,
            estado = case when v_publicar and p.estado = 'Bajo_Pedido' then 'Disponible' else p.estado end
        where p.id = v_id;

        v_resumen := v_resumen || case when v_resumen = '' then '' else ', ' end || v_cantidad || ' ' || v_p.nombre;
        id_producto := v_id;
        cerrados := v_stock + v_cantidad;
        costo_promedio := v_nuevo_costo;
        total_compra := null;
        return next;
    end loop;

    if p_gasto is not null and v_total_compra > 0 then
        insert into gastos (fecha, categoria, descripcion, monto, metodo_pago, proveedor)
        values (
            coalesce(nullif(p_gasto ->> 'fecha', '')::date, current_date),
            'Mercadería',
            left('Compra de mercadería: ' || v_resumen, 200),
            round(v_total_compra, 2),
            nullif(p_gasto ->> 'metodo_pago', ''),
            nullif(left(p_gasto ->> 'proveedor', 120), '')
        );
    end if;

    -- Última fila: el total de la compra (para el mensaje del panel).
    id_producto := null;
    cerrados := null;
    costo_promedio := null;
    total_compra := round(v_total_compra, 2);
    return next;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function registrar_ingreso_mercaderia(jsonb, text, jsonb) from public, anon;
grant execute on function registrar_ingreso_mercaderia(jsonb, text, jsonb) to authenticated;

-- Revisión
select count(*) filter (where costo_unitario is not null) as ventas_con_costo,
       count(*) filter (where costo_unitario is null) as ventas_sin_costo
from detalle_pedido;
