# Maison Zadaca — Sitio Web (Supabase)

Segunda línea web de Maison Zadaca: mismo modelo de negocio que el proyecto local (`TIO ZADAKA`) — tienda directa de perfumes + consolidados (compras grupales) — pero como **proyecto independiente**: base de datos propia en Supabase (no comparte credenciales con la otra base de datos), y sitio 100% estático listo para publicar en GitHub Pages.

Diseño de referencia y fotos de producto tomadas de tu proyecto `PAGINA.WEB.MICHT` (solo las imágenes de los perfumes — nada de código, ni el logo/mascota de esa marca, ni sus credenciales).

## Estructura

```
MAISON ZADACA WEB/
├── index.html, catalogo.html, producto.html, consolidados.html, ...
├── robots.txt, sitemap.xml       <- SEO (reemplaza TU-DOMINIO antes de publicar)
├── assets/
│   ├── css/style.css
│   ├── js/
│   │   ├── supabase-config.js   <- AQUÍ pones tu URL y anon key de Supabase
│   │   ├── api.js               <- toda la lógica de datos (Supabase)
│   │   └── main.js, home.js, catalogo.js, ...
│   └── img/perfumes/            <- 86 fotos reales de perfumes (de Micht)
├── supabase/
│   ├── schema.sql                <- ejecutar primero en Supabase
│   ├── seed.sql                  <- ejecutar después (catálogo real, ver más abajo)
│   ├── OPERACIONES.md             <- backups, staging, despliegue de Edge Functions
│   └── functions/                 <- cotizacion-publica (rate-limit) y notify-email (opcional)
└── .github/workflows/deploy.yml  <- despliegue automático a GitHub Pages
```

No hay backend propio ni Node — el navegador habla directo con Supabase usando la librería `@supabase/supabase-js` (se carga desde un CDN, sin instalar nada). Las únicas dos piezas de servidor son las Edge Functions de Supabase (opcionales, ver `supabase/OPERACIONES.md`), que tampoco son un servidor propio que tengas que mantener.

---

## Paso 1 — Crear tu cuenta y proyecto en Supabase

Supabase es un servicio en la nube (gratuito para este tamaño de proyecto) que te da una base de datos PostgreSQL + autenticación de usuarios, sin que tengas que administrar un servidor.

1. Ve a **https://supabase.com** y haz clic en **"Start your project"**.
2. Crea una cuenta (con GitHub o con correo).
3. Clic en **"New project"**.
   - **Name**: `maison-zadaca` (o el nombre que prefieras).
   - **Database Password**: genera una contraseña segura y **guárdala** (la puedes necesitar más adelante, aunque no la usaremos directamente en el sitio).
   - **Region**: elige la más cercana a Perú (por ejemplo, `South America (São Paulo)` si está disponible, o `US East`).
   - Clic en **"Create new project"** y espera 1-2 minutos mientras se aprovisiona.

## Paso 2 — Ejecutar el esquema de base de datos

1. Dentro de tu proyecto Supabase, ve al menú lateral **SQL Editor**.
2. Clic en **"New query"**.
3. Abre el archivo `supabase/schema.sql` de esta carpeta, copia **todo** su contenido, pégalo en el editor y dale **Run**.
   - Esto crea las 19 tablas, los triggers que evitan sobreventa en los consolidados, las políticas de seguridad (RLS) y la función de checkout.
4. Repite el proceso con `supabase/seed.sql` (nueva query, pegar, Run).
   - Esto carga el catálogo real de 217 perfumes (extraído de tus consolidados VIP, con su costo
     de importación — ver sección "Catálogo real" más abajo), el ubigeo de Perú y 2 consolidados activos.

Si algo falla al ejecutar, revisa que copiaste el archivo completo — ambos scripts fueron probados de principio a fin antes de esta entrega.

## Paso 3 — Obtener tu URL y clave (anon key)

1. En el menú lateral, ve a **Project Settings** (ícono de engranaje) → **API**.
2. Copia el valor de **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`).
3. Copia el valor de **anon / public key** (una clave larga que empieza con `eyJ...`).

## Paso 4 — Configurar el sitio

Abre `assets/js/supabase-config.js` y reemplaza los dos valores:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';   // tu Project URL
const SUPABASE_ANON_KEY = 'eyJ...';                          // tu anon key
```

Guarda el archivo. La `anon key` es pública por diseño (así funciona Supabase) — la seguridad real la dan las políticas RLS que ya están en `schema.sql`, que restringen a cada cliente a ver/editar solo sus propios datos.

