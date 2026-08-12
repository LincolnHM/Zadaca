const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.cantidad, p.slug, p.nombre, p.marca, p.genero, p.mililitros, p.imagen_url,
              p.precio_tienda_regular, p.descuento_tienda_porcentaje,
              p.es_liquidacion, p.liquidacion_unidad_minima,
              CASE WHEN p.es_liquidacion THEN p.precio_liquidacion
                   ELSE ROUND(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2) END AS precio_final,
              GREATEST(i.stock_disponible, 0) AS stock_disponible
       FROM carrito_items ci
       JOIN perfumes p ON p.id = ci.id_producto
       LEFT JOIN inventario i ON i.id_producto = p.id
       WHERE ci.dni_cliente = $1
       ORDER BY ci.fecha_agregado DESC`,
      [req.usuario.dni]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

router.post('/', async (req, res) => {
  const { id_producto, cantidad = 1 } = req.body;
  if (!id_producto || cantidad < 1) return res.status(400).json({ error: 'Producto y cantidad son obligatorios' });
  try {
    const producto = await pool.query(
      'SELECT es_liquidacion, liquidacion_unidad_minima FROM perfumes WHERE id = $1',
      [id_producto]
    );
    if (!producto.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    const { es_liquidacion, liquidacion_unidad_minima } = producto.rows[0];
    if (es_liquidacion && cantidad < liquidacion_unidad_minima) {
      return res.status(400).json({ error: `Este producto de liquidación requiere un mínimo de ${liquidacion_unidad_minima} unidades` });
    }

    await pool.query(
      `INSERT INTO carrito_items (dni_cliente, id_producto, cantidad)
       VALUES ($1, $2, $3)
       ON CONFLICT (dni_cliente, id_producto) DO UPDATE SET cantidad = carrito_items.cantidad + EXCLUDED.cantidad`,
      [req.usuario.dni, id_producto, cantidad]
    );
    res.status(201).json({ mensaje: 'Producto agregado al carrito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
});

router.put('/:id', async (req, res) => {
  const { cantidad } = req.body;
  if (!cantidad || cantidad < 1) return res.status(400).json({ error: 'Cantidad inválida' });
  try {
    const item = await pool.query(
      `SELECT p.es_liquidacion, p.liquidacion_unidad_minima
       FROM carrito_items ci JOIN perfumes p ON p.id = ci.id_producto
       WHERE ci.id = $1 AND ci.dni_cliente = $2`,
      [req.params.id, req.usuario.dni]
    );
    if (!item.rows[0]) return res.status(404).json({ error: 'Ítem no encontrado en tu carrito' });
    const { es_liquidacion, liquidacion_unidad_minima } = item.rows[0];
    if (es_liquidacion && cantidad < liquidacion_unidad_minima) {
      return res.status(400).json({ error: `Este producto de liquidación requiere un mínimo de ${liquidacion_unidad_minima} unidades` });
    }

    const result = await pool.query(
      'UPDATE carrito_items SET cantidad = $1 WHERE id = $2 AND dni_cliente = $3 RETURNING id',
      [cantidad, req.params.id, req.usuario.dni]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ítem no encontrado en tu carrito' });
    res.json({ mensaje: 'Cantidad actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el carrito' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM carrito_items WHERE id = $1 AND dni_cliente = $2', [req.params.id, req.usuario.dni]);
    res.json({ mensaje: 'Ítem eliminado del carrito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar del carrito' });
  }
});

module.exports = router;
