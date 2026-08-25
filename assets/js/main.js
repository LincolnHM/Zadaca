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
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92Z"/></svg>`,
  idCard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h6M14 14h4"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a20.4 20.4 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  whatsapp: `<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.03 3C9.4 3 4 8.4 4 15.03c0 2.23.62 4.32 1.68 6.12L4 29l8.03-1.65a12 12 0 0 0 4 .68c6.63 0 12.03-5.4 12.03-12.03C28.06 8.4 22.66 3 16.03 3Zm0 21.94c-1.9 0-3.68-.5-5.24-1.4l-.38-.22-4.77.98.99-4.65-.25-.4a9.9 9.9 0 0 1-1.5-5.22c0-5.48 4.46-9.94 9.95-9.94 5.48 0 9.94 4.46 9.94 9.94 0 5.49-4.46 9.91-9.74 9.91Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17-.35.22-.65.07a8.14 8.14 0 0 1-2.4-1.48 9 9 0 0 1-1.66-2.06c-.17-.3 0-.46.13-.6.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.91-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.5.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/></svg>`,
};

// Logo real de la marca (assets/img/brand/logo.png) -- reemplaza el ícono de caja genérico
// en header, footer y el panel de la página de cuenta. alt="" porque es puramente decorativo
// junto al nombre "Maison Zadaca" en texto (evita que un lector de pantalla lo anuncie dos veces).
const LOGO_IMG = `<img src="${SITE_ROOT}assets/img/brand/logo.png" alt="" width="40" height="40" />`;

// Los href son relativos a SITE_ROOT (no a la página actual) -- así el mismo NAV_LINKS sirve
// para el header sin importar si la página que lo carga está en la raíz (index.html) o una
// carpeta adentro (catalogo/, contacto/, etc.). "activo" (parámetro de iniciarLayout) se
// compara contra estos mismos strings para marcar el link actual.
const NAV_LINKS = [
  { href: '', label: 'Inicio' },
  { href: 'catalogo/', label: 'Tienda' },
  { href: 'catalogo-consolidado/', label: 'Consolidado' },
  { href: 'decants/', label: 'Decants' },
  { href: 'liquidaciones/', label: 'Liquidaciones' },
  { href: 'contacto/', label: 'Contacto' },
];

async function iniciarLayout(activo) {
  renderHeaderEstatico(activo);
  renderFooter();
  renderWhatsappFloat();
  activarRevelado();
  activarScrollHeader();
  actualizarAnnounceBar();
  await actualizarEstadoSesionHeader();
}

const ESTADOS_CONSOLIDADO_LEGIBLES = {
  Borrador: 'Próximamente', Abierto: 'Abierto', Cerrado_Procesando: 'Cerrado — Procesando',
  Comprado_En_Transito: 'En tránsito', En_Aduanas: 'En aduanas', En_Almacen_Local: 'En almacén local',
  Finalizado: 'Finalizado', Cancelado: 'Cancelado',
};

// El negocio no quiere mostrarle al público cuántas unidades lleva reservadas un consolidado
// (antes cada tarjeta mostraba una barra de progreso + "% del mínimo alcanzado"). De cara al
// cliente el único indicador de qué tan viva sigue una campaña ahora es si está Abierta y
// cuánto tiempo le queda -- la cantidad real solo se ve en el panel admin (admin.js sigue
// mostrando unidades/porcentaje ahí, ese cálculo no se tocó).
function calcularTiempoRestanteConsolidado(fechaCierreProgramada) {
  const cierre = new Date(fechaCierreProgramada);
  const msRestante = cierre.getTime() - Date.now();
  const vencido = msRestante <= 0;
  const dias = Math.floor(msRestante / 86400000);
  const horas = Math.max(1, Math.round(msRestante / 3600000));
  const texto = vencido
    ? 'Cerrado'
    : dias >= 1
      ? `Queda${dias === 1 ? '' : 'n'} ${dias} día${dias === 1 ? '' : 's'}`
      : `Queda${horas === 1 ? '' : 'n'} ${horas} hora${horas === 1 ? '' : 's'}`;
  return { cierre, vencido, dias, horas, texto };
}

