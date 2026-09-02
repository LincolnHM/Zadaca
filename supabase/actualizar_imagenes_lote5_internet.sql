-- ==========================================================
-- ACTUALIZAR IMÁGENES — lote 5 (4 perfumes), fuente: internet
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de subir (git push) los
-- archivos nuevos de assets/img/perfumes/ a tu sitio publicado.
-- ==========================================================
--
-- Contexto: quedaban 7 productos visibles sin foto que los lotes 3 y 4 no
-- habían tocado (varios eran nuevos en el catálogo). Mismo criterio de
-- siempre: verificar marca + nombre + edición contra una fuente confiable
-- (sitio oficial de la marca o un retailer con foto propia, no genérica)
-- antes de guardar cada imagen; si no se puede verificar con confianza, se
-- descarta en vez de arriesgar la foto equivocada.
--
-- Los decants (Rome Imagine, Yara Pink, Asad Black) usan la misma foto del
-- frasco completo en sus dos tamaños (5ml/10ml) -- es el mismo perfume
-- fraccionado, mismo criterio que perfumes normales con varias tallas.

-- ---------- Bharara ----------
update perfumes set imagen_url = 'assets/img/perfumes/bharara-rome-imagine.png' where slug in ('bharara-rome-imagine-decant-5ml', 'bharara-rome-imagine-decant-10ml');

-- ---------- Carolina Herrera ----------
update perfumes set imagen_url = 'assets/img/perfumes/carolina-herrera-212-vip-black-ny-rodeo-edp-men-100ml.jpg' where slug = 'carolina-herrera-212-vip-black-ny-rodeo-edp-men-100ml';

-- ---------- Lattafa ----------
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-yara-pink.jpg' where slug in ('lattafa-yara-pink-decant-5ml', 'lattafa-yara-pink-decant-10ml');
update perfumes set imagen_url = 'assets/img/perfumes/lattafa-asad-black.png' where slug in ('lattafa-asad-black-decant-5ml', 'lattafa-asad-black-decant-10ml');

-- ---------- Revisadas y descartadas (NO se tocaron) ----------
-- Se buscó una foto para cada una de estas 4 filas y no se encontró una coincidencia
-- verificable con confianza -- mismo criterio que los lotes 3 y 4:
--   carolina-herrera-set-212-vip-rose-edp-edp-women                            -> es un set (2 piezas), sin foto del set completo
--   emper-set-discovery-edp-stallion-53-the-black-92-captcha-36-ilang-62-unisex -> set de 4 miniaturas, sin foto del set completo
--   jean-paul-gaultier-set-scandal-edt-men-without-qr                          -> es un set, sin foto del set completo
--   por-definir-noble-bush-decant-5ml / -10ml                                  -> marca real sin identificar ("Por Definir"); "Noble Bush" no coincide con ningún perfume confirmado, alto riesgo de mostrar el frasco equivocado
-- Mejor pedirle la foto puntual a tu proveedor (o subirla desde el panel admin,
-- Productos → Editar → Imagen) que arriesgar una foto que muestre el set o el
-- frasco equivocado.
