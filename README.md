# Maison Zadaca — Sitio Web (Supabase)

Segunda línea web de Maison Zadaca: mismo modelo de negocio que el proyecto local (`TIO ZADAKA`) — tienda directa de perfumes + consolidados (compras grupales) — pero como **proyecto independiente**: base de datos propia en Supabase (no comparte credenciales con la otra base de datos), y sitio 100% estático listo para publicar en GitHub Pages.

Diseño de referencia y fotos de producto tomadas de tu proyecto `PAGINA.WEB.MICHT` (solo las imágenes de los perfumes — nada de código, ni el logo/mascota de esa marca, ni sus credenciales).

## Maizon Zadaca Courier (USA → Perú) y fotos del anuncio (1 oct 2026)

**Courier** en `courier/`, armado a partir de los wireframes de Claude Design (ronda 3). Es una
sección aparte con sus propios colores (azul y naranja del logo) y su propio menú. Se entra desde
el menú "Courier USA", desde la franja azul del inicio y desde el pie de página.

- Páginas: inicio, cómo funciona (Yo compro / Compren por mí), tarifas con calculadora, crear
  casillero, compramos por ti, tiendas recomendadas, ayuda (preguntas y contacto) y productos
  prohibidos con las condiciones del servicio.
- **Todo termina en WhatsApp**: el casillero y "compramos por ti" arman el mensaje con los datos y
  abren el chat. La web no guarda nada, así que no hace falta ninguna migración.
- La tarifa (US$9), el número de WhatsApp y el tope sin impuestos (US$200, regla de SUNAT para
  courier) están en un solo lugar: `CX` al inicio de `assets/js/courier.js`.
- Imágenes en `assets/img/courier/` (recortes del afiche y del logo).
- **Pendiente de confirmar** con datos reales: la dirección de Miami (hoy se envía por WhatsApp),
  el límite de tamaño o peso de la tarifa plana, la comisión de "compramos por ti" y la lista de
  prohibidos y condiciones (están escritas como referencia).

**Fotos del anuncio que salían en blanco**: se guardaban en la carpeta `publicidad/` del
Storage, y EasyList (la lista de uBlock, AdBlock, Brave y Opera) bloquea toda imagen con
`/publicidad/` en la ruta. La foto se subía bien, pero quien tenía bloqueador no la veía. Ahora
se guardan en `vitrina/`, y al abrir Publicidad en el panel las fotos viejas se copian solas ahí.
No uses carpetas ni archivos llamados `publicidad`, `anuncio`, `ads` o `banner`.

**Ahora las fotos del anuncio van guardadas dentro del anuncio**, como texto (data URL), igual
que en el proyecto MICHT. No tienen link al Storage, así que ningún bloqueador las puede frenar.
- Cada foto se comprime hasta que entre en 300 KB (una foto de celular de 3 MB queda en unos
  170-240 KB), y todas juntas no pasan de ~2,5 MB.
- Un GIF liviano queda animado. Uno pesado se guarda como imagen fija.
- La tienda pide las fotos **solo** cuando va a mostrar el anuncio: si está apagado, vencido o el
  cliente ya lo vio en esa visita, no las descarga.
- Solo se aceptan imágenes reales (PNG, JPG, WebP, GIF, AVIF). SVG y cualquier otro contenido se
  rechazan.
- Si una foto no entrara ni comprimida, se sube al Storage como respaldo (carpeta `vitrina/`).

Además:
- La **×** de una foto ya guardada solo la saca de la lista. El archivo se borra del Storage al
  tocar "Guardar Publicidad", así el anuncio publicado nunca apunta a una foto borrada.
- El rescate de fotos viejas comprueba que la copia exista antes de cambiar nada, y no borra la
  original.
- Si una miniatura del panel no se ve, el panel revisa por qué. Si la foto existe, avisa que es
  el navegador (bloqueador de anuncios) y que no hay que quitarla. Si falta de verdad, pide
  subirla de nuevo.
- En la tienda, el anuncio carga primero sus fotos y muestra solo las que cargaron. Nunca sale
  un cuadro vacío: si ninguna carga, se ve solo el texto, y si tampoco hay texto, no sale.

## Contabilidad con ganancia real (30 sep 2026)

**SQL:** `supabase/migrations/0022_contabilidad_costos_compras.sql` (Supabase → SQL Editor → Run).
Sin esa migración el panel sigue funcionando, pero sin guardar el costo de cada venta ni el
proveedor/comprobante de los gastos.

