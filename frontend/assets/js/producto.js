let PRODUCTO_ACTUAL = null;
let CALIFICACION_SELECCIONADA = 0;

document.addEventListener('DOMContentLoaded', async () => {
  iniciarLayout('catalogo.html');

  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Producto no especificado.</div></div>';
    return;
  }

  try {
    const data = await apiFetch(`/productos/${slug}`);
    PRODUCTO_ACTUAL = data.producto;
    renderDetalle(data);
  } catch (err) {
    document.getElementById('detalle-mount').innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
});

function renderDetalle(data) {
  const p = data.producto;
  document.title = `${p.nombre} — Maison Zadaca Importaciones`;
  document.getElementById('page-title').textContent = `${p.nombre} — Maison Zadaca`;
  document.getElementById('crumb-nombre').textContent = p.nombre;

  const esLiquidacion = !!p.es_liquidacion;
  const final = esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = !esLiquidacion && Number(p.descuento_tienda_porcentaje) > 0;
  const agotado = p.estado === 'Agotado';
  const promedio = data.calificacion_promedio;
  const unidadMinima = esLiquidacion ? Math.max(Number(p.liquidacion_unidad_minima) || 1, 1) : 1;

  document.getElementById('detalle-mount').innerHTML = `
    <div class="container product-detail">
      <div class="pd-media ${tonoPorGenero(p.genero)}">${mediaProducto(p.imagen_url, p.nombre)}</div>
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
          <button class="btn btn-ghost" id="btn-favorito">${ICONS.heart} Favorito</button>
        </div>

        <div class="pd-tabs-content">
          <h4>Descripción</h4>
          <p>${escapeHtml(p.descripcion || 'Fragancia importada original, disponible en presentación de ' + p.mililitros + ' ml.')}</p>
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
              <div class="review-head">
                <span class="review-name">${escapeHtml(r.nombres)}</span>
                <span class="review-date">${new Date(r.fecha_creacion).toLocaleDateString('es-PE')}</span>
              </div>
              <div class="stars">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
              <p style="color:var(--color-text-muted); font-size:0.88rem; margin:6px 0 0;">${escapeHtml(r.comentario || '')}</p>
            </div>`).join('')
          : '<p style="color:var(--color-text-faint); font-size:0.88rem;">Este producto aún no tiene reseñas. ¡Sé el primero en opinar!</p>'}
      </div>
    </div>
  `;

  document.getElementById('qty-menos').addEventListener('click', () => ajustarCantidad(-1));
  document.getElementById('qty-mas').addEventListener('click', () => ajustarCantidad(1));
  document.getElementById('btn-agregar-carrito').addEventListener('click', agregarAlCarrito);
  document.getElementById('btn-favorito').addEventListener('click', agregarAFavoritos);

  renderFormularioReseña();

  if (data.relacionados.length) {
    document.getElementById('relacionados-section').style.display = '';
    document.getElementById('grid-relacionados').innerHTML = data.relacionados
      .map((r) => tarjetaProducto({ ...r, genero: 'Unisex', mililitros: '', concentracion: '', estado: 'Disponible' }))
      .join('');
  }
}

function ajustarCantidad(delta) {
  const input = document.getElementById('qty-input');
  const minimo = Number(input.min) || 1;
  const nuevo = Math.max(minimo, Math.min(Number(input.max) || 99, Number(input.value) + delta));
  input.value = nuevo;
}

async function agregarAlCarrito() {
  if (!estaLogueado()) return irALoginConRetorno();
  const cantidad = Number(document.getElementById('qty-input').value);
  try {
    await apiFetch('/carrito', { method: 'POST', body: JSON.stringify({ id_producto: PRODUCTO_ACTUAL.id, cantidad }) });
    mostrarToast('Producto agregado al carrito');
    actualizarBadgeCarrito();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function agregarAFavoritos() {
  if (!estaLogueado()) return irALoginConRetorno();
  try {
    await apiFetch('/favoritos', { method: 'POST', body: JSON.stringify({ id_producto: PRODUCTO_ACTUAL.id }) });
    mostrarToast('Agregado a tus favoritos');
    document.getElementById('btn-favorito').classList.add('active');
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function renderFormularioReseña() {
  const mount = document.getElementById('reviews-form-mount');
  if (!estaLogueado()) {
    mount.innerHTML = `<p style="font-size:0.85rem; color:var(--color-text-faint); margin-bottom:24px;"><a href="cuenta.html" class="link-arrow">Inicia sesión</a> para dejar tu reseña.</p>`;
    return;
  }
  mount.innerHTML = `
    <form id="review-form" class="form-card" style="max-width:100%; margin: 0 0 32px;">
      <div class="star-input" id="star-input">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join('')}
      </div>
      <div class="form-group">
        <label>Tu comentario</label>
        <textarea name="comentario" rows="3" placeholder="Cuéntanos tu experiencia con este perfume..."></textarea>
      </div>
      <button type="submit" class="btn btn-outline">Publicar Reseña</button>
    </form>
  `;
  document.querySelectorAll('#star-input button').forEach((btn) => {
    btn.addEventListener('click', () => {
      CALIFICACION_SELECCIONADA = Number(btn.dataset.star);
      document.querySelectorAll('#star-input button').forEach((b) => b.classList.toggle('active', Number(b.dataset.star) <= CALIFICACION_SELECCIONADA));
    });
  });
  document.getElementById('review-form').addEventListener('submit', enviarReseña);
}

async function enviarReseña(e) {
  e.preventDefault();
  if (!CALIFICACION_SELECCIONADA) return mostrarToast('Selecciona una calificación', 'error');
  const comentario = e.target.comentario.value;
  try {
    await apiFetch('/resenas', {
      method: 'POST',
      body: JSON.stringify({ id_producto: PRODUCTO_ACTUAL.id, calificacion: CALIFICACION_SELECCIONADA, comentario }),
    });
    mostrarToast('¡Gracias! Tu reseña será publicada tras revisión.');
    e.target.reset();
    CALIFICACION_SELECCIONADA = 0;
    document.querySelectorAll('#star-input button').forEach((b) => b.classList.remove('active'));
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}