## Paso 5 — Probar en tu computadora

No necesitas instalar nada backend. Basta con servir la carpeta como archivos estáticos. La forma más simple si tienes Node instalado:

```bash
npx serve .
```

Y abrir la URL que te indique (normalmente `http://localhost:3000`). También funciona con la extensión "Live Server" de VS Code, o cualquier servidor estático.

### Confirmar correo al registrarte (importante)

Por defecto, Supabase pide confirmar el correo antes de poder iniciar sesión. Para probar rápido sin configurar envío de correos:

1. Ve a **Authentication → Providers → Email** en tu panel de Supabase.
2. Desactiva **"Confirm email"** (solo para desarrollo/pruebas; actívalo de nuevo antes de lanzar en producción real, o configura un proveedor de correo).

## Paso 6 — Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado con GitHub Pages habilitado en tu plan).
2. Sube esta carpeta completa:
   ```bash
   git init
   git add .
   git commit -m "Sitio inicial Maison Zadaca"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. El workflow en `.github/workflows/deploy.yml` se ejecuta automáticamente en cada push a `main` y publica el sitio.
5. Tu sitio quedará en `https://TU-USUARIO.github.io/TU-REPO/`.

### Dominio propio (opcional)

Si tienes un dominio, agrégalo en **Settings → Pages → Custom domain**, y crea un archivo `CNAME` en la raíz del proyecto con ese dominio (igual que en tu otro proyecto Micht).

---

## Usuarios y datos

No se crean usuarios de prueba automáticamente (a diferencia del proyecto local): Supabase Auth requiere que el registro pase por su propio flujo. Simplemente entra a `cuenta.html` en tu sitio y crea una cuenta desde el formulario — el perfil se crea automáticamente.

## Qué se reutilizó de PAGINA.WEB.MICHT (y qué no)

- ✅ **86 fotografías de perfumes** (`img PERFUMES/` e `imgPerfumesEnteros/`), copiadas a `assets/img/perfumes/`. `seed.sql` les asigna imagen automáticamente a los productos del catálogo real cuyo nombre coincide con una foto (bastante menos de 217 — el resto de fotos queda disponible en la carpeta para que las asignes desde el panel admin a los productos que aún no tienen imagen).
- ✅ **Inspiración de diseño**: filtros rápidos por género en píldoras, botón flotante de WhatsApp — patrones de UX que funcionan bien y se adaptaron a la identidad negro/dorado de Zadaca.
- ❌ Nada de código, CSS ni JS de Micht.
- ❌ El logo/mascota (gato) de Micht — Maison Zadaca usa su propia identidad (ícono + wordmark).
- ❌ Ninguna credencial, base de datos ni configuración de Supabase de Micht — este proyecto usa **tu propio proyecto Supabase**, completamente separado.

## Catálogo real (importado de "CONSOLIDADO VIP ZADACA10")

`supabase/seed.sql` ya no trae los 43 productos de ejemplo: trae los **217 perfumes reales**
extraídos del Excel de consolidados, con su costo de importación. Antes de publicar el sitio:

1. **Corre la Calculadora de Márgenes** (panel admin → *Calculadora de Márgenes*). Al importar, el
   precio de tienda y el precio consolidado quedan **igual al costo** (`margen_aplicado = false`)
   — es un valor de referencia, no un precio de venta. Si publicas sin pasar por ahí, el sitio
   vendería al costo. Desde esa pantalla defines el % de margen para consolidado y para tienda
   regular y lo aplicas a todo el catálogo de una vez (o fila por fila si prefieres precios
   distintos por producto). El botón "Aplicar a todo el catálogo" respeta por defecto los precios
   que ya hayas ajustado a mano (no los vuelve a pisar).
2. **Revisa los 34 productos con marca "Por Definir"** — el nombre del perfume en el Excel no traía
   marca identificable de forma confiable (ej. "Liquid", "Malachite", "The Kingdom"); corrígelos
   en Productos → Editar.
3. **Revisa nombres/duplicados**: el Excel original tenía errores de tipeo y filas repetidas para
   el mismo perfume entre distintas rondas de consolidado (ej. "9 PM" vs "9PM", con precios
   ligeramente distintos por el tipo de cambio del momento). Se limpiaron y deduplicaron con
   heurísticas automáticas, pero conviene una revisión rápida — sobre todo con "Tester" y sets.
