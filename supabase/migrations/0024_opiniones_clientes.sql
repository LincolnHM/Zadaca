-- ==========================================================
-- MIGRACIÓN 0024 — Opiniones de clientes (perfumes y consolidado)
--
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a correr sin problema.
--
-- 1. Los clientes CON CUENTA dejan estrellas (1 a 5) y un comentario:
--    - sobre un perfume (tienda, decant o Catálogo Consolidado): una opinión por perfume;
--    - sobre el servicio de consolidado (cómo les fue con la importación): una por cliente.
--    Cada quien puede editar o borrar la suya. Sin cuenta no se puede opinar.
-- 2. Por defecto se publican al instante y el admin las supervisa en Panel → Reseñas: las nuevas
--    (y las que el cliente edita) aparecen como "Nuevas" hasta que el admin las marca revisadas,
--    las oculta o las elimina. Si se prefiere aprobar antes de publicar, se activa en ese mismo
--    panel (configuracion_sitio.resenas_requieren_aprobacion).
-- 3. La base completa sola el nombre que se muestra ("Lincoln H.", nunca el apellido completo
--    ni el correo) y la marca "Compra verificada" si el cliente de verdad compró ese perfume (o
--    trajo algo por consolidado). El cliente no puede mandar esos datos a mano.
-- 4. Arreglo: antes el botón Eliminar del panel no borraba nada (faltaba el permiso de borrar).
-- ==========================================================

-- ---------- 1. Columnas nuevas ----------
alter table resenas
    add column if not exists tipo varchar(20) not null default 'Producto',
    add column if not exists nombre_publico varchar(80),
    add column if not exists compra_verificada boolean not null default false,
    add column if not exists revisada boolean not null default false,
    add column if not exists fecha_actualizacion timestamp;

update resenas set aprobado = false where aprobado is null;
alter table resenas alter column aprobado set not null;
alter table resenas alter column aprobado set default true;

comment on column resenas.tipo is 'Producto = opinión de un perfume (id_producto); Consolidado = opinión del servicio de consolidado (sin producto).';
comment on column resenas.aprobado is 'true = visible en la web. El admin la oculta poniéndolo en false.';
comment on column resenas.revisada is 'false = el admin todavía no la vio (o el cliente la editó después). Panel → Reseñas → Nuevas.';
comment on column resenas.nombre_publico is 'Nombre que se muestra en la web ("Nombre I."), lo pone la base al crearla.';
comment on column resenas.compra_verificada is 'El cliente compró ese perfume (o trajo algo por consolidado). Lo calcula la base.';

alter table resenas drop constraint if exists chk_resena_tipo;
alter table resenas add constraint chk_resena_tipo check (tipo in ('Producto', 'Consolidado'));

-- "not valid": no revisa filas viejas (cargadas antes de existir el tipo), solo las nuevas.
alter table resenas drop constraint if exists chk_resena_objetivo;
alter table resenas add constraint chk_resena_objetivo check (
    (tipo = 'Producto' and id_producto is not null) or (tipo = 'Consolidado' and id_producto is null)
) not valid;

alter table resenas drop constraint if exists chk_resena_comentario;
alter table resenas add constraint chk_resena_comentario check (comentario is null or char_length(comentario) <= 1000) not valid;

-- Una opinión por cliente y perfume, y una sola sobre el consolidado. Si hubiera duplicados
-- viejos, se queda la más reciente.
delete from resenas r
using resenas r2
where r.tipo = 'Producto' and r2.tipo = 'Producto'
  and r.id_cliente = r2.id_cliente and r.id_producto = r2.id_producto
  and r.id < r2.id;
delete from resenas r
using resenas r2
where r.tipo = 'Consolidado' and r2.tipo = 'Consolidado'
  and r.id_cliente = r2.id_cliente
  and r.id < r2.id;

