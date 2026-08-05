const ICONS = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  whatsapp: `<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.03 3C9.4 3 4 8.4 4 15.03c0 2.23.62 4.32 1.68 6.12L4 29l8.03-1.65a12 12 0 0 0 4 .68c6.63 0 12.03-5.4 12.03-12.03C28.06 8.4 22.66 3 16.03 3Zm0 21.94c-1.9 0-3.68-.5-5.24-1.4l-.38-.22-4.77.98.99-4.65-.25-.4a9.9 9.9 0 0 1-1.5-5.22c0-5.48 4.46-9.94 9.95-9.94 5.48 0 9.94 4.46 9.94 9.94 0 5.49-4.46 9.91-9.74 9.91Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17-.35.22-.65.07a8.14 8.14 0 0 1-2.4-1.48 9 9 0 0 1-1.66-2.06c-.17-.3 0-.46.13-.6.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.91-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.5.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/></svg>`,
};

const NAV_LINKS = [
  { href: 'index.html', label: 'Inicio' },
  { href: 'catalogo.html', label: 'Catálogo' },
  { href: 'consolidados.html', label: 'Consolidados' },
  { href: 'contacto.html', label: 'Contacto' },
];

async function iniciarLayout(activo) {
  renderHeaderEstatico(activo);
  renderFooter();
  renderWhatsappFloat();
  activarRevelado();
  await actualizarEstadoSesionHeader();
}

// Aparición suave de secciones al hacer scroll (".reveal" en el HTML estático de cada
// página). Si el usuario prefiere menos movimiento, se saltea el observer y se muestra todo
// de una — la regla CSS que oculta ".reveal" ni siquiera aplica en ese caso (ver style.css).
function activarRevelado() {
  const elementos = document.querySelectorAll('.reveal');
  if (!elementos.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elementos.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('is-visible');
        observer.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  elementos.forEach((el) => observer.observe(el));
}

function renderHeaderEstatico(activo) {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  mount.innerHTML = `
    <div class="announce-bar">ENVÍOS A TODO EL PERÚ &mdash; RESERVA TU PERFUME EN NUESTROS CONSOLIDADOS</div>
    <header class="site-header">
      <div class="header-inner container">
        <a href="index.html" class="brand">
          <span class="brand-icon">${ICONS.box.replace('<svg', '<svg style="width:24px;height:24px"')}</span>
          <span class="brand-text">
            <span class="brand-name">Maison <span>Zadaca</span></span>
            <span class="brand-tagline">SELECCIÓN &amp; CONSOLIDADOS</span>
          </span>
        </a>
        <nav class="main-nav" id="main-nav">
          ${NAV_LINKS.map((l) => `<a href="${l.href}" class="${activo === l.href ? 'active' : ''}">${l.label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <div class="notif-wrap" id="notif-wrap" hidden>
            <button class="icon-btn" id="notif-toggle" aria-label="Notificaciones" aria-haspopup="true" aria-expanded="false">${ICONS.bell}<span class="cart-badge" id="notif-badge" hidden>0</span></button>
            <div class="notif-dropdown" id="notif-dropdown" hidden>
              <div class="notif-dropdown-head">
                <span>Notificaciones</span>
                <button type="button" id="notif-marcar-todas" class="link-arrow" style="font-size:0.7rem;">Marcar todas leídas</button>
              </div>
              <div id="notif-lista"><div class="notif-empty">Cargando…</div></div>
            </div>
          </div>
          <a href="cuenta.html" class="icon-btn account-label" id="nav-account-link">${ICONS.user}<span id="nav-account-label">Ingresar</span></a>
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

  configurarCampanitaNotificaciones();
}

function configurarCampanitaNotificaciones() {
  const btn = document.getElementById('notif-toggle');
  const dropdown = document.getElementById('notif-dropdown');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const abrir = dropdown.hidden;
    dropdown.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir) await cargarNotificacionesDropdown();
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== btn) {
      dropdown.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.getElementById('notif-marcar-todas')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await marcarTodasNotificacionesLeidas();
      await cargarNotificacionesDropdown();
      await actualizarBadgeNotificaciones();
    } catch { /* silencioso: no es una acción crítica */ }
  });
}