4. Cada producto tiene ahora `costo_importacion_pen` / `costo_importacion_usd`: son **datos
   internos del admin, nunca se muestran al cliente** (no aparecen en `api.js`, solo en
   `admin-api.js`).

## Cotizaciones (perfumes fuera de catálogo) → WhatsApp

Cuando un cliente pide un perfume que no está en el catálogo, `contacto.html` deja cotizar **sin
necesidad de crear cuenta** (solo pide nombre + WhatsApp si no hay sesión iniciada). Al enviar:

1. Se guarda en la tabla `solicitudes_cotizacion` (estado `Pendiente`).
2. Se abre automáticamente un enlace de WhatsApp (`wa.me`) con el mensaje ya redactado hacia el
   número del negocio (`WHATSAPP_NUMERO` en `api.js`), para que el cliente solo tenga que darle
   "Enviar" y lo atiendan al toque.
3. En el panel admin → Cotizaciones, respondes con precio (opcional) y, cuando decides sumarlo al
   catálogo, el botón **"Convertir a Producto"** abre el formulario de nuevo perfume ya prellenado
   con lo que pidió el cliente — solo completas precio/costo/imagen y queda enlazado a esa
   cotización (estado pasa a `Convertido_A_Producto`).

Nota de seguridad: al abrir la cotización a visitantes sin cuenta, cualquiera con la `anon key`
(pública por diseño) podría escribir muchas filas por script. Hay un honeypot y un límite de
reenvío de 60s en el formulario (`contacto.js`), pero eso es solo defensa en el navegador — al no
haber backend propio, no hay un límite de tasa real a nivel de servidor. Si esto se vuelve un
problema, la solución es una Supabase Edge Function delante del insert (fuera del alcance actual,
que es 100% estático).

## Pagos (por WhatsApp) y pagos parciales

El comprobante (captura de Yape/Plin/transferencia) se resuelve por WhatsApp, no se sube al
sitio. En `cuenta.html` → Mis Pedidos, si hay saldo pendiente aparece un botón **"Pagar por
WhatsApp"** que abre el chat con el pedido y el monto ya escritos. El admin, apenas confirma
el pago en esa conversación, lo anota en el detalle del pedido ("Registrar Pago") — puede
hacerlo las veces que haga falta (ej. S/50 hoy, S/100 la próxima semana, el resto después):
`pedidos.monto_adelanto_pagado`, `monto_saldo_pendiente` y `estado_pago` se recalculan solos
con un trigger cada vez que se registra o se anula un pago, así que el saldo real nunca se
desincroniza a mano. Sigue sin haber pasarela de tarjeta — para eso necesitarías dar de alta
una cuenta con Culqi/Niubiz/MercadoPago, que pide tus datos de negocio reales, así que no es
algo que se resuelva solo con código.

## Consolidados → pedidos reales, y contabilidad

Reservar en un consolidado (`detalle_consolidado`) es distinto de tener un pedido cobrable
(`pedidos`) — antes esa conversión no existía en ningún lado del código. Ahora:

1. Mientras la campaña sigue "Abierta", el panel admin → **Contabilidad** ya te muestra, en
   vivo, cuántas unidades de cada perfume vas a tener que pedir al proveedor y cuánto se
   espera cobrar en total (a partir de las reservas, aunque todavía no se hayan convertido en
   pedidos).
2. Cuando cierras la campaña (le cambias el estado, ya no admite más reservas) y le das
   **"Generar Pedidos"**, cada cliente con reservas queda con un pedido real — recién ahí
   entra en el mismo flujo de pagos parciales por WhatsApp que un pedido de tienda directa.
3. Con los pedidos generados, el botón **"Exportar a Excel"** te descarga un `.xlsx` con una
   fila por producto por pedido: cliente, teléfono, perfume, cantidad, precio, total pagado y
   saldo — para mandarlo al proveedor o llevar tu propio control.

## Notificaciones y anti-spam real

- **Notificaciones**: campanita en el header (solo visible logueado) + pestaña
  "Notificaciones" en Mi Cuenta. Se generan solas cuando cambia el estado de un consolidado,
  responden tu cotización, o se registra/anula un pago. Correo además de en-la-web es
  opcional (ver `supabase/functions/notify-email/`).
- **Rate-limit real en cotizaciones**: la Edge Function `cotizacion-publica` limita a 5
  solicitudes por hora por IP. Hay que desplegarla (ver `supabase/OPERACIONES.md`); mientras
  no la despliegues, el sitio sigue funcionando con el insert directo de antes (solo sin ese
  límite).
