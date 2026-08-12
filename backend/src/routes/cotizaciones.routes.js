const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM solicitudes_cotizacion WHERE dni_cliente = $1 ORDER BY fecha_solicitud DESC',
      [req.usuario.dni]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus cotizaciones' });
  }
});

router.post('/', async (req, res) => {
  const { nombre_perfume_solicitado, marca_solicitada, concentracion, mililitros, notas_cliente } = req.body;
  if (!nombre_perfume_solicitado || !marca_solicitada) {
    return res.status(400).json({ error: 'Nombre del perfume y marca son obligatorios' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO solicitudes_cotizacion (dni_cliente, nombre_perfume_solicitado, marca_solicitada, concentracion, mililitros, notas_cliente)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.usuario.dni, nombre_perfume_solicitado, marca_solicitada, concentracion || null, mililitros || null, notas_cliente || null]
    );
    res.status(201).json({ id: result.rows[0].id, mensaje: 'Solicitud enviada, te contactaremos con la cotización' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar la solicitud' });
  }
});

module.exports = router;
