const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/destacadas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.calificacion, r.comentario, r.fecha_creacion, c.nombres, p.nombre AS producto
       FROM resenas r
       JOIN clientes c ON c.dni_ce_ruc = r.dni_cliente
       LEFT JOIN perfumes p ON p.id = r.id_producto
       WHERE r.aprobado = TRUE
       ORDER BY r.fecha_creacion DESC
       LIMIT 6`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { id_producto, calificacion, comentario } = req.body;
  if (!calificacion || calificacion < 1 || calificacion > 5) {
    return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
  }
  try {
    await pool.query(
      `INSERT INTO resenas (dni_cliente, id_producto, calificacion, comentario) VALUES ($1, $2, $3, $4)`,
      [req.usuario.dni, id_producto || null, calificacion, comentario || null]
    );
    res.status(201).json({ mensaje: 'Gracias por tu reseña, será publicada tras revisión' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar la reseña' });
  }
});

module.exports = router;
