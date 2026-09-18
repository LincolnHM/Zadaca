-- ==========================================================
-- IMÁGENES PARA LOS 79 PERFUMES SIN FOTO (catálogo PDF, sep 2026)
--
-- Estos 79 productos (filas nuevas del catálogo PDF de septiembre, ids
-- 436-532 en su mayoría) se quedaron sin imagen_url. Para la mayoría se
-- reutiliza una foto que YA estaba subida en assets/img/perfumes/ (misma
-- fragancia, solo que nunca se había hecho el update para este id nuevo
-- -- confirmado revisando otros scripts de supabase/ que ya usan esa
-- misma imagen para el mismo producto). Para el resto (26 fotos) no había
-- ninguna foto local que correspondiera: se buscó una foto real (bottle
-- shot) en internet, se validó con curl (HTTP 200 + content-type image/*,
-- dos veces, la segunda con el Referer de madisonzadaca.com por si algún
-- sitio bloqueaba hotlink), y RECIÉN AHÍ se descargó a
-- assets/img/perfumes/ -- este script apunta a esas 26 rutas locales, no
-- a las URLs externas, para no depender de que Fragrantica/las tiendas de
-- terceros sigan sirviendo esa imagen en el mismo link para siempre. De
-- paso, 4 de esas descargas (Bharara Pharaoh Ramesses/Ramesses II, Rome
-- Paradox y Lattafa Rayhaan Wolf) traían el ancho pedido al CDN de Shopify
-- clavado en ~2000-3200px (3.6-5.9MB cada una) -- se les bajó el parámetro
-- "width" a 800 antes de descargarlas, mismo archivo pero ~1MB.
--
-- Cuando un perfume tiene frasco + decant (2 filas), se actualiza el
-- mismo id de ambas con la misma foto, porque el decant es una fracción
-- de la misma botella.
--
-- Ver supabase/fotos_web_pendientes.md para la lista de los que NO se
-- pudieron identificar o no tenían foto validable (quedan pendientes de
-- subir manualmente).
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- ---------- Reutilizando fotos que ya estaban en assets/img/perfumes/ ----------

-- Afnan 9AM Dive
update perfumes set imagen_url = 'assets/img/perfumes/9AM_Dive.png' where id = 463;

-- Al Haramain Haramain Aqua Dubai (= "Amber Oud Aqua Edition", confirmado en
-- actualizar_imagenes_lote2_excel_proveedor.sql para el mismo producto)
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-amber-oud-aqua-edition-100ml.jpg' where id = 512;
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-amber-oud-aqua-edition-100ml.jpg' where id = 449;

-- Armaf Club De Nuit Intense Man
update perfumes set imagen_url = 'assets/img/perfumes/Club_de_Nuit_Intense.png' where id = 470;

-- Armaf Club De Nuit Urban Man Elixir
update perfumes set imagen_url = 'assets/img/perfumes/armaf-club-de-nuit-urban-man-elixir-100ml.png' where id = 469;

-- Armaf Odyssey Artisto
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-artisto-100ml.png' where id = 468;

-- Armaf Odyssey Coffee Toffee (= "Armaf Odyssey Toffee" en el catálogo)
update perfumes set imagen_url = 'assets/img/perfumes/armaf-armaf-odyssey-toffee-100ml.png' where id = 467;

-- Armaf Odyssey Limoni
update perfumes set imagen_url = 'assets/img/perfumes/Odyssey_Limoni.png' where id = 466;

-- Armaf Odyssey Spectra
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-spectra-unisex-edp-de-armaf-100ml.jpg' where id = 464;

-- Bharara Rome Extradose
update perfumes set imagen_url = 'assets/img/perfumes/bharara-rome-extradose-by-bharara-100ml.png' where id = 516;

-- Bharara Rome Imagine
update perfumes set imagen_url = 'assets/img/perfumes/bharara-rome-imagine.png' where id = 451;

-- Dolce & Gabbana Light Blue (clásico, mujer)
update perfumes set imagen_url = 'assets/img/perfumes/dolce-gabbana-dolce-gabbana-light-blue-3-3-100ml.jpg' where id = 531;

-- King Of Kings Nebula (= "Nebula Extreme Parfum by King Of Kings")
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-nebula-extreme-parfum-edp-by-king-of-kings-100ml.png' where id = 517;

-- Lattafa Pride Art Of Universe (= "Arte Del Universo")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-arte-del-universo-unisex-edp-de-lattafa-pride-100ml.png' where id = 507;

-- Lattafa Pride Game Of Spades Wildcard
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-wildcard-100ml.png' where id = 523;

-- Lattafa Pride Pisa
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-pride-pisa-100ml.png' where id = 508;

-- Lattafa Amethyst (= "Badee Al Oud Amethyst")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-bade-amethyst-lattafa-100ml.png' where id = 497;

-- Lattafa Asad Elixir
update perfumes set imagen_url = 'assets/img/perfumes/Asad_Elixir.png' where id = 495;

-- Lattafa Eclaire Pistacho
update perfumes set imagen_url = 'assets/img/perfumes/Eclaire_Pistache.png' where id = 500;

-- Lattafa Fakhar Rose
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-fakhar-rose-eau-de-parfu-100ml.png' where id = 501;

-- Lattafa Haya
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-haya-eau-parfum-100ml.png' where id = 502;

-- Lattafa Hayaati
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-hayaati-eau-de-parfum-100ml.png' where id = 504;

-- Lattafa Khamrah
update perfumes set imagen_url = 'assets/img/perfumes/Khamrah.png' where id = 490;

-- Lattafa Khamrah Dukhan
update perfumes set imagen_url = 'assets/img/perfumes/Khamrah_Dukhan.png' where id = 491;

-- Lattafa Khamrah Waha
update perfumes set imagen_url = 'assets/img/perfumes/Khamrah_Waha.png' where id = 492;

-- Lattafa Nebras (= "L. Nebras")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-l-nebras-100ml.png' where id = 506;

-- Lattafa Nebras Elixir
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-nebras-elixir-100ml.png' where id = 505;

-- Lattafa Noble Blush (= "Badee Al Oud Noble Blush")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-badee-al-oud-noble-blush-100ml.png' where id = 496;

-- Lattafa Oud For Glory (= "Badee Al Oud Oud For Glory")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-badee-al-oud-oud-for-glory-edp-100mi-100ml.png' where id = 498;

-- Lattafa Qaed Al Fursan (versión base, distinta de "Unlimited" y "Untamed")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-q-a-fursan-100ml.png' where id = 473;

-- Lattafa Qaed Untamed (= "Qaed Al Fursan Untamed")
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-qaed-al-fursan-untamed-100ml.png' where id = 475;

-- Lattafa Rayhaan Aquatica
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-rayhaan-aquatica-100ml.png' where id = 519;

-- Lattafa Rayhaan Tropical Vibe
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-rayhaan-tropical-vibe-edp-3-4-fl-oz-100ml.png' where id = 520;

-- Lattafa The Kingdom
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-the-kingdom-100ml.png' where id = 499;

-- Lattafa Yara Elixir
update perfumes set imagen_url = 'assets/img/perfumes/Yara_Elixir.png' where id = 493;

-- Lattafa Yara Moi
update perfumes set imagen_url = 'assets/img/perfumes/Yara_Moi.png' where id = 494;

-- Lattafa Yara Pink
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-yara-pink.jpg' where id = 445;

-- Rasasi Hawas (base) (= "Hawas For Him" en el catálogo)
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-for-him-100ml.png' where id = 477;

-- Rasasi Hawas Black
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-black-100ml.jpg' where id = 481;

-- Rasasi Hawas Chrome
update perfumes set imagen_url = 'assets/img/perfumes/Hawas_Chrome.png' where id = 487;
update perfumes set imagen_url = 'assets/img/perfumes/Hawas_Chrome.png' where id = 442;

-- Rasasi Hawas Diva
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-rasasi-hawas-diva-edp-for-women-100ml.jpg' where id = 482;

-- Rasasi Hawas Kobra
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-kobra-100ml.png' where id = 479;

-- Rasasi Hawas Malibu
update perfumes set imagen_url = 'assets/img/perfumes/Hawas_Malibu.png' where id = 478;

-- Rasasi Hawas Tropical
update perfumes set imagen_url = 'assets/img/perfumes/Hawas_Tropical.png' where id = 480;

-- Rasasi Hawas Verde
update perfumes set imagen_url = 'assets/img/perfumes/Hawas_Verde.webp' where id = 440;
update perfumes set imagen_url = 'assets/img/perfumes/Hawas_Verde.webp' where id = 485;

-- Rasasi His Confession
update perfumes set imagen_url = 'assets/img/perfumes/His_Confession.png' where id = 522;

-- Yves Saint Laurent Y Eau De Parfum
update perfumes set imagen_url = 'assets/img/perfumes/Y_EDP.png' where id = 529;
update perfumes set imagen_url = 'assets/img/perfumes/Y_EDP.png' where id = 460;

-- ---------- Fotos que no había en local: buscadas, validadas y descargadas ----------
-- No había ninguna foto local que correspondiera a estos productos. Se buscaron en
-- internet, se validaron con curl (dos veces, ver nota de arriba) y se descargaron a
-- assets/img/perfumes/ -- estas filas ya apuntan a la ruta local, no a la URL original.

-- Al Haramain Amber Oud (versión original 2018, no Gold/Aqua/Black Edition) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-haramain-amber-oud-decant.jpg' where id = 511;

-- Armaf Club De Nuit Iconic Extrait De Parfum (2026, coincide con la concentración
-- "Extrait de Parfum" del catálogo; distinto de "Club De Nuit Blue Iconic") — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/armaf-club-de-nuit-iconic-decant.jpg' where id = 472;

-- Armaf Club De Nuit Maleka (2025, mujer) — foto oficial armaf.com
update perfumes set imagen_url = 'assets/img/perfumes/armaf-club-de-nuit-maleka-decant.jpg' where id = 471;

-- Armaf Dunascape Dubai (= "Dunescape", 2025) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/armaf-dunascape-dubai.jpg' where id = 447;
update perfumes set imagen_url = 'assets/img/perfumes/armaf-dunascape-dubai.jpg' where id = 509;

-- Bharara Pharaoh Ramesses (= "Ramesses I") — foto oficial bhararabeauty.com. El ancho de la
-- URL se bajó de 1946 a 800px: el original pesaba 5.9MB (el CDN de Shopify solo achica
-- dimensiones, no recomprime la calidad), un solo producto así de pesado se nota en el tiempo
-- de carga del catálogo -- a 800px queda ~1.2MB, bastante más razonable.
update perfumes set imagen_url = 'assets/img/perfumes/bharara-pharaoh-ramesses-decant.png' where id = 513;

-- Bharara Pharaoh Ramesses II — foto oficial bhararabeauty.com (mismo ajuste de ancho)
update perfumes set imagen_url = 'assets/img/perfumes/bharara-pharaoh-ramesses-ii-decant.png' where id = 514;
update perfumes set imagen_url = 'assets/img/perfumes/bharara-pharaoh-ramesses-ii-decant.png' where id = 450;

-- Bharara Rome Paradox — foto oficial bhararabeauty.com (mismo ajuste de ancho)
update perfumes set imagen_url = 'assets/img/perfumes/bharara-rome-paradox-decant.png' where id = 515;
update perfumes set imagen_url = 'assets/img/perfumes/bharara-rome-paradox-decant.png' where id = 452;

-- Carolina Herrera Set 212 Vip Rose Edp + Edp Women (set 2 piezas) — perfumebox.com
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-set-212-vip-rose-edp-edp-women.jpg' where id = 291;

-- Dolce & Gabbana Light Blue Pour Homme — foto oficial dolcegabbana.com
update perfumes set imagen_url = 'assets/img/perfumes/dolce-gabbana-light-blue-pour-homme-decant.jpg' where id = 532;
update perfumes set imagen_url = 'assets/img/perfumes/dolce-gabbana-light-blue-pour-homme-decant.jpg' where id = 462;

-- Emper Set Discovery Edp Stallion 53 + The Black 92 + Captcha 36 + Ilang 62 (set 4 piezas) — redbagstore.com
update perfumes set imagen_url = 'assets/img/perfumes/emper-set-discovery-edp-stallion-53-the-black-92-captcha-36-ilang-62-unisex.jpg' where id = 293;

-- Jean Paul Gaultier Le Male (clásico, botella torso azul, sin "Elixir"/"Le Parfum") — foto oficial jeanpaulgaultier.com
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-decant.png' where id = 528;
update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-le-male-decant.png' where id = 459;

-- Lattafa Pride Game Of Spades Double Bonus (línea "Game Of Spades", fabricada por Jo Milano
-- Paris y vendida en este mercado como "Lattafa Pride") — labelleperfumes.com
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-double-bonus.jpg' where id = 456;
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-double-bonus.jpg' where id = 525;

-- Lattafa Hayaati Florence — theperfumespot.com
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-hayaati-florence.jpg' where id = 446;
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-hayaati-florence.jpg' where id = 503;

-- Lattafa Qaed Ultimati (= "Qaed Al Fursan Unlimited", 2022) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-qaed-ultimati.jpg' where id = 437;
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-qaed-ultimati.jpg' where id = 474;

-- Lattafa Rayhaan Wolf (2026) — beautyhouse.com (ancho bajado de 3200 a 800: pesaba 5.8MB)
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-rayhaan-wolf.png' where id = 454;
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-rayhaan-wolf.png' where id = 521;

-- Maison Zadaca Frasco Probador de Vidrio 1ml (los 4 tamaños de pack comparten la misma
-- foto genérica del frasquito, igual que otros productos multi-tamaño del catálogo) — decantsdeperfumes.com (Perú)
update perfumes set imagen_url = 'assets/img/perfumes/maison-zadaca-frasco-probador-1ml-pack-x100.jpg' where id = 383;
update perfumes set imagen_url = 'assets/img/perfumes/maison-zadaca-frasco-probador-1ml-pack-x100.jpg' where id = 384;
update perfumes set imagen_url = 'assets/img/perfumes/maison-zadaca-frasco-probador-1ml-pack-x100.jpg' where id = 381;
update perfumes set imagen_url = 'assets/img/perfumes/maison-zadaca-frasco-probador-1ml-pack-x100.jpg' where id = 382;

-- Por Definir Tubbes Candy Apple (la marca real es "Tubbees", no "Por Definir") — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/por-definir-tubbes-candy-apple-decant.jpg' where id = 476;

-- Rasasi Hawas Lava Gold (2026) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-lava-gold.jpg' where id = 439;
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-lava-gold.jpg' where id = 484;

-- Rasasi Hawas London (2026) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-london.jpg' where id = 441;
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-london.jpg' where id = 486;

-- Rasasi Hawas Pink (2025, mujer) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-pink.jpg' where id = 443;
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-pink.jpg' where id = 488;

-- Rasasi Hawas Sapphire (2026) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-sapphire.jpg' where id = 438;
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-sapphire.jpg' where id = 483;

-- Rasasi Hawas Viper (2025) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-viper-decant.jpg' where id = 489;
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-viper-decant.jpg' where id = 444;

-- Rasasi Nitro White (la marca real es "Dumont"/"Dumond", no Rasasi -- mismo caso que
-- los otros "Nitro" del catálogo que ya están correctamente bajo Dumond) — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-nitro-white.jpg' where id = 448;
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-nitro-white.jpg' where id = 510;

-- Valentino Born In Roma (mujer, "Donna Born In Roma") — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/valentino-born-in-roma.jpg' where id = 458;
update perfumes set imagen_url = 'assets/img/perfumes/valentino-born-in-roma.jpg' where id = 527;

-- Valentino Uomo Born In Roma (versión base EDT, distinta de "Extradosis"/"Intense") — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/valentino-uomo-born-in-roma.jpg' where id = 457;

-- Yves Saint Laurent Y Le Parfum (2021, botella azul noche, distinta de "Y EDP") — Fragrantica
update perfumes set imagen_url = 'assets/img/perfumes/yves-saint-laurent-y-le-parfum-decant.jpg' where id = 530;
update perfumes set imagen_url = 'assets/img/perfumes/yves-saint-laurent-y-le-parfum-decant.jpg' where id = 461;