- **Costo de cada venta**: cada línea vendida guarda su costo del momento. Un decant toma el costo
  por ml de su perfume entero. Al cargar el costo de un perfume por primera vez, sus ventas pasadas
  sin costo se completan solas.
- **Resumen**: ventas → costo de lo vendido → ganancia bruta → gastos del negocio → **ganancia
  neta**. Las compras de mercadería no se restan dos veces: van por el costo. Aparte muestra la
  **caja** (entró / salió / neto por Yape, Plin, efectivo…) y avisa cuánto de lo vendido todavía
  no tiene costo cargado.
- **Por cobrar**: todos los pedidos con saldo, con registrar pago, recordatorio por WhatsApp y
  filtros de más de 7 y 30 días. También se abre desde el Dashboard.
- **Caja del día**: cobros y gastos de un día por método de pago, e impresión del cierre de caja.
- **Gastos**: proveedor, foto o PDF del comprobante (guardado privado), editar, "Repetir" (para
  gastos fijos como alquiler o sueldos) y filtro por categoría.
- **Ingreso de mercadería** con costo por unidad: actualiza el **costo promedio** y registra la
  compra como gasto de Mercadería en el mismo paso.
- **Productos**: casilla de **Costo** en la lista, con la ganancia por frasco a la vista, y el
  filtro "Sin costo cargado".

## Panel: Inventario y Productos más simples (28 sep 2026)

Solo cambia el panel (no hay SQL nuevo).

- **Inventario** — una línea por perfume: frascos **cerrados** (− / +) y **abiertos** (+ Abrir /
  Terminado). Filtros rápidos con cantidad (Con stock, Por acabarse, Sin stock, Con stock pero ocultos
  en la web…); las tarjetas de arriba también filtran al tocarlas.
  - **+ Ingreso de mercadería**: cuando llega un pedido se cargan varios perfumes en un solo paso
    (cantidad y, si cambió, precio de venta; Enter pasa al siguiente) y se puede publicar lo que
    estaba oculto.
  - **Hacer conteo**: se escriben los números reales de la tienda y se guarda todo junto.
  - Todo queda en *Historial de movimientos* con motivo.
- **Productos** — lista compacta con pestañas Perfumes / Decants / Solo consolidado / Todos,
  buscador y filtros rápidos (incluye "Con stock pero ocultos" y "Sin foto").
  - Precios, Visible, Nuevo y Más vendido **se guardan solos al cambiarlos**; el resto de datos se
    edita con *Editar* (formulario por pasos).
  - El stock ya no se edita acá: se maneja en Inventario, para que cada cambio tenga su motivo.
  - Al crear un perfume se puede poner cuántos frascos hay.
  - Borrar un perfume con ventas ofrece ocultarlo.

## 28 sep 2026: Consolidado con Carrito de Avión, anuncio con fotos, redes y stock

**Puesta en marcha (Supabase → SQL Editor, en este orden):**

1. `supabase/migrations/0020_carrito_avion_anuncio_redes.sql` — confirmación del Carrito de Avión
   (todo o nada, mínimo validado en la base), fotos del anuncio, bucket público `imagenes` en
   Storage (solo el admin sube), 2 cuentas de TikTok + Instagram + Facebook, y las FAQ del consolidado.
   Si el Storage no se deja crear desde SQL, el script lo avisa: crear el bucket `imagenes` (público)
   a mano en Supabase → Storage.
2. `supabase/actualizar_stock_28sep2026.sql` — stock real: la lista de conteo (cerrados/abiertos) +
   la lista con precios que se suma a la tienda (con sus precios de venta). Al final dice qué se asumió
   y qué queda pendiente de confirmar.
3. `supabase/migrations/0021_reservas_solo_por_carrito_avion.sql` — los clientes ya no pueden
   reservar perfume por perfume (así se saltaban el mínimo): solo confirmando el carrito completo.
4. Subir el código.

**Seguridad (revisión del 28 sep).** `escapeHtml()` ahora escapa también comillas: antes, un nombre
o dirección con comillas escrito por un cliente podía inyectar código en el panel admin (detalle de
pedido). Los links y fotos del anuncio solo aceptan `http(s)` o rutas del sitio (`urlSegura()`).

