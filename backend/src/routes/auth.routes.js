const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function firmarToken(cliente) {
  return jwt.sign(
    { dni: cliente.dni_ce_ruc, rol: cliente.rol, nombres: cliente.nombres },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/registro', async (req, res) => {
  const { dni_ce_ruc, nombres, apellidos, correo, telefono, contrasena } = req.body;
  if (!dni_ce_ruc || !nombres || !apellidos || !correo || !contrasena) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  try {
    const existente = await pool.query(
      'SELECT dni_ce_ruc FROM clientes WHERE dni_ce_ruc = $1 OR correo = $2',
      [dni_ce_ruc, correo]
    );
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese DNI/RUC o correo' });
    }
    const hash = await bcrypt.hash(contrasena, 10);
    const rolCliente = await pool.query("SELECT id FROM roles WHERE nombre = 'Cliente'");
    await pool.query(
      `INSERT INTO clientes (dni_ce_ruc, id_rol, nombres, apellidos, correo, telefono, contrasena_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [dni_ce_ruc, rolCliente.rows[0].id, nombres, apellidos, correo, telefono || null, hash]
    );
    const cliente = { dni_ce_ruc, rol: 'Cliente', nombres };
    res.status(201).json({ token: firmarToken(cliente), cliente: { dni_ce_ruc, nombres, apellidos, correo, rol: 'Cliente' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la cuenta' });
  }
});

router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  try {
    const result = await pool.query(
      `SELECT c.dni_ce_ruc, c.nombres, c.apellidos, c.correo, c.contrasena_hash, c.estado_activo, r.nombre AS rol
       FROM clientes c JOIN roles r ON r.id = c.id_rol
       WHERE c.correo = $1`,
      [correo]
    );
    const cliente = result.rows[0];
    if (!cliente) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!cliente.estado_activo) return res.status(403).json({ error: 'Cuenta desactivada, contacta a soporte' });
    const valido = await bcrypt.compare(contrasena, cliente.contrasena_hash);
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = firmarToken({ dni_ce_ruc: cliente.dni_ce_ruc, rol: cliente.rol, nombres: cliente.nombres });
    res.json({
      token,
      cliente: { dni_ce_ruc: cliente.dni_ce_ruc, nombres: cliente.nombres, apellidos: cliente.apellidos, correo: cliente.correo, rol: cliente.rol },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.dni_ce_ruc, c.nombres, c.apellidos, c.correo, c.telefono, r.nombre AS rol
       FROM clientes c JOIN roles r ON r.id = c.id_rol WHERE c.dni_ce_ruc = $1`,
      [req.usuario.dni]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
});

module.exports = router;
