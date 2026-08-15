-- ==========================================================
-- ACTUALIZACION DE CATALOGO -- CONSOLIDADO VIP ZADACA (15 ago 2026)
-- Fuente: 'CONSOLIDADO VIP _ZADACA (1).xlsx' (columna 'Desde 4 unidades'
-- = precio consolidado; columna 'PRECIO PUESTO EN PERU' = costo, la
-- mayoria de filas la traian rota con #REF! asi que solo se actualizo
-- costo_importacion_pen en las 2 filas donde si traia un numero).
--
-- REGLA DE MARGEN: precio_tienda_regular = precio_consolidado_fijo +
-- S/ 50, redondeado al sol entero. precio_consolidado_fijo se deja
-- EXACTAMENTE como esta en el Excel -- son dos precios independientes,
-- uno para consolidado y otro para tienda directa. margen_aplicado se
-- marca en true en todo lo que toca este script porque el margen ya es
-- real (no un placeholder igual al costo).
--
-- 1) PRECIOS Y FOTOS DE LO YA EXISTENTE (77 productos): 199 filas del
--    Excel se cruzaron contra el catalogo actual (216 productos) por
--    nombre normalizado; se revisaron a mano los casos ambiguos y se
--    dejaron FUERA los que no se pudo confirmar con certeza (entran
--    como productos nuevos en el bloque 2 en vez de forzar un match
--    dudoso).
--
-- 2) PRODUCTOS NUEVOS (118): perfumes del Excel que no estaban en el
--    catalogo. La marca se infirio del nombre (lineas conocidas: Game
--    of Spades/Lattafa Pride, Khamra/Yara/Eclaire/Fakhar/Asad -> Lattafa,
--    Hawas/Nitro -> Rasasi, Erba -> Xerjoff, Odyssey/CDN/Club de Nuit ->
--    Armaf, 212/CH/Bad Boy/Good Girl/Wild Love -> Carolina Herrera,
--    Acqua di Gio/Armani Code -> Giorgio Armani, Stronger With You/Power
--    of You -> Emporio Armani, Le Male/Scandal/La Belle -> Jean Paul
--    Gaultier, Eros/Blue Jeans/Red Jeans -> Versace, Nitro Red / Nitro
--    Intense -> Dumond (confirmado, no es la linea Nitro de Rasasi),
--    etc. -- revisala, es una heuristica editorial igual que las marcas
--    "Por Definir" que ya tenia el catalogo, NO un dato verificado
--    contra el proveedor. 2 filas quedaron en marca 'Por Definir' (King
--    Of King Royal Amber, Nebula Extreme by King of Kings) porque el
--    nombre no da para identificar la casa real.
--
--    De estos 118, 63 son la linea de diseñador (212, CH, Bad Boy, Good
--    Girl, Le Male, Scandal, La Belle, Eros, Acqua di Gio, Nautica...)
--    que en el Excel viene SIN FOTO -- quedan con imagen_url = null
--    hasta que subas una foto y la asignes desde el panel admin.
--
--    Sets / gift sets (Game of Spades sets, Asad Bourbon 3pcs, Rome
--    Extradose 5pc, Odyssey Deos Juego de 6, etc.): quedan con
--    mililitros = 1 a proposito (son varias piezas, no un solo frasco
--    de un tamano especifico) y el slug NO lleva sufijo de ml -- el
--    nombre ya deja claro que es un set.
--
-- 3) OJO -- ya confirmado con el negocio, solo para que quede registrado:
--    - Givenchy Gentleman Reserve Privee: S/ 278 es el precio correcto
--      (el S/ 673 que tenia el catalogo antes era un error de una ronda
--      anterior).
--    - 'Nitro Red' y 'Nitro Intense' son de la marca Dumond (la palabra
--      de marca aparecia en distinta posicion en cada fila del Excel),
--      no de Rasasi -- ya corregido arriba.
--
-- Ejecutar en el SQL Editor de Supabase. Antes de correrlo: sube (git
-- push) los archivos nuevos de assets/img/perfumes/ a tu sitio
-- publicado, igual que en los scripts anteriores.
-- ==========================================================

