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
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z"/><path d="M4 17a3 3 0 0 1 3-3h11"/><path d="M8 8h6"/></svg>`,
  drop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7s6 6.6 6 11.3a6 6 0 0 1-12 0c0-4.7 6-11.3 6-11.3Z"/></svg>`,
  plane: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 3v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M15 3c.5 2.5 2 4 5 4.3"/></svg>`,
};

// Logo real de la marca (assets/img/brand/logo.png) -- reemplaza el ícono de caja genérico
// en header, footer y el panel de la página de cuenta. alt="" porque es puramente decorativo
// junto al nombre "Maison Zadaca" en texto (evita que un lector de pantalla lo anuncie dos veces).
const LOGO_IMG = `<img src="${SITE_ROOT}assets/img/brand/logo.png" alt="" width="40" height="40" />`;

// Los href son relativos a SITE_ROOT (no a la página actual) -- así el mismo NAV_LINKS sirve
// para el header sin importar si la página que lo carga está en la raíz (index.html) o una
// carpeta adentro (catalogo/, contacto/, etc.). "activo" (parámetro de iniciarLayout) se
// compara contra estos mismos strings para marcar el link actual.
// El link a Consolidado solo aparece con CONSOLIDADOS_ACTIVOS (ver api.js).
const NAV_LINKS = [
  { href: '', label: 'Inicio' },
  { href: 'catalogo/', label: 'Tienda' },
  { href: 'catalogo-consolidado/', label: 'Consolidado', soloConsolidados: true },
  { href: 'decants/', label: 'Decants' },
  { href: 'liquidaciones/', label: 'Liquidaciones' },
  // Maizon Zadaca Courier (USA → Perú): sección aparte con sus propios colores (courier/).
  { href: 'courier/', label: 'Courier USA', clase: 'nav-courier' },
  { href: 'contacto/', label: 'Contacto' },
].filter((l) => !l.soloConsolidados || CONSOLIDADOS_ACTIVOS);

const TAGLINE_MARCA = 'PERFUMES &amp; DECANTS';

async function iniciarLayout(activo) {
  aplicarVisibilidadConsolidados();
  // Botones "Cotizar por WhatsApp" del HTML estático: el link se arma con el mensaje listo.
  document.querySelectorAll('[data-whatsapp-consolidado]').forEach((a) => { a.href = enlaceWhatsappConsolidado(a.dataset.whatsappConsolidado || ''); });
  renderHeaderEstatico(activo);
  renderFooter();
  renderWhatsappFloat();
  activarRevelado();
  activarScrollHeader();
  actualizarAnnounceBar();
  // No se espera (fire-and-forget): es cosmético (footer, textos de "4 unidades/7-14
  // días/domingos" repetidos en varias páginas -- ver aplicarConfiguracionSitio) y no debe
  // demorar el resto del layout ni la verificación de sesión de abajo.
  aplicarConfiguracionDelSitio();
  cargarPublicidadPopup();
  await actualizarEstadoSesionHeader();
}

// Anuncio editable desde el panel → Publicidad (título, descripción, fotos y botón). Sale al
// entrar a la página (en todas o solo en el inicio, según lo elija el admin), una sola vez por
// visita; si el admin cambia el contenido vuelve a salir. No se muestra en páginas donde
// estorbaría (carritos, cuenta, reclamos y políticas). Cualquier fallo se ignora: es un
// adorno, no puede romper la página.
const PAGINAS_SIN_ANUNCIO = ['carrito', 'carrito-avion', 'cuenta', 'admin', 'libro-de-reclamaciones', 'politica-privacidad', 'terminos-condiciones', 'cambios-y-devoluciones'];
async function cargarPublicidadPopup() {
  try {
    const seccion = window.location.pathname.split('/').filter(Boolean)[0] || '';
    if (PAGINAS_SIN_ANUNCIO.includes(seccion)) return;
    const promo = await obtenerPublicidadPopup();
    if (!publicidadVigente(promo)) return;
    if (promo.mostrar_en === 'inicio' && seccion !== '') return;
    const clave = `promo-popup-visto-${promo.actualizado_en}`;
    try {
      if (sessionStorage.getItem(clave)) return;
    } catch { /* sessionStorage bloqueado (modo privado, etc.) -- se muestra igual */ }
    mostrarPublicidadPopup(promo, {
      alCerrar: () => { try { sessionStorage.setItem(clave, '1'); } catch { /* no pasa nada si no se puede recordar */ } },
    });
  } catch (err) {
    console.error(err);
  }
}

// Trae la fila única de configuracion_sitio (panel admin → Configuración del Sitio) y llena
// cualquier elemento marcado con [data-cfg]/[data-cfg-href] en la página actual, además del
// footer y las redes sociales. Si falla o Supabase no está configurado, la página se queda con
// los valores por defecto que ya vienen escritos en el HTML -- no es crítico.
async function aplicarConfiguracionDelSitio() {
  if (!SUPABASE_CONFIGURADO) return;
  try {
    const cfg = await obtenerConfiguracionSitio();
    aplicarConfiguracionSitio(cfg);
  } catch (err) {
    console.error(err);
  }
}

