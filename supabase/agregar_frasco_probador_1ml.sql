-- ==========================================================
-- AGREGAR: Frasco Probador de Vidrio 1ml (accesorio para decantar) — 4
-- presentaciones por cantidad (Pack x5, x50, x100, x1000), a pedido del dueño.
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ==========================================================
--
-- Contexto: es un frasco/probador VACÍO de vidrio (con varita aplicadora,
-- sin spray) para decantar perfume propio -- no es una fragancia, así que
-- NO se cargó con es_decant=true (esa bandera es solo para fracciones de
-- un perfume real, agrupadas con selector de tamaño en la ficha de
-- producto y listadas en decants/ -- ver id_decant_grupo en schema.sql).
-- En cambio, cada cantidad de "por mayor" es su propia fila normal de
-- catálogo (mismo patrón que un gift-set de varias piezas), porque el
-- precio no baja de forma lineal por unidad (5u=S/4, 50u=S/25, 100u=S/40,
-- 1000u=S/350 -- ni el catálogo ni "Liquidaciones" tienen un mecanismo de
-- precio escalonado por volumen para un solo producto).
--
-- Marca: se cargó como 'Maison Zadaca' (accesorio de la casa, no es de
-- ninguna casa de perfumería) -- corrígelo desde el panel admin si prefieres
-- otro nombre. tipo_casa se dejó sin definir a propósito (no aplica el
-- filtro Árabe/Diseñador/Nicho a un accesorio).
--
-- Imagen: NO se cargó ninguna -- se buscó una foto de referencia genérica
-- pero no se pudo verificar un link estable, y el color/tapa exactos
-- pueden variar según tu proveedor real. Sube la foto real desde el panel
-- admin (Productos -> Editar -> Imagen) para no mostrar un frasco distinto
-- al que realmente vendes.
--
-- Stock: se cargó un placeholder de 20 unidades por presentación (no hay
-- dato real de inventario). AJUSTA el stock real desde el panel admin:
-- Productos -> busca "Frasco Probador" -> editar "Stock físico" -> Guardar.

-- ---------- Pack x5 (S/4.00) ----------
with fila as (
  insert into perfumes (slug, nombre, marca, genero, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, estado, es_nuevo, activo)
  values (
    'maison-zadaca-frasco-probador-1ml-pack-x5',
    'Frasco Probador de Vidrio 1ml — Pack x5',
    'Maison Zadaca', 'Unisex', 1,
    'Precios por unidad y por mayor. Presentación: Pack de 5 unidades. Probador de vidrio para perfumes, ideal para decantar tus propios perfumes. No tiene spray, es con aplicador (varita). Volumen 1ml por frasco. Tapa de plástico. Color: negro y transparente. Envíos a todo el Perú. Perfumes originales — Decants Premium.',
    4.00, 4.00, true, 'Disponible', true, true
  )
  returning id
)
update inventario set stock_fisico = 20 from fila where inventario.id_producto = fila.id;

-- ---------- Pack x50 (S/25.00) ----------
with fila as (
  insert into perfumes (slug, nombre, marca, genero, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, estado, es_nuevo, activo)
  values (
    'maison-zadaca-frasco-probador-1ml-pack-x50',
    'Frasco Probador de Vidrio 1ml — Pack x50',
    'Maison Zadaca', 'Unisex', 1,
    'Precios por unidad y por mayor. Presentación: Pack de 50 unidades. Probador de vidrio para perfumes, ideal para decantar tus propios perfumes. No tiene spray, es con aplicador (varita). Volumen 1ml por frasco. Tapa de plástico. Color: negro y transparente. Envíos a todo el Perú. Perfumes originales — Decants Premium.',
    25.00, 25.00, true, 'Disponible', true, true
  )
  returning id
)
update inventario set stock_fisico = 20 from fila where inventario.id_producto = fila.id;

-- ---------- Pack x100 (S/40.00) ----------
with fila as (
  insert into perfumes (slug, nombre, marca, genero, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, estado, es_nuevo, activo)
  values (
    'maison-zadaca-frasco-probador-1ml-pack-x100',
    'Frasco Probador de Vidrio 1ml — Pack x100',
    'Maison Zadaca', 'Unisex', 1,
    'Precios por unidad y por mayor. Presentación: Pack de 100 unidades. Probador de vidrio para perfumes, ideal para decantar tus propios perfumes. No tiene spray, es con aplicador (varita). Volumen 1ml por frasco. Tapa de plástico. Color: negro y transparente. Envíos a todo el Perú. Perfumes originales — Decants Premium.',
    40.00, 40.00, true, 'Disponible', true, true
  )
  returning id
)
update inventario set stock_fisico = 20 from fila where inventario.id_producto = fila.id;

-- ---------- Pack x1000 (S/350.00) ----------
with fila as (
  insert into perfumes (slug, nombre, marca, genero, mililitros, descripcion, precio_tienda_regular, precio_consolidado_fijo, margen_aplicado, estado, es_nuevo, activo)
  values (
    'maison-zadaca-frasco-probador-1ml-pack-x1000',
    'Frasco Probador de Vidrio 1ml — Pack x1000',
    'Maison Zadaca', 'Unisex', 1,
    'Precios por unidad y por mayor. Presentación: Pack de 1000 unidades. Probador de vidrio para perfumes, ideal para decantar tus propios perfumes. No tiene spray, es con aplicador (varita). Volumen 1ml por frasco. Tapa de plástico. Color: negro y transparente. Envíos a todo el Perú. Perfumes originales — Decants Premium.',
    350.00, 350.00, true, 'Disponible', true, true
  )
  returning id
)
update inventario set stock_fisico = 20 from fila where inventario.id_producto = fila.id;