**Consolidado (Carrito de Avión).** `CONSOLIDADOS_ACTIVOS = true`. El cliente elige en
`catalogo-consolidado/` (12 tarjetas por página, sin ficha: cantidad + "Agregar") y todo va a un
**carrito aparte**, el del **avión** del encabezado (la bolsa sigue siendo el de tienda y decants).
`carrito-avion/` exige el mínimo de unidades de Configuración del Sitio (4) y cierra de dos formas:
con una campaña **Abierta** + sesión, "Confirmar reserva" (queda en Panel → Consolidados); siempre,
"Enviar pedido por WhatsApp" con la lista armada (se registra en Pedidos → Registrar pedido →
Consolidado). En Panel → Consolidados, **"+ Perfume (nombre y precio)"** agrega perfumes que no están
en el catálogo: quedan con estado `Bajo_Pedido` y salen solo en el Catálogo Consolidado. Recojo: tienda
de Chiclayo para tienda/decants, almacén de Lima para consolidado.

**Anuncio (Panel → Publicidad).** Título, descripción, hasta 8 fotos subidas desde el panel (se
comprimen solas; varias = carrusel), botón, fechas y "todas las páginas / solo inicio", con vista
previa. Sale una vez por visita al entrar a la web (no en carritos, cuenta ni políticas).

## Septiembre 2026: inventario, pedidos manuales, contabilidad y consolidados apagados

**Puesta en marcha (en este orden, todo en Supabase → SQL Editor, y recién al final subir el
código — la web y el panel nuevos ya leen estas columnas):**

1. `supabase/migrations/0018_inventario_contabilidad_pedidos.sql` — frascos abiertos, kardex,
   gastos, pedidos sin cuenta, anulación.
2. `supabase/cargar_stock_real_sep2026.sql` — deja el stock exactamente como el conteo físico de
   septiembre (el stock que había antes era de ejemplo).
3. `supabase/migrations/0019_consolidados_admin_legal_reclamaciones.sql` — productos libres en
   pedidos, encargos por consolidado desde el admin, datos legales y Libro de Reclamaciones.
4. `supabase/normalizar_catalogo_sep2026.sql` — nombres y marcas oficiales, fotos faltantes,
   duplicados ocultos y los perfumes del conteo que no existían (Glacier, 1 Million Elixir, MYSLF…).
   Al final del archivo está lo que sigue pendiente de confirmar.
5. `supabase/faq_sin_consolidados.sql` — quita los consolidados de las Preguntas Frecuentes (guarda
   los textos originales adentro, por si se reactivan).
6. Subir el código (push a `main`), incluidas las fotos nuevas de `assets/img/perfumes/`.
7. Panel → Configuración del Sitio → **Datos legales**: razón social, RUC, domicilio fiscal y correo
   para reclamos. Mientras estén vacíos, las políticas muestran "[… pendiente]" resaltado.

**Consolidados por WhatsApp.** La tienda no muestra campañas, pero invita a cotizar por WhatsApp
(+51 990 278 017): franja superior, sección en el inicio, fichas agotadas, buscador sin resultados y
Contacto. El admin sí maneja consolidados: al cotizar un encargo, Pedidos → **+ Registrar Pedido →
Encargo por consolidado**, elige (o crea) la campaña y agrega productos del catálogo o **libres**
(nombre y precio a mano). No toca el stock y suma solo en Contabilidad → Consolidados, que lista
cuánto pedir de cada perfume al proveedor y cuánto falta cobrar.

**Políticas (Perú).** Privacidad (Ley 29733 y D.S. 016-2024-JUS), Términos (Ley 29571), Cambios y
Devoluciones y **Libro de Reclamaciones virtual** (`libro-de-reclamaciones/`, con número correlativo,
constancia imprimible y respuesta desde Panel → Libro de Reclamaciones; plazo legal 15 días hábiles).
Son una base sólida, pero conviene que un abogado las revise antes de darlas por finales.

**Caché.** El dominio guarda JS/CSS varias horas en el navegador; el despliegue
(`.github/workflows/deploy.yml`) agrega `?v=<commit>` a esos archivos en cada publicación para que
nadie mezcle versiones viejas y nuevas. No hay que hacer nada a mano.

**Consolidados apagados, no borrados** (así estuvo hasta el 28 sep; hoy están activos, ver arriba). `CONSOLIDADOS_ACTIVOS = false` en `assets/js/api.js` oculta
consolidados del menú, home, fichas, carrito, "Mi Cuenta" y panel admin; sus páginas redirigen al
catálogo. Tablas, campañas, reservas y código siguen intactos: para volver a mostrarlos, poner `true`
(y restaurar las FAQ con el bloque final de `faq_sin_consolidados.sql`). En el HTML, lo que depende
de consolidados lleva `data-consolidado` (y su reemplazo, `data-sin-consolidado`).

**Panel admin — lo nuevo:**