// Lo que de verdad cierra una campaña es la fecha límite, no solo el estado que el admin le
// puso -- si se olvida de cambiar el estado el día del cierre programado, esto igual la trata
// como cerrada de cara al cliente (el servidor la rechazaría de todos modos, ver api.js).
function consolidadoEstaAbierto(c) {
  return c.estado === 'Abierto' && !calcularTiempoRestanteConsolidado(c.fecha_cierre_programada).vencido;
}

// Tarjeta de consolidado compartida por home.js y consolidados/index.html (antes cada página
// tenía su propia copia casi idéntica, y habían divergido: una mostraba el estado crudo de la
// base de datos y la otra ya lo traducía con ESTADOS_LEGIBLES). Sin barra de progreso ni %:
// solo el estado y el tiempo que le queda.
function tarjetaConsolidado(c) {
  const abierto = consolidadoEstaAbierto(c);
  const { cierre, texto: cuentaRegresiva } = calcularTiempoRestanteConsolidado(c.fecha_cierre_programada);
  const cierreTexto = cierre.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
    <a href="${SITE_ROOT}consolidado/?id=${c.id}" class="consolidado-card">
      <span class="status-pill">${ESTADOS_CONSOLIDADO_LEGIBLES[c.estado] || c.estado}</span>
      <h3>${escapeHtml(c.codigo_campana)}</h3>
      <div class="cc-dates">Cierra el ${cierreTexto}</div>
      ${abierto ? `<div class="cc-countdown">${cuentaRegresiva} para reservar</div>` : ''}
      <span class="link-arrow">Ver detalle &rarr;</span>
    </a>
  `;
}

// Franja superior del header: por defecto un mensaje genérico, pero si hay algún consolidado
// Abierto lo reemplaza por un anuncio con el nombre de la campaña y el tiempo que le queda,
// linkeado directo a esa campaña -- así el cliente ve de entrada, en cualquier página del
// sitio, que hay una compra grupal activa sin tener que navegar a buscarla. Si falla la
// consulta o no hay ninguna abierta, se queda con el mensaje genérico (no es crítico).
async function actualizarAnnounceBar() {
  const bar = document.getElementById('announce-bar');
  if (!bar || !SUPABASE_CONFIGURADO) return;
  try {
    const consolidados = await obtenerConsolidados();
    const activos = consolidados
      .filter(consolidadoEstaAbierto)
      .sort((a, b) => new Date(a.fecha_cierre_programada) - new Date(b.fecha_cierre_programada));
    if (!activos.length) return;
    const c = activos[0];
    const { texto } = calcularTiempoRestanteConsolidado(c.fecha_cierre_programada);
    const extra = activos.length > 1 ? ` (y ${activos.length - 1} campaña${activos.length - 1 === 1 ? '' : 's'} más abierta${activos.length - 1 === 1 ? '' : 's'})` : '';
    bar.innerHTML = `<a href="${SITE_ROOT}consolidado/?id=${c.id}">CONSOLIDADO ABIERTO: ${escapeHtml(c.codigo_campana)}${extra} &mdash; ${texto} para reservar &rarr;</a>`;
  } catch {
    /* se queda con el mensaje genérico del HTML -- no es crítico para el resto del header */
  }
}

// Le agrega la clase "is-scrolled" al header apenas se baja de los primeros ~30px (más blur y
// sombra, ver style.css) -- con requestAnimationFrame para no recalcular en cada evento de
// scroll, solo una vez por frame como máximo.
function activarScrollHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let ticking = false;
  const actualizar = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 30);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(actualizar);
  });
  actualizar();
}

// Botón de ojo para mostrar/ocultar el texto de un <input type="password">. Espera el markup
// ".password-field" con el input seguido del botón ".toggle-password" como hermanos directos
// (ver cuenta.js) -- así funciona para cualquier cantidad de campos sin necesitar IDs.
function activarTogglesPassword(scope = document) {
  scope.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const mostrando = input.type === 'text';
      input.type = mostrando ? 'password' : 'text';
      btn.innerHTML = mostrando ? ICONS.eye : ICONS.eyeOff;
      btn.setAttribute('aria-label', mostrando ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });
}

// Aparición suave de secciones al hacer scroll (".reveal" en el HTML estático de cada
// página). Si el usuario prefiere menos movimiento, se saltea el observer y se muestra todo
// de una — la regla CSS que oculta ".reveal" ni siquiera aplica en ese caso (ver style.css).
function activarRevelado() {
  // .reveal-grid también se observa acá (antes solo se observaba .reveal): el CSS que anima
  // los hijos en cascada es ".reveal-grid.is-visible > *" — necesita is-visible en el propio
  // elemento reveal-grid, no en un ancestro. Sin esto, esa animación nunca se disparaba.
  const elementos = document.querySelectorAll('.reveal, .reveal-grid');
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
    <div class="announce-bar" id="announce-bar">ENVÍOS A TODO EL PERÚ &mdash; RESERVA TU PERFUME EN NUESTROS CONSOLIDADOS</div>
    <header class="site-header">
      <div class="header-inner container">
        <a href="${SITE_ROOT}" class="brand">
          <span class="brand-icon">${LOGO_IMG}</span>
          <span class="brand-text">
            <span class="brand-name">Maison <span>Zadaca</span></span>
            <span class="brand-tagline">SELECCIÓN &amp; CONSOLIDADOS</span>
          </span>
        </a>
        <div class="nav-backdrop" id="nav-backdrop" hidden></div>
        <nav class="main-nav" id="main-nav">
          ${NAV_LINKS.map((l) => `<a href="${SITE_ROOT}${l.href}" class="${activo === l.href ? 'active' : ''}">${l.label}</a>`).join('')}
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
          <a href="${SITE_ROOT}cuenta/" class="icon-btn account-label" id="nav-account-link">${ICONS.user}<span id="nav-account-label">Ingresar</span></a>
          <div class="cart-wrap" id="cart-wrap">
            <button class="icon-btn" id="cart-toggle" aria-label="Carrito" aria-haspopup="true" aria-expanded="false">${ICONS.bag}<span class="cart-badge" id="cart-badge" hidden>0</span></button>
            <div class="cart-dropdown" id="cart-dropdown" hidden>
              <div class="notif-dropdown-head"><span>Tu Carrito</span></div>
              <div id="cart-dropdown-lista"><div class="notif-empty">Cargando…</div></div>
              <div class="cart-dropdown-foot" id="cart-dropdown-foot" hidden>
                <div class="cart-dropdown-total"><span>Subtotal</span><span id="cart-dropdown-subtotal"></span></div>
                <a href="${SITE_ROOT}carrito/" class="btn btn-primary btn-block btn-sm">Ir al Carrito</a>
              </div>
            </div>
          </div>
          <button class="menu-toggle" id="menu-toggle" aria-label="Menú">${ICONS.menu}</button>
        </div>
      </div>
    </header>
  `;

  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  const backdrop = document.getElementById('nav-backdrop');
  const cerrarMenu = () => {
    nav.classList.remove('open');
    backdrop.hidden = true;
    toggle.innerHTML = ICONS.menu;
  };
  toggle.addEventListener('click', () => {
    const abrir = !nav.classList.contains('open');
    nav.classList.toggle('open', abrir);
    backdrop.hidden = !abrir;
    toggle.innerHTML = abrir ? ICONS.close : ICONS.menu;
  });
  backdrop.addEventListener('click', cerrarMenu);
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', cerrarMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

  configurarCampanitaNotificaciones();
  configurarCarritoDropdown();
}

