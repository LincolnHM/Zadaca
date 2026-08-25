-- ==========================================================
-- IMÁGENES PARA LOS 44 DECANTS (Chiclayo, 25 ago 2026)
--
-- Les asigna la misma foto que ya usa el perfume en botella completa (de
-- las 393 fotos que ya tienes en assets/img/perfumes/) -- un decant es el
-- mismo perfume fraccionado, así que reutiliza la imagen real en vez de
-- una genérica. Actualiza las 2 filas (5ml y 10ml) de una sola vez por
-- nombre, ya que ambos tamaños comparten el mismo "nombre".
--
-- 4 de los 22 no tienen foto real en la carpeta (no encontré ningún
-- archivo que corresponda) y quedan SIN imagen_url -- se verán con el
-- ícono genérico hasta que subas una foto y se la asignes desde el panel
-- admin (Productos -> Editar -> "Imagen (ruta o URL)"):
--   - Yara Pink
--   - Noble Bush
--   - Rome Imagine
--   - Asad Black
--
-- Ejecutar en el SQL Editor de Supabase.
-- ==========================================================

update perfumes set imagen_url = 'assets/img/perfumes/lattafa-eclaire-100ml.jpg' where es_decant = true and nombre = 'Eclaire';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-yara-tous-100ml.png' where es_decant = true and nombre = 'Yara Tous';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-yara-candy-100ml.png' where es_decant = true and nombre = 'Yara Candy';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-badee-honor-glory-100ml.jpg' where es_decant = true and nombre = 'Honor y Glory';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-sublime-100ml.jpg' where es_decant = true and nombre = 'Sublime';
update perfumes set imagen_url = 'assets/img/perfumes/afnan-9pm-150ml.jpg' where es_decant = true and nombre = '9PM Clásico';
update perfumes set imagen_url = 'assets/img/perfumes/afnan-9pm-elixir-eau-de-parfum-100ml.png' where es_decant = true and nombre = '9PM Elixir';
update perfumes set imagen_url = 'assets/img/perfumes/afnan-9pm-nigh-out-100ml.png' where es_decant = true and nombre = '9PM Night Out';
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-ice-100ml.png' where es_decant = true and nombre = 'Hawas Ice';
update perfumes set imagen_url = 'assets/img/perfumes/rasasi-hawas-elixir-100ml.png' where es_decant = true and nombre = 'Hawas Elixir';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-khamra-qawa-100ml.png' where es_decant = true and nombre = 'Khamra Qahwa';
update perfumes set imagen_url = 'assets/img/perfumes/bharara-bharara-mast-perfume-rome-pour-homme-100ml.png' where es_decant = true and nombre = 'Rome Pour Homme EDP';
update perfumes set imagen_url = 'assets/img/perfumes/bharara-bharara-king-100ml.jpg' where es_decant = true and nombre = 'Bharara King';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-asad-bourbon-100ml.jpg' where es_decant = true and nombre = 'Asad Bourbon';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-mandarin-sky-elixir-limited-edition-100ml.png' where es_decant = true and nombre = 'Mandarin Sky Elixir';
update perfumes set imagen_url = 'assets/img/perfumes/Odyssey_Aqua.png' where es_decant = true and nombre = 'Odyssey Aqua';
update perfumes set imagen_url = 'assets/img/perfumes/armaf-odyssey-mandarin-sky-200ml.jpg' where es_decant = true and nombre = 'Mandarin Sky';
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-pride-game-spades-no-limit-100ml.png' where es_decant = true and nombre = 'Game Of Spades No Limit';