function aplicarConfiguracionSitio(cfg) {
  if (!cfg) return;
  const chiclayo = document.getElementById('footer-dir-chiclayo');
  if (chiclayo) chiclayo.textContent = `Tienda Chiclayo: ${cfg.direccion_chiclayo}`;
  const lima = document.getElementById('footer-dir-lima');
  if (lima) lima.textContent = `Almacén Lima: ${cfg.direccion_lima}`;
  const envioTexto = document.getElementById('footer-envio-texto');
  if (envioTexto) envioTexto.textContent = `Envíos vía ${cfg.envio_transportistas} a todo el Perú`;
  const pagoTexto = document.getElementById('footer-pago-texto');
  if (pagoTexto) pagoTexto.textContent = `Pagos: ${cfg.metodos_pago_texto}`;
  aplicarRedesSociales(cfg);
  aplicarDatosLegalesFooter(cfg);

  // Convención genérica para el resto del sitio (info-grid del home, FAQ, términos, etc.):
  // el HTML nace con el valor de siempre como fallback visible, y esto lo pisa si Supabase
  // responde. [data-cfg] llena texto, [data-cfg-href] llena un href (ej. links a Google Maps).
  // Valores derivados para las páginas legales: el correo de reclamos cae al de contacto si no
  // se cargó uno propio, y la fecha de las políticas se muestra en texto ("27 de septiembre de 2026").
  const valores = {
    ...cfg,
    correo_reclamos: correoLegal(cfg),
    politicas_fecha_texto: cfg.politicas_actualizadas_el
      ? new Date(`${cfg.politicas_actualizadas_el}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
      : null,
  };
  document.querySelectorAll('[data-cfg]').forEach((el) => {
    const valor = valores[el.dataset.cfg];
    if (valor !== null && valor !== undefined && valor !== '') {
      el.textContent = valor;
      el.classList.remove('dato-pendiente');
    }
  });
  document.querySelectorAll('[data-cfg-href]').forEach((el) => {
    const valor = cfg[el.dataset.cfgHref];
    if (valor) el.href = valor;
  });
}

// Instagram/TikTok/Facebook nacen ocultos en el footer (antes Instagram y TikTok apuntaban a
// "#", un link muerto) -- solo se muestran si el admin cargó una URL real desde Configuración
// del Sitio.
function aplicarRedesSociales(cfg) {
  [
    ['social-instagram', 'instagram_url'],
    ['social-tiktok', 'tiktok_url'],
    ['social-tiktok-2', 'tiktok_url_2'],
    ['social-facebook', 'facebook_url'],
  ].forEach(([id, campo]) => {
    const el = document.getElementById(id);
    if (el && cfg[campo]) {
      el.href = cfg[campo];
      el.hidden = false;
    }
  });
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
  if (!bar || !SUPABASE_CONFIGURADO || !CONSOLIDADOS_ACTIVOS) return;
  try {
    const consolidados = await obtenerConsolidados();
    const activos = consolidados
      .filter(consolidadoEstaAbierto)
      .sort((a, b) => new Date(a.fecha_cierre_programada) - new Date(b.fecha_cierre_programada));
    if (!activos.length) return;
    const c = activos[0];
    const { texto } = calcularTiempoRestanteConsolidado(c.fecha_cierre_programada);
    bar.innerHTML = `<a href="${SITE_ROOT}catalogo-consolidado/" class="announce-avion">${ICONS.plane}<span class="solo-desktop">CONSOLIDADO ABIERTO: ${escapeHtml(c.codigo_campana)} &mdash; ${texto.toUpperCase()} PARA ARMAR TU CARRITO DE AVIÓN &rarr;</span><span class="solo-movil">CONSOLIDADO ABIERTO &mdash; ${texto.toUpperCase()} &rarr;</span></a>`;
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

// Markup del bloque de contraseña + confirmar, con checklist de requisitos en vivo -- usado
// por el registro de cuenta.js, el checkout de invitado de carrito.js y "restablecer
// contraseña". "prefix" evita que los ids choquen si dos instancias conviven en la misma
// página (no pasa hoy, pero deja la puerta abierta).
function formularioContrasenaHtml(prefix) {
  return `
    <div class="form-group has-icon">
      <label>Nueva contraseña</label>
      <div class="input-wrap password-field">
        <span class="form-icon">${ICONS.lock}</span>
        <input type="password" name="contrasena" id="${prefix}-contrasena" minlength="8" autocomplete="new-password" required />
        <button type="button" class="toggle-password" aria-label="Mostrar contraseña">${ICONS.eye}</button>
      </div>
    </div>
    <ul class="pwd-requirements" id="${prefix}-requirements" aria-live="polite">
      <li data-req="longitud"><span class="pwd-req-mark">•</span> Mínimo 8 caracteres</li>
      <li data-req="mayuscula"><span class="pwd-req-mark">•</span> Una letra mayúscula</li>
      <li data-req="numero"><span class="pwd-req-mark">•</span> Un número</li>
      <li data-req="especial"><span class="pwd-req-mark">•</span> Un carácter especial (ej. ! @ # $)</li>
    </ul>
    <div class="form-group has-icon">
      <label>Repetir Contraseña</label>
      <div class="input-wrap password-field">
        <span class="form-icon">${ICONS.lock}</span>
        <input type="password" name="confirmar_contrasena" id="${prefix}-confirmar" autocomplete="new-password" required />
        <button type="button" class="toggle-password" aria-label="Mostrar contraseña">${ICONS.eye}</button>
      </div>
      <p class="form-hint" id="${prefix}-confirmar-hint"></p>
    </div>
  `;
}

function evaluarPassword(valor) {
  const v = valor || '';
  return {
    longitud: v.length >= 8,
    mayuscula: /[A-Z]/.test(v),
    numero: /[0-9]/.test(v),
    especial: /[^A-Za-z0-9]/.test(v),
  };
}
function passwordValida(valor) {
  return Object.values(evaluarPassword(valor)).every(Boolean);
}

// prefix identifica qué instancia del formulario (ver formularioContrasenaHtml): 'registro',
// 'restablecer' (link del correo), 'cambiar' (Seguridad, ya logueado) o 'checkout' (checkout
// de invitado en carrito.js) -- misma lógica, distintos IDs, así que ninguna copia puede
// divergir en los requisitos.
function actualizarValidacionContrasena(prefix, submitId) {
  const passInput = document.getElementById(`${prefix}-contrasena`);
  const confirmInput = document.getElementById(`${prefix}-confirmar`);
  const confirmHint = document.getElementById(`${prefix}-confirmar-hint`);
  const submitBtn = document.getElementById(submitId);
  if (!passInput) return;

  const estado = evaluarPassword(passInput.value);
  document.querySelectorAll(`#${prefix}-requirements li`).forEach((li) => {
    const ok = estado[li.dataset.req];
    li.classList.toggle('valid', ok);
    li.querySelector('.pwd-req-mark').textContent = ok ? '✓' : '•';
  });

  let coincide = true;
  if (confirmInput.value) {
    coincide = confirmInput.value === passInput.value;
    confirmHint.textContent = coincide ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.';
    confirmHint.className = `form-hint ${coincide ? 'pwd-match-ok' : 'pwd-match-error'}`;
  } else {
    confirmHint.textContent = '';
    confirmHint.className = 'form-hint';
  }

  submitBtn.disabled = !(Object.values(estado).every(Boolean) && confirmInput.value && coincide);
}

function conectarValidacionContrasena(prefix, submitId) {
  const actualizar = () => actualizarValidacionContrasena(prefix, submitId);
  document.getElementById(`${prefix}-contrasena`).addEventListener('input', actualizar);
  document.getElementById(`${prefix}-confirmar`).addEventListener('input', actualizar);
}

// Departamento -> Provincia -> Distrito en cascada. Con 1874 distritos en la tabla ubigeo
// (ver supabase/carga_ubigeo_completo.sql) un solo <select> con todos sería inmanejable --
// esto reduce cada paso a una lista corta (24 departamentos, ~5-20 provincias, ~5-30 distritos).
// Usado por "Mis Direcciones" (cuenta.js) y el checkout de invitado (carrito.js).
function iniciarSelectsUbigeoCascada(ubigeos) {
  const deptoSel = document.getElementById('ubigeo-depto-select');
  const provSel = document.getElementById('ubigeo-prov-select');
  const distSel = document.getElementById('ubigeo-dist-select');

  deptoSel.addEventListener('change', () => {
    const depto = deptoSel.value;
    const provincias = [...new Set(ubigeos.filter((u) => u.departamento === depto).map((u) => u.provincia))].sort();
    provSel.innerHTML = '<option value="">Selecciona...</option>' + provincias.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    provSel.disabled = !depto;
    distSel.innerHTML = '<option value="">Elige primero la provincia</option>';
    distSel.disabled = true;
  });

  provSel.addEventListener('change', () => {
    const depto = deptoSel.value;
    const prov = provSel.value;
    const distritos = ubigeos
      .filter((u) => u.departamento === depto && u.provincia === prov)
      .sort((a, b) => a.distrito.localeCompare(b.distrito));
    distSel.innerHTML = '<option value="">Selecciona...</option>' + distritos.map((d) => `<option value="${d.codigo_ubigeo}">${escapeHtml(d.distrito)}</option>`).join('');
    distSel.disabled = !prov;
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
    <div class="announce-bar" id="announce-bar">${CONSOLIDADOS_ACTIVOS
      ? `<a href="${SITE_ROOT}catalogo-consolidado/" class="announce-avion">${ICONS.plane}<span class="solo-desktop">CONSOLIDADO: ARMA TU CARRITO DE AVIÓN DESDE <span data-cfg="consolidado_minimo_unidades">4</span> UNIDADES</span><span class="solo-movil">CONSOLIDADO DESDE <span data-cfg="consolidado_minimo_unidades">4</span> UNIDADES &rarr;</span></a><span class="solo-desktop"> &nbsp;&middot;&nbsp; <a href="${enlaceWhatsappConsolidado()}" target="_blank" rel="noopener">COTIZA AL WHATSAPP ${formatoWhatsapp()} &rarr;</a></span>`
      : `<a href="${enlaceWhatsappConsolidado()}" target="_blank" rel="noopener">¿NO ESTÁ EN STOCK? TE LO TRAEMOS POR CONSOLIDADO &mdash; COTIZA AL WHATSAPP ${formatoWhatsapp()} &rarr;</a>`}</div>
    <header class="site-header">
      <div class="header-inner container">
        <a href="${SITE_ROOT}" class="brand">
          <span class="brand-icon">${LOGO_IMG}</span>
          <span class="brand-text">
            <span class="brand-name">Maison <span>Zadaca</span></span>
            <span class="brand-tagline">${TAGLINE_MARCA}</span>
          </span>
        </a>
        <div class="nav-backdrop" id="nav-backdrop" hidden></div>
        <nav class="main-nav" id="main-nav">
          ${NAV_LINKS.map((l) => `<a href="${SITE_ROOT}${l.href}" class="${[activo === l.href ? 'active' : '', l.clase || ''].join(' ').trim()}">${l.clase === 'nav-courier' ? ICONS.plane : ''}${l.label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <button type="button" class="icon-btn search-toggle" id="search-toggle" aria-label="Buscar perfumes" aria-expanded="false">${ICONS.search}</button>
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
          ${CONSOLIDADOS_ACTIVOS ? `<div class="cart-wrap avion-wrap" id="avion-wrap">
            <button class="icon-btn avion-toggle" id="avion-toggle" aria-label="Carrito de Avión (consolidado)" title="Carrito de Avión — pedidos por consolidado" aria-haspopup="true" aria-expanded="false">${ICONS.plane}<span class="cart-badge avion-badge" id="avion-badge" hidden>0</span></button>
            <div class="cart-dropdown avion-dropdown" id="avion-dropdown" hidden>
              <div class="notif-dropdown-head avion-dropdown-head"><span class="avion-title">${ICONS.plane} Carrito de Avión</span><span class="avion-head-tag">Consolidado</span></div>
              <div id="avion-dropdown-lista"></div>
              <div class="cart-dropdown-foot" id="avion-dropdown-foot"></div>
            </div>
          </div>` : ''}
          <div class="cart-wrap" id="cart-wrap">
            <button class="icon-btn" id="cart-toggle" aria-label="Carrito de tienda" title="Carrito de tienda y decants" aria-haspopup="true" aria-expanded="false">${ICONS.bag}<span class="cart-badge" id="cart-badge" hidden>0</span></button>
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
    <div class="global-search" id="global-search" hidden>
      <div class="global-search-backdrop" id="global-search-backdrop"></div>
      <div class="global-search-panel" role="dialog" aria-label="Buscar en la tienda">
        <form class="global-search-form" id="global-search-form" role="search">
          <span class="global-search-icon">${ICONS.search}</span>
          <input type="search" id="global-search-input" placeholder="Perfume, marca o el que te gusta (ej. Sauvage)" autocomplete="off" aria-label="Buscar" />
          <button type="button" class="global-search-close" id="global-search-close" aria-label="Cerrar">${ICONS.close}</button>
        </form>
        <div class="global-search-results" id="global-search-results">
          <p class="global-search-hint">Busca por nombre, por marca o por el perfume de diseñador que te gusta: te mostramos también sus equivalentes.</p>
        </div>
      </div>
    </div>
  `;
  iniciarBuscadorGlobal();

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
  configurarAvionDropdown();
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
    if (abrir) cerrarAvionDropdown();
    dropdown.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir) { await cargarCarritoDropdown(); encajarEnPantalla(dropdown); }
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
  try {
    const items = await obtenerCarrito();
    if (!items.length) {
      mount.innerHTML = '<div class="notif-empty">Tu carrito está vacío.</div>';
      foot.hidden = true;
      return;
    }
    let total = 0;
    mount.innerHTML = items.map((item) => {
      // Mismo cálculo que precioFinalItem() en carrito.js (no se puede llamar directo desde
      // acá: ese archivo no se carga en páginas sin carrito.html) -- sin esto, un decant o una
      // liquidación en la vista previa del header mostraba el precio de tienda normal, no el
      // que de verdad se le cobra.
      const final = item.es_decant
        ? (precioTallaDecant(item, item.talla_ml) ?? 0)
        : item.es_liquidacion ? Number(item.precio_liquidacion) : precioFinal(item.precio_tienda_regular, item.descuento_tienda_porcentaje);
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

/* ---------- Carrito de Avión (consolidado) en el encabezado ---------- */

// Mismo patrón que el mini-carrito de la bolsa, pero con el avión: es otro carrito (pedidos por
// consolidado, ver leerCarritoAvion en api.js) y se ve distinto a propósito para que nadie los
// confunda. El número del avión son UNIDADES (el mínimo por pedido se cuenta en unidades).
let MINIMO_AVION = 4;

function configurarAvionDropdown() {
  const btn = document.getElementById('avion-toggle');
  const dropdown = document.getElementById('avion-dropdown');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = dropdown.hidden;
    if (abrir) {
      const carrito = document.getElementById('cart-dropdown');
      if (carrito) { carrito.hidden = true; document.getElementById('cart-toggle')?.setAttribute('aria-expanded', 'false'); }
    }
    dropdown.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir) { renderAvionDropdown(); encajarEnPantalla(dropdown); }
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && !btn.contains(e.target)) cerrarAvionDropdown();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarAvionDropdown(); });
  document.addEventListener('carrito-avion', () => { actualizarBadgeAvion(); if (!dropdown.hidden) renderAvionDropdown(); });
  // Otra pestaña del mismo navegador cambió el carrito.
  window.addEventListener('storage', (e) => { if (e.key === CLAVE_CARRITO_AVION) actualizarBadgeAvion(); });
  obtenerConfiguracionSitio().then((cfg) => { MINIMO_AVION = minimoUnidadesConsolidado(cfg); }).catch(() => {});
  actualizarBadgeAvion();
}

function cerrarAvionDropdown() {
  const dropdown = document.getElementById('avion-dropdown');
  if (!dropdown || dropdown.hidden) return;
  dropdown.hidden = true;
  document.getElementById('avion-toggle')?.setAttribute('aria-expanded', 'false');
}

function actualizarBadgeAvion() {
  const badge = document.getElementById('avion-badge');
  if (!badge) return;
  const unidades = unidadesCarritoAvion();
  badge.textContent = unidades > 99 ? '99+' : unidades;
  badge.hidden = unidades === 0;
}

// Barra "X de 4 unidades mínimas" (compartida por el mini-carrito, el catálogo y la página del
// Carrito de Avión).
function htmlProgresoAvion(unidades, minimo) {
  const faltan = Math.max(minimo - unidades, 0);
  return `
    <div class="avion-progreso">
      <div class="progress-track"><div class="progress-fill" style="width:${Math.min(Math.round((100 * unidades) / minimo), 100)}%"></div></div>
      <div class="progress-label"><span>${unidades} de ${minimo} unidades mínimas</span><span>${faltan > 0 ? `Faltan ${faltan}` : '¡Mínimo completo!'}</span></div>
    </div>`;
}

function renderAvionDropdown() {
  const mount = document.getElementById('avion-dropdown-lista');
  const foot = document.getElementById('avion-dropdown-foot');
  if (!mount) return;
  const items = leerCarritoAvion();
  if (!items.length) {
    mount.innerHTML = `<div class="notif-empty">Tu Carrito de Avión está vacío.<span class="avion-empty-sub">Aquí van los perfumes que te traemos por consolidado — es aparte de tu carrito de tienda.</span></div>`;
    foot.innerHTML = `<a href="${SITE_ROOT}catalogo-consolidado/" class="btn btn-primary btn-block btn-sm">Ver Catálogo Consolidado</a>`;
    return;
  }
  const visibles = items.slice(0, 5);
  const resto = items.length - visibles.length;
  mount.innerHTML = visibles.map((item) => `
    <div class="cart-drop-item">
      <div class="cart-drop-media">${imagenProducto(item)}</div>
      <div class="cart-drop-info">
        <span class="cart-drop-name">${escapeHtml(item.marca)} — ${escapeHtml(item.nombre)}</span>
        <span class="cart-drop-meta">${item.cantidad} &times; ${formatoMoneda(item.precio)}</span>
      </div>
    </div>`).join('') + (resto > 0 ? `<div class="avion-drop-mas">y ${resto} perfume${resto === 1 ? '' : 's'} más</div>` : '');
  foot.innerHTML = `
    ${htmlProgresoAvion(unidadesCarritoAvion(items), MINIMO_AVION)}
    <div class="cart-dropdown-total"><span>Subtotal consolidado</span><span>${formatoMoneda(totalCarritoAvion(items))}</span></div>
    <a href="${SITE_ROOT}carrito-avion/" class="btn btn-primary btn-block btn-sm">${ICONS.plane} Ver Carrito de Avión</a>`;
}

// Si un panel desplegable se sale de la pantalla (celulares angostos), lo corre hacia adentro.
function encajarEnPantalla(panel, margen = 12) {
  panel.style.translate = '';
  const rect = panel.getBoundingClientRect();
  let dx = 0;
  if (rect.right > window.innerWidth - margen) dx = window.innerWidth - margen - rect.right;
  if (rect.left + dx < margen) dx = margen - rect.left;
  if (dx) panel.style.translate = `${Math.round(dx)}px 0`;
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

// Buscador del encabezado (en todas las páginas): perfumes enteros con stock y decants
// disponibles en una sola lista, buscando también por "Inspirado en". Enter lleva al catálogo
// con la búsqueda aplicada.
function iniciarBuscadorGlobal() {
  const contenedor = document.getElementById('global-search');
  const input = document.getElementById('global-search-input');
  const resultados = document.getElementById('global-search-results');
  const toggle = document.getElementById('search-toggle');
  if (!contenedor || !input) return;
  let temporizador;
  let secuencia = 0;

  const abrir = () => {
    contenedor.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('busqueda-abierta');
    setTimeout(() => input.focus(), 30);
  };
  const cerrar = () => {
    contenedor.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('busqueda-abierta');
  };
  toggle.addEventListener('click', () => (contenedor.hidden ? abrir() : cerrar()));
  document.getElementById('global-search-close').addEventListener('click', cerrar);
  document.getElementById('global-search-backdrop').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !contenedor.hidden) cerrar();
    // "/" abre el buscador desde cualquier parte (salvo que ya se esté escribiendo en un campo).
    if (e.key === '/' && contenedor.hidden && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); abrir(); }
  });
  document.getElementById('global-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) window.location.href = `${SITE_ROOT}catalogo/?busqueda=${encodeURIComponent(q)}`;
  });

  input.addEventListener('input', () => {
    clearTimeout(temporizador);
    const q = input.value.trim();
    if (q.length < 2) {
      resultados.innerHTML = '<p class="global-search-hint">Busca por nombre, por marca o por el perfume de diseñador que te gusta: te mostramos también sus equivalentes.</p>';
      return;
    }
    temporizador = setTimeout(async () => {
      const id = ++secuencia;
      resultados.innerHTML = '<p class="global-search-hint">Buscando…</p>';
      const lista = SUPABASE_CONFIGURADO ? await buscarEnTodaLaTienda(q, 8).catch(() => []) : [];
      if (id !== secuencia) return;
      resultados.innerHTML = `
        ${lista.length ? `<div class="global-search-lista">${lista.map((p) => {
          const tallas = p.es_decant ? tallasDecant(p) : [];
          const precio = p.es_decant
            ? (tallas.length ? `Desde ${formatoMoneda(precioTallaDecant(p, tallas[0]))}` : '')
            : formatoMoneda(p.es_liquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje));
          return `
            <a class="global-search-item" href="${SITE_ROOT}producto/?slug=${p.slug}">
              <span class="gs-img">${p.imagen_url ? `<img src="${new URL(p.imagen_url, SITE_ROOT).href}" alt="" loading="lazy" onerror="this.remove()" />` : ICONS.box}</span>
              <span class="gs-info">
                <span class="gs-marca">${escapeHtml(p.marca)}${p.es_decant ? ' · <strong>Decant</strong>' : ''}</span>
                <span class="gs-nombre">${escapeHtml(p.nombre)}</span>
                ${p.inspirado_en ? `<span class="gs-inspirado">Inspirado en ${escapeHtml(p.inspirado_en)}</span>` : ''}
              </span>
              <span class="gs-precio">${precio}</span>
            </a>`;
        }).join('')}</div>` : `<p class="global-search-hint">No tenemos "${escapeHtml(q)}" en stock ahora mismo.</p>`}
        <div class="global-search-acciones">
          <a href="${SITE_ROOT}catalogo/?busqueda=${encodeURIComponent(q)}&disponibilidad=todos">Ver todo en el catálogo &rarr;</a>
          <a href="${SITE_ROOT}decants/?q=${encodeURIComponent(q)}">Buscar en decants &rarr;</a>
          ${CONSOLIDADOS_ACTIVOS ? `<a href="${SITE_ROOT}catalogo-consolidado/?busqueda=${encodeURIComponent(q)}">${ICONS.plane} Buscar en el Catálogo Consolidado &rarr;</a>` : ''}
          <a href="${enlaceWhatsappConsolidado(q)}" target="_blank" rel="noopener" class="gs-encargo">¿No lo encuentras? Te lo cotizamos por WhatsApp</a>
        </div>`;
    }, 250);
  });
}

