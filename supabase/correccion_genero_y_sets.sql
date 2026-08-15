-- ==========================================================
-- CORRECCION DE GENERO + limpieza de sets/Dumond (15 ago 2026, parte 2)
--
-- 1) GENERO: el importe automatico del Excel dejaba 'Unisex' por default
--    salvo que el nombre trajera la palabra exacta (Men/Women/Her/Homme).
--    Se reviso cada perfume por linea de producto real (ej. Yara y Eclaire
--    son la linea de mujer de Lattafa; Hawas y Nitro son la linea de hombre
--    de Rasasi; Le Male/Le Beau son de hombre en Jean Paul Gaultier; Dior
--    Sauvage es de hombre, Miss Dior de mujer; etc.) -- 92 correcciones.
--    Sigue siendo una heuristica editorial: revisa lo que no te calce.
--
-- 2) 'Nitro Red' / 'Nitro Intense' quedaron con marca Rasasi en vez de Dumond:
--    la version del script que se corrio en Supabase fue la de ANTES de la
--    correccion que hicimos juntos (marca + sin sufijo -Nml en el slug) --
--    esto la deja igual al archivo .sql que quedo en el repo.
--
-- 3) Sets / gift sets: mismo caso -- la version que corrio fue la de antes
--    de la correccion 'mililitros = 1, sin sufijo de ml en el slug'. Se
--    corrigen los de ese lote Y de paso los sets que ya existian en el
--    catalogo original (Set De Khamrah+1+1, Set Honor and Glory+1+1, etc.)
--    que tenian el mismo problema desde antes.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

