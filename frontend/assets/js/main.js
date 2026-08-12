const ICONS = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
};

function wireNewsletterForm(selector = '#newsletter-form') {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    try {
      await apiFetch('/newsletter', { method: 'POST', body: JSON.stringify({ correo: input.value }) });
      mostrarToast('¡Gracias por suscribirte al Club Zadaca!');
      form.reset();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

const NAV_LINKS = [
  { href: 'index.html', label: 'Inicio' },
  { href: 'catalogo.html', label: 'Catálogo' },
  { href: 'consolidados.html', label: 'Consolidados' },
  { href: 'liquidaciones.html', label: 'Liquidaciones' },
  { href: 'contacto.html', label: 'Contacto' },
];

function renderHeader(activo) {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  const cliente = getCliente();

  mount.innerHTML = `
    <div class="announce-bar">ENVÍOS A TODO EL PERÚ &mdash; RESERVA TU PERFUME EN NUESTROS CONSOLIDADOS MENSUALES</div>
    <header class="site-header">
      <div class="header-inner container">
        <a href="index.html" class="brand">
          <span class="brand-icon">${ICONS.sparkle.replace('<svg', '<svg style="width:26px;height:26px"')}</span>
          <span class="brand-text">
            <span class="brand-name">Maison <span>Zadaca</span></span>
            <span class="brand-tagline">IMPORTACIONES</span>
          </span>
        </a>
        <nav class="main-nav" id="main-nav">
          ${NAV_LINKS.map((l) => `<a href="${l.href}" class="${activo === l.href ? 'active' : ''}">${l.label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <a href="cuenta.html" class="icon-btn account-label">${ICONS.user}<span id="nav-account-label">${cliente ? cliente.nombres.split(' ')[0] : 'Ingresar'}</span></a>
          <a href="carrito.html" class="icon-btn">${ICONS.bag}<span class="cart-badge" id="cart-badge" hidden>0</span></a>
          <button class="menu-toggle" id="menu-toggle" aria-label="Menú">${ICONS.menu}</button>
        </div>
      </div>
    </header>
  `;

  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.innerHTML = nav.classList.contains('open') ? ICONS.close : ICONS.menu;
  });

  actualizarBadgeCarrito();
}

async function actualizarBadgeCarrito() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  if (!estaLogueado()) { badge.hidden = true; return; }
  try {
    const items = await apiFetch('/carrito');
    const total = items.reduce((acc, i) => acc + i.cantidad, 0);
    if (total > 0) {
      badge.textContent = total;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch {
    badge.hidden = true;
  }
}

function renderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="index.html" class="brand">
              <span class="brand-icon">${ICONS.sparkle}</span>
              <span class="brand-text">
                <span class="brand-name">Maison <span>Zadaca</span></span>
                <span class="brand-tagline">IMPORTACIONES</span>
              </span>
            </a>
            <p>Perfumería importada de alta gama, disponible en tienda o mediante compras consolidadas a precios preferenciales.</p>
            <div class="social-row">
              <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
              <a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 3v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M15 3c.5 2.5 2 4 5 4.3"/></svg></a>
              <a href="#" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12a9 9 0 1 1-4.2-7.6"/><path d="M21 3l-5.2 8.5L21 12l-9-1 4-8Z" fill="none"/></svg></a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Tienda</h4>
            <a href="catalogo.html">Catálogo completo</a>
            <a href="catalogo.html?genero=Hombre">Para Hombre</a>
            <a href="catalogo.html?genero=Mujer">Para Mujer</a>
            <a href="consolidados.html">Consolidados activos</a>
            <a href="liquidaciones.html">Liquidaciones</a>
          </div>
          <div class="footer-col">
            <h4>Empresa</h4>
            <a href="contacto.html">Cómo funciona un consolidado</a>
            <a href="contacto.html">Solicitar cotización</a>
            <a href="contacto.html">Contacto</a>
            <a href="cuenta.html">Mi cuenta</a>
          </div>
          <div class="footer-col">
            <h4>Ayuda</h4>
            <p>Tienda física en San Martín de Porres</p>
            <p>Envíos vía Shalom / Olva a todo el Perú</p>
            <p>Pagos: Yape, Plin, transferencia y tarjeta</p>
            <p>admin@maisonzadaca.com</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span id="footer-year"></span> Maison Zadaca Importaciones. Todos los derechos reservados.</span>
          <div class="payment-icons"><span>Visa</span><span>Mastercard</span><span>Yape</span><span>Plin</span></div>
        </div>
      </div>
    </footer>
  `;
  document.getElementById('footer-year').textContent = new Date().getFullYear();
}

function iniciarLayout(paginaActiva) {
  renderHeader(paginaActiva);
  renderFooter();
}

function iconoBottle() {
  return `<svg viewBox="0 0 120 220" fill="none" stroke="currentColor"><rect x="48" y="6" width="24" height="16" rx="3" stroke-width="2.5"/><rect x="52" y="0" width="16" height="8" rx="2" fill="currentColor" stroke="none"/><path d="M40 22 L40 44 C40 44 30 52 30 72 L30 190 C30 202 38 210 50 210 L70 210 C82 210 90 202 90 190 L90 72 C90 52 80 44 80 44 L80 22 Z" stroke-width="2.5"/><line x1="30" y1="96" x2="90" y2="96" stroke-width="2"/></svg>`;
}

function tonoPorGenero(genero) {
  if (genero === 'Hombre') return 'tone-hombre';
  if (genero === 'Mujer') return 'tone-mujer';
  return 'tone-unisex';
}

function mediaProducto(imagenUrl, nombre) {
  return imagenUrl
    ? `<img src="${escapeHtml(imagenUrl)}" alt="${escapeHtml(nombre || '')}" loading="lazy" />`
    : iconoBottle();
}

function tarjetaProducto(p) {
  const esLiquidacion = !!p.es_liquidacion;
  const final = esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = !esLiquidacion && Number(p.descuento_tienda_porcentaje) > 0;
  const agotado = p.estado === 'Agotado';
  return `
    <a href="producto.html?slug=${p.slug}" class="product-card">
      <div class="product-media ${tonoPorGenero(p.genero)}">
        ${mediaProducto(p.imagen_url, p.nombre)}
        <div class="product-badges">
          ${p.es_nuevo ? '<span class="badge badge-new">Nuevo</span>' : ''}
          ${esLiquidacion ? '<span class="badge badge-liquidacion">Liquidación</span>' : ''}
          ${tieneDescuento ? `<span class="badge badge-sale">-${Number(p.descuento_tienda_porcentaje)}%</span>` : ''}
          ${agotado ? '<span class="badge badge-out">Agotado</span>' : ''}
        </div>
      </div>
      <div class="product-info">
        <span class="product-brand">${escapeHtml(p.marca)}</span>
        <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
        <span class="product-meta">${escapeHtml(p.concentracion || '')} · ${p.mililitros} ml</span>
        <div class="product-price-row">
          <span class="price-current">${formatoMoneda(final)}</span>
          ${tieneDescuento ? `<span class="price-old">${formatoMoneda(p.precio_tienda_regular)}</span>` : ''}
        </div>
        ${esLiquidacion ? `<div class="liq-unidad-note">${p.liquidacion_unidad_minima > 1 ? `Solo por mayor · mínimo ${p.liquidacion_unidad_minima} unidades` : 'Por unidad o por mayor'}</div>` : ''}
      </div>
    </a>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();
});
