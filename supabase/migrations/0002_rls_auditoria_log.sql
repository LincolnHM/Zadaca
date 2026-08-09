-- ==========================================================
-- MIGRACIÓN 0002 — Cierra un hueco de seguridad: la tabla auditoria_log se
-- creó en schema.sql sin "enable row level security" ni políticas, a
-- diferencia de TODAS las demás tablas del esquema. Sin esto, cualquiera con
-- la anon key podía leer o insertar filas ahí directo por la REST API de
-- Supabase (mismo tipo de ataque que un POST crudo a /rest/v1/<tabla>,
-- saltándose por completo la app). Nada en el código usa esta tabla todavía,
-- pero al ser un log de auditoría de acciones de admin no debe quedar abierta.
-- Ejecutar una sola vez en el SQL Editor de Supabase (producción).
-- ==========================================================

alter table auditoria_log enable row level security;

create policy "auditoria admin lee" on auditoria_log for select using (is_admin());
