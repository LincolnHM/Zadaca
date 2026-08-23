-- ==========================================================
-- Corrige 10 productos activos cuya imagen_url apunta a un archivo que NO
-- existe en assets/img/perfumes/ (se veían con el ícono genérico de caja en
-- vez de su foto real). En los 10 casos la foto correcta SÍ está subida,
-- solo que con un nombre de archivo levemente distinto al que quedó
-- guardado en la base:
--
--   - 8 son productos "Set"/pack (Armaf, Bharara, Jean Paul Gaultier,
--     Lattafa, Lattafa Pride): la foto real se subió SIN el sufijo de
--     mililitros ("-100ml", "-25ml", "-10ml") al final del nombre, pero
--     imagen_url se calculó agregándoselo igual que al resto del catálogo.
--   - 2 son de Dumond ("Nitro Intense" y "Nitro Red"): quedaron con
--     imagen_url apuntando a un archivo con prefijo "rasasi-" (marca
--     distinta) que no existe; la foto real está subida con el prefijo
--     correcto "dumond-".
--
-- Verificado contra el listado real de archivos en assets/img/perfumes/
-- antes de generar este script -- los 10 archivos de destino existen.
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

update perfumes set imagen_url = 'assets/img/perfumes/armaf-armaf-odyssey-deos-juego-de-6.png'
where id = 254; -- Armaf | Armaf Odyssey Deos - Juego de 6

update perfumes set imagen_url = 'assets/img/perfumes/bharara-rome-extradose-pour-homme-5pc-set.png'
where id = 271; -- Bharara | Rome Extradose Pour Homme 5pc Set

update perfumes set imagen_url = 'assets/img/perfumes/dumond-nitro-intense-100ml.png'
where id = 260; -- Dumond | DUMOND NITRO INTENSE (antes apuntaba a un archivo con prefijo "rasasi-" que no existe)

update perfumes set imagen_url = 'assets/img/perfumes/dumond-nitro-red-100ml.png'
where id = 258; -- Dumond | NITRO RED DUMOND (idem)

update perfumes set imagen_url = 'assets/img/perfumes/jean-paul-gaultier-jean-paul-gaultier-classique-miniatures-set.png'
where id = 272; -- Jean Paul Gaultier | Jean Paul Gaultier Classique Miniatures Set

update perfumes set imagen_url = 'assets/img/perfumes/lattafa-my-yara-collection-4pcs-gift-set.png'
where id = 231; -- Lattafa | My Yara Collection 4pcs Gift Set

update perfumes set imagen_url = 'assets/img/perfumes/lattafa-asad-bourbon-3-pcs-giftset.png'
where id = 267; -- Lattafa | Asad Bourbon 3 pcs Giftset

update perfumes set imagen_url = 'assets/img/perfumes/lattafa-lattafa-asad-gift-set-3-pcs.png'
where id = 268; -- Lattafa | LATTAFA ASAD GIFT SET 3 PCS

update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-set-game-of-spades-x-2-pcs-full-house-and-bonus.png'
where id = 262; -- Lattafa Pride | SET GAME OF SPADES X 2 PCS (FULL HOUSE AND BONUS)

update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-gift-set-game-of-spades-emerald-8-pcs.png'
where id = 263; -- Lattafa Pride | GIFT SET GAME OF SPADES EMERALD 8 PCS