async function cargarNotificacionesDropdown() {
  const mount = document.getElementById('notif-lista');
  try {
    const notificaciones = await obtenerNotificaciones({ limite: 10 });
    mount.innerHTML = notificaciones.length ? notificaciones.map((n) => `
      <button type="button" class="notif-item ${n.leido ? '' : 'notif-item-nuevo'}" data-id="${n.id}" data-url="${n.url_destino || ''}">
        <strong>${escapeHtml(n.titulo)}</strong>
        <span>${escapeHtml(n.mensaje)}</span>
        <time>${new Date(n.fecha_creacion).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</time>
      </button>
    `).join('') : '<div class="notif-empty">Sin notificaciones por ahora.</div>';

    mount.querySelectorAll('.notif-item').forEach((item) => {
      item.addEventListener('click', async () => {
        const id = Number(item.dataset.id);
        try { await marcarNotificacionLeida(id); actualizarBadgeNotificaciones(); } catch { /* no crítico */ }
        if (item.dataset.url) window.location.href = item.dataset.url;
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="notif-empty">${err.message}</div>`;
  }
}

async function actualizarBadgeNotificaciones() {
  const wrap = document.getElementById('notif-wrap');
  const badge = document.getElementById('notif-badge');
  if (!wrap || !SUPABASE_CONFIGURADO) return;
  const session = await obtenerSesion();
  if (!session) { wrap.hidden = true; return; }
  wrap.hidden = false;
  try {
    const n = await contarNotificacionesNoLeidas();
    badge.textContent = n;
    badge.hidden = n === 0;
  } catch {
    badge.hidden = true;
  }
}

async function actualizarEstadoSesionHeader() {
  const label = document.getElementById('nav-account-label');
  const badge = document.getElementById('cart-badge');
  if (!SUPABASE_CONFIGURADO) return;

  const session = await obtenerSesion();
  if (label) {
    if (session) {
      const perfil = await obtenerPerfilActual();
      label.textContent = perfil?.nombres?.split(' ')[0] || 'Mi cuenta';
    } else {
      label.textContent = 'Ingresar';
    }
  }

  if (badge) {
    if (!session) { badge.hidden = true; return; }
    try {
      const items = await obtenerCarrito();
      const total = items.reduce((acc, i) => acc + i.cantidad, 0);
      badge.textContent = total;
      badge.hidden = total === 0;
    } catch {
      badge.hidden = true;
    }
  }

  await actualizarBadgeNotificaciones();
}

function renderWhatsappFloat() {
  if (document.querySelector('.whatsapp-float')) return;
  const a = document.createElement('a');
  a.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola, quisiera consultar sobre un perfume')}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'whatsapp-float';
  a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
  a.innerHTML = ICONS.whatsapp;
  document.body.appendChild(a);
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
              <span class="brand-icon">${ICONS.box}</span>
              <span class="brand-text">
                <span class="brand-name">Maison <span>Zadaca</span></span>
                <span class="brand-tagline">SELECCIÓN &amp; CONSOLIDADOS</span>
              </span>
            </a>
            <p>Perfumería importada seleccionada, disponible en tienda o mediante compras consolidadas a precio preferencial.</p>
            <div class="social-row">
              <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
              <a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 3v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M15 3c.5 2.5 2 4 5 4.3"/></svg></a>
              <a href="https://wa.me/${WHATSAPP_NUMERO}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12a9 9 0 1 1-4.2-7.6"/></svg></a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Tienda</h4>
            <a href="catalogo.html">Catálogo completo</a>
            <a href="catalogo.html?genero=Hombre">Para Hombre</a>
            <a href="catalogo.html?genero=Mujer">Para Mujer</a>
            <a href="consolidados.html">Consolidados activos</a>
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
            <p>Envíos vía Shalom / Olva a todo el Perú</p>
            <p>Pagos: Yape, Plin, transferencia y tarjeta</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span id="footer-year"></span> Maison Zadaca. Todos los derechos reservados.</span>
          <div class="payment-icons"><span>Visa</span><span>Mastercard</span><span>Yape</span><span>Plin</span></div>
        </div>
      </div>
    </footer>
  `;
  document.getElementById('footer-year').textContent = new Date().getFullYear();
}

function wireNewsletterForm(selector = '#newsletter-form') {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    try {
      await suscribirNewsletter(input.value);
      mostrarToast('¡Gracias por suscribirte!');
      form.reset();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

function tonoPorGenero(genero) {
  if (genero === 'Hombre') return 'tone-hombre';
  if (genero === 'Mujer') return 'tone-mujer';
  return 'tone-unisex';
}

// Si la imagen no carga, se reemplaza por el ícono de caja genérico. Antes esto se armaba
// como un atributo onerror="..." con el SVG completo metido adentro como texto — el SVG
// trae sus propias comillas dobles (viewBox="...", stroke="...") que cortaban el atributo
// HTML a la mitad, y el resto del string quedaba como texto suelto encima de la foto. Con
// una función global no hay strings anidados que escapar.
function manejarErrorImagenProducto(img) {
  const contenedor = document.createElement('span');
  contenedor.className = 'fallback-icon';
  contenedor.innerHTML = ICONS.box;
  img.replaceWith(contenedor);
}

function imagenProducto(p, claseExtra = '') {
  if (p.imagen_url) {
    return `<img src="${p.imagen_url}" alt="${escapeHtml(p.marca)} ${escapeHtml(p.nombre)}" loading="lazy" class="${claseExtra}" onerror="manejarErrorImagenProducto(this)" />`;
  }
  return `<span class="fallback-icon">${ICONS.box}</span>`;
}

function tarjetaProducto(p) {
  const final = precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = Number(p.descuento_tienda_porcentaje) > 0;
  const agotado = p.estado === 'Agotado';
  return `
    <a href="producto.html?slug=${p.slug}" class="product-card">
      <div class="product-media">
        ${imagenProducto(p)}
        <div class="product-badges">
          ${p.es_nuevo ? '<span class="badge badge-new">Nuevo</span>' : ''}
          ${tieneDescuento ? `<span class="badge badge-sale">-${Number(p.descuento_tienda_porcentaje)}%</span>` : ''}
          ${agotado ? '<span class="badge badge-out">Agotado</span>' : ''}
        </div>
      </div>
      <div class="product-info">
        <span class="product-brand">${escapeHtml(p.marca)}</span>
        <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
        <span class="product-meta">${escapeHtml(p.concentracion || '')}${p.mililitros ? ` · ${p.mililitros} ml` : ''}</span>
        <div class="product-price-row">
          <span class="price-current">${formatoMoneda(final)}</span>
          ${tieneDescuento ? `<span class="price-old">${formatoMoneda(p.precio_tienda_regular)}</span>` : ''}
        </div>
      </div>
    </a>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();
});