- **Inventario**: por perfume, frascos **cerrados** (stock de tienda, `inventario.stock_fisico` del
  perfume entero) y **abiertos** (para decantar, `inventario.frascos_abiertos` del decant) + ml del
  frasco. El decant se vincula con su perfume de tienda (`perfumes.id_perfume_tienda`): "Abrir frasco"
  pasa 1 cerrado a abierto. Cada venta descuenta sola (frasco cerrado o ml del decant) y toda variación
  queda en **Movimientos (kardex)**, escrita por triggers. Exporta a Excel e imprime hoja de conteo.
- **Pedidos**: "Registrar Pedido" para ventas por WhatsApp / tienda física (con o sin cuenta del
  cliente, autocompleta clientes anteriores con su último destino). Cada pedido guarda la foto de
  sus datos de envío (nombre, DNI, celular, agencia, destino, quién recibe), editable. **Etiqueta de
  envío** en 10×15 cm o A4 (una o varias a la vez), comprobante, "Copiar datos de envío", aviso de
  envío por WhatsApp y **Anular pedido** (devuelve el stock).
- **Contabilidad**: ventas, cobrado, por cobrar, gastos y utilidad por mes/año, por canal y método de
  pago, más vendidos, lista de ventas exportable y registro de **gastos**.

## Estructura

```
MAISON ZADACA WEB/
├── index.html, catalogo.html, producto.html, consolidados.html, ...
├── robots.txt, sitemap.xml       <- SEO (ya apuntan a https://madisonzadaca.com/)
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

El sitio ya está publicado en `https://madisonzadaca.com/` y todo lo estático está
listo para indexar: `robots.txt` permite el rastreo salvo `/admin/`, `/cuenta/` y `/carrito/`
y apunta al `sitemap.xml`; cada página fija (`index`, `catalogo`, `catalogo-consolidado`,
`consolidados`, `liquidaciones`, `decants`, `contacto`, `terminos-condiciones`,
`politica-privacidad`, `cambios-y-devoluciones`) trae `<title>`, meta `description`,
`canonical`, Open Graph/Twitter y JSON-LD (`Store` en el home) con URLs absolutas; las
páginas privadas (`cuenta`, `carrito`, `admin`, `consolidado/?id=...`) llevan
`<meta name="robots" content="noindex">`; y las nueve páginas fijas están listadas en
`sitemap.xml`.

El catálogo (`producto/?slug=...`) no está en el sitemap: son páginas que arma el navegador
leyendo Supabase en el momento, no archivos fijos — cada una ya trae su propio `<title>`,
descripción y `og:image` dinámicos (buenos para cuando se comparte un link puntual), pero
listarlas todas en el sitemap requeriría un script en el deploy que las genere leyendo la
tabla `perfumes`, no algo que se pueda dejar hardcodeado. Como usan contenido cargado por
JavaScript, Google las puede indexar (Googlebot renderiza JS) pero con más demora que una
página estática — no hay forma de evitar eso sin generar HTML por producto en el deploy.

Lo único que falta y que **solo tú puedes hacer** (requiere tu cuenta de Google): dar de alta
el sitio en [Google Search Console](https://search.google.com/search-console), verificar la
propiedad `https://madisonzadaca.com/` y enviar `sitemap.xml` desde ahí. Sin ese
paso, Google puede tardar semanas en encontrar el sitio por su cuenta; con el sitemap
enviado, el rastreo inicial suele tardar entre unos días y un par de semanas.

## Pendiente / notas importantes

- **Corre la Calculadora de Márgenes antes de publicar** (ver arriba) — es el pendiente más
  importante, sin eso el catálogo se vendería al costo.
- **Revisa los 34 productos "Por Definir"** y los nombres poco claros del catálogo importado.
- **Número de WhatsApp**: `assets/js/api.js` (constante `WHATSAPP_NUMERO`) ya tiene un número
  configurado — confirma que sea el número real del negocio antes de publicar.
- **Correo de contacto**: actualiza `contacto@maisonzadaca.com` en `contacto.html` y `main.js` por el correo real.
- **Despliega `cotizacion-publica`** (ver `supabase/OPERACIONES.md`) para que el límite de solicitudes por IP sea real y no solo del navegador.
- No hay pasarela de tarjeta (Culqi/Niubiz/MercadoPago) — los pagos van por Yape/Plin/transferencia coordinados por WhatsApp y registrados a mano por el admin.
- El correo de notificaciones (`notify-email`) es opcional y necesita tu propia cuenta de Resend — sin eso, las notificaciones solo se ven en la web.
