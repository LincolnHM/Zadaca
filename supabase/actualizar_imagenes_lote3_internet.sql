-- ==========================================================
-- ACTUALIZAR IMÁGENES — lote 3 (67 perfumes), fuente: internet
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de subir (git push) los
-- archivos nuevos de assets/img/perfumes/ a tu sitio publicado.
-- ==========================================================
--
-- Contexto: después de los lotes 1 y 2 (fotos sacadas del Excel del
-- proveedor), quedaban 92 de 217 perfumes (42%) sin foto. A diferencia de
-- esos dos lotes, esta vez la fuente NO es el Excel del proveedor —
-- son fotos de producto públicas de internet (tiendas de fragancias,
-- marca oficial, etc.), buscadas y verificadas una por una contra el
-- nombre exacto del producto (marca, línea y edición) antes de guardarlas,
-- siguiendo el mismo criterio de "si no se puede verificar con confianza,
-- se descarta" que ya usó el lote 2.
--
-- Nota sobre algunas filas con marca 'Chanel': el catálogo trae
-- "BAD BOY LE Parfum FOR MEN" bajo la marca 'Chanel', pero "Bad Boy" es en
-- realidad una fragancia de Carolina Herrera — no existe un "Chanel Bad
-- Boy". La foto asignada abajo es la del frasco real "Bad Boy" (el rayo
-- negro), que es inequívoco por nombre y forma; probablemente la marca de
-- esa fila esté mal cargada en el catálogo y valga la pena corregirla
-- desde el panel admin.
--
-- Con este lote quedan 25 de 217 sin foto — ver la sección "Revisadas y
-- descartadas" al final para el detalle de cada una.

-- ---------- Afnan ----------
update perfumes set imagen_url = 'assets/img/perfumes/afnan-turathi-electric-afnan-for-women-and-men-100ml.png' where slug = 'afnan-turathi-electric-afnan-for-women-and-men-100ml';

-- ---------- Al Haramain ----------
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-al-haramain-amber-oud-dubai-night-unisex-extraido-de-parfum-75ml.jpg' where slug = 'al-haramain-al-haramain-amber-oud-dubai-night-unisex-extraido-de-parfum-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-al-haramain-amber-oud-exclusif-emeral-100ml.jpg' where slug = 'al-haramain-al-haramain-amber-oud-exclusif-emeral-100ml';

-- ---------- Armaf ----------
update perfumes set imagen_url = 'assets/img/perfumes/armaf-armaf-club-de-nuit-precieux-iv-100ml.jpg' where slug = 'armaf-armaf-club-de-nuit-precieux-iv-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-check-mate-king-edp-men-by-armaf-100ml.jpg' where slug = 'armaf-check-mate-king-edp-men-by-armaf-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-club-de-nuit-oud-edp-unisex-by-armaf-105ml.jpg' where slug = 'armaf-club-de-nuit-oud-edp-unisex-by-armaf-105ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odisey-aqua-100ml.jpg' where slug = 'armaf-odisey-aqua-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-spectra-unisex-edp-de-armaf-100ml.jpg' where slug = 'armaf-odyssey-spectra-unisex-edp-de-armaf-100ml';

-- ---------- Azzaro ----------
update perfumes set imagen_url = 'assets/img/perfumes/azzaro-azzaro-elixir-100ml.jpg' where slug = 'azzaro-azzaro-elixir-100ml';

-- ---------- Bharara ----------
update perfumes set imagen_url = 'assets/img/perfumes/bharara-roma-wome-bahara-100ml.webp' where slug = 'bharara-roma-wome-bahara-100ml';

-- ---------- Carolina Herrera / Chanel (ver nota arriba sobre "Bad Boy") ----------
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-bad-boy-cobalt-elixir-edp-tester-100ml.jpg' where slug = 'carolina-herrera-bad-boy-cobalt-elixir-edp-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/chanel-bad-boy-le-parfum-for-men-50ml.jpg' where slug = 'chanel-bad-boy-le-parfum-for-men-50ml';

