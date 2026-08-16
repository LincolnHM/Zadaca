-- ==========================================================
-- ACTUALIZAR IMÁGENES — lote 4 (58 perfumes), fuente: internet
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de subir (git push) los
-- archivos nuevos de assets/img/perfumes/ a tu sitio publicado.
-- ==========================================================
--
-- Contexto: después de los lotes 1, 2 y 3, quedaban 79 de 335 perfumes
-- (24%) sin foto (imagen_url vacío). Este lote se enfocó primero en las
-- marcas de diseñador más conocidas (Carolina Herrera, Jean Paul Gaultier,
-- Giorgio/Emporio Armani, Givenchy, Nautica, Versace, Paco Rabanne,
-- Abercrombie & Fitch), buscando la foto oficial del frasco en la página
-- de cada marca o en grandes tiendas (Ulta, Armani.com, Carolina Herrera
-- oficial, Jean Paul Gaultier oficial, beautyhouse.com, FragranceOutlet),
-- verificando marca + nombre + concentración contra el nombre exacto del
-- producto antes de guardar cada imagen — mismo criterio de "si no se
-- puede verificar con confianza, se descarta" que los lotes 2 y 3.
--
-- Notas sobre casos particulares de este lote:
--
-- 1) "por-definir-chect-mate-king-mujer-100ml": el catálogo lo trae como
--    variante "mujer" de Check Mate King (Armaf), pero Armaf no vende un
--    "Check Mate King" para mujer — el producto real de esa colección
--    para mujer se llama "Armaf Checkmate QUEEN" (mismo diseño de pieza
--    de ajedrez, corona blanca). Se usó la foto real de Checkmate Queen;
--    probablemente valga la pena corregir el nombre/marca desde el panel
--    admin (igual que el caso "Chanel Bad Boy" del lote 3).
--
-- 2) "lattafa-pride-game-of-spades-diamond-100ml" y
--    "lattafa-pride-game-of-spades-high-roller-100ml": el catálogo los
--    trae bajo la marca 'Lattafa Pride', pero la línea "Game of Spades"
--    (Diamond, High Roller, etc.) es en realidad de la casa JO MILANO
--    PARIS, no de Lattafa. Se verificaron ambas ediciones por nombre
--    exacto contra la página oficial jomilanoparis.com (Diamond = frasco
--    negro con pica de cristales; High Roller = frasco marrón/ahumado
--    con pica dorada) antes de guardarlas. Vale la pena corregir la marca
--    desde el panel admin.
--
-- 3) Varios productos JPG y Versace comparten la misma foto en dos tallas
--    (75ml/125ml o 100ml/200ml) porque el frasco es idéntico y solo
--    cambia el tamaño — mismo criterio ya usado en lotes anteriores.
--
-- Con este lote quedan 21 de 335 sin foto — ver la sección "Revisadas y
-- descartadas" al final para el detalle de cada una.

-- ---------- Abercrombie & Fitch ----------
update perfumes set imagen_url = 'assets/img/perfumes/abercrombie-and-fitch-first-instinct-blue-edp-women-100ml.png' where slug = 'abercrombie-and-fitch-first-instinct-blue-edp-women-100ml';

-- ---------- Armaf (ver nota 1 sobre marca real) ----------
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-chect-mate-king-mujer-100ml.jpg' where slug = 'por-definir-chect-mate-king-mujer-100ml';

-- ---------- Carolina Herrera ----------
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-heroes-forever-young-edp-women-85ml.jpg' where slug = 'carolina-herrera-212-heroes-forever-young-edp-women-85ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-nyc-edt-men-100ml.jpg' where slug = 'carolina-herrera-212-nyc-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-nyc-edt-women-100ml.jpg' where slug = 'carolina-herrera-212-nyc-edt-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-vip-black-edp-men-100ml.jpg' where slug = 'carolina-herrera-212-vip-black-edp-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-vip-edp-women-80ml.jpg' where slug = 'carolina-herrera-212-vip-edp-women-80ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-vip-rose-edp-women-125ml.jpg' where slug = 'carolina-herrera-212-vip-rose-edp-women-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-bad-boy-edt-men-100ml.jpg' where slug = 'carolina-herrera-bad-boy-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-bad-boy-extreme-edp-men-150ml.jpg' where slug = 'carolina-herrera-bad-boy-extreme-edp-men-150ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-carolina-herrera-edp-women-100ml.jpg' where slug = 'carolina-herrera-carolina-herrera-edp-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-ch-edt-women-100ml.jpg' where slug = 'carolina-herrera-ch-edt-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-ch-sport-men-edt-men-100ml.png' where slug = 'carolina-herrera-ch-sport-men-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-good-girl-blush-elixir-women-80ml.jpg' where slug = 'carolina-herrera-good-girl-blush-elixir-women-80ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-good-girl-edp-women-80ml.jpg' where slug = 'carolina-herrera-good-girl-edp-women-80ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-vip-rose-cab-edp-women-85ml.jpg' where slug = 'carolina-herrera-vip-rose-cab-edp-women-85ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-wild-love-edp-men-100ml.jpg' where slug = 'carolina-herrera-wild-love-edp-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-wild-love-edp-women-100ml.jpg' where slug = 'carolina-herrera-wild-love-edp-women-100ml';

