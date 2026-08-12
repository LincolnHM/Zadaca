-- ==========================================================
-- Actualizacion de catalogo: CONSOLIDADO VIP ZADACA (agosto 2026)
-- Fuente: 'CONSOLIDADO VIP _ZADACA (1).xlsx' (columna 'Desde 4
-- unidades'). 75 productos con match confiable por nombre --
-- verificados a mano uno por uno contra el Excel (nombre Y foto)
-- para evitar falsos positivos entre variantes muy parecidas
-- (ej. las ~10 variantes de 'Game of Spades' que AUN NO estan en
-- el catalogo se dejaron fuera a proposito, ver mensaje aparte).
--
-- El precio nuevo se aplica por igual a costo/consolidado/tienda
-- (mismo patron que seed.sql: margen_aplicado sigue en false,
-- corre la Calculadora de Margenes despues si quieres aplicar
-- margen). Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- 1) Precios (75 productos)
update perfumes set precio_tienda_regular = 107.0, precio_consolidado_fijo = 107.0, costo_importacion_pen = 107.0 where slug = 'lattafa-khamra-clasic-100ml'; -- Khamra Clasic (antes S/ 108.0)
update perfumes set precio_tienda_regular = 107.0, precio_consolidado_fijo = 107.0, costo_importacion_pen = 107.0 where slug = 'lattafa-khamra-qawa-100ml'; -- Khamra Qawa (antes S/ 108.0)
update perfumes set precio_tienda_regular = 118.0, precio_consolidado_fijo = 118.0, costo_importacion_pen = 118.0 where slug = 'lattafa-khamrah-dukhan-100ml'; -- Khamrah Dukhan (antes S/ 127.0)
update perfumes set precio_tienda_regular = 99.0, precio_consolidado_fijo = 99.0, costo_importacion_pen = 99.0 where slug = 'lattafa-yara-candy-100ml'; -- Yara Candy (antes S/ 99.0)
update perfumes set precio_tienda_regular = 95.0, precio_consolidado_fijo = 95.0, costo_importacion_pen = 95.0 where slug = 'lattafa-yara-moi-100ml'; -- Yara MOI (antes S/ 93.0)
update perfumes set precio_tienda_regular = 99.0, precio_consolidado_fijo = 99.0, costo_importacion_pen = 99.0 where slug = 'lattafa-yara-rosa-100ml'; -- Yara Rosa (antes S/ 99.0)
update perfumes set precio_tienda_regular = 125.0, precio_consolidado_fijo = 125.0, costo_importacion_pen = 125.0 where slug = 'lattafa-yara-elixir-100ml'; -- Yara Elixir (antes S/ 130.0)
update perfumes set precio_tienda_regular = 95.0, precio_consolidado_fijo = 95.0, costo_importacion_pen = 95.0 where slug = 'lattafa-yara-tous-100ml'; -- Yara Tous (antes S/ 112.0)
update perfumes set precio_tienda_regular = 99.0, precio_consolidado_fijo = 99.0, costo_importacion_pen = 99.0 where slug = 'por-definir-honor-and-glory-100ml'; -- Honor AND Glory (antes S/ 99.0)
update perfumes set precio_tienda_regular = 99.0, precio_consolidado_fijo = 99.0, costo_importacion_pen = 99.0 where slug = 'lattafa-sublime-100ml'; -- Sublime (antes S/ 99.0)
update perfumes set precio_tienda_regular = 185.0, precio_consolidado_fijo = 185.0, costo_importacion_pen = 185.0 where slug = 'bharara-bharara-king-100ml'; -- Bharara King (antes S/ 185.0)
update perfumes set precio_tienda_regular = 108.0, precio_consolidado_fijo = 108.0, costo_importacion_pen = 108.0 where slug = 'por-definir-sceptre-malachite-eau-de-parfum-100ml'; -- Sceptre Malachite Eau De Parfum (antes S/ 106.0)
update perfumes set precio_tienda_regular = 140.0, precio_consolidado_fijo = 140.0, costo_importacion_pen = 140.0 where slug = 'armaf-odyssey-artisto-100ml'; -- Odyssey Artisto (antes S/ 147.0)
update perfumes set precio_tienda_regular = 118.0, precio_consolidado_fijo = 118.0, costo_importacion_pen = 118.0 where slug = 'armaf-c-d-n-intense-100ml'; -- C.D.N. Intense (antes S/ 110.0)
update perfumes set precio_tienda_regular = 115.0, precio_consolidado_fijo = 115.0, costo_importacion_pen = 115.0 where slug = 'armaf-c-d-n-woman-100ml'; -- C.D.N. Woman (antes S/ 116.0)
update perfumes set precio_tienda_regular = 120.0, precio_consolidado_fijo = 120.0, costo_importacion_pen = 120.0 where slug = 'por-definir-jean-low-vibe-100ml'; -- Jean LOW Vibe (antes S/ 113.0)
update perfumes set precio_tienda_regular = 100.0, precio_consolidado_fijo = 100.0, costo_importacion_pen = 100.0 where slug = 'por-definir-delilah-100ml'; -- Delilah (antes S/ 172.0)
update perfumes set precio_tienda_regular = 145.0, precio_consolidado_fijo = 145.0, costo_importacion_pen = 145.0 where slug = 'armaf-island-bliss-by-armaf-100ml'; -- Island Bliss BY Armaf (antes S/ 168.0)
update perfumes set precio_tienda_regular = 138.0, precio_consolidado_fijo = 138.0, costo_importacion_pen = 138.0 where slug = 'rasasi-hawas-ice-100ml'; -- Hawas ICE (antes S/ 128.0)
update perfumes set precio_tienda_regular = 140.0, precio_consolidado_fijo = 140.0, costo_importacion_pen = 140.0 where slug = 'rasasi-hawas-elixir-100ml'; -- Hawas Elixir (antes S/ 293.0)
update perfumes set precio_tienda_regular = 310.0, precio_consolidado_fijo = 310.0, costo_importacion_pen = 310.0 where slug = 'azzaro-azzaro-perfum-100ml'; -- Azzaro Perfum (antes S/ 304.0)
update perfumes set precio_tienda_regular = 168.0, precio_consolidado_fijo = 168.0, costo_importacion_pen = 168.0 where slug = 'armaf-odyssey-mandarin-sky-200ml'; -- Odyssey Mandarin SKY (antes S/ 163.0)
update perfumes set precio_tienda_regular = 132.0, precio_consolidado_fijo = 132.0, costo_importacion_pen = 132.0 where slug = 'french-avenue-azzure-oud-french-avenue-100ml'; -- Azzure OUD French Avenue (antes S/ 140.0)
update perfumes set precio_tienda_regular = 142.0, precio_consolidado_fijo = 142.0, costo_importacion_pen = 142.0 where slug = 'por-definir-khadjaj-island-100ml'; -- Khadjaj Island (antes S/ 142.0)
update perfumes set precio_tienda_regular = 114.0, precio_consolidado_fijo = 114.0, costo_importacion_pen = 114.0 where slug = 'afnan-9am-dive-100ml'; -- 9AM Dive (antes S/ 111.0)
update perfumes set precio_tienda_regular = 115.0, precio_consolidado_fijo = 115.0, costo_importacion_pen = 115.0 where slug = 'afnan-9am-pour-femme-100ml'; -- 9AM Pour Femme (antes S/ 111.0)
update perfumes set precio_tienda_regular = 115.0, precio_consolidado_fijo = 115.0, costo_importacion_pen = 115.0 where slug = 'afnan-9-pm-pour-femme-100ml'; -- 9 PM Pour Femme (antes S/ 111.0)
update perfumes set precio_tienda_regular = 110.0, precio_consolidado_fijo = 110.0, costo_importacion_pen = 110.0 where slug = 'afnan-9-pm-100ml'; -- 9 PM (antes S/ 108.0)
update perfumes set precio_tienda_regular = 109.0, precio_consolidado_fijo = 109.0, costo_importacion_pen = 109.0 where slug = 'lattafa-asad-bourbon-100ml'; -- Asad Bourbon (antes S/ 105.0)
update perfumes set precio_tienda_regular = 109.0, precio_consolidado_fijo = 109.0, costo_importacion_pen = 109.0 where slug = 'lattafa-asad-100ml'; -- Asad (antes S/ 112.0)
update perfumes set precio_tienda_regular = 125.0, precio_consolidado_fijo = 125.0, costo_importacion_pen = 125.0 where slug = 'lattafa-lattafa-vintage-100ml'; -- Lattafa Vintage (antes S/ 113.0)
update perfumes set precio_tienda_regular = 104.0, precio_consolidado_fijo = 104.0, costo_importacion_pen = 104.0 where slug = 'lattafa-fakhar-black-lattafa-100ml'; -- Fakhar Black Lattafa (antes S/ 133.0)
update perfumes set precio_tienda_regular = 144.0, precio_consolidado_fijo = 144.0, costo_importacion_pen = 144.0 where slug = 'lattafa-musaman-white-100ml'; -- Musaman White (antes S/ 169.0)
update perfumes set precio_tienda_regular = 125.0, precio_consolidado_fijo = 125.0, costo_importacion_pen = 125.0 where slug = 'lattafa-eclaire-100ml'; -- Eclaire (antes S/ 115.0)
update perfumes set precio_tienda_regular = 122.0, precio_consolidado_fijo = 122.0, costo_importacion_pen = 122.0 where slug = 'armaf-armaf-tag-red-100ml'; -- Armaf TAG RED (antes S/ 129.0)
update perfumes set precio_tienda_regular = 140.0, precio_consolidado_fijo = 140.0, costo_importacion_pen = 140.0 where slug = 'por-definir-liquid-100ml'; -- Liquid (antes S/ 148.0)
update perfumes set precio_tienda_regular = 101.0, precio_consolidado_fijo = 101.0, costo_importacion_pen = 101.0 where slug = 'lattafa-qaed-al-fursan-untamed-100ml'; -- Qaed Al Fursan Untamed (antes S/ 97.0)
update perfumes set precio_tienda_regular = 94.0, precio_consolidado_fijo = 94.0, costo_importacion_pen = 94.0 where slug = 'lattafa-q-a-fursan-100ml'; -- Q.a. Fursan (antes S/ 97.0)
update perfumes set precio_tienda_regular = 110.0, precio_consolidado_fijo = 110.0, costo_importacion_pen = 110.0 where slug = 'armaf-odyssey-limoni-100ml'; -- Odyssey Limoni (antes S/ 112.0)
update perfumes set precio_tienda_regular = 119.0, precio_consolidado_fijo = 119.0, costo_importacion_pen = 119.0 where slug = 'armaf-odyssey-white-100ml'; -- Odyssey White (antes S/ 115.0)
update perfumes set precio_tienda_regular = 112.0, precio_consolidado_fijo = 112.0, costo_importacion_pen = 112.0 where slug = 'armaf-odyssey-mega-100ml'; -- Odyssey Mega (antes S/ 116.0)
update perfumes set precio_tienda_regular = 120.0, precio_consolidado_fijo = 120.0, costo_importacion_pen = 120.0 where slug = 'por-definir-mandarin-sky-100ml'; -- Mandarin SKY (antes S/ 431.0)
update perfumes set precio_tienda_regular = 425.0, precio_consolidado_fijo = 425.0, costo_importacion_pen = 425.0 where slug = 'valentino-valentino-born-intense-100ml'; -- Valentino Born Intense (antes S/ 428.0)
update perfumes set precio_tienda_regular = 150.0, precio_consolidado_fijo = 150.0, costo_importacion_pen = 150.0 where slug = 'armaf-c-d-n-untold-100ml'; -- C.d.n.untold (antes S/ 191.0)
update perfumes set precio_tienda_regular = 185.0, precio_consolidado_fijo = 185.0, costo_importacion_pen = 185.0 where slug = 'al-haramain-amber-gold-120ml'; -- Amber Gold (antes S/ 194.0)
update perfumes set precio_tienda_regular = 145.0, precio_consolidado_fijo = 145.0, costo_importacion_pen = 145.0 where slug = 'armaf-odyssey-mandarin-sky-elixir-limited-edition-100ml'; -- Odyssey Mandarin Sky Elixir Limited Edition (antes S/ 144.0)
update perfumes set precio_tienda_regular = 120.0, precio_consolidado_fijo = 120.0, costo_importacion_pen = 120.0 where slug = 'por-definir-the-kingdom-100ml'; -- THE Kingdom (antes S/ 129.0)
update perfumes set precio_tienda_regular = 140.0, precio_consolidado_fijo = 140.0, costo_importacion_pen = 140.0 where slug = 'lattafa-rayhaan-elixir-100ml'; -- Rayhaan Elixir (antes S/ 132.0)
update perfumes set precio_tienda_regular = 125.0, precio_consolidado_fijo = 125.0, costo_importacion_pen = 125.0 where slug = 'lattafa-lattafa-mayar-cherry-100ml'; -- Lattafa Mayar Cherry (antes S/ 140.0)
update perfumes set precio_tienda_regular = 160.0, precio_consolidado_fijo = 160.0, costo_importacion_pen = 160.0 where slug = 'afnan-9pm-150ml'; -- 9PM (antes S/ 142.0)
update perfumes set precio_tienda_regular = 112.0, precio_consolidado_fijo = 112.0, costo_importacion_pen = 112.0 where slug = 'lattafa-mayar-100ml'; -- Mayar (antes S/ 116.0)
update perfumes set precio_tienda_regular = 122.0, precio_consolidado_fijo = 122.0, costo_importacion_pen = 122.0 where slug = 'lattafa-lattafa-jassor-100ml'; -- Lattafa Jassor (antes S/ 190.0)
update perfumes set precio_tienda_regular = 199.0, precio_consolidado_fijo = 199.0, costo_importacion_pen = 199.0 where slug = 'por-definir-aqua-dubai-100ml'; -- Aqua Dubai (antes S/ 276.0)
update perfumes set precio_tienda_regular = 115.0, precio_consolidado_fijo = 115.0, costo_importacion_pen = 115.0 where slug = 'lattafa-l-nebras-100ml'; -- L.nebras (antes S/ 116.0)
update perfumes set precio_tienda_regular = 128.0, precio_consolidado_fijo = 128.0, costo_importacion_pen = 128.0 where slug = 'bharara-bharara-mast-perfume-rome-pour-homme-100ml'; -- Bharara Mast Perfume Rome Pour Homme (antes S/ 120.0)
update perfumes set precio_tienda_regular = 245.0, precio_consolidado_fijo = 245.0, costo_importacion_pen = 245.0 where slug = 'lattafa-pride-game-of-spades-full-house-100ml'; -- Game OF Spades Full House (antes S/ 247.0)
update perfumes set precio_tienda_regular = 252.0, precio_consolidado_fijo = 252.0, costo_importacion_pen = 252.0 where slug = 'lattafa-pride-game-of-spades-emerald-eau-de-parfum-100ml'; -- Game Of Spades Emerald Eau De Parfum (antes S/ 249.0)
update perfumes set precio_tienda_regular = 245.0, precio_consolidado_fijo = 245.0, costo_importacion_pen = 245.0 where slug = 'lattafa-pride-game-of-spades-royale-100ml'; -- Game Of Spades Royale (antes S/ 233.0)
update perfumes set precio_tienda_regular = 255.0, precio_consolidado_fijo = 255.0, costo_importacion_pen = 255.0 where slug = 'lattafa-pride-game-of-spades-bonus-eau-de-parfum-100ml'; -- Game Of Spades Bonus Eau De Parfum (antes S/ 250.0)
update perfumes set precio_tienda_regular = 252.0, precio_consolidado_fijo = 252.0, costo_importacion_pen = 252.0 where slug = 'lattafa-pride-game-of-spades-moon-100ml'; -- Game Of Spades Moon (antes S/ 234.0)
update perfumes set precio_tienda_regular = 257.0, precio_consolidado_fijo = 257.0, costo_importacion_pen = 257.0 where slug = 'lattafa-pride-game-of-spades-jackpot-100ml'; -- Game OF Spades Jackpot (antes S/ 254.0)
update perfumes set precio_tienda_regular = 689.0, precio_consolidado_fijo = 689.0, costo_importacion_pen = 689.0 where slug = 'xerjoff-erba-pura-xerjof-eau-parfum-100ml'; -- Erba Pura Xerjof Eau Parfum (antes S/ 685.0)
update perfumes set precio_tienda_regular = 685.0, precio_consolidado_fijo = 685.0, costo_importacion_pen = 685.0 where slug = 'xerjoff-xerjof-naxos-100ml'; -- Xerjof Naxos (antes S/ 681.0)
update perfumes set precio_tienda_regular = 148.0, precio_consolidado_fijo = 148.0, costo_importacion_pen = 148.0 where slug = 'por-definir-mallow-madness-75ml'; -- Mallow Madness (antes S/ 144.0)
update perfumes set precio_tienda_regular = 148.0, precio_consolidado_fijo = 148.0, costo_importacion_pen = 148.0 where slug = 'por-definir-vanilla-freak-75ml'; -- Vanilla Freak (antes S/ 144.0)
update perfumes set precio_tienda_regular = 148.0, precio_consolidado_fijo = 148.0, costo_importacion_pen = 148.0 where slug = 'por-definir-berry-on-top-75ml'; -- Berry On Top (antes S/ 144.0)
update perfumes set precio_tienda_regular = 105.0, precio_consolidado_fijo = 105.0, costo_importacion_pen = 105.0 where slug = 'nautica-nautica-vogaye-100ml'; -- Nautica Vogaye (antes S/ 100.0)
update perfumes set precio_tienda_regular = 138.0, precio_consolidado_fijo = 138.0, costo_importacion_pen = 138.0 where slug = 'lattafa-asad-elixir-100ml'; -- Asad Elixir (antes S/ 130.0)
update perfumes set precio_tienda_regular = 147.0, precio_consolidado_fijo = 147.0, costo_importacion_pen = 147.0 where slug = 'afnan-9pm-elixir-eau-de-parfum-100ml'; -- 9PM Elixir EAU DE Parfum (antes S/ 142.0)
update perfumes set precio_tienda_regular = 147.0, precio_consolidado_fijo = 147.0, costo_importacion_pen = 147.0 where slug = 'afnan-9pm-rebel-unisex-edp-by-afnan-100ml'; -- 9PM Rebel Unisex EDP - BY Afnan (antes S/ 127.0)
update perfumes set precio_tienda_regular = 135.0, precio_consolidado_fijo = 135.0, costo_importacion_pen = 135.0 where slug = 'por-definir-agnham-100ml'; -- Agnham (antes S/ 130.0)
update perfumes set precio_tienda_regular = 140.0, precio_consolidado_fijo = 140.0, costo_importacion_pen = 140.0 where slug = 'por-definir-yumyum-100ml'; -- Yumyum (antes S/ 172.0)
update perfumes set precio_tienda_regular = 119.0, precio_consolidado_fijo = 119.0, costo_importacion_pen = 119.0 where slug = 'armaf-odyssey-homme-black-men-edp-3-40z-by-armaf-100ml'; -- Odyssey Homme Black Men EDP - (3.40z) BY Armaf (antes S/ 115.0)
update perfumes set precio_tienda_regular = 162.0, precio_consolidado_fijo = 162.0, costo_importacion_pen = 162.0 where slug = 'armaf-eter-arabian-sky-men-edp-3-40z-by-armaf-100ml'; -- Eter Arabian SKY MEN EDP - (3.40z) BY Armaf (antes S/ 156.0)
update perfumes set precio_tienda_regular = 242.0, precio_consolidado_fijo = 242.0, costo_importacion_pen = 242.0 where slug = 'lattafa-pride-game-of-spades-wildcard-100ml'; -- Game Of Spades Wildcard (antes S/ 235.0)