create unique index if not exists uq_resena_cliente_producto on resenas(id_cliente, id_producto) where tipo = 'Producto';
create unique index if not exists uq_resena_cliente_consolidado on resenas(id_cliente) where tipo = 'Consolidado';
create index if not exists idx_resenas_publicas on resenas(tipo, fecha_creacion desc) where aprobado;
create index if not exists idx_resenas_cliente on resenas(id_cliente);
create index if not exists idx_resenas_sin_revisar on resenas(fecha_creacion desc) where not revisada;

-- Interruptor del admin: false = se publican al instante (por defecto), true = esperan aprobación.
alter table configuracion_sitio add column if not exists resenas_requieren_aprobacion boolean not null default false;

-- ---------- 2. Nombre público y "Compra verificada" ----------
create or replace function fn_resena_nombre_publico(p_cliente uuid) returns varchar as $$
    select coalesce(
        nullif(
            initcap(split_part(btrim(coalesce(nombres, '')), ' ', 1))
            || case when btrim(coalesce(apellidos, '')) <> '' then ' ' || upper(left(btrim(apellidos), 1)) || '.' else '' end,
            ''),
        'Cliente')
    from perfiles where id = p_cliente;
$$ language sql stable security definer set search_path = public;

-- Compra verificada = pedido pagado (aunque sea en parte) y no anulado con ese perfume, su decant
-- o su frasco entero; o una reserva de consolidado confirmada. Para el consolidado: cualquier
-- pedido o reserva de consolidado confirmada.
create or replace function fn_resena_compra_verificada(p_cliente uuid, p_tipo varchar, p_producto bigint) returns boolean as $$
    select case
        when p_tipo = 'Consolidado' then
            exists (select 1 from pedidos p
                    where p.id_cliente = p_cliente and p.tipo_pedido = 'Consolidado'
                      and not p.cancelado and p.estado_pago in ('Parcial', 'Completado'))
            or exists (select 1 from detalle_consolidado dc
                       where dc.id_cliente = p_cliente and dc.estado_item in ('Confirmado', 'Convertido_A_Pedido'))
        else
            exists (select 1 from detalle_pedido d
                    join pedidos p on p.id = d.id_pedido
                    left join perfumes pr on pr.id = d.id_producto
                    where p.id_cliente = p_cliente and not p.cancelado and p.estado_pago in ('Parcial', 'Completado')
                      and (d.id_producto = p_producto
                           or pr.id_perfume_tienda = p_producto
                           or d.id_producto = (select id_perfume_tienda from perfumes where id = p_producto)))
            or exists (select 1 from detalle_consolidado dc
                       where dc.id_cliente = p_cliente and dc.id_producto = p_producto
                         and dc.estado_item in ('Confirmado', 'Convertido_A_Pedido'))
    end;
$$ language sql stable security definer set search_path = public;

-- Solo las usa el trigger de abajo: nadie puede llamarlas desde la web (si no, cualquiera podría
-- averiguar qué compró otro cliente).
revoke execute on function fn_resena_nombre_publico(uuid) from public, anon, authenticated;
revoke execute on function fn_resena_compra_verificada(uuid, varchar, bigint) from public, anon, authenticated;

-- ---------- 3. Lo que el cliente NO puede tocar ----------
-- Corre en cada alta o cambio que llega desde la web (auth.uid() presente). Un cambio hecho en el
-- SQL Editor (sin usuario) pasa tal cual.
create or replace function fn_preparar_resena() returns trigger as $$
declare
    v_admin boolean := is_admin();
    v_requiere_aprobacion boolean;
    v_recientes int;
    v_texto_cambio boolean;
