const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, codigo_campana, fecha_apertura, fecha_cierre_programada, fecha_cierre_real,
              minimo_unidades, total_unidades_acumuladas, estado,
              LEAST(ROUND(100.0 * total_unidades_acumuladas / minimo_unidades), 100) AS porcentaje_avance
       FROM consolidados
       ORDER BY (estado = 'Abierto') DESC, fecha_apertura DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener consolidados' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const consolidado = await pool.query(
      `SELECT id, codigo_campana, fecha_apertura, fecha_cierre_programada, fecha_cierre_real,
              minimo_unidades, total_unidades_acumuladas, estado,
              LEAST(ROUND(100.0 * total_unidades_acumuladas / minimo_unidades), 100) AS porcentaje_avance
       FROM consolidados WHERE id = $1`,
      [req.params.id]
    );
    if (!consolidado.rows[0]) return res.status(404).json({ error: 'Consolidado no encontrado' });

    const historial = await pool.query(
      `SELECT estado, descripcion_publica, fecha_evento FROM historial_estados_consolidado
       WHERE id_consolidado = $1 ORDER BY fecha_evento ASC`,
      [req.params.id]
    );

    const productos = await pool.query(
      `SELECT p.slug, p.nombre, p.marca, p.imagen_url, dc.precio_consolidado_aplicado,
              SUM(dc.cantidad) AS unidades_reservadas
       FROM detalle_consolidado dc JOIN perfumes p ON p.id = dc.id_producto
       WHERE dc.id_consolidado = $1 AND dc.estado_item <> 'Cancelado'
       GROUP BY p.slug, p.nombre, p.marca, p.imagen_url, dc.precio_consolidado_aplicado
       ORDER BY unidades_reservadas DESC`,
      [req.params.id]
    );

    res.json({ ...consolidado.rows[0], historial: historial.rows, productos: productos.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el consolidado' });
  }
});

router.post('/:id/reservar', requireAuth, async (req, res) => {
  const { id_producto, cantidad } = req.body;
  if (!id_producto || !cantidad || cantidad < 1) {
    return res.status(400).json({ error: 'Debes indicar producto y cantidad válida' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const consolidado = await client.query('SELECT estado FROM consolidados WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!consolidado.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Consolidado no encontrado' });
    }
    if (consolidado.rows[0].estado !== 'Abierto') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este consolidado ya no admite reservas' });
    }

    const producto = await client.query('SELECT precio_consolidado_fijo, estado FROM perfumes WHERE id = $1', [id_producto]);
    if (!producto.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await client.query(
      `INSERT INTO detalle_consolidado (id_consolidado, dni_cliente, id_producto, cantidad, precio_consolidado_aplicado)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, req.usuario.dni, id_producto, cantidad, producto.rows[0].precio_consolidado_fijo]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Reserva registrada con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la reserva' });
  } finally {
    client.release();
  }
});

router.get('/mias/reservas', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dc.id, dc.cantidad, dc.precio_consolidado_aplicado, dc.estado_item, dc.fecha_reserva,
              c.codigo_campana, c.estado AS estado_consolidado,
              p.slug, p.nombre, p.marca, p.imagen_url
       FROM detalle_consolidado dc
       JOIN consolidados c ON c.id = dc.id_consolidado
       JOIN perfumes p ON p.id = dc.id_producto
       WHERE dc.dni_cliente = $1
       ORDER BY dc.fecha_reserva DESC`,
      [req.usuario.dni]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus reservas' });
  }
});

module.exports = router;