-- ---------- 1) Genero ----------
update perfumes set genero = 'Hombre' where slug in ('armaf-armaf-eter-arabian-sky-100ml', 'armaf-armaf-tag-red-100ml', 'armaf-c-d-n-intense-100ml', 'armaf-cdn-intense-edp-200ml', 'armaf-cdn-urban-man-elixir-100ml', 'armaf-club-de-nuit-blue-iconic-100ml', 'azzaro-azaro-perfum-100ml', 'azzaro-azzaro-elixir-100ml', 'azzaro-azzaro-most-want-intense-100ml', 'azzaro-azzaro-perfum-100ml', 'bharara-bahara-king-100ml', 'bharara-bharara-king-1000ml', 'bharara-bharara-king-100ml', 'bharara-bharara-king-200ml', 'bharara-bharara-king-nueva-edicion-2024-100ml', 'carolina-herrera-212-vip-black-ch-tester-100ml', 'carolina-herrera-bad-boy-cobalt-elixir-edp-tester-100ml', 'dior-dior-sauvage-christian-edp-spray-100ml', 'emporio-armani-armani-emporio-stronger-with-you-absolutely-eau-de-parfum-100ml', 'emporio-armani-emporio-armani-stronger-with-you-intensely-100ml', 'emporio-armani-stronger-with-you-intensily-100ml', 'giorgio-armani-acqua-di-gio-profundo-eau-de-parfum-100ml', 'givenchy-givenchy-gentleman-reserve-privee-edp-100ml', 'jean-paul-gaultier-jean-paul-gaultier-le-beau-le-parfum-m-edp-125ml', 'jean-paul-gaultier-jean-paul-gaultier-le-male-elixir-absolu-eau-de-parfum-125ml', 'jean-paul-gaultier-le-beau-le-parfum-125mltester-125ml', 'jean-paul-gaultier-le-beau-le-parfum-tester-125ml', 'jean-paul-gaultier-le-male-elixir-125ml', 'jean-paul-gaultier-le-male-elixir-tester-125ml', 'jean-paul-gaultier-let-male-le-parfum-jean-paul-gaultier-125ml', 'jean-paul-gaultier-let-male-le-parfum-jean-paul-gaultiertester-125ml', 'lattafa-asad-100ml', 'lattafa-asad-bourbon-100ml', 'lattafa-asad-bourbon-3-pcs-giftset-100ml', 'lattafa-asad-elixir-100ml', 'lattafa-fakhar-black-lattafa-100ml', 'lattafa-fakhar-gold-lattafa-100ml', 'lattafa-lattafa-asad-gift-set-3-pcs-100ml', 'lattafa-q-a-fursan-100ml', 'lattafa-qaed-al-fursan-unlimited-color-blanco-100ml', 'lattafa-qaed-al-fursan-untamed-100ml', 'lattafa-rayhaan-aquatica-100ml', 'lattafa-rayhaan-elixir-100ml', 'lattafa-rayhaan-tropical-vibe-edp-3-4-fl-oz-100ml', 'paco-rabanne-elixir-victory-invictus-tester-100ml', 'paco-rabanne-pacco-rabanne-one-million-lucky-100ml', 'por-definir-dumont-nitro-red-for-men-100ml', 'rasasi-dumond-nitro-intense-100ml', 'rasasi-hawas-black-100ml', 'rasasi-hawas-elixir-100ml', 'rasasi-hawas-fire-100ml', 'rasasi-hawas-for-him-100ml', 'rasasi-hawas-ice-100ml', 'rasasi-hawas-kobra-100ml', 'rasasi-hawas-kobra-eau-de-parfum-100ml', 'rasasi-hawas-malibu-100ml', 'rasasi-hawas-malibu-eau-de-parfum-100ml', 'rasasi-hawas-tropical-eau-parfum-100ml', 'rasasi-nitro-elixir-100ml', 'rasasi-nitro-gold-100ml', 'rasasi-nitro-red-dumond-100ml', 'valentino-valentino-garavani-uomo-born-in-roma-extradosis-100ml', 'yves-saint-laurent-yves-saint-laurent-myslf-le-parfum-de-100ml');
update perfumes set genero = 'Mujer' where slug in ('bharara-roma-wome-bahara-100ml', 'burberry-burberry-her-tester-100ml', 'dior-tester-miss-dior-blooming-bouquet-100ml', 'dolce-gabbana-dolce-gabbana-light-blue-3-3-100ml', 'jean-paul-gaultier-jean-paul-gaultier-classique-miniatures-set-100ml', 'jean-paul-gaultier-la-belle-le-parfum-eau-de-parfum-tester-100ml', 'jean-paul-gaultier-scandal-100ml', 'jean-paul-gaultier-scandal-absolu-tester-100ml', 'lattafa-eclaire-100ml', 'lattafa-eclaire-banoff-100ml', 'lattafa-eclaire-pistache-100ml', 'lattafa-fakhar-rose-eau-de-parfu-100ml', 'lattafa-haya-eau-parfum-100ml', 'lattafa-hayaati-eau-de-parfum-100ml', 'lattafa-hayati-edp-100ml', 'lattafa-lattafa-5th-anniversary-yara-yara-candy-edp-100ml', 'lattafa-yara-candy-100ml', 'lattafa-yara-elixir-100ml', 'lattafa-yara-moi-100ml', 'lattafa-yara-rosa-100ml', 'lattafa-yara-tous-100ml', 'por-definir-berry-on-top-75ml', 'por-definir-choco-overdose-75ml', 'por-definir-cookie-crave-75ml', 'por-definir-mallow-madness-75ml', 'por-definir-vanilla-freak-75ml', 'por-definir-whipped-pleasure-75ml', 'por-definir-yumyum-100ml', 'por-definir-yumyum-island-100ml');
update perfumes set genero = 'Unisex' where slug in ('afnan-turathi-electric-afnan-for-women-and-men-100ml');

-- ---------- 2) Marca real: Dumond (no Rasasi / Por Definir) ----------
update perfumes set marca = 'Dumond', tipo_casa = 'Árabe', slug = 'dumond-nitro-red-100ml' where slug = 'rasasi-nitro-red-dumond-100ml';
update perfumes set marca = 'Dumond', tipo_casa = 'Árabe', slug = 'dumond-nitro-intense-100ml' where slug = 'rasasi-dumond-nitro-intense-100ml';
update perfumes set marca = 'Dumond', tipo_casa = 'Árabe' where slug = 'por-definir-dumont-nitro-red-for-men-100ml';

