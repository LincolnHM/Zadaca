-- ==========================================================
-- ACTUALIZAR IMÁGENES — lote 2 (19 perfumes), fuente: fotos del proveedor
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de subir (git push) los
-- archivos nuevos de assets/img/perfumes/ a tu sitio publicado.
-- ==========================================================
--
-- Contexto: al momento de este lote, 111 de 217 perfumes (51%) no tenían
-- foto. Antes de tocar la base de datos, se probó un emparejamiento
-- automático por nombre — se descartó por poco confiable (ej. casi asigna
-- la foto de "Dior Homme Intense" a "Armaf CDN Intense" solo porque ambos
-- comparten la palabra "Intense").
--
-- La fuente real de este lote es mejor: "CONSOLIDADO VIP _ZADACA (1).xlsx"
-- (el Excel de tu proveedor, en la raíz del proyecto) trae 111 fotos
-- incrustadas junto al nombre de cada perfume — son las mismas fotos que
-- usa tu proveedor para vendértelos a ti, así que no hay riesgo de
-- derechos de autor ni de mostrar el bottle equivocado de otra marca.
--
-- Aun así, varias filas del Excel tenían la foto desalineada de su
-- etiqueta (ej. la fila rotulada "Angham" en realidad traía la foto de
-- "Eclaire Banoffi", y la fila "Azzaro Perfum" traía "The Most Wanted").
-- Por eso este lote NO es automático: cada una de las 19 fotos de abajo
-- se revisó a ojo (bottle, marca y texto de la caja) antes de incluirla.
-- Con esa foto ya vista y confirmada, no hace falta volver a mirarla antes
-- de correr este script — lo único pendiente es que subas (git push) los
-- archivos nuevos de assets/img/perfumes/ antes de ejecutarlo, para que
-- las URLs no queden rotas.
--
-- Con esto quedan 92 de 217 sin foto — el resto de nombres del catálogo
-- son demasiado genéricos o ambiguos ("Por Definir", sets/gift sets,
-- variantes muy parecidas entre sí) para adivinar con confianza cuál
-- foto exacta les corresponde. Necesitan que tú o tu proveedor confirmen
-- cuál es cuál, o que subas la foto desde el panel admin.

-- ---------- Coincidencias exactas: mismo nombre de producto en Excel y catálogo ----------
update perfumes set imagen_url = 'assets/img/perfumes/bharara-mast-perfume-rome-pour-homme.png' where slug = 'bharara-bharara-mast-perfume-rome-pour-homme-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-badee-al-oud-noble-blush-100ml.png' where slug = 'por-definir-lattafa-bade-e-al-oud-noble-blush-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/bharara-king-100ml.jpg' where slug = 'bharara-bahara-king-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/erba-pura-xerjoff-tester-100ml.png' where slug = 'xerjoff-erab-pura-xerjof-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-vintage-radio-100ml.jpg' where slug = 'lattafa-lattafa-vintage-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-yum-yum-100ml.jpg' where slug = 'por-definir-yumyum-island-100ml';

-- ---------- Al Haramain "Amber Oud Gold Edition" — 3 filas del catálogo son el mismo perfume ----------
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-amber-oud-gold-edition-100ml.jpg' where slug = 'al-haramain-al-haramain-gold-edition-200ml';
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-amber-oud-gold-edition-100ml.jpg' where slug = 'al-haramain-amber-gold-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-amber-oud-gold-edition-100ml.jpg' where slug = 'al-haramain-amber-gold-120ml';

-- ---------- Armaf Club de Nuit — variantes ----------
-- "Club_de_Nuit_Intense.png" ya estaba en la carpeta (sin usar) y resuelve
-- la duda que había quedado pendiente en actualizar_imagenes_muestra.sql:
-- el otro candidato (armaf-c-d-n-intense-100ml, id 24) ya tiene su propia
-- foto distinta, así que esta es inequívocamente para la de 200ml.
update perfumes set imagen_url = 'assets/img/perfumes/Club_de_Nuit_Intense.png' where slug = 'armaf-cdn-intense-edp-200ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-club-de-nuit-urban-man-elixir-100ml.png' where slug = 'armaf-cdn-urban-man-elixir-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-club-de-nuit-woman-100ml.jpg' where slug = 'armaf-club-de-nuit-maleka-women-edp-100ml';

-- ---------- Jean Paul Gaultier "Le Male Le Parfum" — la foto ya estaba en la carpeta sin usar ----------
update perfumes set imagen_url = 'assets/img/perfumes/Le_Male_Le_Parfum.png' where slug = 'jean-paul-gaultier-let-male-le-parfum-jean-paul-gaultier-125ml';
update perfumes set imagen_url = 'assets/img/perfumes/Le_Male_Le_Parfum.png' where slug = 'jean-paul-gaultier-let-male-le-parfum-jean-paul-gaultiertester-125ml';

-- ---------- Versace Eros EDP — la foto ya estaba en la carpeta sin usar ----------
update perfumes set imagen_url = 'assets/img/perfumes/eros-versace-100ml.webp' where slug = 'versace-versace-eros-edp-200ml';
update perfumes set imagen_url = 'assets/img/perfumes/eros-versace-100ml.webp' where slug = 'versace-versace-eros-eau-de-parfum-for-men-edp-100ml';

-- ---------- Afnan 9PM Tester ----------
update perfumes set imagen_url = 'assets/img/perfumes/afnan-9pm-tester-150ml.jpg' where slug = 'afnan-9pm-tester-100ml';

-- ---------- Casos con nota — revisa el nombre además de la foto ----------
-- El Excel trae esta foto como "Al Haramain Amber Oud Aqua Edition" (la caja
-- dice exactamente eso), pero en tu catálogo el producto quedó con marca
-- "Por Definir" y nombre "Aqua Dubai" (probablemente un apodo interno).
-- La foto es la correcta; si quieres, corrige también marca/nombre desde
-- el panel admin para que diga "Al Haramain — Amber Oud Aqua Edition".
update perfumes set imagen_url = 'assets/img/perfumes/al-haramain-amber-oud-aqua-edition-100ml.jpg' where slug = 'por-definir-aqua-dubai-100ml';

-- Esta foto es de un solo frasco "Game of Spades Royale" — tu producto es
-- el "Gift Set" (varias piezas). Es el mejor material disponible del mismo
-- perfume, pero no muestra el set completo; considera pedirle a tu
-- proveedor una foto del set si la vas a promocionar como regalo.
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-of-spades-royale-giftset-100ml.png' where slug = 'lattafa-pride-game-of-spades-royale-gift-set-100ml';

-- ---------- Revisadas y descartadas (NO se tocaron) ----------
-- Estas filas del Excel parecían buenas coincidencias por nombre, pero al
-- abrir la foto no correspondían al bottle esperado — quedan documentadas
-- para que nadie las vuelva a intentar por error:
--   "Azzaro Perfum 100ML"  -> la foto real era "Azzaro The Most Wanted" (marca correcta, perfume distinto)
--   "Angham Lattafa"       -> la foto real era "Lattafa Eclaire Banoffi"
--   "Musaman White 100ML"  -> la foto no coincidía con el estilo esperado de Lattafa Musaman
-- Y varios nombres del catálogo son demasiado parecidos entre sí para
-- adivinar (ej. Armaf Odyssey Intense vs Spectra vs Mandarin Sky Vintage;
-- Lattafa Fakhar Gold vs Platinum; Game Of Spades Diamond/High Roller/
-- Emerald/Platinum — cada uno es un bottle de color distinto en la misma
-- línea) — mejor pedirle la foto puntual a tu proveedor que arriesgar.
