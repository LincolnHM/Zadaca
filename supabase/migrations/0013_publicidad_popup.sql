-- ==========================================================
-- MIGRACIÓN 0013 — Publicidad (popup del inicio), editable desde el panel
-- admin. Antes no existía ningún mecanismo para mostrar un anuncio/oferta
-- al cargar la página de inicio -- esto agrega una fila única (igual
-- patrón que configuracion_sitio, ver migración 0012) que el admin
-- prende/apaga y edita sin tocar código.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase (producción).
-- ==========================================================

create table publicidad_popup (
    id smallint primary key default 1,
    -- Apagado por defecto: no se muestra nada hasta que el admin cargue el
    -- contenido y lo active a propósito desde el panel.
    activo boolean not null default false,
    titulo text,
    mensaje text,
    imagen_url text,
    texto_boton text,
    url_boton text,
    -- Ambas opcionales: si se dejan vacías, el popup se muestra siempre
    -- mientras "activo" esté prendido. Si se cargan, solo se muestra dentro
    -- de ese rango (ej. una oferta por tiempo limitado).
    fecha_inicio timestamp,
    fecha_fin timestamp,
    actualizado_en timestamp default now(),
    constraint chk_publicidad_una_fila check (id = 1)
);

alter table publicidad_popup enable row level security;

create policy "publicidad publico" on publicidad_popup for select using (true);
create policy "publicidad admin escribe" on publicidad_popup for update using (is_admin()) with check (is_admin());

insert into publicidad_popup (id) values (1);