- **Backups, staging y migraciones**: ver `supabase/OPERACIONES.md`.

## Seguridad — permisos por tabla (RLS)

Se hizo una revisión completa de a qué puede escribir cada rol (`anon`/`authenticated`) en
cada tabla. Se encontraron y cerraron varios huecos que **ya venían del esquema original**,
no de lo agregado esta ronda — vale la pena que los conozcas:

- **Crítico — autoascenso a Admin**: la política que dejaba a cada cliente editar su propio
  perfil no impedía que, en ese mismo `update`, mandara `rol: 'Admin'` y se autoascendiera.
  Ahora un trigger (`fn_bloquear_autoascenso_admin`) revierte cualquier cambio de rol que no
  venga de un Admin real, sin importar qué política de update lo deje pasar.
- **Reseñas auto-aprobadas**: se podía mandar `aprobado: true` en el insert y saltarse la
  moderación. Cerrado.
- **Precios manipulables**: `pedidos`, `detalle_pedido` y `detalle_consolidado` tenían
  políticas que dejaban insertar directo desde el navegador — es decir, alguien podía mandar
  el precio que quisiera (ej. reservar un perfume a S/0.01). Ahora esas tablas **no aceptan
  insert directo de clientes**: todo pasa por funciones (`crear_pedido_directo`,
  `reservar_en_consolidado`) que calculan el precio ellas mismas del lado del servidor.
- **Cotizaciones y pagos**: solo admin puede insertar/aprobar pagos; las cotizaciones abiertas
  a invitados siguen restringidas a lo mínimo (nombre, contacto, qué piden).
- Como estas tablas ya no dependen de código de aplicación para estar seguras (la regla vive
  en la base de datos), aunque alguien abra las herramientas de desarrollador del navegador y
  mande requests a mano contra la API de Supabase, no puede saltarse ninguna de estas reglas.

## SEO

`robots.txt` y `sitemap.xml` están listos pero con `https://TU-DOMINIO` como placeholder en
vez de una URL real — cámbialo por tu dominio de GitHub Pages o el propio antes de publicar
(un sitemap con URLs que no resuelven no le sirve a Google). Lo mismo aplica a los tags
`canonical`/`og:url` en el `<head>` de cada página, que hoy son rutas relativas. El catálogo
(`producto.html?slug=...`) no está en el sitemap: son páginas que arma el navegador leyendo
Supabase en el momento, no archivos fijos — cada una ya trae su propio `<title>`,
descripción y `og:image` dinámicos (buenos para cuando se comparte un link puntual), pero
listarlas todas en el sitemap requeriría un script en el deploy que las genere leyendo la
tabla `perfumes`, no algo que se pueda dejar hardcodeado.

Indexar de verdad (que Google efectivamente rastree y muestre el sitio) requiere que esté
publicado en una URL real y que lo des de alta en
[Google Search Console](https://search.google.com/search-console) — eso es un paso que solo
puedes hacer tú, ya con el sitio en línea.

## Pendiente / notas importantes

- **Corre la Calculadora de Márgenes antes de publicar** (ver arriba) — es el pendiente más
  importante, sin eso el catálogo se vendería al costo.
- **Revisa los 34 productos "Por Definir"** y los nombres poco claros del catálogo importado.
- **Número de WhatsApp**: `assets/js/api.js` (constante `WHATSAPP_NUMERO`) ya tiene un número
  configurado — confirma que sea el número real del negocio antes de publicar.
- **Correo de contacto**: actualiza `contacto@maisonzadaca.com` en `contacto.html` y `main.js` por el correo real.
- **Despliega `cotizacion-publica`** (ver `supabase/OPERACIONES.md`) para que el límite de solicitudes por IP sea real y no solo del navegador.
- **Reemplaza `TU-DOMINIO`** en `robots.txt`, `sitemap.xml` y en los `<link rel="canonical">`/`og:url` del `<head>` de cada página, por tu URL real una vez publicado.
- No hay pasarela de tarjeta (Culqi/Niubiz/MercadoPago) — los pagos van por Yape/Plin/transferencia coordinados por WhatsApp y registrados a mano por el admin.
- El correo de notificaciones (`notify-email`) es opcional y necesita tu propia cuenta de Resend — sin eso, las notificaciones solo se ven en la web.
