const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/pedidos — checkout: convierte el carrito del cliente en un pedido Directo_Tienda
router.post('/', async (req, res) => {
  const { id_direccion_entrega } = req.body;
  if (!id_direccion_entrega) return res.status(400).json({ error: 'Debes indicar una dirección de entrega' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const direccion = await client.query(
      'SELECT id FROM direcciones_cliente WHERE id = $1 AND dni_cliente = $2',
      [id_direccion_entrega, req.usuario.dni]
    );
    if (!direccion.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }

    const items = await client.query(
      `SELECT ci.id_producto, ci.cantidad,
              CASE WHEN p.es_liquidacion THEN p.precio_liquidacion
                   ELSE ROUND(p.precio_tienda_regular * (1 - p.descuento_tienda_porcentaje / 100.0), 2) END AS precio_final,
              GREATEST(i.stock_disponible, 0) AS stock_disponible, p.nombre
       FROM carrito_items ci
       JOIN perfumes p ON p.id = ci.id_producto
       LEFT JOIN inventario i ON i.id_producto = p.id
       WHERE ci.dni_cliente = $1
       FOR UPDATE OF p`,
      [req.usuario.dni]
    );

    if (items.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tu carrito está vacío' });
    }

    for (const item of items.rows) {
      if (item.cantidad > item.stock_disponible) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Stock insuficiente para "${item.nombre}" (disponible: ${item.stock_disponible})` });
      }
    }

    const montoTotal = items.rows.reduce((acc, item) => acc + item.cantidad * Number(item.precio_final), 0);

    const pedido = await client.query(
      `INSERT INTO pedidos (dni_cliente, tipo_pedido, id_direccion_entrega, monto_total, monto_saldo_pendiente)
       VALUES ($1, 'Directo_Tienda', $2, $3, $3) RETURNING id`,
      [req.usuario.dni, id_direccion_entrega, montoTotal.toFixed(2)]
    );
    const idPedido = pedido.rows[0].id;

    for (const item of items.rows) {
      await client.query(
        `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_aplicado)
         VALUES ($1, $2, $3, $4)`,
        [idPedido, item.id_producto, item.cantidad, item.precio_final]
      );
      await client.query('UPDATE inventario SET stock_fisico = stock_fisico - $1 WHERE id_producto = $2', [
        item.cantidad,
        item.id_producto,
      ]);
    }

    await client.query('DELETE FROM carrito_items WHERE dni_cliente = $1', [req.usuario.dni]);
    await client.query(
      `INSERT INTO envios (id_pedido, estado_envio) VALUES ($1, 'Preparando')`,
      [idPedido]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Pedido creado con éxito', id_pedido: idPedido, monto_total: montoTotal.toFixed(2) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.tipo_pedido, p.monto_total, p.estado_pago, p.fecha_creacion,
              e.estado_envio, e.numero_guia_seguimiento
       FROM pedidos p LEFT JOIN envios e ON e.id_pedido = p.id
       WHERE p.dni_cliente = $1
       ORDER BY p.fecha_creacion DESC`,
      [req.usuario.dni]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus pedidos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pedido = await pool.query(
      `SELECT p.*, e.estado_envio, e.numero_guia_seguimiento, e.empresa_transporte,
              d.direccion_detalle, d.etiqueta
       FROM pedidos p
       LEFT JOIN envios e ON e.id_pedido = p.id
       LEFT JOIN direcciones_cliente d ON d.id = p.id_direccion_entrega
       WHERE p.id = $1 AND p.dni_cliente = $2`,
      [req.params.id, req.usuario.dni]
    );
    if (!pedido.rows[0]) return res.status(404).json({ error: 'Pedido no encontrado' });

    const items = await pool.query(
      `SELECT dp.cantidad, dp.precio_unitario_aplicado, dp.subtotal, p.nombre, p.marca, p.imagen_url, p.slug
       FROM detalle_pedido dp JOIN perfumes p ON p.id = dp.id_producto
       WHERE dp.id_pedido = $1`,
      [req.params.id]
    );
    const pagos = await pool.query(
      'SELECT monto, tipo_pago, metodo_pago, estado_pago, fecha_pago FROM pagos WHERE id_pedido = $1 ORDER BY fecha_pago',
      [req.params.id]
    );

    res.json({ ...pedido.rows[0], items: items.rows, pagos: pagos.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
});

module.exports = router;
