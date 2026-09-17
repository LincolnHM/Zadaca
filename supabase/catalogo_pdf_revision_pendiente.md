# Revisión pendiente — catálogo PDF Septiembre 2026

Reporte de acompañamiento para `supabase/actualizar_catalogo_pdf_sep2026.sql`. Léelo
antes de correr el script: junta todo lo que se decidió con baja confianza durante
la extracción del PDF y el cruce contra el catálogo real, para que lo revises antes
de aplicar los cambios en producción.

## Resumen

- **Páginas del PDF procesadas:** 74 (todas, una por una).
- **Páginas sin datos de producto** (portada, métodos de pago, explicación de qué es
  un decant, páginas de "Clientes", contraportada): 8 (páginas 1, 2, 3, 65\*, 72, 73, 74 —
  \*la 65 es el separador de sección "Diseñador", sin productos propios).
- **Páginas de marketing de línea de marca sin precios propios** (decorativas —
  el nombre y las notas se usaron como contexto para las páginas siguientes, no
  generaron entradas): 15 (páginas 7, 10, 15, 18, 21, 30, 33, 34, 39, 46, 50, 52,
  55, 59, 62).
- **Páginas de combos/paquetes** (fuera de alcance de este script, ver detalle
  abajo): 3 (páginas 4, 5, 6).
- **Entradas de perfume individuales extraídas:** 97.
- **Filas de la tabla `perfumes` actualizadas (`update`):** 93 (69 perfumes distintos
  tocados; varios generan 2 updates porque el mismo perfume tiene una fila de
  frasco completo y otra de decant).
- **Filas nuevas insertadas (`insert`):** 97 en total — 27 de frasco completo
  (`es_decant=false`) + 70 de decant (`es_decant=true`).
- **Desglose por entrada:** 23 entradas coincidieron por completo con filas ya
  existentes (solo updates), 48 son mixtas (una fila existía, la otra hubo que
  crearla), 25 son perfumes totalmente nuevos (no había ninguna fila, ni frasco ni
  decant), y 1 entrada se descartó por completo (duplicado, ver más abajo).
- **Entradas marcadas "SOLD OUT" en el PDF:** 12 (se actualizaron/insertaron igual
  porque traen info real de precio y notas, pero quedan listadas abajo para que
  decidas si también hay que tocar `estado`/stock).
- **Entradas de baja confianza (nombre, marca o precio dudoso):** 37 (listadas
  abajo, sección "Baja confianza").

## Combos / paquetes (fuera de alcance — solo como referencia)

El PDF trae 3 páginas de combos armados (3 perfumes en tallas 3ml a un precio fijo).
No se tocó nada de esto en el script — son un producto/flujo de venta aparte, no
filas individuales de `perfumes`. Referencia para quien arme esas promos en el sitio:

- **Página 4 — Combos para Caballero (Perfumería Árabe):**
  - Paquete 3ml #1: Universo (día) + Al Haramain Gold Edition (noche) + Bharara
    King (salidas) — S/40.
  - Paquete 3ml #2: Odyssey Spectra (día) + The Kingdom (noche) + 9pm Night Out
    (salidas) — S/35.
- **Página 5:**
  - Combo especial Dama: Hayaati Florence (día) + Sublime (noche) + Nebras Elixir
    (noche) — S/30.
  - Combo Caballero 3ml: Odyssey Spectra (día) + Mandarin Sky (noche) + Mandarin
    Sky Elixir (salidas) — S/30.
- **Página 6:**
  - Paquete Dama Línea Yara 3ml: Yara Pink (día) + Yara Candy (noche) + Yara
    Elixir (citas) — S/30.
  - Paquete Dama Línea Lattafa: Noble Bush (día) + Badee Al Oud (noche) + Sublime
    — S/30. (Nota: "Noble Bush" no se pudo identificar como producto propio en
    ninguna página con precio individual — probablemente es un apodo/typo de
    "Noble Blush").
  - Paquete especial Dama 3ml: Hayati Florenci (día) + Eclaire (noche) + Yara
    Elixir (citas) — S/30.

## Productos marcados "SOLD OUT" en el PDF

Se actualizaron/insertaron con su precio y notas igual (la info es real y vigente
en el catálogo impreso), pero convendría revisar `estado`/stock antes de dejarlos
visibles como comprables si en la tienda física ya no hay:

1. Lattafa — Nebras (p47)
2. Al Haramain — Haramain Aqua Dubai (p51, insertado nuevo)
3. Lattafa Pride — Game Of Spades Wildcard (p63)
4. Lattafa Pride — Game Of Spades Double Bonus (p64, insertado nuevo)
5. Valentino — Uomo Born In Roma Extradosis (p66)
6. Valentino — Born In Roma / mujer (p67, insertado nuevo)
7. Jean Paul Gaultier — Le Beau Intense (p68, **descartado**, ver duplicado abajo)
8. Jean Paul Gaultier — Le Beau Le Parfum Intense (p69, usado en vez del anterior)
9. Jean Paul Gaultier — Le Male / EDT (p69, insertado nuevo)
10. Yves Saint Laurent — Y Eau De Parfum (p70, insertado nuevo)
11. Dolce & Gabbana — Light Blue Pour Homme (p71, insertado nuevo)
12. Bharara — Rome Pour Home (p56)