// Mini-carrito desplegable del header: mismo patrón que la campanita de notificaciones (abre
// al click, se cierra al click afuera), pero en vez de navegar directo a carrito.html al
// tocar la bolsa, esto la muestra como vista previa -- "Ir al Carrito" adentro sigue llevando
// a la página completa para editar cantidades/checkout.
function configurarCarritoDropdown() {
  const btn = document.getElementById('cart-toggle');
  const dropdown = document.getElementById('cart-dropdown');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const abrir = dropdown.hidden;
    dropdown.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir) await cargarCarritoDropdown();
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      dropdown.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

async function cargarCarritoDropdown() {
  const mount = document.getElementById('cart-dropdown-lista');
  const foot = document.getElementById('cart-dropdown-foot');
  if (!mount) return;
  if (!SUPABASE_CONFIGURADO) { mount.innerHTML = '<div class="notif-empty">Carrito no disponible.</div>'; foot.hidden = true; return; }
  const session = await obtenerSesion();
  if (!session) {
    mount.innerHTML = '<div class="notif-empty">Inicia sesión para ver tu carrito.</div>';
    foot.hidden = true;
    return;
  }
  try {
    const items = await obtenerCarrito();
    if (!items.length) {
      mount.innerHTML = '<div class="notif-empty">Tu carrito está vacío.</div>';
      foot.hidden = true;
      return;
    }
    let total = 0;
    mount.innerHTML = items.map((item) => {
      const final = item.es_liquidacion ? Number(item.precio_liquidacion) : precioFinal(item.precio_tienda_regular, item.descuento_tienda_porcentaje);
      total += final * item.cantidad;
      return `
        <div class="cart-drop-item">
          <div class="cart-drop-media">${imagenProducto(item)}</div>
          <div class="cart-drop-info">
            <span class="cart-drop-name">${escapeHtml(item.marca)} — ${escapeHtml(item.nombre)}</span>
            <span class="cart-drop-meta">${item.cantidad} &times; ${formatoMoneda(final)}</span>
          </div>
        </div>`;
    }).join('');
    document.getElementById('cart-dropdown-subtotal').textContent = formatoMoneda(total);
    foot.hidden = false;
  } catch (err) {
    mount.innerHTML = `<div class="notif-empty">${err.message}</div>`;
    foot.hidden = true;
  }
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
      <button type="button" class="notif-item ${n.leido ? '' : 'notif-item-nuevo'}" data-id="${n.id}" data-url="${n.url_destino ? escapeHtml(SITE_ROOT + n.url_destino) : ''}">
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

// Reinicia la animación de "bump" del badge (cantidad de carrito/notificaciones) sacando y
// devolviendo la clase que la dispara -- si el elemento ya estaba visible (ej. ya tenías 1
// perfume y agregas un segundo), solo cambiar el texto no vuelve a disparar la animación de
// CSS por sí solo.
function pulsarBadge(id) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.classList.remove('badge-pop');
  void badge.offsetWidth; // fuerza reflow para que el navegador "olvide" el estado anterior
  badge.classList.add('badge-pop');
}