-- ---------- Dolce & Gabbana ----------
update perfumes set imagen_url = 'assets/img/perfumes/dolce-gabbana-dolce-gabbana-light-blue-3-3-100ml.jpg' where slug = 'dolce-gabbana-dolce-gabbana-light-blue-3-3-100ml';

-- ---------- Emporio Armani ----------
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-armani-emporio-stronger-with-you-absolutely-eau-de-parfum-100ml.jpg' where slug = 'emporio-armani-armani-emporio-stronger-with-you-absolutely-eau-de-parfum-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-stronger-with-you-intensily-100ml.jpg' where slug = 'emporio-armani-stronger-with-you-intensily-100ml';

-- ---------- Fragrance World ----------
update perfumes set imagen_url = 'assets/img/perfumes/fragrance-world-now-eau-de-parfum-spray-for-women-100ml.jpg' where slug = 'fragrance-world-now-eau-de-parfum-spray-for-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/fragrance-world-now-rave-for-men-100ml.jpg' where slug = 'fragrance-world-now-rave-for-men-100ml';

-- ---------- French Avenue ----------
update perfumes set imagen_url = 'assets/img/perfumes/french-avenue-veneno-black-french-avenue-100ml.jpg' where slug = 'french-avenue-veneno-black-french-avenue-100ml';

-- ---------- Jean Paul Gaultier ----------
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-jpg-elixir-tester-125ml.jpg' where slug = 'jean-paul-gaultier-jpg-elixir-tester-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-la-belle-le-parfum-eau-de-parfum-tester-100ml.png' where slug = 'jean-paul-gaultier-la-belle-le-parfum-eau-de-parfum-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-100ml.jpg' where slug = 'jean-paul-gaultier-scandal-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-absolu-tester-100ml.jpg' where slug = 'jean-paul-gaultier-scandal-absolu-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-absolu-women-tester-100ml.jpg' where slug = 'jean-paul-gaultier-scandal-absolu-women-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-jean-paul-gaultier-for-women-100ml.jpg' where slug = 'jean-paul-gaultier-scandal-jean-paul-gaultier-for-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-tester-jean-paul-gaultier-la-belle-paradise-garden-eau-de-parfum-for-women-125ml.jpg' where slug = 'jean-paul-gaultier-tester-jean-paul-gaultier-la-belle-paradise-garden-eau-de-parfum-for-women-125ml';

-- ---------- Lattafa ----------
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-aether-extrait-for-unisex-100ml.jpg' where slug = 'lattafa-aether-extrait-for-unisex-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-atheeri-unisex-by-lattafa-new-launch-100ml.png' where slug = 'lattafa-atheeri-unisex-by-lattafa-new-launch-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-bade-amethyst-lattafa-100ml.png' where slug = 'lattafa-bade-amethyst-lattafa-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-badee-al-oud-oud-for-glory-edp-100mi-100ml.png' where slug = 'lattafa-badee-al-oud-oud-for-glory-edp-100mi-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-emeer-lattafa-100ml.png' where slug = 'lattafa-emeer-lattafa-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-fakhar-gold-lattafa-100ml.jpg' where slug = 'lattafa-fakhar-gold-lattafa-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-fakhar-platinum-lataffa-unisex-edp-100mi-100ml.png' where slug = 'lattafa-fakhar-platinum-lataffa-unisex-edp-100mi-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-haya-eau-parfum-100ml.png' where slug = 'lattafa-haya-eau-parfum-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-hayaati-eau-de-parfum-100ml.png' where slug = 'lattafa-hayaati-eau-de-parfum-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-hayati-edp-100ml.jpg' where slug = 'lattafa-hayati-edp-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-khanjar-lattafa-100ml.webp' where slug = 'lattafa-khanjar-lattafa-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-lattafa-afeef-eau-de-parfum-for-everyone-100ml.png' where slug = 'lattafa-lattafa-afeef-eau-de-parfum-for-everyone-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-lattafa-victoria-eau-de-parfum-for-everyone-100ml.png' where slug = 'lattafa-lattafa-victoria-eau-de-parfum-for-everyone-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-musaman-white-100ml.png' where slug = 'lattafa-musaman-white-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-nebras-elixir-100ml.png' where slug = 'lattafa-nebras-elixir-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-qaed-al-fursan-unlimited-color-blanco-100ml.png' where slug = 'lattafa-qaed-al-fursan-unlimited-color-blanco-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-shuyukh-gold-100ml.png' where slug = 'lattafa-shuyukh-gold-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-shuyukh-silver-100ml.png' where slug = 'lattafa-shuyukh-silver-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-teriaq-intense-edp-100ml.png' where slug = 'lattafa-teriaq-intense-edp-100ml';