async function actualizarEstadoSesionHeader() {
  const label = document.getElementById('nav-account-label');
  const badge = document.getElementById('cart-badge');
  if (!SUPABASE_CONFIGURADO) return;

  const session = await obtenerSesion();
  // Si hay sesión, primero se intenta fusionar un carrito de invitado (armado antes de
  // loguearse) y completar un checkout de invitado que quedó pendiente de confirmar el correo
  // (ver crearPedidoInvitado en api.js) -- así el badge de abajo y "Mis Pedidos" ya reflejan el
  // resultado apenas termina de cargar el header, sin que el cliente tenga que hacer nada más.
  if (session) {
    await fusionarCarritoInvitadoConCuenta();
    const idPedidoResuelto = await intentarResumirCheckoutPendiente();
    if (idPedidoResuelto) mostrarToast('¡Tu pedido quedó confirmado! Puedes verlo en "Mis Pedidos".');
  }
  // Perfil (nombre en el header), carrito (badge) y notificaciones no dependen entre sí --
  // antes se pedían una detrás de otra (3 viajes de red en serie en CADA carga de página,
  // antes incluso de que la página empiece a traer su propio contenido). En paralelo, el
  // tiempo total es el de la más lenta de las 3, no la suma -- una de las razones por las que
  // el sitio se sentía lento para cargar.
  const [perfil, itemsCarrito] = await Promise.all([
    label && session ? obtenerPerfilActual() : Promise.resolve(null),
    badge ? obtenerCarrito().catch(() => null) : Promise.resolve(null),
    actualizarBadgeNotificaciones(),
  ]);

  if (label) label.textContent = session ? (perfil?.nombres?.split(' ')[0] || 'Mi cuenta') : 'Ingresar';

  if (badge) {
    if (itemsCarrito) {
      const total = itemsCarrito.reduce((acc, i) => acc + i.cantidad, 0);
      badge.textContent = total;
      badge.hidden = total === 0;
    } else {
      badge.hidden = true;
    }
  }
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
                <span class="brand-tagline">${TAGLINE_MARCA}</span>
              </span>
            </a>
            <p>${CONSOLIDADOS_ACTIVOS ? 'Perfumería importada seleccionada: perfumes originales árabes y de diseñador en tienda, decants para probarlos antes y consolidado para traer lo que buscas a mejor precio.' : 'Perfumería importada seleccionada: perfumes originales árabes y de diseñador, y decants para probarlos antes.'}</p>
            <div class="social-row">
              <a href="#" aria-label="Instagram @zadaca_maison" title="Instagram @zadaca_maison" id="social-instagram" hidden target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
              <a href="#" aria-label="TikTok @maisonzadaca.perfumeria" title="TikTok @maisonzadaca.perfumeria" id="social-tiktok" hidden target="_blank" rel="noopener">${ICONS.tiktok}</a>
              <a href="#" aria-label="TikTok @perfumeriazadaca" title="TikTok @perfumeriazadaca" id="social-tiktok-2" hidden target="_blank" rel="noopener">${ICONS.tiktok}</a>
              <a href="#" aria-label="Facebook" title="Facebook" id="social-facebook" hidden target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.2L18 12h-4V7a1 1 0 0 1 1-1h3Z"/></svg></a>
              <a href="https://wa.me/${WHATSAPP_NUMERO}" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp ${formatoWhatsapp()}">${ICONS.whatsapp}</a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Tienda</h4>
            <a href="${SITE_ROOT}catalogo/">Catálogo en stock</a>
            <a href="${SITE_ROOT}catalogo/?genero=Hombre">Para Hombre</a>
            <a href="${SITE_ROOT}catalogo/?genero=Mujer">Para Mujer</a>
            <a href="${SITE_ROOT}decants/">Decants</a>
            <a href="${SITE_ROOT}liquidaciones/">Liquidaciones</a>
            ${CONSOLIDADOS_ACTIVOS ? '' : `<a href="${enlaceWhatsappConsolidado()}" target="_blank" rel="noopener">Pedidos por consolidado</a>`}
          </div>
          ${CONSOLIDADOS_ACTIVOS ? `<div class="footer-col">
            <h4>Consolidado</h4>
            <a href="${SITE_ROOT}catalogo-consolidado/">Catálogo consolidado</a>
            <a href="${SITE_ROOT}carrito-avion/">Mi Carrito de Avión</a>
            <a href="${SITE_ROOT}consolidados/">Campañas y cómo funciona</a>
            <a href="${enlaceWhatsappConsolidado()}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
          </div>` : ''}
          <div class="footer-col">
            <h4>Empresa</h4>
            <a href="${SITE_ROOT}contacto/">Solicitar cotización</a>
            <a href="${SITE_ROOT}contacto/">Contacto</a>
            <a href="${SITE_ROOT}cuenta/">Mi cuenta</a>
            <a href="${SITE_ROOT}courier/">Courier USA → Perú</a>
          </div>
          <div class="footer-col">
            <h4>Ayuda</h4>
            <a href="${SITE_ROOT}contacto/#tiendas" id="footer-dir-chiclayo">Tienda Chiclayo: Av. Los Incas 1090, La Victoria</a>
            ${CONSOLIDADOS_ACTIVOS ? `<a href="${SITE_ROOT}contacto/#tiendas" id="footer-dir-lima">Almacén Lima: Jr. Ávila Godoy 664, SMP</a>` : ''}
            <a href="https://wa.me/${WHATSAPP_NUMERO}" target="_blank" rel="noopener">WhatsApp: ${formatoWhatsapp()}</a>
            <p id="footer-envio-texto">Envíos vía Shalom / Olva a todo el Perú</p>
            <p id="footer-pago-texto">Pagos: Yape, Plin, transferencia y tarjeta</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span id="footer-year"></span> Maison Zadaca. Todos los derechos reservados.<span class="footer-legal-empresa" id="footer-legal-empresa" hidden></span></span>
          <div class="footer-legal-links">
            <a href="${SITE_ROOT}libro-de-reclamaciones/" class="link-libro-reclamaciones">${ICONS.book} Libro de Reclamaciones</a>
            <a href="${SITE_ROOT}politica-privacidad/">Privacidad</a>
            <a href="${SITE_ROOT}terminos-condiciones/">Términos</a>
            <a href="${SITE_ROOT}cambios-y-devoluciones/">Cambios y devoluciones</a>
          </div>
          <div class="payment-icons"><span>Visa</span><span>Mastercard</span><span>Yape</span><span>Plin</span></div>
        </div>
      </div>
    </footer>
  `;
  document.getElementById('footer-year').textContent = new Date().getFullYear();
}

// Razón social y RUC en el pie de página: solo aparecen cuando el admin los cargó en
// Configuración del Sitio (la ley pide identificar al proveedor; mientras no estén, no se
// muestra una línea a medias).
function aplicarDatosLegalesFooter(cfg) {
  const mount = document.getElementById('footer-legal-empresa');
  if (!mount || !cfg?.ruc) return;
  mount.textContent = [cfg.razon_social, `RUC ${cfg.ruc}`, cfg.domicilio_fiscal].filter(Boolean).join(' · ');
  mount.hidden = false;
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
  // Un decant ya no tiene un único precio de fila (ver migración 0016) -- la tarjeta muestra
  // "Desde S/X" con la talla más barata que tenga precio cargado.
  const tallas = p.es_decant ? tallasDecant(p) : null;
  const final = p.es_decant ? (precioTallaDecant(p, tallas[0]) ?? 0) : (esLiquidacion ? Number(p.precio_liquidacion) : precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje));
  const tieneDescuento = !esLiquidacion && !p.es_decant && Number(p.descuento_tienda_porcentaje) > 0;
  // "estado" es un campo manual que el admin no mantiene al día (ver misma nota en
  // producto.js) -- stock_disponible es el dato real, así que la badge "Agotado" también
  // tiene que mirarlo, o quedan productos sin stock mostrándose como disponibles en la
  // grilla del catálogo. Un decant no tiene stock por unidad -- solo mira "estado" (toggle
  // Disponible/Agotado del admin, ver migración 0016).
  const agotado = p.es_decant ? p.estado === 'Agotado' : (p.estado === 'Agotado' || p.stock_disponible <= 0);
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
          ${!agotado && !p.es_decant && p.stock_disponible > 0 && p.stock_disponible <= 2 ? `<span class="badge badge-ultimas">¡${p.stock_disponible === 1 ? 'Última unidad' : 'Últimas 2'}!</span>` : ''}
        </div>
      </div>
      <div class="product-info">
        <span class="product-brand">${escapeHtml(p.marca)}</span>
        <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
        <span class="product-meta">${escapeHtml(p.concentracion || '')}${p.es_decant ? (tallas.length ? ` · ${tallas.join('/')} ml` : '') : (p.mililitros ? ` · ${p.mililitros} ml` : '')}</span>
        ${p.inspirado_en ? `<span class="product-inspirado" title="Inspirado en ${escapeHtml(p.inspirado_en)}">Inspirado en ${escapeHtml(p.inspirado_en)}</span>` : ''}
        <div class="product-price-row">
          <span class="price-current">${p.es_decant ? 'Desde ' : ''}${formatoMoneda(final)}</span>
          ${tieneDescuento ? `<span class="price-old">${formatoMoneda(p.precio_tienda_regular)}</span>` : ''}
        </div>
        ${esLiquidacion ? `<div class="liq-unidad-note">${p.liquidacion_unidad_minima > 1 ? `Solo por mayor · mínimo ${p.liquidacion_unidad_minima} unidades` : 'Por unidad o por mayor'}</div>` : ''}
        ${agotado && !p.es_decant ? '<div class="liq-unidad-note">Disponible por encargo (consolidado)</div>' : ''}
      </div>
    </a>
  `;
}

