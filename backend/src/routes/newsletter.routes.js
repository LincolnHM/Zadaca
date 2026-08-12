const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { correo } = req.body;
  if (!correo || !correo.includes('@')) return res.status(400).json({ error: 'Correo inválido' });
  try {
    await pool.query(
      `INSERT INTO newsletter_suscriptores (correo) VALUES ($1)
       ON CONFLICT (correo) DO UPDATE SET activo = TRUE`,
      [correo]
    );
    res.status(201).json({ mensaje: '¡Suscripción exitosa!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al suscribirte' });
  }
});

module.exports = router;
