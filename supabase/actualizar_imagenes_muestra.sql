-- ==========================================================
-- ACTUALIZAR IMÁGENES — muestra de 13 perfumes
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de subir (git push)
-- los archivos nuevos de assets/img/perfumes/ a tu sitio publicado
-- ==========================================================
--
-- Contexto: 159 de los 217 perfumes del catálogo no tienen foto (73%). Esto
-- cubre una primera muestra de 13, en dos grupos:
--
-- GRUPO A — 7 fotos nuevas, encontradas en la página oficial de cada marca
-- (Armaf, Afnan, Carolina Herrera, Burberry, Azzaro) y descargadas a
-- assets/img/perfumes/. Antes de confiar en esto a largo plazo, revisa la
-- nota sobre licencias de imagen en el reporte de auditoría — para un
-- catálogo grande a futuro, lo más seguro sigue siendo pedirle las fotos
-- oficiales a tu proveedor mayorista.
--
-- GRUPO B — 6 fotos que YA ESTABAN en assets/img/perfumes/ desde el traspaso
-- original de fotos (licencia ya resuelta, cero riesgo nuevo) pero nunca se
-- habían asignado porque el nombre del producto en la base tiene un typo o
-- una redacción distinta a la del archivo (ej. "9pm Nigh Out" vs
-- "9PM_Night_Out.png"). Vale la pena que alguien revise el resto de la
-- carpeta con este mismo criterio — puede haber más casos así.

-- ---------- GRUPO A: fotos nuevas ----------
update perfumes set imagen_url = 'assets/img/perfumes/Armaf_Club_De_Nuit_Blue_Iconic.jpg' where slug = 'armaf-club-de-nuit-blue-iconic-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Armaf_Odyssey_Homme_Black.jpg' where slug = 'armaf-odyssey-homme-black-men-edp-3-40z-by-armaf-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Afnan_Turathi_Blue.png' where slug = 'afnan-turathi-blue-afnan-for-men-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Carolina_Herrera_212_VIP_Black.jpg' where slug = 'carolina-herrera-212-vip-black-ch-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Burberry_Her.jpg' where slug = 'burberry-burberry-her-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Azzaro_Most_Wanted_Intense.png' where slug = 'azzaro-azzaro-most-want-intense-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Armaf_Club_De_Nuit_Untold.png' where slug = 'armaf-c-d-n-untold-100ml';

-- ---------- GRUPO B: fotos que ya tenías, solo bloqueadas por el nombre ----------
update perfumes set imagen_url = 'assets/img/perfumes/9PM_Night_Out.png' where slug = 'afnan-9pm-nigh-out-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Acqua_di_gio_profondo.webp' where slug = 'giorgio-armani-acqua-di-gio-profundo-eau-de-parfum-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Invictus_Victory_Elixir.png' where slug = 'paco-rabanne-elixir-victory-invictus-tester-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Odyssey_Mango-removebg-preview.png' where slug = 'armaf-armaf-odyssey-go-mango-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/Valentino_Uomo_Born_in_Roma.png' where slug = 'valentino-valentino-garavani-uomo-born-in-roma-extradosis-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/valentino_intense.png' where slug = 'valentino-valentino-born-intense-100ml';
update perfumes set imagen_url = 'assets/img/perfumes/enteros/set_de_9pm.png' where slug = 'afnan-set-9pm-pour-homme-afnan-100ml';

-- ---------- Pendiente de tu decisión (NO se tocó) ----------
-- assets/img/perfumes/Club_de_Nuit_Intense.png parece ser de la línea "Club de
-- Nuit Intense" de Armaf, pero hay dos productos candidatos casi duplicados
-- en tu catálogo (probablemente el mismo perfume en dos presentaciones):
--   id 24 | armaf-c-d-n-intense-100ml          | Armaf - C.D.N. Intense (100ml)
--   id 27 | armaf-cdn-intense-edp-200ml         | Armaf - CDN Intense EDP (200ml)
-- Prefiero que confirmes cuál de los dos es el de la foto (o si son
-- presentaciones del mismo bottle y aplica a ambos) antes de asignarla.