// Clona el ícono de la bolsa y lo anima "volando" desde el botón donde se hizo click hasta
// el ícono del carrito en el header -- confirmación visual de que el producto se agregó, en
// vez de depender solo de que el cliente note que cambió el numerito del badge.
function animarAgregarCarrito(origenEl) {
  pulsarBadge('cart-badge');
  const destino = document.getElementById('cart-toggle');
  if (!origenEl || !destino || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const origenRect = origenEl.getBoundingClientRect();
  const destinoRect = destino.getBoundingClientRect();
  const vuelo = document.createElement('div');
  vuelo.className = 'cart-fly-icon';
  vuelo.innerHTML = ICONS.bag;
  vuelo.style.left = `${origenRect.left + origenRect.width / 2 - 11}px`;
  vuelo.style.top = `${origenRect.top + origenRect.height / 2 - 11}px`;
  document.body.appendChild(vuelo);

  const dx = (destinoRect.left + destinoRect.width / 2) - (origenRect.left + origenRect.width / 2);
  const dy = (destinoRect.top + destinoRect.height / 2) - (origenRect.top + origenRect.height / 2);
  requestAnimationFrame(() => {
    vuelo.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
    vuelo.style.opacity = '0';
  });
  vuelo.addEventListener('transitionend', () => vuelo.remove(), { once: true });
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
            <a href="${SITE_ROOT}" class="brand">
              <span class="brand-icon">${LOGO_IMG}</span>
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
            <a href="${SITE_ROOT}catalogo/">Catálogo en stock</a>
            <a href="${SITE_ROOT}catalogo/?genero=Hombre">Para Hombre</a>
            <a href="${SITE_ROOT}catalogo/?genero=Mujer">Para Mujer</a>
            <a href="${SITE_ROOT}decants/">Decants</a>
            <a href="${SITE_ROOT}liquidaciones/">Liquidaciones</a>
          </div>
          <div class="footer-col">
            <h4>Consolidado</h4>
            <a href="${SITE_ROOT}catalogo-consolidado/">Catálogo consolidado</a>
            <a href="${SITE_ROOT}consolidados/">Campañas activas</a>
            <a href="${SITE_ROOT}contacto/">Cómo funciona</a>
          </div>
          <div class="footer-col">
            <h4>Empresa</h4>
            <a href="${SITE_ROOT}contacto/">Solicitar cotización</a>
            <a href="${SITE_ROOT}contacto/">Contacto</a>
            <a href="${SITE_ROOT}cuenta/">Mi cuenta</a>
          </div>
          <div class="footer-col">
            <h4>Ayuda</h4>
            <a href="${SITE_ROOT}contacto/#tiendas">Tienda Chiclayo: Av. Los Incas 1090, La Victoria</a>
            <a href="${SITE_ROOT}contacto/#tiendas">Almacén Lima: Jr. Ávila Godoy 664, SMP</a>
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
    // imagen_url en la base de datos es una ruta relativa (ej. "assets/img/perfumes/x.jpg"),
    // pensada para resolverse desde la raíz del sitio -- con new URL(..., SITE_ROOT) queda
    // absoluta y funciona igual sin importar en qué carpeta (catalogo/, producto/, etc.) se
    // esté pintando esta tarjeta.
    return `<img src="${new URL(p.imagen_url, SITE_ROOT).href}" alt="${escapeHtml(p.marca)} ${escapeHtml(p.nombre)}" loading="lazy" class="${claseExtra}" onerror="manejarErrorImagenProducto(this)" />`;
  }
  return `<span class="fallback-icon">${ICONS.box}</span>`;
}