-- ---------- Emper ----------
update perfumes set imagen_url = 'assets/img/perfumes/emper-stallion-53-by-emper-edp-unisex-100ml.jpg' where slug = 'emper-stallion-53-by-emper-edp-unisex-100ml';

-- ---------- Emporio Armani ----------
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-emporio-armani-power-of-you-edp-women-90ml.jpg' where slug = 'emporio-armani-emporio-armani-power-of-you-edp-women-90ml';
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-emporio-armani-stronger-with-you-absolutely-edp-men-100ml.jpg' where slug = 'emporio-armani-emporio-armani-stronger-with-you-absolutely-edp-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-emporio-armani-stronger-with-you-edt-men-100ml.jpg' where slug = 'emporio-armani-emporio-armani-stronger-with-you-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-emporio-armani-stronger-with-you-intensely-edp-men-100ml.jpg' where slug = 'emporio-armani-emporio-armani-stronger-with-you-intensely-edp-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/emporio-armani-emporio-armani-stronger-with-you-powerfully-edp-men-100ml.jpg' where slug = 'emporio-armani-emporio-armani-stronger-with-you-powerfully-edp-men-100ml';

-- ---------- Giorgio Armani ----------
update perfumes set imagen_url = 'assets/img/perfumes/giorgio-armani-acqua-di-gio-edp-men-100ml.jpg' where slug = 'giorgio-armani-acqua-di-gio-edp-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/giorgio-armani-acqua-di-gio-profondo-parfum-men-100ml.jpg' where slug = 'giorgio-armani-acqua-di-gio-profondo-parfum-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/giorgio-armani-armani-code-edt-men-refillable-125ml.jpg' where slug = 'giorgio-armani-armani-code-edt-men-refillable-125ml';

-- ---------- Givenchy ----------
update perfumes set imagen_url = 'assets/img/perfumes/givenchy-pi-edt-men-100ml.png' where slug = 'givenchy-pi-edt-men-100ml';

-- ---------- Jean Paul Gaultier ----------
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-divine-elixir-edp-women-100ml.png' where slug = 'jean-paul-gaultier-divine-elixir-edp-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-la-belle-edp-women-100ml.png' where slug = 'jean-paul-gaultier-la-belle-edp-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-la-belle-paradise-garden-edp-women-100ml.png' where slug = 'jean-paul-gaultier-la-belle-paradise-garden-edp-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-la-belle-rosea-edp-women-100ml.png' where slug = 'jean-paul-gaultier-la-belle-rosea-edp-women-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-beau-narcisse-edp-men-125ml.png' where slug = 'jean-paul-gaultier-le-beau-narcisse-edp-men-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-beau-narcisse-edp-men-75ml.png' where slug = 'jean-paul-gaultier-le-beau-narcisse-edp-men-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-beau-paradise-garden-edp-men-125ml.png' where slug = 'jean-paul-gaultier-le-beau-paradise-garden-edp-men-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-absolu-edp-men-75ml.png' where slug = 'jean-paul-gaultier-le-male-elixir-absolu-edp-men-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-absolu-parfum-intense-men-125ml.png' where slug = 'jean-paul-gaultier-le-male-elixir-absolu-parfum-intense-men-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-parfum-men-125ml.png' where slug = 'jean-paul-gaultier-le-male-elixir-parfum-men-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-elixir-parfum-men-75ml.png' where slug = 'jean-paul-gaultier-le-male-elixir-parfum-men-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-le-parfum-edp-intense-men-125ml.png' where slug = 'jean-paul-gaultier-le-male-le-parfum-edp-intense-men-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-le-parfum-edp-intense-men-75ml.png' where slug = 'jean-paul-gaultier-le-male-le-parfum-edp-intense-men-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-pride-edt-men-125ml.png' where slug = 'jean-paul-gaultier-le-male-pride-edt-men-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-edp-women-80ml.png' where slug = 'jean-paul-gaultier-scandal-edp-women-80ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-edt-men-100ml.png' where slug = 'jean-paul-gaultier-scandal-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-elixir-parfum-men-100ml.png' where slug = 'jean-paul-gaultier-scandal-elixir-parfum-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-scandal-pour-homme-intense-edp-men-100ml.jpg' where slug = 'jean-paul-gaultier-scandal-pour-homme-intense-edp-men-100ml';

-- ---------- Lattafa Pride (ver nota 2 sobre marca real: Jo Milano Paris) ----------
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-diamond-100ml.png' where slug = 'lattafa-pride-game-of-spades-diamond-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-high-roller-100ml.jpg' where slug = 'lattafa-pride-game-of-spades-high-roller-100ml';

-- ---------- Nautica ----------
update perfumes set imagen_url = 'assets/img/perfumes/nautica-nautica-blue-edt-men-100ml.png' where slug = 'nautica-nautica-blue-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/nautica-nautica-classic-edt-men-100ml.jpg' where slug = 'nautica-nautica-classic-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/nautica-voyage-edt-men-100ml.png' where slug = 'nautica-voyage-edt-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/nautica-voyage-heritage-edt-men-100ml.png' where slug = 'nautica-voyage-heritage-edt-men-100ml';

