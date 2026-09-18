# Fotos para los 79 perfumes sin imagen (catálogo PDF, sep 2026)

Resultado: **75 de 79** fragancias quedaron con foto validada en
`supabase/asignar_imagenes_web_sep2026.sql` (96 `update` sobre ids reales del
listado, uno por cada fila frasco/decant). Los **4 restantes** se dejaron sin
tocar porque no se pudo identificar con confianza el producto real o no existe
tal cual — mejor no adivinar la foto.

## Cómo se resolvieron los 75

- **46 de las 75** reutilizan una foto que YA estaba subida en
  `assets/img/perfumes/` (mismo perfume, solo que a esa fila nueva del PDF
  nunca se le había hecho el `update`). Se confirmó revisando otros scripts de
  `supabase/` que ya usan esa misma imagen para el mismo nombre de producto
  (ej. `9AM_Dive.png`, `Khamrah.png`, `Hawas_Malibu.png`, etc.), así que no son
  suposiciones sino reutilización de arte ya validado antes.
- **29 de las 75** no tenían ninguna foto local correspondiente, así que se
  buscaron y validaron en internet (marca oficial cuando existía sitio propio
  con imágenes hotlinkeables: Dolce&Gabbana, Jean Paul Gaultier, Armaf; si no,
  Fragrantica —su CDN `fimgs.net` permite hotlink y es donde salió la mayoría—
  o el sitio del propio fabricante/retailer: Bharara Beauty, decantsdeperfumes.com,
  labelleperfumes.com, redbagstore.com, perfumebox.com, theperfumespot.com,
  beautyhouse.com). Cada URL se probó con `curl` (HTTP 200, `content-type
  image/*`, tamaño de varios KB, no un pixel de tracking) antes de incluirla
  en el script; la lista completa se volvió a re-validar al terminar y las 26
  URLs externas siguen respondiendo 200.

## Casos donde la marca/nombre del catálogo era engañoso (se corrigió la búsqueda)

- **"Por Definir — Tubbes Candy Apple"**: la marca real es **Tubbees** (no
  "Por Definir"), fragancia "Candy Apple" de 2025. Resuelto con Fragrantica.
- **"Rasasi — Nitro White"**: la marca real es **Dumont/Dumond** (no Rasasi),
  igual que los otros "Nitro" del catálogo que ya están correctamente
  atribuidos a Dumond. Resuelto con Fragrantica.
- **"Rasasi — Hawas"** (sin sufijo): Fragrantica solo lista esta fragancia
  como **"Hawas for Him"** (2015) — no existe un "Hawas" a secas separado —
  así que se usó la foto local ya existente `rasasi-hawas-for-him-100ml.png`.
- **"Lattafa Pride — Game Of Spades Double Bonus"**: la línea "Game Of Spades"
  completa (incluida "Double Bonus") es en realidad de **Jo Milano Paris**,
  vendida en este mercado bajo el paraguas "Lattafa Pride" — igual que el
  resto de la línea que ya estaba en el catálogo. Resuelto con la foto
  oficial del producto (labelleperfumes.com).
- **"Lattafa — Qaed Ultimati"**: no existe un producto Lattafa llamado
  literalmente "Ultimati"; se identificó como **"Qaed Al Fursan Unlimited"**
  (2022) — la única fragancia real de esa familia cuyo nombre encaja. Se usó
  la foto de Fragrantica en vez de reutilizar la imagen local ya asignada a
  la variante "Unlimited Color Blanco" (que es un sub-variante de color
  específico ya usado por otro producto del catálogo, para no arriesgar una
  foto del color equivocado).
- **"Armaf — Club De Nuit Iconic"**: existían dos candidatos casi duplicados
  ("Club De Nuit Blue Iconic" 2022 vs "Club De Nuit Iconic Extrait De
  Parfum" 2026). Se eligió la versión 2026 porque su concentración
  ("Extrait de Parfum") coincide exactamente con la fila del catálogo.
- **"Valentino — Born In Roma"** (sin "Uomo", ids 458/527): es la versión
  **mujer** ("Donna Born In Roma"), distinta de "Uomo Born In Roma" (ids 457,
  hombre) y de "Born In Roma Intense"/"Extradosis" (otro producto ya en el
  catálogo). Se buscaron fotos separadas para cada una.

## Los 4 que quedaron SIN foto (pendientes de que alguien confirme el producto)

1. **Armaf — "Odyssey Mfga"** (ids 436, 465). No existe ninguna fragancia
   Armaf con ese nombre/sigla en Fragrantica, Armaf.com ni en ningún
   retailer. Podría ser un typo de otra referencia del catálogo PDF, pero no
   hay forma confiable de adivinar cuál sin ver el PDF original o preguntar
   al proveedor.
2. **Jean Paul Gaultier — "Set Scandal + Edt Men without QR"** (id 318). Es
   un combo armado por el proveedor peruano (Scandal + algún "Edt Men" sin
   caja/QR), no un set oficial de JPG con nombre y foto propios — no se
   encontró ninguna foto de ese combo específico.
3. **Lattafa Pride — "Game Of Spades Bio"** (ids 524, 455). No existe una
   variante "Bio" ni en la línea Lattafa Pride ni en Jo Milano Paris (que es
   quien realmente fabrica "Game Of Spades"). Revisado el catálogo completo
   de Jo Milano en Fragrantica y no aparece.
4. **"Por Definir — Uomo Intense"** (ids 518, 453). Nombre demasiado
   genérico para identificar la marca real con confianza (podría ser
   Valentino Uomo Intense, Dior Homme Intense, Prada L'Homme Intense, etc. —
   hay una nota de un script anterior, `cargar_decants_lote2_02sep.sql`, que
   ya había marcado un archivo local `Homme_Intense.png` como "nombre
   demasiado genérico, sin forma de confirmar cuál es sin el dato [del
   proveedor]"). Mejor confirmarlo contra el PDF/proveedor original antes de
   ponerle cualquier foto.

## Cómo continuar

- Ejecutar `supabase/asignar_imagenes_web_sep2026.sql` en el SQL Editor de
  Supabase.
- Para los 4 pendientes, revisar el PDF original del catálogo (septiembre
  2026) o preguntar al proveedor qué producto exacto es cada uno, y luego
  agregar un `update perfumes set imagen_url = '...' where id = ...;` suelto
  una vez identificados.