function tarjetaProducto(p) {
  const esLiquidacion = !!p.es_liquidacion;
  const final = esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje);
  const tieneDescuento = !esLiquidacion && Number(p.descuento_tienda_porcentaje) > 0;
  // "estado" es un campo manual que el admin no mantiene al día (ver misma nota en
  // producto.js) -- stock_disponible es el dato real, así que la badge "Agotado" también
  // tiene que mirarlo, o quedan productos sin stock mostrándose como disponibles en la
  // grilla del catálogo.
  const agotado = p.estado === 'Agotado' || p.stock_disponible <= 0;
  return `
    <a href="${SITE_ROOT}producto/?slug=${p.slug}" class="product-card">
      <div class="product-media">
        ${imagenProducto(p)}
        <div class="product-badges">
          ${p.es_nuevo ? '<span class="badge badge-new">Nuevo</span>' : ''}
          ${esLiquidacion ? '<span class="badge badge-liquidacion">Liquidación</span>' : ''}
          ${p.es_decant ? '<span class="badge badge-decant">Decant</span>' : ''}
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
        ${esLiquidacion ? `<div class="liq-unidad-note">${p.liquidacion_unidad_minima > 1 ? `Solo por mayor · mínimo ${p.liquidacion_unidad_minima} unidades` : 'Por unidad o por mayor'}</div>` : ''}
      </div>
    </a>
  `;
}

// Tarjeta del catálogo de CONSOLIDADO: mismo layout que tarjetaProducto(), pero con
// precio_consolidado_fijo (no hay descuento de tienda ni estado "Agotado" — un consolidado se
// importa bajo pedido, no depende del stock físico) y una nota de "unidad mínima" en vez de
// las badges de tienda.
function tarjetaProductoConsolidado(p) {
  return `
    <a href="${SITE_ROOT}producto/?slug=${p.slug}" class="product-card">
      <div class="product-media">
        ${imagenProducto(p)}
        <div class="product-badges">
          ${p.es_nuevo ? '<span class="badge badge-new">Nuevo</span>' : ''}
          <span class="badge badge-consolidado">Consolidado</span>
        </div>
      </div>
      <div class="product-info">
        <span class="product-brand">${escapeHtml(p.marca)}</span>
        <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
        <span class="product-meta">${escapeHtml(p.concentracion || '')}${p.mililitros ? ` · ${p.mililitros} ml` : ''}</span>
        <div class="product-price-row">
          <span class="price-current">${formatoMoneda(p.precio_consolidado_fijo)}</span>
        </div>
        <div class="liq-unidad-note">Precio consolidado · desde 4 unidades</div>
      </div>
    </a>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();
});