## Entrada descartada por duplicado

- **Jean Paul Gaultier "Le Beau Intense" (página 68, S/520, SOLD OUT)** vs.
  **"Le Beau Le Parfum Intense" (página 69, S/550, SOLD OUT)**: mismas notas
  olfativas, misma foto de producto, mismo tipo de bote — con altísima probabilidad
  es el mismo producto listado dos veces en el PDF con precios ligeramente
  distintos (posible error de armado del catálogo). Se usó **solo** la versión de
  la página 69 (S/550) para el update de `id=73` (frasco) y `id=394` (decant); la
  entrada de la página 68 se descartó para no pisar el mismo registro dos veces
  con valores distintos. **Revisar cuál de los dos precios (520 o 550) es el
  correcto** y ajustar a mano si hace falta.

## Baja confianza — revisar antes de correr el script

Marca/nombre corregidos durante el cruce contra el catálogo real (explicado en el
encabezado del script SQL):

- **Línea "Rome" (Imagine/Paradox/Extradose/Pour Home)** — el PDF no mostraba marca
  visible; se corrigió a **Bharara** porque así vive en el catálogo real
  (`Bharara Mast Perfume Rome Pour Homme`, `Rome Extradose By Bharara`, decants
  `bharara-rome-imagine-decant-5ml`, etc). Páginas 56 y 57.
- **Línea "Rayhaan"/"Rayhaam" (Aquatica/Tropical Vibe/Wolf)** — corregida a
  **Lattafa** (coincide con `Rayhaan Elixir`, `RAYHAAN AQUATICA`, etc. ya
  existentes bajo esa marca). Páginas 60 y 61.
- **"Nebula" / "King Of Kings Nebula"** — corregida a la marca **"King of Kings"**
  (coincide con `NEBULA EXTREME PARFUM EDP by King of Kings`, id 270). Página 58.
- **"His Confession"** — el bote parecía decir "Lattafa" pero no existe ningún
  producto así en esa marca; coincide en cambio con `HIS Confesion` de **Rasasi**
  (id 195, actualmente inactivo). Página 61.
- **"Nitro White"** — sin marca visible; se asumió **Rasasi** porque ahí viven las
  otras variantes Nitro del catálogo (Red, Elixir, Gold) — no hay ninguna "Nitro
  White" ya cargada, así que se insertó como producto nuevo. Página 49.
- **"Tubbes Candy Apple"** y **"Uomo Intense"** — sin ninguna marca legible en la
  foto; se cargaron con marca **"Por Definir"** (la misma convención placeholder
  que ya usa el catálogo real para 25 filas, ver migración 0007) en vez de
  adivinar. Páginas 20 y 58.
- **"Pisa"** (botella con forma de la Torre de Pisa) y **"Art Of Universe"** —
  coinciden con `Pride Pisa` y `Arte Del Universo...` de **Lattafa Pride**, ambos
  actualmente inactivos (`activo=false`) en el catálogo real; el script solo les
  actualiza precio/notas, no reactiva la fila. Revisar si corresponde reactivarlos.
  Página 48.
- **"Armaf Dunascape Dubai"** — el logo ARMAF se ve claro en la foto, pero el texto
  impreso en el bote dice "PHNESCAPE" (probable error de impresión/diseño del
  frasco). No hay ningún producto parecido en el catálogo real, así que se
  insertó como nuevo bajo Armaf. Página 49.
- **"Bharara King"** — el catálogo real ya tiene 3 filas de "Bharara King" con
  precios distintos (100ml a S/235, 200ml a S/233, 1000ml a S/720) más un decant.
  El PDF solo trae un precio de frasco (S/245) sin indicar tamaño — se asumió que
  corresponde a la presentación de 100ml (id 50) por ser la más común, pero
  convendría confirmarlo. Página 53.
- **9AM Dive / Odyssey Mfga (DUP "Y Eau de Parfum de Yves Saint Laurent")** — el
  PDF señala como "inspirado en" un perfume "Y" de YSL sin distinguir cuál (hay
  varias versiones: Y EDT, Y EDP, Y Le Parfum, Y Intense). Se dejó el texto tal
  cual venía sin adivinar la versión exacta. Páginas 9 y 13.
- **Yves Saint Laurent "Y Eau De Parfum" / "Y Le Parfum"** — nombres de producto
  normalizados con baja confianza a partir de rótulos parciales/genéricos en el
  PDF ("YSL EDP MEN", "YSL EDU PARFUM" con typo Edu→Eau); no hay ningún "Y" de YSL
  ya cargado en el catálogo real para comparar. Página 70.
- **"Qaed Ultimati"** — la foto de botella bajo este título en el PDF es, con toda
  claridad, la misma foto/bote que "Qaed Al Fursan" (incluso el texto grabado en
  el vidrio dice "QAED AL FURSAN"). Se mantuvo el nombre del encabezado de página
  ("Qaed Ultimati") por ser lo único confiable, pero el producto real detrás de
  esa foto es dudoso. No hay ninguna fila parecida en el catálogo real → se
  insertó como nuevo. Página 19.
