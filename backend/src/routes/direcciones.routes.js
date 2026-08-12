const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.departamento, u.provincia, u.distrito
       FROM direcciones_cliente d JOIN ubigeo u ON u.codigo_ubigeo = d.codigo_ubigeo
       WHERE d.dni_cliente = $1 ORDER BY d.predeterminada DESC, d.id DESC`,
      [req.usuario.dni]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener direcciones' });
  }
});

router.post('/', async (req, res) => {
  const { etiqueta, direccion_detalle, codigo_ubigeo, tipo_despacho, agencia_nombre, predeterminada } = req.body;
  if (!direccion_detalle || !codigo_ubigeo || !tipo_despacho) {
    return res.status(400).json({ error: 'Dirección, ubigeo y tipo de despacho son obligatorios' });
  }
  try {
    if (predeterminada) {
      await pool.query('UPDATE direcciones_cliente SET predeterminada = FALSE WHERE dni_cliente = $1', [req.usuario.dni]);
    }
    const result = await pool.query(
      `INSERT INTO direcciones_cliente (dni_cliente, etiqueta, direccion_detalle, codigo_ubigeo, tipo_despacho, agencia_nombre, predeterminada)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.usuario.dni, etiqueta || null, direccion_detalle, codigo_ubigeo, tipo_despacho, agencia_nombre || null, !!predeterminada]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la dirección' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM direcciones_cliente WHERE id = $1 AND dni_cliente = $2', [req.params.id, req.usuario.dni]);
    res.json({ mensaje: 'Dirección eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo eliminar (puede estar asociada a un pedido existente)' });
  }
});

module.exports = router;
