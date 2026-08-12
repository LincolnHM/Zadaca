const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/productos — catálogo con filtros y paginación
router.get('/', async (req, res) => {
  const { genero, marca, familia, busqueda, destacado, orden, precio_min, precio_max, pagina = 1, por_pagina = 12 } = req.query;
  const condiciones = [];
  const valores = [];

  if (genero) { valores.push(genero); condiciones.push(`p.genero = $${valores.length}`); }
  if (marca) { valores.push(marca); condiciones.push(`p.marca = $${valores.length}`); }
  if (familia) { valores.push(familia); condiciones.push(`p.familia_olfativa = $${valores.length}`); }
  if (busqueda) { valores.push(`%${busqueda}%`); condiciones.push(`(p.nombre ILIKE $${valores.length} OR p.marca ILIKE $${valores.length})`); }
  if (destacado === 'nuevo') condiciones.push('p.es_nuevo = TRUE');
  if (destacado === 'bestseller') condiciones.push('p.es_bestseller = TRUE');
  if (destacado === 'liquidacion') condiciones.push('p.es_liquidacion = TRUE');
  if (precio_min) { valores.push(Number(precio_min)); condiciones.push(`p.precio_tienda_regular >= $${valores.length}`); }
  if (precio_max) { valores.push(Number(precio_max)); condiciones.push(`p.precio_tienda_regular <= $${valores.length}`); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const ordenamientos = {
    precio_asc: 'precio_tienda_regular ASC',
    precio_desc: 'precio_tienda_regular DESC',
    nombre: 'p.nombre ASC',
    recientes: 'p.fecha_creacion DESC',
  };
  const orderBy = ordenamientos[orden] || 'p.fecha_creacion DESC';

  const limite = Math.min(Number(por_pagina) || 12, 48);
  const offset = (Math.max(Number(pagina) || 1, 1) - 1) * limite;

  try {
    const totalResult = await pool.query(`SELECT COUNT(*) FROM perfumes p ${where}`, valores);
    const total = Number(totalResult.rows[0].count);

    const dataValores = [...valores, limite, offset];
    const result = await pool.query(
      `SELECT p.id, p.slug, p.nombre, p.marca, p.genero, p.familia_olfativa, p.concentracion, p.mililitros,
              p.precio_tienda_regular, p.descuento_tienda_porcentaje, p.precio_consolidado_fijo,
              p.estado, p.es_nuevo, p.es_bestseller, p.imagen_url,
              p.es_liquidacion, p.precio_liquidacion, p.liquidacion_unidad_minima,
              GREATEST(i.stock_disponible, 0) AS stock_disponible
       FROM perfumes p
       LEFT JOIN inventario i ON i.id_producto = p.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${dataValores.length - 1} OFFSET $${dataValores.length}`,
      dataValores
    );

    res.json({ productos: result.rows, total, pagina: Number(pagina), por_pagina: limite, total_paginas: Math.ceil(total / limite) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

router.get('/filtros', async (req, res) => {
  try {
    const marcas = await pool.query('SELECT DISTINCT marca FROM perfumes ORDER BY marca');
    const familias = await pool.query('SELECT DISTINCT familia_olfativa FROM perfumes WHERE familia_olfativa IS NOT NULL ORDER BY familia_olfativa');
    res.json({
      marcas: marcas.rows.map((r) => r.marca),
      familias: familias.rows.map((r) => r.familia_olfativa),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener filtros' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, GREATEST(i.stock_disponible, 0) AS stock_disponible
       FROM perfumes p LEFT JOIN inventario i ON i.id_producto = p.id
       WHERE p.slug = $1`,
      [req.params.slug]
    );
    const producto = result.rows[0];
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const imagenes = await pool.query(
      'SELECT url, orden, es_principal FROM imagenes_perfume WHERE id_producto = $1 ORDER BY orden',
      [producto.id]
    );
    const resenas = await pool.query(
      `SELECT r.calificacion, r.comentario, r.fecha_creacion, c.nombres
       FROM resenas r JOIN clientes c ON c.dni_ce_ruc = r.dni_cliente
       WHERE r.id_producto = $1 AND r.aprobado = TRUE
       ORDER BY r.fecha_creacion DESC`,
      [producto.id]
    );
    const promedio = resenas.rows.length
      ? resenas.rows.reduce((acc, r) => acc + r.calificacion, 0) / resenas.rows.length
      : null;

    const relacionados = await pool.query(
      `SELECT slug, nombre, marca, precio_tienda_regular, descuento_tienda_porcentaje, imagen_url
       FROM perfumes WHERE marca = $1 AND id <> $2 LIMIT 4`,
      [producto.marca, producto.id]
    );

    res.json({
      producto,
      imagenes: imagenes.rows,
      resenas: resenas.rows,
      calificacion_promedio: promedio,
      relacionados: relacionados.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

module.exports = router;
