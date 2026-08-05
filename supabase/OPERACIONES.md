# Operaciones — backups, staging y despliegue

Esta guía es para cuando el sitio ya tiene datos reales de clientes y pagos. No es código,
son los pasos que evitan perder información o romper producción por accidente.

## 1. Backups

Supabase hace backups automáticos de tu base de datos, pero **la retención depende de tu
plan** (revísala en tu proyecto → Database → Backups; en general el plan gratuito guarda
menos días que los planes pagos, y solo los planes pagos ofrecen restauración a un punto
exacto en el tiempo). No asumas que "ya está resuelto" solo por tener un plan gratuito.

Como respaldo adicional, sin depender del plan:

```bash
# Requiere la Supabase CLI (npm i -g supabase) y el connection string de tu proyecto
# (Project Settings → Database → Connection string → URI)
supabase db dump --db-url "postgresql://postgres:TU-PASSWORD@TU-HOST:5432/postgres" -f backup-$(date +%Y%m%d).sql
```

Recomendación práctica: corre esto **antes de cualquier cambio de esquema en producción**
(agregar columnas, correr una migración nueva) y guarda el archivo fuera de tu compu —
un repo privado de GitHub o Google Drive alcanza para el tamaño de esta base de datos.

## 2. Ambiente de staging (antes de tocar producción)

Con clientes reales pagando, probar un cambio de esquema directo en producción es
arriesgado. Recomendado:

1. Crea un segundo proyecto en Supabase (gratis), ej. `maison-zadaca-staging`.
2. Corre ahí `schema.sql` y `seed.sql` igual que en producción (ver README).
3. Prueba el cambio ahí primero. Si algo sale mal, no afecta a un solo cliente real.
4. Recién entonces aplica el mismo SQL en el proyecto de producción.

No hace falta un segundo despliegue del sitio (GitHub Pages) para esto — basta con apuntar
temporalmente `assets/js/supabase-config.js` de tu copia local al proyecto de staging
mientras pruebas, sin subir ese cambio a producción.

## 3. De aquí en adelante: migraciones, no "volver a correr schema.sql"

`schema.sql` fue pensado para la instalación inicial (`create table`, no `create table if
not exists`) — córrelo dos veces sobre la misma base y falla porque las tablas ya existen.
Para cambios futuros, crea archivos nuevos en `supabase/migrations/`, numerados en orden,
con solo el cambio incremental (`alter table ...`, `create table ...`). Ejemplo:

```
supabase/migrations/0001_agregar_campo_x.sql
supabase/migrations/0002_nueva_tabla_y.sql
```

Corre cada uno una sola vez, en orden, en el SQL Editor (primero en staging, después en
producción). Si más adelante quieres automatizar esto, la Supabase CLI tiene
`supabase migration new` / `supabase db push`, pero el flujo manual de arriba funciona
igual de bien para el tamaño de este proyecto.

## 4. Desplegar las Edge Functions

Este proyecto usa dos funciones (`supabase/functions/`):

- **`cotizacion-publica`** — necesaria para que el rate-limit real de cotizaciones funcione.
  Sin desplegarla, el sitio sigue funcionando (cae al insert directo protegido por RLS,
  ver `assets/js/api.js`), pero sin límite de solicitudes por IP.
- **`notify-email`** — opcional, solo si quieres que las notificaciones también lleguen por
  correo (ver `supabase/functions/notify-email/index.ts` para la config con Resend).

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU-PROJECT-REF   # está en Project Settings → General
supabase functions deploy cotizacion-publica
supabase functions deploy notify-email        # opcional
```

No hace falta configurar secretos para `cotizacion-publica` (usa las variables que Supabase
inyecta solo). Para `notify-email`, ver las instrucciones dentro de ese archivo.

## 5. Storage (comprobantes de pago)

`schema.sql` ya crea el bucket `comprobantes` (privado) y sus políticas. No necesitas
crearlo a mano en el dashboard — con correr `schema.sql` una vez alcanza.