// Tarjeta del catálogo de CONSOLIDADO: no abre ninguna ficha (el cliente solo elige cuántas
// unidades quiere y las suma a su Carrito de Avión desde la misma tarjeta). Muestra
// precio_consolidado_fijo -- no hay descuento de tienda ni "Agotado": se importa bajo pedido.
// Los botones se manejan por delegación en catalogo-consolidado.js (data-accion).
function tarjetaProductoConsolidado(p, enCarrito = 0) {
  return `
    <article class="product-card card-avion" data-id="${p.id}">
      <div class="product-media">
        ${imagenProducto(p)}
        <div class="product-badges">
          ${p.es_nuevo ? '<span class="badge badge-new">Nuevo</span>' : ''}
          <span class="badge badge-consolidado">${ICONS.plane} Consolidado</span>
        </div>
      </div>
      <div class="product-info">
        <span class="product-brand">${escapeHtml(p.marca)}</span>
        <h3 class="product-name">${escapeHtml(p.nombre)}</h3>
        <span class="product-meta">${escapeHtml(p.concentracion || '')}${p.mililitros && p.mililitros > 1 ? `${p.concentracion ? ' · ' : ''}${p.mililitros} ml` : ''}</span>
        ${p.inspirado_en ? `<span class="product-inspirado" title="Inspirado en ${escapeHtml(p.inspirado_en)}">Inspirado en ${escapeHtml(p.inspirado_en)}</span>` : ''}
        <div class="product-price-row">
          <span class="price-current">${formatoMoneda(p.precio_consolidado_fijo)}</span>
          <span class="avion-precio-nota">c/u</span>
        </div>
        <div class="avion-add">
          <div class="qty-mini" role="group" aria-label="Cantidad">
            <button type="button" data-accion="menos" aria-label="Una unidad menos">${ICONS.minus}</button>
            <input type="number" class="avion-cantidad" value="1" min="1" max="${MAX_UNIDADES_AVION_POR_PERFUME}" inputmode="numeric" aria-label="Cantidad de ${escapeHtml(p.nombre)}" />
            <button type="button" data-accion="mas" aria-label="Una unidad más">${ICONS.plus}</button>
          </div>
          <button type="button" class="btn btn-primary btn-sm btn-avion" data-accion="agregar">${ICONS.plane} Agregar</button>
        </div>
        <span class="avion-en-carrito" ${enCarrito ? '' : 'hidden'}>${ICONS.check} <span>${enCarrito}</span> en tu Carrito de Avión</span>
      </div>
    </article>
  `;
}

// Mismo "vuelo" que animarAgregarCarrito(), pero hacia el avión del encabezado.
function animarAgregarAvion(origenEl) {
  pulsarBadge('avion-badge');
  const destino = document.getElementById('avion-toggle');
  if (!origenEl || !destino || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const origenRect = origenEl.getBoundingClientRect();
  const destinoRect = destino.getBoundingClientRect();
  const vuelo = document.createElement('div');
  vuelo.className = 'cart-fly-icon';
  vuelo.innerHTML = ICONS.plane;
  vuelo.style.left = `${origenRect.left + origenRect.width / 2 - 11}px`;
  vuelo.style.top = `${origenRect.top + origenRect.height / 2 - 11}px`;
  document.body.appendChild(vuelo);
  const dx = (destinoRect.left + destinoRect.width / 2) - (origenRect.left + origenRect.width / 2);
  const dy = (destinoRect.top + destinoRect.height / 2) - (origenRect.top + origenRect.height / 2);
  requestAnimationFrame(() => {
    vuelo.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    vuelo.style.opacity = '0';
  });
  vuelo.addEventListener('transitionend', () => vuelo.remove(), { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();
});
