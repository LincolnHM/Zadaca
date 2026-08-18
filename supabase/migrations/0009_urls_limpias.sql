-- ==========================================================
-- MIGRACIÓN 0009 — URLs limpias (sin ".html") en las notificaciones
--
-- El sitio pasó de archivos sueltos en la raíz (cuenta.html, consolidado.html...) a una
-- carpeta por página con su index.html adentro (cuenta/, consolidado/...) para que el link
-- que ve el cliente diga "maisonzadaca.../cuenta" en vez de ".../cuenta.html". El front-end
-- (main.js, cuenta.js, etc.) ya se actualizó para armar esos links nuevos.
--
-- Lo único que la migración no podía tocar desde el código del sitio es esto: 3 funciones acá
-- en la base insertan notificaciones con un "url_destino" armado a mano (cambio de estado de
-- consolidado, respuesta de cotización, registro de pago), y ese texto quedaba grabado
-- adentro de la función en SQL, no en el front-end. Sin este script, toda notificación nueva
-- seguiría apuntando a ".../consolidado.html?id=X" -- una URL que ya no existe.
--
-- 1) Se re-crean las 3 funciones con la ruta nueva (mismo comportamiento, solo cambia el
--    string de url_destino).
-- 2) Se corrigen las notificaciones YA guardadas de clientes reales, para que el botón "Ver"
--    de notificaciones viejas tampoco quede roto.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- ---------- 1) Redefinir las 3 funciones con url_destino sin ".html" ----------

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

-- ---------- 2) Corregir notificaciones ya guardadas (clientes reales) ----------

update notificaciones set url_destino = regexp_replace(url_destino, '^consolidado\.html', 'consolidado/')
where url_destino like 'consolidado.html%';

update notificaciones set url_destino = regexp_replace(url_destino, '^cuenta\.html', 'cuenta/')
where url_destino like 'cuenta.html%';
