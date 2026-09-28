-- ==========================================================
-- MIGRACIÓN 0020 — Consolidado con Carrito de Avión, anuncio con fotos y redes sociales
--
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a correr sin problema.
--
-- 1. reservar_carrito_avion(): confirma TODO el Carrito de Avión de una sola vez (todo o
--    nada) y valida en el servidor el pedido mínimo de unidades (configuracion_sitio).
-- 2. Anuncio (popup): varias fotos (subidas desde el panel), dónde mostrarlo y bucket de
--    imágenes en Supabase Storage para que el admin suba fotos sin tocar código.
-- 3. Redes sociales: 2 cuentas de TikTok, Instagram y Facebook.
-- 4. Preguntas frecuentes: vuelven a explicar el consolidado (ahora con Carrito de Avión).
--
-- Los perfumes que solo se traen por consolidado (los que el admin agrega con "nombre y
-- precio") usan el estado 'Bajo_Pedido' que ya existía: no salen en la tienda ni en el
-- buscador, solo en el Catálogo Consolidado. No hace falta ninguna columna nueva para eso.
-- ==========================================================

-- ---------- 1. Carrito de Avión ----------
-- Antes el navegador confirmaba el carrito llamando reservar_en_consolidado() una vez por
-- perfume: si fallaba a la mitad quedaba una reserva a medias, y el mínimo de 4 unidades solo
-- lo controlaba la página. Esto hace lo mismo dentro de UNA transacción: o entra todo el
-- carrito o no entra nada, y el mínimo lo valida la base de datos.
-- p_items: [{"id_producto": 12, "cantidad": 2}, ...]
create or replace function reservar_carrito_avion(p_id_consolidado bigint, p_items jsonb, p_id_direccion bigint)
returns table (id_producto bigint, id_detalle bigint, estado_item varchar) as $$
#variable_conflict use_column
declare
    v_item jsonb;
    v_id bigint;
    v_cantidad int;
    v_minimo int;
    v_unidades_nuevas int := 0;
    v_unidades_previas int;
    v_detalle bigint;
begin
    if auth.uid() is null then
        raise exception 'Inicia sesión para confirmar tu Carrito de Avión';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'Tu Carrito de Avión está vacío';
    end if;
    if jsonb_array_length(p_items) > 80 then
        raise exception 'Son demasiados perfumes para un solo pedido: escríbenos por WhatsApp';
    end if;

    for v_item in select value from jsonb_array_elements(p_items) loop
        begin
            v_id := (v_item ->> 'id_producto')::bigint;
            v_cantidad := (v_item ->> 'cantidad')::int;
        exception when others then
            raise exception 'Hay un perfume con datos no válidos en el carrito';
        end;
        if v_id is null or v_cantidad is null or v_cantidad < 1 or v_cantidad > 500 then
            raise exception 'Revisa las cantidades de tu Carrito de Avión';
        end if;
        if not exists (select 1 from perfumes p where p.id = v_id and p.activo and not p.es_decant) then
            raise exception 'Uno de los perfumes de tu carrito ya no está disponible para consolidado: quítalo y vuelve a intentar';
        end if;
        v_unidades_nuevas := v_unidades_nuevas + v_cantidad;
    end loop;

    select coalesce(c.consolidado_minimo_unidades, 4) into v_minimo from configuracion_sitio c where c.id = 1;
    v_minimo := coalesce(v_minimo, 4);

    -- Lo que el cliente ya tenía reservado en ESTA campaña también cuenta para el mínimo.
    select coalesce(sum(dc.cantidad), 0) into v_unidades_previas
    from detalle_consolidado dc
    where dc.id_consolidado = p_id_consolidado and dc.id_cliente = auth.uid()
      and dc.estado_item in ('Reservado', 'Pendiente_Aprobacion');

    if v_unidades_previas + v_unidades_nuevas < v_minimo then
        raise exception 'El pedido mínimo por consolidado es de % unidades (llevas %)', v_minimo, v_unidades_previas + v_unidades_nuevas;
    end if;

    -- reservar_en_consolidado() valida la campaña (abierta y en fecha), la dirección, calcula
    -- el precio del lado del servidor (con descuento por volumen) y deja en
    -- 'Pendiente_Aprobacion' lo que llegue a 10+ unidades de un mismo perfume.
    for v_item in select value from jsonb_array_elements(p_items) loop
        v_id := (v_item ->> 'id_producto')::bigint;
        v_cantidad := (v_item ->> 'cantidad')::int;
        v_detalle := reservar_en_consolidado(p_id_consolidado, v_id, v_cantidad, p_id_direccion);
        id_producto := v_id;
        id_detalle := v_detalle;
        select dc.estado_item into estado_item from detalle_consolidado dc where dc.id = v_detalle;
        return next;
    end loop;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function reservar_carrito_avion(bigint, jsonb, bigint) from public, anon;
grant execute on function reservar_carrito_avion(bigint, jsonb, bigint) to authenticated;

-- ---------- 2. Anuncio (popup) con fotos ----------
alter table publicidad_popup add column if not exists imagenes jsonb not null default '[]'::jsonb;
alter table publicidad_popup add column if not exists mostrar_en varchar(10) not null default 'todas';
alter table publicidad_popup drop constraint if exists chk_publicidad_mostrar_en;
alter table publicidad_popup add constraint chk_publicidad_mostrar_en check (mostrar_en in ('todas', 'inicio'));
alter table publicidad_popup drop constraint if exists chk_publicidad_imagenes;
alter table publicidad_popup add constraint chk_publicidad_imagenes check (jsonb_typeof(imagenes) = 'array' and jsonb_array_length(imagenes) <= 8);

-- La imagen única de antes pasa a ser la primera foto del anuncio.
update publicidad_popup
set imagenes = jsonb_build_array(imagen_url)
where coalesce(imagen_url, '') <> '' and imagenes = '[]'::jsonb;

-- Bucket público "imagenes" (fotos del anuncio y de perfumes subidas desde el panel). Solo un
-- admin puede subir/cambiar/borrar; cualquiera puede ver (es público, como las fotos del sitio).
do $$
begin
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('imagenes', 'imagenes', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
    on conflict (id) do update
        set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

    drop policy if exists "imagenes admin ve" on storage.objects;
    create policy "imagenes admin ve" on storage.objects for select to authenticated
        using (bucket_id = 'imagenes' and public.is_admin());
    drop policy if exists "imagenes admin sube" on storage.objects;
    create policy "imagenes admin sube" on storage.objects for insert to authenticated
        with check (bucket_id = 'imagenes' and public.is_admin());
    drop policy if exists "imagenes admin edita" on storage.objects;
    create policy "imagenes admin edita" on storage.objects for update to authenticated
        using (bucket_id = 'imagenes' and public.is_admin()) with check (bucket_id = 'imagenes' and public.is_admin());
    drop policy if exists "imagenes admin borra" on storage.objects;
    create policy "imagenes admin borra" on storage.objects for delete to authenticated
        using (bucket_id = 'imagenes' and public.is_admin());
exception when insufficient_privilege then
    raise notice 'No se pudo crear el bucket "imagenes" desde SQL. Créalo en Supabase → Storage → New bucket (nombre: imagenes, Public: sí) y agrega una política que permita subir solo a administradores.';
end $$;

-- ---------- 3. Redes sociales ----------
alter table configuracion_sitio add column if not exists tiktok_url_2 text;

update configuracion_sitio
set instagram_url = coalesce(nullif(instagram_url, ''), 'https://www.instagram.com/zadaca_maison'),
    tiktok_url = coalesce(nullif(tiktok_url, ''), 'https://www.tiktok.com/@maisonzadaca.perfumeria'),
    tiktok_url_2 = coalesce(nullif(tiktok_url_2, ''), 'https://www.tiktok.com/@perfumeriazadaca'),
    facebook_url = coalesce(nullif(facebook_url, ''), 'https://www.facebook.com/share/19cJ7mVC6B/')
where id = 1;

-- ---------- 4. Preguntas frecuentes con consolidado ----------
-- Cada cambio solo corre si la pregunta todavía no habla del Carrito de Avión (no pisa lo que
-- ya hayas editado desde el panel).
update preguntas_frecuentes
set activo = true,
    pregunta = '¿Cómo funciona el Consolidado?',
    respuesta = 'Eliges tus perfumes en el <a href="https://madisonzadaca.com/catalogo-consolidado/">Catálogo Consolidado</a> y los vas sumando a tu <strong>Carrito de Avión</strong> (es aparte del carrito de la tienda). El pedido mínimo es de <strong>{{minimo_unidades}} unidades</strong> en total y pueden ser perfumes distintos. Lo confirmas en la web o nos lo envías por WhatsApp; cada campaña cierra los {{dia_cierre}} y tu pedido llega en {{envio_dias}} días aprox. después del cierre.'
where id = 5 and respuesta not ilike '%Carrito de Avión%';

update preguntas_frecuentes
set pregunta = '¿Cuál es la diferencia entre Tienda, Decants, Consolidado y Liquidaciones?',
    respuesta = '<strong>Tienda</strong> es stock físico real: perfumes originales en frasco completo que compras y recibes de inmediato. <strong>Decants</strong> son fracciones de 3, 5 o 10 ml del perfume original, ideales para probarlo antes. <strong>Consolidado</strong> es importación por encargo a mejor precio: armas tu Carrito de Avión (mínimo {{minimo_unidades}} unidades) y llega en {{envio_dias}} días aprox. <strong>Liquidaciones</strong> es mercadería que cae directo a stock a precio rebajado, por mayor o por unidad según el producto.'
where id = 3 and respuesta not ilike '%Carrito de Avión%';

update preguntas_frecuentes
set respuesta = 'Sí, vía Shalom u Olva Courier a cualquier departamento. También puedes comprar o recoger tu pedido en nuestra tienda física de Chiclayo, y los pedidos por consolidado se pueden recoger además en nuestro almacén de Lima.'
where id = 1 and respuesta not ilike '%consolidado%';

update preguntas_frecuentes
set respuesta = 'Sí. En Liquidaciones cada producto tiene su propia cantidad mínima (desde 1 unidad hasta packs de 2 o 6), y en el Consolidado mientras más unidades lleves en tu Carrito de Avión, mejor precio por volumen. Para pedidos grandes escríbenos por WhatsApp.'
where id = 6 and respuesta not ilike '%Carrito de Avión%';

-- Links viejos al dominio de GitHub Pages → dominio propio.
update preguntas_frecuentes
set respuesta = replace(respuesta, 'https://lincolnhm.github.io/Zadaca/', 'https://madisonzadaca.com/')
where respuesta like '%lincolnhm.github.io/Zadaca/%';

-- Revisión
select id, orden, activo, pregunta from preguntas_frecuentes order by orden;
select instagram_url, tiktok_url, tiktok_url_2, facebook_url from configuracion_sitio where id = 1;