-- ---------- Lattafa Pride ----------
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-al-qiam-gold-100ml.png' where slug = 'lattafa-pride-al-qiam-gold-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-arte-del-universo-unisex-edp-de-lattafa-pride-100ml.png' where slug = 'lattafa-pride-arte-del-universo-unisex-edp-de-lattafa-pride-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-pride-pisa-100ml.png' where slug = 'lattafa-pride-pride-pisa-100ml';

-- ---------- Mancera / Montale (nicho) ----------
update perfumes set imagen_url = 'assets/img/perfumes/mancera-mancera-coco-vainille-4-0-100ml.jpg' where slug = 'mancera-mancera-coco-vainille-4-0-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/montale-montale-arabia-tonca-100ml.png' where slug = 'montale-montale-arabia-tonca-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/montale-montale-arabia-tonca-tester-100ml.png' where slug = 'montale-montale-arabia-tonca-tester-100ml';

-- ---------- Paco Rabanne ----------
update perfumes set imagen_url = 'assets/img/perfumes/paco-rabanne-one-million-gold-for-her-tester-100ml.jpg' where slug = 'paco-rabanne-one-million-gold-for-her-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/paco-rabanne-tester-one-million-gold-elixir-for-men-100ml.jpg' where slug = 'paco-rabanne-tester-one-million-gold-elixir-for-men-100ml';

-- ---------- Paris Corner ----------
update perfumes set imagen_url = 'assets/img/perfumes/paris-corner-marshmallow-blush-paris-corner-100ml.png' where slug = 'paris-corner-marshmallow-blush-paris-corner-100ml';

-- ---------- Por Definir (marca real identificada por la caja/etiqueta de la foto) ----------
-- "Jean Lowe" es una línea de Maison Alhambra (casa árabe dupe), visible en la etiqueta.
-- "Whipped Pleasure", "Choco Overdose" y "Cookie Crave" son la línea gourmand
-- "Give Me Gourmand" de Lattafa (frascos con forma de postre) — también visible en la etiqueta.
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-choco-overdose-75ml.png' where slug = 'por-definir-choco-overdose-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-cookie-crave-75ml.png' where slug = 'por-definir-cookie-crave-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-jean-lowe-azure-eau-parfum-100ml.png' where slug = 'por-definir-jean-lowe-azure-eau-parfum-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-king-of-king-private-blend-chapter-i-100ml.jpg' where slug = 'por-definir-king-of-king-private-blend-chapter-i-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-vulcan-feu-women-edp-100ml.jpg' where slug = 'por-definir-vulcan-feu-women-edp-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-whipped-pleasure-75ml.png' where slug = 'por-definir-whipped-pleasure-75ml';

-- ---------- Rasasi ----------
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-ansaam-silver-100ml.jpg' where slug = 'rasasi-ansaam-silver-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-black-100ml.jpg' where slug = 'rasasi-hawas-black-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-her-confesion-woman-100ml.png' where slug = 'rasasi-her-confesion-woman-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-his-confesion-100ml.png' where slug = 'rasasi-his-confesion-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-rasasi-hawas-diva-edp-for-women-100ml.jpg' where slug = 'rasasi-rasasi-hawas-diva-edp-for-women-100ml';

-- ---------- Xerjoff (nicho) ----------
update perfumes set imagen_url = 'assets/img/perfumes/xerjoff-torino-21-100ml.png' where slug = 'xerjoff-torino-21-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/xerjoff-xerjoff-torino-21-unisex-edp-100ml.png' where slug = 'xerjoff-xerjoff-torino-21-unisex-edp-100ml';

