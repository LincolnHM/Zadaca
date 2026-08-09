-- ==========================================================
-- MIGRACIÓN 0003 — Corrige fn_bloquear_autoascenso_admin(): el trigger se
-- disparaba también en updates corridos directo en el SQL Editor de Supabase
-- (sin JWT de usuario), donde auth.uid() da null. Ahí is_admin() también daba
-- false, así que el trigger revertía CUALQUIER cambio de rol — incluyendo el
-- update legítimo del dueño del proyecto para crearse a sí mismo como el
-- primer Admin. Resultado: no había ninguna forma de asignar el primer Admin.
--
-- El fix agrega "auth.uid() is not null": el bloqueo sigue aplicando al
-- camino que sí puede abusar un cliente (un update que pasa por PostgREST con
-- su propio JWT), pero deja pasar los updates corridos directo en la base de
-- datos (SQL Editor, service role, migraciones) — quien tiene ese nivel de
-- acceso ya puede saltarse cualquier protección de la app de todos modos.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase (producción). Después de
-- correr esto, recién funciona:
--   update perfiles set rol = 'Admin' where correo = 'tu-correo@ejemplo.com';
-- ==========================================================

create or replace function fn_bloquear_autoascenso_admin() returns trigger as $$
begin
    if new.rol is distinct from old.rol and auth.uid() is not null and not is_admin() then
        new.rol := old.rol;
    end if;
    return new;
end;
$$ language plpgsql security definer set search_path = public;