-- ---------- 1) Precios y fotos: productos que ya estaban en el catalogo (77) ----------
update perfumes set precio_consolidado_fijo = 110.0, precio_tienda_regular = 160, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9-pm-100ml.jpg' where slug = 'afnan-9-pm-100ml'; -- 9 PM
update perfumes set precio_consolidado_fijo = 115.0, precio_tienda_regular = 165, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9-pm-pour-femme-100ml.jpg' where slug = 'afnan-9-pm-pour-femme-100ml'; -- 9 PM Pour Femme
update perfumes set precio_consolidado_fijo = 114.0, precio_tienda_regular = 164, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9am-dive-100ml.jpg' where slug = 'afnan-9am-dive-100ml'; -- 9AM Dive
update perfumes set precio_consolidado_fijo = 115.0, precio_tienda_regular = 165, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9am-pour-femme-100ml.jpg' where slug = 'afnan-9am-pour-femme-100ml'; -- 9AM Pour Femme
update perfumes set precio_consolidado_fijo = 160.0, precio_tienda_regular = 210, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9pm-150ml.jpg' where slug = 'afnan-9pm-150ml'; -- 9PM
update perfumes set precio_consolidado_fijo = 147.0, precio_tienda_regular = 197, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9pm-elixir-eau-de-parfum-100ml.png' where slug = 'afnan-9pm-elixir-eau-de-parfum-100ml'; -- 9PM Elixir EAU DE Parfum
update perfumes set precio_consolidado_fijo = 160.0, precio_tienda_regular = 210, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9pm-nigh-out-100ml.png' where slug = 'afnan-9pm-nigh-out-100ml'; -- 9pm Nigh Out (antes S/ 165)
update perfumes set precio_consolidado_fijo = 147.0, precio_tienda_regular = 197, margen_aplicado = true, imagen_url = 'assets/img/perfumes/afnan-9pm-rebel-unisex-edp-by-afnan-100ml.png' where slug = 'afnan-9pm-rebel-unisex-edp-by-afnan-100ml'; -- 9PM Rebel Unisex EDP - BY Afnan
update perfumes set precio_consolidado_fijo = 185.0, precio_tienda_regular = 235, margen_aplicado = true, imagen_url = 'assets/img/perfumes/al-haramain-amber-gold-120ml.jpg' where slug = 'al-haramain-amber-gold-120ml'; -- Amber Gold
update perfumes set precio_consolidado_fijo = 122.0, precio_tienda_regular = 172, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-armaf-tag-red-100ml.jpg' where slug = 'armaf-armaf-tag-red-100ml'; -- Armaf TAG RED
update perfumes set precio_consolidado_fijo = 118.0, precio_tienda_regular = 168, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-c-d-n-intense-100ml.jpg' where slug = 'armaf-c-d-n-intense-100ml'; -- C.D.N. Intense
update perfumes set precio_consolidado_fijo = 150.0, precio_tienda_regular = 200, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-c-d-n-untold-100ml.jpg' where slug = 'armaf-c-d-n-untold-100ml'; -- C.d.n.untold
update perfumes set precio_consolidado_fijo = 115.0, precio_tienda_regular = 165, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-c-d-n-woman-100ml.jpg' where slug = 'armaf-c-d-n-woman-100ml'; -- C.D.N. Woman
update perfumes set precio_consolidado_fijo = 128.0, precio_tienda_regular = 178, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-cdn-urban-man-elixir-100ml.png' where slug = 'armaf-cdn-urban-man-elixir-100ml'; -- CDN Urban MAN Elixir (antes S/ 125)
update perfumes set precio_consolidado_fijo = 145.0, precio_tienda_regular = 195, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-island-bliss-by-armaf-100ml.jpg' where slug = 'armaf-island-bliss-by-armaf-100ml'; -- Island Bliss BY Armaf
update perfumes set precio_consolidado_fijo = 140.0, precio_tienda_regular = 190, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-odyssey-artisto-100ml.jpg' where slug = 'armaf-odyssey-artisto-100ml'; -- Odyssey Artisto
update perfumes set precio_consolidado_fijo = 110.0, precio_tienda_regular = 160, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-odyssey-limoni-100ml.jpg' where slug = 'armaf-odyssey-limoni-100ml'; -- Odyssey Limoni
update perfumes set precio_consolidado_fijo = 168.0, precio_tienda_regular = 218, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-odyssey-mandarin-sky-200ml.jpg' where slug = 'armaf-odyssey-mandarin-sky-200ml'; -- Odyssey Mandarin SKY
update perfumes set precio_consolidado_fijo = 145.0, precio_tienda_regular = 195, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-odyssey-mandarin-sky-elixir-limited-edition-100ml.png' where slug = 'armaf-odyssey-mandarin-sky-elixir-limited-edition-100ml'; -- Odyssey Mandarin Sky Elixir Limited Edition
update perfumes set precio_consolidado_fijo = 112.0, precio_tienda_regular = 162, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-odyssey-mega-100ml.jpg' where slug = 'armaf-odyssey-mega-100ml'; -- Odyssey Mega
update perfumes set precio_consolidado_fijo = 119.0, precio_tienda_regular = 169, margen_aplicado = true, imagen_url = 'assets/img/perfumes/armaf-odyssey-white-100ml.jpg' where slug = 'armaf-odyssey-white-100ml'; -- Odyssey White
update perfumes set precio_consolidado_fijo = 310.0, precio_tienda_regular = 360, margen_aplicado = true, imagen_url = 'assets/img/perfumes/azzaro-azzaro-perfum-100ml.jpg' where slug = 'azzaro-azzaro-perfum-100ml'; -- Azzaro Perfum
update perfumes set precio_consolidado_fijo = 185.0, precio_tienda_regular = 235, margen_aplicado = true, imagen_url = 'assets/img/perfumes/bharara-bharara-king-100ml.jpg' where slug = 'bharara-bharara-king-100ml'; -- Bharara King
update perfumes set precio_consolidado_fijo = 128.0, precio_tienda_regular = 178, margen_aplicado = true, imagen_url = 'assets/img/perfumes/bharara-bharara-mast-perfume-rome-pour-homme-100ml.png' where slug = 'bharara-bharara-mast-perfume-rome-pour-homme-100ml'; -- Bharara Mast Perfume Rome Pour Homme
update perfumes set precio_consolidado_fijo = 132.0, precio_tienda_regular = 182, margen_aplicado = true, imagen_url = 'assets/img/perfumes/french-avenue-azzure-oud-french-avenue-100ml.jpg' where slug = 'french-avenue-azzure-oud-french-avenue-100ml'; -- Azzure OUD French Avenue
update perfumes set precio_consolidado_fijo = 278.0, precio_tienda_regular = 328, margen_aplicado = true where slug = 'givenchy-givenchy-gentleman-reserve-privee-edp-100ml'; -- Givenchy Gentleman Reserve Privee EDP (antes S/ 673)
update perfumes set precio_consolidado_fijo = 469.0, precio_tienda_regular = 519, margen_aplicado = true, imagen_url = 'assets/img/perfumes/jean-paul-gaultier-jean-paul-gaultier-le-beau-le-parfum-m-edp-125ml.png' where slug = 'jean-paul-gaultier-jean-paul-gaultier-le-beau-le-parfum-m-edp-125ml'; -- Jean Paul Gaultier Le Beau Le Parfum M EDP (antes S/ 454)
update perfumes set precio_consolidado_fijo = 109.0, precio_tienda_regular = 159, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-asad-100ml.jpg' where slug = 'lattafa-asad-100ml'; -- Asad
update perfumes set precio_consolidado_fijo = 109.0, precio_tienda_regular = 159, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-asad-bourbon-100ml.jpg' where slug = 'lattafa-asad-bourbon-100ml'; -- Asad Bourbon
update perfumes set precio_consolidado_fijo = 125.0, precio_tienda_regular = 175, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-eclaire-100ml.jpg' where slug = 'lattafa-eclaire-100ml'; -- Eclaire
update perfumes set precio_consolidado_fijo = 104.0, precio_tienda_regular = 154, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-fakhar-black-lattafa-100ml.jpg' where slug = 'lattafa-fakhar-black-lattafa-100ml'; -- Fakhar Black Lattafa
update perfumes set precio_consolidado_fijo = 107.0, precio_tienda_regular = 157, margen_aplicado = true, costo_importacion_pen = 108.0, imagen_url = 'assets/img/perfumes/lattafa-khamra-clasic-100ml.jpg' where slug = 'lattafa-khamra-clasic-100ml'; -- Khamra Clasic
update perfumes set precio_consolidado_fijo = 107.0, precio_tienda_regular = 157, margen_aplicado = true, costo_importacion_pen = 108.0, imagen_url = 'assets/img/perfumes/lattafa-khamra-qawa-100ml.jpg' where slug = 'lattafa-khamra-qawa-100ml'; -- Khamra Qawa
update perfumes set precio_consolidado_fijo = 118.0, precio_tienda_regular = 168, margen_aplicado = true, costo_importacion_pen = 127.0, imagen_url = 'assets/img/perfumes/lattafa-khamrah-dukhan-100ml.jpg' where slug = 'lattafa-khamrah-dukhan-100ml'; -- Khamrah Dukhan
update perfumes set precio_consolidado_fijo = 115.0, precio_tienda_regular = 165, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-l-nebras-100ml.jpg' where slug = 'lattafa-l-nebras-100ml'; -- L.nebras
update perfumes set precio_consolidado_fijo = 122.0, precio_tienda_regular = 172, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-lattafa-jassor-100ml.jpg' where slug = 'lattafa-lattafa-jassor-100ml'; -- Lattafa Jassor
update perfumes set precio_consolidado_fijo = 125.0, precio_tienda_regular = 175, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-lattafa-mayar-cherry-100ml.jpg' where slug = 'lattafa-lattafa-mayar-cherry-100ml'; -- Lattafa Mayar Cherry
update perfumes set precio_consolidado_fijo = 125.0, precio_tienda_regular = 175, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-lattafa-vintage-100ml.jpg' where slug = 'lattafa-lattafa-vintage-100ml'; -- Lattafa Vintage
update perfumes set precio_consolidado_fijo = 112.0, precio_tienda_regular = 162, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-mayar-100ml.jpg' where slug = 'lattafa-mayar-100ml'; -- Mayar
update perfumes set precio_consolidado_fijo = 144.0, precio_tienda_regular = 194, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-musaman-white-100ml.jpg' where slug = 'lattafa-musaman-white-100ml'; -- Musaman White
update perfumes set precio_consolidado_fijo = 255.0, precio_tienda_regular = 305, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-bonus-eau-de-parfum-100ml.png' where slug = 'lattafa-pride-game-of-spades-bonus-eau-de-parfum-100ml'; -- Game Of Spades Bonus Eau De Parfum
update perfumes set precio_consolidado_fijo = 252.0, precio_tienda_regular = 302, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-emerald-eau-de-parfum-100ml.png' where slug = 'lattafa-pride-game-of-spades-emerald-eau-de-parfum-100ml'; -- Game Of Spades Emerald Eau De Parfum
update perfumes set precio_consolidado_fijo = 245.0, precio_tienda_regular = 295, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-full-house-100ml.png' where slug = 'lattafa-pride-game-of-spades-full-house-100ml'; -- Game OF Spades Full House
update perfumes set precio_consolidado_fijo = 257.0, precio_tienda_regular = 307, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-jackpot-100ml.png' where slug = 'lattafa-pride-game-of-spades-jackpot-100ml'; -- Game OF Spades Jackpot
update perfumes set precio_consolidado_fijo = 252.0, precio_tienda_regular = 302, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-moon-100ml.png' where slug = 'lattafa-pride-game-of-spades-moon-100ml'; -- Game Of Spades Moon
update perfumes set precio_consolidado_fijo = 245.0, precio_tienda_regular = 295, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-royale-100ml.png' where slug = 'lattafa-pride-game-of-spades-royale-100ml'; -- Game Of Spades Royale
update perfumes set precio_consolidado_fijo = 242.0, precio_tienda_regular = 292, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-wildcard-100ml.png' where slug = 'lattafa-pride-game-of-spades-wildcard-100ml'; -- Game Of Spades Wildcard
update perfumes set precio_consolidado_fijo = 265.0, precio_tienda_regular = 315, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-pride-gift-set-3-pcs-game-of-spades-100ml.png' where slug = 'lattafa-pride-gift-set-3-pcs-game-of-spades-100ml'; -- Gift Set 3 Pcs Game Of Spades (antes S/ 259)
update perfumes set precio_consolidado_fijo = 94.0, precio_tienda_regular = 144, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-q-a-fursan-100ml.jpg' where slug = 'lattafa-q-a-fursan-100ml'; -- Q.a. Fursan
update perfumes set precio_consolidado_fijo = 101.0, precio_tienda_regular = 151, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-qaed-al-fursan-untamed-100ml.jpg' where slug = 'lattafa-qaed-al-fursan-untamed-100ml'; -- Qaed Al Fursan Untamed
update perfumes set precio_consolidado_fijo = 140.0, precio_tienda_regular = 190, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-rayhaan-elixir-100ml.jpg' where slug = 'lattafa-rayhaan-elixir-100ml'; -- Rayhaan Elixir
update perfumes set precio_consolidado_fijo = 99.0, precio_tienda_regular = 149, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-sublime-100ml.jpg' where slug = 'lattafa-sublime-100ml'; -- Sublime
update perfumes set precio_consolidado_fijo = 99.0, precio_tienda_regular = 149, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-yara-candy-100ml.jpg' where slug = 'lattafa-yara-candy-100ml'; -- Yara Candy
update perfumes set precio_consolidado_fijo = 125.0, precio_tienda_regular = 175, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-yara-elixir-100ml.png' where slug = 'lattafa-yara-elixir-100ml'; -- Yara Elixir
update perfumes set precio_consolidado_fijo = 95.0, precio_tienda_regular = 145, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-yara-moi-100ml.jpg' where slug = 'lattafa-yara-moi-100ml'; -- Yara MOI
update perfumes set precio_consolidado_fijo = 99.0, precio_tienda_regular = 149, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-yara-rosa-100ml.jpg' where slug = 'lattafa-yara-rosa-100ml'; -- Yara Rosa
update perfumes set precio_consolidado_fijo = 95.0, precio_tienda_regular = 145, margen_aplicado = true, imagen_url = 'assets/img/perfumes/lattafa-yara-tous-100ml.png' where slug = 'lattafa-yara-tous-100ml'; -- Yara Tous
update perfumes set precio_consolidado_fijo = 199.0, precio_tienda_regular = 249, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-aqua-dubai-100ml.jpg' where slug = 'por-definir-aqua-dubai-100ml'; -- Aqua Dubai
update perfumes set precio_consolidado_fijo = 148.0, precio_tienda_regular = 198, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-berry-on-top-75ml.png' where slug = 'por-definir-berry-on-top-75ml'; -- Berry On Top
update perfumes set precio_consolidado_fijo = 100.0, precio_tienda_regular = 150, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-delilah-100ml.jpg' where slug = 'por-definir-delilah-100ml'; -- Delilah
update perfumes set precio_consolidado_fijo = 120.0, precio_tienda_regular = 170, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-jean-low-vibe-100ml.jpg' where slug = 'por-definir-jean-low-vibe-100ml'; -- Jean LOW Vibe
update perfumes set precio_consolidado_fijo = 142.0, precio_tienda_regular = 192, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-khadjaj-island-100ml.jpg' where slug = 'por-definir-khadjaj-island-100ml'; -- Khadjaj Island
update perfumes set precio_consolidado_fijo = 205.0, precio_tienda_regular = 255, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-king-of-king-private-blend-chapter-i-100ml.png' where slug = 'por-definir-king-of-king-private-blend-chapter-i-100ml'; -- King Of King Private Blend Chapter I (antes S/ 192)
update perfumes set precio_consolidado_fijo = 115.0, precio_tienda_regular = 165, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-lattafa-bade-e-al-oud-noble-blush-100ml.png' where slug = 'por-definir-lattafa-bade-e-al-oud-noble-blush-100ml'; -- Lattafa Bade'e Al Oud Noble Blush (antes S/ 109)
update perfumes set precio_consolidado_fijo = 140.0, precio_tienda_regular = 190, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-liquid-brun-100ml.jpg' where slug = 'por-definir-liquid-brun-100ml'; -- Liquid Brun (antes S/ 132)
update perfumes set precio_consolidado_fijo = 148.0, precio_tienda_regular = 198, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-mallow-madness-75ml.png' where slug = 'por-definir-mallow-madness-75ml'; -- Mallow Madness
update perfumes set precio_consolidado_fijo = 120.0, precio_tienda_regular = 170, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-mandarin-sky-100ml.jpg' where slug = 'por-definir-mandarin-sky-100ml'; -- Mandarin SKY
update perfumes set precio_consolidado_fijo = 172.0, precio_tienda_regular = 222, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-nitro-red-intensely-100ml.png' where slug = 'por-definir-nitro-red-intensely-100ml'; -- Nitro RED Intensely (antes S/ 163)
update perfumes set precio_consolidado_fijo = 108.0, precio_tienda_regular = 158, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-sceptre-malachite-eau-de-parfum-100ml.jpg' where slug = 'por-definir-sceptre-malachite-eau-de-parfum-100ml'; -- Sceptre Malachite Eau De Parfum
update perfumes set precio_consolidado_fijo = 120.0, precio_tienda_regular = 170, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-the-kingdom-100ml.png' where slug = 'por-definir-the-kingdom-100ml'; -- THE Kingdom
update perfumes set precio_consolidado_fijo = 148.0, precio_tienda_regular = 198, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-vanilla-freak-75ml.png' where slug = 'por-definir-vanilla-freak-75ml'; -- Vanilla Freak
update perfumes set precio_consolidado_fijo = 140.0, precio_tienda_regular = 190, margen_aplicado = true, imagen_url = 'assets/img/perfumes/por-definir-yumyum-100ml.jpg' where slug = 'por-definir-yumyum-100ml'; -- Yumyum
update perfumes set precio_consolidado_fijo = 145.0, precio_tienda_regular = 195, margen_aplicado = true, imagen_url = 'assets/img/perfumes/rasasi-hawas-elixir-100ml.png' where slug = 'rasasi-hawas-elixir-100ml'; -- Hawas Elixir (antes S/ 140)
update perfumes set precio_consolidado_fijo = 135.0, precio_tienda_regular = 185, margen_aplicado = true, imagen_url = 'assets/img/perfumes/rasasi-hawas-ice-100ml.png' where slug = 'rasasi-hawas-ice-100ml'; -- Hawas ICE (antes S/ 138)
update perfumes set precio_consolidado_fijo = 425.0, precio_tienda_regular = 475, margen_aplicado = true, imagen_url = 'assets/img/perfumes/valentino-valentino-born-intense-100ml.png' where slug = 'valentino-valentino-born-intense-100ml'; -- Valentino Born Intense
update perfumes set precio_consolidado_fijo = 689.0, precio_tienda_regular = 739, margen_aplicado = true, imagen_url = 'assets/img/perfumes/xerjoff-erba-pura-xerjof-eau-parfum-100ml.png' where slug = 'xerjoff-erba-pura-xerjof-eau-parfum-100ml'; -- Erba Pura Xerjof Eau Parfum
update perfumes set precio_consolidado_fijo = 685.0, precio_tienda_regular = 735, margen_aplicado = true, imagen_url = 'assets/img/perfumes/xerjoff-xerjof-naxos-100ml.jpg' where slug = 'xerjoff-xerjof-naxos-100ml'; -- Xerjof Naxos

