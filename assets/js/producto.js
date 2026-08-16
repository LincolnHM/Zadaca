let PRODUCTO_ACTUAL = null;
let CALIFICACION_SELECCIONADA = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('catalogo.html');

  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div></div>';
    return;
  }

  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Producto no especificado.</div></div>';
    return;
  }

  try {
    const data = await obtenerProductoPorSlug(slug);
    PRODUCTO_ACTUAL = data.producto;
    renderDetalle(data);
  } catch (err) {
    document.getElementById('detalle-mount').innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
});

function renderDetalle(data) {
  const p = data.producto;
  const tituloPagina = `${p.marca} ${p.nombre} — Maison Zadaca`;
  const descripcionPagina = p.descripcion || `${p.marca} ${p.nombre}, ${p.mililitros}ml. Perfume original importado, disponible en tienda o consolidado.`;
  document.getElementById('page-title').textContent = tituloPagina;
  document.getElementById('page-description').setAttribute('content', descripcionPagina);
  document.getElementById('og-title').setAttribute('content', tituloPagina);
  document.getElementById('og-description').setAttribute('content', descripcionPagina);
  if (p.imagen_url) document.getElementById('og-image').setAttribute('content', p.imagen_url);
  document.getElementById('crumb-nombre').textContent = p.nombre;

  const esLiquidacion = !!p.es_liquidacion;
  const final = esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = !esLiquidacion && Number(p.descuento_tienda_porcentaje) > 0;
  const agotado = p.estado === 'Agotado';
  const promedio = data.calificacionPromedio;
  const unidadMinima = esLiquidacion ? Math.max(Number(p.liquidacion_unidad_minima) || 1, 1) : 1;

  document.getElementById('detalle-mount').innerHTML = `
    <div class="container product-detail">
      <div class="pd-media">${imagenProducto(p)}</div>
      <div>
        <span class="pd-brand">${escapeHtml(p.marca)}</span>
        <h1 class="pd-name">${escapeHtml(p.nombre)}</h1>
        <div class="pd-rating">
          ${promedio ? `<span class="stars">${'★'.repeat(Math.round(promedio))}${'☆'.repeat(5 - Math.round(promedio))}</span><span style="font-size:0.8rem; color:var(--color-text-faint)">${promedio.toFixed(1)} (${data.resenas.length} reseñas)</span>` : '<span style="font-size:0.8rem; color:var(--color-text-faint)">Sin reseñas todavía</span>'}
        </div>
        <div class="pd-price">
          <span class="price-current">${formatoMoneda(final)}</span>
          ${tieneDescuento ? `<span class="price-old">${formatoMoneda(p.precio_tienda_regular)}</span>` : ''}
          ${esLiquidacion ? '<span class="badge badge-liquidacion">Liquidación</span>' : ''}
        </div>
        ${esLiquidacion
          ? `<div class="pd-consolidado-note">Precio de liquidación — por mayor y por unidad. ${unidadMinima > 1 ? `Compra mínima: <strong>${unidadMinima} unidades</strong>.` : 'Puedes llevar desde 1 unidad.'}</div>`
          : `<div class="pd-consolidado-note">O resérvalo en el próximo consolidado desde <strong>${formatoMoneda(p.precio_consolidado_fijo)}</strong> — <a href="consolidados.html" class="link-arrow">ver campañas activas</a></div>`}

        <div class="pd-meta-row">
          <div><strong>Concentración</strong>${escapeHtml(p.concentracion || '—')}</div>
          <div><strong>Contenido</strong>${p.mililitros} ml</div>
          <div><strong>Familia</strong>${escapeHtml(p.familia_olfativa || '—')}</div>
          <div><strong>Disponibilidad</strong>${agotado ? 'Agotado' : `${p.stock_disponible} unidades`}</div>
        </div>

        <div class="pd-actions">
          <div class="qty-selector">
            <button type="button" id="qty-menos">${ICONS.minus}</button>
            <input type="number" id="qty-input" value="${unidadMinima}" min="${unidadMinima}" max="${Math.max(p.stock_disponible, unidadMinima)}" />
            <button type="button" id="qty-mas">${ICONS.plus}</button>
          </div>
          <button class="btn btn-primary" id="btn-agregar-carrito" ${agotado ? 'disabled' : ''}>${agotado ? 'Agotado' : 'Agregar al Carrito'}</button>
          <button class="heart-toggle" id="btn-favorito" aria-label="Agregar a favoritos" aria-pressed="false">${ICONS.heart}</button>
          <a class="btn btn-whatsapp" href="https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`Hola, quisiera consultar sobre ${p.marca} ${p.nombre}`)}" target="_blank" rel="noopener">${ICONS.whatsapp} Consultar</a>
        </div>

        <div class="pd-tabs-content">
          <h4>Descripción</h4>
          <p>${escapeHtml(p.descripcion || `Fragancia importada original, disponible en presentación de ${p.mililitros} ml.`)}</p>
          <h4>Pirámide Olfativa</h4>
          <p>${escapeHtml(p.notas_olfativas || 'Información no disponible.')}</p>
        </div>
      </div>
    </div>

    <div class="container mt-40">
      <div class="section-header"><h2>Reseñas</h2></div>
      <div id="reviews-form-mount"></div>
      <div id="reviews-list">
        ${data.resenas.length
          ? data.resenas.map((r) => `
            <div class="review-item">
              <div class="review-head"><span class="review-name">${escapeHtml(r.nombres)}</span><span class="review-date">${new Date(r.fecha_creacion).toLocaleDateString('es-PE')}</span></div>
              <div class="stars">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
              <p style="color:var(--color-text-muted); font-size:0.88rem; margin:6px 0 0;">${escapeHtml(r.comentario || '')}</p>
            </div>`).join('')
          : '<p style="color:var(--color-text-faint); font-size:0.88rem;">Este producto aún no tiene reseñas. ¡Sé el primero en opinar!</p>'}
      </div>
    </div>
  `;

  document.getElementById('qty-menos').addEventListener('click', () => ajustarCantidad(-1));
  document.getElementById('qty-mas').addEventListener('click', () => ajustarCantidad(1));
  document.getElementById('btn-agregar-carrito').addEventListener('click', agregarAlCarritoUI);
  document.getElementById('btn-favorito').addEventListener('click', favoritoUI);
  pintarEstadoFavorito();

  renderFormularioReseña();

  if (data.relacionados.length) {
    document.getElementById('relacionados-section').style.display = '';
    document.getElementById('grid-relacionados').innerHTML = data.relacionados.map(tarjetaProducto).join('');
  }
}

