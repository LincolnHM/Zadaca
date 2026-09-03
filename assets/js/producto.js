let PRODUCTO_ACTUAL = null;
// Talla elegida en la ficha de un decant (3/5/10ml, ver migración 0016) -- cambiarla ya no
// navega a otro producto (antes cada tamaño era una fila/slug distinto): el producto trae sus
// 3 precios en la misma carga, así que la pastilla solo reacomoda el precio/cantidad in-place.
let TALLA_SELECCIONADA = null;

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
});

async function cargarProducto(slug) {
  const mount = document.getElementById('detalle-mount');
  mount.innerHTML = '<div class="container"><div class="loading-state">Cargando…</div></div>';
  try {
    const data = await obtenerProductoPorSlug(slug);
    PRODUCTO_ACTUAL = data.producto;
    TALLA_SELECCIONADA = PRODUCTO_ACTUAL.es_decant ? tallasDecant(PRODUCTO_ACTUAL)[0] ?? null : null;
    renderDetalle(data);
  } catch (err) {
    mount.innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

function renderDetalle(data) {
  const p = data.producto;
  const tituloPagina = `${p.marca} ${p.nombre} — Maison Zadaca`;
  // mililitros ya no es "la talla que se vende" para un decant (es la capacidad del frasco
  // fuente, ver migración 0016), así que el fallback de descripción no lo menciona para esos.
  const descripcionPagina = p.descripcion || (p.es_decant
    ? `${p.marca} ${p.nombre} en decant, fracción de perfume original importado.`
    : `${p.marca} ${p.nombre}, ${p.mililitros}ml. Perfume original importado, disponible en tienda o consolidado.`);
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
  // Un decant ya no tiene un único precio de fila: sale de precio_3ml/5ml/10ml según la talla
  // elegida en las pastillas de abajo (ver migración 0016 y TALLA_SELECCIONADA).
  const final = p.es_decant
    ? (precioTallaDecant(p, TALLA_SELECCIONADA) ?? 0)
    : esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = !esLiquidacion && !p.es_decant && Number(p.descuento_tienda_porcentaje) > 0;
  // "estado" es un campo que el admin llena a mano y en la práctica nunca usa para el catálogo
  // normal (ningún producto real está marcado "Agotado" hoy) -- stock_disponible es el número
  // que sí se mantiene al día automáticamente (columna generada, ver schema.sql), así que ESE
  // es el que manda para un producto normal. Antes esto solo miraba "estado", así que un
  // producto con stock_disponible=0 pero estado='Disponible' (bastante común: 118 de 200
  // productos activos hoy) mostraba el botón "Agregar al Carrito" habilitado y, peor, el
  // selector de cantidad quedaba con max=1 desde el arranque -- el botón "+" no tenía a dónde
  // subir y parecía roto.
  // Un decant ya no tiene stock por unidad (sus 3 tallas comparten un mismo frasco, ver
  // migración 0016) -- el admin lo marca Agotado a mano en vez de llevar un número exacto; si
  // ninguna talla tiene precio cargado (dato incompleto), también se trata como agotado.
  const agotado = p.es_decant ? (p.estado === 'Agotado' || TALLA_SELECCIONADA == null) : (p.estado === 'Agotado' || p.stock_disponible <= 0);
  const unidadMinima = esLiquidacion ? Math.max(Number(p.liquidacion_unidad_minima) || 1, 1) : 1;
  // Sin stock exacto para decants, el máximo del selector de cantidad es un tope razonable
  // (no infinito, para no dejar escribir 500 unidades por accidente) en vez de stock_disponible.
  const cantidadMaxima = p.es_decant ? 20 : Math.max(p.stock_disponible, unidadMinima);

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
        ${p.es_decant && tallasDecant(p).length > 1 ? `
        <div class="size-selector">
          <span class="size-selector-label">Tamaño</span>
          <div class="size-options">
            ${tallasDecant(p).map((t) => `<button type="button" data-talla="${t}" class="size-option${t === TALLA_SELECCIONADA ? ' active' : ''}">${t}ml</button>`).join('')}
          </div>
        </div>` : ''}
        ${esLiquidacion
          ? `<div class="pd-consolidado-note">Precio de liquidación — por mayor y por unidad. ${unidadMinima > 1 ? `Compra mínima: <strong>${unidadMinima} unidades</strong>.` : 'Puedes llevar desde 1 unidad.'}</div>`
          : p.es_decant
            ? ''
            : `<div class="pd-consolidado-note">O resérvalo en el próximo consolidado desde <strong>${formatoMoneda(p.precio_consolidado_fijo)}</strong> — <a href="${SITE_ROOT}consolidados/" class="link-arrow">ver campañas activas</a></div>`}

        <div class="pd-meta-row">
          <div><strong>Concentración</strong>${escapeHtml(p.concentracion || '—')}</div>
          <div><strong>Contenido</strong>${p.es_decant ? (TALLA_SELECCIONADA ?? '—') : p.mililitros} ml</div>
          <div><strong>Familia</strong>${escapeHtml(p.familia_olfativa || '—')}</div>
          <div><strong>Disponibilidad</strong>${p.es_decant ? (agotado ? 'Agotado' : 'Disponible') : (agotado ? 'Agotado' : `${p.stock_disponible} unidades`)}</div>
        </div>

        <div class="pd-actions">
          <div class="qty-selector">
            <button type="button" id="qty-menos" ${agotado ? 'disabled' : ''}>${ICONS.minus}</button>
            <input type="number" id="qty-input" value="${unidadMinima}" min="${unidadMinima}" max="${cantidadMaxima}" ${agotado ? 'disabled' : ''} />
            <button type="button" id="qty-mas" ${agotado ? 'disabled' : ''}>${ICONS.plus}</button>
          </div>
          <button class="btn btn-primary" id="btn-agregar-carrito" ${agotado ? 'disabled' : ''}>${agotado ? 'Agotado' : 'Agregar al Carrito'}</button>
          <button class="heart-toggle" id="btn-favorito" aria-label="Agregar a favoritos" aria-pressed="false">${ICONS.heart}</button>
          <a class="btn btn-whatsapp" href="https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(`Hola, quisiera consultar sobre ${p.marca} ${p.nombre}`)}" target="_blank" rel="noopener">${ICONS.whatsapp} Consultar</a>
        </div>

        <div class="pd-tabs-content">
          <h4>Descripción</h4>
          <p>${escapeHtml(p.descripcion || (p.es_decant ? `Decant de ${p.marca} ${p.nombre}, fraccionado de un frasco original.` : `Fragancia importada original, disponible en presentación de ${p.mililitros} ml.`))}</p>
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

  // Cambiar de talla ya no navega a otro producto (las 3 tallas viven en la misma fila, ver
  // migración 0016) -- solo actualiza TALLA_SELECCIONADA y vuelve a pintar con los mismos
  // datos ya cargados, sin ningún viaje de red de por medio.
  document.querySelectorAll('.size-option').forEach((el) => {
    el.addEventListener('click', () => {
      const talla = Number(el.dataset.talla);
      if (talla && talla !== TALLA_SELECCIONADA) {
        TALLA_SELECCIONADA = talla;
        renderDetalle(data);
      }
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
    await agregarAlCarrito(PRODUCTO_ACTUAL.id, cantidad, PRODUCTO_ACTUAL.es_decant ? TALLA_SELECCIONADA : 0);
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
