let PRODUCTO_ACTUAL = null;
let cargaDetalleSeq = 0; // descarta una respuesta vieja si el cliente cambió de tamaño varias veces rápido

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('catalogo/');

  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div></div>';
    return;
  }

  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Producto no especificado.</div></div>';
    return;
  }

  await cargarProducto(slug);

  // Atrás/adelante del navegador (ej. volvió de 10ml a 5ml con el botón "atrás") -- recarga la
  // ficha con el slug que quedó en la URL, sin volver a empujar historial (el evento ya refleja
  // el cambio, pushState de nuevo generaría una entrada duplicada).
  window.addEventListener('popstate', () => {
    const slugActual = new URLSearchParams(window.location.search).get('slug');
    if (slugActual) cargarProducto(slugActual);
  });
});

// Separado de renderDetalle() para que cambiar de tamaño de decant (3ml/5ml/10ml) no dispare
// una navegación de página completa -- antes cada pastilla de tamaño era un <a href> normal, así
// que cada clic recargaba TODO (header, footer, CSS, JS) por un cambio que en los datos es
// mínimo. Acá se trae solo el producto nuevo y se vuelve a pintar in-place; el contenido
// anterior se queda visible hasta que llega el nuevo (nada de pantalla en blanco de por medio).
async function cargarProducto(slug, { actualizarHistoria = false } = {}) {
  const idSolicitud = ++cargaDetalleSeq;
  const mount = document.getElementById('detalle-mount');
  if (!PRODUCTO_ACTUAL) mount.innerHTML = '<div class="container"><div class="loading-state">Cargando…</div></div>';
  try {
    const data = await obtenerProductoPorSlug(slug);
    if (idSolicitud !== cargaDetalleSeq) return;
    PRODUCTO_ACTUAL = data.producto;
    if (actualizarHistoria) history.pushState(null, '', `${SITE_ROOT}producto/?slug=${slug}`);
    renderDetalle(data);
  } catch (err) {
    if (idSolicitud !== cargaDetalleSeq) return;
    mount.innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

function renderDetalle(data) {
  const p = data.producto;
  // Sin el sufijo de ml, las 2-3 fichas de un mismo grupo de decant (mismo nombre/marca,
  // distinto tamaño) compartirían <title> -- duplicado que a Google no le gusta.
  const tituloPagina = p.es_decant ? `${p.marca} ${p.nombre} ${p.mililitros}ml — Maison Zadaca` : `${p.marca} ${p.nombre} — Maison Zadaca`;
  const descripcionPagina = p.descripcion || `${p.marca} ${p.nombre}, ${p.mililitros}ml. Perfume original importado, disponible en tienda o consolidado.`;
  document.getElementById('page-title').textContent = tituloPagina;
  document.getElementById('page-description').setAttribute('content', descripcionPagina);
  document.getElementById('og-title').setAttribute('content', tituloPagina);
  document.getElementById('og-description').setAttribute('content', descripcionPagina);
  // Si el producto no tiene foto propia todavía, cae al logo en vez de dejar el og:image
  // vacío -- una tarjeta de WhatsApp/Facebook sin imagen se ve rota; con el logo al menos
  // queda con cara de la marca mientras se le sube la foto real desde el panel admin.
  // La base para resolver imagen_url tiene que ser SITE_ROOT, no window.location.href: la
  // página vive en producto/index.html, así que resolver contra la URL actual (producto/?slug=x)
  // apuntaría a "producto/assets/img/..." en vez de la ruta real del archivo.
  const imagenPagina = p.imagen_url ? new URL(p.imagen_url, SITE_ROOT).href : `${SITE_ROOT}assets/img/brand/logo-og.jpg`;
  document.getElementById('og-image').setAttribute('content', imagenPagina);
  document.getElementById('twitter-title').setAttribute('content', tituloPagina);
  document.getElementById('twitter-description').setAttribute('content', descripcionPagina);
  document.getElementById('twitter-image').setAttribute('content', imagenPagina);
  document.getElementById('twitter-card').setAttribute('content', 'summary_large_image');

  // URL canónica -- ahora que la página vive en producto/index.html, la URL actual del
  // navegador (origen + path + query, sin el hash) YA es la canónica correcta: no hace falta
  // reconstruirla a mano como antes (cuando el archivo era producto.html suelto en la raíz).
  const urlProducto = window.location.origin + window.location.pathname + window.location.search;
  document.getElementById('canonical-link').setAttribute('href', urlProducto);
  document.getElementById('og-url').setAttribute('content', urlProducto);

  document.getElementById('crumb-nombre').textContent = p.nombre;

  const esLiquidacion = !!p.es_liquidacion;
  const final = esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = !esLiquidacion && Number(p.descuento_tienda_porcentaje) > 0;
  // "estado" es un campo que el admin llena a mano y en la práctica nunca usa (ningún
  // producto del catálogo real está marcado "Agotado" hoy) -- stock_disponible es el número
  // que sí se mantiene al día automáticamente (columna generada, ver schema.sql). Antes esto
  // solo miraba "estado", así que un producto con stock_disponible=0 pero estado='Disponible'
  // (bastante común: 118 de 200 productos activos hoy) mostraba el botón "Agregar al
  // Carrito" habilitado y, peor, el selector de cantidad quedaba con max=1 desde el
  // arranque -- el botón "+" no tenía a dónde subir y parecía roto.
  const agotado = p.estado === 'Agotado' || p.stock_disponible <= 0;
  const unidadMinima = esLiquidacion ? Math.max(Number(p.liquidacion_unidad_minima) || 1, 1) : 1;

  // Datos estructurados Product -- lo que le permite a Google mostrar precio directo en el
  // resultado de búsqueda (rich result) en vez de solo título y descripción.
  const productoLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.marca} ${p.nombre}`,
    description: descripcionPagina,
    sku: p.slug,
    brand: { '@type': 'Brand', name: p.marca },
    image: imagenPagina,
    offers: {
      '@type': 'Offer',
      url: urlProducto,
      priceCurrency: 'PEN',
      price: final.toFixed(2),
      availability: agotado ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  };
  document.getElementById('product-jsonld').textContent = JSON.stringify(productoLd);

  document.getElementById('detalle-mount').innerHTML = `
    <div class="container product-detail">
      <div class="pd-media">${imagenProducto(p)}</div>
      <div>
        <span class="pd-brand">${escapeHtml(p.marca)}</span>
        <h1 class="pd-name">${escapeHtml(p.nombre)}</h1>
        <div class="pd-price">
          <span class="price-current">${formatoMoneda(final)}</span>
          ${tieneDescuento ? `<span class="price-old">${formatoMoneda(p.precio_tienda_regular)}</span>` : ''}
          ${esLiquidacion ? '<span class="badge badge-liquidacion">Liquidación</span>' : ''}
          ${p.es_decant ? '<span class="badge badge-decant">Decant</span>' : ''}
        </div>
        ${p.es_decant && data.tamanosDecant.length > 1 ? `
        <div class="size-selector">
          <span class="size-selector-label">Tamaño</span>
          <div class="size-options">
            ${data.tamanosDecant.map((t) => `<a href="${SITE_ROOT}producto/?slug=${t.slug}" data-slug="${t.slug}" class="size-option${t.slug === p.slug ? ' active' : ''}">${t.mililitros}ml</a>`).join('')}
          </div>
        </div>` : ''}
        ${esLiquidacion
          ? `<div class="pd-consolidado-note">Precio de liquidación — por mayor y por unidad. ${unidadMinima > 1 ? `Compra mínima: <strong>${unidadMinima} unidades</strong>.` : 'Puedes llevar desde 1 unidad.'}</div>`
          : p.es_decant
            ? ''
            : `<div class="pd-consolidado-note">O resérvalo en el próximo consolidado desde <strong>${formatoMoneda(p.precio_consolidado_fijo)}</strong> — <a href="${SITE_ROOT}consolidados/" class="link-arrow">ver campañas activas</a></div>`}

        <div class="pd-meta-row">
          <div><strong>Concentración</strong>${escapeHtml(p.concentracion || '—')}</div>
          <div><strong>Contenido</strong>${p.mililitros} ml</div>
          <div><strong>Familia</strong>${escapeHtml(p.familia_olfativa || '—')}</div>
          <div><strong>Disponibilidad</strong>${agotado ? 'Agotado' : `${p.stock_disponible} unidades`}</div>
        </div>

        <div class="pd-actions">
          <div class="qty-selector">
            <button type="button" id="qty-menos" ${agotado ? 'disabled' : ''}>${ICONS.minus}</button>
            <input type="number" id="qty-input" value="${unidadMinima}" min="${unidadMinima}" max="${Math.max(p.stock_disponible, unidadMinima)}" ${agotado ? 'disabled' : ''} />
            <button type="button" id="qty-mas" ${agotado ? 'disabled' : ''}>${ICONS.plus}</button>
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
  `;

  document.getElementById('qty-menos').addEventListener('click', () => ajustarCantidad(-1));
  document.getElementById('qty-mas').addEventListener('click', () => ajustarCantidad(1));
  document.getElementById('btn-agregar-carrito').addEventListener('click', agregarAlCarritoUI);
  document.getElementById('btn-favorito').addEventListener('click', favoritoUI);
  pintarEstadoFavorito();

  // El href real se deja para clic derecho/medio/abrir en pestaña nueva -- un clic normal se
  // intercepta y cambia de tamaño in-place (ver cargarProducto) en vez de navegar de página.
  document.querySelectorAll('.size-option').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const nuevoSlug = el.dataset.slug;
      if (nuevoSlug && nuevoSlug !== PRODUCTO_ACTUAL.slug) cargarProducto(nuevoSlug, { actualizarHistoria: true });
    });
  });

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
  const input = document.getElementById('qty-input');
  const cantidad = Number(input.value);
  const minimo = Number(input.min) || 1;
  const maximo = Number(input.max) || 1;
  // El min/max del <input type="number"> son solo una sugerencia visual del navegador -- no
  // impiden que alguien borre el campo y escriba a mano un número fuera de rango, así que se
  // vuelve a validar acá antes de mandarlo al carrito.
  if (!Number.isInteger(cantidad) || cantidad < minimo || cantidad > maximo) {
    mostrarToast(`Elige una cantidad entre ${minimo} y ${maximo}`, 'error');
    return;
  }
  try {
    await agregarAlCarrito(PRODUCTO_ACTUAL.id, cantidad);
    animarAgregarCarrito(document.getElementById('btn-agregar-carrito'));
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
