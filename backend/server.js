require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
app.use('/api/productos', require('./src/routes/productos.routes'));
app.use('/api/consolidados', require('./src/routes/consolidados.routes'));
app.use('/api/carrito', require('./src/routes/carrito.routes'));
app.use('/api/pedidos', require('./src/routes/pedidos.routes'));
app.use('/api/direcciones', require('./src/routes/direcciones.routes'));
app.use('/api/cotizaciones', require('./src/routes/cotizaciones.routes'));
app.use('/api/resenas', require('./src/routes/resenas.routes'));
app.use('/api/favoritos', require('./src/routes/favoritos.routes'));
app.use('/api/newsletter', require('./src/routes/newsletter.routes'));
app.use('/api/ubigeo', require('./src/routes/ubigeo.routes'));

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.status(404).sendFile(path.join(frontendPath, '404.html'), (err) => {
    if (err) res.status(404).send('Página no encontrada');
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Maison Zadaca — servidor corriendo en http://localhost:${PORT}`);
});