-- ---------- Paco Rabanne ----------
update perfumes set imagen_url = 'assets/img/perfumes/paco-rabanne-pacco-rabanne-one-million-lucky-100ml.png' where slug = 'paco-rabanne-pacco-rabanne-one-million-lucky-100ml';

-- ---------- Versace ----------
update perfumes set imagen_url = 'assets/img/perfumes/versace-blue-jeans-edt-men-75ml.png' where slug = 'versace-blue-jeans-edt-men-75ml';
update perfumes set imagen_url = 'assets/img/perfumes/versace-eros-edt-men-200ml.png' where slug = 'versace-eros-edt-men-200ml';
update perfumes set imagen_url = 'assets/img/perfumes/versace-eros-flame-edp-men-100ml.png' where slug = 'versace-eros-flame-edp-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/versace-eros-flame-edp-men-200ml.png' where slug = 'versace-eros-flame-edp-men-200ml';
update perfumes set imagen_url = 'assets/img/perfumes/versace-red-jeans-edt-women-75ml.png' where slug = 'versace-red-jeans-edt-women-75ml';

-- ---------- Revisadas y descartadas (NO se tocaron) ----------
-- Se buscó una foto para cada una de estas 21 filas y no se encontró una coincidencia
-- verificable con confianza (nombre/edición ambigua, presentación tipo set/gift-set sin
-- foto del conjunto completo, o marca genérica "Por Definir" sin identificar):
--   armaf-odyssey-intense-100ml                                          -> línea Odyssey de Armaf tiene muchas ediciones (Homme, Spectra, Aoud, Mandarin Sky...); no existe una edición confirmada llamada solo "Intense", alto riesgo de confundir el frasco
--   bharara-pharaoh-ramesses-bharara-100ml                               -> Bharara vende "Pharaoh Ramesses I" y "Pharaoh Ramesses II" como frascos distintos; el catálogo no distingue cuál de los dos es, no se puede confirmar
--   carolina-herrera-212-vip-black-ny-rodeo-edp-men-100ml                -> edición limitada 2025 recién lanzada; no se encontró una foto de producto (no lifestyle/set) en una fuente verificable con hotlink funcional
--   carolina-herrera-set-212-vip-rose-edp-edp-women                      -> es un set (varias piezas), sin foto del set completo
--   emper-set-discovery-edp-stallion-53-the-black-92-captcha-36-ilang-62-unisex -> set de 4 miniaturas, sin foto del set completo
--   jean-paul-gaultier-jpg-edt-125ml                                     -> "JPG EDT" es demasiado genérico (la línea JPG tiene varias ediciones EDT), igual que en lote 3
--   jean-paul-gaultier-scandal-le-parfum-by-jean-paul-gaultier-for-men-100ml -> sin coincidencia verificable distinta de las otras variantes de Scandal ya cargadas, igual que en lote 3
--   jean-paul-gaultier-set-scandal-edt-men-without-qr                    -> es un set, sin foto del set completo
--   lattafa-lattafa-5th-anniversary-yara-yara-candy-edp-100ml            -> presentación de aniversario/set, sin foto verificable, igual que en lote 3
--   lattafa-set-de-sublime-lattafa-100ml                                 -> es un set (varias piezas), sin foto del set completo
--   lattafa-pride-al-qiam-gold-3-piece-perfume-gift-set-by-lattafa-pride-100ml -> gift set de 3 piezas, sin foto del set completo
--   lattafa-pride-giftset-art-of-universe-3pc-100ml                      -> gift set, sin foto del set completo
--   lattafa-pride-set-game-of-spades-x-3-pcs-x-5-pcs-30ml                -> gift set, sin foto del set completo
--   paco-rabanne-set-de-4-pacco-rabanne-100ml                            -> es un set de 4 piezas, sin foto del set completo
--   por-definir-amber-rouge-tester-100ml                                 -> marca real sin identificar, sin coincidencia verificable
--   por-definir-jean-lowe-inmortal-100ml                                 -> línea Jean Lowe (Maison Alhambra) confirmada por marca en lote 3, pero no se encontró la edición "Inmortal" específica
--   por-definir-king-of-king-royal-blue-100ml                            -> línea "King Of King" tiene varias ediciones de color; no se pudo confirmar cuál es "Royal Blue"
--   por-definir-set-honor-and-glory-1-1-100ml                            -> es un set (+1+1), sin foto del set completo
--   por-definir-set-untold-1-1-100ml                                     -> es un set (+1+1), sin foto del set completo
--   por-definir-sher-eau-de-parfum-100ml                                 -> marca real sin identificar, sin coincidencia verificable
--   rasasi-his-confesion-woman-100ml                                     -> variante "woman" del set His/Her Confession sin foto propia verificable, igual que en lote 3
-- Como en los lotes anteriores: mejor pedirle la foto puntual a tu proveedor (o subirla desde
-- el panel admin) que arriesgar una foto que muestre el producto, la edición o el color equivocado.