function ajustarCantidad(delta) {
  const input = document.getElementById('qty-input');
  const minimo = Number(input.min) || 1;
  const nuevo = Math.max(minimo, Math.min(Number(input.max) || 99, Number(input.value) + delta));
  input.value = nuevo;
}

async function agregarAlCarritoUI() {
  const cantidad = Number(document.getElementById('qty-input').value);
  try {
    await agregarAlCarrito(PRODUCTO_ACTUAL.id, cantidad);
    mostrarToast('Producto agregado al carrito');
    actualizarEstadoSesionHeader();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function pintarEstadoFavorito() {
  const btn = document.getElementById('btn-favorito');
  const activo = await esFavorito(PRODUCTO_ACTUAL.id);
  btn.classList.toggle('active', activo);
  btn.setAttribute('aria-pressed', String(activo));
  btn.setAttribute('aria-label', activo ? 'Quitar de favoritos' : 'Agregar a favoritos');
}

async function favoritoUI() {
  const btn = document.getElementById('btn-favorito');
  const activo = btn.classList.contains('active');
  btn.disabled = true;
  try {
    await alternarFavorito(PRODUCTO_ACTUAL.id, activo);
    btn.classList.toggle('active', !activo);
    btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 400);
    btn.setAttribute('aria-pressed', String(!activo));
    btn.setAttribute('aria-label', activo ? 'Agregar a favoritos' : 'Quitar de favoritos');
    mostrarToast(activo ? 'Quitado de tus favoritos' : 'Agregado a tus favoritos');
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function renderFormularioReseña() {
  const mount = document.getElementById('reviews-form-mount');
  const session = await obtenerSesion();
  if (!session) {
    mount.innerHTML = `<p style="font-size:0.85rem; color:var(--color-text-faint); margin-bottom:24px;"><a href="cuenta.html" class="link-arrow">Inicia sesión</a> para dejar tu reseña.</p>`;
    return;
  }
  mount.innerHTML = `
    <form id="review-form" class="form-card" style="max-width:100%; margin: 0 0 32px;">
      <div class="star-input" id="star-input">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join('')}</div>
      <div class="form-group"><label>Tu comentario</label><textarea name="comentario" rows="3" placeholder="Cuéntanos tu experiencia con este perfume..."></textarea></div>
      <button type="submit" class="btn btn-outline">Publicar Reseña</button>
    </form>
  `;
  document.querySelectorAll('#star-input button').forEach((btn) => {
    btn.addEventListener('click', () => {
      CALIFICACION_SELECCIONADA = Number(btn.dataset.star);
      document.querySelectorAll('#star-input button').forEach((b) => b.classList.toggle('active', Number(b.dataset.star) <= CALIFICACION_SELECCIONADA));
    });
  });
  document.getElementById('review-form').addEventListener('submit', enviarReseñaUI);
}

async function enviarReseñaUI(e) {
  e.preventDefault();
  if (!CALIFICACION_SELECCIONADA) return mostrarToast('Selecciona una calificación', 'error');
  try {
    await enviarResena({ id_producto: PRODUCTO_ACTUAL.id, calificacion: CALIFICACION_SELECCIONADA, comentario: e.target.comentario.value });
    mostrarToast('¡Gracias! Tu reseña será publicada tras revisión.');
    e.target.reset();
    CALIFICACION_SELECCIONADA = 0;
    document.querySelectorAll('#star-input button').forEach((b) => b.classList.remove('active'));
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}