-- 2) Fotos nuevas (34 productos, verificadas a mano una por una)
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-khamra-clasic-100ml.png' where slug = 'lattafa-khamra-clasic-100ml'; -- Khamra Clasic
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-khamra-qawa-100ml.png' where slug = 'lattafa-khamra-qawa-100ml'; -- Khamra Qawa
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-yara-candy-100ml.png' where slug = 'lattafa-yara-candy-100ml'; -- Yara Candy
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-yara-tous-100ml.png' where slug = 'lattafa-yara-tous-100ml'; -- Yara Tous
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-honor-and-glory-100ml.png' where slug = 'por-definir-honor-and-glory-100ml'; -- Honor AND Glory
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-artisto-100ml.png' where slug = 'armaf-odyssey-artisto-100ml'; -- Odyssey Artisto
update perfumes set imagen_url = 'assets/img/perfumes/armaf-c-d-n-intense-100ml.png' where slug = 'armaf-c-d-n-intense-100ml'; -- C.D.N. Intense
update perfumes set imagen_url = 'assets/img/perfumes/armaf-c-d-n-woman-100ml.png' where slug = 'armaf-c-d-n-woman-100ml'; -- C.D.N. Woman
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-jean-low-vibe-100ml.png' where slug = 'por-definir-jean-low-vibe-100ml'; -- Jean LOW Vibe
update perfumes set imagen_url = 'assets/img/perfumes/armaf-island-bliss-by-armaf-100ml.png' where slug = 'armaf-island-bliss-by-armaf-100ml'; -- Island Bliss BY Armaf
update perfumes set imagen_url = 'assets/img/perfumes/french-avenue-azzure-oud-french-avenue-100ml.png' where slug = 'french-avenue-azzure-oud-french-avenue-100ml'; -- Azzure OUD French Avenue
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-khadjaj-island-100ml.png' where slug = 'por-definir-khadjaj-island-100ml'; -- Khadjaj Island
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-fakhar-black-lattafa-100ml.png' where slug = 'lattafa-fakhar-black-lattafa-100ml'; -- Fakhar Black Lattafa
update perfumes set imagen_url = 'assets/img/perfumes/armaf-armaf-tag-red-100ml.png' where slug = 'armaf-armaf-tag-red-100ml'; -- Armaf TAG RED
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-qaed-al-fursan-untamed-100ml.png' where slug = 'lattafa-qaed-al-fursan-untamed-100ml'; -- Qaed Al Fursan Untamed
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-q-a-fursan-100ml.png' where slug = 'lattafa-q-a-fursan-100ml'; -- Q.a. Fursan
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-the-kingdom-100ml.png' where slug = 'por-definir-the-kingdom-100ml'; -- THE Kingdom
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-rayhaan-elixir-100ml.png' where slug = 'lattafa-rayhaan-elixir-100ml'; -- Rayhaan Elixir
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-lattafa-mayar-cherry-100ml.png' where slug = 'lattafa-lattafa-mayar-cherry-100ml'; -- Lattafa Mayar Cherry
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-mayar-100ml.png' where slug = 'lattafa-mayar-100ml'; -- Mayar
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-lattafa-jassor-100ml.png' where slug = 'lattafa-lattafa-jassor-100ml'; -- Lattafa Jassor
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-l-nebras-100ml.png' where slug = 'lattafa-l-nebras-100ml'; -- L.nebras
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-emerald-eau-de-parfum-100ml.png' where slug = 'lattafa-pride-game-of-spades-emerald-eau-de-parfum-100ml'; -- Game Of Spades Emerald Eau De Parfum
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-royale-100ml.png' where slug = 'lattafa-pride-game-of-spades-royale-100ml'; -- Game Of Spades Royale
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-bonus-eau-de-parfum-100ml.png' where slug = 'lattafa-pride-game-of-spades-bonus-eau-de-parfum-100ml'; -- Game Of Spades Bonus Eau De Parfum
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-moon-100ml.png' where slug = 'lattafa-pride-game-of-spades-moon-100ml'; -- Game Of Spades Moon
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-jackpot-100ml.png' where slug = 'lattafa-pride-game-of-spades-jackpot-100ml'; -- Game OF Spades Jackpot
update perfumes set imagen_url = 'assets/img/perfumes/xerjoff-xerjof-naxos-100ml.png' where slug = 'xerjoff-xerjof-naxos-100ml'; -- Xerjof Naxos
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-mallow-madness-75ml.png' where slug = 'por-definir-mallow-madness-75ml'; -- Mallow Madness
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-vanilla-freak-75ml.png' where slug = 'por-definir-vanilla-freak-75ml'; -- Vanilla Freak
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-berry-on-top-75ml.png' where slug = 'por-definir-berry-on-top-75ml'; -- Berry On Top
update perfumes set imagen_url = 'assets/img/perfumes/nautica-nautica-vogaye-100ml.png' where slug = 'nautica-nautica-vogaye-100ml'; -- Nautica Vogaye
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-yumyum-100ml.png' where slug = 'por-definir-yumyum-100ml'; -- Yumyum
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-homme-black-men-edp-3-40z-by-armaf-100ml.png' where slug = 'armaf-odyssey-homme-black-men-edp-3-40z-by-armaf-100ml'; -- Odyssey Homme Black Men EDP - (3.40z) BY Armaf