begin
    if auth.uid() is null then
        return new;
    end if;

    select coalesce(resenas_requieren_aprobacion, false) into v_requiere_aprobacion from configuracion_sitio where id = 1;
    v_requiere_aprobacion := coalesce(v_requiere_aprobacion, false);

    if TG_OP = 'INSERT' then
        if new.id_cliente is distinct from auth.uid() then
            raise exception 'Solo puedes publicar opiniones con tu propia cuenta';
        end if;
        if not v_admin then
            select count(*) into v_recientes from resenas
            where id_cliente = new.id_cliente and fecha_creacion > now() - interval '1 day';
            if v_recientes >= 20 then
                raise exception 'Ya dejaste muchas opiniones hoy. Vuelve a intentarlo mañana.';
            end if;
        end if;
        if new.tipo = 'Producto' and not exists (select 1 from perfumes where id = new.id_producto and activo) then
            raise exception 'Este perfume no está disponible para opinar';
        end if;
        new.comentario := nullif(btrim(new.comentario), '');
        new.aprobado := v_admin or not v_requiere_aprobacion;
        new.revisada := v_admin;
        new.fecha_creacion := now();
        new.fecha_actualizacion := null;
        new.nombre_publico := fn_resena_nombre_publico(new.id_cliente);
        new.compra_verificada := fn_resena_compra_verificada(new.id_cliente, new.tipo, new.id_producto);
        return new;
    end if;

    -- UPDATE: a quién pertenece y sobre qué es no cambia nunca.
    new.id_cliente := old.id_cliente;
    new.tipo := old.tipo;
    new.id_producto := old.id_producto;
    new.fecha_creacion := old.fecha_creacion;
    new.nombre_publico := old.nombre_publico;

    if old.id_cliente <> auth.uid() then
        -- Moderación del admin (la policy solo deja llegar acá a un admin): puede publicar,
        -- ocultar o marcar revisada, pero no reescribir lo que dijo el cliente.
        new.calificacion := old.calificacion;
        new.comentario := old.comentario;
        new.fecha_actualizacion := old.fecha_actualizacion;
        new.compra_verificada := old.compra_verificada;
        return new;
    end if;

    -- El dueño edita su opinión.
    new.comentario := nullif(btrim(new.comentario), '');
    new.compra_verificada := fn_resena_compra_verificada(old.id_cliente, old.tipo, old.id_producto);
    v_texto_cambio := new.calificacion is distinct from old.calificacion or new.comentario is distinct from old.comentario;
    if v_admin then
        if v_texto_cambio then new.fecha_actualizacion := now(); end if;
        return new;
    end if;
    if v_texto_cambio then
        new.fecha_actualizacion := now();
        new.revisada := false;                     -- el admin la vuelve a ver en "Nuevas"
        new.aprobado := case when v_requiere_aprobacion then false else old.aprobado end;
    else
        new.revisada := old.revisada;
        new.aprobado := old.aprobado;
        new.fecha_actualizacion := old.fecha_actualizacion;
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_preparar_resena on resenas;
create trigger trg_preparar_resena
before insert or update on resenas
for each row execute function fn_preparar_resena();

-- ---------- 4. Permisos (RLS) ----------
drop policy if exists "resenas aprobadas publicas" on resenas;
drop policy if exists "resenas propias insertar" on resenas;
drop policy if exists "resenas admin modera" on resenas;
drop policy if exists "resenas leer" on resenas;
drop policy if exists "resenas cliente crea" on resenas;
drop policy if exists "resenas cliente edita" on resenas;
drop policy if exists "resenas cliente o admin borra" on resenas;
drop policy if exists "resenas admin modera todo" on resenas;

-- Cualquiera lee las publicadas; cada cliente ve también las suyas (aunque estén ocultas).
create policy "resenas leer" on resenas for select
    using (aprobado or id_cliente = auth.uid() or is_admin());
-- Solo con sesión iniciada y a nombre propio (el trigger completa el resto).
create policy "resenas cliente crea" on resenas for insert
    with check (auth.uid() is not null and id_cliente = auth.uid());
create policy "resenas cliente edita" on resenas for update
    using (id_cliente = auth.uid()) with check (id_cliente = auth.uid());
create policy "resenas admin modera todo" on resenas for update
    using (is_admin()) with check (is_admin());
create policy "resenas cliente o admin borra" on resenas for delete
    using (id_cliente = auth.uid() or is_admin());

grant select on resenas to anon;
grant select, insert, update, delete on resenas to authenticated;

notify pgrst, 'reload schema';
