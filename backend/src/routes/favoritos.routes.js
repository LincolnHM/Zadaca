const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.slug, p.nombre, p.marca, p.imagen_url, p.precio_tienda_regular, p.descuento_tienda_porcentaje
       FROM favoritos f JOIN perfumes p ON p.id = f.id_producto
       WHERE f.dni_cliente = $1 ORDER BY f.fecha_agregado DESC`,
      [req.usuario.dni]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.post('/', async (req, res) => {
  const { id_producto } = req.body;
  if (!id_producto) return res.status(400).json({ error: 'Falta el producto' });
  try {
    await pool.query(
      `INSERT INTO favoritos (dni_cliente, id_producto) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.usuario.dni, id_producto]
    );
    res.status(201).json({ mensaje: 'Agregado a favoritos' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar a favoritos' });
  }
});

router.delete('/:id_producto', async (req, res) => {
  try {
    await pool.query('DELETE FROM favoritos WHERE dni_cliente = $1 AND id_producto = $2', [req.usuario.dni, req.params.id_producto]);
    res.json({ mensaje: 'Eliminado de favoritos' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar de favoritos' });
  }
});

module.exports = router;
