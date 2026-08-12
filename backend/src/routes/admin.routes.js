const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const ESTADOS_CONSOLIDADO = [
  'Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito',
  'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado',
];
const ESTADOS_ENVIO = ['Preparando', 'En_Agencia', 'En_Ruta', 'Entregado', 'Devuelto'];
const ESTADOS_COTIZACION = ['Pendiente', 'Cotizado', 'Aceptado', 'Rechazado', 'Convertido_A_Producto'];

function slugify(texto) {
  return texto
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function slugUnico(client, base) {
  let slug = base;
  let sufijo = 1;
  while (true) {
    const existe = await client.query('SELECT 1 FROM perfumes WHERE slug = $1', [slug]);
    if (existe.rows.length === 0) return slug;
    sufijo += 1;
    slug = `${base}-${sufijo}`;
  }
}

/* ==================== DASHBOARD ==================== */

router.get('/dashboard', async (req, res) => {
  try {
    const [pedidosMes, pedidosPendientes, consolidadosAbiertos, resenasPendientes, cotizacionesPendientes, stockBajo, ultimosPedidos, totalClientes] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto_total), 0) AS ingresos FROM pedidos WHERE fecha_creacion >= date_trunc('month', CURRENT_DATE)`),
        pool.query(`SELECT COUNT(*) AS cantidad FROM pedidos WHERE estado_pago IN ('Pendiente', 'Parcial')`),
        pool.query(`SELECT id, codigo_campana, minimo_unidades, total_unidades_acumuladas, fecha_cierre_programada,
                            LEAST(ROUND(100.0 * total_unidades_acumuladas / minimo_unidades), 100) AS porcentaje_avance
                     FROM consolidados WHERE estado = 'Abierto' ORDER BY fecha_apertura DESC`),
        pool.query(`SELECT COUNT(*) AS cantidad FROM resenas WHERE aprobado = FALSE`),
        pool.query(`SELECT COUNT(*) AS cantidad FROM solicitudes_cotizacion WHERE estado = 'Pendiente'`),
        pool.query(`SELECT p.id, p.nombre, p.marca, i.stock_disponible, i.stock_minimo_alerta
                     FROM perfumes p JOIN inventario i ON i.id_producto = p.id
                     WHERE i.stock_disponible <= i.stock_minimo_alerta
                     ORDER BY i.stock_disponible ASC LIMIT 8`),
        pool.query(`SELECT p.id, p.tipo_pedido, p.monto_total, p.estado_pago, p.fecha_creacion, c.nombres, c.apellidos
                     FROM pedidos p JOIN clientes c ON c.dni_ce_ruc = p.dni_cliente
                     ORDER BY p.fecha_creacion DESC LIMIT 5`),
        pool.query(`SELECT COUNT(*) AS cantidad FROM clientes c JOIN roles r ON r.id = c.id_rol WHERE r.nombre = 'Cliente'`),
      ]);

    res.json({
      pedidos_mes: { cantidad: Number(pedidosMes.rows[0].cantidad), ingresos: Number(pedidosMes.rows[0].ingresos) },
      pedidos_pendientes_pago: Number(pedidosPendientes.rows[0].cantidad),
      consolidados_abiertos: consolidadosAbiertos.rows,
      resenas_pendientes: Number(resenasPendientes.rows[0].cantidad),
      cotizaciones_pendientes: Number(cotizacionesPendientes.rows[0].cantidad),
      stock_bajo: stockBajo.rows,
      ultimos_pedidos: ultimosPedidos.rows,
      total_clientes: Number(totalClientes.rows[0].cantidad),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el resumen del panel' });
  }
});

/* ==================== PRODUCTOS ==================== */

router.get('/productos', async (req, res) => {
  const { busqueda } = req.query;
  const condiciones = [];
  const valores = [];
  if (busqueda) {
    valores.push(`%${busqueda}%`);
    condiciones.push(`(p.nombre ILIKE $${valores.length} OR p.marca ILIKE $${valores.length})`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  try {
    const result = await pool.query(
      `SELECT p.id, p.slug, p.nombre, p.marca, p.genero, p.familia_olfativa, p.concentracion, p.mililitros,
              p.descripcion, p.notas_olfativas, p.precio_tienda_regular, p.descuento_tienda_porcentaje,
              p.precio_consolidado_fijo, p.estado, p.es_nuevo, p.es_bestseller, p.imagen_url, p.fecha_creacion,
              p.es_liquidacion, p.precio_liquidacion, p.liquidacion_unidad_minima,
              i.stock_fisico, i.stock_reservado_consolidados, i.stock_disponible, i.stock_minimo_alerta
       FROM perfumes p LEFT JOIN inventario i ON i.id_producto = p.id
       ${where}
       ORDER BY p.fecha_creacion DESC
       LIMIT 500`,
      valores
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

router.post('/productos', async (req, res) => {
  const {
    nombre, marca, genero, familia_olfativa, concentracion, mililitros,
    descripcion, notas_olfativas, precio_tienda_regular, descuento_tienda_porcentaje,
    precio_consolidado_fijo, estado, es_nuevo, es_bestseller, imagen_url,
    stock_fisico, stock_minimo_alerta,
    es_liquidacion, precio_liquidacion, liquidacion_unidad_minima,
  } = req.body;

  if (!nombre || !marca || !mililitros || !precio_tienda_regular || !precio_consolidado_fijo) {
    return res.status(400).json({ error: 'Nombre, marca, mililitros, precio de tienda y precio consolidado son obligatorios' });
  }
  if (es_liquidacion && !precio_liquidacion) {
    return res.status(400).json({ error: 'Si el producto es de liquidación, el precio de liquidación es obligatorio' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slugBase = slugify(`${nombre}-${marca}-${concentracion || ''}-${mililitros}ml`);
    const slug = await slugUnico(client, slugBase);

    const result = await client.query(
      `INSERT INTO perfumes (slug, nombre, marca, genero, familia_olfativa, concentracion, mililitros, descripcion,
                              notas_olfativas, precio_tienda_regular, descuento_tienda_porcentaje, precio_consolidado_fijo,
                              estado, es_nuevo, es_bestseller, imagen_url,
                              es_liquidacion, precio_liquidacion, liquidacion_unidad_minima)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [slug, nombre, marca, genero || 'Unisex', familia_olfativa || null, concentracion || null, mililitros,
        descripcion || null, notas_olfativas || null, precio_tienda_regular, descuento_tienda_porcentaje || 0,
        precio_consolidado_fijo, estado || 'Disponible', !!es_nuevo, !!es_bestseller, imagen_url || null,
        !!es_liquidacion, precio_liquidacion || null, liquidacion_unidad_minima || 1]
    );
    const idProducto = result.rows[0].id;

    await client.query(
      `UPDATE inventario SET stock_fisico = $1, stock_minimo_alerta = $2 WHERE id_producto = $3`,
      [Number(stock_fisico) || 0, stock_minimo_alerta != null ? Number(stock_minimo_alerta) : 5, idProducto]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: idProducto, slug, mensaje: 'Producto creado con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un producto con ese mismo nombre, marca, concentración y mililitraje' });
    if (err.code === '23514') return res.status(400).json({ error: 'Datos inválidos: revisa los precios y el mililitraje (el precio consolidado no puede ser mayor al de tienda)' });
    res.status(500).json({ error: 'Error al crear el producto' });
  } finally {
    client.release();
  }
});