-- ---------- 3a) Sets nuevos: slug sin sufijo -Nml + mililitros = 1 ----------
update perfumes set mililitros = 1, slug = 'lattafa-my-yara-collection-4pcs-gift-set' where slug = 'lattafa-my-yara-collection-4pcs-gift-set-25ml';
update perfumes set mililitros = 1, slug = 'armaf-armaf-odyssey-deos-juego-de-6' where slug = 'armaf-armaf-odyssey-deos-juego-de-6-100ml';
update perfumes set mililitros = 1, slug = 'lattafa-pride-set-game-of-spades-x-2-pcs-full-house-and-bonus' where slug = 'lattafa-pride-set-game-of-spades-x-2-pcs-full-house-and-bonus-100ml';
update perfumes set mililitros = 1, slug = 'lattafa-pride-gift-set-game-of-spades-emerald-8-pcs' where slug = 'lattafa-pride-gift-set-game-of-spades-emerald-8-pcs-10ml';
update perfumes set mililitros = 1, slug = 'lattafa-asad-bourbon-3-pcs-giftset' where slug = 'lattafa-asad-bourbon-3-pcs-giftset-100ml';
update perfumes set mililitros = 1, slug = 'lattafa-lattafa-asad-gift-set-3-pcs' where slug = 'lattafa-lattafa-asad-gift-set-3-pcs-100ml';
update perfumes set mililitros = 1, slug = 'bharara-rome-extradose-pour-homme-5pc-set' where slug = 'bharara-rome-extradose-pour-homme-5pc-set-100ml';
update perfumes set mililitros = 1, slug = 'jean-paul-gaultier-jean-paul-gaultier-classique-miniatures-set' where slug = 'jean-paul-gaultier-jean-paul-gaultier-classique-miniatures-set-100ml';
update perfumes set mililitros = 1, slug = 'carolina-herrera-set-212-vip-rose-edp-edp-women' where slug = 'carolina-herrera-set-212-vip-rose-edp-edp-women-10ml';
update perfumes set mililitros = 1, slug = 'emper-set-discovery-edp-stallion-53-the-black-92-captcha-36-ilang-62-unisex' where slug = 'emper-set-discovery-edp-stallion-53-the-black-92-captcha-36-ilang-62-unisex-30ml';
update perfumes set mililitros = 1, slug = 'jean-paul-gaultier-set-scandal-edt-men-without-qr' where slug = 'jean-paul-gaultier-set-scandal-edt-men-without-qr-100ml';

-- ---------- 3b) Sets que ya estaban en el catalogo original: mismo problema, solo mililitros = 1 ----------
update perfumes set mililitros = 1 where slug in ('afnan-afnan-9am-dive-3pcsset-u-3-4-edp-vaporizador-5-0-s-gel-5-0-deo-100ml', 'afnan-set-9pm-pour-homme-afnan-100ml', 'lattafa-set-de-khamrah-1-1-100ml', 'lattafa-set-de-sublime-lattafa-100ml', 'lattafa-pride-al-qiam-gold-3-piece-perfume-gift-set-by-lattafa-pride-100ml', 'lattafa-pride-game-of-spades-royale-gift-set-100ml', 'lattafa-pride-giftset-art-of-universe-3pc-100ml', 'por-definir-set-honor-and-glory-1-1-100ml', 'por-definir-set-untold-1-1-100ml', 'lattafa-pride-set-game-of-spades-x-3-pcs-x-5-pcs-30ml', 'lattafa-pride-gift-set-3-pcs-game-of-spades-100ml', 'paco-rabanne-set-de-4-pacco-rabanne-100ml');