-- ---------- Yves Saint Laurent ----------
update perfumes set imagen_url = 'assets/img/perfumes/yves-saint-laurent-yves-saint-laurent-myslf-le-parfum-de-100ml.jpg' where slug = 'yves-saint-laurent-yves-saint-laurent-myslf-le-parfum-de-100ml';

-- ---------- Revisadas y descartadas (NO se tocaron) ----------
-- Se buscó una foto para cada una de estas 25 filas y no se encontró una coincidencia
-- verificable con confianza (nombre/edición ambigua, o directamente no se pudo confirmar
-- contra una foto real de esa presentación exacta):
--   armaf-odyssey-intense-100ml                                          -> demasiado parecido a Spectra/Mandarin Sky Vintage, ver nota de lote2
--   azzaro-azaro-perfum-100ml / azzaro-azzaro-perfum-100ml               -> nombre genérico "Azaro Perfum", ver nota de lote2 (la foto real de esa fila del Excel era "The Most Wanted", no esta)
--   bharara-pharaoh-ramesses-bharara-100ml                               -> sin coincidencia verificable
--   jean-paul-gaultier-jpg-edt-125ml                                     -> "JPG EDT" es demasiado genérico (la línea JPG tiene varias ediciones EDT)
--   jean-paul-gaultier-scandal-le-parfum-by-jean-paul-gaultier-for-men-100ml -> sin coincidencia verificable distinta de las otras variantes de Scandal
--   lattafa-lattafa-5th-anniversary-yara-yara-candy-edp-100ml            -> presentación de aniversario/set, sin foto verificable
--   lattafa-set-de-sublime-lattafa-100ml                                 -> es un set (varias piezas), sin foto del set completo
--   lattafa-pride-al-qiam-gold-3-piece-perfume-gift-set-by-lattafa-pride-100ml -> gift set de 3 piezas, sin foto del set completo
--   lattafa-pride-game-of-spades-diamond-100ml                          -> línea con muchos colores/variantes (Diamond/High Roller/Emerald/etc), alto riesgo de confundir el color exacto
--   lattafa-pride-game-of-spades-high-roller-100ml                      -> mismo motivo que Diamond
--   lattafa-pride-gift-set-3-pcs-game-of-spades-100ml                   -> gift set, sin foto del set completo
--   lattafa-pride-giftset-art-of-universe-3pc-100ml                     -> gift set, sin foto del set completo
--   lattafa-pride-set-game-of-spades-x-3-pcs-x-5-pcs-30ml               -> gift set, sin foto del set completo
--   paco-rabanne-pacco-rabanne-one-million-lucky-100ml                  -> sin coincidencia verificable con confianza
--   paco-rabanne-set-de-4-pacco-rabanne-100ml                           -> es un set de 4 piezas, sin foto del set completo
--   por-definir-agnham-100ml                                            -> nombre "Agnham" no verificado; ver nota de lote2 (posible confusión con "Eclaire Banoffi")
--   por-definir-amber-rouge-tester-100ml                                -> marca real sin identificar, sin coincidencia verificable
--   por-definir-chect-mate-king-mujer-100ml                             -> variante "mujer" de Check Mate King sin foto propia verificable (distinta de la versión hombre ya cargada)
--   por-definir-jean-lowe-inmortal-100ml                                -> línea Jean Lowe (Maison Alhambra) confirmada por marca, pero no se encontró la edición "Inmortal" específica
--   por-definir-king-of-king-royal-blue-100ml                           -> línea "King Of King" tiene varias ediciones de color; no se pudo confirmar cuál es "Royal Blue"
--   por-definir-set-honor-and-glory-1-1-100ml                           -> es un set (+1+1), sin foto del set completo
--   por-definir-set-untold-1-1-100ml                                    -> es un set (+1+1), sin foto del set completo
--   por-definir-sher-eau-de-parfum-100ml                                -> marca real sin identificar, sin coincidencia verificable
--   rasasi-his-confesion-woman-100ml                                    -> variante "woman" del set His/Her Confession sin foto propia verificable (distinta de las otras 3 filas de la misma línea ya cargadas)
-- Como en los lotes anteriores: mejor pedirle la foto puntual a tu proveedor (o subirla desde
-- el panel admin) que arriesgar una foto que muestre el producto o el color equivocado.