router.put('/productos/:id', async (req, res) => {
  const campos = [
    'nombre', 'marca', 'genero', 'familia_olfativa', 'concentracion', 'mililitros', 'descripcion',
    'notas_olfativas', 'precio_tienda_regular', 'descuento_tienda_porcentaje', 'precio_consolidado_fijo',
    'estado', 'es_nuevo', 'es_bestseller', 'imagen_url',
    'es_liquidacion', 'precio_liquidacion', 'liquidacion_unidad_minima',
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existe = await client.query('SELECT id FROM perfumes WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!existe.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const sets = [];
    const valores = [];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        valores.push(req.body[campo]);
        sets.push(`${campo} = $${valores.length}`);
      }
    });
    if (sets.length) {
      valores.push(req.params.id);
      await client.query(`UPDATE perfumes SET ${sets.join(', ')} WHERE id = $${valores.length}`, valores);
    }

    if (req.body.stock_fisico !== undefined || req.body.stock_minimo_alerta !== undefined) {
      const invSets = [];
      const invValores = [];
      if (req.body.stock_fisico !== undefined) { invValores.push(Number(req.body.stock_fisico)); invSets.push(`stock_fisico = $${invValores.length}`); }
      if (req.body.stock_minimo_alerta !== undefined) { invValores.push(Number(req.body.stock_minimo_alerta)); invSets.push(`stock_minimo_alerta = $${invValores.length}`); }
      invValores.push(req.params.id);
      await client.query(`UPDATE inventario SET ${invSets.join(', ')} WHERE id_producto = $${invValores.length}`, invValores);
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Producto actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23514') return res.status(400).json({ error: 'Datos inválidos: revisa los precios y el mililitraje' });
    res.status(500).json({ error: 'Error al actualizar el producto' });
  } finally {
    client.release();
  }
});