-- ---------- 2) Productos nuevos (118) ----------
insert into perfumes (slug, nombre, marca, genero, concentracion, mililitros, precio_tienda_regular, precio_consolidado_fijo, costo_importacion_pen, costo_importacion_usd, margen_aplicado, imagen_url, tipo_casa) values
('lattafa-khamrah-waha-100ml', 'KHAMRAH WAhA', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 205, 155.0, null, null, true, 'assets/img/perfumes/lattafa-khamrah-waha-100ml.png', 'Árabe'), -- KHAMRAH WAhA 100 ML
('lattafa-badee-honor-glory-100ml', 'BADEE HONOR GLORY', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 149, 99.0, null, null, true, 'assets/img/perfumes/lattafa-badee-honor-glory-100ml.jpg', 'Árabe'), -- BADEE HONOR GLORY 100ML
('lattafa-rayhaan-tropical-vibe-edp-3-4-fl-oz-100ml', 'Rayhaan Tropical Vibe EDP 3.4 fl oz', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 197, 147.0, null, null, true, 'assets/img/perfumes/lattafa-rayhaan-tropical-vibe-edp-3-4-fl-oz-100ml.png', 'Árabe'), -- Rayhaan Tropical Vibe EDP 3.4 fl oz
('armaf-odyssey-homme-black-100ml', 'ODYSSEY HOMME BLACK', 'Armaf', 'Hombre', 'Eau de Parfum', 100, 169, 119.0, null, null, true, 'assets/img/perfumes/armaf-odyssey-homme-black-100ml.jpg', 'Árabe'), -- ODYSSEY HOMME BLACK 100Ml
('armaf-armaf-eter-arabian-sky-100ml', 'Armaf Eter Arabian Sky', 'Armaf', 'Unisex', 'Eau de Parfum', 100, 212, 162.0, null, null, true, 'assets/img/perfumes/armaf-armaf-eter-arabian-sky-100ml.png', 'Árabe'), -- Armaf Eter Arabian Sky 3.4oz
('armaf-armaf-odyssey-mandarin-sky-vintage-edition-new-100ml', 'ARMAF ODYSSEY MANDARIN SKY VINTAGE EDITION NEW', 'Armaf', 'Unisex', 'Eau de Parfum', 100, 197, 147.0, null, null, true, 'assets/img/perfumes/armaf-armaf-odyssey-mandarin-sky-vintage-edition-new-100ml.png', 'Árabe'), -- ARMAF ODYSSEY MANDARIN SKY VINTAGE EDITION NEW
('armaf-odyssey-marshmallow-edp-100ml', 'Odyssey Marshmallow Edp', 'Armaf', 'Unisex', 'Eau de Parfum', 100, 185, 135.0, null, null, true, 'assets/img/perfumes/armaf-odyssey-marshmallow-edp-100ml.png', 'Árabe'), -- Odyssey Marshmallow 3.4 oz Edp
('armaf-club-de-nuit-bling-75ml', 'CLUB DE NUIT BLING', 'Armaf', 'Unisex', 'Eau de Parfum', 75, 218, 168.0, null, null, true, 'assets/img/perfumes/armaf-club-de-nuit-bling-75ml.png', 'Árabe'), -- CLUB DE NUIT BLING 75 ML
('armaf-odyssey-dubai-chocolat-armaf-100ml', 'Odyssey Dubai Chocolat Armaf', 'Armaf', 'Unisex', 'Eau de Parfum', 100, 165, 115.0, null, null, true, 'assets/img/perfumes/armaf-odyssey-dubai-chocolat-armaf-100ml.png', 'Árabe'), -- Odyssey Dubai Chocolat Armaf
('armaf-armaf-odyssey-toffee-100ml', 'Armaf Odyssey Toffee', 'Armaf', 'Unisex', 'Eau de Parfum', 100, 189, 139.0, null, null, true, 'assets/img/perfumes/armaf-armaf-odyssey-toffee-100ml.png', 'Árabe'), -- Armaf Odyssey Toffee
('armaf-armaf-tag-her-donna-colorata-100ml', 'Armaf Tag Her Donna Colorata', 'Armaf', 'Mujer', 'Eau de Parfum', 100, 170, 120.0, null, null, true, 'assets/img/perfumes/armaf-armaf-tag-her-donna-colorata-100ml.png', 'Árabe'), -- Armaf Tag Her Donna Colorata
('armaf-odyssey-revolution-ultra-edition-100ml', 'ODYSSEY REVOLUTION ULTRA EDITION', 'Armaf', 'Unisex', 'Eau de Parfum', 100, 180, 130.0, null, null, true, 'assets/img/perfumes/armaf-odyssey-revolution-ultra-edition-100ml.png', 'Árabe'), -- ODYSSEY REVOLUTION ULTRA EDITION
('lattafa-fakhar-men-100ml', 'Fakhar Men', 'Lattafa', 'Hombre', 'Eau de Parfum', 100, 162, 112.0, null, null, true, 'assets/img/perfumes/lattafa-fakhar-men-100ml.png', 'Árabe'), -- Fakhar Men
('lattafa-my-yara-collection-4pcs-gift-set', 'My Yara Collection 4pcs Gift Set', 'Lattafa', 'Unisex', 'Eau de Parfum', 1, 215, 165.0, null, null, true, 'assets/img/perfumes/lattafa-my-yara-collection-4pcs-gift-set.png', 'Árabe'), -- My Yara Collection 25ml 4pcs Gift Set
('lattafa-fakhar-rose-eau-de-parfu-100ml', 'Fakhar Rose Eau de Parfu', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 155, 105.0, null, null, true, 'assets/img/perfumes/lattafa-fakhar-rose-eau-de-parfu-100ml.png', 'Árabe'), -- Fakhar Rose Eau de Parfu
('lattafa-angham-lattafa-100ml', 'Angham Lattafa', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 185, 135.0, null, null, true, 'assets/img/perfumes/lattafa-angham-lattafa-100ml.png', 'Árabe'), -- Angham Lattafa
('lattafa-eclaire-banoff-100ml', 'Eclaire Banoff', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 170, 120.0, null, null, true, 'assets/img/perfumes/Eclaire_Banoffi.png', 'Árabe'), -- Eclaire Banoff 100 ML
('lattafa-eclaire-pistache-100ml', 'Eclaire Pistache', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 170, 120.0, null, null, true, 'assets/img/perfumes/lattafa-eclaire-pistache-100ml.png', 'Árabe'), -- Eclaire Pistache 100 ML
('lattafa-shaheen-gold-100ml', 'Shaheen Gold', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 162, 112.0, null, null, true, 'assets/img/perfumes/lattafa-shaheen-gold-100ml.png', 'Árabe'), -- Shaheen Gold
('lattafa-lattafa-musamam-black-intense-100ml', 'Lattafa Musamam Black Intense', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 225, 175.0, null, null, true, 'assets/img/perfumes/lattafa-lattafa-musamam-black-intense-100ml.png', 'Árabe'), -- Lattafa Musamam Black Intense
('bharara-rome-extradose-by-bharara-100ml', 'Rome Extradose By Bharara', 'Bharara', 'Unisex', 'Extrait de Parfum', 100, 183, 133.0, null, null, true, 'assets/img/perfumes/bharara-rome-extradose-by-bharara-100ml.png', 'Árabe'), -- Rome Extradose By Bharara
('bharara-rome-melancholia-pour-homme-100ml', 'Rome Melancholia pour Homme', 'Bharara', 'Hombre', 'Eau de Parfum', 100, 183, 133.0, null, null, true, 'assets/img/perfumes/bharara-rome-melancholia-pour-homme-100ml.png', 'Árabe'), -- Rome Melancholia pour Homme
('lattafa-pride-game-spades-no-limit-100ml', 'GAME SPADES NO LIMIT', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 305, 255.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-spades-no-limit-100ml.png', 'Árabe'), -- GAME SPADES NO LIMIT
('lattafa-pride-game-of-spades-platinium-100ml', 'GAME OF SPADES PLATINIUM', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 280, 230.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-platinium-100ml.png', 'Árabe'), -- GAME OF SPADES PLATINIUM
('lattafa-pride-game-of-spades-trick-100ml', 'GAME OF SPADES TRICK', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 310, 260.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-trick-100ml.png', 'Árabe'), -- GAME OF SPADES TRICK
('lattafa-pride-game-of-spades-king-100ml', 'GAME OF SPADES KING', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 265, 215.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-king-100ml.png', 'Árabe'), -- GAME OF SPADES KING
('lattafa-pride-game-of-spades-rouge-100ml', 'GAME OF SPADES ROUGE', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 285, 235.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-rouge-100ml.png', 'Árabe'), -- GAME OF SPADES ROUGE
('lattafa-pride-game-of-spades-topaz-100ml', 'GAME OF SPADES TOPAZ', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 284, 234.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-topaz-100ml.png', 'Árabe'), -- GAME OF SPADES TOPAZ
('lattafa-pride-game-of-spades-win-100ml', 'GAME OF SPADES WIN', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 285, 235.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-win-100ml.png', 'Árabe'), -- GAME OF SPADES WIN
('lattafa-pride-game-of-spades-opal-100ml', 'GAME OF SPADES OPAL', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 275, 225.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-opal-100ml.png', 'Árabe'), -- GAME OF SPADES OPAL
('lattafa-pride-game-of-spades-ruby-100ml', 'GAME OF SPADES RUBY', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 310, 260.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-ruby-100ml.png', 'Árabe'), -- GAME OF SPADES RUBY
('xerjoff-tester-erba-pura-100ml', 'TESTER ERBA PURA', 'Xerjoff', 'Unisex', 'Eau de Parfum', 100, 680, 630.0, null, null, true, 'assets/img/perfumes/xerjoff-tester-erba-pura-100ml.png', 'Nicho'), -- TESTER ERBA PURA
('xerjoff-erba-gold-100ml', 'ERBA GOLD', 'Xerjoff', 'Unisex', 'Eau de Parfum', 100, 750, 700.0, null, null, true, 'assets/img/perfumes/xerjoff-erba-gold-100ml.png', 'Nicho'), -- ERBA GOLD 100ML
('xerjoff-tester-erba-gold-100ml', 'TESTER ERBA GOLD', 'Xerjoff', 'Unisex', 'Eau de Parfum', 100, 690, 640.0, null, null, true, 'assets/img/perfumes/xerjoff-tester-erba-gold-100ml.png', 'Nicho'), -- TESTER ERBA GOLD 100ML
('bharara-bharara-king-1000ml', 'BHARARA KING', 'Bharara', 'Unisex', 'Eau de Parfum', 1000, 720, 670.0, null, null, true, 'assets/img/perfumes/bharara-bharara-king-1000ml.png', 'Árabe'), -- BHARARA KING 1LITRO
('lattafa-rayhaan-aquatica-100ml', 'RAYHAAN AQUATICA', 'Lattafa', 'Unisex', 'Eau de Parfum', 100, 200, 150.0, null, null, true, 'assets/img/perfumes/lattafa-rayhaan-aquatica-100ml.png', 'Árabe'), -- RAYHAAN AQUATICA100ML
('armaf-armaf-odyssey-deos-juego-de-6', 'Armaf Odyssey Deos - Juego de 6', 'Armaf', 'Unisex', 'Eau de Parfum', 1, 180, 130.0, null, null, true, 'assets/img/perfumes/armaf-armaf-odyssey-deos-juego-de-6.png', 'Árabe'), -- Armaf Odyssey Deos - Juego de 6
('rasasi-hawas-malibu-100ml', 'HAWAS MALIBU', 'Rasasi', 'Unisex', 'Eau de Parfum', 100, 210, 160.0, null, null, true, 'assets/img/perfumes/rasasi-hawas-malibu-100ml.png', 'Árabe'), -- HAWAS MALIBU 100ML
('rasasi-hawas-for-him-100ml', 'HAWAS FOR HIM', 'Rasasi', 'Unisex', 'Eau de Parfum', 100, 185, 135.0, null, null, true, 'assets/img/perfumes/rasasi-hawas-for-him-100ml.png', 'Árabe'), -- HAWAS FOR HIM100ML
('rasasi-hawas-kobra-100ml', 'HAWAS KOBRA', 'Rasasi', 'Unisex', 'Eau de Parfum', 100, 210, 160.0, null, null, true, 'assets/img/perfumes/rasasi-hawas-kobra-100ml.png', 'Árabe'), -- HAWAS KOBRA100ML
('dumond-nitro-red-100ml', 'Nitro Red', 'Dumond', 'Unisex', 'Eau de Parfum', 100, 180, 130.0, null, null, true, 'assets/img/perfumes/dumond-nitro-red-100ml.png', 'Árabe'), -- NITRO RED DUMOND100ML
('rasasi-nitro-elixir-100ml', 'NITRO ELIXIR', 'Rasasi', 'Unisex', 'Elixir de Parfum', 100, 218, 168.0, null, null, true, 'assets/img/perfumes/rasasi-nitro-elixir-100ml.png', 'Árabe'), -- NITRO ELIXIR100ML
('dumond-nitro-intense-100ml', 'Nitro Intense', 'Dumond', 'Unisex', 'Eau de Parfum', 100, 182, 132.0, null, null, true, 'assets/img/perfumes/dumond-nitro-intense-100ml.png', 'Árabe'), -- DUMOND NITRO INTENSE100ML
('rasasi-nitro-gold-100ml', 'NITRO GOLD', 'Rasasi', 'Unisex', 'Eau de Parfum', 100, 222, 172.0, null, null, true, 'assets/img/perfumes/rasasi-nitro-gold-100ml.png', 'Árabe'), -- NITRO GOLD 100ML
('lattafa-pride-set-game-of-spades-x-2-pcs-full-house-and-bonus', 'SET GAME OF SPADES X 2 PCS (FULL HOUSE AND BONUS)', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 1, 456, 406.0, null, null, true, 'assets/img/perfumes/lattafa-pride-set-game-of-spades-x-2-pcs-full-house-and-bonus.png', 'Árabe'), -- SET GAME OF SPADES 100 ML X 2 PCS (FULL HOUSE AND BONUS)
('lattafa-pride-gift-set-game-of-spades-emerald-8-pcs', 'GIFT SET GAME OF SPADES EMERALD 8 PCS', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 1, 411, 361.0, null, null, true, 'assets/img/perfumes/lattafa-pride-gift-set-game-of-spades-emerald-8-pcs.png', 'Árabe'), -- GIFT SET GAME OF SPADES EMERALD 8 PCS 10 ML
('valentino-valentino-uomo-born-in-roma-intense-for-men-edp-spray-100ml', 'Valentino Uomo Born In Roma Intense for Men - EDP Spray', 'Valentino', 'Hombre', 'Eau de Parfum', 100, 475, 425.0, null, null, true, 'assets/img/perfumes/valentino-valentino-uomo-born-in-roma-intense-for-men-edp-spray-100ml.png', 'Diseñador'), -- Valentino Uomo Born In Roma Intense for Men - 3.4 oz EDP Spray
('french-avenue-french-avenue-atlantis-100ml', 'FRENCH AVENUE ATLANTIS', 'French Avenue', 'Unisex', 'Eau de Parfum', 100, 200, 150.0, null, null, true, 'assets/img/perfumes/french-avenue-french-avenue-atlantis-100ml.png', 'Árabe'), -- FRENCH AVENUE ATLANTIS 100ML
('lattafa-pride-game-of-spades-all-in-100ml', 'GAME OF SPADES ALL IN', 'Lattafa Pride', 'Unisex', 'Eau de Parfum', 100, 299, 249.0, null, null, true, 'assets/img/perfumes/lattafa-pride-game-of-spades-all-in-100ml.png', 'Árabe'), -- GAME OF SPADES ALL IN
('lattafa-asad-bourbon-3-pcs-giftset', 'Asad Bourbon 3 pcs Giftset', 'Lattafa', 'Unisex', 'Eau de Parfum', 1, 208, 158.0, null, null, true, 'assets/img/perfumes/lattafa-asad-bourbon-3-pcs-giftset.png', 'Árabe'), -- Asad Bourbon 3 pcs Giftset
('lattafa-lattafa-asad-gift-set-3-pcs', 'LATTAFA ASAD GIFT SET 3 PCS', 'Lattafa', 'Unisex', 'Eau de Parfum', 1, 180, 130.0, null, null, true, 'assets/img/perfumes/lattafa-lattafa-asad-gift-set-3-pcs.png', 'Árabe'), -- LATTAFA ASAD GIFT SET 3 PCS
('por-definir-king-of-king-royal-amber-100ml', 'King Of King Royal Amber', 'Por Definir', 'Unisex', 'Eau de Parfum', 100, 242, 192.0, null, null, true, 'assets/img/perfumes/por-definir-king-of-king-royal-amber-100ml.png', null), -- King Of King Royal Amber
('por-definir-nebula-extreme-parfum-edp-by-king-of-kings-100ml', 'NEBULA EXTREME PARFUM EDP by King of Kings', 'Por Definir', 'Unisex', 'Eau de Parfum', 100, 265, 215.0, null, null, true, 'assets/img/perfumes/por-definir-nebula-extreme-parfum-edp-by-king-of-kings-100ml.png', null), -- NEBULA EXTREME PARFUM 3.4 OZ EDP by King of Kings
('bharara-rome-extradose-pour-homme-5pc-set', 'Rome Extradose Pour Homme 5pc Set', 'Bharara', 'Hombre', 'Extrait de Parfum', 1, 211, 161.0, null, null, true, 'assets/img/perfumes/bharara-rome-extradose-pour-homme-5pc-set.png', 'Árabe'), -- Rome Extradose Pour Homme 5pc Set
('jean-paul-gaultier-jean-paul-gaultier-classique-miniatures-set', 'Jean Paul Gaultier Classique Miniatures Set', 'Jean Paul Gaultier', 'Unisex', 'Eau de Parfum', 1, 322, 272.0, null, null, true, 'assets/img/perfumes/jean-paul-gaultier-jean-paul-gaultier-classique-miniatures-set.png', 'Diseñador'), -- Jean Paul Gaultier Classique Miniatures Set
('dior-tester-miss-dior-blooming-bouquet-100ml', 'Tester Miss Dior Blooming Bouquet', 'Dior', 'Unisex', 'Eau de Parfum', 100, 530, 480.0, null, null, true, 'assets/img/perfumes/Miss_Dior_Blooming_Bouquet.png', 'Diseñador'), -- (Tester)Miss Dior Blooming Bouquet 100 ml
('carolina-herrera-212-vip-black-edp-men-100ml', '212 Vip Black Edp Men', 'Carolina Herrera', 'Hombre', 'Eau de Parfum', 100, 320, 270.0, null, null, true, null, 'Diseñador'), -- 212 Vip Black 3.4 Oz Edp Men
('carolina-herrera-212-nyc-edt-women-100ml', '212 Nyc Edt Women', 'Carolina Herrera', 'Mujer', 'Eau de Toilette', 100, 334, 284.0, null, null, true, null, 'Diseñador'), -- 212 Nyc 3.4 Oz Edt Women
('carolina-herrera-ch-edt-women-100ml', 'Ch Edt Women', 'Carolina Herrera', 'Mujer', 'Eau de Toilette', 100, 330, 280.0, null, null, true, null, 'Diseñador'), -- Ch 3.4 Oz Edt Women
('carolina-herrera-bad-boy-extreme-edp-men-150ml', 'Bad Boy Extreme Edp Men', 'Carolina Herrera', 'Hombre', 'Eau de Parfum', 150, 365, 315.0, null, null, true, null, 'Diseñador'), -- Bad Boy Extreme 5.1 Oz Edp Men
('carolina-herrera-bad-boy-edt-men-100ml', 'Bad Boy Edt Men', 'Carolina Herrera', 'Hombre', 'Eau de Toilette', 100, 350, 300.0, null, null, true, null, 'Diseñador'), -- Bad Boy 3.4 Oz Edt Men
('carolina-herrera-212-vip-rose-edp-women-125ml', '212 Vip Rose Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 125, 393, 343.0, null, null, true, null, 'Diseñador'), -- 212 Vip Rose 4.2 Oz Edp Women
('carolina-herrera-good-girl-blush-elixir-women-80ml', 'Good Girl Blush Elixir Women', 'Carolina Herrera', 'Mujer', 'Elixir de Parfum', 80, 428, 378.0, null, null, true, null, 'Diseñador'), -- Good Girl Blush Elixir 2.7 Oz Women
('carolina-herrera-good-girl-edp-women-80ml', 'Good Girl Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 80, 415, 365.0, null, null, true, null, 'Diseñador'), -- Good Girl 2.7 Oz Edp Women
('carolina-herrera-212-nyc-edt-men-100ml', '212 Nyc Edt Men', 'Carolina Herrera', 'Hombre', 'Eau de Toilette', 100, 285, 235.0, null, null, true, null, 'Diseñador'), -- 212 Nyc 3.4 Oz Edt Men
('carolina-herrera-carolina-herrera-edp-women-100ml', 'Carolina Herrera Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 100, 277, 227.0, null, null, true, null, 'Diseñador'), -- Carolina Herrera 3.4 Oz Edp Women
('carolina-herrera-ch-sport-men-edt-men-100ml', 'Ch Sport Men Edt Men', 'Carolina Herrera', 'Hombre', 'Eau de Toilette', 100, 220, 170.0, null, null, true, null, 'Diseñador'), -- Ch Sport Men 3.4 Oz Edt Men
('carolina-herrera-212-vip-edp-women-80ml', '212 Vip Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 80, 288, 238.0, null, null, true, null, 'Diseñador'), -- 212 Vip 2.7 Oz Edp  Women
('carolina-herrera-212-heroes-forever-young-edp-women-85ml', '212 Heroes Forever Young Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 85, 364, 314.0, null, null, true, null, 'Diseñador'), -- 212 Heroes Forever Young 2.8 Oz Edp Women
('carolina-herrera-wild-love-edp-men-100ml', 'Wild Love Edp Men', 'Carolina Herrera', 'Hombre', 'Eau de Parfum', 100, 400, 350.0, null, null, true, null, 'Diseñador'), -- Wild Love 3.4 Oz Edp Men
('carolina-herrera-212-vip-black-ny-rodeo-edp-men-100ml', '212 Vip Black NY Rodeo Edp Men', 'Carolina Herrera', 'Hombre', 'Eau de Parfum', 100, 350, 300.0, null, null, true, null, 'Diseñador'), -- 212 Vip Black NY Rodeo 3.4 Oz Edp Men
('carolina-herrera-wild-love-edp-women-100ml', 'Wild Love Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 100, 435, 385.0, null, null, true, null, 'Diseñador'), -- Wild Love 3.4 Oz Edp Women
('carolina-herrera-vip-rose-cab-edp-women-85ml', 'Vip Rose Cab Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 85, 379, 329.0, null, null, true, null, 'Diseñador'), -- Vip Rose Cab 2.8 Oz Edp Women
('carolina-herrera-set-212-vip-rose-edp-edp-women', 'Set 212 Vip Rose Edp + Edp Women', 'Carolina Herrera', 'Mujer', 'Eau de Parfum', 1, 351, 301.0, null, null, true, null, 'Diseñador'), -- Set 212 Vip Rose 2.7 Oz Edp + 10 Ml Edp Women
('emper-stallion-53-by-emper-edp-unisex-100ml', 'Stallion 53 By Emper Edp Unisex', 'Emper', 'Unisex', 'Eau de Parfum', 100, 149, 99.0, null, null, true, null, 'Árabe'), -- Stallion 53 By Emper 3.4 Oz Edp Unisex
('emper-set-discovery-edp-stallion-53-the-black-92-captcha-36-ilang-62-unisex', 'Set Discovery Edp Stallion 53 + The Black 92 + Captcha 36 + Ilang 62 Unisex', 'Emper', 'Unisex', 'Eau de Parfum', 1, 149, 99.0, null, null, true, null, 'Árabe'), -- Set Discovery Edp Stallion 53 + The Black 92 + Captcha 36 + Ilang 62 1.0 Oz Unisex
('emporio-armani-emporio-armani-stronger-with-you-edt-men-100ml', 'Emporio Armani Stronger With You Edt Men', 'Emporio Armani', 'Hombre', 'Eau de Toilette', 100, 340, 290.0, null, null, true, null, 'Diseñador'), -- Emporio Armani Stronger With You  3.4 Oz Edt Men
('giorgio-armani-acqua-di-gio-profondo-parfum-men-100ml', 'Acqua Di Gio Profondo Parfum Men', 'Giorgio Armani', 'Hombre', 'Parfum', 100, 380, 330.0, null, null, true, null, 'Diseñador'), -- Acqua Di Gio Profondo 3.3 Oz Parfum Men
('giorgio-armani-armani-code-edt-men-refillable-125ml', 'Armani Code Edt Men Refillable', 'Giorgio Armani', 'Hombre', 'Eau de Toilette', 125, 316, 266.0, null, null, true, null, 'Diseñador'), -- Armani Code 4.2 Oz Edt Men Refillable
('emporio-armani-emporio-armani-stronger-with-you-intensely-edp-men-100ml', 'Emporio Armani Stronger With You Intensely Edp Men', 'Emporio Armani', 'Hombre', 'Eau de Parfum', 100, 360, 310.0, null, null, true, null, 'Diseñador'), -- Emporio Armani Stronger With You Intensely 3.4 Oz Edp Men
('giorgio-armani-acqua-di-gio-edp-men-100ml', 'Acqua Di Gio Edp Men', 'Giorgio Armani', 'Hombre', 'Eau de Parfum', 100, 372, 322.0, null, null, true, null, 'Diseñador'), -- Acqua Di Gio 3.4 Oz Edp Men
('emporio-armani-emporio-armani-power-of-you-edp-women-90ml', 'Emporio Armani Power Of You Edp Women', 'Emporio Armani', 'Mujer', 'Eau de Parfum', 90, 526, 476.0, null, null, true, null, 'Diseñador'), -- Emporio  Armani Power Of You 3.0 Oz Edp Women
('emporio-armani-emporio-armani-stronger-with-you-powerfully-edp-men-100ml', 'Emporio Armani Stronger With You Powerfully Edp Men', 'Emporio Armani', 'Hombre', 'Eau de Parfum', 100, 470, 420.0, null, null, true, null, 'Diseñador'), -- Emporio Armani Stronger With You Powerfully 3.4 Oz Edp Men
('emporio-armani-emporio-armani-stronger-with-you-absolutely-edp-men-100ml', 'Emporio Armani Stronger With You Absolutely Edp Men', 'Emporio Armani', 'Hombre', 'Eau de Parfum', 100, 414, 364.0, null, null, true, null, 'Diseñador'), -- Emporio Armani Stronger With You Absolutely 3.4 Oz Edp Men
('givenchy-pi-edt-men-100ml', 'Pi Edt Men', 'Givenchy', 'Hombre', 'Eau de Toilette', 100, 225, 175.0, null, null, true, null, 'Diseñador'), -- Pi 3.3 Oz Edt Men
('jean-paul-gaultier-la-belle-paradise-garden-edp-women-100ml', 'La Belle Paradise Garden Edp Women', 'Jean Paul Gaultier', 'Mujer', 'Eau de Parfum', 100, 435, 385.0, null, null, true, null, 'Diseñador'), -- La Belle Paradise Garden 3.4 Oz Edp Women
('jean-paul-gaultier-le-male-le-parfum-edp-intense-men-75ml', 'Le Male Le Parfum Edp Intense Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 75, 330, 280.0, null, null, true, null, 'Diseñador'), -- Le Male Le Parfum 2.5 Oz Edp Intense Men
('jean-paul-gaultier-le-male-elixir-parfum-men-75ml', 'Le Male Elixir Parfum Men', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 75, 337, 287.0, null, null, true, null, 'Diseñador'), -- Le Male Elixir 2.5 Oz Parfum Men
('jean-paul-gaultier-le-male-elixir-parfum-men-125ml', 'Le Male Elixir Parfum Men', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 125, 405, 355.0, null, null, true, null, 'Diseñador'), -- Le Male Elixir 4.2 Oz Parfum Men
('jean-paul-gaultier-le-beau-paradise-garden-edp-men-125ml', 'Le Beau Paradise Garden Edp Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 125, 401, 351.0, null, null, true, null, 'Diseñador'), -- Le Beau Paradise Garden 4.2 Oz Edp Men
('jean-paul-gaultier-le-male-le-parfum-edp-intense-men-125ml', 'Le Male Le Parfum Edp Intense Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 125, 385, 335.0, null, null, true, null, 'Diseñador'), -- Le Male Le Parfum 4.2 Oz Edp Intense Men
('jean-paul-gaultier-scandal-edp-women-80ml', 'Scandal Edp Women', 'Jean Paul Gaultier', 'Mujer', 'Eau de Parfum', 80, 405, 355.0, null, null, true, null, 'Diseñador'), -- Scandal 2.7 Oz Edp Women
('jean-paul-gaultier-scandal-edt-men-100ml', 'Scandal Edt Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Toilette', 100, 379, 329.0, null, null, true, null, 'Diseñador'), -- Scandal 3.4 Oz Edt Men
('jean-paul-gaultier-la-belle-edp-women-100ml', 'La Belle Edp Women', 'Jean Paul Gaultier', 'Mujer', 'Eau de Parfum', 100, 431, 381.0, null, null, true, null, 'Diseñador'), -- La Belle 3.4 Oz Edp Women
('jean-paul-gaultier-le-male-elixir-absolu-parfum-intense-men-125ml', 'Le Male Elixir Absolu Parfum Intense Men', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 125, 425, 375.0, null, null, true, null, 'Diseñador'), -- Le Male Elixir Absolu 4.2 Oz Parfum Intense Men
('jean-paul-gaultier-scandal-elixir-parfum-men-100ml', 'Scandal Elixir Parfum Men', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 100, 396, 346.0, null, null, true, null, 'Diseñador'), -- Scandal Elixir 3.4 Oz Parfum Men
('jean-paul-gaultier-le-male-in-blue-edp-men-without-qr-125ml', 'Le Male In Blue Edp Men Without QR', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 125, 456, 406.0, null, null, true, 'assets/img/perfumes/jean-paul-gaultier-le-male-in-blue-edp-men-without-qr-125ml.png', 'Diseñador'), -- Le Male In Blue 4.2 Oz Edp Men Without QR
('jean-paul-gaultier-le-beau-narcisse-edp-men-75ml', 'Le Beau Narcisse Edp Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 75, 414, 364.0, null, null, true, null, 'Diseñador'), -- Le Beau Narcisse 2.5 Oz Edp Men
('jean-paul-gaultier-divine-elixir-edp-women-100ml', 'Divine Elixir Edp Women', 'Jean Paul Gaultier', 'Mujer', 'Elixir de Parfum', 100, 463, 413.0, null, null, true, null, 'Diseñador'), -- Divine Elixir 3.4 Oz Edp Women
('jean-paul-gaultier-le-male-pride-edt-men-125ml', 'Le Male Pride Edt Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Toilette', 125, 307, 257.0, null, null, true, null, 'Diseñador'), -- Le Male Pride 4.2 Oz Edt Men
('jean-paul-gaultier-set-scandal-edt-men-without-qr', 'Set Scandal + Edt Men without QR', 'Jean Paul Gaultier', 'Hombre', 'Eau de Toilette', 1, 353, 303.0, null, null, true, null, 'Diseñador'), -- Set Scandal  3.3 Oz + 0.68 Oz Edt Men without QR
('jean-paul-gaultier-le-male-elixir-absolu-edp-men-75ml', 'Le Male Elixir Absolu Edp Men', 'Jean Paul Gaultier', 'Hombre', 'Elixir de Parfum', 75, 309, 259.0, null, null, true, null, 'Diseñador'), -- Le Male Elixir Absolu 2.5 Oz Edp Men
('jean-paul-gaultier-le-beau-narcisse-edp-men-125ml', 'Le Beau Narcisse Edp Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 125, 508, 458.0, null, null, true, null, 'Diseñador'), -- Le Beau Narcisse 4.2 Oz Edp Men
('jean-paul-gaultier-la-belle-rosea-edp-women-100ml', 'La Belle Rosea Edp Women', 'Jean Paul Gaultier', 'Mujer', 'Eau de Parfum', 100, 535, 485.0, null, null, true, null, 'Diseñador'), -- La Belle Rosea 3.4 Oz Edp Women
('jean-paul-gaultier-scandal-pour-homme-intense-edp-men-100ml', 'Scandal Pour Homme Intense Edp Men', 'Jean Paul Gaultier', 'Hombre', 'Eau de Parfum', 100, 375, 325.0, null, null, true, null, 'Diseñador'), -- Scandal Pour Homme Intense 3.4 Oz Edp Men
('nautica-nautica-blue-edt-men-100ml', 'NAUTICA Blue Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 100, 140, 90.0, null, null, true, null, 'Diseñador'), -- NAUTICA Blue 3.4 Oz Edt Men
('nautica-nautica-classic-edt-men-100ml', 'NAUTICA Classic Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 100, 142, 92.0, null, null, true, null, 'Diseñador'), -- NAUTICA Classic 3.4 Oz Edt Men
('nautica-nautica-voyage-n-83-edt-men-100ml', 'NAUTICA Voyage N-83 Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 100, 149, 99.0, null, null, true, 'assets/img/perfumes/nautica-nautica-voyage-n-83-edt-men-100ml.png', 'Diseñador'), -- NAUTICA Voyage N-83 3.4 Oz Edt Men
('nautica-nautica-voyage-edt-men-200ml', 'NAUTICA Voyage Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 200, 175, 125.0, null, null, true, 'assets/img/perfumes/nautica-nautica-voyage-edt-men-200ml.png', 'Diseñador'), -- NAUTICA Voyage 6.7 Oz Edt Men
('nautica-voyage-heritage-edt-men-100ml', 'Voyage Heritage Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 100, 149, 99.0, null, null, true, null, 'Diseñador'), -- Voyage Heritage 3.4 Oz Edt Men
('nautica-nautica-pure-blue-edt-men-100ml', 'NAUTICA Pure Blue Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 100, 149, 99.0, null, null, true, 'assets/img/perfumes/nautica-nautica-pure-blue-edt-men-100ml.png', 'Diseñador'), -- NAUTICA Pure Blue 3.4 Oz Edt Men
('nautica-voyage-edt-men-100ml', 'Voyage Edt Men', 'Nautica', 'Hombre', 'Eau de Toilette', 100, 145, 95.0, null, null, true, null, 'Diseñador'), -- Voyage 3.3 Oz Edt Men
('versace-eros-flame-edp-men-100ml', 'Eros Flame Edp Men', 'Versace', 'Hombre', 'Eau de Parfum', 100, 292, 242.0, null, null, true, null, 'Diseñador'), -- Eros Flame 3.4 Oz Edp Men
('versace-red-jeans-edt-women-75ml', 'Red Jeans Edt Women', 'Versace', 'Mujer', 'Eau de Toilette', 75, 165, 115.0, null, null, true, null, 'Diseñador'), -- Red Jeans 2.5 Oz Edt Women
('versace-eros-edt-men-200ml', 'Eros Edt Men', 'Versace', 'Hombre', 'Eau de Toilette', 200, 351, 301.0, null, null, true, null, 'Diseñador'), -- Eros 6.8 Oz Edt Men
('versace-blue-jeans-edt-men-75ml', 'Blue Jeans Edt Men', 'Versace', 'Hombre', 'Eau de Toilette', 75, 166, 116.0, null, null, true, null, 'Diseñador'), -- Blue Jeans 2.5 Oz Edt Men
('versace-eros-flame-edp-men-200ml', 'Eros Flame Edp Men', 'Versace', 'Hombre', 'Eau de Parfum', 200, 351, 301.0, null, null, true, null, 'Diseñador'), -- Eros Flame 6.7 Oz Edp Men
('abercrombie-and-fitch-first-instinct-blue-edp-women-100ml', 'First Instinct Blue Edp Women', 'Abercrombie & Fitch', 'Mujer', 'Eau de Parfum', 100, 168, 118.0, null, null, true, null, 'Diseñador'); -- First Instinct Blue 3.4 Oz Edp Women