- **"Qaed Untamed" — DUP "Versace Eros Najim"** — el texto del DUP en el PDF traía
  la palabra "Najim" pegada a "Eros" sin que quede claro si es parte del nombre
  del perfume o un adjetivo suelto; se normalizó a "Eros de Versace". Página 20.
- **"Hawas London" — DUP repetido** — el texto "Donna Born In Roma Intense de
  Valentino" es idéntico, palabra por palabra, al DUP de "Hawas Diva" dos páginas
  antes. Con alta probabilidad es un error de copiar/pegar en el armado del PDF
  y el DUP real de Hawas London es otro. Se dejó tal cual venía. Página 28.
- **"Hawas Sapphire"** — el bote trae adicionalmente un sello "FBFragrances
  Edition" cuyo significado no quedó claro (¿sub-línea?, ¿otro fabricante?). Se
  mantuvo como Rasasi/Hawas por contexto de página. Página 26.
- **"Hawas Fire" — precios de decant no legibles** — la página muestra las 3
  medallas de 3/5/10ml pero sin los montos en soles debajo (a diferencia de todas
  las demás páginas del catálogo). Solo se actualizó el precio de frasco (S/190);
  los 3 tamaños de decant quedaron sin tocar. Página 25.
- **"Odyssey Artisto" — 5ta nota parcialmente tapada** por la medalla de precio en
  la foto; se completó como "Dulce" por contexto visual pero con baja confianza.
  Página 14.
- **"Haya" (Lattafa)** — el arte de la botella tiene una marca rara tipo "L1O"
  además del nombre; se mantuvo la marca Lattafa por contexto de página aunque no
  es 100% seguro. Página 44.
- **"Game Of Spades Bio"** — tres fuentes del PDF le dan tres nombres distintos al
  mismo producto: el encabezado de la página dice "G.O.S BI PARFUM", el texto
  grabado en el vidrio de la botella dice "BID", y la página de marketing de la
  línea (página 62) lo llama "Bio". Se usó "Bio" por ser el nombre de la página de
  marketing de línea. Página 64.
- **Dolce & Gabbana "Light Blue" — notas olfativas** — el PDF mostraba dos pills
  seguidas que decían literalmente "FRESCO" y "FRESCO" (duplicado visual); se
  normalizó la segunda a "Fresco Acuático" por ser la nota típica de Light Blue,
  pero es una inferencia, no un dato leído directamente. Página 71.
- **Marca "Fragrance World" descartada en general**: se había usado como primera
  hipótesis para varias líneas sin logo visible (Rome, Nitro, King of Kings
  Nebula, Uomo Intense, Tubbes) antes de cruzar contra el catálogo real; todas se
  corrigieron según lo que efectivamente existe en la base (ver puntos arriba). Si
  alguna de las que quedó en "Por Definir" en realidad es Fragrance World,
  corregir desde el panel admin.
- **Concentración ("Eau de Parfum", etc.)** — se usó "Eau de Parfum" por defecto en
  la enorme mayoría de las entradas árabe (es el estándar casi universal de estas
  líneas Lattafa/Armaf/Rasasi), pero no se verificó el texto impreso entrada por
  entrada en las 89 páginas — se marcó "Extrait de Parfum" solo donde el PDF lo
  decía explícitamente en el empaque (Al Haramain, King of Kings Nebula). Si algún
  producto específico es en realidad Parfum/Elixir/EDT, corregirlo a mano.

## Otras notas de contexto

- El PDF **no trae ninguna sección "Nicho"** en esta edición, pese a que la
  portada anuncia las 3 categorías (Árabe, Diseñador, Nicho). Va directo de la
  sección Árabe (la gran mayoría del catálogo) a un puñado de 6 páginas de
  Diseñador (Valentino, Jean Paul Gaultier, Yves Saint Laurent, Dolce & Gabbana) y
  cierra con las páginas de testimonios de clientes. No hay páginas de Xerjoff,
  Montale ni Mancera en esta versión del PDF.
- Varias filas que el script actualiza están actualmente **inactivas**
  (`activo=false`) en el catálogo real (ej. Nebras Elixir id116, Pisa id147, Art
  Of Universe id134, HIS Confesion id195, varios decants "hijos" heredados de la
  migración 0011→0016). El script deliberadamente **no toca `activo`** — si el
  PDF los muestra como productos vigentes y hay que reactivarlos, es una decisión
  aparte del dueño del catálogo, no algo que se pueda inferir solo del PDF.
- La fila existente `The Kingdom` (id 187) tiene marca `Por Definir` en el
  catálogo real aunque por contexto del PDF es claramente una línea Lattafa
  (Badee Al Oud). El script no le tocó la marca, solo precio/notas — corregir la
  marca es un cambio aparte, fuera del alcance de este script.
- Este script **depende de la migración `supabase/migrations/0017_inspirado_en.sql`**
  (agrega la columna `inspirado_en`) — hay que correrla primero si todavía no está
  aplicada en el proyecto de Supabase real.