router.delete('/productos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM perfumes WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'No se puede eliminar: tiene pedidos, reservas o reseñas asociadas. Márcalo como Agotado en su lugar.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

/* ==================== PEDIDOS ==================== */

router.get('/pedidos', async (req, res) => {
  const { estado_pago, tipo_pedido } = req.query;
  const condiciones = [];
  const valores = [];
  if (estado_pago) { valores.push(estado_pago); condiciones.push(`p.estado_pago = $${valores.length}`); }
  if (tipo_pedido) { valores.push(tipo_pedido); condiciones.push(`p.tipo_pedido = $${valores.length}`); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  try {
    const result = await pool.query(
      `SELECT p.id, p.tipo_pedido, p.monto_total, p.monto_adelanto_pagado, p.monto_saldo_pendiente, p.estado_pago, p.fecha_creacion,
              c.nombres, c.apellidos, c.correo, e.estado_envio, e.numero_guia_seguimiento
       FROM pedidos p
       JOIN clientes c ON c.dni_ce_ruc = p.dni_cliente
       LEFT JOIN envios e ON e.id_pedido = p.id
       ${where}
       ORDER BY p.fecha_creacion DESC
       LIMIT 300`,
      valores
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
});

router.get('/pedidos/:id', async (req, res) => {
  try {
    const pedido = await pool.query(
      `SELECT p.*, c.nombres, c.apellidos, c.correo, c.telefono,
              e.estado_envio, e.numero_guia_seguimiento, e.empresa_transporte,
              d.direccion_detalle, d.etiqueta
       FROM pedidos p
       JOIN clientes c ON c.dni_ce_ruc = p.dni_cliente
       LEFT JOIN envios e ON e.id_pedido = p.id
       LEFT JOIN direcciones_cliente d ON d.id = p.id_direccion_entrega
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!pedido.rows[0]) return res.status(404).json({ error: 'Pedido no encontrado' });

    const items = await pool.query(
      `SELECT dp.cantidad, dp.precio_unitario_aplicado, dp.subtotal, per.nombre, per.marca
       FROM detalle_pedido dp JOIN perfumes per ON per.id = dp.id_producto
       WHERE dp.id_pedido = $1`,
      [req.params.id]
    );
    const pagos = await pool.query(
      'SELECT id, monto, tipo_pago, metodo_pago, estado_pago, comprobante_url, fecha_pago FROM pagos WHERE id_pedido = $1 ORDER BY fecha_pago',
      [req.params.id]
    );

    res.json({ ...pedido.rows[0], items: items.rows, pagos: pagos.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
});

router.put('/pedidos/:id/pago', async (req, res) => {
  const { monto, tipo_pago, metodo_pago, estado_pago } = req.body;
  if (!monto || Number(monto) <= 0) return res.status(400).json({ error: 'El monto del pago debe ser mayor a 0' });
  if (!metodo_pago) return res.status(400).json({ error: 'Selecciona un método de pago' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pedido = await client.query('SELECT monto_total, monto_adelanto_pagado FROM pedidos WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!pedido.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    await client.query(
      `INSERT INTO pagos (id_pedido, monto, tipo_pago, metodo_pago, estado_pago) VALUES ($1,$2,$3,$4,'Aprobado')`,
      [req.params.id, monto, tipo_pago || 'Abono_Parcial', metodo_pago]
    );

    const nuevoAbonado = Number(pedido.rows[0].monto_adelanto_pagado) + Number(monto);
    const total = Number(pedido.rows[0].monto_total);
    const saldo = Math.max(total - nuevoAbonado, 0);
    const nuevoEstado = estado_pago || (nuevoAbonado >= total ? 'Completado' : nuevoAbonado > 0 ? 'Parcial' : 'Pendiente');

    await client.query(
      `UPDATE pedidos SET monto_adelanto_pagado = $1, monto_saldo_pendiente = $2, estado_pago = $3 WHERE id = $4`,
      [nuevoAbonado.toFixed(2), saldo.toFixed(2), nuevoEstado, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Pago registrado', estado_pago: nuevoEstado });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el pago' });
  } finally {
    client.release();
  }
});

router.put('/pedidos/:id/envio', async (req, res) => {
  const { estado_envio, numero_guia_seguimiento, empresa_transporte } = req.body;
  if (estado_envio && !ESTADOS_ENVIO.includes(estado_envio)) {
    return res.status(400).json({ error: 'Estado de envío inválido' });
  }
  try {
    const existente = await pool.query('SELECT id FROM envios WHERE id_pedido = $1', [req.params.id]);
    if (existente.rows[0]) {
      await pool.query(
        `UPDATE envios SET estado_envio = COALESCE($1, estado_envio),
                            numero_guia_seguimiento = COALESCE($2, numero_guia_seguimiento),
                            empresa_transporte = COALESCE($3, empresa_transporte),
                            fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id_pedido = $4`,
        [estado_envio || null, numero_guia_seguimiento || null, empresa_transporte || null, req.params.id]
      );
    } else {
      const pedido = await pool.query('SELECT id FROM pedidos WHERE id = $1', [req.params.id]);
      if (!pedido.rows[0]) return res.status(404).json({ error: 'Pedido no encontrado' });
      await pool.query(
        `INSERT INTO envios (id_pedido, estado_envio, numero_guia_seguimiento, empresa_transporte) VALUES ($1,$2,$3,$4)`,
        [req.params.id, estado_envio || 'Preparando', numero_guia_seguimiento || null, empresa_transporte || null]
      );
    }
    res.json({ mensaje: 'Envío actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el envío' });
  }
});

/* ==================== CONSOLIDADOS ==================== */

router.get('/consolidados', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, codigo_campana, fecha_apertura, fecha_cierre_programada, fecha_cierre_real,
              minimo_unidades, total_unidades_acumuladas, estado, notas_admin,
              LEAST(ROUND(100.0 * total_unidades_acumuladas / minimo_unidades), 100) AS porcentaje_avance
       FROM consolidados ORDER BY fecha_apertura DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener consolidados' });
  }
});

router.post('/consolidados', async (req, res) => {
  const { codigo_campana, fecha_apertura, fecha_cierre_programada, minimo_unidades, notas_admin } = req.body;
  if (!codigo_campana || !fecha_apertura || !fecha_cierre_programada) {
    return res.status(400).json({ error: 'Código de campaña, fecha de apertura y fecha de cierre son obligatorios' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO consolidados (codigo_campana, fecha_apertura, fecha_cierre_programada, minimo_unidades, notas_admin)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [codigo_campana, fecha_apertura, fecha_cierre_programada, minimo_unidades || 4, notas_admin || null]
    );
    res.status(201).json({ id: result.rows[0].id, mensaje: 'Consolidado creado' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un consolidado con ese código de campaña' });
    if (err.code === '23514') return res.status(400).json({ error: 'El mínimo de unidades debe ser al menos 4' });
    res.status(500).json({ error: 'Error al crear el consolidado' });
  }
});

router.get('/consolidados/:id', async (req, res) => {
  try {
    const consolidado = await pool.query(
      `SELECT id, codigo_campana, fecha_apertura, fecha_cierre_programada, fecha_cierre_real,
              minimo_unidades, total_unidades_acumuladas, estado, notas_admin,
              LEAST(ROUND(100.0 * total_unidades_acumuladas / minimo_unidades), 100) AS porcentaje_avance
       FROM consolidados WHERE id = $1`,
      [req.params.id]
    );
    if (!consolidado.rows[0]) return res.status(404).json({ error: 'Consolidado no encontrado' });

    const reservas = await pool.query(
      `SELECT dc.id, dc.cantidad, dc.precio_consolidado_aplicado, dc.estado_item, dc.fecha_reserva,
              c.dni_ce_ruc, c.nombres, c.apellidos, c.correo,
              p.nombre AS producto, p.marca
       FROM detalle_consolidado dc
       JOIN clientes c ON c.dni_ce_ruc = dc.dni_cliente
       JOIN perfumes p ON p.id = dc.id_producto
       WHERE dc.id_consolidado = $1
       ORDER BY dc.fecha_reserva DESC`,
      [req.params.id]
    );

    const historial = await pool.query(
      `SELECT estado, descripcion_publica, fecha_evento FROM historial_estados_consolidado
       WHERE id_consolidado = $1 ORDER BY fecha_evento ASC`,
      [req.params.id]
    );

    res.json({ ...consolidado.rows[0], reservas: reservas.rows, historial: historial.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el consolidado' });
  }
});

router.put('/consolidados/:id', async (req, res) => {
  const { fecha_apertura, fecha_cierre_programada, minimo_unidades, notas_admin, estado, descripcion_publica } = req.body;
  if (estado && !ESTADOS_CONSOLIDADO.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const actual = await client.query('SELECT estado FROM consolidados WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!actual.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Consolidado no encontrado' });
    }

    const sets = [];
    const valores = [];
    if (fecha_apertura !== undefined) { valores.push(fecha_apertura); sets.push(`fecha_apertura = $${valores.length}`); }
    if (fecha_cierre_programada !== undefined) { valores.push(fecha_cierre_programada); sets.push(`fecha_cierre_programada = $${valores.length}`); }
    if (minimo_unidades !== undefined) { valores.push(minimo_unidades); sets.push(`minimo_unidades = $${valores.length}`); }
    if (notas_admin !== undefined) { valores.push(notas_admin); sets.push(`notas_admin = $${valores.length}`); }
    if (estado !== undefined) {
      valores.push(estado);
      sets.push(`estado = $${valores.length}`);
      if (['Finalizado', 'Cancelado'].includes(estado)) sets.push('fecha_cierre_real = CURRENT_TIMESTAMP');
    }
    if (sets.length) {
      valores.push(req.params.id);
      await client.query(`UPDATE consolidados SET ${sets.join(', ')} WHERE id = $${valores.length}`, valores);
    }

    if (estado !== undefined && estado !== actual.rows[0].estado) {
      await client.query(
        `INSERT INTO historial_estados_consolidado (id_consolidado, estado, descripcion_publica) VALUES ($1,$2,$3)`,
        [req.params.id, estado, descripcion_publica || null]
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Consolidado actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23514') return res.status(400).json({ error: 'El mínimo de unidades debe ser al menos 4' });
    res.status(500).json({ error: 'Error al actualizar el consolidado' });
  } finally {
    client.release();
  }
});

/* ==================== RESEÑAS ==================== */

router.get('/resenas', async (req, res) => {
  const soloPendientes = req.query.estado !== 'todas';
  try {
    const result = await pool.query(
      `SELECT r.id, r.calificacion, r.comentario, r.aprobado, r.fecha_creacion,
              c.nombres, c.apellidos, p.nombre AS producto, p.slug
       FROM resenas r
       JOIN clientes c ON c.dni_ce_ruc = r.dni_cliente
       LEFT JOIN perfumes p ON p.id = r.id_producto
       ${soloPendientes ? 'WHERE r.aprobado = FALSE' : ''}
       ORDER BY r.fecha_creacion DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

router.put('/resenas/:id', async (req, res) => {
  const { aprobado } = req.body;
  try {
    const result = await pool.query('UPDATE resenas SET aprobado = $1 WHERE id = $2 RETURNING id', [!!aprobado, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ mensaje: aprobado ? 'Reseña aprobada' : 'Reseña ocultada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la reseña' });
  }
});

router.delete('/resenas/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM resenas WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ mensaje: 'Reseña eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la reseña' });
  }
});

/* ==================== COTIZACIONES ==================== */

router.get('/cotizaciones', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sc.*, c.nombres, c.apellidos, c.correo, c.telefono
       FROM solicitudes_cotizacion sc
       JOIN clientes c ON c.dni_ce_ruc = sc.dni_cliente
       ORDER BY sc.fecha_solicitud DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

router.put('/cotizaciones/:id', async (req, res) => {
  const { precio_cotizado_tienda, precio_cotizado_consolidado, estado, id_producto_creado } = req.body;
  if (estado && !ESTADOS_COTIZACION.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  const sets = [];
  const valores = [];
  if (precio_cotizado_tienda !== undefined) { valores.push(precio_cotizado_tienda); sets.push(`precio_cotizado_tienda = $${valores.length}`); }
  if (precio_cotizado_consolidado !== undefined) { valores.push(precio_cotizado_consolidado); sets.push(`precio_cotizado_consolidado = $${valores.length}`); }
  if (estado !== undefined) { valores.push(estado); sets.push(`estado = $${valores.length}`); }
  if (id_producto_creado !== undefined) { valores.push(id_producto_creado || null); sets.push(`id_producto_creado = $${valores.length}`); }
  if (!sets.length) return res.status(400).json({ error: 'No hay cambios que aplicar' });

  try {
    valores.push(req.params.id);
    const result = await pool.query(
      `UPDATE solicitudes_cotizacion SET ${sets.join(', ')} WHERE id = $${valores.length} RETURNING id`,
      valores
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ mensaje: 'Cotización actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la cotización' });
  }
});

module.exports = router;
