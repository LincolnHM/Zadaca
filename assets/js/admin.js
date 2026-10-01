const ESTADOS_CONSOLIDADO = ['Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito', 'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado'];
// 'Pendiente_Aprobacion': reservas de 10+ unidades de un mismo perfume (ver migración 0006) —
// no cuentan en el progreso de la campaña hasta que el admin las cambia a 'Reservado' (aprobar)
// o 'Cancelado' (rechazar) desde este mismo selector.
const ESTADOS_RESERVA = ['Reservado', 'Pendiente_Aprobacion', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'];
let PERFIL_ADMIN = null;
// El panel siempre maneja consolidados (campañas, reservas, pedidos por encargo y su
// contabilidad), aunque la tienda pública los tenga apagados (CONSOLIDADOS_ACTIVOS en api.js):
// hoy se cotizan por WhatsApp y el admin los registra acá.
const CONSOLIDADOS_EN_ADMIN = true;
let COTIZACION_ORIGEN = null; // id de la cotización que se está convirtiendo en producto, si aplica

document.addEventListener('DOMContentLoaded', async () => {
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('admin-login-screen').innerHTML = '<div class="form-card"><p class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md) antes de usar el panel admin.</p></div>';
    return;
  }

  document.getElementById('admin-login-form').addEventListener('submit', manejarLogin);
  document.getElementById('admin-logout-btn').addEventListener('click', cerrarSesion);

  PERFIL_ADMIN = await obtenerPerfilAdmin();
  if (PERFIL_ADMIN) mostrarShell();
});

async function manejarLogin(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const alerta = document.getElementById('admin-login-alert');
  alerta.innerHTML = '';
  try {
    await iniciarSesion(data);
    PERFIL_ADMIN = await obtenerPerfilAdmin();
    if (!PERFIL_ADMIN) {
      await supabaseClient.auth.signOut();
      alerta.innerHTML = '<div class="alert alert-error">Esta cuenta no tiene permisos de administrador.</div>';
      return;
    }
    mostrarShell();
  } catch (err) {
    alerta.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function mostrarShell() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-shell').classList.add('visible');
  document.querySelectorAll('[data-consolidado]').forEach((el) => { el.hidden = !CONSOLIDADOS_EN_ADMIN; });
  configurarNavegacion();
  configurarModales();
  cargarSeccion('dashboard');
  actualizarBadgesNav();
}

function configurarNavegacion() {
  document.querySelectorAll('.admin-nav-btn[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn[data-section]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-section').forEach((s) => s.classList.remove('active'));
      document.getElementById(`section-${btn.dataset.section}`).classList.add('active');
      cargarSeccion(btn.dataset.section);
    });
  });
}

function cargarSeccion(nombre) {
  const cargadores = {
    dashboard: cargarDashboard,
    productos: cargarProductos,
    inventario: cargarInventario,
    margenes: cargarMargenes,
    pedidos: cargarPedidos,
    consolidados: cargarConsolidados,
    reservas: cargarTodasLasReservas,
    clientes: cargarClientes,
    resenas: cargarResenas,
    cotizaciones: cargarCotizaciones,
    reclamos: cargarReclamos,
    contabilidad: cargarContabilidad,
    publicidad: cargarPublicidad,
    faq: cargarFAQ,
    configuracion: cargarConfiguracion,
  };
  cargadores[nombre]?.();
}

async function actualizarBadgesNav() {
  try {
    const stats = await obtenerEstadisticasDashboard();
    setBadge('badge-resenas', stats.resenasPendientes);
    setBadge('badge-cotizaciones', stats.cotizacionesPendientes);
    setBadge('badge-margenes', stats.productosSinMargen);
    setBadge('badge-inventario', stats.productosStockBajo);
    setBadge('badge-despachar', stats.pedidosPorDespachar);
    setBadge('badge-reclamos', stats.reclamosPendientes);
  } catch (err) {
    console.error(err);
  }
}
function setBadge(id, valor) {
  const el = document.getElementById(id);
  el.textContent = valor;
  el.hidden = valor === 0;
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }

/* ================= PAGINACIÓN (compartida entre Productos y Márgenes) ================= */

// Mismo patrón que el catálogo público (ver calcularRangoPaginas en catalogo.js): siempre
// primera, última, y una ventana alrededor de la actual, con "…" en los saltos.
function calcularRangoPaginasAdmin(actual, total) {
  const distancia = 1;
  const paginas = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= actual - distancia && i <= actual + distancia)) paginas.push(i);
  }
  const conElipsis = [];
  let anterior = 0;
  for (const p of paginas) {
    if (anterior && p - anterior > 1) conElipsis.push('…');
    conElipsis.push(p);
    anterior = p;
  }
  return conElipsis;
}

function renderPaginacionAdmin(mountId, paginaActual, totalPaginas, onCambiar) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (totalPaginas <= 1) { mount.innerHTML = ''; return; }

  const botonNav = (destino, simbolo, etiqueta) => `<button class="pg-nav" data-pagina="${destino}" ${destino < 1 || destino > totalPaginas ? 'disabled' : ''} aria-label="${etiqueta}">${simbolo}</button>`;

  let html = botonNav(paginaActual - 1, '‹', 'Página anterior');
  html += calcularRangoPaginasAdmin(paginaActual, totalPaginas)
    .map((p) => p === '…' ? '<span class="pg-ellipsis">…</span>' : `<button class="${p === paginaActual ? 'active' : ''}" data-pagina="${p}">${p}</button>`)
    .join('');
  html += botonNav(paginaActual + 1, '›', 'Página siguiente');

  mount.innerHTML = html;
  mount.querySelectorAll('button[data-pagina]:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => onCambiar(Number(btn.dataset.pagina)));
  });
}

/* ================= DASHBOARD ================= */

const ICONO_KPI_PEDIDOS = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>';
const ICONO_KPI_INGRESOS = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.4 1.2-2.2 2.5-2.2 1.6 0 2.5.9 2.5 2 0 2.6-5 1.8-5 4.4 0 1.1.9 2 2.5 2 1.3 0 2.5-.8 2.5-2.2"/></svg>';
const ICONO_KPI_CONFIRMAR = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>';
const ICONO_KPI_STOCK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 3 2 20h20L12 3Z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>';

function claseEstadoPago(estado) {
  if (estado === 'Completado') return 'pago-completado';
  if (estado === 'Parcial') return 'pago-parcial';
  return 'pago-pendiente';
}

function fechaLargaEs(fecha) {
  return fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function irASeccion(nombre) {
  document.querySelector(`.admin-nav-btn[data-section="${nombre}"]`)?.click();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-goto-section]').forEach((btn) => {
    btn.addEventListener('click', () => irASeccion(btn.dataset.gotoSection));
  });
});

async function cargarDashboard() {
  document.getElementById('dashboard-fecha').textContent = fechaLargaEs(new Date());

  const kpiMount = document.getElementById('dashboard-kpis');
  const secundariasMount = document.getElementById('dashboard-stats-secundarias');
  const pedidosMount = document.getElementById('dashboard-ultimos-pedidos');
  const stockMount = document.getElementById('dashboard-stock-bajo');

  try {
    const s = await obtenerEstadisticasDashboard();

    kpiMount.innerHTML = `
      <div class="kpi-card"><div class="kpi-icon gold">${ICONO_KPI_PEDIDOS}</div><div><div class="kpi-value">${s.pedidosHoy}</div><div class="kpi-label">Pedidos Hoy</div></div></div>
      <div class="kpi-card"><div class="kpi-icon success">${ICONO_KPI_INGRESOS}</div><div><div class="kpi-value">${formatoMoneda(s.ingresosSemana)}</div><div class="kpi-label">Ingresos Esta Semana</div></div></div>
      <div class="kpi-card"><div class="kpi-icon amber">${ICONO_KPI_CONFIRMAR}</div><div><div class="kpi-value">${s.pedidosPorConfirmar}</div><div class="kpi-label">Por Confirmar</div></div></div>
      <div class="kpi-card"><div class="kpi-icon danger">${ICONO_KPI_STOCK}</div><div><div class="kpi-value">${s.productosStockBajo}</div><div class="kpi-label">Stock Bajo</div></div></div>
    `;

    secundariasMount.innerHTML = `
      <div class="stat-card"><div class="stat-value">${formatoMoneda(s.cobradoHoy)}</div><div class="stat-label">Cobrado hoy</div></div>
      <button type="button" class="stat-card stat-click ${s.porCobrar ? 'warn' : ''}" id="dashboard-por-cobrar"><div class="stat-value">${formatoMoneda(s.porCobrar)}</div><div class="stat-label">Por cobrar · ${s.pedidosConSaldo} pedido${s.pedidosConSaldo === 1 ? '' : 's'}</div></button>
      <div class="stat-card"><div class="stat-value">${s.totalPedidos}</div><div class="stat-label">Pedidos Tienda</div></div>
      <div class="stat-card ${s.pedidosPorDespachar ? 'warn' : ''}"><div class="stat-value">${s.pedidosPorDespachar}</div><div class="stat-label">Pedidos por Despachar</div></div>
      ${CONSOLIDADOS_EN_ADMIN ? `
      <div class="stat-card"><div class="stat-value">${s.consolidadosAbiertos}</div><div class="stat-label">Consolidados Abiertos</div></div>
      <div class="stat-card"><div class="stat-value">${s.reservasPendientes}</div><div class="stat-label">Reservas Pendientes</div></div>` : ''}
      <div class="stat-card ${s.cotizacionesPendientes ? 'warn' : ''}"><div class="stat-value">${s.cotizacionesPendientes}</div><div class="stat-label">Cotizaciones Pendientes</div></div>
      <div class="stat-card ${s.resenasPendientes ? 'warn' : ''}"><div class="stat-value">${s.resenasPendientes}</div><div class="stat-label">Reseñas por Moderar</div></div>
      <div class="stat-card ${s.productosSinMargen ? 'warn' : ''}"><div class="stat-value">${s.productosSinMargen}</div><div class="stat-label">Productos sin Margen Aplicado</div></div>
    `;
    document.getElementById('dashboard-por-cobrar')?.addEventListener('click', () => {
      irASeccion('contabilidad');
      cambiarVistaConta('cobrar');
    });
  } catch (err) {
    kpiMount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
    secundariasMount.innerHTML = '';
  }

  try {
    const pedidos = await obtenerUltimosPedidosDashboard(5);
    pedidosMount.innerHTML = pedidos.length ? pedidos.map((p) => `
      <div class="dashboard-row">
        <div>
          <div class="dashboard-row-main">Pedido #${p.id} <span class="canal-tag">${escapeHtml(etiquetaCanal(p.canal))}</span></div>
          <div class="dashboard-row-sub">${escapeHtml(p.cliente)}</div>
        </div>
        <div class="dashboard-row-value">
          <div class="dashboard-row-amount">${formatoMoneda(p.monto_total)}</div>
          ${p.cancelado ? '<span class="status-tag tag-anulado">Anulado</span>' : `<span class="status-tag ${claseEstadoPago(p.estado_pago)}">${escapeHtml(p.estado_pago)}</span>`}
        </div>
      </div>
    `).join('') : '<div class="admin-empty">Sin pedidos todavía.</div>';
  } catch (err) {
    pedidosMount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }

  try {
    const stockBajo = await obtenerStockBajoDashboard(5);
    stockMount.innerHTML = stockBajo.length ? stockBajo.map((p) => `
      <div class="dashboard-row">
        <div>
          <div class="dashboard-row-main">${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}</div>
          <div class="dashboard-row-sub">${escapeHtml(p.detalle)}</div>
        </div>
        <span class="dashboard-count-badge">${p.es_decant ? `${p.stock} ml` : `${p.stock} und.`}</span>
      </div>
    `).join('') : '<div class="admin-empty">Nada por acabarse: todo lo que tiene stock está por encima del mínimo.</div>';
  } catch (err) {
    stockMount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }

  cargarGraficosDashboard();
}

/* ================= DASHBOARD: GRÁFICOS ================= */

// Paleta acorde a los 2 colores de marca (burdeos + plata, ver style.css) más los estados que
// ya usa el resto del panel (ámbar/verde) -- así las donas no traen colores random ajenos a la
// identidad del sitio.
const PALETA_GRAFICOS = ['#7a2030', '#bcbac2', '#d29a3a', '#4f8c58', '#93293c', '#4f4736'];
const GRAFICOS_DASHBOARD = {};

function colorCss(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

function destruirGrafico(id) {
  if (GRAFICOS_DASHBOARD[id]) { GRAFICOS_DASHBOARD[id].destroy(); delete GRAFICOS_DASHBOARD[id]; }
}

// Chart.js viene de un CDN (ver admin/index.html) -- si el script no cargó (ej. sin internet
// en ese momento), los gráficos simplemente no se dibujan en vez de romper el resto del
// dashboard, que ya cargó bien arriba.
async function cargarGraficosDashboard() {
  if (!window.Chart) return;
  try {
    renderGraficoTendencia(await obtenerTendenciaVentas(14));
  } catch (err) { console.error(err); }
  try {
    const { porCasa, porGenero } = await obtenerComposicionCatalogo();
    renderGraficoDona('chart-tipo-casa', porCasa);
    renderGraficoDona('chart-genero', porGenero);
  } catch (err) { console.error(err); }
  try {
    renderGraficoTopPerfumes(await obtenerTopPerfumesVendidos(6));
  } catch (err) { console.error(err); }
}

function renderGraficoTendencia(datos) {
  const canvas = document.getElementById('chart-tendencia-ventas');
  if (!canvas) return;
  destruirGrafico('chart-tendencia-ventas');
  const textoMuted = colorCss('--color-text-faint');
  const borde = colorCss('--color-border');
  GRAFICOS_DASHBOARD['chart-tendencia-ventas'] = new Chart(canvas, {
    data: {
      labels: datos.map((d) => d.etiqueta),
      datasets: [
        { type: 'bar', label: 'Pedidos', data: datos.map((d) => d.pedidos), backgroundColor: 'rgba(188,186,194,0.55)', yAxisID: 'y1', order: 2, borderRadius: 3, maxBarThickness: 22 },
        { type: 'line', label: 'Ingresos (S/)', data: datos.map((d) => d.ingresos), borderColor: '#7a2030', backgroundColor: 'rgba(122,32,48,0.12)', tension: 0.35, fill: true, yAxisID: 'y', order: 1, pointRadius: 3, pointBackgroundColor: '#7a2030' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: textoMuted, font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: textoMuted, font: { size: 10 } }, grid: { display: false } },
        y: { position: 'left', beginAtZero: true, ticks: { color: textoMuted, font: { size: 10 }, callback: (v) => `S/ ${v}` }, grid: { color: borde } },
        y1: { position: 'right', beginAtZero: true, ticks: { color: textoMuted, font: { size: 10 }, stepSize: 1 }, grid: { display: false } },
      },
    },
  });
}

function renderGraficoDona(canvasId, entradas) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destruirGrafico(canvasId);
  if (!entradas.length) return;
  const textoMuted = colorCss('--color-text-faint');
  GRAFICOS_DASHBOARD[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entradas.map(([etiqueta]) => etiqueta),
      datasets: [{ data: entradas.map(([, cantidad]) => cantidad), backgroundColor: PALETA_GRAFICOS, borderColor: colorCss('--color-bg-card'), borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: textoMuted, font: { size: 11 }, boxWidth: 12, padding: 10 } } },
    },
  });
}

function renderGraficoTopPerfumes(top) {
  const canvas = document.getElementById('chart-top-perfumes');
  if (!canvas) return;
  destruirGrafico('chart-top-perfumes');
  if (!top.length) return;
  const textoMuted = colorCss('--color-text-faint');
  const borde = colorCss('--color-border');
  GRAFICOS_DASHBOARD['chart-top-perfumes'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: top.map((p) => `${p.marca} — ${p.nombre}`),
      datasets: [{ data: top.map((p) => p.unidades), backgroundColor: '#7a2030', borderRadius: 3, maxBarThickness: 18 }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: textoMuted, font: { size: 10 }, stepSize: 1 }, grid: { color: borde } },
        y: { ticks: { color: textoMuted, font: { size: 10 } }, grid: { display: false } },
      },
    },
  });
}

/* ================= PRODUCTOS ================= */

// admin.html no carga assets/js/main.js (esa página asume elementos del sitio público —
// header, footer, notificaciones — que acá no existen), así que el helper de imagen del
// producto vive acá aparte en vez de depender de la versión de main.js.
const ICONO_PRODUCTO_FALLBACK = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function manejarErrorImagenProductoAdmin(img) {
  const span = document.createElement('span');
  span.style.color = 'var(--color-text-faint)';
  span.innerHTML = ICONO_PRODUCTO_FALLBACK;
  img.replaceWith(span);
}

function imagenProductoAdmin(p) {
  if (p.imagen_url) {
    // Igual que imagenProducto() en main.js: imagen_url es relativa a la raíz del sitio.
    return `<img src="${new URL(p.imagen_url, SITE_ROOT).href}" alt="${escapeHtml(p.marca)} ${escapeHtml(p.nombre)}" loading="lazy" onerror="manejarErrorImagenProductoAdmin(this)" />`;
  }
  return `<span style="color:var(--color-text-faint);">${ICONO_PRODUCTO_FALLBACK}</span>`;
}

const PRODUCTOS_POR_PAGINA = 25;
// Lista de Productos: el catálogo completo (~500 filas) se trae una sola vez y las pestañas,
// filtros, orden y páginas se resuelven en el navegador (cambiar de filtro es instantáneo).
// Cada precio o interruptor se guarda solo al cambiarlo: ya no hay un botón "Guardar" por
// tarjeta que se olvidaba apretar. Las CANTIDADES (stock) no se editan acá sino en
// Inventario, así cada cambio queda con su motivo en el historial.
let PRODUCTOS_CACHE = [];
let productosPaginaActual = 1;
let productosTipo = 'tienda';
let productosChip = '';

function tipoProducto(p) {
  if (p.es_decant) return 'decant';
  if (p.estado === 'Bajo_Pedido') return 'consolidado';
  return 'tienda';
}

function tieneStockProducto(p) {
  return p.es_decant ? p.abiertos > 0 : p.cerrados > 0;
}

// Filtros rápidos (uno a la vez). Los marcados "alerta" son cosas para revisar y solo se
// muestran si hay alguno.
const CHIPS_PRODUCTOS = [
  { id: '', label: 'Todos' },
  { id: 'con-stock', label: 'Con stock', f: (p) => tieneStockProducto(p) },
  { id: 'sin-stock', label: 'Sin stock', f: (p) => !tieneStockProducto(p) && tipoProducto(p) !== 'consolidado' },
  { id: 'ocultos', label: 'Ocultos en la web', f: (p) => !p.activo },
  { id: 'ocultos-con-stock', label: 'Con stock pero ocultos', f: (p) => !p.activo && tieneStockProducto(p), alerta: true },
  { id: 'sin-foto', label: 'Sin foto', f: (p) => !p.imagen_url && p.activo, alerta: true },
  { id: 'sin-costo', label: 'Sin costo cargado', f: (p) => tipoProducto(p) === 'tienda' && p.costo_importacion_pen == null },
  { id: 'liquidacion', label: 'En liquidación', f: (p) => p.es_liquidacion, soloSiHay: true },
  { id: 'nuevos', label: 'Marcados Nuevo', f: (p) => p.es_nuevo, soloSiHay: true },
];

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('productos-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { productosPaginaActual = 1; renderProductos(); }, 200); });
  ['productos-genero-filtro', 'productos-casa-filtro', 'productos-orden'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => { productosPaginaActual = 1; renderProductos(); });
  });
  document.querySelectorAll('#productos-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      productosTipo = tab.dataset.tipo;
      productosChip = '';
      productosPaginaActual = 1;
      renderProductos();
    });
  });
  document.getElementById('productos-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    productosChip = chip.dataset.chip === productosChip ? '' : chip.dataset.chip;
    productosPaginaActual = 1;
    renderProductos();
  });
  const tbody = document.getElementById('productos-tbody');
  tbody?.addEventListener('change', manejarCambioProducto);
  tbody?.addEventListener('click', manejarClickProducto);
  document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => abrirModalProducto());
  document.getElementById('btn-nuevo-decant')?.addEventListener('click', () => abrirModalDecant());
});

// Se llama al entrar a la sección y después de crear/editar/borrar (el parámetro que algunas
// llamadas viejas pasan se ignora: la búsqueda se lee del buscador).
async function cargarProductos() {
  const tbody = document.getElementById('productos-tbody');
  try {
    const filas = await obtenerInventarioAdmin();
    PRODUCTOS_CACHE = filas.map((p) => ({ ...p, _busqueda: normalizarBusqueda(`${p.marca} ${p.nombre} ${p.inspirado_en || ''} #${p.id}`) }));
    renderProductos();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

function productosFiltrados({ ignorarChip = false } = {}) {
  const palabras = normalizarBusqueda(document.getElementById('productos-busqueda')?.value).split(' ').filter(Boolean);
  const genero = document.getElementById('productos-genero-filtro')?.value;
  const casa = document.getElementById('productos-casa-filtro')?.value;
  const chip = !ignorarChip && productosChip ? CHIPS_PRODUCTOS.find((c) => c.id === productosChip) : null;
  return PRODUCTOS_CACHE.filter((p) => {
    if (productosTipo !== 'todos' && tipoProducto(p) !== productosTipo) return false;
    if (genero && p.genero !== genero) return false;
    if (casa === '__sin_definir__' ? !!p.tipo_casa : (casa && p.tipo_casa !== casa)) return false;
    if (palabras.length && !palabras.every((w) => p._busqueda.includes(w))) return false;
    if (chip?.f && !chip.f(p)) return false;
    return true;
  });
}

function precioPrincipal(p) {
  const tipo = tipoProducto(p);
  if (tipo === 'decant') return Number(p.precio_3ml ?? p.precio_5ml ?? p.precio_10ml ?? 0);
  if (tipo === 'consolidado') return Number(p.precio_consolidado_fijo);
  return precioVentaTienda(p);
}

function ordenarProductos(lista) {
  const orden = document.getElementById('productos-orden')?.value || 'marca';
  const porMarca = (a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre);
  const stock = (p) => (p.es_decant ? p.abiertos : p.cerrados);
  const copia = [...lista];
  if (orden === 'recientes') return copia.sort((a, b) => String(b.fecha_creacion || '').localeCompare(String(a.fecha_creacion || '')) || b.id - a.id);
  if (orden === 'stock') return copia.sort((a, b) => stock(b) - stock(a) || porMarca(a, b));
  if (orden === 'precio_asc') return copia.sort((a, b) => precioPrincipal(a) - precioPrincipal(b) || porMarca(a, b));
  if (orden === 'precio_desc') return copia.sort((a, b) => precioPrincipal(b) - precioPrincipal(a) || porMarca(a, b));
  return copia.sort(porMarca);
}

function renderProductos() {
  const tbody = document.getElementById('productos-tbody');
  if (!tbody) return;
  // Pestañas con su cantidad
  const porTipo = { tienda: 0, decant: 0, consolidado: 0, todos: PRODUCTOS_CACHE.length };
  PRODUCTOS_CACHE.forEach((p) => { porTipo[tipoProducto(p)] += 1; });
  document.querySelectorAll('#productos-tabs .admin-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tipo === productosTipo);
    tab.querySelector('.count').textContent = `(${porTipo[tab.dataset.tipo] ?? 0})`;
  });
  // Filtros rápidos con su cantidad dentro de la pestaña actual
  const base = productosFiltrados({ ignorarChip: true });
  document.getElementById('productos-chips').innerHTML = CHIPS_PRODUCTOS.map((c) => {
    const n = c.f ? base.filter(c.f).length : base.length;
    if ((c.alerta || c.soloSiHay) && !n && productosChip !== c.id) return '';
    return `<button type="button" class="chip-filtro${c.alerta ? ' alerta' : ''}${productosChip === c.id ? ' activo' : ''}" data-chip="${c.id}">${c.alerta ? '⚠ ' : ''}${escapeHtml(c.label)} <span class="n">${n}</span></button>`;
  }).join('');

  const lista = ordenarProductos(productosFiltrados());
  const totalPaginas = Math.max(1, Math.ceil(lista.length / PRODUCTOS_POR_PAGINA));
  if (productosPaginaActual > totalPaginas) productosPaginaActual = totalPaginas;
  const pagina = lista.slice((productosPaginaActual - 1) * PRODUCTOS_POR_PAGINA, productosPaginaActual * PRODUCTOS_POR_PAGINA);
  document.getElementById('productos-conteo').textContent = `${lista.length} resultado${lista.length === 1 ? '' : 's'}`;
  tbody.innerHTML = pagina.length ? pagina.map(filaProductoAdmin).join('') : '<tr><td colspan="5" class="admin-empty">No hay productos con estos filtros.</td></tr>';
  renderPaginacionAdmin('productos-paginacion', productosPaginaActual, totalPaginas, (n) => {
    productosPaginaActual = n;
    renderProductos();
    document.getElementById('section-productos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function filaProductoAdmin(p) {
  const tipo = tipoProducto(p);
  const badges = [];
  if (productosTipo === 'todos' && tipo === 'decant') badges.push('<span class="badge badge-decant">Decant</span>');
  if (productosTipo === 'todos' && tipo === 'consolidado') badges.push('<span class="badge badge-tipo-consolidado">Solo consolidado</span>');
  if (p.es_liquidacion) badges.push('<span class="badge badge-liquidacion">Liquidación</span>');
  if (!p.activo && tieneStockProducto(p)) badges.push('<span class="badge badge-aviso">Tiene stock pero está oculto</span>');
  if (!p.imagen_url && p.activo) badges.push('<span class="badge badge-aviso">Sin foto</span>');
  const meta = [tipo === 'decant' ? `Decant (frasco de ${p.mililitros} ml)` : `${p.mililitros} ml`, p.concentracion, p.genero, p.tipo_casa || 'Casa sin definir'].filter(Boolean).join(' · ');
  return `
    <tr data-id="${p.id}" class="${p.activo ? '' : 'fila-oculta'}">
      <td data-label="Perfume">
        <div class="prod-celda">
          <span class="mini-foto">${imagenProductoAdmin(p)}</span>
          <div class="prod-texto">
            <strong>${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}</strong>
            <div class="celda-sub">${escapeHtml(meta)}</div>
            ${badges.length ? `<div class="prod-badges">${badges.join('')}</div>` : ''}
          </div>
        </div>
      </td>
      <td data-label="Precio (S/)">${htmlPreciosProducto(p, tipo)}</td>
      <td class="num" data-label="Stock">${htmlStockProducto(p, tipo)}</td>
      <td data-label="En la web">${htmlOpcionesProducto(p, tipo)}</td>
      <td class="acciones">
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-accion="editar">Editar</button>
          <button type="button" class="btn btn-ghost btn-sm btn-icono-peligro" data-accion="eliminar" title="Eliminar" aria-label="Eliminar ${escapeHtml(p.nombre)}">${ICONO_BORRAR}</button>
        </div>
      </td>
    </tr>`;
}

const ICONO_BORRAR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';

function inputPrecio(campo, valor, etiqueta, { opcional = false } = {}) {
  return `<label class="precio-campo"><span>${etiqueta}</span><input type="number" min="0.01" step="0.01" inputmode="decimal" data-campo="${campo}" value="${valor ?? ''}" ${opcional ? 'placeholder="—"' : ''} /></label>`;
}

function htmlPreciosProducto(p, tipo) {
  if (tipo === 'decant') {
    return `<div class="prod-precios prod-precios-tallas">${inputPrecio('precio_3ml', p.precio_3ml, '3 ml', { opcional: true })}${inputPrecio('precio_5ml', p.precio_5ml, '5 ml', { opcional: true })}${inputPrecio('precio_10ml', p.precio_10ml, '10 ml', { opcional: true })}</div>`;
  }
  if (tipo === 'consolidado') {
    return `<div class="prod-precios">${inputPrecio('precio_consolidado_fijo', Number(p.precio_consolidado_fijo), 'Consolidado')}</div>`;
  }
  const descuento = Number(p.descuento_tienda_porcentaje) || 0;
  return `<div class="prod-precios">
      ${inputPrecio('precio_tienda_regular', Number(p.precio_tienda_regular), 'Tienda')}
      ${CONSOLIDADOS_EN_ADMIN ? inputPrecio('precio_consolidado_fijo', Number(p.precio_consolidado_fijo), 'Consolidado') : ''}
      ${inputPrecio('costo_importacion_pen', p.costo_importacion_pen == null ? null : Number(p.costo_importacion_pen), 'Costo', { opcional: true })}
    </div>
    <div class="celda-sub prod-ganancia">${htmlGananciaProducto(p)}</div>
    ${descuento > 0 ? `<div class="celda-sub">−${descuento}% en tienda → ${formatoMoneda(precioFinal(p.precio_tienda_regular, descuento))}</div>` : ''}
    ${p.es_liquidacion && p.precio_liquidacion ? `<div class="celda-sub">Liquidación: ${formatoMoneda(p.precio_liquidacion)}</div>` : ''}`;
}

// Ganancia por frasco vendido en tienda (precio final − costo), para ver de un vistazo qué deja.
function htmlGananciaProducto(p) {
  if (p.costo_importacion_pen == null) return 'Sin costo: carga cuánto te cuesta para ver la ganancia';
  const ganancia = precioVentaTienda(p) - Number(p.costo_importacion_pen);
  return `Ganas <strong class="${ganancia < 0 ? 'texto-alerta' : ''}">${formatoMoneda(ganancia)}</strong> por frasco (${porcentaje(ganancia, precioVentaTienda(p))})`;
}

function htmlStockProducto(p, tipo) {
  if (tipo === 'consolidado') return '<span class="celda-sub">Se trae por pedido</span>';
  if (tipo === 'decant') {
    return `${p.abiertos > 0 ? `<strong>${p.abiertos}</strong> <span class="celda-sub">abierto${p.abiertos === 1 ? '' : 's'}</span>` : '<span class="celda-sub texto-alerta">Sin frasco abierto</span>'}
      <div><button type="button" class="btn-link-inline" data-accion="inventario">Inventario</button></div>`;
  }
  const bajo = p.cerrados > 0 && p.cerrados <= (p.minimo ?? 2);
  return `${p.cerrados > 0 ? `<strong class="${bajo ? 'texto-alerta' : ''}">${p.cerrados}</strong> <span class="celda-sub">cerrado${p.cerrados === 1 ? '' : 's'}</span>` : '<span class="celda-sub">Sin stock</span>'}
    <div><button type="button" class="btn-link-inline" data-accion="inventario">${p.cerrados > 0 ? 'Ajustar' : 'Cargar stock'}</button></div>`;
}

function chipToggle(flag, activo, etiqueta, titulo) {
  return `<button type="button" class="chip-toggle" data-flag="${flag}" aria-pressed="${activo ? 'true' : 'false'}" title="${escapeHtml(titulo)}">${escapeHtml(etiqueta)}</button>`;
}

function htmlOpcionesProducto(p, tipo) {
  const visible = `<label class="switch-linea" title="Si está apagado, no aparece en la web"><span class="switch"><input type="checkbox" data-flag="activo" ${p.activo ? 'checked' : ''} /><span class="switch-track"></span></span><span>${p.activo ? 'Visible' : 'Oculto'}</span></label>`;
  if (tipo === 'decant') {
    return `${visible}<div class="prod-marcas">${chipToggle('decant_disponible', p.estado !== 'Agotado', 'Disponible', 'Apagado = sale como Agotado en la web')}${chipToggle('es_bestseller', p.es_bestseller, 'Popular', 'Aparece como popular')}</div>`;
  }
  if (tipo === 'consolidado') return visible;
  return `${visible}<div class="prod-marcas">${chipToggle('es_nuevo', p.es_nuevo, 'Nuevo', 'Sale con la etiqueta Nuevo y en "Nuevos Ingresos"')}${chipToggle('es_bestseller', p.es_bestseller, 'Más vendido', 'Marcado como más vendido')}</div>`;
}

function productoDeFila(el) {
  const id = Number(el.closest('tr')?.dataset.id);
  return PRODUCTOS_CACHE.find((p) => p.id === id);
}

function marcarGuardado(el) {
  el.classList.remove('guardado');
  void el.offsetWidth;
  el.classList.add('guardado');
  setTimeout(() => el.classList.remove('guardado'), 1400);
}

// Precio cambiado en la lista: se valida y se guarda en el momento.
async function manejarCambioProducto(e) {
  const input = e.target;
  const p = productoDeFila(input);
  if (!p) return;
  if (input.dataset.flag === 'activo') return guardarFlagProducto(p, 'activo', input.checked, input);
  const campo = input.dataset.campo;
  if (!campo) return;
  const tipo = tipoProducto(p);
  const original = p[campo] == null ? '' : Number(p[campo]);
  const revertir = (mensaje) => { input.value = original; if (mensaje) mostrarToast(mensaje, 'error'); };
  const valor = input.value === '' ? null : Number(input.value);
  if (campo === 'costo_importacion_pen') {
    if (valor != null && !(valor >= 0)) return revertir('El costo no puede ser negativo');
    try {
      await actualizarProducto(p.id, { costo_importacion_pen: valor });
      p.costo_importacion_pen = valor;
      input.closest('tr').querySelector('.prod-ganancia').innerHTML = htmlGananciaProducto(p);
      marcarGuardado(input);
      mostrarToast(valor == null ? `${p.nombre}: costo borrado` : `${p.nombre}: costo guardado (sus ventas sin costo se completaron)`);
    } catch (err) {
      revertir(err.message);
    }
    return;
  }
  if (valor != null && !(valor > 0)) return revertir('El precio debe ser mayor a 0');
  const cambios = { margen_aplicado: true };

  if (tipo === 'decant') {
    const tallas = { precio_3ml: p.precio_3ml, precio_5ml: p.precio_5ml, precio_10ml: p.precio_10ml, [campo]: valor };
    if (tallas.precio_3ml == null && tallas.precio_5ml == null && tallas.precio_10ml == null) return revertir('Deja al menos una talla con precio');
    cambios[campo] = valor;
    // Precio de referencia obligatorio en la base (el de la talla más grande, ver Agregar Decant).
    const referencia = tallas.precio_10ml ?? tallas.precio_5ml ?? tallas.precio_3ml;
    cambios.precio_tienda_regular = referencia;
    cambios.precio_consolidado_fijo = referencia;
  } else if (valor == null) {
    return revertir('Este precio es obligatorio');
  } else if (tipo === 'consolidado') {
    cambios.precio_consolidado_fijo = valor;
    cambios.precio_tienda_regular = valor;
  } else if (campo === 'precio_tienda_regular') {
    cambios.precio_tienda_regular = valor;
    if (Number(p.precio_consolidado_fijo) > valor) {
      if (!confirm(`El precio por consolidado (${formatoMoneda(p.precio_consolidado_fijo)}) quedaría más caro que el de tienda.\n\n¿Bajarlo también a ${formatoMoneda(valor)}?`)) return revertir();
      cambios.precio_consolidado_fijo = valor;
    }
  } else if (campo === 'precio_consolidado_fijo') {
    if (valor > Number(p.precio_tienda_regular)) return revertir(`El precio por consolidado no puede ser mayor al de tienda (${formatoMoneda(p.precio_tienda_regular)})`);
    cambios.precio_consolidado_fijo = valor;
  }
  try {
    await actualizarProducto(p.id, cambios);
    Object.assign(p, cambios);
    const fila = input.closest('tr');
    const otro = fila.querySelector('[data-campo="precio_consolidado_fijo"]');
    if (otro && otro !== input && cambios.precio_consolidado_fijo != null) otro.value = cambios.precio_consolidado_fijo;
    marcarGuardado(input);
    const ganancia = fila.querySelector('.prod-ganancia');
    if (ganancia) ganancia.innerHTML = htmlGananciaProducto(p);
    mostrarToast(`${p.nombre}: precio guardado`);
  } catch (err) {
    revertir(err.message);
  }
}

async function guardarFlagProducto(p, flag, valor, el) {
  let cambios;
  if (flag === 'decant_disponible') {
    if (valor && !p.abiertos && !confirm(`${p.nombre} no tiene frascos abiertos en Inventario.\n\n¿Marcarlo disponible igual? (se podría vender sin tener de dónde servirlo)`)) return false;
    cambios = { estado: valor ? 'Disponible' : 'Agotado' };
  } else {
    cambios = { [flag]: valor };
  }
  try {
    await actualizarProducto(p.id, cambios);
    Object.assign(p, cambios);
    if (flag === 'activo') {
      el.closest('tr').classList.toggle('fila-oculta', !valor);
      el.closest('.switch-linea').lastElementChild.textContent = valor ? 'Visible' : 'Oculto';
      mostrarToast(valor ? `${p.nombre} ya se ve en la web` : `${p.nombre} quedó oculto en la web`);
    } else {
      mostrarToast('Guardado');
    }
    return true;
  } catch (err) {
    if (el.type === 'checkbox') el.checked = !valor;
    mostrarToast(err.message, 'error');
    return false;
  }
}

async function manejarClickProducto(e) {
  const chip = e.target.closest('.chip-toggle');
  if (chip) {
    const p = productoDeFila(chip);
    const nuevo = chip.getAttribute('aria-pressed') !== 'true';
    chip.disabled = true;
    if (await guardarFlagProducto(p, chip.dataset.flag, nuevo, chip)) chip.setAttribute('aria-pressed', String(nuevo));
    chip.disabled = false;
    return;
  }
  const boton = e.target.closest('[data-accion]');
  if (!boton) return;
  const p = productoDeFila(boton);
  if (!p) return;
  if (boton.dataset.accion === 'editar') {
    try {
      abrirModalProducto(await obtenerProductoAdminPorId(p.id));
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  }
  if (boton.dataset.accion === 'inventario') abrirInventarioBuscando(`${p.marca} ${p.nombre}`);
  if (boton.dataset.accion === 'eliminar') eliminarProductoDesdeLista(p);
}

// Un perfume con pedidos, reservas o movimientos no se puede borrar (se perdería el historial):
// en ese caso se ofrece ocultarlo de la web, que es lo que normalmente se quiere.
async function eliminarProductoDesdeLista(p) {
  if (!confirm(`¿Eliminar ${p.marca} — ${p.nombre}?\n\nSi solo quieres que no se vea en la web, mejor apaga "Visible".`)) return;
  try {
    await eliminarProducto(p.id);
    PRODUCTOS_CACHE = PRODUCTOS_CACHE.filter((x) => x.id !== p.id);
    mostrarToast('Producto eliminado');
    renderProductos();
  } catch (err) {
    if (/foreign key|violates|referenc|constraint/i.test(err.message)) {
      if (!p.activo) return mostrarToast('Tiene ventas o movimientos guardados, por eso no se puede borrar (ya está oculto).', 'error');
      if (confirm('Este perfume tiene ventas, reservas o movimientos guardados y no se puede borrar.\n\n¿Ocultarlo de la web en su lugar?')) {
        await actualizarProducto(p.id, { activo: false }).then(() => { p.activo = false; mostrarToast('Quedó oculto en la web'); renderProductos(); }).catch((e2) => mostrarToast(e2.message, 'error'));
      }
    } else {
      mostrarToast(err.message, 'error');
    }
  }
}

/* ================= AGREGAR DECANT ================= */

function abrirModalDecant() {
  const form = document.getElementById('form-decant');
  form.reset();
  form.mililitros.value = 100;
  abrirModal('modal-decant');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-cancelar-decant')?.addEventListener('click', () => cerrarModal('modal-decant'));
  document.getElementById('form-decant')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const leer = (v) => (v === '' ? null : Number(v));
    const precio_3ml = leer(data.precio_3ml);
    const precio_5ml = leer(data.precio_5ml);
    const precio_10ml = leer(data.precio_10ml);
    if (precio_3ml == null && precio_5ml == null && precio_10ml == null) {
      mostrarToast('Carga el precio de al menos una talla', 'error');
      return;
    }
    // precio_tienda_regular/precio_consolidado_fijo son NOT NULL en la base y los sigue
    // leyendo la Calculadora de Márgenes (que no filtra decants) -- se les copia la talla más
    // grande cargada como referencia, aunque el checkout ya no los use para un decant (ver
    // migración 0016).
    const precioReferencia = precio_10ml ?? precio_5ml ?? precio_3ml;
    const payload = {
      // Sufijo "-decant" para no chocar con el slug del mismo perfume en botella completa (el
      // catálogo normal y el de decants sí pueden tener la misma marca+nombre, ver es_decant en
      // obtenerProductos()) -- slug es unique en toda la tabla perfumes.
      slug: `${generarSlug(data.nombre, data.marca)}-decant`,
      nombre: data.nombre,
      marca: data.marca,
      genero: data.genero,
      familia_olfativa: data.familia_olfativa || null,
      concentracion: data.concentracion || null,
      tipo_casa: data.tipo_casa || null,
      imagen_url: data.imagen_url || null,
      descripcion: data.descripcion || null,
      notas_olfativas: data.notas_olfativas || null,
      inspirado_en: data.inspirado_en || null,
      mililitros: Number(data.mililitros) || 100,
      precio_3ml,
      precio_5ml,
      precio_10ml,
      precio_tienda_regular: precioReferencia,
      precio_consolidado_fijo: precioReferencia,
      margen_aplicado: true,
      estado: 'Disponible',
      es_decant: true,
      activo: true,
    };
    try {
      await crearProducto(payload);
      mostrarToast('Decant agregado');
      cerrarModal('modal-decant');
      cargarProductos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

function abrirModalProducto(producto) {
  COTIZACION_ORIGEN = null;
  const form = document.getElementById('form-producto');
  form.reset();
  document.getElementById('modal-producto-titulo').textContent = producto ? 'Editar Perfume' : 'Agregar Perfume';
  form.id.value = producto?.id || '';
  if (producto) {
    Object.entries(producto).forEach(([key, val]) => {
      const field = form.elements[key];
      if (!field) return;
      if (field.type === 'checkbox') field.checked = !!val;
      else field.value = val ?? '';
    });
  }
  // Precio/stock/liquidación/mililitros de un decant se editan en la lista (Productos →
  // Decants) y en Inventario, no en este modal genérico -- se ocultan para no dar 2 lugares
  // distintos para el mismo dato. "required" se apaga junto con el campo: un input oculto
  // igual bloquea el submit si el navegador lo sigue validando.
  const esDecant = !!producto?.es_decant;
  document.querySelectorAll('#form-producto .campo-normal').forEach((el) => {
    el.style.display = esDecant ? 'none' : '';
    el.querySelectorAll('[required]').forEach((input) => { input.required = !esDecant; });
  });
  // Con consolidados apagados, el precio consolidado queda oculto (ver data-consolidado) y no
  // puede seguir siendo "required": un campo oculto obligatorio traba el submit sin avisar.
  form.precio_consolidado_fijo.required = CONSOLIDADOS_EN_ADMIN && !esDecant;
  document.querySelectorAll('#form-producto .campo-decant').forEach((el) => {
    el.style.display = esDecant ? '' : 'none';
  });
  // "Frascos que tienes ahora" solo al crear: después el stock se cambia en Inventario.
  document.querySelectorAll('#form-producto .campo-solo-nuevo').forEach((el) => { el.hidden = !!producto; });
  if (!producto) form.mililitros.value = 100;
  document.getElementById('bloque-liquidacion').hidden = !form.es_liquidacion.checked;
  llenarMarcasFormularioProducto();
  abrirModal('modal-producto');
  if (!producto) form.nombre.focus();
}

// Sugerencias de marca (las que ya existen) para no crear "Lattafa" y "lattafa " por separado.
function llenarMarcasFormularioProducto() {
  const marcas = [...new Set((PRODUCTOS_CACHE.length ? PRODUCTOS_CACHE : INVENTARIO_CACHE || []).map((p) => p.marca))].sort();
  document.getElementById('lista-marcas-producto').innerHTML = marcas.map((m) => `<option value="${escapeHtml(m)}"></option>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('chk-es-liquidacion')?.addEventListener('change', (e) => { document.getElementById('bloque-liquidacion').hidden = !e.target.checked; });
  document.getElementById('btn-cancelar-producto')?.addEventListener('click', () => { COTIZACION_ORIGEN = null; cerrarModal('modal-producto'); });
  document.getElementById('form-producto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    delete data.id;
    const stockInicial = !id && data.stock_inicial ? Math.max(0, Math.floor(Number(data.stock_inicial))) : 0;
    delete data.stock_inicial;
    data.mililitros = Number(data.mililitros);
    data.precio_tienda_regular = Number(data.precio_tienda_regular);
    data.precio_consolidado_fijo = Number(data.precio_consolidado_fijo);
    // Campo oculto con consolidados apagados: la base lo exige (NOT NULL y <= precio tienda), así
    // que a un perfume nuevo se le copia el precio de tienda y a uno existente se le recorta si
    // quedó por encima.
    if (!CONSOLIDADOS_EN_ADMIN) {
      data.precio_consolidado_fijo = Math.min(data.precio_consolidado_fijo || data.precio_tienda_regular, data.precio_tienda_regular);
    }
    data.descuento_tienda_porcentaje = Number(data.descuento_tienda_porcentaje || 0);
    data.costo_importacion_pen = data.costo_importacion_pen ? Number(data.costo_importacion_pen) : null;
    data.costo_importacion_usd = data.costo_importacion_usd ? Number(data.costo_importacion_usd) : null;
    data.es_nuevo = e.target.elements.es_nuevo.checked;
    data.es_bestseller = e.target.elements.es_bestseller.checked;
    data.es_liquidacion = e.target.elements.es_liquidacion.checked;
    data.precio_liquidacion = data.precio_liquidacion ? Number(data.precio_liquidacion) : null;
    data.liquidacion_unidad_minima = Number(data.liquidacion_unidad_minima || 1);
    // Sin "es_decant"/"id_decant_grupo" en este formulario a propósito -- un decant se crea
    // desde el modal "Agregar Decant" (ver abrirModalDecant) y esos 2 campos no se vuelven a
    // tocar después, así que no van en el payload de acá (si fueran undefined y se mandaran
    // igual, un producto ya marcado es_decant=true se desmarcaría solo al editar su nombre).
    // El <select> de "Tipo de Casa" nace en "Sin definir" (value=""), pero la constraint de la
    // base (chk en perfumes.tipo_casa) solo acepta 'Árabe'/'Diseñador'/'Nicho' o NULL -- un
    // string vacío no pasa el check y el insert/update fallaba con un error crudo de Postgres
    // cada vez que se guardaba un producto sin clasificar.
    data.tipo_casa = data.tipo_casa || null;
    if (data.precio_consolidado_fijo > data.precio_tienda_regular) {
      mostrarToast('El precio consolidado no puede ser mayor al precio tienda', 'error');
      return;
    }
    if (data.es_liquidacion && !data.precio_liquidacion) {
      mostrarToast('Ingresa el precio de liquidación', 'error');
      return;
    }
    // un precio de venta puesto a mano por el admin cuenta como "margen aplicado" (evita que
    // la Calculadora de Márgenes lo pise después con el modo "solo sin margen")
    data.margen_aplicado = true;
    try {
      let idProducto = id ? Number(id) : null;
      if (idProducto) await actualizarProducto(idProducto, data);
      else idProducto = await crearProducto(data);
      if (stockInicial > 0) await ajustarInventario({ idProducto, cerrados: stockInicial, motivo: 'Ingreso', nota: 'Stock inicial al crear el perfume' });
      if (COTIZACION_ORIGEN) {
        await responderCotizacionAdmin(COTIZACION_ORIGEN, { estado: 'Convertido_A_Producto', id_producto_creado: idProducto });
        COTIZACION_ORIGEN = null;
        actualizarBadgesNav();
      }
      mostrarToast('Perfume guardado');
      cerrarModal('modal-producto');
      cargarProductos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

/* ================= CALCULADORA DE MÁRGENES ================= */

const MARGENES_POR_PAGINA = 20;
let margenesPaginaActual = 1;

let margenesBusquedaTimeout;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('margenes-busqueda')?.addEventListener('input', () => {
    clearTimeout(margenesBusquedaTimeout);
    margenesBusquedaTimeout = setTimeout(() => { margenesPaginaActual = 1; cargarMargenes(); }, 350);
  });
  document.getElementById('margenes-filtro')?.addEventListener('change', () => { margenesPaginaActual = 1; cargarMargenes(); });
  document.getElementById('btn-aplicar-margen-masivo')?.addEventListener('click', aplicarMargenMasivoDesdeUI);
  document.getElementById('margen-masivo-solo-pendientes')?.addEventListener('change', actualizarPreviewMargenMasivo);
});

async function actualizarPreviewMargenMasivo() {
  const preview = document.getElementById('margen-masivo-preview');
  const soloSinMargen = document.getElementById('margen-masivo-solo-pendientes').checked;
  try {
    const n = await contarProductosConCosto({ soloSinMargen });
    preview.textContent = `Esto afectará a ${n} producto(s) con costo de importación registrado.`;
  } catch (err) {
    preview.textContent = '';
  }
}

async function cargarMargenes() {
  const tbody = document.getElementById('margenes-tbody');
  const busqueda = document.getElementById('margenes-busqueda')?.value;
  const soloSinMargen = document.getElementById('margenes-filtro')?.value === 'pendientes';
  actualizarPreviewMargenMasivo();
  try {
    let resultado = await obtenerProductosParaMargenes({ busqueda, soloSinMargen, pagina: margenesPaginaActual, porPagina: MARGENES_POR_PAGINA });
    if (!resultado.productos.length && margenesPaginaActual > 1 && resultado.total > 0) {
      margenesPaginaActual = 1;
      resultado = await obtenerProductosParaMargenes({ busqueda, soloSinMargen, pagina: margenesPaginaActual, porPagina: MARGENES_POR_PAGINA });
    }
    const { productos, totalPaginas } = resultado;
    tbody.innerHTML = productos.length ? productos.map(filaMargenAdmin).join('') : '<tr><td colspan="7" class="admin-empty">Sin productos.</td></tr>';
    conectarEventosMargenes();
    renderPaginacionAdmin('margenes-paginacion', margenesPaginaActual, totalPaginas, (pagina) => {
      margenesPaginaActual = pagina;
      cargarMargenes();
      tbody.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${err.message}</td></tr>`;
  }
}

function ganancia(costo, precio) {
  if (!costo || !precio) return '—';
  const soles = precio - costo;
  const pct = (soles / costo) * 100;
  return `${formatoMoneda(soles)} <span style="color:var(--color-text-faint);">(${pct.toFixed(0)}%)</span>`;
}

function filaMargenAdmin(p) {
  return `
    <tr data-id="${p.id}">
      <td>${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}</td>
      <td>${p.costo_importacion_pen != null ? formatoMoneda(p.costo_importacion_pen) : '<span class="admin-empty">sin costo</span>'}</td>
      <td><input type="number" class="input-precio-consolidado-margen" step="0.01" min="0.01" value="${p.precio_consolidado_fijo}" style="width:90px;" /></td>
      <td>${ganancia(p.costo_importacion_pen, p.precio_consolidado_fijo)}</td>
      <td><input type="number" class="input-precio-tienda-margen" step="0.01" min="0.01" value="${p.precio_tienda_regular}" style="width:90px;" /></td>
      <td>${ganancia(p.costo_importacion_pen, p.precio_tienda_regular)}</td>
      <td>
        ${p.margen_aplicado ? '<span class="status-tag">Con margen</span>' : '<span class="status-tag" style="background:rgba(196,106,95,0.15); color:var(--color-danger);">Sin margen</span>'}
        <button class="btn btn-outline btn-sm btn-guardar-margen" style="margin-left:6px;">Guardar</button>
      </td>
    </tr>
  `;
}

function conectarEventosMargenes() {
  document.querySelectorAll('#margenes-tbody .btn-guardar-margen').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fila = btn.closest('tr');
      const id = Number(fila.dataset.id);
      const precioConsolidado = Number(fila.querySelector('.input-precio-consolidado-margen').value);
      const precioTienda = Number(fila.querySelector('.input-precio-tienda-margen').value);
      if (!precioConsolidado || !precioTienda || precioConsolidado > precioTienda) {
        mostrarToast('El precio consolidado debe ser mayor a 0 y no puede superar el precio tienda', 'error');
        return;
      }
      try {
        await actualizarProducto(id, { precio_consolidado_fijo: precioConsolidado, precio_tienda_regular: precioTienda, margen_aplicado: true });
        mostrarToast('Precio actualizado');
        cargarMargenes();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });
}

async function aplicarMargenMasivoDesdeUI() {
  const margenConsolidado = Number(document.getElementById('margen-masivo-consolidado').value);
  const margenTienda = Number(document.getElementById('margen-masivo-tienda').value);
  const soloSinMargen = document.getElementById('margen-masivo-solo-pendientes').checked;

  if (margenConsolidado < 0 || margenTienda < 0 || margenTienda < margenConsolidado) {
    mostrarToast('Revisa los márgenes: el de tienda debe ser mayor o igual al consolidado', 'error');
    return;
  }
  const alcance = soloSinMargen ? 'los productos que aún no tienen margen aplicado' : 'TODO el catálogo (incluyendo precios ya ajustados a mano)';
  if (!confirm(`¿Aplicar margen consolidado ${margenConsolidado}% y tienda ${margenTienda}% a ${alcance}? Esto sobrescribirá esos precios de venta.`)) return;

  const boton = document.getElementById('btn-aplicar-margen-masivo');
  boton.disabled = true;
  try {
    const actualizados = await aplicarMargenMasivo(margenConsolidado, margenTienda, soloSinMargen);
    mostrarToast(`Margen aplicado a ${actualizados} producto(s)`);
    cargarMargenes();
    actualizarBadgesNav();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

/* ================= PEDIDOS ================= */

const ETIQUETAS_CANAL = { Web: 'Web', WhatsApp: 'WhatsApp', Tienda: 'Tienda', Instagram: 'Instagram', Facebook: 'Facebook', TikTok: 'TikTok', Otro: 'Otro' };
function etiquetaCanal(canal) {
  return ETIQUETAS_CANAL[canal] || canal || 'Web';
}

function etiquetaEntrega(tipo) {
  if (tipo === 'Recojo_En_Tienda') return etiquetaRecojoEnTienda();
  return { Agencia_Shalom: 'Agencia Shalom', Agencia_Olva: 'Agencia Olva', Domicilio: 'Delivery a domicilio' }[tipo] || 'Sin definir';
}

const ESTADOS_ENVIO_LABEL = { Preparando: 'Por despachar', En_Agencia: 'En agencia', En_Ruta: 'En ruta', Entregado: 'Entregado', Devuelto: 'Devuelto' };
const METODOS_PAGO_LABEL = { Yape: 'Yape', Plin: 'Plin', Transferencia_Bancaria: 'Transferencia', Tarjeta: 'Tarjeta', PagoEfectivo: 'PagoEfectivo', Efectivo: 'Efectivo' };

// "Distrito, Provincia, Departamento" sin repetir cuando distrito y provincia se llaman igual
// (Chiclayo, Chiclayo, Lambayeque → Chiclayo, Lambayeque).
function destinoTexto(d) {
  if (d.tipo === 'Recojo_En_Tienda') return 'Recojo en tienda';
  return [d.distrito, d.provincia && d.provincia !== d.distrito ? d.provincia : null, d.departamento].filter(Boolean).join(', ') || '—';
}

function fechaCortaEs(valor) {
  const f = fechaDB(valor);
  return f ? f.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}
function fechaHoraEs(valor) {
  const f = fechaDB(valor);
  return f ? f.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

// Número de WhatsApp del cliente (perfiles.telefono / direcciones_cliente) se guarda sin
// código de país (9 dígitos, empieza con 9 -- mismo formato que valida contacto.js). Se le
// antepone 51 acá para armar el link de wa.me; si el dato no calza con ese formato (vacío,
// mal tipeado), no hay forma segura de armar el link y se devuelve null.
function enlaceWhatsappCliente(telefono, mensaje) {
  const digitos = String(telefono || '').replace(/\D/g, '').replace(/^51/, '');
  if (!/^9\d{8}$/.test(digitos)) return null;
  return `https://wa.me/51${digitos}?text=${encodeURIComponent(mensaje)}`;
}

function primerNombre(nombreCompleto) {
  return (nombreCompleto || '').trim().split(/\s+/)[0] || '';
}

// Mensaje pre-armado para el botón "Notificar por WhatsApp" del detalle de pedido -- un clic
// abre WhatsApp con el aviso listo (mismo patrón que usa el resto del sitio, ver
// enlaceWhatsappPago en api.js), sin depender de ninguna integración de envío automático.
function mensajeNotificacionPago(p) {
  const nombre = primerNombre(p.cliente);
  const saludo = nombre ? `Hola ${nombre}!` : 'Hola!';
  if (p.estado_pago === 'Completado') {
    return `${saludo} Te confirmamos que tu pedido #${p.id} (${formatoMoneda(p.monto_total)}) en Maison Zadaca ya está pagado por completo. ¡Gracias por tu compra!`;
  }
  return `${saludo} Tu pedido #${p.id} en Maison Zadaca (total ${formatoMoneda(p.monto_total)}) tiene un saldo pendiente de ${formatoMoneda(p.monto_saldo_pendiente)}. Puedes coordinar el pago por Yape, Plin o transferencia respondiendo este mensaje.`;
}

function mensajeAvisoEnvio(p) {
  const d = p.envioDatos;
  const nombre = primerNombre(d.receptorNombre || p.cliente);
  const guia = p.envio?.numero_guia_seguimiento;
  const via = d.tipo === 'Agencia_Shalom' ? ' por Shalom' : d.tipo === 'Agencia_Olva' ? ' por Olva' : '';
  return `Hola ${nombre || ''}! Tu pedido #${p.id} de Maison Zadaca ya fue enviado${via}.`
    + (guia ? ` Tu N° de guía / orden es: ${guia}.` : '')
    + (d.agencia ? ` Lo recoges en: ${d.agencia}.` : '')
    + ' Lleva tu DNI para recogerlo. ¡Gracias por tu compra!';
}

// Texto listo para pegar en el formulario de la agencia o mandar por WhatsApp al courier.
function textoDatosEnvio(p) {
  const d = p.envioDatos;
  const lineas = [
    `Pedido #${p.id} — Maison Zadaca`,
    `Destinatario: ${d.receptorNombre || d.cliente}`,
    `DNI: ${(d.receptorNombre ? d.receptorDni : d.dni) || '—'}`,
    `Celular: ${(d.receptorNombre ? d.receptorTelefono || d.telefono : d.telefono) || '—'}`,
    `Entrega: ${etiquetaEntrega(d.tipo)}`,
  ];
  if (d.tipo !== 'Recojo_En_Tienda') lineas.push(`Destino: ${destinoTexto(d)}`);
  if (d.agencia) lineas.push(`Agencia: ${d.agencia}`);
  if (d.direccion) lineas.push(`Dirección: ${d.direccion}`);
  if (d.receptorNombre) lineas.push(`Compra: ${d.cliente}${d.dni ? ` (DNI ${d.dni})` : ''}`);
  return lineas.join('\n');
}

async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

// Pestañas: Todos / Perfumes (sin ningún decant adentro) / Con decants -- los tres son
// tipo_pedido='Directo_Tienda' (nacen del mismo carrito o del registro manual), separados
// mirando detalle_pedido (ver soloDecants en obtenerPedidosAdmin). Consolidado solo aparece si
// CONSOLIDADOS_EN_ADMIN.
let pedidosTipoActual = 'Directo_Tienda';
let pedidosSoloDecants;
const PEDIDOS_SELECCIONADOS = new Set();

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('pedidos-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarPedidos, 350); });
  ['pedidos-filtro-estado', 'pedidos-filtro-envio', 'pedidos-filtro-anulados'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', cargarPedidos);
  });
  document.querySelectorAll('#pedidos-tipo-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#pedidos-tipo-tabs .admin-tab').forEach((t2) => t2.classList.remove('active'));
      tab.classList.add('active');
      pedidosTipoActual = tab.dataset.tipo;
      pedidosSoloDecants = tab.dataset.tipo === 'Consolidado' || tab.dataset.decants === 'todos' ? undefined : tab.dataset.decants === '1';
      PEDIDOS_SELECCIONADOS.clear();
      cargarPedidos();
    });
  });
  document.getElementById('pedidos-check-todos')?.addEventListener('change', (e) => {
    document.querySelectorAll('#pedidos-tbody .chk-pedido:not(:disabled)').forEach((chk) => {
      chk.checked = e.target.checked;
      const id = Number(chk.closest('tr').dataset.id);
      if (chk.checked) PEDIDOS_SELECCIONADOS.add(id); else PEDIDOS_SELECCIONADOS.delete(id);
    });
    actualizarBotonEtiquetas();
  });
  document.getElementById('btn-imprimir-etiquetas')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await imprimirEtiquetasDePedidos([...PEDIDOS_SELECCIONADOS]);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      actualizarBotonEtiquetas();
    }
  });
});

function actualizarBotonEtiquetas() {
  const btn = document.getElementById('btn-imprimir-etiquetas');
  if (!btn) return;
  btn.textContent = `Imprimir etiquetas (${PEDIDOS_SELECCIONADOS.size})`;
  btn.disabled = PEDIDOS_SELECCIONADOS.size === 0;
}

async function cargarPedidos() {
  const tbody = document.getElementById('pedidos-tbody');
  const resumen = document.getElementById('pedidos-resumen');
  try {
    const pedidos = await obtenerPedidosAdmin({
      busqueda: document.getElementById('pedidos-busqueda').value,
      estadoPago: document.getElementById('pedidos-filtro-estado').value,
      estadoEnvio: document.getElementById('pedidos-filtro-envio').value,
      anulados: document.getElementById('pedidos-filtro-anulados').value,
      tipoPedido: pedidosTipoActual,
      soloDecants: pedidosSoloDecants,
    });

    const visibles = new Set(pedidos.map((p) => p.id));
    [...PEDIDOS_SELECCIONADOS].forEach((id) => { if (!visibles.has(id)) PEDIDOS_SELECCIONADOS.delete(id); });

    const activos = pedidos.filter((p) => !p.cancelado);
    const porDespachar = activos.filter((p) => (p.envio?.estado_envio || 'Preparando') === 'Preparando').length;
    const porCobrar = activos.reduce((acc, p) => acc + Number(p.monto_saldo_pendiente || 0), 0);
    const vendido = activos.reduce((acc, p) => acc + Number(p.monto_total || 0), 0);
    resumen.innerHTML = `
      <div class="stat-card"><div class="stat-value">${activos.length}</div><div class="stat-label">Pedidos en la lista</div></div>
      <div class="stat-card ${porDespachar ? 'warn' : ''}"><div class="stat-value">${porDespachar}</div><div class="stat-label">Por despachar</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(vendido)}</div><div class="stat-label">Total vendido</div></div>
      <div class="stat-card ${porCobrar ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(porCobrar)}</div><div class="stat-label">Por cobrar</div></div>
    `;
    const conteo = document.getElementById('pedidos-conteo');
    if (conteo) conteo.textContent = `${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'}`;

    tbody.innerHTML = pedidos.length ? pedidos.map(filaPedidoAdmin).join('') : '<tr><td colspan="8" class="admin-empty">No hay pedidos con estos filtros.</td></tr>';
    document.getElementById('pedidos-check-todos').checked = false;
    conectarEventosPedidos();
    actualizarBotonEtiquetas();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

function filaPedidoAdmin(p) {
  const destino = destinoTexto({ tipo: p.envio_tipo, distrito: p.envio_distrito, provincia: p.envio_provincia, departamento: p.envio_departamento });
  const estadoEnvio = p.envio?.estado_envio || 'Preparando';
  const saldo = Number(p.monto_saldo_pendiente || 0);
  return `
    <tr data-id="${p.id}" class="${p.cancelado ? 'fila-anulada' : ''}">
      <td><input type="checkbox" class="chk-pedido" aria-label="Seleccionar pedido #${p.id}" ${PEDIDOS_SELECCIONADOS.has(p.id) ? 'checked' : ''} ${p.cancelado ? 'disabled' : ''} /></td>
      <td><strong style="color:var(--color-text);">#${p.id}</strong> <span class="canal-tag">${escapeHtml(etiquetaCanal(p.canal))}</span><br><span class="celda-sub">${fechaCortaEs(p.fecha_creacion)}</span>${p.campana ? `<br><span class="celda-sub">${escapeHtml(p.campana)}</span>` : ''}</td>
      <td>${escapeHtml(p.cliente)}<br><span class="celda-sub">${[p.dni_cliente ? `DNI ${escapeHtml(p.dni_cliente)}` : '', escapeHtml(p.telefono_cliente || '')].filter(Boolean).join(' · ')}</span></td>
      <td>${escapeHtml(p.envio_tipo ? etiquetaEntrega(p.envio_tipo) : '—')}<br><span class="celda-sub">${escapeHtml(p.envio_tipo === 'Recojo_En_Tienda' ? '' : destino)}</span></td>
      <td>${formatoMoneda(p.monto_total)}</td>
      <td>${p.cancelado ? '<span class="status-tag tag-anulado">Anulado</span>' : `<span class="status-tag ${claseEstadoPago(p.estado_pago)}" title="Se calcula solo a partir de los pagos registrados">${escapeHtml(p.estado_pago)}</span>${saldo > 0 ? `<br><span class="celda-sub">Debe ${formatoMoneda(saldo)}</span>` : ''}`}</td>
      <td><span class="envio-tag envio-${estadoEnvio.toLowerCase()}">${escapeHtml(ESTADOS_ENVIO_LABEL[estadoEnvio] || estadoEnvio)}</span></td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm btn-ver-pedido">Ver</button>
        ${p.cancelado ? '' : '<button class="btn btn-outline btn-sm btn-etiqueta-pedido" title="Imprimir etiqueta de envío">Etiqueta</button>'}
      </div></td>
    </tr>
  `;
}

function conectarEventosPedidos() {
  document.querySelectorAll('#pedidos-tbody .btn-ver-pedido').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetallePedido(Number(btn.closest('tr').dataset.id)));
  });
  document.querySelectorAll('#pedidos-tbody .btn-etiqueta-pedido').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await imprimirEtiquetasDePedidos([Number(btn.closest('tr').dataset.id)]); } catch (err) { mostrarToast(err.message, 'error'); }
      btn.disabled = false;
    });
  });
  document.querySelectorAll('#pedidos-tbody .chk-pedido').forEach((chk) => {
    chk.addEventListener('change', () => {
      const id = Number(chk.closest('tr').dataset.id);
      if (chk.checked) PEDIDOS_SELECCIONADOS.add(id); else PEDIDOS_SELECCIONADOS.delete(id);
      actualizarBotonEtiquetas();
    });
  });
}

/* ---------- Impresión: etiqueta de envío y comprobante ---------- */

let CONFIG_SITIO_CACHE = null;
async function configuracionSitioParaImprimir() {
  if (!CONFIG_SITIO_CACHE) {
    try { CONFIG_SITIO_CACHE = await obtenerConfiguracionSitioAdmin(); } catch { CONFIG_SITIO_CACHE = {}; }
  }
  return CONFIG_SITIO_CACHE;
}

async function imprimirEtiquetasDePedidos(ids) {
  if (!ids.length) return;
  // La ventana se abre ANTES de esperar a Supabase: si se abre después de un await, el
  // navegador ya no la considera respuesta directa al clic y la bloquea como pop-up.
  const ventana = window.open('', '_blank');
  if (!ventana) { mostrarToast('El navegador bloqueó la ventana de impresión — permite ventanas emergentes para este sitio', 'error'); return; }
  ventana.document.write('<p style="font-family:Arial,sans-serif;padding:24px;">Preparando etiquetas…</p>');
  try {
    const [pedidos, cfg] = await Promise.all([obtenerPedidosCompletos(ids), configuracionSitioParaImprimir()]);
    escribirVentanaEtiquetas(ventana, pedidos.filter((p) => !p.cancelado), cfg);
  } catch (err) {
    ventana.close();
    throw err;
  }
}

function htmlEtiquetaEnvio(p, cfg) {
  const d = p.envioDatos;
  const recibeOtro = !!d.receptorNombre;
  const destinatario = recibeOtro ? d.receptorNombre : d.cliente;
  const dni = recibeOtro ? d.receptorDni : d.dni;
  const celular = recibeOtro ? (d.receptorTelefono || d.telefono) : d.telefono;
  const esRecojo = d.tipo === 'Recojo_En_Tienda';
  const lugar = [d.distrito, d.provincia && d.provincia !== d.distrito ? d.provincia : null, d.departamento].filter(Boolean).join(' — ');
  const unidades = p.items.reduce((acc, i) => acc + Number(i.cantidad || 0), 0);
  return `
    <article class="etiqueta">
      <header class="et-head">
        <div><div class="et-marca">MAISON ZADACA</div><div class="et-tag">Perfumes originales</div></div>
        <div class="et-pedido">PEDIDO <strong>#${p.id}</strong><br>${fechaCortaEs(p.fecha_creacion)}</div>
      </header>
      <section class="et-bloque">
        <div class="et-label">Destinatario</div>
        <div class="et-nombre">${escapeHtml(destinatario || '—')}</div>
        <div class="et-datos"><span>DNI: <strong>${escapeHtml(dni || '________')}</strong></span><span>CEL: <strong>${escapeHtml(celular || '________')}</strong></span></div>
        ${recibeOtro ? `<div class="et-chico">Compra: ${escapeHtml(d.cliente)}${d.dni ? ` (DNI ${escapeHtml(d.dni)})` : ''}</div>` : ''}
      </section>
      <section class="et-bloque">
        <div class="et-label">${esRecojo ? 'Entrega' : 'Destino'}</div>
        ${esRecojo
          ? `<div class="et-destino">RECOJO EN TIENDA</div><div class="et-chico">${escapeHtml(cfg.direccion_chiclayo || '')}</div>`
          : `<div class="et-destino">${escapeHtml((lugar || 'SIN DESTINO').toUpperCase())}</div>
             <div class="et-via">${escapeHtml(etiquetaEntrega(d.tipo))}${d.agencia ? `: ${escapeHtml(d.agencia)}` : ''}</div>
             ${d.direccion ? `<div class="et-chico">Dirección: ${escapeHtml(d.direccion)}</div>` : ''}`}
      </section>
      <section class="et-bloque et-contenido">
        <div class="et-label">Contenido (${unidades} und.)</div>
        ${p.items.map((i) => `<div class="et-item"><span>${escapeHtml(nombreItemPedido(i))}</span><span>×${i.cantidad}</span></div>`).join('')}
      </section>
      <footer class="et-remitente">
        <div class="et-label">Remitente</div>
        <div><strong>Maison Zadaca</strong> · Cel. ${escapeHtml(formatoWhatsapp())}</div>
        <div>${escapeHtml(cfg.direccion_chiclayo || 'Chiclayo')}</div>
      </footer>
    </article>
  `;
}

// Ventana aparte con su propio HTML/CSS (blanco y negro, pensado para papel) -- el tamaño se
// elige arriba: etiqueta de 10×15 cm (impresora térmica / de etiquetas) o hoja A4 con 4
// etiquetas por hoja para recortar. El @page se reescribe según el botón antes de imprimir.
function escribirVentanaEtiquetas(ventana, pedidos, cfg) {
  if (!pedidos.length) {
    ventana.document.open();
    ventana.document.write('<p style="font-family:Arial,sans-serif;padding:24px;">No hay pedidos activos para imprimir (los anulados no llevan etiqueta).</p>');
    ventana.document.close();
    return;
  }
  ventana.document.open();
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8" />
    <title>Etiquetas de envío — ${pedidos.length} pedido(s)</title>
    <style id="estilo-pagina">@page { size: 100mm 150mm; margin: 0; }</style>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #eee; }
      .barra { position: sticky; top: 0; background: #1a1a1a; color: #fff; padding: 12px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 14px; z-index: 5; }
      .barra button { background: #7a2030; color: #fff; border: 0; padding: 9px 14px; border-radius: 4px; font-size: 14px; cursor: pointer; }
      .barra button.sec { background: #444; }
      .barra label { display: flex; gap: 6px; align-items: center; }
      .hoja { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; justify-content: center; }
      .etiqueta { background: #fff; width: 100mm; height: 150mm; padding: 5mm; border: 1px dashed #999; display: flex; flex-direction: column; gap: 3mm; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
      .et-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 2mm; }
      .et-marca { font-size: 17px; font-weight: 900; letter-spacing: 1.5px; }
      .et-tag { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
      .et-pedido { text-align: right; font-size: 11px; line-height: 1.35; }
      .et-pedido strong { font-size: 16px; }
      .et-bloque { border-bottom: 1px dashed #000; padding-bottom: 2.5mm; }
      .et-label { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 1mm; color: #333; }
      .et-nombre { font-size: 19px; font-weight: 800; text-transform: uppercase; line-height: 1.15; word-break: break-word; }
      .et-datos { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; margin-top: 1.5mm; }
      .et-destino { font-size: 17px; font-weight: 800; line-height: 1.2; }
      .et-via { font-size: 13px; font-weight: 700; margin-top: 1mm; }
      .et-chico { font-size: 11px; margin-top: 1mm; line-height: 1.3; }
      .et-contenido { flex: 1; overflow: hidden; }
      .et-item { display: flex; justify-content: space-between; gap: 6px; font-size: 10.5px; line-height: 1.35; }
      .et-remitente { font-size: 10.5px; line-height: 1.35; }
      body.sin-contenido .et-contenido { display: none; }
      body.sin-contenido .et-remitente { margin-top: auto; }
      body.modo-a4 .hoja { display: grid; grid-template-columns: repeat(2, 95mm); gap: 6mm; padding: 0; justify-content: center; }
      body.modo-a4 .etiqueta { width: 95mm; height: 135mm; }
      @media print {
        body { background: #fff; }
        .barra { display: none; }
        .hoja { padding: 0; gap: 0; display: block; }
        .etiqueta { border: none; page-break-after: always; break-after: page; }
        .etiqueta:last-child { page-break-after: auto; break-after: auto; }
        body.modo-a4 .hoja { display: grid; gap: 6mm; }
        body.modo-a4 .etiqueta { border: 1px dashed #999; page-break-after: auto; break-after: auto; }
      }
    </style>
  </head><body>
    <div class="barra">
      <strong>${pedidos.length} etiqueta(s)</strong>
      <button type="button" id="imp-10x15">Imprimir 10×15 cm</button>
      <button type="button" class="sec" id="imp-a4">Imprimir en hoja A4 (4 por hoja)</button>
      <label><input type="checkbox" id="imp-contenido" checked /> Incluir contenido del paquete</label>
    </div>
    <div class="hoja">${pedidos.map((p) => htmlEtiquetaEnvio(p, cfg)).join('')}</div>
    <script>
      function imprimir(modo) {
        document.body.classList.toggle('modo-a4', modo === 'a4');
        document.getElementById('estilo-pagina').textContent = modo === 'a4'
          ? '@page { size: A4; margin: 8mm; }'
          : '@page { size: 100mm 150mm; margin: 0; }';
        setTimeout(function () { window.print(); }, 50);
      }
      document.getElementById('imp-10x15').onclick = function () { imprimir('10x15'); };
      document.getElementById('imp-a4').onclick = function () { imprimir('a4'); };
      document.getElementById('imp-contenido').onchange = function (e) { document.body.classList.toggle('sin-contenido', !e.target.checked); };
    <\/script>
  </body></html>`);
  ventana.document.close();
}

// Comprobante para armar el paquete / entregar al cliente: datos completos, productos, pagos y
// saldo. Ventana aparte (no depende de admin.css) que se manda a imprimir apenas carga.
async function imprimirComprobantePedido(p) {
  const ventana = window.open('', '_blank');
  if (!ventana) { mostrarToast('El navegador bloqueó la ventana de impresión — habilítala para este sitio', 'error'); return; }
  const cfg = await configuracionSitioParaImprimir();
  const d = p.envioDatos;
  const pagosAprobados = (p.pagos || []).filter((pg) => pg.estado_pago === 'Aprobado');
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8" />
    <title>Pedido #${p.id} — Maison Zadaca</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 680px; margin: 0 auto; }
      h1 { font-size: 1.3rem; margin: 0 0 4px; }
      .sub { color: #555; font-size: 0.85rem; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .bloque { margin-bottom: 18px; }
      .bloque h2 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7a2030; margin: 0 0 6px; }
      .bloque p { margin: 2px 0; font-size: 0.9rem; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { text-align: left; padding: 7px 4px; border-bottom: 1px solid #ddd; font-size: 0.88rem; }
      th:last-child, td:last-child { text-align: right; }
      tfoot td { font-weight: 700; border-bottom: none; }
      .anulado { color: #b0473a; font-weight: 700; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>
    <h1>Maison Zadaca — Pedido #${p.id}</h1>
    <div class="sub">${fechaHoraEs(p.fecha_creacion)} · Canal: ${escapeHtml(etiquetaCanal(p.canal))}${p.campana ? ` · Consolidado: ${escapeHtml(p.campana)}` : ''}${p.cancelado ? ' · <span class="anulado">ANULADO</span>' : ''}</div>
    <div class="grid">
      <div class="bloque">
        <h2>Cliente</h2>
        <p><strong>${escapeHtml(d.cliente)}</strong></p>
        <p>DNI: ${escapeHtml(d.dni || '—')}</p>
        <p>Celular: ${escapeHtml(d.telefono || '—')}</p>
        ${d.correo ? `<p>${escapeHtml(d.correo)}</p>` : ''}
      </div>
      <div class="bloque">
        <h2>Entrega</h2>
        <p><strong>${escapeHtml(etiquetaEntrega(d.tipo))}</strong>${d.agencia ? ` — ${escapeHtml(d.agencia)}` : ''}</p>
        ${d.tipo === 'Recojo_En_Tienda' ? `<p>${escapeHtml(cfg.direccion_chiclayo || '')}</p>` : `<p>${escapeHtml(destinoTexto(d))}</p>`}
        ${d.direccion ? `<p>${escapeHtml(d.direccion)}</p>` : ''}
        ${d.receptorNombre ? `<p>Recibe: ${escapeHtml(d.receptorNombre)}${d.receptorDni ? ` (DNI ${escapeHtml(d.receptorDni)})` : ''}${d.receptorTelefono ? ` · ${escapeHtml(d.receptorTelefono)}` : ''}</p>` : ''}
        ${p.envio?.numero_guia_seguimiento ? `<p>N° de guía: ${escapeHtml(p.envio.numero_guia_seguimiento)}</p>` : ''}
      </div>
    </div>
    <div class="bloque">
      <h2>Productos</h2>
      <table>
        <thead><tr><th>Cant.</th><th>Producto</th><th>P. unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${p.items.map((i) => `<tr><td>${i.cantidad}</td><td>${escapeHtml(nombreItemPedido(i))}</td><td>${formatoMoneda(i.precio_unitario_aplicado)}</td><td>${formatoMoneda(i.subtotal)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="3">Total</td><td>${formatoMoneda(p.monto_total)}</td></tr>
          <tr><td colspan="3">Pagado${pagosAprobados.length ? ` (${pagosAprobados.map((pg) => METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || '—').join(', ')})` : ''}</td><td>${formatoMoneda(p.monto_adelanto_pagado)}</td></tr>
          <tr><td colspan="3">Saldo</td><td>${formatoMoneda(p.monto_saldo_pendiente)}</td></tr>
        </tfoot>
      </table>
    </div>
    <p style="font-size:0.78rem; color:#555; margin-top:28px;">Maison Zadaca · ${escapeHtml(cfg.direccion_chiclayo || 'Chiclayo')} · WhatsApp ${escapeHtml(formatoWhatsapp())}</p>
    <script>window.onload = function () { window.print(); };<\/script>
  </body></html>`);
  ventana.document.close();
}

/* ---------- Detalle del pedido ---------- */

async function abrirDetallePedido(id) {
  const mount = document.getElementById('modal-pedido-contenido');
  document.getElementById('modal-pedido-titulo').textContent = `Pedido #${id}`;
  mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  abrirModal('modal-pedido');
  try {
    const p = await obtenerDetallePedidoAdmin(id);
    const d = p.envioDatos;
    const estadoEnvio = p.envio?.estado_envio || 'Preparando';
    const enlacePago = enlaceWhatsappCliente(d.telefono, mensajeNotificacionPago(p));
    const enlaceEnvio = enlaceWhatsappCliente(d.receptorNombre ? (d.receptorTelefono || d.telefono) : d.telefono, mensajeAvisoEnvio(p));
    document.getElementById('modal-pedido-titulo').innerHTML = `Pedido #${p.id} ${p.cancelado ? '<span class="status-tag tag-anulado">Anulado</span>' : ''}`;

    mount.innerHTML = `
      <p class="detalle-meta">${fechaHoraEs(p.fecha_creacion)} &middot; <span class="canal-tag">${escapeHtml(etiquetaCanal(p.canal))}</span>${p.campana ? ` &middot; Consolidado: ${escapeHtml(p.campana)}` : ''}</p>
      ${p.cancelado ? `<div class="alert alert-error">Pedido anulado el ${fechaHoraEs(p.fecha_cancelacion)}${p.motivo_cancelacion ? ` — ${escapeHtml(p.motivo_cancelacion)}` : ''}. Su stock ya se devolvió al inventario.</div>` : ''}

      <div class="detalle-grid">
        <div class="detalle-bloque">
          <div class="detalle-bloque-head"><strong>Cliente</strong></div>
          <p><strong style="color:var(--color-text);">${escapeHtml(d.cliente)}</strong></p>
          <p>DNI: ${escapeHtml(d.dni || '—')}</p>
          <p>Celular: ${escapeHtml(d.telefono || '—')}</p>
          ${d.correo ? `<p>${escapeHtml(d.correo)}</p>` : ''}
        </div>
        <div class="detalle-bloque">
          <div class="detalle-bloque-head"><strong>Envío</strong><button type="button" class="link-arrow btn-link-inline" id="btn-editar-envio">Editar datos</button></div>
          <p><strong style="color:var(--color-text);">${escapeHtml(etiquetaEntrega(d.tipo))}</strong>${d.agencia ? ` — ${escapeHtml(d.agencia)}` : ''}</p>
          ${d.tipo !== 'Recojo_En_Tienda' ? `<p>${escapeHtml(destinoTexto(d))}</p>` : ''}
          ${d.direccion ? `<p>${escapeHtml(d.direccion)}</p>` : ''}
          ${d.receptorNombre ? `<p>Recibe: ${escapeHtml(d.receptorNombre)}${d.receptorDni ? ` · DNI ${escapeHtml(d.receptorDni)}` : ''}${d.receptorTelefono ? ` · ${escapeHtml(d.receptorTelefono)}` : ''}</p>` : ''}
        </div>
      </div>

      <form id="form-editar-envio" class="detalle-bloque" hidden>
        <div class="form-row-3">
          <div class="form-group"><label>Cliente</label><input name="cliente_nombre" value="${escapeHtml(d.cliente === '—' ? '' : d.cliente)}" required /></div>
          <div class="form-group"><label>DNI</label><input name="cliente_dni" value="${escapeHtml(d.dni)}" maxlength="15" /></div>
          <div class="form-group"><label>Celular</label><input name="cliente_telefono" value="${escapeHtml(d.telefono)}" maxlength="20" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Entrega</label>
            <select name="envio_tipo">
              ${['Agencia_Shalom', 'Agencia_Olva', 'Domicilio', 'Recojo_En_Tienda'].map((t) => `<option value="${t}" ${d.tipo === t ? 'selected' : ''}>${escapeHtml(etiquetaEntrega(t))}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Agencia / sede</label><input name="envio_agencia" value="${escapeHtml(d.agencia)}" /></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Departamento</label><input name="envio_departamento" value="${escapeHtml(d.departamento)}" /></div>
          <div class="form-group"><label>Provincia</label><input name="envio_provincia" value="${escapeHtml(d.provincia)}" /></div>
          <div class="form-group"><label>Distrito</label><input name="envio_distrito" value="${escapeHtml(d.distrito)}" /></div>
        </div>
        <div class="form-group"><label>Dirección / referencia</label><input name="envio_direccion" value="${escapeHtml(d.direccion)}" /></div>
        <div class="form-row-3">
          <div class="form-group"><label>Recibe (si es otra persona)</label><input name="envio_receptor_nombre" value="${escapeHtml(d.receptorNombre)}" /></div>
          <div class="form-group"><label>DNI de quien recibe</label><input name="envio_receptor_dni" value="${escapeHtml(d.receptorDni)}" maxlength="15" /></div>
          <div class="form-group"><label>Celular de quien recibe</label><input name="envio_receptor_telefono" value="${escapeHtml(d.receptorTelefono)}" maxlength="20" /></div>
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Guardar datos de envío</button>
      </form>

      <div class="detalle-acciones">
        ${p.cancelado ? '' : '<button class="btn btn-primary btn-sm" id="btn-etiqueta-detalle">Imprimir etiqueta de envío</button>'}
        <button class="btn btn-outline btn-sm" id="btn-imprimir-pedido">Imprimir comprobante</button>
        <button class="btn btn-ghost btn-sm" id="btn-copiar-envio">Copiar datos de envío</button>
      </div>

      <strong class="detalle-titulo">Productos</strong>
      <div style="margin:8px 0 20px;">
        ${p.items.map((i) => `<div class="detalle-item"><span>${i.cantidad} &times; ${i.marca ? `${escapeHtml(i.marca)} — ` : ''}${escapeHtml(i.nombre)}${i.es_decant ? ` <span class="badge badge-decant">Decant ${i.talla_ml}ml</span>` : ''}${i.es_libre ? ' <span class="canal-tag">Libre</span>' : ''}</span><span>${formatoMoneda(i.subtotal)}</span></div>`).join('')}
        <div class="detalle-item detalle-total"><span>Total</span><span>${formatoMoneda(p.monto_total)}</span></div>
      </div>

      ${p.cancelado ? '' : `
      <strong class="detalle-titulo">Despacho</strong>
      <div class="form-row-3" style="margin-top:10px;">
        <div class="form-group"><label>Estado de envío</label>
          <select id="det-estado-envio">
            ${Object.entries(ESTADOS_ENVIO_LABEL).map(([valor, texto]) => `<option value="${valor}" ${estadoEnvio === valor ? 'selected' : ''}>${texto}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>N° de guía / orden</label><input type="text" id="det-numero-guia" value="${escapeHtml(p.envio?.numero_guia_seguimiento || '')}" /></div>
        <div class="form-group"><label>Transportista</label><input type="text" id="det-empresa" value="${escapeHtml(p.envio?.empresa_transporte || (d.tipo === 'Agencia_Shalom' ? 'Shalom' : d.tipo === 'Agencia_Olva' ? 'Olva' : ''))}" /></div>
      </div>
      <div class="detalle-acciones" style="margin-top:0;">
        <button class="btn btn-outline btn-sm" id="btn-guardar-envio">Guardar despacho</button>
        ${enlaceEnvio ? `<a class="btn btn-whatsapp btn-sm" href="${enlaceEnvio}" target="_blank" rel="noopener">Avisar envío por WhatsApp</a>` : ''}
      </div>`}

      <strong class="detalle-titulo" style="margin-top:22px;">Pagos</strong>
      <p class="form-hint" style="margin:4px 0 8px;">El comprobante se coordina por WhatsApp; esto solo registra lo ya confirmado.</p>
      <div class="detalle-item"><span>Pagado: ${formatoMoneda(p.monto_adelanto_pagado)}</span><span>Saldo pendiente: <strong style="color:var(--color-gold);">${formatoMoneda(p.monto_saldo_pendiente)}</strong></span></div>
      <div style="margin:10px 0;">
        ${p.pagos.length ? p.pagos.map((pg) => `
          <div class="detalle-item">
            <span>${escapeHtml(METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || '—')} &middot; ${fechaCortaEs(pg.fecha_pago)}</span>
            <span style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              ${formatoMoneda(pg.monto)}
              <span class="status-tag ${pg.estado_pago === 'Anulado' ? 'tag-anulado' : ''}">${escapeHtml(pg.estado_pago)}</span>
              ${pg.estado_pago === 'Aprobado' ? `<button type="button" class="btn btn-ghost btn-sm btn-anular-pago" data-id="${pg.id}">Anular</button>` : ''}
            </span>
          </div>`).join('') : '<p style="font-size:0.8rem; color:var(--color-text-faint);">Sin pagos registrados.</p>'}
      </div>
      <div class="form-row">
        <div class="form-group"><label>Registrar pago (S/)</label><input type="number" id="det-pago-monto" step="0.01" min="0" value="${p.monto_saldo_pendiente > 0 ? p.monto_saldo_pendiente : ''}" /></div>
        <div class="form-group"><label>Método</label>
          <select id="det-pago-metodo">
            ${Object.entries(METODOS_PAGO_LABEL).map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="detalle-acciones" style="margin-top:0;">
        <button class="btn btn-outline btn-sm" id="btn-registrar-pago">Registrar Pago</button>
        ${enlacePago ? `<a class="btn btn-whatsapp btn-sm" href="${enlacePago}" target="_blank" rel="noopener">Notificar estado de pago por WhatsApp</a>` : '<span class="form-hint">Sin celular válido para armar el link de WhatsApp.</span>'}
      </div>

      <strong class="detalle-titulo" style="margin-top:22px;">Nota interna</strong>
      <textarea id="det-nota-admin" rows="2" class="detalle-textarea" placeholder="Solo la ven los admin: ej. envolver para regalo, cobrar saldo al entregar...">${escapeHtml(p.nota_admin || '')}</textarea>
      <button class="btn btn-ghost btn-sm" id="btn-guardar-nota">Guardar nota</button>

      ${p.cancelado ? '' : `
      <div class="detalle-peligro">
        <div><strong>${p.tipo_pedido === 'Consolidado' ? 'Anular encargo' : 'Anular pedido'}</strong><p class="form-hint" style="margin:2px 0 0;">${p.tipo_pedido === 'Consolidado' ? 'Un encargo no tocó tu stock: anularlo solo lo saca de la campaña y de la contabilidad.' : 'Devuelve al inventario los frascos cerrados y los ml de decant de este pedido.'} Los pagos no se tocan: si devolviste dinero, anula el pago arriba.</p></div>
        <button class="btn btn-danger btn-sm" id="btn-anular-pedido">Anular pedido</button>
      </div>`}
    `;

    document.getElementById('btn-editar-envio').addEventListener('click', () => {
      const form = document.getElementById('form-editar-envio');
      form.hidden = !form.hidden;
    });
    document.getElementById('form-editar-envio').addEventListener('submit', async (e) => {
      e.preventDefault();
      const datos = Object.fromEntries(new FormData(e.target));
      Object.keys(datos).forEach((k) => { datos[k] = datos[k].trim() || null; });
      try {
        await actualizarDatosPedido(id, datos);
        mostrarToast('Datos de envío actualizados');
        abrirDetallePedido(id);
        cargarPedidos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    document.getElementById('btn-etiqueta-detalle')?.addEventListener('click', () => {
      const ventana = window.open('', '_blank');
      if (!ventana) { mostrarToast('El navegador bloqueó la ventana de impresión — permite ventanas emergentes', 'error'); return; }
      configuracionSitioParaImprimir().then((cfg) => escribirVentanaEtiquetas(ventana, [p], cfg));
    });
    document.getElementById('btn-imprimir-pedido').addEventListener('click', () => imprimirComprobantePedido(p));
    document.getElementById('btn-copiar-envio').addEventListener('click', async () => {
      await copiarAlPortapapeles(textoDatosEnvio(p));
      mostrarToast('Datos de envío copiados');
    });

    document.getElementById('btn-guardar-envio')?.addEventListener('click', async () => {
      try {
        await actualizarEnvioPedido(id, {
          estado_envio: document.getElementById('det-estado-envio').value,
          numero_guia_seguimiento: document.getElementById('det-numero-guia').value.trim() || null,
          empresa_transporte: document.getElementById('det-empresa').value.trim() || null,
          fecha_actualizacion: new Date().toISOString(),
        });
        mostrarToast('Despacho actualizado');
        abrirDetallePedido(id);
        cargarPedidos();
        actualizarBadgesNav();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    mount.querySelectorAll('.btn-anular-pago').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Anular este pago? Se descuenta del total pagado del pedido.')) return;
        try {
          await anularPagoAdmin(Number(btn.dataset.id));
          mostrarToast('Pago anulado');
          abrirDetallePedido(id);
          cargarPedidos();
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });

    document.getElementById('btn-registrar-pago').addEventListener('click', async () => {
      const monto = Number(document.getElementById('det-pago-monto').value);
      if (!monto || monto <= 0) return mostrarToast('Ingresa un monto válido', 'error');
      try {
        await registrarPago(id, { monto, metodo_pago: document.getElementById('det-pago-metodo').value, tipo_pago: 'Abono_Parcial' });
        mostrarToast('Pago registrado');
        abrirDetallePedido(id);
        cargarPedidos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    document.getElementById('btn-guardar-nota').addEventListener('click', async () => {
      try {
        await guardarNotaPedidoAdmin(id, document.getElementById('det-nota-admin').value.trim());
        mostrarToast('Nota guardada');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    document.getElementById('btn-anular-pedido')?.addEventListener('click', async () => {
      const motivo = prompt(`¿Anular el pedido #${id}? Su stock vuelve al inventario.\n\nMotivo (opcional):`, '');
      if (motivo === null) return;
      try {
        await cancelarPedidoAdmin(id, motivo.trim());
        INVENTARIO_CACHE = null;
        mostrarToast('Pedido anulado y stock devuelto');
        abrirDetallePedido(id);
        cargarPedidos();
        actualizarBadgesNav();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-cerrar-pedido')?.addEventListener('click', () => cerrarModal('modal-pedido'));
});

/* ---------- Registrar pedido (WhatsApp / tienda física) ---------- */

let REG_UBIGEOS = null;
let REG_CLIENTES = [];
let REG_PRODUCTOS = [];
let REG_PRODUCTOS_TODOS = [];
let REG_CAMPANAS = [];

// "Encargo por consolidado": se importa bajo pedido (no toca stock, precio consolidado) y va
// asociado a una campaña. "Venta de tienda": sale del stock.
function esEncargoRegistro() {
  return document.querySelector('#form-registrar-pedido [name="tipo_pedido"]:checked')?.value === 'Consolidado';
}

// Para un encargo se puede pedir cualquier perfume del catálogo (aunque esté oculto o sin
// stock); para una venta de tienda, solo lo que se vende: activo, o con stock aunque esté
// oculto en la web.
function productosRegistro() {
  return esEncargoRegistro() ? REG_PRODUCTOS_TODOS : REG_PRODUCTOS;
}

function precioCatalogoRegistro(p, tallaMl) {
  if (p.es_decant) return Number(precioTallaDecant(p, tallaMl) || 0);
  if (esEncargoRegistro() && p.precio_consolidado_fijo) return Number(p.precio_consolidado_fijo);
  return precioVentaTienda(p);
}

function normalizarBusqueda(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function precioVentaTienda(p) {
  if (p.es_liquidacion && p.precio_liquidacion) return Number(p.precio_liquidacion);
  return Number(precioFinal(p.precio_tienda_regular, p.descuento_tienda_porcentaje || 0));
}

function stockTextoProducto(p) {
  if (p.es_decant) {
    if (!p.abiertos) return 'sin frasco abierto';
    return `${p.abiertos} abierto${p.abiertos === 1 ? '' : 's'}${p.ml_restantes != null ? ` · ${p.ml_restantes} ml` : ''}`;
  }
  return p.cerrados > 0 ? `${p.cerrados} en stock` : 'sin stock';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-registrar-pedido')?.addEventListener('click', abrirModalRegistrarPedido);
  document.getElementById('btn-cancelar-registrar-pedido')?.addEventListener('click', () => cerrarModal('modal-registrar-pedido'));
  document.getElementById('btn-reg-agregar-item')?.addEventListener('click', () => agregarFilaItemPedido());
  document.getElementById('btn-reg-agregar-libre')?.addEventListener('click', () => agregarFilaLibrePedido());
  document.querySelectorAll('#form-registrar-pedido [name="tipo_pedido"]').forEach((radio) => {
    radio.addEventListener('change', () => actualizarTipoPedidoRegistro(true));
  });
  document.getElementById('btn-reg-nueva-campana')?.addEventListener('click', crearCampanaRapida);
  document.getElementById('reg-envio-tipo')?.addEventListener('change', actualizarBloqueEnvioRegistro);
  document.getElementById('reg-otro-receptor')?.addEventListener('change', (e) => {
    document.getElementById('reg-bloque-receptor').hidden = !e.target.checked;
  });
  document.querySelector('#form-registrar-pedido [name="canal"]')?.addEventListener('change', (e) => {
    // Venta en la tienda física: normalmente se lleva el perfume en el momento.
    if (e.target.value === 'Tienda') {
      document.getElementById('reg-envio-tipo').value = 'Recojo_En_Tienda';
      document.getElementById('reg-entregado-ya').checked = true;
      actualizarBloqueEnvioRegistro();
    }
  });
  document.getElementById('btn-reg-pago-total')?.addEventListener('click', () => {
    document.querySelector('#form-registrar-pedido [name="pago_monto"]').value = calcularTotalRegistro().toFixed(2);
  });
  document.getElementById('form-registrar-pedido')?.addEventListener('submit', guardarPedidoManual);

  const depto = document.getElementById('reg-depto');
  const prov = document.getElementById('reg-prov');
  const dist = document.getElementById('reg-dist');
  depto?.addEventListener('change', () => llenarProvinciasRegistro(depto.value));
  prov?.addEventListener('change', () => llenarDistritosRegistro(depto.value, prov.value));
  dist?.addEventListener('change', () => {
    // Si no escribieron agencia, sugiere la sede de la agencia en ese distrito como punto de partida.
    const agencia = document.querySelector('#form-registrar-pedido [name="envio_agencia"]');
    const tipo = document.getElementById('reg-envio-tipo').value;
    if (!agencia.value && dist.value && tipo.startsWith('Agencia')) agencia.value = `${tipo === 'Agencia_Olva' ? 'Olva' : 'Shalom'} ${dist.value}`;
  });

  conectarAutocompletarCliente();
});

async function abrirModalRegistrarPedido() {
  const form = document.getElementById('form-registrar-pedido');
  form.reset();
  form.id_cliente.value = '';
  document.getElementById('reg-bloque-receptor').hidden = true;
  document.getElementById('reg-items').innerHTML = '';
  document.getElementById('reg-total').textContent = formatoMoneda(0);
  actualizarBloqueEnvioRegistro();
  abrirModal('modal-registrar-pedido');

  try {
    const [ubigeos, productos, clientes, campanas] = await Promise.all([
      REG_UBIGEOS ? Promise.resolve(REG_UBIGEOS) : obtenerUbigeos(),
      obtenerInventarioAdmin(),
      obtenerClientesParaPedido().catch(() => []),
      obtenerConsolidadosAdmin().catch(() => []),
    ]);
    REG_UBIGEOS = ubigeos;
    REG_CLIENTES = clientes;
    REG_PRODUCTOS_TODOS = productos;
    REG_PRODUCTOS = productos.filter((p) => p.activo || p.cerrados > 0 || p.abiertos > 0);
    llenarCampanasRegistro(campanas);
    actualizarTipoPedidoRegistro(false);
    const deptos = [...new Set(ubigeos.map((u) => u.departamento))].sort();
    document.getElementById('reg-depto').innerHTML = '<option value="">Selecciona...</option>' + deptos.map((dep) => `<option value="${escapeHtml(dep)}">${escapeHtml(dep)}</option>`).join('');
    llenarProvinciasRegistro('');
    if (!document.querySelector('#reg-items .reg-item')) agregarFilaItemPedido();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function llenarProvinciasRegistro(depto, seleccion = '') {
  const prov = document.getElementById('reg-prov');
  const provincias = [...new Set((REG_UBIGEOS || []).filter((u) => u.departamento === depto).map((u) => u.provincia))].sort();
  prov.innerHTML = '<option value="">Selecciona...</option>' + provincias.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  prov.disabled = !depto;
  if (seleccion) prov.value = seleccion;
  llenarDistritosRegistro(depto, prov.value);
}

function llenarDistritosRegistro(depto, provincia, seleccion = '') {
  const dist = document.getElementById('reg-dist');
  const distritos = (REG_UBIGEOS || []).filter((u) => u.departamento === depto && u.provincia === provincia).map((u) => u.distrito).sort((a, b) => a.localeCompare(b));
  dist.innerHTML = '<option value="">Selecciona...</option>' + distritos.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  dist.disabled = !provincia;
  if (seleccion) dist.value = seleccion;
}

function actualizarBloqueEnvioRegistro() {
  const tipo = document.getElementById('reg-envio-tipo').value;
  const esRecojo = tipo === 'Recojo_En_Tienda';
  const bloque = document.getElementById('reg-bloque-envio');
  bloque.querySelector('.form-row-3').hidden = esRecojo;
  bloque.querySelector('.form-row').hidden = esRecojo;
  document.getElementById('reg-grupo-agencia').hidden = !tipo.startsWith('Agencia');
}

function conectarAutocompletarCliente() {
  const input = document.getElementById('reg-cliente-nombre');
  const lista = document.getElementById('reg-cliente-sugerencias');
  if (!input) return;
  const form = document.getElementById('form-registrar-pedido');

  const render = () => {
    const q = normalizarBusqueda(input.value);
    const qDigitos = input.value.replace(/\D/g, '');
    if (q.length < 2) { lista.hidden = true; return; }
    const coincidencias = REG_CLIENTES.filter((c) =>
      normalizarBusqueda(c.nombre).includes(q)
      || (qDigitos.length >= 3 && (String(c.dni || '').includes(qDigitos) || String(c.telefono || '').replace(/\D/g, '').includes(qDigitos)))).slice(0, 8);
    if (!coincidencias.length) { lista.hidden = true; return; }
    lista.innerHTML = coincidencias.map((c, i) => `
      <button type="button" class="autocomplete-opcion" data-i="${i}">
        <strong>${escapeHtml(c.nombre)}</strong>
        <span>${[c.dni ? `DNI ${escapeHtml(c.dni)}` : '', escapeHtml(c.telefono || ''), c.envio ? escapeHtml(destinoTexto({ tipo: c.envio.envio_tipo, distrito: c.envio.envio_distrito, provincia: c.envio.envio_provincia, departamento: c.envio.envio_departamento })) : '', c.id_cliente ? 'con cuenta' : ''].filter(Boolean).join(' · ')}</span>
      </button>`).join('');
    lista.hidden = false;
    lista.querySelectorAll('.autocomplete-opcion').forEach((opcion) => {
      // mousedown (no click): se dispara antes del blur del input, que es el que cierra la lista.
      opcion.addEventListener('mousedown', (e) => {
        e.preventDefault();
        elegirClienteRegistro(coincidencias[Number(opcion.dataset.i)]);
        lista.hidden = true;
      });
    });
  };

  input.addEventListener('input', () => { form.id_cliente.value = ''; render(); });
  input.addEventListener('focus', render);
  input.addEventListener('blur', () => setTimeout(() => { lista.hidden = true; }, 150));
}

function elegirClienteRegistro(c) {
  const form = document.getElementById('form-registrar-pedido');
  form.cliente_nombre.value = c.nombre;
  form.cliente_dni.value = c.dni || '';
  form.cliente_telefono.value = c.telefono || '';
  form.id_cliente.value = c.id_cliente || '';
  const e = c.envio;
  if (!e) return;
  if (e.envio_tipo) form.envio_tipo.value = e.envio_tipo;
  actualizarBloqueEnvioRegistro();
  if (e.envio_departamento) {
    document.getElementById('reg-depto').value = e.envio_departamento;
    llenarProvinciasRegistro(e.envio_departamento, e.envio_provincia || '');
    if (e.envio_provincia) llenarDistritosRegistro(e.envio_departamento, e.envio_provincia, e.envio_distrito || '');
  }
  form.envio_agencia.value = e.envio_agencia || '';
  form.envio_direccion.value = e.envio_direccion || '';
  const otro = !!e.envio_receptor_nombre;
  document.getElementById('reg-otro-receptor').checked = otro;
  document.getElementById('reg-bloque-receptor').hidden = !otro;
  form.envio_receptor_nombre.value = e.envio_receptor_nombre || '';
  form.envio_receptor_dni.value = e.envio_receptor_dni || '';
  form.envio_receptor_telefono.value = e.envio_receptor_telefono || '';
  mostrarToast('Datos del cliente cargados de su último pedido');
}

function agregarFilaItemPedido() {
  const contenedor = document.getElementById('reg-items');
  const fila = document.createElement('div');
  fila.className = 'reg-item';
  fila.innerHTML = `
    <div class="reg-item-producto autocomplete-wrap">
      <input type="text" class="reg-item-busqueda" placeholder="Busca el perfume o decant..." />
      <div class="autocomplete-list" hidden></div>
      <div class="reg-item-stock form-hint"></div>
    </div>
    <select class="reg-item-talla" disabled aria-label="Talla"><option>—</option></select>
    <input type="number" class="reg-item-cantidad" min="1" step="1" value="1" aria-label="Cantidad" />
    <input type="number" class="reg-item-precio" min="0.01" step="0.01" placeholder="Precio" aria-label="Precio unitario" />
    <span class="reg-item-subtotal">S/ 0.00</span>
    <button type="button" class="btn btn-ghost btn-sm reg-item-quitar" aria-label="Quitar">&times;</button>
  `;
  contenedor.appendChild(fila);

  const busqueda = fila.querySelector('.reg-item-busqueda');
  const lista = fila.querySelector('.autocomplete-list');
  const talla = fila.querySelector('.reg-item-talla');
  const cantidad = fila.querySelector('.reg-item-cantidad');
  const precio = fila.querySelector('.reg-item-precio');

  const render = () => {
    const q = normalizarBusqueda(busqueda.value);
    const palabras = q.split(' ').filter(Boolean);
    const encargo = esEncargoRegistro();
    const coincidencias = productosRegistro()
      .filter((p) => {
        const texto = normalizarBusqueda(`${p.marca} ${p.nombre} ${p.es_decant ? 'decant' : ''}`);
        return palabras.every((w) => texto.includes(w));
      })
      // Primero lo que tiene stock para vender ahora.
      .sort((a, b) => (encargo ? 0 : Number((b.cerrados > 0 || b.abiertos > 0)) - Number((a.cerrados > 0 || a.abiertos > 0))))
      .slice(0, 30);
    if (!coincidencias.length) { lista.hidden = true; return; }
    lista.innerHTML = coincidencias.map((p, i) => `
      <button type="button" class="autocomplete-opcion ${encargo || p.cerrados > 0 || p.abiertos > 0 ? '' : 'sin-stock'}" data-i="${i}">
        <strong>${p.es_decant ? '<span class="badge badge-decant">Decant</span> ' : ''}${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}${p.es_decant ? '' : ` (${p.mililitros}ml)`}</strong>
        <span>${encargo ? 'Encargo' : escapeHtml(stockTextoProducto(p))} · ${p.es_decant ? tallasDecant(p).map((t) => `${t}ml ${formatoMoneda(precioTallaDecant(p, t))}`).join(' / ') : formatoMoneda(precioCatalogoRegistro(p))}${p.activo ? '' : ' · oculto en web'}</span>
      </button>`).join('');
    lista.hidden = false;
    lista.querySelectorAll('.autocomplete-opcion').forEach((opcion) => {
      opcion.addEventListener('mousedown', (e) => {
        e.preventDefault();
        elegirProductoFila(fila, coincidencias[Number(opcion.dataset.i)]);
        lista.hidden = true;
      });
    });
  };

  busqueda.addEventListener('input', () => { fila.dataset.idProducto = ''; render(); });
  busqueda.addEventListener('focus', render);
  busqueda.addEventListener('blur', () => setTimeout(() => { lista.hidden = true; }, 150));
  talla.addEventListener('change', () => {
    const p = REG_PRODUCTOS_TODOS.find((x) => x.id === Number(fila.dataset.idProducto));
    if (p) precio.value = precioCatalogoRegistro(p, Number(talla.value)).toFixed(2);
    actualizarTotalRegistro();
  });
  cantidad.addEventListener('input', actualizarTotalRegistro);
  precio.addEventListener('input', actualizarTotalRegistro);
  fila.querySelector('.reg-item-quitar').addEventListener('click', () => { fila.remove(); actualizarTotalRegistro(); });
  if (!('ontouchstart' in window)) busqueda.focus();
}

function elegirProductoFila(fila, p) {
  fila.dataset.idProducto = p.id;
  fila.dataset.esDecant = p.es_decant ? '1' : '';
  fila.querySelector('.reg-item-busqueda').value = `${p.es_decant ? 'Decant · ' : ''}${p.marca} — ${p.nombre}`;
  const talla = fila.querySelector('.reg-item-talla');
  const precio = fila.querySelector('.reg-item-precio');
  const stock = fila.querySelector('.reg-item-stock');
  if (p.es_decant) {
    const tallas = tallasDecant(p);
    talla.innerHTML = tallas.map((t) => `<option value="${t}">${t} ml</option>`).join('');
    talla.disabled = false;
    precio.value = precioCatalogoRegistro(p, tallas[0]).toFixed(2);
  } else {
    // Perfume entero: la columna de talla queda fija (deshabilitada) para que las filas no se
    // desalineen entre enteros y decants.
    talla.innerHTML = '<option>Entero</option>';
    talla.disabled = true;
    precio.value = precioCatalogoRegistro(p).toFixed(2);
  }
  actualizarAvisoStockFila(fila, p);
  actualizarTotalRegistro();
}

function actualizarAvisoStockFila(fila, p) {
  const stock = fila.querySelector('.reg-item-stock');
  if (!stock) return;
  if (esEncargoRegistro()) {
    stock.textContent = 'Encargo: se importa, no descuenta stock';
    stock.classList.remove('texto-alerta');
    return;
  }
  const sinStock = p.es_decant ? !p.abiertos : p.cerrados <= 0;
  stock.textContent = `Stock: ${stockTextoProducto(p)}${sinStock ? (p.es_decant ? ' — se puede registrar igual' : ' — no se podrá registrar') : ''}`;
  stock.classList.toggle('texto-alerta', sinStock);
}

// Línea libre: perfume que no está en la web (cotizado por WhatsApp). Nombre y precio los
// escribe el admin; se suma al total igual que las demás líneas.
function agregarFilaLibrePedido() {
  const contenedor = document.getElementById('reg-items');
  const fila = document.createElement('div');
  fila.className = 'reg-item reg-item-libre';
  fila.dataset.libre = '1';
  fila.innerHTML = `
    <div class="reg-item-producto">
      <input type="text" class="reg-item-descripcion" maxlength="200" placeholder="Nombre del perfume (ej: Glacier Bold 100ml)" />
      <div class="reg-item-stock form-hint">Producto libre — no está en el catálogo</div>
    </div>
    <select class="reg-item-talla" disabled aria-label="Talla"><option>Libre</option></select>
    <input type="number" class="reg-item-cantidad" min="1" step="1" value="1" aria-label="Cantidad" />
    <input type="number" class="reg-item-precio" min="0.01" step="0.01" placeholder="Precio" aria-label="Precio unitario" />
    <span class="reg-item-subtotal">S/ 0.00</span>
    <button type="button" class="btn btn-ghost btn-sm reg-item-quitar" aria-label="Quitar">&times;</button>
  `;
  contenedor.appendChild(fila);
  fila.querySelector('.reg-item-cantidad').addEventListener('input', actualizarTotalRegistro);
  fila.querySelector('.reg-item-precio').addEventListener('input', actualizarTotalRegistro);
  fila.querySelector('.reg-item-quitar').addEventListener('click', () => { fila.remove(); actualizarTotalRegistro(); });
  fila.querySelector('.reg-item-descripcion').focus();
}

function llenarCampanasRegistro(campanas, seleccionar = null) {
  REG_CAMPANAS = campanas.filter((c) => !['Finalizado', 'Cancelado'].includes(c.estado));
  const select = document.getElementById('reg-campana');
  select.innerHTML = REG_CAMPANAS.length
    ? REG_CAMPANAS.map((c) => `<option value="${c.id}">${escapeHtml(c.codigo_campana)} — ${escapeHtml(ESTADOS_CONSOLIDADO_LABEL[c.estado] || c.estado)}</option>`).join('')
    : '<option value="">No hay campañas activas — crea una</option>';
  if (seleccionar) select.value = String(seleccionar);
}

// Al cambiar entre venta de tienda y encargo: muestra la campaña y re-calcula los precios de
// las líneas del catálogo (el encargo usa el precio consolidado).
function actualizarTipoPedidoRegistro(recalcular) {
  const encargo = esEncargoRegistro();
  document.getElementById('reg-grupo-campana').hidden = !encargo;
  document.getElementById('reg-entregado-ya').closest('label').hidden = encargo;
  if (encargo) document.getElementById('reg-entregado-ya').checked = false;
  document.getElementById('btn-guardar-registrar-pedido').textContent = encargo ? 'Registrar Encargo' : 'Registrar Pedido';
  if (!recalcular) return;
  document.querySelectorAll('#reg-items .reg-item:not(.reg-item-libre)').forEach((fila) => {
    const p = REG_PRODUCTOS_TODOS.find((x) => x.id === Number(fila.dataset.idProducto));
    if (!p) return;
    fila.querySelector('.reg-item-precio').value = precioCatalogoRegistro(p, Number(fila.querySelector('.reg-item-talla').value)).toFixed(2);
    actualizarAvisoStockFila(fila, p);
  });
  actualizarTotalRegistro();
}

async function crearCampanaRapida() {
  const hoy = new Date();
  const sugerido = `ZAD-${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const codigo = prompt('Código de la nueva campaña de consolidado:', sugerido);
  if (!codigo || !codigo.trim()) return;
  const cierre = new Date(hoy);
  cierre.setDate(cierre.getDate() + 7);
  try {
    await crearConsolidadoAdmin({
      codigo_campana: codigo.trim(),
      fecha_apertura: hoy.toISOString(),
      fecha_cierre_programada: cierre.toISOString(),
      minimo_unidades: 4,
      estado: 'Abierto',
    });
    const campanas = await obtenerConsolidadosAdmin();
    llenarCampanasRegistro(campanas, campanas.find((c) => c.codigo_campana === codigo.trim())?.id);
    mostrarToast(`Campaña ${codigo.trim()} creada`);
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

function calcularTotalRegistro() {
  let total = 0;
  document.querySelectorAll('#reg-items .reg-item').forEach((fila) => {
    const subtotal = Number(fila.querySelector('.reg-item-cantidad').value || 0) * Number(fila.querySelector('.reg-item-precio').value || 0);
    fila.querySelector('.reg-item-subtotal').textContent = formatoMoneda(subtotal);
    total += subtotal;
  });
  return total;
}

function actualizarTotalRegistro() {
  document.getElementById('reg-total').textContent = formatoMoneda(calcularTotalRegistro());
}

async function guardarPedidoManual(e) {
  e.preventDefault();
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form));
  const items = [];
  let filaIncompleta = false;
  document.querySelectorAll('#reg-items .reg-item').forEach((fila) => {
    if (fila.dataset.libre) {
      const descripcion = fila.querySelector('.reg-item-descripcion').value.trim();
      const precioLibre = fila.querySelector('.reg-item-precio').value;
      if (!descripcion && !precioLibre) return;
      if (!descripcion || !(Number(precioLibre) > 0)) { filaIncompleta = true; return; }
      items.push({ descripcion, cantidad: Number(fila.querySelector('.reg-item-cantidad').value || 0), precio: precioLibre });
      return;
    }
    if (!fila.dataset.idProducto) {
      if (fila.querySelector('.reg-item-busqueda').value.trim()) filaIncompleta = true;
      return;
    }
    items.push({
      id_producto: Number(fila.dataset.idProducto),
      cantidad: Number(fila.querySelector('.reg-item-cantidad').value || 0),
      talla_ml: fila.dataset.esDecant ? Number(fila.querySelector('.reg-item-talla').value) : 0,
      precio: fila.querySelector('.reg-item-precio').value || null,
    });
  });
  if (filaIncompleta) return mostrarToast('Completa cada fila: elige el producto de la lista, o escribe nombre y precio en las líneas libres (o quita la fila vacía)', 'error');
  const encargo = esEncargoRegistro();
  if (encargo && !datos.id_consolidado) return mostrarToast('Elige o crea la campaña de consolidado del encargo', 'error');
  if (!items.length) return mostrarToast('Agrega al menos un producto', 'error');
  if (items.some((i) => !i.cantidad || i.cantidad < 1)) return mostrarToast('Revisa las cantidades', 'error');

  const esRecojo = datos.envio_tipo === 'Recojo_En_Tienda';
  const otroReceptor = document.getElementById('reg-otro-receptor').checked;
  const pedido = {
    tipo_pedido: encargo ? 'Consolidado' : 'Directo_Tienda',
    id_consolidado: encargo ? Number(datos.id_consolidado) : null,
    id_cliente: datos.id_cliente || null,
    canal: datos.canal,
    cliente_nombre: datos.cliente_nombre.trim(),
    cliente_dni: datos.cliente_dni.trim(),
    cliente_telefono: datos.cliente_telefono.trim(),
    envio_tipo: datos.envio_tipo,
    envio_agencia: esRecojo || !datos.envio_tipo.startsWith('Agencia') ? '' : (datos.envio_agencia || '').trim(),
    envio_departamento: esRecojo ? '' : (datos.envio_departamento || ''),
    envio_provincia: esRecojo ? '' : (datos.envio_provincia || ''),
    envio_distrito: esRecojo ? '' : (datos.envio_distrito || ''),
    envio_direccion: esRecojo ? '' : (datos.envio_direccion || '').trim(),
    envio_receptor_nombre: otroReceptor ? (datos.envio_receptor_nombre || '').trim() : '',
    envio_receptor_dni: otroReceptor ? (datos.envio_receptor_dni || '').trim() : '',
    envio_receptor_telefono: otroReceptor ? (datos.envio_receptor_telefono || '').trim() : '',
    estado_envio: document.getElementById('reg-entregado-ya').checked ? 'Entregado' : 'Preparando',
    notas_admin: (datos.notas_admin || '').trim(),
  };
  if (!esRecojo && !pedido.envio_departamento) return mostrarToast('Elige el departamento, provincia y distrito de destino', 'error');
  const pago = Number(datos.pago_monto) > 0 ? { monto: Number(datos.pago_monto), metodo_pago: datos.pago_metodo } : null;

  const boton = document.getElementById('btn-guardar-registrar-pedido');
  boton.disabled = true;
  boton.textContent = 'Registrando…';
  try {
    const idPedido = await registrarPedidoManual(pedido, items, pago);
    INVENTARIO_CACHE = null;
    cerrarModal('modal-registrar-pedido');
    mostrarToast(encargo ? `Encargo #${idPedido} registrado en la campaña` : `Pedido #${idPedido} registrado — stock descontado`);
    // Muestra la pestaña donde quedó el pedido (los encargos viven en "Consolidado").
    const pestana = document.querySelector(encargo ? '#pedidos-tipo-tabs [data-tipo="Consolidado"]' : '#pedidos-tipo-tabs [data-decants="todos"]');
    if (pestana && !pestana.classList.contains('active')) pestana.click(); else cargarPedidos();
    actualizarBadgesNav();
    abrirDetallePedido(idPedido);
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = esEncargoRegistro() ? 'Registrar Encargo' : 'Registrar Pedido';
  }
}

/* ================= INVENTARIO ================= */

// Una línea por perfume: el perfume entero de tienda (frascos CERRADOS, stock_fisico) junto con
// su decant vinculado (frascos ABIERTOS + ml, ver id_perfume_tienda en la migración 0018). Un
// decant sin perfume de tienda vinculado sale en su propia línea (solo abiertos).
let INVENTARIO_CACHE = null;
let INVENTARIO_LINEAS = [];
let MOVIMIENTOS_FILTRO = null; // { ids: [...], nombre } cuando se entra desde "Historial"
let inventarioChip = 'con-stock';
// Modo conteo: se escriben los números reales de cada perfume y se guarda todo junto.
let MODO_CONTEO = false;
const CAMBIOS_CONTEO = new Map(); // clave de línea -> { cerrados?, abiertos?, ml? }

const TIPOS_MOVIMIENTO_LABEL = {
  Ingreso: 'Ingreso', Venta: 'Venta', Anulacion_Venta: 'Venta anulada', Apertura_Decant: 'Frasco abierto',
  Frasco_Terminado: 'Frasco terminado', Ajuste: 'Ajuste', Merma: 'Merma', Conteo: 'Conteo',
};

const CHIPS_INVENTARIO = [
  { id: 'con-stock', label: 'Con stock', f: (l) => l.conStock },
  { id: 'bajo', label: 'Por acabarse', f: (l) => l.bajo, alerta: true },
  { id: 'cerrados', label: 'Con frascos cerrados', f: (l) => (l.cerrados || 0) > 0 },
  { id: 'abiertos', label: 'Con decant abierto', f: (l) => (l.abiertos || 0) > 0 },
  { id: 'sin-stock', label: 'Sin stock', f: (l) => !l.conStock && l.activo },
  { id: 'stock-oculto', label: 'Con stock pero ocultos en la web', f: (l) => l.stockOculto, alerta: true, soloSiHay: true },
  { id: 'sin-vincular', label: 'Decants sin vincular', f: (l) => !!l.decant && !l.tienda, soloSiHay: true },
  { id: 'todos', label: 'Todos', f: () => true },
];

function construirLineasInventario(productos) {
  const tienda = productos.filter((p) => !p.es_decant);
  const decants = productos.filter((p) => p.es_decant);
  const tiendaPorId = new Map(tienda.map((t) => [t.id, t]));
  const decantPorTienda = new Map();
  decants.forEach((d) => {
    if (d.id_perfume_tienda && tiendaPorId.has(d.id_perfume_tienda) && !decantPorTienda.has(d.id_perfume_tienda)) decantPorTienda.set(d.id_perfume_tienda, d);
  });
  // Los perfumes que solo se traen por consolidado no tienen stock propio: no van acá.
  const lineas = tienda.filter((t) => t.estado !== 'Bajo_Pedido' || t.cerrados > 0).map((t) => ({ clave: `t${t.id}`, tienda: t, decant: decantPorTienda.get(t.id) || null }));
  decants.forEach((d) => {
    if (decantPorTienda.get(d.id_perfume_tienda) !== d) lineas.push({ clave: `d${d.id}`, tienda: null, decant: d });
  });
  return lineas
    .map((l) => {
      const base = l.tienda || l.decant;
      const cerrados = l.tienda ? l.tienda.cerrados : null;
      const abiertos = l.decant ? l.decant.abiertos : null;
      const ml = l.decant ? l.decant.ml_restantes : null;
      const precio = l.tienda ? precioVentaTienda(l.tienda) : null;
      const costo = l.tienda?.costo_importacion_pen != null ? Number(l.tienda.costo_importacion_pen) : null;
      const bajoTienda = !!l.tienda && l.tienda.activo && cerrados > 0 && cerrados <= l.tienda.minimo;
      const bajoDecant = !!l.decant && abiertos > 0 && ml != null && ml < ML_ALERTA_DECANT;
      return {
        ...l,
        marca: base.marca,
        nombre: base.nombre,
        imagen_url: l.tienda?.imagen_url || l.decant?.imagen_url || null,
        cerrados,
        abiertos,
        ml,
        precio,
        costo,
        bajo: bajoTienda || bajoDecant,
        conStock: (cerrados || 0) > 0 || (abiertos || 0) > 0,
        activo: (l.tienda?.activo ?? false) || (l.decant?.activo ?? false),
        stockOculto: (!!l.tienda && !l.tienda.activo && cerrados > 0) || (!!l.decant && !l.decant.activo && abiertos > 0),
        textoBusqueda: normalizarBusqueda(`${base.marca} ${base.nombre} ${l.decant && l.tienda ? `${l.decant.marca} ${l.decant.nombre}` : ''}`),
      };
    })
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre));
}

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('inventario-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderInventario, 200); });
  document.getElementById('inventario-orden')?.addEventListener('change', renderInventario);
  document.getElementById('inventario-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    inventarioChip = chip.dataset.chip;
    renderInventario();
  });
  document.getElementById('inventario-kpis')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-chip]');
    if (!card) return;
    inventarioChip = card.dataset.chip;
    renderInventario();
  });
  document.querySelectorAll('#inventario-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => cambiarVistaInventario(tab.dataset.vista));
  });
  let tm;
  document.getElementById('movimientos-busqueda')?.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(cargarMovimientos, 250); });
  document.getElementById('movimientos-tipo')?.addEventListener('change', cargarMovimientos);
  document.getElementById('movimientos-periodo')?.addEventListener('change', cargarMovimientos);
  document.getElementById('btn-movimientos-quitar-filtro')?.addEventListener('click', () => { MOVIMIENTOS_FILTRO = null; cargarMovimientos(); });
  document.getElementById('btn-exportar-inventario')?.addEventListener('click', exportarInventarioExcel);
  document.getElementById('btn-imprimir-conteo')?.addEventListener('click', imprimirHojaConteo);

  const tbody = document.getElementById('inventario-tbody');
  tbody?.addEventListener('click', manejarClickInventario);
  tbody?.addEventListener('input', manejarInputConteo);

  document.getElementById('btn-modo-conteo')?.addEventListener('click', () => (MODO_CONTEO ? salirModoConteo() : entrarModoConteo()));
  document.getElementById('btn-conteo-cancelar')?.addEventListener('click', salirModoConteo);
  document.getElementById('btn-conteo-guardar')?.addEventListener('click', guardarConteo);
  window.addEventListener('beforeunload', (e) => { if (CAMBIOS_CONTEO.size) { e.preventDefault(); e.returnValue = ''; } });

  document.getElementById('btn-cancelar-ajuste')?.addEventListener('click', () => cerrarModal('modal-ajuste-inventario'));
  document.getElementById('ajuste-motivo')?.addEventListener('change', prepararCamposAjuste);
  document.getElementById('form-ajuste-inventario')?.addEventListener('submit', guardarAjusteInventario);
  document.getElementById('ajuste-vinculo')?.addEventListener('click', (e) => {
    if (!e.target.closest('#btn-ajuste-vincular')) return;
    cerrarModal('modal-ajuste-inventario');
    abrirModalVincular(AJUSTE_LINEA);
  });
  document.getElementById('btn-cancelar-vincular')?.addEventListener('click', () => cerrarModal('modal-vincular'));
  document.getElementById('form-vincular')?.addEventListener('submit', guardarVinculo);

  document.getElementById('btn-ingreso-mercaderia')?.addEventListener('click', abrirModalIngreso);
  document.getElementById('ingreso-registrar-gasto')?.addEventListener('change', (e) => { e.target.dataset.tocado = '1'; actualizarResumenIngreso(); });
  document.getElementById('btn-dashboard-stock-bajo')?.addEventListener('click', () => abrirInventarioBuscando('', 'bajo'));
  document.getElementById('btn-ingreso-fila')?.addEventListener('click', () => agregarFilaIngreso(true));
  document.getElementById('btn-cancelar-ingreso')?.addEventListener('click', () => cerrarModal('modal-ingreso'));
  document.getElementById('form-ingreso')?.addEventListener('submit', guardarIngreso);
  document.getElementById('btn-ingreso-crear')?.addEventListener('click', () => {
    cerrarModal('modal-ingreso');
    irASeccion('productos');
    abrirModalProducto();
  });
});

function cambiarVistaInventario(vista) {
  document.querySelectorAll('#inventario-tabs .admin-tab').forEach((b) => b.classList.toggle('active', b.dataset.vista === vista));
  document.getElementById('inventario-vista-stock').hidden = vista !== 'stock';
  document.getElementById('inventario-vista-movimientos').hidden = vista !== 'movimientos';
  if (vista === 'movimientos') cargarMovimientos();
  else cargarInventario();
}

// Entrada desde otra sección (ej. Productos): abre el inventario ya filtrado por ese perfume
// (o por un filtro rápido, ej. "Por acabarse" desde el Dashboard).
function abrirInventarioBuscando(texto, chip = 'todos') {
  const input = document.getElementById('inventario-busqueda');
  if (input) input.value = texto;
  inventarioChip = chip;
  document.querySelectorAll('#inventario-tabs .admin-tab').forEach((b) => b.classList.toggle('active', b.dataset.vista === 'stock'));
  document.getElementById('inventario-vista-stock').hidden = false;
  document.getElementById('inventario-vista-movimientos').hidden = true;
  irASeccion('inventario');
}

async function cargarInventario({ refrescar = true } = {}) {
  const tbody = document.getElementById('inventario-tbody');
  try {
    if (refrescar || !INVENTARIO_CACHE) INVENTARIO_CACHE = await obtenerInventarioAdmin();
    INVENTARIO_LINEAS = construirLineasInventario(INVENTARIO_CACHE);
    renderKpisInventario();
    renderInventario();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderKpisInventario() {
  const L = INVENTARIO_LINEAS;
  const conStock = L.filter((l) => l.conStock).length;
  const cerrados = L.reduce((acc, l) => acc + (l.cerrados || 0), 0);
  const abiertos = L.reduce((acc, l) => acc + (l.abiertos || 0), 0);
  const decantsAbiertos = L.filter((l) => (l.abiertos || 0) > 0).length;
  const valorVenta = L.reduce((acc, l) => acc + (l.cerrados > 0 && l.precio ? l.cerrados * l.precio : 0), 0);
  const valorCosto = L.reduce((acc, l) => acc + (l.cerrados > 0 && l.costo ? l.cerrados * l.costo : 0), 0);
  const bajos = L.filter((l) => l.bajo).length;
  const ocultos = L.filter((l) => l.stockOculto).length;
  document.getElementById('inventario-kpis').innerHTML = `
    <button type="button" class="stat-card stat-click" data-chip="con-stock"><div class="stat-value">${conStock}</div><div class="stat-label">Perfumes con stock</div></button>
    <button type="button" class="stat-card stat-click" data-chip="cerrados"><div class="stat-value">${cerrados}</div><div class="stat-label">Frascos cerrados</div><div class="stat-sub">${formatoMoneda(valorVenta)} a precio de venta${valorCosto ? ` · ${formatoMoneda(valorCosto)} a costo` : ''}</div></button>
    <button type="button" class="stat-card stat-click" data-chip="abiertos"><div class="stat-value">${abiertos}</div><div class="stat-label">Frascos abiertos</div><div class="stat-sub">en ${decantsAbiertos} decant${decantsAbiertos === 1 ? '' : 's'}</div></button>
    <button type="button" class="stat-card stat-click ${bajos ? 'warn' : ''}" data-chip="bajo"><div class="stat-value">${bajos}</div><div class="stat-label">Por acabarse</div><div class="stat-sub">pocos cerrados o poco perfume en el frasco</div></button>
    ${ocultos ? `<button type="button" class="stat-card stat-click warn" data-chip="stock-oculto"><div class="stat-value">${ocultos}</div><div class="stat-label">Con stock pero ocultos</div><div class="stat-sub">tienes frascos que no se ven en la web</div></button>` : ''}
  `;
}

function lineasInventarioFiltradas() {
  const palabras = normalizarBusqueda(document.getElementById('inventario-busqueda')?.value).split(' ').filter(Boolean);
  const chip = CHIPS_INVENTARIO.find((c) => c.id === inventarioChip) || CHIPS_INVENTARIO[0];
  const orden = document.getElementById('inventario-orden')?.value || 'marca';
  const lista = INVENTARIO_LINEAS.filter((l) => (!palabras.length || palabras.every((w) => l.textoBusqueda.includes(w))) && chip.f(l));
  const total = (l) => (l.cerrados || 0) + (l.abiertos || 0);
  if (orden === 'mas') lista.sort((a, b) => total(b) - total(a));
  if (orden === 'menos') lista.sort((a, b) => total(a) - total(b));
  return lista;
}

function renderInventario() {
  const tbody = document.getElementById('inventario-tbody');
  // Filtros rápidos con cantidad (sobre la búsqueda actual)
  const palabras = normalizarBusqueda(document.getElementById('inventario-busqueda')?.value).split(' ').filter(Boolean);
  const buscadas = INVENTARIO_LINEAS.filter((l) => !palabras.length || palabras.every((w) => l.textoBusqueda.includes(w)));
  document.getElementById('inventario-chips').innerHTML = CHIPS_INVENTARIO.map((c) => {
    const n = buscadas.filter(c.f).length;
    if (c.soloSiHay && !n && inventarioChip !== c.id) return '';
    return `<button type="button" class="chip-filtro${c.alerta && n ? ' alerta' : ''}${inventarioChip === c.id ? ' activo' : ''}" data-chip="${c.id}">${escapeHtml(c.label)} <span class="n">${n}</span></button>`;
  }).join('');
  document.querySelectorAll('#inventario-kpis [data-chip]').forEach((k) => k.classList.toggle('activo', k.dataset.chip === inventarioChip));

  const lineas = lineasInventarioFiltradas();
  document.getElementById('inventario-conteo').textContent = `${lineas.length} perfume${lineas.length === 1 ? '' : 's'}`;
  tbody.innerHTML = lineas.length
    ? lineas.map(filaInventario).join('')
    : `<tr><td colspan="5" class="admin-empty">Nada con este filtro.${inventarioChip !== 'todos' ? ' <button type="button" class="btn-link-inline" data-chip-todos>Ver todos</button>' : ''}</td></tr>`;
  actualizarBarraConteo();
}

function filaInventario(l) {
  const t = l.tienda;
  const d = l.decant;
  const badges = [];
  if (!t) badges.push('<span class="badge badge-decant">Solo decant</span>');
  if (l.stockOculto) badges.push('<span class="badge badge-aviso">Tiene stock pero está oculto en la web</span>');
  else if ((t && !t.activo) || (!t && d && !d.activo)) badges.push('<span class="badge badge-out">Oculto en web</span>');
  if (l.bajo) badges.push('<span class="badge badge-aviso">Por acabarse</span>');
  const cambios = CAMBIOS_CONTEO.get(l.clave) || {};
  const valorConteo = (campo, actual) => (campo in cambios ? cambios[campo] : (actual ?? ''));
  const inputConteo = (campo, actual, etiqueta, paso = 1) => `<input type="number" class="conteo-input${campo in cambios ? ' cambiado' : ''}" data-campo="${campo}" min="0" step="${paso}" inputmode="decimal" value="${valorConteo(campo, actual)}" aria-label="${etiqueta}" placeholder="${campo === 'ml' ? 'ml' : ''}" />`;

  let celdaCerrados = '<span class="celda-sub">—</span>';
  if (t) {
    celdaCerrados = MODO_CONTEO
      ? inputConteo('cerrados', l.cerrados, 'Frascos cerrados contados')
      : `<div class="stepper">
          <button type="button" class="stepper-btn btn-cerrados-menos" aria-label="Restar 1 frasco cerrado" title="Restar 1 (se registra como ajuste)" ${l.cerrados <= 0 ? 'disabled' : ''}>&minus;</button>
          <span class="stepper-val ${l.bajo && l.cerrados > 0 ? 'texto-alerta' : ''}">${l.cerrados}</span>
          <button type="button" class="stepper-btn btn-cerrados-mas" aria-label="Sumar 1 frasco cerrado" title="Sumar 1 (se registra como ingreso)">+</button>
        </div>`;
  }
  let celdaAbiertos = '<span class="celda-sub">Sin decant</span>';
  if (d) {
    celdaAbiertos = MODO_CONTEO
      ? `<div class="conteo-par">${inputConteo('abiertos', l.abiertos, 'Frascos abiertos contados')}${inputConteo('ml', l.ml, 'ml que quedan en el frasco abierto', 0.5)}</div>`
      : `<div class="abiertos-ctrl">
          <span class="abiertos-val">${l.abiertos}</span>
          <button type="button" class="btn-mini btn-abrir-frasco" title="Abrir un frasco para decants: pasa 1 cerrado a abierto">+ Abrir</button>
          <button type="button" class="btn-mini btn-terminar-frasco" title="Se acabó un frasco abierto" ${l.abiertos > 0 ? '' : 'disabled'}>Terminado</button>
        </div>
        ${l.ml != null ? `<div class="celda-sub">${l.ml} ml en el frasco</div>` : ''}`;
  }
  const precio = l.precio ? formatoMoneda(l.precio) : d && tallasDecant(d).length ? `<span class="celda-sub">decant desde ${formatoMoneda(precioTallaDecant(d, tallasDecant(d)[0]))}</span>` : '—';
  return `
    <tr data-clave="${l.clave}" class="${l.bajo ? 'fila-alerta' : ''}${cambios && Object.keys(cambios).length ? ' fila-cambiada' : ''}">
      <td data-label="Perfume">
        <div class="prod-celda">
          <span class="mini-foto">${imagenProductoAdmin(l)}</span>
          <div class="prod-texto">
            <strong>${escapeHtml(l.marca)} — ${escapeHtml(l.nombre)}</strong>${t ? ` <span class="celda-sub">${t.mililitros} ml</span>` : ''}
            ${badges.length ? `<div class="prod-badges">${badges.join('')}</div>` : ''}
          </div>
        </div>
      </td>
      <td class="num" data-label="Cerrados (tienda)">${celdaCerrados}</td>
      <td class="num" data-label="Abiertos (decants)">${celdaAbiertos}</td>
      <td class="num" data-label="Precio">${precio}</td>
      <td class="acciones">
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm btn-ajustar" title="Ingreso, merma o conteo con nota">Ajustar</button>
          <button type="button" class="btn btn-ghost btn-sm btn-historial" title="Ver todos sus movimientos">Historial</button>
        </div>
      </td>
    </tr>
  `;
}

function lineaDeFila(el) {
  const clave = el.closest('tr').dataset.clave;
  return INVENTARIO_LINEAS.find((l) => l.clave === clave);
}

async function ejecutarAccionInventario(promesa, mensaje) {
  try {
    await promesa;
    mostrarToast(mensaje);
    await cargarInventario();
    actualizarBadgesNav();
  } catch (err) {
    mostrarToast(err.message, 'error');
    renderInventario();
  }
}

function manejarClickInventario(e) {
  if (e.target.closest('[data-chip-todos]')) { inventarioChip = 'todos'; renderInventario(); return; }
  const btn = e.target.closest('button');
  if (!btn || !btn.closest('tr[data-clave]')) return;
  const l = lineaDeFila(btn);
  if (btn.classList.contains('btn-cerrados-mas')) {
    btn.disabled = true;
    ejecutarAccionInventario(ajustarInventario({ idProducto: l.tienda.id, cerrados: 1, motivo: 'Ingreso', nota: 'Ingreso rápido desde Inventario' }), `${l.nombre}: +1 frasco cerrado`);
  } else if (btn.classList.contains('btn-cerrados-menos')) {
    btn.disabled = true;
    ejecutarAccionInventario(ajustarInventario({ idProducto: l.tienda.id, cerrados: -1, motivo: 'Ajuste', nota: 'Ajuste rápido desde Inventario' }), `${l.nombre}: −1 frasco cerrado`);
  } else if (btn.classList.contains('btn-abrir-frasco')) {
    const hayCerrados = l.tienda && l.cerrados > 0;
    const ml = l.tienda?.mililitros || l.decant.mililitros || 100;
    const mensaje = hayCerrados
      ? `¿Abrir 1 frasco de ${l.marca} ${l.nombre} para decants?\n\nCerrados: ${l.cerrados} → ${l.cerrados - 1}\nAbiertos: ${l.abiertos} → ${l.abiertos + 1} (+${ml} ml)`
      : `${l.tienda ? 'No quedan frascos cerrados de este perfume' : 'Este decant no tiene perfume de tienda vinculado'}.\n\n¿Registrar igual 1 frasco abierto de ${l.nombre} (+${ml} ml) sin descontar cerrados?`;
    if (!confirm(mensaje)) return;
    btn.disabled = true;
    ejecutarAccionInventario(abrirFrascoDecant(l.decant.id, hayCerrados), `Frasco abierto: ${l.nombre}`);
  } else if (btn.classList.contains('btn-terminar-frasco')) {
    const ultimo = l.abiertos <= 1;
    if (!confirm(`¿Se terminó un frasco abierto de ${l.nombre}?\n\nAbiertos: ${l.abiertos} → ${l.abiertos - 1}${ultimo ? '\n\nEra el último: el decant sale como Agotado en la web hasta que abras otro.' : ''}`)) return;
    btn.disabled = true;
    const accion = ultimo
      ? ajustarInventario({ idProducto: l.decant.id, abiertos: 0, ml: 0, esDelta: false, motivo: 'Frasco_Terminado', nota: 'Último frasco abierto terminado' })
      : ajustarInventario({ idProducto: l.decant.id, abiertos: -1, motivo: 'Frasco_Terminado', nota: 'Frasco abierto terminado' });
    ejecutarAccionInventario(accion, `Frasco terminado: ${l.nombre}`);
  } else if (btn.classList.contains('btn-ajustar')) {
    abrirModalAjuste(l);
  } else if (btn.classList.contains('btn-historial')) {
    MOVIMIENTOS_FILTRO = { ids: [l.tienda?.id, l.decant?.id].filter(Boolean), nombre: `${l.marca} — ${l.nombre}` };
    document.getElementById('movimientos-periodo').value = '';
    cambiarVistaInventario('movimientos');
  }
}

/* ---------- Modo conteo: escribir los números reales y guardar todo junto ---------- */

function entrarModoConteo() {
  MODO_CONTEO = true;
  document.getElementById('btn-modo-conteo').textContent = 'Terminar conteo';
  document.getElementById('conteo-aviso').hidden = false;
  document.getElementById('conteo-barra').hidden = false;
  document.getElementById('section-inventario').classList.add('en-conteo');
  renderInventario();
  document.querySelector('#inventario-tbody .conteo-input')?.focus();
}

function salirModoConteo() {
  if (CAMBIOS_CONTEO.size && !confirm(`Tienes ${CAMBIOS_CONTEO.size} perfume(s) con cambios sin guardar. ¿Salir y descartarlos?`)) return;
  CAMBIOS_CONTEO.clear();
  MODO_CONTEO = false;
  document.getElementById('btn-modo-conteo').textContent = 'Hacer conteo';
  document.getElementById('conteo-aviso').hidden = true;
  document.getElementById('conteo-barra').hidden = true;
  document.getElementById('section-inventario').classList.remove('en-conteo');
  renderInventario();
}

function manejarInputConteo(e) {
  const input = e.target;
  if (!input.classList.contains('conteo-input')) return;
  const l = lineaDeFila(input);
  const campo = input.dataset.campo;
  const original = campo === 'cerrados' ? l.cerrados : campo === 'abiertos' ? l.abiertos : l.ml;
  const cambios = { ...(CAMBIOS_CONTEO.get(l.clave) || {}) };
  const valor = input.value === '' ? null : Number(input.value);
  const invalido = valor != null && (!(valor >= 0) || (campo !== 'ml' && !Number.isInteger(valor)));
  input.classList.toggle('invalido', invalido);
  if (invalido || valor === (original ?? null) || (valor == null && campo !== 'ml')) delete cambios[campo];
  else cambios[campo] = valor;
  input.classList.toggle('cambiado', campo in cambios);
  if (Object.keys(cambios).length) CAMBIOS_CONTEO.set(l.clave, cambios);
  else CAMBIOS_CONTEO.delete(l.clave);
  input.closest('tr').classList.toggle('fila-cambiada', CAMBIOS_CONTEO.has(l.clave));
  actualizarBarraConteo();
}

function actualizarBarraConteo() {
  const texto = document.getElementById('conteo-barra-texto');
  const boton = document.getElementById('btn-conteo-guardar');
  if (!texto) return;
  const n = CAMBIOS_CONTEO.size;
  texto.innerHTML = n ? `<strong>${n}</strong> perfume${n === 1 ? '' : 's'} con cambios sin guardar` : 'Escribe lo que contaste: los cambios se guardan todos juntos';
  boton.disabled = !n;
}

async function guardarConteo() {
  const boton = document.getElementById('btn-conteo-guardar');
  const pendientes = [...CAMBIOS_CONTEO.entries()];
  if (!pendientes.length) return;
  boton.disabled = true;
  let hechos = 0;
  for (const [clave, cambios] of pendientes) {
    const l = INVENTARIO_LINEAS.find((x) => x.clave === clave);
    boton.textContent = `Guardando ${hechos + 1} de ${pendientes.length}…`;
    try {
      if (!l) throw new Error('Perfume no encontrado');
      if (l.tienda && 'cerrados' in cambios) {
        await ajustarInventario({ idProducto: l.tienda.id, cerrados: cambios.cerrados, esDelta: false, motivo: 'Conteo', nota: 'Conteo físico' });
      }
      if (l.decant && ('abiertos' in cambios || 'ml' in cambios)) {
        await ajustarInventario({ idProducto: l.decant.id, abiertos: 'abiertos' in cambios ? cambios.abiertos : null, ml: 'ml' in cambios ? cambios.ml : null, esDelta: false, motivo: 'Conteo', nota: 'Conteo físico' });
      }
      CAMBIOS_CONTEO.delete(clave);
      hechos += 1;
    } catch (err) {
      mostrarToast(`${l ? l.nombre : clave}: ${err.message}`, 'error');
      break;
    }
  }
  boton.textContent = 'Guardar conteo';
  if (hechos) mostrarToast(`Conteo guardado: ${hechos} perfume${hechos === 1 ? '' : 's'} actualizado${hechos === 1 ? '' : 's'}`);
  await cargarInventario();
  actualizarBadgesNav();
  if (!CAMBIOS_CONTEO.size) salirModoConteo();
}

/* ---------- Ingreso de mercadería: varios perfumes de una sola vez ---------- */

let INGRESO_LIMPIAR = true;

async function abrirModalIngreso() {
  try {
    INVENTARIO_CACHE = await obtenerInventarioAdmin();
  } catch (err) {
    return mostrarToast(err.message, 'error');
  }
  const mount = document.getElementById('ingreso-filas');
  if (INGRESO_LIMPIAR || !mount.children.length) {
    document.getElementById('form-ingreso').reset();
    mount.innerHTML = '';
    agregarFilaIngreso(false);
    agregarFilaIngreso(false);
    agregarFilaIngreso(false);
    const chk = document.getElementById('ingreso-registrar-gasto');
    chk.checked = false;
    delete chk.dataset.tocado;
    INGRESO_LIMPIAR = false;
  }
  actualizarResumenIngreso();
  abrirModal('modal-ingreso');
  mount.querySelector('.ingreso-producto')?.focus();
}

function productosParaIngreso() {
  return (INVENTARIO_CACHE || []).filter((p) => !p.es_decant);
}

function agregarFilaIngreso(enfocar) {
  const mount = document.getElementById('ingreso-filas');
  const fila = document.createElement('div');
  fila.className = 'ingreso-fila';
  fila.innerHTML = `
    <div class="autocomplete-wrap">
      <input type="text" class="ingreso-producto" placeholder="Escribe marca o nombre…" autocomplete="off" aria-label="Perfume" />
      <div class="autocomplete-list" hidden></div>
      <div class="ingreso-info celda-sub"></div>
    </div>
    <input type="number" class="ingreso-cantidad" min="1" step="1" inputmode="numeric" placeholder="0" aria-label="Cantidad que llegó" />
    <input type="number" class="ingreso-costo" min="0" step="0.01" inputmode="decimal" placeholder="—" aria-label="Costo por unidad (cuánto te costó cada frasco)" />
    <input type="number" class="ingreso-precio" min="0.01" step="0.01" inputmode="decimal" placeholder="Igual" aria-label="Nuevo precio de venta (opcional)" />
    <button type="button" class="btn btn-ghost btn-sm ingreso-quitar" aria-label="Quitar fila">&times;</button>
    <label class="ingreso-publicar" hidden><input type="checkbox" class="ingreso-chk-publicar" /> Publicar en la web (ahora está oculto)</label>
  `;
  mount.appendChild(fila);
  const input = fila.querySelector('.ingreso-producto');
  const lista = fila.querySelector('.autocomplete-list');
  input.addEventListener('input', () => {
    delete fila.dataset.id;
    fila.querySelector('.ingreso-info').textContent = '';
    fila.querySelector('.ingreso-publicar').hidden = true;
    const palabras = normalizarBusqueda(input.value).split(' ').filter(Boolean);
    if (!palabras.length) { lista.hidden = true; actualizarResumenIngreso(); return; }
    const opciones = productosParaIngreso()
      .filter((p) => palabras.every((w) => normalizarBusqueda(`${p.marca} ${p.nombre} #${p.id}`).includes(w)))
      .slice(0, 8);
    lista.innerHTML = opciones.length
      ? opciones.map((p) => `<button type="button" class="autocomplete-opcion" data-id="${p.id}"><strong>${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)} (${p.mililitros} ml)</strong><span>${p.cerrados} en stock · ${formatoMoneda(precioVentaTienda(p))}${p.activo ? '' : ' · oculto en la web'}${p.estado === 'Bajo_Pedido' ? ' · solo consolidado' : ''}</span></button>`).join('')
      : '<div class="autocomplete-opcion" style="cursor:default;"><span>No está en el catálogo. Créalo primero en Productos.</span></div>';
    lista.hidden = false;
    actualizarResumenIngreso();
  });
  lista.addEventListener('click', (e) => {
    const op = e.target.closest('[data-id]');
    if (!op) return;
    elegirProductoIngreso(fila, Number(op.dataset.id));
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const primera = lista.querySelector('[data-id]');
      if (!lista.hidden && primera) elegirProductoIngreso(fila, Number(primera.dataset.id));
    }
  });
  input.addEventListener('blur', () => setTimeout(() => { lista.hidden = true; }, 180));
  fila.querySelector('.ingreso-cantidad').addEventListener('keydown', (e) => {
    // Enter en la cantidad = pasar al siguiente perfume (carga rápida desde una lista).
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const siguiente = fila.nextElementSibling;
    if (siguiente) siguiente.querySelector('.ingreso-producto').focus();
    else agregarFilaIngreso(true);
  });
  fila.querySelector('.ingreso-quitar').addEventListener('click', () => {
    fila.remove();
    if (!mount.children.length) agregarFilaIngreso(true);
    actualizarResumenIngreso();
  });
  fila.addEventListener('input', (e) => { if (!e.target.classList.contains('ingreso-producto')) actualizarResumenIngreso(); });
  if (enfocar) input.focus();
  return fila;
}

function elegirProductoIngreso(fila, id) {
  const p = productosParaIngreso().find((x) => x.id === id);
  if (!p) return;
  fila.dataset.id = String(id);
  fila.querySelector('.ingreso-producto').value = `${p.marca} — ${p.nombre} (${p.mililitros} ml)`;
  fila.querySelector('.autocomplete-list').hidden = true;
  fila.querySelector('.ingreso-info').textContent = `Ahora: ${p.cerrados} cerrado${p.cerrados === 1 ? '' : 's'} · precio ${formatoMoneda(precioVentaTienda(p))}${p.costo_importacion_pen != null ? ` · costo ${formatoMoneda(p.costo_importacion_pen)}` : ' · sin costo'}`;
  fila.querySelector('.ingreso-precio').placeholder = String(Number(p.precio_tienda_regular));
  fila.querySelector('.ingreso-costo').placeholder = p.costo_importacion_pen != null ? String(Number(p.costo_importacion_pen)) : '—';
  const publicar = fila.querySelector('.ingreso-publicar');
  publicar.hidden = p.activo && p.estado !== 'Bajo_Pedido';
  publicar.querySelector('input').checked = false;
  fila.querySelector('.ingreso-cantidad').focus();
  actualizarResumenIngreso();
}

function leerFilasIngreso() {
  return [...document.querySelectorAll('#ingreso-filas .ingreso-fila')].map((fila) => ({
    fila,
    id: fila.dataset.id ? Number(fila.dataset.id) : null,
    texto: fila.querySelector('.ingreso-producto').value.trim(),
    cantidad: fila.querySelector('.ingreso-cantidad').value === '' ? null : Number(fila.querySelector('.ingreso-cantidad').value),
    costo: fila.querySelector('.ingreso-costo').value === '' ? null : Number(fila.querySelector('.ingreso-costo').value),
    precio: fila.querySelector('.ingreso-precio').value === '' ? null : Number(fila.querySelector('.ingreso-precio').value),
    publicar: !fila.querySelector('.ingreso-publicar').hidden && fila.querySelector('.ingreso-chk-publicar').checked,
  }));
}

function actualizarResumenIngreso() {
  const validas = leerFilasIngreso().filter((f) => f.id && f.cantidad > 0);
  const frascos = validas.reduce((acc, f) => acc + f.cantidad, 0);
  const compra = validas.reduce((acc, f) => acc + (f.costo != null && f.costo >= 0 ? f.cantidad * f.costo : 0), 0);
  const perfumes = new Set(validas.map((f) => f.id)).size;
  // Apenas se escribe algún costo, se marca sola la opción de registrar la compra (si el admin no
  // la tocó a mano).
  const chk = document.getElementById('ingreso-registrar-gasto');
  if (chk && !chk.dataset.tocado) chk.checked = compra > 0;
  document.getElementById('ingreso-compra-datos').hidden = !chk?.checked;
  document.getElementById('ingreso-resumen').innerHTML = validas.length
    ? `Se van a sumar <strong>${frascos} frasco${frascos === 1 ? '' : 's'}</strong> en <strong>${perfumes} perfume${perfumes === 1 ? '' : 's'}</strong>.${compra ? ` Total de la compra: <strong>${formatoMoneda(compra)}</strong>${chk?.checked ? ' (se registra como gasto de Mercadería)' : ''}.` : ''}`
    : 'Elige un perfume y escribe la cantidad que llegó. Tip: Enter en la cantidad pasa al siguiente.';
}

async function guardarIngreso(e) {
  e.preventDefault();
  const nota = e.target.nota.value.trim() || 'Ingreso de mercadería';
  const filas = leerFilasIngreso().filter((f) => f.texto || f.cantidad != null || f.precio != null);
  if (!filas.length) return mostrarToast('Agrega al menos un perfume con su cantidad', 'error');
  for (const f of filas) {
    f.fila.classList.remove('con-error');
    if (!f.id) { f.fila.classList.add('con-error'); return mostrarToast(`"${f.texto || 'Fila sin perfume'}": elige el perfume de la lista`, 'error'); }
    if (!(f.cantidad > 0) || !Number.isInteger(f.cantidad)) { f.fila.classList.add('con-error'); return mostrarToast('Revisa las cantidades: deben ser números enteros mayores a 0', 'error'); }
    if (f.precio != null && !(f.precio > 0)) { f.fila.classList.add('con-error'); return mostrarToast('Revisa los precios: deben ser mayores a 0', 'error'); }
    if (f.costo != null && !(f.costo >= 0)) { f.fila.classList.add('con-error'); return mostrarToast('Revisa los costos: no pueden ser negativos', 'error'); }
  }
  // El mismo perfume en dos filas se suma en una sola.
  const porId = new Map();
  filas.forEach((f) => {
    const previo = porId.get(f.id);
    if (previo) {
      // Mismo perfume en dos filas: se suman y el costo queda como promedio de ambas.
      if (f.costo != null || previo.costo != null) {
        const c1 = previo.costo ?? f.costo;
        const c2 = f.costo ?? previo.costo;
        previo.costo = Math.round(((previo.cantidad * c1) + (f.cantidad * c2)) / (previo.cantidad + f.cantidad) * 100) / 100;
      }
      previo.cantidad += f.cantidad;
      previo.precio = f.precio ?? previo.precio;
      previo.publicar = previo.publicar || f.publicar;
      previo.filas.push(f.fila);
    }
    else porId.set(f.id, { ...f, filas: [f.fila] });
  });
  const boton = document.getElementById('btn-guardar-ingreso');
  const registrarGasto = document.getElementById('ingreso-registrar-gasto').checked;
  const form = e.target;
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  try {
    const items = [...porId.values()].map((it) => ({ id_producto: it.id, cantidad: it.cantidad, costo_unitario: it.costo, precio_venta: it.precio, publicar: it.publicar }));
    const gasto = registrarGasto ? { fecha: fechaInputHoy(), metodo_pago: form.compra_metodo.value || null, proveedor: form.compra_proveedor.value.trim() || null } : null;
    const { totalCompra } = await registrarIngresoMercaderia(items, nota, gasto);
    const frascosTotal = items.reduce((acc, it) => acc + it.cantidad, 0);
    mostrarToast(`Ingreso guardado: ${frascosTotal} frasco${frascosTotal === 1 ? '' : 's'} en ${items.length} perfume${items.length === 1 ? '' : 's'}${gasto && totalCompra ? ` · gasto de ${formatoMoneda(totalCompra)} registrado` : ''}`);
    INGRESO_LIMPIAR = true;
    cerrarModal('modal-ingreso');
    boton.disabled = false;
    boton.textContent = 'Guardar ingreso';
    await cargarInventario();
    actualizarBadgesNav();
    return;
  } catch (err) {
    if (!err.faltaMigracion) {
      boton.disabled = false;
      boton.textContent = 'Guardar ingreso';
      return mostrarToast(err.message, 'error');
    }
    mostrarToast('Para guardar costos y el gasto de la compra falta correr la migración 0022 en Supabase. Se guardan solo las cantidades y precios.', 'error');
  }
  let hechos = 0;
  let frascos = 0;
  for (const item of porId.values()) {
    boton.textContent = `Guardando ${hechos + 1} de ${porId.size}…`;
    const p = productosParaIngreso().find((x) => x.id === item.id);
    try {
      await ajustarInventario({ idProducto: item.id, cerrados: item.cantidad, motivo: 'Ingreso', nota });
      const cambios = {};
      if (item.precio != null) {
        cambios.precio_tienda_regular = item.precio;
        cambios.descuento_tienda_porcentaje = 0;
        cambios.precio_consolidado_fijo = Math.min(Number(p.precio_consolidado_fijo) || item.precio, item.precio);
        cambios.margen_aplicado = true;
      }
      if (item.publicar) {
        cambios.activo = true;
        if (p.estado === 'Bajo_Pedido') cambios.estado = 'Disponible';
      }
      if (Object.keys(cambios).length) await actualizarProducto(item.id, cambios);
      item.filas.forEach((f) => f.remove());
      hechos += 1;
      frascos += item.cantidad;
    } catch (err) {
      item.filas.forEach((f) => f.classList.add('con-error'));
      mostrarToast(`${p ? p.nombre : 'Perfume'}: ${err.message}`, 'error');
      break;
    }
  }
  boton.disabled = false;
  boton.textContent = 'Guardar ingreso';
  if (hechos) mostrarToast(`Ingreso guardado: ${frascos} frasco${frascos === 1 ? '' : 's'} en ${hechos} perfume${hechos === 1 ? '' : 's'}`);
  // Solo cuentan las filas con algo escrito (la fila vacía que agrega el Enter no frena el cierre).
  const quedan = leerFilasIngreso().filter((f) => f.texto || f.cantidad != null || f.precio != null).length;
  if (hechos && !quedan) {
    INGRESO_LIMPIAR = true;
    cerrarModal('modal-ingreso');
  } else if (!document.querySelectorAll('#ingreso-filas .ingreso-fila').length) {
    agregarFilaIngreso(false);
  }
  actualizarResumenIngreso();
  await cargarInventario();
  actualizarBadgesNav();
}

/* ---------- Ajuste manual (ingreso de mercadería, merma, conteo) ---------- */

let AJUSTE_LINEA = null;

function abrirModalAjuste(linea) {
  AJUSTE_LINEA = linea;
  const form = document.getElementById('form-ajuste-inventario');
  form.reset();
  document.getElementById('ajuste-info').innerHTML = `<strong style="color:var(--color-text);">${escapeHtml(linea.marca)} — ${escapeHtml(linea.nombre)}</strong><br>Ahora: ${linea.tienda ? `${linea.cerrados} cerrado(s)` : 'sin perfume de tienda'}${linea.decant ? ` · ${linea.abiertos} abierto(s) · ${linea.ml ?? '—'} ml` : ''}`;
  document.getElementById('ajuste-grupo-cerrados').hidden = !linea.tienda;
  document.getElementById('ajuste-grupo-abiertos').hidden = !linea.decant;
  document.getElementById('ajuste-grupo-ml').hidden = !linea.decant;
  document.getElementById('ajuste-vinculo').innerHTML = linea.tienda && linea.decant
    ? `Sus decants salen de este perfume (${escapeHtml(linea.decant.marca)} — ${escapeHtml(linea.decant.nombre)}). <button type="button" class="btn-link-inline" id="btn-ajuste-vincular">Cambiar vínculo</button>`
    : linea.tienda
      ? `Este perfume no tiene un decant vinculado. <button type="button" class="btn-link-inline" id="btn-ajuste-vincular">Vincular un decant</button>`
      : `Este decant no está vinculado a un perfume de tienda (al abrir un frasco no se descuenta de ningún lado). <button type="button" class="btn-link-inline" id="btn-ajuste-vincular">Vincular</button>`;
  prepararCamposAjuste();
  abrirModal('modal-ajuste-inventario');
}

function prepararCamposAjuste() {
  const motivo = document.getElementById('ajuste-motivo').value;
  const form = document.getElementById('form-ajuste-inventario');
  const l = AJUSTE_LINEA;
  if (!l) return;
  const esConteo = motivo === 'Conteo';
  const verbo = motivo === 'Ingreso' ? 'a sumar' : 'a restar';
  document.getElementById('ajuste-label-cerrados').textContent = esConteo ? 'Frascos cerrados (total)' : `Frascos cerrados ${verbo}`;
  document.getElementById('ajuste-label-abiertos').textContent = esConteo ? 'Frascos abiertos (total)' : `Frascos abiertos ${verbo}`;
  document.getElementById('ajuste-label-ml').textContent = esConteo ? 'ml en frasco (total)' : `ml ${verbo}`;
  form.cerrados.value = esConteo && l.tienda ? l.cerrados : '';
  form.abiertos.value = esConteo && l.decant ? l.abiertos : '';
  form.ml.value = esConteo && l.decant ? (l.ml ?? '') : '';
}

async function guardarAjusteInventario(e) {
  e.preventDefault();
  const l = AJUSTE_LINEA;
  const form = e.target;
  const motivo = form.motivo.value;
  const nota = form.nota.value.trim() || null;
  const leer = (campo) => (form[campo].value === '' ? null : Number(form[campo].value));
  const cerrados = l.tienda ? leer('cerrados') : null;
  const abiertos = l.decant ? leer('abiertos') : null;
  const ml = l.decant ? leer('ml') : null;
  if (cerrados == null && abiertos == null && ml == null) return mostrarToast('Escribe al menos una cantidad', 'error');

  const esConteo = motivo === 'Conteo';
  const signo = motivo === 'Merma' ? -1 : 1;
  const llamadas = [];
  if (l.tienda && cerrados != null) {
    llamadas.push(ajustarInventario({ idProducto: l.tienda.id, cerrados: esConteo ? cerrados : signo * cerrados, esDelta: !esConteo, motivo, nota }));
  }
  if (l.decant && (abiertos != null || ml != null)) {
    llamadas.push(ajustarInventario({
      idProducto: l.decant.id,
      abiertos: abiertos == null ? null : (esConteo ? abiertos : signo * abiertos),
      ml: ml == null ? null : (esConteo ? ml : signo * ml),
      esDelta: !esConteo,
      motivo,
      nota,
    }));
  }
  try {
    await Promise.all(llamadas);
    cerrarModal('modal-ajuste-inventario');
    mostrarToast('Stock actualizado');
    await cargarInventario();
    actualizarBadgesNav();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ---------- Vincular decant ↔ perfume de tienda ---------- */

let VINCULO_LINEA = null;

function etiquetaOpcionVinculo(p) {
  return `${p.marca} — ${p.nombre}${p.es_decant ? ' (decant)' : ` (${p.mililitros}ml)`} #${p.id}`;
}

function abrirModalVincular(linea) {
  VINCULO_LINEA = linea;
  const buscaTienda = !!linea.decant; // un decant elige su perfume de tienda; una línea solo-tienda elige qué decant sale de ella
  const opciones = (INVENTARIO_CACHE || []).filter((p) => (buscaTienda ? !p.es_decant : (p.es_decant && !p.id_perfume_tienda)));
  document.getElementById('vincular-opciones').innerHTML = opciones.map((p) => `<option value="${escapeHtml(etiquetaOpcionVinculo(p))}"></option>`).join('');
  document.getElementById('vincular-label').textContent = buscaTienda ? 'Perfume entero de tienda (de donde salen sus frascos)' : 'Decant que se sirve de este perfume';
  document.getElementById('vincular-info').innerHTML = buscaTienda
    ? `Decant <strong>${escapeHtml(linea.decant.marca)} — ${escapeHtml(linea.decant.nombre)}</strong>: al abrir un frasco se descuenta 1 cerrado del perfume que elijas.`
    : `Perfume <strong>${escapeHtml(linea.tienda.marca)} — ${escapeHtml(linea.tienda.nombre)}</strong>: elige el decant que se llena con sus frascos.`;
  const actual = buscaTienda && linea.tienda ? etiquetaOpcionVinculo(linea.tienda) : '';
  document.getElementById('vincular-busqueda').value = actual;
  abrirModal('modal-vincular');
}

async function guardarVinculo(e) {
  e.preventDefault();
  const l = VINCULO_LINEA;
  const texto = document.getElementById('vincular-busqueda').value.trim();
  const idElegido = texto ? Number((texto.match(/#(\d+)$/) || [])[1]) : null;
  if (texto && !idElegido) return mostrarToast('Elige una opción de la lista', 'error');
  try {
    if (l.decant) await vincularDecantConTienda(l.decant.id, idElegido);
    else if (idElegido) await vincularDecantConTienda(idElegido, l.tienda.id);
    cerrarModal('modal-vincular');
    mostrarToast(idElegido ? 'Vinculado' : 'Vínculo quitado');
    await cargarInventario();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ---------- Kardex (movimientos) ---------- */

async function cargarMovimientos() {
  const tbody = document.getElementById('movimientos-tbody');
  const periodo = document.getElementById('movimientos-periodo').value;
  const tipo = document.getElementById('movimientos-tipo').value;
  const q = normalizarBusqueda(document.getElementById('movimientos-busqueda').value);
  const avisoFiltro = document.getElementById('movimientos-filtro-producto');
  avisoFiltro.hidden = !MOVIMIENTOS_FILTRO;
  document.getElementById('btn-movimientos-quitar-filtro').hidden = !MOVIMIENTOS_FILTRO;
  if (MOVIMIENTOS_FILTRO) avisoFiltro.innerHTML = `Mostrando solo: <strong>${escapeHtml(MOVIMIENTOS_FILTRO.nombre)}</strong>`;

  tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">Cargando…</td></tr>';
  try {
    let desde = null;
    if (periodo) {
      const f = new Date();
      f.setDate(f.getDate() - Number(periodo));
      desde = f.toISOString();
    }
    let movimientos = await obtenerMovimientosInventario({ idsProducto: MOVIMIENTOS_FILTRO?.ids, tipo, desde });
    if (q) movimientos = movimientos.filter((m) => normalizarBusqueda(`${m.perfumes?.marca} ${m.perfumes?.nombre}`).includes(q));
    const delta = (n, sufijo = '') => (Number(n) ? `<span class="${Number(n) > 0 ? 'delta-mas' : 'delta-menos'}">${Number(n) > 0 ? '+' : ''}${Number(n)}${sufijo}</span>` : '<span class="celda-sub">·</span>');
    tbody.innerHTML = movimientos.length ? movimientos.map((m) => {
      const usuario = m.perfiles ? (m.perfiles.rol === 'Admin' ? `${m.perfiles.nombres}` : 'Cliente web') : 'Sistema';
      return `
      <tr>
        <td style="white-space:nowrap;">${fechaHoraEs(m.fecha)}</td>
        <td>${escapeHtml(m.perfumes?.marca || '')} — ${escapeHtml(m.perfumes?.nombre || '')}${m.perfumes?.es_decant ? ' <span class="badge badge-decant">Decant</span>' : ''}</td>
        <td><span class="mov-tag mov-${m.tipo.toLowerCase()}">${escapeHtml(TIPOS_MOVIMIENTO_LABEL[m.tipo] || m.tipo)}</span></td>
        <td class="num">${delta(m.delta_cerrados)}${m.delta_cerrados ? `<br><span class="celda-sub">queda ${m.cerrados_resultante}</span>` : ''}</td>
        <td class="num">${delta(m.delta_abiertos)}${m.delta_abiertos ? `<br><span class="celda-sub">queda ${m.abiertos_resultante}</span>` : ''}</td>
        <td class="num">${delta(m.delta_ml, ' ml')}${Number(m.delta_ml) ? `<br><span class="celda-sub">queda ${m.ml_resultante ?? '—'}</span>` : ''}</td>
        <td>${m.id_pedido ? `<button type="button" class="btn-link-inline btn-mov-pedido" data-id="${m.id_pedido}">Pedido #${m.id_pedido}</button> · ` : ''}${escapeHtml(m.nota || '')}<br><span class="celda-sub">${escapeHtml(usuario)}</span></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="admin-empty">Sin movimientos en este período.</td></tr>';
    tbody.querySelectorAll('.btn-mov-pedido').forEach((btn) => btn.addEventListener('click', () => abrirDetallePedido(Number(btn.dataset.id))));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ---------- Exportar / imprimir ---------- */

function exportarInventarioExcel() {
  if (!window.XLSX) return mostrarToast('No cargó la librería de Excel — revisa tu conexión y recarga', 'error');
  const lineas = lineasInventarioFiltradas();
  if (!lineas.length) return mostrarToast('No hay perfumes en esta vista para exportar', 'error');
  const filas = lineas.map((l) => ({
    Marca: l.marca,
    Perfume: l.nombre,
    'ml por frasco': l.tienda?.mililitros ?? l.decant?.mililitros ?? '',
    'Frascos cerrados': l.cerrados ?? '',
    'Frascos abiertos': l.abiertos ?? '',
    'ml en frasco abierto': l.ml ?? '',
    'Precio venta (S/)': l.precio ?? '',
    'Costo unitario (S/)': l.costo ?? '',
    'Valor a costo (S/)': l.cerrados && l.costo ? Number((l.cerrados * l.costo).toFixed(2)) : '',
    'Valor a venta (S/)': l.cerrados && l.precio ? Number((l.cerrados * l.precio).toFixed(2)) : '',
    'Visible en web': l.activo ? 'Sí' : 'No',
  }));
  const hoja = XLSX.utils.json_to_sheet(sanitizarFilasExcel(filas));
  hoja['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 13 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Inventario');
  XLSX.writeFile(libro, `inventario-maison-zadaca-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Hoja para el conteo físico: lo que dice el sistema y columnas vacías para anotar lo que se
// cuenta en la tienda -- después se corrige con Ajustar → Conteo físico.
function imprimirHojaConteo() {
  const lineas = lineasInventarioFiltradas();
  if (!lineas.length) return mostrarToast('No hay perfumes en esta vista para imprimir', 'error');
  const ventana = window.open('', '_blank');
  if (!ventana) return mostrarToast('El navegador bloqueó la ventana de impresión — permite ventanas emergentes', 'error');
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8" />
    <title>Conteo de inventario — Maison Zadaca</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 1.1rem; margin: 0 0 4px; }
      .meta { font-size: 0.78rem; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
      th, td { border: 1px solid #aaa; padding: 6px 8px; text-align: left; }
      th { background: #eee; font-size: 0.68rem; text-transform: uppercase; }
      td.n { text-align: center; width: 70px; }
      td.blanco { width: 80px; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>
    <h1>Conteo de inventario — Maison Zadaca</h1>
    <div class="meta">Impreso el ${new Date().toLocaleString('es-PE')} · ${lineas.length} perfume(s)</div>
    <table>
      <thead><tr><th>#</th><th>Perfume</th><th>Cerrados (sistema)</th><th>Cerrados (conteo)</th><th>Abiertos (sistema)</th><th>Abiertos (conteo)</th><th>ml (conteo)</th></tr></thead>
      <tbody>${lineas.map((l, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(l.marca)} — ${escapeHtml(l.nombre)}</td><td class="n">${l.cerrados ?? '—'}</td><td class="blanco"></td><td class="n">${l.abiertos ?? '—'}</td><td class="blanco"></td><td class="blanco"></td></tr>`).join('')}</tbody>
    </table>
    <script>window.onload = function () { window.print(); };<\/script>
  </body></html>`);
  ventana.document.close();
}

/* ================= CONSOLIDADOS ================= */

const ESTADOS_CONSOLIDADO_LABEL = {
  Borrador: 'Borrador', Abierto: 'Abierto', Cerrado_Procesando: 'Cerrado — Procesando', Comprado_En_Transito: 'En tránsito',
  En_Aduanas: 'En aduanas', En_Almacen_Local: 'En almacén local', Finalizado: 'Finalizado', Cancelado: 'Cancelado',
};

// Agrupa reservas (de una campaña o de todas) por producto y suma cantidad -- para saber de un
// vistazo cuántas unidades de CADA perfume hay que encargar, en vez de sumarlas a mano fila por
// fila. Excluye 'Cancelado' -- todo lo demás (incluida Pendiente_Aprobacion) sí representa
// demanda real a comprar.
function resumenReservasPorProducto(reservas) {
  const porProducto = new Map();
  for (const r of reservas) {
    if (r.estado_item === 'Cancelado') continue;
    // r.producto ya viene armado así en obtenerTodasLasReservasAdmin; en
    // obtenerReservasDeConsolidadoAdmin (una sola campaña) hay que armarlo acá porque esa
    // trae marca/nombre sueltos (ver admin-api.js).
    const clave = r.producto || `${r.marca} — ${r.nombre}`;
    porProducto.set(clave, (porProducto.get(clave) || 0) + r.cantidad);
  }
  return [...porProducto.entries()].sort((a, b) => b[1] - a[1]);
}

function htmlResumenReservasPorProducto(reservas) {
  const resumen = resumenReservasPorProducto(reservas);
  if (!resumen.length) return '';
  return `
    <div style="background:var(--color-bg); border:1px solid var(--color-border); border-radius:var(--radius); padding:12px 14px; margin-bottom:14px;">
      <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Cuánto pedir de cada perfume</span>
      <div style="display:flex; flex-wrap:wrap; gap:6px 18px; margin-top:8px;">
        ${resumen.map(([producto, cantidad]) => `<span style="font-size:0.82rem; color:var(--color-text-muted);">${escapeHtml(producto)} <strong style="color:var(--color-text);">&times;${cantidad}</strong></span>`).join('')}
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-nuevo-consolidado')?.addEventListener('click', () => abrirModalConsolidado());
  document.getElementById('btn-cancelar-consolidado')?.addEventListener('click', () => cerrarModal('modal-consolidado'));
  document.getElementById('form-consolidado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    delete data.id;
    data.minimo_unidades = Number(data.minimo_unidades);
    try {
      if (id) await actualizarConsolidadoAdmin(Number(id), data);
      else await crearConsolidadoAdmin(data);
      mostrarToast('Campaña guardada');
      cerrarModal('modal-consolidado');
      cargarConsolidados();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

function abrirModalConsolidado(c) {
  const form = document.getElementById('form-consolidado');
  form.reset();
  document.getElementById('modal-consolidado-titulo').textContent = c ? 'Editar Campaña' : 'Nueva Campaña de Consolidado';
  form.id.value = c?.id || '';
  if (c) {
    form.codigo_campana.value = c.codigo_campana;
    form.fecha_apertura.value = c.fecha_apertura?.slice(0, 10);
    form.fecha_cierre_programada.value = c.fecha_cierre_programada?.slice(0, 10);
    form.minimo_unidades.value = c.minimo_unidades;
    form.notas_admin.value = c.notas_admin || '';
  }
  abrirModal('modal-consolidado');
}

async function cargarConsolidados() {
  cargarPerfumesSoloConsolidado();
  const mount = document.getElementById('consolidados-lista');
  try {
    const consolidados = await obtenerConsolidadosAdmin();
    mount.innerHTML = consolidados.length ? consolidados.map(tarjetaConsolidadoAdmin).join('') : '<div class="admin-empty">No hay consolidados aún.</div>';
    conectarEventosConsolidados(consolidados);
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

function tarjetaConsolidadoAdmin(c) {
  const pct = Math.min(Math.round((100 * c.total_unidades_acumuladas) / c.minimo_unidades), 100);
  return `
    <div class="campaign-detail-card" data-id="${c.id}">
      <div class="campaign-detail-head">
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:4px;">${escapeHtml(c.codigo_campana)}</h3>
          <span style="font-size:0.78rem; color:var(--color-text-faint);">Apertura: ${new Date(c.fecha_apertura).toLocaleDateString('es-PE')} &middot; Cierre programado: ${new Date(c.fecha_cierre_programada).toLocaleDateString('es-PE')}</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select class="status-select select-estado-consolidado">
            ${ESTADOS_CONSOLIDADO.map((e) => `<option value="${e}" ${c.estado === e ? 'selected' : ''}>${ESTADOS_CONSOLIDADO_LABEL[e]}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm btn-editar-consolidado">Editar</button>
          <button class="btn btn-danger btn-sm btn-eliminar-consolidado">Eliminar</button>
        </div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label"><span>${c.total_unidades_acumuladas} de ${c.minimo_unidades} unidades</span><span>${pct}%</span></div>
      <button class="btn btn-outline btn-sm btn-ver-reservas" style="margin-top:12px;">Ver Reservas de esta Campaña</button>
      <div class="reservas-panel" style="display:none; margin-top:16px;"></div>
    </div>
  `;
}

function conectarEventosConsolidados(consolidados) {
  document.querySelectorAll('#consolidados-lista .select-estado-consolidado').forEach((sel) => {
    const valorOriginal = sel.value;
    sel.addEventListener('change', async () => {
      const card = sel.closest('.campaign-detail-card');
      const id = Number(card.dataset.id);
      const descripcion = prompt('Descripción pública para el historial de esta campaña (opcional):', '');
      try {
        await cambiarEstadoConsolidado(id, sel.value, descripcion);
        mostrarToast('Estado de campaña actualizado');
        cargarConsolidados();
      } catch (err) {
        mostrarToast(err.message, 'error');
        sel.value = valorOriginal;
      }
    });
  });

  document.querySelectorAll('#consolidados-lista .btn-editar-consolidado').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.closest('.campaign-detail-card').dataset.id);
      const c = consolidados.find((x) => x.id === id);
      if (c) abrirModalConsolidado(c);
    });
  });

  document.querySelectorAll('#consolidados-lista .btn-eliminar-consolidado').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.closest('.campaign-detail-card').dataset.id);
      if (!confirm('¿Eliminar esta campaña de consolidado? Esta acción no se puede deshacer.')) return;
      try {
        await eliminarConsolidadoAdmin(id);
        mostrarToast('Campaña eliminada');
        cargarConsolidados();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#consolidados-lista .btn-ver-reservas').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.campaign-detail-card');
      const panel = card.querySelector('.reservas-panel');
      const visible = panel.style.display !== 'none';
      if (visible) { panel.style.display = 'none'; return; }
      panel.style.display = '';
      panel.innerHTML = '<div class="admin-empty">Cargando…</div>';
      try {
        const reservas = await obtenerReservasDeConsolidadoAdmin(Number(card.dataset.id));
        const codigoCampana = consolidados.find((c) => c.id === Number(card.dataset.id))?.codigo_campana || '';
        panel.innerHTML = reservas.length ? `
          ${htmlResumenReservasPorProducto(reservas)}
          <div class="admin-table-wrap"><table class="data-table">
            <thead><tr><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              ${reservas.map((r) => {
                const mensaje = `Hola ${primerNombre(r.cliente)}! Confirmamos tu reserva en la campaña ${codigoCampana}: ${r.cantidad} x ${r.marca} — ${r.nombre} a ${formatoMoneda(r.precio_consolidado_aplicado)} c/u (total ${formatoMoneda(r.cantidad * r.precio_consolidado_aplicado)}). Te avisamos apenas cierre la campaña para coordinar el pago.`;
                const enlaceWa = enlaceWhatsappCliente(r.telefono_cliente, mensaje);
                return `
                <tr data-reserva-id="${r.id}"${r.estado_item === 'Pendiente_Aprobacion' ? ' style="background:rgba(122,32,48,0.08);"' : ''}>
                  <td>${escapeHtml(r.cliente)}<br><span style="font-size:0.7rem; color:var(--color-text-faint);">${escapeHtml(r.correo_cliente || '')}</span></td>
                  <td>${escapeHtml(r.marca)} — ${escapeHtml(r.nombre)}</td>
                  <td><input type="number" min="1" class="input-cantidad-reserva" value="${r.cantidad}" style="width:56px; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text); padding:6px 8px; border-radius:3px;" /></td>
                  <td>${formatoMoneda(r.precio_consolidado_aplicado)}</td>
                  <td><select class="status-select select-estado-reserva" ${r.estado_item === 'Convertido_A_Pedido' ? 'disabled title="Ya se generó un pedido para esta reserva -- revertirla crearía un pedido duplicado al volver a generar pedidos"' : ''}>
                    ${ESTADOS_RESERVA.map((e) => `<option value="${e}" ${r.estado_item === e ? 'selected' : ''}>${e}</option>`).join('')}
                  </select></td>
                  <td>${enlaceWa ? `<a class="btn btn-whatsapp btn-sm" href="${enlaceWa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table></div>
        ` : '<p class="admin-empty">Sin reservas en esta campaña.</p>';

        panel.querySelectorAll('.select-estado-reserva').forEach((sel) => {
          const valorOriginal = sel.value;
          sel.addEventListener('change', async () => {
            const idReserva = Number(sel.closest('tr').dataset.reservaId);
            try {
              await actualizarEstadoReserva(idReserva, sel.value);
              mostrarToast('Reserva actualizada');
              cargarConsolidados();
            } catch (err) {
              mostrarToast(err.message, 'error');
              sel.value = valorOriginal;
            }
          });
        });

        // Editar la cantidad acá evita que la única forma de corregir un pedido del cliente
        // (ej. "en realidad quiero 2, no 3") sea entrar a Supabase a mano.
        panel.querySelectorAll('.input-cantidad-reserva').forEach((input) => {
          const valorOriginal = input.value;
          input.addEventListener('change', async () => {
            const idReserva = Number(input.closest('tr').dataset.reservaId);
            const nuevaCantidad = Number(input.value);
            if (!nuevaCantidad || nuevaCantidad < 1) {
              mostrarToast('La cantidad debe ser mayor a 0', 'error');
              input.value = valorOriginal;
              return;
            }
            try {
              await actualizarCantidadReserva(idReserva, nuevaCantidad);
              mostrarToast('Cantidad actualizada');
              cargarConsolidados();
            } catch (err) {
              mostrarToast(err.message, 'error');
              input.value = valorOriginal;
            }
          });
        });
      } catch (err) {
        panel.innerHTML = `<div class="admin-empty">${err.message}</div>`;
      }
    });
  });
}

/* ================= PERFUMES SOLO POR CONSOLIDADO (nombre y precio) ================= */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-perfume-consolidado');
  if (!form) return;
  const inputFoto = document.getElementById('perfume-consolidado-foto');
  const nombreFoto = document.getElementById('perfume-consolidado-foto-nombre');
  document.getElementById('btn-nuevo-perfume-consolidado').addEventListener('click', abrirModalPerfumeConsolidado);
  document.getElementById('btn-cancelar-perfume-consolidado').addEventListener('click', () => cerrarModal('modal-perfume-consolidado'));
  inputFoto.addEventListener('change', () => {
    nombreFoto.textContent = inputFoto.files[0] ? inputFoto.files[0].name : 'Sin foto (se muestra el ícono genérico)';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const imagen_url = inputFoto.files[0] ? await subirImagen(inputFoto.files[0], 'perfumes') : null;
      await crearPerfumeConsolidado({
        marca: data.marca.trim(),
        nombre: data.nombre.trim(),
        precio: Number(data.precio),
        mililitros: Number(data.mililitros) || 100,
        genero: data.genero,
        tipo_casa: data.tipo_casa || null,
        imagen_url,
      });
      mostrarToast(`${data.nombre.trim()} ya está en el Catálogo Consolidado`);
      cerrarModal('modal-perfume-consolidado');
      cargarPerfumesSoloConsolidado();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
});

async function abrirModalPerfumeConsolidado() {
  const form = document.getElementById('form-perfume-consolidado');
  form.reset();
  document.getElementById('perfume-consolidado-foto-nombre').textContent = 'Sin foto (se muestra el ícono genérico)';
  abrirModal('modal-perfume-consolidado');
  form.marca.focus();
  try {
    const { marcas } = await obtenerFiltrosCatalogo({ consolidado: true });
    document.getElementById('lista-marcas-consolidado').innerHTML = marcas.map((m) => `<option value="${escapeHtml(m)}"></option>`).join('');
  } catch { /* sin sugerencias de marca no pasa nada */ }
}

async function cargarPerfumesSoloConsolidado() {
  const mount = document.getElementById('perfumes-consolidado-lista');
  if (!mount) return;
  try {
    const perfumes = await obtenerPerfumesSoloConsolidado();
    if (!perfumes.length) {
      mount.innerHTML = '<p class="admin-empty" style="padding:14px 0 0;">Todavía no agregaste ninguno. Usa "+ Perfume (nombre y precio)" cuando un cliente pida algo que no está en el catálogo.</p>';
      return;
    }
    mount.innerHTML = `
      <div class="admin-table-wrap" style="margin-top:12px;"><table class="data-table">
        <thead><tr><th>Perfume</th><th>ml</th><th>Precio consolidado</th><th>Visible</th><th></th></tr></thead>
        <tbody>
          ${perfumes.map((p) => `
            <tr data-id="${p.id}">
              <td><div style="display:flex; align-items:center; gap:10px;"><span class="mini-foto">${imagenProductoAdmin(p)}</span><span><strong>${escapeHtml(p.marca)}</strong> — ${escapeHtml(p.nombre)}</span></div></td>
              <td>${p.mililitros}</td>
              <td><input type="number" class="input-precio-consolidado" min="0.01" step="0.01" value="${Number(p.precio_consolidado_fijo)}" style="width:96px; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text); padding:6px 8px; border-radius:3px;" /></td>
              <td><label class="filter-option" style="margin:0;"><input type="checkbox" class="check-visible-consolidado" ${p.activo ? 'checked' : ''} /> ${p.activo ? 'Sí' : 'Oculto'}</label></td>
              <td><button type="button" class="btn btn-danger btn-sm btn-eliminar-perfume-consolidado">Eliminar</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    mount.querySelectorAll('.input-precio-consolidado').forEach((input) => {
      const original = input.value;
      input.addEventListener('change', async () => {
        const precio = Number(input.value);
        if (!(precio > 0)) { input.value = original; mostrarToast('El precio debe ser mayor a 0', 'error'); return; }
        try {
          await actualizarPerfumeConsolidado(Number(input.closest('tr').dataset.id), { precio });
          mostrarToast('Precio actualizado');
        } catch (err) {
          input.value = original;
          mostrarToast(err.message, 'error');
        }
      });
    });
    mount.querySelectorAll('.check-visible-consolidado').forEach((check) => {
      check.addEventListener('change', async () => {
        try {
          await actualizarPerfumeConsolidado(Number(check.closest('tr').dataset.id), { activo: check.checked });
          mostrarToast(check.checked ? 'Visible en el Catálogo Consolidado' : 'Oculto del Catálogo Consolidado');
          cargarPerfumesSoloConsolidado();
        } catch (err) {
          check.checked = !check.checked;
          mostrarToast(err.message, 'error');
        }
      });
    });
    mount.querySelectorAll('.btn-eliminar-perfume-consolidado').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const fila = btn.closest('tr');
        if (!confirm('¿Eliminar este perfume del consolidado?')) return;
        try {
          await eliminarProducto(Number(fila.dataset.id));
          mostrarToast('Perfume eliminado');
        } catch {
          // Si ya tiene reservas o pedidos, no se puede borrar: se oculta para no perder el historial.
          await actualizarPerfumeConsolidado(Number(fila.dataset.id), { activo: false }).catch(() => {});
          mostrarToast('Tiene reservas o pedidos: se ocultó en vez de borrarse');
        }
        cargarPerfumesSoloConsolidado();
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

/* ================= CONTABILIDAD ================= */

// Cómo se calcula (lo mismo que se le explica al admin en pantalla):
//  - Ventas: lo que se vendió (pedidos no anulados, del día en que se hicieron).
//  - Costo de lo vendido: lo que costó la mercadería de esas ventas (costo guardado en cada
//    venta, ver migración 0022). Las ventas sin costo cargado no entran en la ganancia (se
//    avisa cuánto falta).
//  - Ganancia bruta = ventas con costo − su costo.
//  - Gastos del negocio: todos los gastos MENOS las compras de mercadería (esa plata ya está en
//    el costo de lo vendido; contarla dos veces achicaría la ganancia).
//  - Ganancia neta = ganancia bruta − gastos del negocio.
//  - Caja: lo que entró (pagos cobrados) y lo que salió (todos los gastos pagados), por método.
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const VISTAS_CONTA = ['resumen', 'cobrar', 'caja', 'ventas', 'gastos', 'consolidados'];
const CATEGORIA_MERCADERIA = 'Mercadería';
let CONTA_DATOS = null;
let CONTA_ANIO_CARGADO = null;
let contaVista = 'resumen';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contabilidad-anio')?.addEventListener('change', () => cargarContabilidad());
  document.getElementById('contabilidad-mes')?.addEventListener('change', () => renderVistaContabilidad());
  document.querySelectorAll('#contabilidad-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => cambiarVistaConta(tab.dataset.vista));
  });
  const categoria = document.getElementById('gasto-categoria');
  if (categoria) categoria.innerHTML = CATEGORIAS_GASTO.map((c) => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('form-gasto')?.addEventListener('submit', guardarGasto);
  document.getElementById('btn-cancelar-edicion-gasto')?.addEventListener('click', () => limpiarFormularioGasto());
  document.getElementById('gasto-comprobante')?.addEventListener('change', (e) => {
    document.getElementById('gasto-comprobante-nombre').textContent = e.target.files[0]?.name || 'Boleta, factura o captura del pago';
  });
  document.getElementById('gastos-contenido')?.addEventListener('click', manejarClickGastos);

  document.getElementById('caja-fecha')?.addEventListener('change', (e) => { if (e.target.value) { CAJA_FECHA = e.target.value; cargarCaja(); } });
  document.getElementById('caja-dia-anterior')?.addEventListener('click', () => moverDiaCaja(-1));
  document.getElementById('caja-dia-siguiente')?.addEventListener('click', () => moverDiaCaja(1));
  document.getElementById('caja-hoy')?.addEventListener('click', () => { CAJA_FECHA = fechaInputHoy(); cargarCaja(); });
  document.getElementById('caja-imprimir')?.addEventListener('click', imprimirCierreCaja);

  document.getElementById('contabilidad-vista-cobrar')?.addEventListener('click', manejarClickPorCobrar);
  document.getElementById('btn-cancelar-cobro')?.addEventListener('click', () => cerrarModal('modal-cobro'));
  document.getElementById('form-cobro')?.addEventListener('submit', guardarCobro);
});

function cambiarVistaConta(vista) {
  contaVista = vista;
  document.querySelectorAll('#contabilidad-tabs .admin-tab').forEach((b) => b.classList.toggle('active', b.dataset.vista === vista));
  VISTAS_CONTA.forEach((v) => { document.getElementById(`contabilidad-vista-${v}`).hidden = v !== vista; });
  if (vista === 'consolidados') cargarContabilidadConsolidados();
  else if (vista === 'cobrar') cargarPorCobrar();
  else if (vista === 'caja') cargarCaja();
  else renderVistaContabilidad();
}

async function cargarContabilidad() {
  const selAnio = document.getElementById('contabilidad-anio');
  const anioActual = new Date().getFullYear();
  if (!selAnio.options.length) {
    selAnio.innerHTML = [anioActual, anioActual - 1, anioActual - 2].map((a) => `<option value="${a}">${a}</option>`).join('');
    document.getElementById('contabilidad-mes').value = String(new Date().getMonth());
    const form = document.getElementById('form-gasto');
    if (form) form.fecha.value = fechaInputHoy();
  }
  const anio = Number(selAnio.value) || anioActual;
  const mount = document.getElementById('contabilidad-vista-resumen');
  if (CONTA_ANIO_CARGADO !== anio) mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  actualizarContadorPorCobrar();
  try {
    CONTA_DATOS = await obtenerDatosContabilidad(anio);
    CONTA_ANIO_CARGADO = anio;
    if (contaVista === 'consolidados') cargarContabilidadConsolidados();
    else if (contaVista === 'cobrar') cargarPorCobrar();
    else if (contaVista === 'caja') cargarCaja();
    else renderVistaContabilidad();
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

function fechaInputHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function mesSeleccionadoConta() {
  const v = document.getElementById('contabilidad-mes').value;
  return v === '' ? null : Number(v);
}

function enPeriodo(fecha, mes) {
  return fecha && (mes == null || fecha.getMonth() === mes);
}

// Costo de una línea vendida: el guardado en la venta (migración 0022). Sin esa migración, el
// costo actual del perfume entero. null = no se sabe.
function costoLineaVenta(i) {
  if (i.costo_unitario != null) return Number(i.costo_unitario) * i.cantidad;
  if ('costo_unitario' in i) return null;
  const prod = i.perfumes;
  if (prod && !prod.es_decant && prod.costo_importacion_pen != null) return Number(prod.costo_importacion_pen) * i.cantidad;
  return null;
}

function porcentaje(parte, total) {
  return total ? `${Math.round((parte / total) * 100)}%` : '—';
}

// Todo el cálculo de un período (mes o año) a partir de CONTA_DATOS.
function calcularPeriodoConta(mes) {
  const { pedidos, pagos, gastos } = CONTA_DATOS;
  const pedidosPeriodo = pedidos.filter((p) => enPeriodo(fechaDB(p.fecha_creacion), mes));
  const activos = pedidosPeriodo.filter((p) => !p.cancelado);
  const anulados = pedidosPeriodo.filter((p) => p.cancelado);
  const pagosPeriodo = pagos.filter((pg) => enPeriodo(fechaDB(pg.fecha_pago), mes));
  const gastosPeriodo = gastos.filter((g) => enPeriodo(fechaDB(g.fecha), mes));

  const ventas = activos.reduce((acc, p) => acc + Number(p.monto_total), 0);
  const cobrado = pagosPeriodo.reduce((acc, pg) => acc + Number(pg.monto), 0);
  const porCobrar = activos.reduce((acc, p) => acc + Number(p.monto_saldo_pendiente), 0);
  const totalGastos = gastosPeriodo.reduce((acc, g) => acc + Number(g.monto), 0);
  const comprasMercaderia = gastosPeriodo.filter((g) => g.categoria === CATEGORIA_MERCADERIA).reduce((acc, g) => acc + Number(g.monto), 0);
  const gastosNegocio = totalGastos - comprasMercaderia;

  const tipos = {
    enteros: { ventas: 0, ventasConCosto: 0, costo: 0 },
    decants: { ventas: 0, ventasConCosto: 0, costo: 0 },
    libres: { ventas: 0, ventasConCosto: 0, costo: 0 },
  };
  const sinCosto = new Map();
  const porProducto = new Map();
  activos.forEach((p) => (p.detalle_pedido || []).forEach((i) => {
    const prod = i.perfumes || null;
    const subtotal = Number(i.subtotal || 0);
    const costo = costoLineaVenta(i);
    const tipo = !prod ? tipos.libres : prod.es_decant ? tipos.decants : tipos.enteros;
    tipo.ventas += subtotal;
    const nombre = prod ? `${prod.marca || ''} — ${prod.nombre || ''}${prod.es_decant ? ` (decant ${i.talla_ml} ml)` : ''}` : `${i.descripcion_libre || 'Producto libre'} (libre)`;
    if (costo != null) {
      tipo.ventasConCosto += subtotal;
      tipo.costo += costo;
    } else {
      const s = sinCosto.get(nombre) || { unidades: 0, monto: 0 };
      s.unidades += i.cantidad;
      s.monto += subtotal;
      sinCosto.set(nombre, s);
    }
    const clave = prod ? `${prod.id}-${prod.es_decant ? i.talla_ml : 0}` : `libre-${(i.descripcion_libre || '').trim().toLowerCase()}`;
    if (!porProducto.has(clave)) porProducto.set(clave, { nombre, unidades: 0, monto: 0, ganancia: 0, conCosto: true });
    const entrada = porProducto.get(clave);
    entrada.unidades += i.cantidad;
    entrada.monto += subtotal;
    if (costo != null) entrada.ganancia += subtotal - costo;
    else entrada.conCosto = false;
  }));

  const ventasConCosto = tipos.enteros.ventasConCosto + tipos.decants.ventasConCosto + tipos.libres.ventasConCosto;
  const costoVendido = tipos.enteros.costo + tipos.decants.costo + tipos.libres.costo;
  const gananciaBruta = ventasConCosto - costoVendido;

  const agrupar = (lista, clave, valor) => {
    const mapa = new Map();
    lista.forEach((x) => {
      const k = clave(x);
      const actual = mapa.get(k) || { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += valor(x);
      mapa.set(k, actual);
    });
    return [...mapa.entries()].sort((a, b) => b[1].monto - a[1].monto);
  };

  return {
    pedidosPeriodo, activos, anulados, pagosPeriodo, gastosPeriodo,
    ventas, cobrado, porCobrar, totalGastos, comprasMercaderia, gastosNegocio,
    ventasConCosto, costoVendido, gananciaBruta,
    ventasSinCosto: ventas - ventasConCosto,
    sinCosto: [...sinCosto.entries()].sort((a, b) => b[1].monto - a[1].monto),
    gananciaNeta: gananciaBruta - gastosNegocio,
    cajaNeta: cobrado - totalGastos,
    ticket: activos.length ? ventas / activos.length : 0,
    tipos,
    porCanal: agrupar(activos, (p) => etiquetaCanal(p.canal), (p) => Number(p.monto_total)),
    porCategoriaNegocio: agrupar(gastosPeriodo.filter((g) => g.categoria !== CATEGORIA_MERCADERIA), (g) => g.categoria, (g) => Number(g.monto)),
    porCategoria: agrupar(gastosPeriodo, (g) => g.categoria, (g) => Number(g.monto)),
    caja: cajaPorMetodo(pagosPeriodo, gastosPeriodo),
    topProductos: [...porProducto.values()].sort((a, b) => b.unidades - a.unidades || b.monto - a.monto).slice(0, 10),
  };
}

// Entró / salió / neto por método de pago (efectivo, Yape, Plin...).
function cajaPorMetodo(pagos, gastos) {
  const mapa = new Map();
  const fila = (metodo) => {
    const k = METODOS_PAGO_LABEL[metodo] || metodo || 'Método no indicado';
    if (!mapa.has(k)) mapa.set(k, { entro: 0, salio: 0 });
    return mapa.get(k);
  };
  pagos.forEach((pg) => { fila(pg.metodo_pago).entro += Number(pg.monto); });
  gastos.forEach((g) => { fila(g.metodo_pago).salio += Number(g.monto); });
  return [...mapa.entries()].sort((a, b) => (b[1].entro + b[1].salio) - (a[1].entro + a[1].salio));
}

function renderVistaContabilidad() {
  if (!CONTA_DATOS) return;
  if (contaVista === 'ventas') return renderVentasConta();
  if (contaVista === 'gastos') return renderGastosConta();
  if (contaVista === 'resumen') return renderResumenConta();
  if (contaVista === 'cobrar') return renderPorCobrar();
  if (contaVista === 'caja') return cargarCaja();
}

function tablaDesglose(titulo, filas, etiquetaCantidad) {
  const total = filas.reduce((acc, [, v]) => acc + v.monto, 0);
  return `
    <div class="dashboard-panel">
      <div class="dashboard-panel-head"><h3>${titulo}</h3></div>
      ${filas.length ? filas.map(([nombre, v]) => `
        <div class="desglose-fila">
          <span>${escapeHtml(nombre)} <span class="celda-sub">${v.cantidad} ${etiquetaCantidad}</span></span>
          <strong>${formatoMoneda(v.monto)}</strong>
          <div class="mini-bar"><div style="width:${total ? Math.round((v.monto / total) * 100) : 0}%"></div></div>
        </div>`).join('') : '<div class="admin-empty" style="padding:20px;">Sin datos en este período.</div>'}
    </div>`;
}

function htmlTablaCaja(caja) {
  if (!caja.length) return '<div class="admin-empty" style="padding:16px;">Sin movimientos de caja.</div>';
  const total = caja.reduce((acc, [, v]) => ({ entro: acc.entro + v.entro, salio: acc.salio + v.salio }), { entro: 0, salio: 0 });
  return `
    <table class="data-table caja-tabla">
      <thead><tr><th>Método</th><th class="num">Entró</th><th class="num">Salió</th><th class="num">Neto</th></tr></thead>
      <tbody>${caja.map(([metodo, v]) => `<tr><td>${escapeHtml(metodo)}</td><td class="num">${v.entro ? formatoMoneda(v.entro) : '—'}</td><td class="num">${v.salio ? formatoMoneda(v.salio) : '—'}</td><td class="num ${v.entro - v.salio < 0 ? 'texto-alerta' : ''}"><strong>${formatoMoneda(v.entro - v.salio)}</strong></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${formatoMoneda(total.entro)}</td><td class="num">${formatoMoneda(total.salio)}</td><td class="num">${formatoMoneda(total.entro - total.salio)}</td></tr></tfoot>
    </table>`;
}

function renderResumenConta() {
  const mount = document.getElementById('contabilidad-vista-resumen');
  const mes = mesSeleccionadoConta();
  const anio = CONTA_ANIO_CARGADO;
  const r = calcularPeriodoConta(mes);
  const periodo = mes == null ? `${anio}` : `${MESES[mes]} ${anio}`;
  const meses = MESES.map((_, m) => ({ m, ...calcularPeriodoConta(m) }));
  const total = calcularPeriodoConta(null);
  // En la tabla solo los meses con algún movimiento (y el elegido): 12 filas de "—" no dicen nada.
  const mesesConMovimiento = meses.filter((x) => x.pedidosPeriodo.length || x.cobrado || x.totalGastos || x.m === mes);
  const margen = porcentaje(r.gananciaBruta, r.ventasConCosto);
  const lineaTipo = (etiqueta, t) => (t.ventas ? `
    <div class="desglose-fila"><span>${etiqueta} <span class="celda-sub">vendido ${formatoMoneda(t.ventas)}${t.ventas - t.ventasConCosto > 0.009 ? ` · ${formatoMoneda(t.ventas - t.ventasConCosto)} sin costo` : ''}</span></span>
      <strong>${t.ventasConCosto ? `${formatoMoneda(t.ventasConCosto - t.costo)} <span class="celda-sub">ganancia (${porcentaje(t.ventasConCosto - t.costo, t.ventasConCosto)})</span>` : '<span class="celda-sub">sin costo</span>'}</strong></div>` : '');

  mount.innerHTML = `
    <div class="stat-grid conta-kpis">
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.ventas)}</div><div class="stat-label">Ventas · ${r.activos.length} pedido${r.activos.length === 1 ? '' : 's'}</div><div class="stat-sub">ticket promedio ${formatoMoneda(r.ticket)}</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.gananciaBruta)}</div><div class="stat-label">Ganancia bruta</div><div class="stat-sub">margen ${margen} sobre lo vendido</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.gastosNegocio)}</div><div class="stat-label">Gastos del negocio</div><div class="stat-sub">sin contar compras de mercadería</div></div>
      <div class="stat-card stat-destacado ${r.gananciaNeta < 0 ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(r.gananciaNeta)}</div><div class="stat-label">Ganancia neta</div><div class="stat-sub">lo que realmente ganaste en ${escapeHtml(periodo)}</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.cobrado)}</div><div class="stat-label">Cobrado</div><div class="stat-sub">plata que entró a caja</div></div>
      <button type="button" class="stat-card stat-click ${r.porCobrar ? 'warn' : ''}" data-ir-vista="cobrar"><div class="stat-value">${formatoMoneda(r.porCobrar)}</div><div class="stat-label">Por cobrar</div><div class="stat-sub">de los pedidos de ${escapeHtml(periodo)} · ver lista</div></button>
    </div>

    ${r.ventasSinCosto > 0.009 ? `
    <div class="conta-aviso">
      <strong>La ganancia está incompleta:</strong> ${formatoMoneda(r.ventasSinCosto)} de lo vendido (${porcentaje(r.ventasSinCosto, r.ventas)}) no tiene costo cargado, así que no entra en la ganancia.
      ${r.sinCosto.length ? `Los que más pesan: ${r.sinCosto.slice(0, 4).map(([n, v]) => `${escapeHtml(n)} (${formatoMoneda(v.monto)})`).join(', ')}.` : ''}
      <button type="button" class="btn-link-inline" data-ir-sin-costo>Cargar costos en Productos</button> — al guardar un costo, sus ventas pasadas se completan solas.
    </div>` : ''}

    <div class="dashboard-panels">
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>¿Cuánto ganaste? — ${escapeHtml(periodo)}</h3></div>
        <div class="resultado-fila"><span>Ventas${r.ventasSinCosto > 0.009 ? ' <span class="celda-sub">(con costo cargado)</span>' : ''}</span><strong>${formatoMoneda(r.ventasConCosto)}</strong></div>
        <div class="resultado-fila resta"><span>− Costo de lo vendido</span><strong>${formatoMoneda(r.costoVendido)}</strong></div>
        <div class="resultado-fila subtotal"><span>= Ganancia bruta <span class="celda-sub">margen ${margen}</span></span><strong>${formatoMoneda(r.gananciaBruta)}</strong></div>
        <div class="resultado-fila resta"><span>− Gastos del negocio</span><strong>${formatoMoneda(r.gastosNegocio)}</strong></div>
        ${r.porCategoriaNegocio.map(([c, v]) => `<div class="resultado-fila detalle"><span>${escapeHtml(c)}</span><span>${formatoMoneda(v.monto)}</span></div>`).join('')}
        <div class="resultado-fila total ${r.gananciaNeta < 0 ? 'negativo' : ''}"><span>= Ganancia neta</span><strong>${formatoMoneda(r.gananciaNeta)}</strong></div>
        <p class="form-hint" style="margin:10px 0 0;">Las compras de mercadería (${formatoMoneda(r.comprasMercaderia)}) no se restan acá: su costo ya está en el "costo de lo vendido" a medida que se vende.</p>
      </div>
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>¿Cuánta plata entró y salió? — ${escapeHtml(periodo)}</h3></div>
        <div class="resultado-fila"><span>Entró (pagos cobrados)</span><strong>${formatoMoneda(r.cobrado)}</strong></div>
        <div class="resultado-fila resta"><span>− Salió (todos los gastos, incluida mercadería)</span><strong>${formatoMoneda(r.totalGastos)}</strong></div>
        <div class="resultado-fila total ${r.cajaNeta < 0 ? 'negativo' : ''}"><span>= Movimiento de caja</span><strong>${formatoMoneda(r.cajaNeta)}</strong></div>
        <div class="admin-table-wrap" style="margin-top:12px;">${htmlTablaCaja(r.caja)}</div>
      </div>
    </div>

    <div class="dashboard-panel" style="margin-bottom:24px;">
      <div class="dashboard-panel-head"><h3>Mes a mes — ${anio}</h3></div>
      <div class="chart-canvas-wrap chart-canvas-wide"><canvas id="chart-contabilidad"></canvas></div>
    </div>

    <div class="admin-table-wrap" style="margin-bottom:24px;"><table class="data-table conta-tabla">
      <thead><tr><th>Mes</th><th class="num">Pedidos</th><th class="num">Ventas</th><th class="num">Ganancia bruta</th><th class="num">Gastos negocio</th><th class="num">Ganancia neta</th><th class="num">Cobrado</th><th class="num">Por cobrar</th></tr></thead>
      <tbody>
        ${mesesConMovimiento.map((x) => `
          <tr class="fila-mes ${mes === x.m ? 'fila-activa' : ''}" data-mes="${x.m}">
            <td>${MESES[x.m]}</td>
            <td class="num">${x.activos.length || '—'}</td>
            <td class="num">${x.ventas ? formatoMoneda(x.ventas) : '—'}</td>
            <td class="num">${x.ventasConCosto ? formatoMoneda(x.gananciaBruta) : '—'}</td>
            <td class="num">${x.gastosNegocio ? formatoMoneda(x.gastosNegocio) : '—'}</td>
            <td class="num ${x.gananciaNeta < 0 ? 'texto-alerta' : ''}">${x.ventas || x.gastosNegocio ? `<strong>${formatoMoneda(x.gananciaNeta)}</strong>` : '—'}</td>
            <td class="num">${x.cobrado ? formatoMoneda(x.cobrado) : '—'}</td>
            <td class="num">${x.porCobrar ? formatoMoneda(x.porCobrar) : '—'}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot><tr><td>Total ${anio}</td><td class="num">${total.activos.length}</td><td class="num">${formatoMoneda(total.ventas)}</td><td class="num">${formatoMoneda(total.gananciaBruta)}</td><td class="num">${formatoMoneda(total.gastosNegocio)}</td><td class="num">${formatoMoneda(total.gananciaNeta)}</td><td class="num">${formatoMoneda(total.cobrado)}</td><td class="num">${formatoMoneda(total.porCobrar)}</td></tr></tfoot>
    </table></div>
    <p class="form-hint" style="margin:-14px 0 24px;">Toca un mes para ver su detalle (se muestran solo los meses con movimiento). Los pedidos anulados no suman.</p>

    <div class="dashboard-panels">
      ${tablaDesglose(`Ventas por canal — ${escapeHtml(periodo)}`, r.porCanal, 'pedidos')}
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Qué se vendió y cuánto dejó — ${escapeHtml(periodo)}</h3></div>
        ${lineaTipo('Perfumes enteros', r.tipos.enteros)}
        ${lineaTipo('Decants', r.tipos.decants)}
        ${lineaTipo('Productos libres (encargos)', r.tipos.libres)}
        ${!r.ventas ? '<div class="admin-empty" style="padding:20px;">Sin ventas en este período.</div>' : ''}
        ${r.anulados.length ? `<div class="desglose-fila"><span class="texto-alerta">Pedidos anulados</span><strong>${r.anulados.length} · ${formatoMoneda(r.anulados.reduce((acc, p) => acc + Number(p.monto_total), 0))}</strong></div>` : ''}
      </div>
    </div>
    <div class="dashboard-panel" style="margin-bottom:24px;">
      <div class="dashboard-panel-head"><h3>Más vendidos — ${escapeHtml(periodo)}</h3></div>
      ${r.topProductos.length ? r.topProductos.map((p, i) => `<div class="desglose-fila"><span>${i + 1}. ${escapeHtml(p.nombre)} <span class="celda-sub">${p.unidades} und.</span></span><strong>${formatoMoneda(p.monto)} <span class="celda-sub">${p.conCosto ? `ganancia ${formatoMoneda(p.ganancia)}` : 'sin costo'}</span></strong></div>`).join('') : '<div class="admin-empty" style="padding:20px;">Sin ventas en este período.</div>'}
    </div>
  `;

  mount.querySelectorAll('.fila-mes').forEach((fila) => fila.addEventListener('click', () => {
    const sel = document.getElementById('contabilidad-mes');
    sel.value = sel.value === fila.dataset.mes ? '' : fila.dataset.mes;
    renderVistaContabilidad();
  }));
  mount.querySelector('[data-ir-vista="cobrar"]')?.addEventListener('click', () => cambiarVistaConta('cobrar'));
  mount.querySelector('[data-ir-sin-costo]')?.addEventListener('click', abrirProductosSinCosto);
  renderGraficoContabilidad(meses);
}

function abrirProductosSinCosto() {
  productosTipo = 'tienda';
  productosChip = 'sin-costo';
  const busqueda = document.getElementById('productos-busqueda');
  if (busqueda) busqueda.value = '';
  irASeccion('productos');
}

function renderGraficoContabilidad(meses) {
  const canvas = document.getElementById('chart-contabilidad');
  if (!canvas || !window.Chart) return;
  destruirGrafico('chart-contabilidad');
  const textoMuted = colorCss('--color-text-faint');
  const borde = colorCss('--color-border');
  GRAFICOS_DASHBOARD['chart-contabilidad'] = new Chart(canvas, {
    data: {
      labels: MESES.map((m) => m.slice(0, 3)),
      datasets: [
        { type: 'bar', label: 'Ventas', data: meses.map((x) => x.ventas), backgroundColor: 'rgba(188,186,194,0.7)', borderRadius: 3, maxBarThickness: 18, order: 3 },
        { type: 'bar', label: 'Gastos del negocio', data: meses.map((x) => x.gastosNegocio), backgroundColor: '#d29a3a', borderRadius: 3, maxBarThickness: 18, order: 4 },
        { type: 'line', label: 'Ganancia neta', data: meses.map((x) => x.gananciaNeta), borderColor: '#4f8c58', backgroundColor: '#4f8c58', tension: 0, pointRadius: 3, order: 1 },
        { type: 'line', label: 'Cobrado', data: meses.map((x) => x.cobrado), borderColor: '#7a2030', backgroundColor: '#7a2030', borderDash: [5, 4], tension: 0, pointRadius: 2, order: 2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: textoMuted, font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatoMoneda(ctx.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: textoMuted, font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: textoMuted, font: { size: 10 }, callback: (v) => `S/ ${v}` }, grid: { color: borde } },
      },
    },
  });
}

/* ---------- Ventas ---------- */

function gananciaPedido(p) {
  let costo = 0;
  let completo = true;
  (p.detalle_pedido || []).forEach((i) => {
    const c = costoLineaVenta(i);
    if (c == null) completo = false;
    else costo += c;
  });
  return { costo, completo, ganancia: Number(p.monto_total) - costo };
}

function renderVentasConta() {
  const mount = document.getElementById('contabilidad-vista-ventas');
  const mes = mesSeleccionadoConta();
  const r = calcularPeriodoConta(mes);
  const periodo = mes == null ? `${CONTA_ANIO_CARGADO}` : `${MESES[mes]} ${CONTA_ANIO_CARGADO}`;
  const pedidos = [...r.pedidosPeriodo].sort((a, b) => b.id - a.id);
  mount.innerHTML = `
    <div class="admin-toolbar">
      <span>${pedidos.length} pedido(s) en ${escapeHtml(periodo)} · Ventas ${formatoMoneda(r.ventas)} · Ganancia bruta ${formatoMoneda(r.gananciaBruta)} · Por cobrar ${formatoMoneda(r.porCobrar)}</span>
      <button class="btn btn-outline btn-sm" id="btn-exportar-ventas" style="margin-left:auto;">Exportar a Excel</button>
    </div>
    <div class="admin-table-wrap"><table class="data-table">
      <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Canal</th><th class="num">Total</th><th class="num">Ganancia</th><th class="num">Saldo</th><th>Estado</th></tr></thead>
      <tbody>
        ${pedidos.length ? pedidos.map((p) => {
          const g = gananciaPedido(p);
          return `
          <tr class="${p.cancelado ? 'fila-anulada' : ''} fila-click" data-id="${p.id}">
            <td>${fechaCortaEs(p.fecha_creacion)}</td>
            <td>#${p.id}</td>
            <td>${escapeHtml(p.cliente)}</td>
            <td>${escapeHtml(etiquetaCanal(p.canal))}</td>
            <td class="num">${formatoMoneda(p.monto_total)}</td>
            <td class="num">${p.cancelado ? '—' : g.completo ? formatoMoneda(g.ganancia) : `<span class="celda-sub" title="Hay productos sin costo cargado">sin costo</span>`}</td>
            <td class="num">${Number(p.monto_saldo_pendiente) && !p.cancelado ? `<strong class="texto-alerta">${formatoMoneda(p.monto_saldo_pendiente)}</strong>` : '—'}</td>
            <td>${p.cancelado ? '<span class="status-tag tag-anulado">Anulado</span>' : `<span class="status-tag ${claseEstadoPago(p.estado_pago)}">${escapeHtml(p.estado_pago)}</span>`}</td>
          </tr>`;
        }).join('') : '<tr><td colspan="8" class="admin-empty">Sin pedidos en este período.</td></tr>'}
      </tbody>
    </table></div>
  `;
  mount.querySelectorAll('.fila-click').forEach((fila) => fila.addEventListener('click', () => abrirDetallePedido(Number(fila.dataset.id))));
  document.getElementById('btn-exportar-ventas').addEventListener('click', () => exportarVentasExcel(pedidos, r, periodo));
}

function exportarVentasExcel(pedidos, r, periodo) {
  if (!window.XLSX) return mostrarToast('No cargó la librería de Excel — revisa tu conexión y recarga', 'error');
  const libro = XLSX.utils.book_new();
  const resumen = [
    { Concepto: 'Ventas', Monto: r.ventas },
    { Concepto: 'Ventas sin costo cargado', Monto: r.ventasSinCosto },
    { Concepto: 'Costo de lo vendido', Monto: r.costoVendido },
    { Concepto: 'Ganancia bruta', Monto: r.gananciaBruta },
    ...r.porCategoriaNegocio.map(([c, v]) => ({ Concepto: `Gasto: ${c}`, Monto: v.monto })),
    { Concepto: 'Gastos del negocio', Monto: r.gastosNegocio },
    { Concepto: 'Ganancia neta', Monto: r.gananciaNeta },
    { Concepto: 'Compras de mercadería', Monto: r.comprasMercaderia },
    { Concepto: 'Cobrado', Monto: r.cobrado },
    { Concepto: 'Movimiento de caja (cobrado − todos los gastos)', Monto: r.cajaNeta },
    { Concepto: 'Por cobrar', Monto: r.porCobrar },
  ].map((f) => ({ ...f, Monto: Number(f.Monto.toFixed(2)) }));
  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  hojaResumen['!cols'] = [{ wch: 46 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');
  const hojaVentas = XLSX.utils.json_to_sheet(sanitizarFilasExcel(pedidos.map((p) => {
    const g = gananciaPedido(p);
    return {
      Fecha: fechaCortaEs(p.fecha_creacion),
      'N° Pedido': p.id,
      Cliente: p.cliente,
      DNI: p.cliente_dni || '',
      Celular: p.cliente_telefono || '',
      Canal: etiquetaCanal(p.canal),
      Productos: (p.detalle_pedido || []).map((i) => `${i.cantidad}x ${i.perfumes ? `${i.perfumes.marca} ${i.perfumes.nombre}${i.perfumes.es_decant ? ` ${i.talla_ml}ml` : ''}` : i.descripcion_libre}`).join(' | '),
      Total: Number(p.monto_total),
      Costo: p.cancelado || !g.completo ? '' : Number(g.costo.toFixed(2)),
      Ganancia: p.cancelado || !g.completo ? '' : Number(g.ganancia.toFixed(2)),
      Pagado: Number(p.monto_adelanto_pagado),
      Saldo: Number(p.monto_saldo_pendiente),
      Estado: p.cancelado ? 'Anulado' : p.estado_pago,
    };
  })));
  hojaVentas['!cols'] = [{ wch: 11 }, { wch: 9 }, { wch: 24 }, { wch: 11 }, { wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 11 }];
  XLSX.utils.book_append_sheet(libro, hojaVentas, 'Ventas');
  const hojaPagos = XLSX.utils.json_to_sheet(r.pagosPeriodo.map((pg) => ({ Fecha: fechaCortaEs(pg.fecha_pago), 'N° Pedido': pg.id_pedido, Método: METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || '', Monto: Number(pg.monto) })));
  XLSX.utils.book_append_sheet(libro, hojaPagos, 'Cobros');
  const hojaGastos = XLSX.utils.json_to_sheet(sanitizarFilasExcel(r.gastosPeriodo.map((g) => ({ Fecha: fechaCortaEs(g.fecha), Categoría: g.categoria, Descripción: g.descripcion, Proveedor: g.proveedor || '', 'Pagado con': METODOS_PAGO_LABEL[g.metodo_pago] || g.metodo_pago || '', Monto: Number(g.monto) }))));
  XLSX.utils.book_append_sheet(libro, hojaGastos, 'Gastos');
  XLSX.writeFile(libro, `contabilidad-${periodo.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

/* ---------- Por cobrar ---------- */

let POR_COBRAR = [];
let porCobrarFiltro = 'todos';

function diasDesde(fecha) {
  const f = fechaDB(fecha);
  return f ? Math.max(0, Math.floor((Date.now() - f.getTime()) / 86400000)) : 0;
}

async function actualizarContadorPorCobrar() {
  try {
    POR_COBRAR = await obtenerCuentasPorCobrar();
    const el = document.getElementById('conta-count-cobrar');
    if (el) el.textContent = POR_COBRAR.length ? `(${POR_COBRAR.length})` : '';
  } catch { /* no es crítico */ }
}

async function cargarPorCobrar() {
  const mount = document.getElementById('contabilidad-vista-cobrar');
  if (!POR_COBRAR.length) mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    POR_COBRAR = await obtenerCuentasPorCobrar();
    document.getElementById('conta-count-cobrar').textContent = POR_COBRAR.length ? `(${POR_COBRAR.length})` : '';
    renderPorCobrar();
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

function mensajeCobro(p) {
  return `Hola ${primerNombre(p.cliente)}! Te escribimos de Maison Zadaca por tu pedido #${p.id} del ${fechaCortaEs(p.fecha_creacion)}: queda un saldo pendiente de ${formatoMoneda(p.monto_saldo_pendiente)}. Puedes pagarlo por Yape o Plin al ${formatoWhatsapp()} y enviarnos la captura por aquí. ¡Gracias!`;
}

function renderPorCobrar() {
  const mount = document.getElementById('contabilidad-vista-cobrar');
  const total = POR_COBRAR.reduce((acc, p) => acc + Number(p.monto_saldo_pendiente), 0);
  const filtros = [
    { id: 'todos', label: 'Todos', f: () => true },
    { id: '7', label: 'Más de 7 días', f: (p) => diasDesde(p.fecha_creacion) > 7 },
    { id: '30', label: 'Más de 30 días', f: (p) => diasDesde(p.fecha_creacion) > 30 },
  ];
  const filtro = filtros.find((f) => f.id === porCobrarFiltro) || filtros[0];
  const lista = POR_COBRAR.filter(filtro.f);
  const masAntiguo = POR_COBRAR.length ? diasDesde(POR_COBRAR[0].fecha_creacion) : 0;
  mount.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card ${total ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(total)}</div><div class="stat-label">Te deben en total</div></div>
      <div class="stat-card"><div class="stat-value">${POR_COBRAR.length}</div><div class="stat-label">Pedidos con saldo</div></div>
      <div class="stat-card"><div class="stat-value">${POR_COBRAR.length ? `${masAntiguo} día${masAntiguo === 1 ? '' : 's'}` : '—'}</div><div class="stat-label">El más antiguo</div></div>
    </div>
    <div class="chips-filtro">${filtros.map((f) => `<button type="button" class="chip-filtro${f.id === porCobrarFiltro ? ' activo' : ''}" data-filtro-cobrar="${f.id}">${f.label} <span class="n">${POR_COBRAR.filter(f.f).length}</span></button>`).join('')}</div>
    <div class="admin-table-wrap"><table class="data-table tabla-cobrar">
      <thead><tr><th>Pedido</th><th>Cliente</th><th class="num">Total</th><th class="num">Pagado</th><th class="num">Saldo</th><th></th></tr></thead>
      <tbody>
        ${lista.length ? lista.map((p) => {
          const dias = diasDesde(p.fecha_creacion);
          const wa = enlaceWhatsappCliente(p.telefono, mensajeCobro(p));
          return `
          <tr data-id="${p.id}">
            <td data-label="Pedido"><strong>#${p.id}</strong> <span class="celda-sub">${fechaCortaEs(p.fecha_creacion)}</span><div class="celda-sub ${dias > 30 ? 'texto-alerta' : ''}">hace ${dias} día${dias === 1 ? '' : 's'}</div></td>
            <td data-label="Cliente">${escapeHtml(p.cliente)}<div class="celda-sub">${escapeHtml(p.telefono || 'sin celular')}</div></td>
            <td class="num" data-label="Total">${formatoMoneda(p.monto_total)}</td>
            <td class="num" data-label="Pagado">${formatoMoneda(p.monto_adelanto_pagado)}</td>
            <td class="num" data-label="Saldo"><strong class="texto-alerta">${formatoMoneda(p.monto_saldo_pendiente)}</strong></td>
            <td class="acciones"><div class="row-actions">
              <button type="button" class="btn btn-primary btn-sm" data-accion="cobrar">Registrar pago</button>
              ${wa ? `<a class="btn btn-whatsapp btn-sm" href="${wa}" target="_blank" rel="noopener" title="Recordarle el saldo por WhatsApp">WhatsApp</a>` : ''}
              <button type="button" class="btn btn-ghost btn-sm" data-accion="ver">Ver</button>
            </div></td>
          </tr>`;
        }).join('') : `<tr><td colspan="6" class="admin-empty">${POR_COBRAR.length ? 'Nada con este filtro.' : '¡Nadie te debe! Todos los pedidos están pagados.'}</td></tr>`}
      </tbody>
    </table></div>
  `;
}

function manejarClickPorCobrar(e) {
  const chip = e.target.closest('[data-filtro-cobrar]');
  if (chip) { porCobrarFiltro = chip.dataset.filtroCobrar; renderPorCobrar(); return; }
  const boton = e.target.closest('[data-accion]');
  if (!boton) return;
  const p = POR_COBRAR.find((x) => x.id === Number(boton.closest('tr').dataset.id));
  if (!p) return;
  if (boton.dataset.accion === 'ver') abrirDetallePedido(p.id);
  if (boton.dataset.accion === 'cobrar') abrirModalCobro(p);
}

function abrirModalCobro(p) {
  const form = document.getElementById('form-cobro');
  form.reset();
  form.id_pedido.value = p.id;
  form.monto.value = Number(p.monto_saldo_pendiente).toFixed(2);
  form.monto.max = Number(p.monto_saldo_pendiente);
  document.getElementById('cobro-info').innerHTML = `Pedido <strong>#${p.id}</strong> de <strong>${escapeHtml(p.cliente)}</strong> · total ${formatoMoneda(p.monto_total)} · saldo <strong>${formatoMoneda(p.monto_saldo_pendiente)}</strong>`;
  abrirModal('modal-cobro');
  form.monto.focus();
}

async function guardarCobro(e) {
  e.preventDefault();
  const form = e.target;
  const id = Number(form.id_pedido.value);
  const p = POR_COBRAR.find((x) => x.id === id);
  const monto = Math.round(Number(form.monto.value) * 100) / 100;
  if (!(monto > 0)) return mostrarToast('Ingresa un monto válido', 'error');
  if (p && monto > Number(p.monto_saldo_pendiente) + 0.001) return mostrarToast(`El monto es mayor al saldo (${formatoMoneda(p.monto_saldo_pendiente)})`, 'error');
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await registrarPago(id, { monto, metodo_pago: form.metodo_pago.value, tipo_pago: p && monto >= Number(p.monto_saldo_pendiente) ? 'Saldo_Final' : 'Abono_Parcial' });
    cerrarModal('modal-cobro');
    mostrarToast(p && monto >= Number(p.monto_saldo_pendiente) ? `Pedido #${id} pagado por completo` : `Pago de ${formatoMoneda(monto)} registrado`);
    await cargarPorCobrar();
    CONTA_DATOS = await obtenerDatosContabilidad(CONTA_ANIO_CARGADO);
    actualizarBadgesNav();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

/* ---------- Caja del día ---------- */

let CAJA_FECHA = null;
let CAJA_DATOS = null;

function moverDiaCaja(delta) {
  const [a, m, d] = (CAJA_FECHA || fechaInputHoy()).split('-').map(Number);
  const f = new Date(a, m - 1, d + delta);
  CAJA_FECHA = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  cargarCaja();
}

function textoFechaCaja(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  const texto = new Date(a, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

async function cargarCaja() {
  if (!CAJA_FECHA) CAJA_FECHA = fechaInputHoy();
  document.getElementById('caja-fecha').value = CAJA_FECHA;
  const mount = document.getElementById('caja-contenido');
  mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    CAJA_DATOS = await obtenerCajaDelDia(CAJA_FECHA);
    renderCaja();
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

function renderCaja() {
  const { pagos, gastos, pedidos } = CAJA_DATOS;
  const mount = document.getElementById('caja-contenido');
  const entro = pagos.reduce((acc, pg) => acc + Number(pg.monto), 0);
  const salio = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  const ventas = pedidos.reduce((acc, p) => acc + Number(p.monto_total), 0);
  const hora = (f) => fechaDB(f)?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) || '';
  mount.innerHTML = `
    <p class="caja-fecha-texto">${escapeHtml(textoFechaCaja(CAJA_FECHA))}</p>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${formatoMoneda(ventas)}</div><div class="stat-label">Ventas del día · ${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'}</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(entro)}</div><div class="stat-label">Entró (cobros)</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(salio)}</div><div class="stat-label">Salió (gastos)</div></div>
      <div class="stat-card stat-destacado ${entro - salio < 0 ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(entro - salio)}</div><div class="stat-label">Neto del día</div></div>
    </div>
    <div class="dashboard-panel" style="margin-bottom:16px;">
      <div class="dashboard-panel-head"><h3>Por método de pago</h3></div>
      <p class="form-hint" style="margin:0 0 8px;">Para cuadrar: el "Neto" de Efectivo es lo que debería haber de más (o de menos) en la caja al cerrar; el de Yape/Plin, lo que debe verse en la app.</p>
      <div class="admin-table-wrap">${htmlTablaCaja(cajaPorMetodo(pagos, gastos))}</div>
    </div>
    <div class="dashboard-panels">
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Cobros del día</h3></div>
        ${pagos.length ? pagos.map((pg) => `<div class="desglose-fila"><span>${hora(pg.fecha_pago)} · Pedido #${pg.id_pedido} · ${escapeHtml(pg.cliente)} <span class="celda-sub">${escapeHtml(METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || '')}</span></span><strong>${formatoMoneda(pg.monto)}</strong></div>`).join('') : '<div class="admin-empty" style="padding:16px;">Sin cobros este día.</div>'}
      </div>
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Gastos del día</h3></div>
        ${gastos.length ? gastos.map((g) => `<div class="desglose-fila"><span>${escapeHtml(g.categoria)} · ${escapeHtml(g.descripcion)} <span class="celda-sub">${escapeHtml(METODOS_PAGO_LABEL[g.metodo_pago] || g.metodo_pago || 'sin método')}</span></span><strong>${formatoMoneda(g.monto)}</strong></div>`).join('') : '<div class="admin-empty" style="padding:16px;">Sin gastos este día.</div>'}
      </div>
    </div>
  `;
}

function imprimirCierreCaja() {
  if (!CAJA_DATOS) return;
  const { pagos, gastos, pedidos } = CAJA_DATOS;
  const entro = pagos.reduce((acc, pg) => acc + Number(pg.monto), 0);
  const salio = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  const ventas = pedidos.reduce((acc, p) => acc + Number(p.monto_total), 0);
  const ventana = window.open('', '_blank');
  if (!ventana) return mostrarToast('El navegador bloqueó la ventana de impresión — permite ventanas emergentes', 'error');
  const filasMetodo = cajaPorMetodo(pagos, gastos).map(([m, v]) => `<tr><td>${escapeHtml(m)}</td><td class="n">${formatoMoneda(v.entro)}</td><td class="n">${formatoMoneda(v.salio)}</td><td class="n"><b>${formatoMoneda(v.entro - v.salio)}</b></td><td></td></tr>`).join('');
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8" /><title>Cierre de caja — ${escapeHtml(CAJA_FECHA)}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111}h1{font-size:1.1rem;margin:0 0 2px}.meta{font-size:.8rem;color:#555;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:.82rem;margin-bottom:16px}th,td{border:1px solid #aaa;padding:6px 8px;text-align:left}th{background:#eee;font-size:.7rem;text-transform:uppercase}td.n{text-align:right}.tot{font-size:.95rem;margin:4px 0}.firma{margin-top:40px;display:flex;gap:40px}.firma div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:.75rem;text-align:center}</style>
  </head><body>
    <h1>Cierre de caja — Maison Zadaca</h1>
    <div class="meta">${escapeHtml(textoFechaCaja(CAJA_FECHA))} · impreso el ${new Date().toLocaleString('es-PE')}</div>
    <p class="tot">Ventas del día: <b>${formatoMoneda(ventas)}</b> (${pedidos.length} pedidos)</p>
    <p class="tot">Entró: <b>${formatoMoneda(entro)}</b> · Salió: <b>${formatoMoneda(salio)}</b> · Neto: <b>${formatoMoneda(entro - salio)}</b></p>
    <table><thead><tr><th>Método</th><th>Entró</th><th>Salió</th><th>Neto</th><th>Contado / verificado</th></tr></thead><tbody>${filasMetodo || '<tr><td colspan="5">Sin movimientos</td></tr>'}</tbody></table>
    <table><thead><tr><th>Cobros</th><th>Cliente</th><th>Método</th><th>Monto</th></tr></thead><tbody>${pagos.map((pg) => `<tr><td>Pedido #${pg.id_pedido}</td><td>${escapeHtml(pg.cliente)}</td><td>${escapeHtml(METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || '')}</td><td class="n">${formatoMoneda(pg.monto)}</td></tr>`).join('') || '<tr><td colspan="4">Sin cobros</td></tr>'}</tbody></table>
    <table><thead><tr><th>Gastos</th><th>Descripción</th><th>Método</th><th>Monto</th></tr></thead><tbody>${gastos.map((g) => `<tr><td>${escapeHtml(g.categoria)}</td><td>${escapeHtml(g.descripcion)}</td><td>${escapeHtml(METODOS_PAGO_LABEL[g.metodo_pago] || g.metodo_pago || '')}</td><td class="n">${formatoMoneda(g.monto)}</td></tr>`).join('') || '<tr><td colspan="4">Sin gastos</td></tr>'}</tbody></table>
    <div class="firma"><div>Entregó</div><div>Recibió</div></div>
    <script>window.onload = function () { window.print(); };<\/script>
  </body></html>`);
  ventana.document.close();
}

/* ---------- Gastos ---------- */

let gastosFiltroCategoria = '';

function renderGastosConta() {
  const mount = document.getElementById('gastos-contenido');
  const mes = mesSeleccionadoConta();
  const r = calcularPeriodoConta(mes);
  const periodo = mes == null ? `${CONTA_ANIO_CARGADO}` : `${MESES[mes]} ${CONTA_ANIO_CARGADO}`;
  const todos = [...r.gastosPeriodo].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
  const gastos = gastosFiltroCategoria ? todos.filter((g) => g.categoria === gastosFiltroCategoria) : todos;
  const categorias = r.porCategoria.map(([c, v]) => ({ c, n: v.cantidad }));
  // Sugerencias de proveedor (los ya usados) para escribirlos igual siempre.
  const proveedores = [...new Set(CONTA_DATOS.gastos.map((g) => g.proveedor).filter(Boolean))].sort();
  document.getElementById('lista-proveedores').innerHTML = proveedores.map((pv) => `<option value="${escapeHtml(pv)}"></option>`).join('');
  mount.innerHTML = `
    <div class="dashboard-panels">
      ${tablaDesglose(`Gastos por categoría — ${escapeHtml(periodo)}`, r.porCategoria, 'registros')}
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Total ${escapeHtml(periodo)}</h3></div>
        <div class="desglose-fila"><span>Gastos del negocio <span class="celda-sub">sin mercadería</span></span><strong>${formatoMoneda(r.gastosNegocio)}</strong></div>
        <div class="desglose-fila"><span>Compras de mercadería</span><strong>${formatoMoneda(r.comprasMercaderia)}</strong></div>
        <div class="desglose-fila"><span>Todo lo que salió</span><strong>${formatoMoneda(r.totalGastos)}</strong></div>
        <div class="desglose-fila"><span>Ganancia neta del período</span><strong class="${r.gananciaNeta < 0 ? 'texto-alerta' : ''}">${formatoMoneda(r.gananciaNeta)}</strong></div>
      </div>
    </div>
    ${categorias.length > 1 ? `<div class="chips-filtro"><button type="button" class="chip-filtro${!gastosFiltroCategoria ? ' activo' : ''}" data-cat="">Todas <span class="n">${todos.length}</span></button>${categorias.map(({ c, n }) => `<button type="button" class="chip-filtro${gastosFiltroCategoria === c ? ' activo' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)} <span class="n">${n}</span></button>`).join('')}</div>` : ''}
    <div class="admin-table-wrap"><table class="data-table tabla-gastos">
      <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Pagado con</th><th class="num">Monto</th><th></th></tr></thead>
      <tbody>
        ${gastos.length ? gastos.map((g) => `
          <tr data-id="${g.id}">
            <td data-label="Fecha">${fechaCortaEs(g.fecha)}</td>
            <td data-label="Categoría"><span class="status-tag">${escapeHtml(g.categoria)}</span></td>
            <td data-label="Descripción">${escapeHtml(g.descripcion)}${g.proveedor ? `<div class="celda-sub">${escapeHtml(g.proveedor)}</div>` : ''}${g.comprobante_path ? `<div><button type="button" class="btn-link-inline" data-accion="comprobante">Ver comprobante</button></div>` : ''}</td>
            <td data-label="Pagado con">${escapeHtml(METODOS_PAGO_LABEL[g.metodo_pago] || g.metodo_pago || '—')}</td>
            <td class="num" data-label="Monto"><strong>${formatoMoneda(g.monto)}</strong></td>
            <td class="acciones"><div class="row-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-accion="editar">Editar</button>
              <button type="button" class="btn btn-ghost btn-sm" data-accion="repetir" title="Copiar este gasto con fecha de hoy (ej. alquiler, sueldos)">Repetir</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icono-peligro" data-accion="eliminar" title="Eliminar" aria-label="Eliminar gasto">${ICONO_BORRAR}</button>
            </div></td>
          </tr>`).join('') : `<tr><td colspan="6" class="admin-empty">Sin gastos registrados en ${escapeHtml(periodo)}.</td></tr>`}
      </tbody>
    </table></div>
  `;
}

function gastoPorId(id) {
  return CONTA_DATOS?.gastos.find((g) => g.id === id);
}

async function manejarClickGastos(e) {
  const chip = e.target.closest('[data-cat]');
  if (chip) { gastosFiltroCategoria = chip.dataset.cat; renderGastosConta(); return; }
  const boton = e.target.closest('[data-accion]');
  if (!boton) return;
  const g = gastoPorId(Number(boton.closest('tr').dataset.id));
  if (!g) return;
  if (boton.dataset.accion === 'editar') llenarFormularioGasto(g, true);
  if (boton.dataset.accion === 'repetir') llenarFormularioGasto(g, false);
  if (boton.dataset.accion === 'comprobante') {
    try {
      window.open(await urlComprobanteGasto(g.comprobante_path), '_blank', 'noopener');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  }
  if (boton.dataset.accion === 'eliminar') {
    if (!confirm(`¿Eliminar el gasto "${g.descripcion}" de ${formatoMoneda(g.monto)}?`)) return;
    try {
      await eliminarGasto(g.id);
      await borrarComprobanteGasto(g.comprobante_path);
      mostrarToast('Gasto eliminado');
      cargarContabilidad();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  }
}

// editar=true: corrige ese mismo gasto. editar=false: "Repetir" (lo copia con fecha de hoy).
function llenarFormularioGasto(g, editar) {
  const form = document.getElementById('form-gasto');
  form.id.value = editar ? g.id : '';
  form.fecha.value = editar ? String(g.fecha).slice(0, 10) : fechaInputHoy();
  form.categoria.value = g.categoria;
  form.monto.value = Number(g.monto);
  form.descripcion.value = g.descripcion;
  form.metodo_pago.value = g.metodo_pago || '';
  form.proveedor.value = g.proveedor || '';
  document.getElementById('gasto-comprobante').value = '';
  document.getElementById('gasto-comprobante-nombre').textContent = editar && g.comprobante_path ? 'Ya tiene comprobante (elige otro para reemplazarlo)' : 'Boleta, factura o captura del pago';
  document.getElementById('gasto-form-titulo').textContent = editar ? `Editar gasto del ${fechaCortaEs(g.fecha)}` : 'Registrar gasto (copia)';
  document.getElementById('btn-guardar-gasto').textContent = editar ? 'Guardar cambios' : 'Guardar gasto';
  document.getElementById('btn-cancelar-edicion-gasto').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.monto.focus({ preventScroll: true });
}

function limpiarFormularioGasto() {
  const form = document.getElementById('form-gasto');
  const fecha = form.fecha.value;
  form.reset();
  form.id.value = '';
  form.fecha.value = fecha || fechaInputHoy();
  document.getElementById('gasto-comprobante-nombre').textContent = 'Boleta, factura o captura del pago';
  document.getElementById('gasto-form-titulo').textContent = 'Registrar gasto';
  document.getElementById('btn-guardar-gasto').textContent = 'Guardar gasto';
  document.getElementById('btn-cancelar-edicion-gasto').hidden = true;
}

async function guardarGasto(e) {
  e.preventDefault();
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form));
  const monto = Number(datos.monto);
  if (!monto || monto <= 0) return mostrarToast('Ingresa un monto válido', 'error');
  const id = datos.id ? Number(datos.id) : null;
  const anterior = id ? gastoPorId(id) : null;
  const archivo = document.getElementById('gasto-comprobante').files[0];
  const boton = document.getElementById('btn-guardar-gasto');
  boton.disabled = true;
  try {
    const gasto = {
      fecha: datos.fecha,
      categoria: datos.categoria,
      descripcion: datos.descripcion.trim(),
      monto,
      metodo_pago: datos.metodo_pago || null,
      proveedor: (datos.proveedor || '').trim() || null,
    };
    if (archivo) gasto.comprobante_path = await subirComprobanteGasto(archivo);
    if (id) await actualizarGasto(id, gasto);
    else await crearGasto(gasto);
    if (id && archivo && anterior?.comprobante_path) borrarComprobanteGasto(anterior.comprobante_path);
    mostrarToast(id ? 'Gasto actualizado' : 'Gasto registrado');
    limpiarFormularioGasto();
    const anioGasto = Number(String(datos.fecha).slice(0, 4));
    if (anioGasto !== Number(document.getElementById('contabilidad-anio').value)) {
      const sel = document.getElementById('contabilidad-anio');
      if ([...sel.options].some((o) => Number(o.value) === anioGasto)) sel.value = String(anioGasto);
    }
    cargarContabilidad();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

/* ---------- Contabilidad de consolidados (pestaña Consolidados) ---------- */

let CONTABILIDAD_CONSOLIDADO_ACTUAL = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contabilidad-select-consolidado')?.addEventListener('change', (e) => {
    CONTABILIDAD_CONSOLIDADO_ACTUAL = e.target.value || null;
    renderContabilidadConsolidado();
  });
});

async function cargarContabilidadConsolidados() {
  const select = document.getElementById('contabilidad-select-consolidado');
  try {
    const consolidados = await obtenerConsolidadosAdmin();
    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Selecciona una campaña…</option>' +
      consolidados.map((c) => `<option value="${c.id}">${escapeHtml(c.codigo_campana)} — ${ESTADOS_CONSOLIDADO_LABEL[c.estado] || c.estado}</option>`).join('');
    if (valorPrevio) select.value = valorPrevio;
  } catch (err) {
    document.getElementById('contabilidad-contenido').innerHTML = `<div class="admin-empty">${err.message}</div>`;
    return;
  }
  if (CONTABILIDAD_CONSOLIDADO_ACTUAL) renderContabilidadConsolidado();
}

async function renderContabilidadConsolidado() {
  const mount = document.getElementById('contabilidad-contenido');
  if (!CONTABILIDAD_CONSOLIDADO_ACTUAL) {
    mount.innerHTML = '<div class="admin-empty">Elige una campaña para ver su contabilidad.</div>';
    return;
  }
  mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const c = await obtenerContabilidadConsolidado(CONTABILIDAD_CONSOLIDADO_ACTUAL);
    mount.innerHTML = `
      <div class="stat-grid" style="margin-bottom:28px;">
        <div class="stat-card"><div class="stat-value">${c.unidadesTotales}</div><div class="stat-label">Unidades a Pedir</div></div>
        <div class="stat-card"><div class="stat-value">${formatoMoneda(c.costoTotalImportacion)}</div><div class="stat-label">Costo de Importación Estimado${c.lineasSinCosto ? ` (${c.lineasSinCosto} sin costo)` : ''}</div></div>
        <div class="stat-card"><div class="stat-value">${formatoMoneda(c.montoTotalReservado)}</div><div class="stat-label">Monto Reservado (venta)</div></div>
        <div class="stat-card ${c.montoPendienteCobro ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(c.montoCobrado)}</div><div class="stat-label">Cobrado de ${formatoMoneda(c.montoTotalPedidos)}</div></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <strong style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Perfumes a pedir al proveedor</strong>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${c.reservasSinConvertir > 0 ? `<button class="btn btn-primary btn-sm" id="btn-generar-pedidos">Generar Pedidos (${c.reservasSinConvertir} reservas sin convertir)</button>` : ''}
          ${c.pedidosGenerados > 0 ? `<button class="btn btn-outline btn-sm" id="btn-exportar-excel">Exportar a Excel</button>` : ''}
          ${c.unidadesTotales > 0 ? `<button class="btn btn-outline btn-sm" id="btn-imprimir-lista">Imprimir Lista de Clientes</button>` : ''}
        </div>
      </div>
      <div class="admin-table-wrap"><table class="data-table">
        <thead><tr><th>Perfume</th><th>Unidades</th><th>Costo unitario</th><th>Costo total</th><th>Venta esperada</th></tr></thead>
        <tbody>
          ${c.productos.length ? c.productos.map((p) => `
            <tr>
              <td>${p.es_libre ? `${escapeHtml(p.nombre)} <span class="canal-tag">Libre</span>` : `${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)} (${p.mililitros}ml)`}</td>
              <td>${p.unidades}</td>
              <td>${p.costo_importacion_pen != null ? formatoMoneda(p.costo_importacion_pen) : '—'}</td>
              <td>${formatoMoneda(p.costoTotal)}</td>
              <td>${formatoMoneda(p.montoEsperado)}</td>
            </tr>
          `).join('') : '<tr><td colspan="5" class="admin-empty">Sin reservas todavía.</td></tr>'}
        </tbody>
      </table></div>

      <p class="form-hint" style="margin-top:16px;">Los encargos que cotizas por WhatsApp se registran en Pedidos → <strong>+ Registrar Pedido</strong> → <strong>Encargo por consolidado</strong>, eligiendo esta campaña: suman acá solos (también los productos libres escritos a mano).${c.reservasSinConvertir > 0 ? ' Las reservas hechas desde la web se convierten en pedidos con "Generar Pedidos" al cerrar la campaña.' : ''}</p>
    `;

    document.getElementById('btn-generar-pedidos')?.addEventListener('click', async () => {
      if (!confirm(`¿Generar pedidos para las ${c.reservasSinConvertir} reservas de esta campaña? Cada cliente con reservas quedará con un pedido real y podrás cobrarle su saldo. Esta acción no se puede deshacer.`)) return;
      try {
        const creados = await generarPedidosDeConsolidado(CONTABILIDAD_CONSOLIDADO_ACTUAL);
        mostrarToast(`${creados} pedido(s) generado(s)`);
        renderContabilidadConsolidado();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    document.getElementById('btn-exportar-excel')?.addEventListener('click', async (e) => {
      const btn = e.target;
      btn.disabled = true;
      try {
        await exportarConsolidadoExcel(CONTABILIDAD_CONSOLIDADO_ACTUAL);
      } catch (err) {
        mostrarToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('btn-imprimir-lista')?.addEventListener('click', async (e) => {
      const btn = e.target;
      btn.disabled = true;
      try {
        const filas = await obtenerFilasImpresionConsolidado(CONTABILIDAD_CONSOLIDADO_ACTUAL);
        const nombreCampana = document.getElementById('contabilidad-select-consolidado').selectedOptions[0]?.text.split(' — ')[0] || `consolidado-${CONTABILIDAD_CONSOLIDADO_ACTUAL}`;
        imprimirListaConsolidado(filas, nombreCampana);
      } catch (err) {
        mostrarToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

// Abre una pestaña nueva con una tabla simple (blanco y negro, pensada para papel, no para
// verse en pantalla) con Nombre, DNI, celular, su pedido y si es recojo en tienda o envío por
// agencia — y dispara el diálogo de impresión del navegador apenas carga. Se arma en una
// ventana aparte (no en un <div> oculto de esta página) para no arrastrar el tema oscuro del
// panel admin ni su layout al papel.
function imprimirListaConsolidado(filas, nombreCampana) {
  if (!filas.length) { mostrarToast('No hay reservas ni pedidos para imprimir en esta campaña', 'error'); return; }
  const ventana = window.open('', '_blank');
  if (!ventana) { mostrarToast('El navegador bloqueó la ventana de impresión — permite pop-ups para este sitio', 'error'); return; }

  const filasHtml = filas.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(f.cliente)}</td>
      <td>${escapeHtml(f.dni)}</td>
      <td>${escapeHtml(f.celular)}</td>
      <td>${f.items.map(escapeHtml).join('<br>')}</td>
      <td>${escapeHtml(f.entrega)}</td>
      <td style="text-align:right;">${formatoMoneda(f.total)}</td>
    </tr>
  `).join('');

  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8" />
    <title>${escapeHtml(nombreCampana)} — Lista de clientes</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #111; }
      h1 { font-size: 1.15rem; margin: 0 0 4px; }
      .meta { font-size: 0.78rem; color: #555; margin-bottom: 22px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
      th, td { border: 1px solid #bbb; padding: 7px 9px; text-align: left; vertical-align: top; }
      th { background: #eee; text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.03em; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>
    <h1>${escapeHtml(nombreCampana)} — Lista de clientes</h1>
    <div class="meta">Generado el ${new Date().toLocaleString('es-PE')} &middot; ${filas.length} cliente(s)</div>
    <table>
      <thead><tr><th>#</th><th>Cliente</th><th>DNI</th><th>Celular</th><th>Pedido</th><th>Entrega</th><th>Total</th></tr></thead>
      <tbody>${filasHtml}</tbody>
    </table>
    <script>window.onload = function () { window.print(); };</script>
  </body></html>`);
  ventana.document.close();
}

// Excel/Sheets trata cualquier celda que empiece con =, +, - o @ como fórmula -- Cliente y
// Correo salen de texto libre que el cliente escribió al registrarse, así que sin este escape
// alguien podría meter una "fórmula" que se ejecute en la computadora del admin al abrir el
// .xlsx exportado (inyección de fórmulas, el equivalente a inyección CSV).
function sanitizarCeldaExcel(valor) {
  return typeof valor === 'string' && /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}
function sanitizarFilasExcel(filas) {
  return filas.map((fila) => Object.fromEntries(Object.entries(fila).map(([k, v]) => [k, sanitizarCeldaExcel(v)])));
}

async function exportarConsolidadoExcel(idConsolidado) {
  const filas = await obtenerFilasExportacionConsolidado(idConsolidado);
  if (!filas.length) { mostrarToast('No hay pedidos generados todavía para exportar', 'error'); return; }
  const nombreCampana = document.getElementById('contabilidad-select-consolidado').selectedOptions[0]?.text.split(' — ')[0] || `consolidado-${idConsolidado}`;
  const hoja = XLSX.utils.json_to_sheet(sanitizarFilasExcel(filas));
  hoja['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 13 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 9 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 13 }, { wch: 13 }, { wch: 11 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Pedidos');
  XLSX.writeFile(libro, `${nombreCampana}-pedidos.xlsx`);
}

/* ================= TODAS LAS RESERVAS ================= */

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('reservas-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarTodasLasReservas, 350); });
});

async function cargarTodasLasReservas() {
  const tbody = document.getElementById('reservas-tbody');
  const busqueda = document.getElementById('reservas-busqueda').value;
  try {
    const reservas = await obtenerTodasLasReservasAdmin({ busqueda });
    document.getElementById('reservas-resumen-producto').innerHTML = htmlResumenReservasPorProducto(reservas);
    tbody.innerHTML = reservas.length ? reservas.map((r) => {
      const mensaje = `Hola ${primerNombre(r.cliente)}! Confirmamos tu reserva en la campaña ${r.campana || ''}: ${r.cantidad} x ${r.producto} a ${formatoMoneda(r.precio_consolidado_aplicado)} c/u (total ${formatoMoneda(r.cantidad * r.precio_consolidado_aplicado)}). Te avisamos apenas cierre la campaña para coordinar el pago.`;
      const enlaceWa = enlaceWhatsappCliente(r.telefono_cliente, mensaje);
      return `
      <tr data-id="${r.id}"${r.estado_item === 'Pendiente_Aprobacion' ? ' style="background:rgba(122,32,48,0.08);"' : ''}>
        <td>${escapeHtml(r.cliente)}</td>
        <td>${escapeHtml(r.producto)}</td>
        <td><a href="${SITE_ROOT}consolidado/?id=${r.id_consolidado}" target="_blank" style="color:var(--color-gold)">${escapeHtml(r.campana || '—')}</a></td>
        <td>${r.cantidad}</td>
        <td>${formatoMoneda(r.precio_consolidado_aplicado)}</td>
        <td><select class="status-select select-estado-reserva-global" ${r.estado_item === 'Convertido_A_Pedido' ? 'disabled title="Ya se generó un pedido para esta reserva -- revertirla crearía un pedido duplicado al volver a generar pedidos"' : ''}>${ESTADOS_RESERVA.map((e) => `<option value="${e}" ${r.estado_item === e ? 'selected' : ''}>${e}</option>`).join('')}</select></td>
        <td><span class="status-tag">${escapeHtml(r.estado_consolidado || '')}</span></td>
        <td>${enlaceWa ? `<a class="btn btn-whatsapp btn-sm" href="${enlaceWa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</td>
      </tr>
    `;
    }).join('') : '<tr><td colspan="8" class="admin-empty">Sin reservas.</td></tr>';

    tbody.querySelectorAll('.select-estado-reserva-global').forEach((sel) => {
      const valorOriginal = sel.value;
      sel.addEventListener('change', async () => {
        const id = Number(sel.closest('tr').dataset.id);
        try {
          await actualizarEstadoReserva(id, sel.value);
          mostrarToast('Reserva actualizada');
        } catch (err) {
          mostrarToast(err.message, 'error');
          sel.value = valorOriginal;
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">${err.message}</td></tr>`;
  }
}

/* ================= CLIENTES ================= */

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('clientes-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarClientes, 350); });
});

async function cargarClientes() {
  const tbody = document.getElementById('clientes-tbody');
  const busqueda = document.getElementById('clientes-busqueda').value;
  try {
    const clientes = await obtenerClientesAdmin({ busqueda });
    tbody.innerHTML = clientes.length ? clientes.map((c) => `
      <tr data-id="${c.id}">
        <td>${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</td>
        <td>${escapeHtml(c.correo || '—')}</td>
        <td>${escapeHtml(c.dni_ce_ruc || '—')}</td>
        <td>${escapeHtml(c.telefono || '—')}</td>
        <td>${new Date(c.fecha_registro).toLocaleDateString('es-PE')}</td>
        <td>
          <span class="status-tag" style="${c.rol === 'Admin' ? '' : 'opacity:.5;'}">${escapeHtml(c.rol)}</span>
          <button class="btn btn-ghost btn-sm btn-cambiar-rol" data-rol-actual="${c.rol}" ${c.id === PERFIL_ADMIN?.id ? 'disabled title="No puedes cambiar tu propio rol desde acá"' : ''}>
            ${c.rol === 'Admin' ? 'Quitar Admin' : 'Hacer Admin'}
          </button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="admin-empty">Sin clientes.</td></tr>';

    tbody.querySelectorAll('.btn-cambiar-rol').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const fila = btn.closest('tr');
        const id = fila.dataset.id;
        const rolActual = btn.dataset.rolActual;
        const nuevoRol = rolActual === 'Admin' ? 'Cliente' : 'Admin';
        const nombre = fila.querySelector('td').textContent.trim();
        if (!confirm(`¿${nuevoRol === 'Admin' ? 'Dar permisos de Admin a' : 'Quitarle Admin a'} ${nombre}?`)) return;
        try {
          await cambiarRolCliente(id, nuevoRol);
          mostrarToast('Rol actualizado');
          cargarClientes();
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">${err.message}</td></tr>`;
  }
}

/* ================= LIBRO DE RECLAMACIONES ================= */

// Plazo legal: 15 días hábiles contados desde el día siguiente al registro (DS 101-2022-PCM).
// Se cuentan solo sábados y domingos como no hábiles -- los feriados no se descuentan, así la
// fecha límite que se muestra nunca es más tarde que la real (conservadora).
let reclamosFiltro = 'pendientes';
let RECLAMOS = [];

function sumarDiasHabiles(fecha, dias) {
  const f = new Date(fecha);
  let contados = 0;
  while (contados < dias) {
    f.setDate(f.getDate() + 1);
    if (f.getDay() !== 0 && f.getDay() !== 6) contados += 1;
  }
  return f;
}

function plazoReclamo(r) {
  const limite = sumarDiasHabiles(fechaDB(r.fecha_registro), 15);
  limite.setHours(23, 59, 59, 0);
  const diasRestantes = Math.ceil((limite - new Date()) / 86400000);
  return { limite, diasRestantes };
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#reclamos-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#reclamos-tabs .admin-tab').forEach((t) => t.classList.toggle('active', t === tab));
      reclamosFiltro = tab.dataset.estado;
      cargarReclamos();
    });
  });
  document.getElementById('btn-cerrar-reclamo')?.addEventListener('click', () => cerrarModal('modal-reclamo'));
  document.getElementById('form-reclamo-respuesta')?.addEventListener('submit', guardarRespuestaReclamo);
  document.querySelector('#form-reclamo-respuesta [name="respuesta"]')?.addEventListener('input', actualizarEnlaceCorreoReclamo);
});

async function cargarReclamos() {
  const tbody = document.getElementById('reclamos-tbody');
  try {
    const todos = await obtenerReclamosAdmin();
    RECLAMOS = reclamosFiltro === 'pendientes' ? todos.filter((r) => r.estado !== 'Respondido') : todos;
    tbody.innerHTML = RECLAMOS.length ? RECLAMOS.map((r) => {
      const { limite, diasRestantes } = plazoReclamo(r);
      const plazo = r.estado === 'Respondido'
        ? `<span class="celda-sub">Respondido ${r.fecha_respuesta ? fechaCortaEs(r.fecha_respuesta) : ''}</span>`
        : `<span class="${diasRestantes <= 3 ? 'texto-alerta' : ''}">${diasRestantes >= 0 ? `Vence el ${limite.toLocaleDateString('es-PE')}` : 'PLAZO VENCIDO'}</span><br><span class="celda-sub">${diasRestantes >= 0 ? `faltan ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} calendario` : `venció el ${limite.toLocaleDateString('es-PE')}`}</span>`;
      return `
        <tr data-id="${r.id}">
          <td><strong style="color:var(--color-text);">${escapeHtml(r.numero)}</strong><br><span class="celda-sub">${fechaHoraEs(r.fecha_registro)}</span></td>
          <td><span class="status-tag">${escapeHtml(r.tipo)}</span></td>
          <td>${escapeHtml(r.consumidor_nombre)}<br><span class="celda-sub">${escapeHtml(r.consumidor_documento_tipo)} ${escapeHtml(r.consumidor_documento)}</span></td>
          <td>${escapeHtml(r.bien_descripcion).slice(0, 80)}${r.monto_reclamado != null ? `<br><span class="celda-sub">${formatoMoneda(r.monto_reclamado)}</span>` : ''}</td>
          <td><span class="status-tag ${r.estado === 'Respondido' ? 'pago-completado' : 'pago-pendiente'}">${escapeHtml(r.estado.replace('_', ' '))}</span></td>
          <td>${plazo}</td>
          <td><button class="btn btn-ghost btn-sm btn-ver-reclamo">Ver / responder</button></td>
        </tr>`;
    }).join('') : `<tr><td colspan="7" class="admin-empty">${reclamosFiltro === 'pendientes' ? 'No hay reclamos por responder.' : 'Todavía no se registró ninguna hoja.'}</td></tr>`;
    tbody.querySelectorAll('.btn-ver-reclamo').forEach((btn) => btn.addEventListener('click', () => abrirReclamo(Number(btn.closest('tr').dataset.id))));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

let RECLAMO_ACTUAL = null;

async function abrirReclamo(id) {
  const r = RECLAMOS.find((x) => x.id === id);
  if (!r) return;
  RECLAMO_ACTUAL = r;
  const cfg = await configuracionSitioParaImprimir();
  const { limite, diasRestantes } = plazoReclamo(r);
  document.getElementById('modal-reclamo-titulo').textContent = `${r.tipo} ${r.numero}`;
  document.getElementById('modal-reclamo-contenido').innerHTML = `
    ${r.estado !== 'Respondido' ? `<div class="alert ${diasRestantes <= 3 ? 'alert-error' : 'alert-success'}">Responder hasta el ${limite.toLocaleDateString('es-PE', { dateStyle: 'long' })} (${diasRestantes >= 0 ? `quedan ${diasRestantes} días` : 'plazo vencido'}). El consumidor pidió respuesta por ${r.respuesta_por === 'Domicilio' ? 'carta a su domicilio' : 'correo electrónico'}.</div>` : ''}
    <div class="hoja-reclamo-admin">${htmlHojaReclamacion(r, cfg)}</div>
  `;
  const form = document.getElementById('form-reclamo-respuesta');
  form.id.value = r.id;
  form.respuesta.value = r.respuesta || '';
  form.estado.value = r.estado === 'Pendiente' ? 'Respondido' : r.estado;
  actualizarEnlaceCorreoReclamo();
  document.getElementById('btn-imprimir-reclamo').onclick = () => imprimirHojaReclamacion({ ...r, respuesta: form.respuesta.value || r.respuesta }, cfg);
  abrirModal('modal-reclamo');
}

function actualizarEnlaceCorreoReclamo() {
  const r = RECLAMO_ACTUAL;
  const enlace = document.getElementById('btn-reclamo-correo');
  if (!r || !enlace) return;
  const respuesta = document.querySelector('#form-reclamo-respuesta [name="respuesta"]').value.trim();
  const cuerpo = `Estimado(a) ${r.consumidor_nombre}:\n\nEn atención a su ${r.tipo.toLowerCase()} N° ${r.numero} registrado el ${fechaCortaEs(r.fecha_registro)} en nuestro Libro de Reclamaciones, le informamos:\n\n${respuesta || '[escribe aquí la respuesta]'}\n\nAtentamente,\nMaison Zadaca`;
  enlace.href = `mailto:${encodeURIComponent(r.consumidor_correo)}?subject=${encodeURIComponent(`Respuesta a su ${r.tipo.toLowerCase()} N° ${r.numero} — Maison Zadaca`)}&body=${encodeURIComponent(cuerpo)}`;
}

async function guardarRespuestaReclamo(e) {
  e.preventDefault();
  const form = e.target;
  try {
    await responderReclamoAdmin(Number(form.id.value), { respuesta: form.respuesta.value.trim(), estado: form.estado.value });
    mostrarToast('Respuesta guardada');
    cerrarModal('modal-reclamo');
    cargarReclamos();
    actualizarBadgesNav();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ================= RESEÑAS ================= */

let resenasFiltro = 'pendientes';
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#resenas-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#resenas-tabs .admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      resenasFiltro = tab.dataset.filtro;
      cargarResenas();
    });
  });
});

async function cargarResenas() {
  const mount = document.getElementById('resenas-lista');
  try {
    const resenas = await obtenerResenasAdmin({ soloPendientes: resenasFiltro === 'pendientes' });
    mount.innerHTML = resenas.length ? resenas.map((r) => `
      <div class="admin-card" data-id="${r.id}" style="margin-bottom:12px;">
        <div class="admin-card-top" style="justify-content:space-between; align-items:flex-start;">
          <div>
            <span class="admin-card-sub">${escapeHtml(r.cliente)} &middot; ${escapeHtml(r.producto)}</span>
            <div class="stars" style="margin:4px 0;">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
            <p style="font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(r.comentario || '')}</p>
          </div>
          ${r.aprobado ? '<span class="status-tag">Publicada</span>' : '<span class="status-tag" style="background:rgba(196,106,95,0.15); color:var(--color-danger);">Pendiente</span>'}
        </div>
        <div class="admin-card-actions">
          ${!r.aprobado ? '<button class="btn btn-outline btn-sm btn-aprobar-resena">Aprobar</button>' : ''}
          <button class="btn btn-danger btn-sm btn-eliminar-resena">Eliminar</button>
        </div>
      </div>
    `).join('') : '<div class="admin-empty">No hay reseñas.</div>';

    mount.querySelectorAll('.btn-aprobar-resena').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('.admin-card').dataset.id);
        try { await aprobarResena(id); mostrarToast('Reseña aprobada'); cargarResenas(); actualizarBadgesNav(); } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
    mount.querySelectorAll('.btn-eliminar-resena').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta reseña?')) return;
        const id = Number(btn.closest('.admin-card').dataset.id);
        try { await eliminarResena(id); mostrarToast('Reseña eliminada'); cargarResenas(); actualizarBadgesNav(); } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

/* ================= PREGUNTAS FRECUENTES ================= */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-nueva-faq')?.addEventListener('click', () => abrirModalFAQ());
  document.getElementById('btn-cancelar-faq')?.addEventListener('click', () => cerrarModal('modal-faq'));
  document.getElementById('form-faq')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    delete data.id;
    data.orden = Number(data.orden || 0);
    data.activo = e.target.elements.activo.checked;
    try {
      if (id) await actualizarFAQ(Number(id), data);
      else await crearFAQ(data);
      mostrarToast('Pregunta guardada');
      cerrarModal('modal-faq');
      cargarFAQ();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

function abrirModalFAQ(f) {
  const form = document.getElementById('form-faq');
  form.reset();
  document.getElementById('modal-faq-titulo').textContent = f ? 'Editar Pregunta' : 'Agregar Pregunta';
  form.id.value = f?.id || '';
  form.pregunta.value = f?.pregunta || '';
  form.respuesta.value = f?.respuesta || '';
  form.orden.value = f?.orden ?? 0;
  form.elements.activo.checked = f ? f.activo : true;
  abrirModal('modal-faq');
}

async function cargarFAQ() {
  const mount = document.getElementById('faq-lista-admin');
  try {
    const preguntas = await obtenerFAQAdmin();
    mount.innerHTML = preguntas.length ? preguntas.map((f) => `
      <div class="admin-card" data-id="${f.id}" style="margin-bottom:12px;">
        <div class="admin-card-top" style="justify-content:space-between; align-items:flex-start;">
          <div>
            <span class="admin-card-sub">Orden ${f.orden}${f.activo ? '' : ' · Oculta'}</span>
            <h3 class="admin-card-title" style="font-size:0.95rem;">${escapeHtml(f.pregunta)}</h3>
            <p style="font-size:0.85rem; color:var(--color-text-muted);">${f.respuesta}</p>
          </div>
        </div>
        <div class="admin-card-actions">
          <button class="btn btn-outline btn-sm btn-editar-faq">Editar</button>
          <button class="btn btn-danger btn-sm btn-eliminar-faq">Eliminar</button>
        </div>
      </div>
    `).join('') : '<div class="admin-empty">No hay preguntas cargadas.</div>';

    mount.querySelectorAll('.btn-editar-faq').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('.admin-card').dataset.id);
        abrirModalFAQ(preguntas.find((f) => f.id === id));
      });
    });
    mount.querySelectorAll('.btn-eliminar-faq').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta pregunta?')) return;
        const id = Number(btn.closest('.admin-card').dataset.id);
        try { await eliminarFAQ(id); mostrarToast('Pregunta eliminada'); cargarFAQ(); } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

/* ================= CONFIGURACIÓN DEL SITIO ================= */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-configuracion')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.consolidado_minimo_unidades = Number(data.consolidado_minimo_unidades);
    // Opcionales: vacío = null (el RUC vacío no pasaría el formato de 11 dígitos de la base).
    ['instagram_url', 'tiktok_url', 'tiktok_url_2', 'facebook_url', 'razon_social', 'ruc', 'domicilio_fiscal', 'correo_legal', 'responsable_datos'].forEach((campo) => {
      data[campo] = (data[campo] || '').trim() || null;
    });
    // Obligatorios en la base: si se dejan vacíos vuelven a su valor por defecto.
    if (!data.nombre_comercial?.trim()) data.nombre_comercial = 'Maison Zadaca';
    if (!data.telefono_contacto?.trim()) data.telefono_contacto = '+51 990 278 017';
    if (!data.region_servidores?.trim()) data.region_servidores = 'Estados Unidos / Brasil (Supabase, Inc.)';
    if (!data.politicas_actualizadas_el) data.politicas_actualizadas_el = fechaInputHoy();
    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await actualizarConfiguracionSitio(data);
      CONFIG_SITIO_CACHE = null;
      mostrarToast('Configuración guardada');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
});

async function cargarConfiguracion() {
  const form = document.getElementById('form-configuracion');
  try {
    const cfg = await obtenerConfiguracionSitioAdmin();
    Object.keys(cfg).forEach((campo) => {
      if (form.elements[campo]) form.elements[campo].value = cfg[campo] ?? '';
    });
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ================= PUBLICIDAD (anuncio al entrar a la página) ================= */

// Fotos del anuncio en el orden en que se muestran (la primera es la portada). Se suben al
// Storage apenas se eligen (ver subirImagen en admin-api.js) y se guardan como lista de URLs.
let PUBLI_FOTOS = [];
// Fotos tal como están guardadas en el anuncio publicado. Una foto quitada con la × se borra del
// Storage recién al guardar: si se borrara al instante y no se guarda, el anuncio publicado
// quedaría apuntando a una foto que ya no existe.
let PUBLI_FOTOS_GUARDADAS = [];

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-publicidad');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = datosFormularioPublicidad();
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await actualizarPublicidad(data);
      const quitadas = PUBLI_FOTOS_GUARDADAS.filter((u) => !data.imagenes.includes(u));
      PUBLI_FOTOS_GUARDADAS = [...data.imagenes];
      quitadas.forEach((u) => borrarImagenSubida(u));
      mostrarToast(data.activo ? 'Anuncio guardado y activo' : 'Anuncio guardado (está desactivado)');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
  document.getElementById('publi-archivo').addEventListener('change', async (e) => {
    const archivos = [...e.target.files];
    e.target.value = '';
    await subirFotosPublicidad(archivos);
  });
  document.getElementById('publi-url-agregar').addEventListener('click', () => {
    const input = document.getElementById('publi-url');
    const url = input.value.trim();
    if (!url) return;
    if (!urlSegura(url)) { mostrarToast('Ese link no es válido: usa https://... o una ruta como assets/img/...', 'error'); return; }
    if (PUBLI_FOTOS.length >= 8) { mostrarToast('Máximo 8 fotos por anuncio', 'error'); return; }
    PUBLI_FOTOS.push(url);
    input.value = '';
    renderFotosPublicidad();
  });
  document.getElementById('publi-fotos').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const i = Number(btn.closest('.publi-foto').dataset.i);
    if (btn.dataset.accion === 'quitar') {
      const [quitada] = PUBLI_FOTOS.splice(i, 1);
      // Una foto que nunca se guardó en el anuncio se puede borrar ya; la guardada, al guardar.
      if (!PUBLI_FOTOS_GUARDADAS.includes(quitada) && !PUBLI_FOTOS.includes(quitada)) borrarImagenSubida(quitada);
    }
    if (btn.dataset.accion === 'izq' && i > 0) [PUBLI_FOTOS[i - 1], PUBLI_FOTOS[i]] = [PUBLI_FOTOS[i], PUBLI_FOTOS[i - 1]];
    if (btn.dataset.accion === 'der' && i < PUBLI_FOTOS.length - 1) [PUBLI_FOTOS[i + 1], PUBLI_FOTOS[i]] = [PUBLI_FOTOS[i], PUBLI_FOTOS[i + 1]];
    renderFotosPublicidad();
  });
  document.getElementById('btn-vista-previa-publi').addEventListener('click', () => {
    const data = datosFormularioPublicidad();
    if (!data.titulo && !data.mensaje && !data.imagenes.length) { mostrarToast('Agrega al menos un título, una descripción o una foto', 'error'); return; }
    mostrarPublicidadPopup(data);
  });
});

function datosFormularioPublicidad() {
  const form = document.getElementById('form-publicidad');
  const data = Object.fromEntries(new FormData(form));
  data.activo = form.elements.activo.checked;
  data.fecha_inicio = data.fecha_inicio ? new Date(data.fecha_inicio).toISOString() : null;
  data.fecha_fin = data.fecha_fin ? new Date(data.fecha_fin).toISOString() : null;
  ['titulo', 'mensaje', 'texto_boton', 'url_boton'].forEach((campo) => { data[campo] = (data[campo] || '').trim() || null; });
  data.imagenes = [...PUBLI_FOTOS];
  // imagen_url (la foto única de antes) queda con la portada, por compatibilidad. Si la portada
  // está guardada como texto no se repite ahí (pesaría el doble).
  data.imagen_url = PUBLI_FOTOS[0] && !PUBLI_FOTOS[0].startsWith('data:') ? PUBLI_FOTOS[0] : null;
  data.mostrar_en = data.mostrar_en === 'inicio' ? 'inicio' : 'todas';
  return data;
}

async function subirFotosPublicidad(archivos) {
  const estado = document.getElementById('publi-subiendo');
  const espacio = 8 - PUBLI_FOTOS.length;
  if (espacio <= 0) { mostrarToast('Máximo 8 fotos por anuncio', 'error'); return; }
  const lote = archivos.slice(0, espacio);
  if (archivos.length > espacio) mostrarToast(`Solo se agregaron ${espacio} foto${espacio === 1 ? '' : 's'} (máximo 8)`, 'error');
  for (let i = 0; i < lote.length; i++) {
    estado.textContent = `Preparando foto ${i + 1} de ${lote.length}…`;
    try {
      // Como en MICHT: la foto queda guardada dentro del anuncio (sin link que bloquear). Solo si
      // ni achicada entra (un GIF muy pesado, por ejemplo) se sube al Storage.
      const texto = await fotoAnuncioComoTexto(lote[i]);
      if (texto) {
        const pesoActual = PUBLI_FOTOS.filter((u) => u.startsWith('data:')).reduce((s, u) => s + u.length, 0);
        if (pesoActual + texto.length > FOTOS_ANUNCIO_MAX_TEXTO) {
          mostrarToast('Ya no entran más fotos en el anuncio: quita alguna o usa menos fotos.', 'error');
          break;
        }
        PUBLI_FOTOS.push(texto);
        if (lote[i].type === 'image/gif' && !texto.startsWith('data:image/gif')) mostrarToast('El GIF pesaba mucho: se guardó como imagen fija (sin animación).');
      } else {
        PUBLI_FOTOS.push(await subirImagen(lote[i], CARPETA_FOTOS_ANUNCIO));
      }
      renderFotosPublicidad();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  }
  estado.textContent = lote.length ? 'Listo. No olvides "Guardar Publicidad".' : '';
}

function renderFotosPublicidad() {
  const mount = document.getElementById('publi-fotos');
  if (!PUBLI_FOTOS.length) { mount.innerHTML = '<p class="form-hint" style="margin:0 0 8px;">Todavía no hay fotos.</p>'; return; }
  mount.innerHTML = PUBLI_FOTOS.map((url, i) => `
    <div class="publi-foto" data-i="${i}">
      <img src="${escapeHtml(fuenteImagenSegura(url) || '')}" alt="Foto ${i + 1}" onerror="fotoPublicidadNoCarga(this)" />
      <span class="publi-foto-aviso" role="status"></span>
      ${i === 0 ? '<span class="publi-portada">Portada</span>' : ''}
      <div class="publi-foto-acciones">
        <button type="button" data-accion="izq" title="Mover a la izquierda" ${i === 0 ? 'disabled' : ''}>&#8249;</button>
        <button type="button" data-accion="quitar" title="Quitar foto">&times;</button>
        <button type="button" data-accion="der" title="Mover a la derecha" ${i === PUBLI_FOTOS.length - 1 ? 'disabled' : ''}>&#8250;</button>
      </div>
    </div>`).join('');
}

// Miniatura que no carga: se averigua si la foto existe (entonces es este navegador el que no la
// muestra, casi siempre un bloqueador de anuncios, y NO hay que quitarla) o si de verdad falta.
async function fotoPublicidadNoCarga(img) {
  const caja = img.closest('.publi-foto');
  if (!caja || caja.dataset.revisada) return;
  caja.dataset.revisada = '1';
  caja.classList.add('publi-foto-error');
  const aviso = caja.querySelector('.publi-foto-aviso');
  aviso.textContent = 'Revisando la foto…';
  const estado = await estadoFotoStorage(img.src);
  if (estado === 'existe') {
    caja.classList.add('publi-foto-bloqueada');
    aviso.textContent = 'Foto guardada bien. Tu navegador no la muestra (¿bloqueador de anuncios?). No la quites.';
  } else if (estado === 'no-existe') {
    aviso.textContent = 'Esta foto ya no existe: quítala y súbela de nuevo.';
  } else if (estado === 'sin-comprobar') {
    caja.classList.add('publi-foto-bloqueada');
    aviso.textContent = 'No se pudo revisar la foto. Si usas un bloqueador de anuncios, desactívalo aquí y recarga.';
  } else {
    aviso.textContent = 'No se pudo mostrar esta foto: revisa el link o súbela de nuevo.';
  }
}

async function cargarPublicidad() {
  const form = document.getElementById('form-publicidad');
  try {
    const p = await obtenerPublicidadAdmin();
    form.elements.activo.checked = p.activo;
    form.titulo.value = p.titulo || '';
    form.mensaje.value = p.mensaje || '';
    form.texto_boton.value = p.texto_boton || '';
    form.url_boton.value = p.url_boton || '';
    form.mostrar_en.value = p.mostrar_en === 'inicio' ? 'inicio' : 'todas';
    // datetime-local espera "YYYY-MM-DDTHH:mm" -- el timestamp de Postgres viene con segundos
    // y offset, se recorta a los primeros 16 caracteres tal como hace cuenta.js con fechas.
    form.fecha_inicio.value = p.fecha_inicio ? p.fecha_inicio.slice(0, 16) : '';
    form.fecha_fin.value = p.fecha_fin ? p.fecha_fin.slice(0, 16) : '';
    PUBLI_FOTOS = imagenesPublicidad(p);
    PUBLI_FOTOS_GUARDADAS = [...PUBLI_FOTOS];
    renderFotosPublicidad();
    rescatarFotosAnuncio([...PUBLI_FOTOS]);
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

// Las fotos subidas antes a la carpeta "publicidad/" no se veían con bloqueador de anuncios (ver
// CARPETA_FOTOS_ANUNCIO): se copian solas a la carpeta nueva y se guardan en el anuncio, sin
// tener que volver a subirlas. La copia se comprueba antes de cambiar nada y la original no se
// borra. Si algo falla, todo queda como estaba.
async function rescatarFotosAnuncio(actuales) {
  try {
    const { urls, cambio } = await moverFotosAnuncioBloqueadas(actuales);
    if (!cambio) return;
    await actualizarFotosPublicidad(urls);
    PUBLI_FOTOS = PUBLI_FOTOS.map((u) => (actuales.includes(u) ? urls[actuales.indexOf(u)] : u));
    PUBLI_FOTOS_GUARDADAS = [...urls];
    renderFotosPublicidad();
    mostrarToast('Listo: arreglé las fotos del anuncio para que se vean en todos los navegadores');
  } catch {
    // Se reintenta la próxima vez que se abra Publicidad.
  }
}

/* ================= SUBIR FOTO A UN CAMPO "imagen_url" (productos y decants) ================= */

// Cualquier <input type="file" class="foto-a-campo"> dentro de un formulario sube la foto y
// deja su URL en el campo imagen_url de ese mismo formulario.
document.addEventListener('change', async (e) => {
  if (!e.target.classList?.contains('foto-a-campo') || !e.target.files.length) return;
  const input = e.target;
  const campo = input.closest('form')?.elements.imagen_url;
  const etiqueta = input.closest('label');
  const textoOriginal = etiqueta.lastChild.textContent;
  etiqueta.lastChild.textContent = ' Subiendo…';
  try {
    const url = await subirImagen(input.files[0], 'perfumes');
    if (campo) campo.value = url;
    mostrarToast('Foto subida. Guarda el producto para aplicarla.');
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    input.value = '';
    etiqueta.lastChild.textContent = textoOriginal;
  }
});

/* ================= COTIZACIONES ================= */

let cotizacionesFiltro = 'Pendiente';
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#cotizaciones-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#cotizaciones-tabs .admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      cotizacionesFiltro = tab.dataset.filtro;
      cargarCotizaciones();
    });
  });
  document.getElementById('btn-cancelar-cotizacion')?.addEventListener('click', () => cerrarModal('modal-cotizacion'));
  document.getElementById('form-cotizacion')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = Number(data.id);
    try {
      await responderCotizacionAdmin(id, {
        precio_cotizado_tienda: data.precio_cotizado_tienda ? Number(data.precio_cotizado_tienda) : null,
        precio_cotizado_consolidado: data.precio_cotizado_consolidado ? Number(data.precio_cotizado_consolidado) : null,
        estado: data.estado,
      });
      mostrarToast('Cotización actualizada');
      cerrarModal('modal-cotizacion');
      cargarCotizaciones();
      actualizarBadgesNav();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

// Mensaje pre-armado para responder por WhatsApp -- mismo patrón que mensajeNotificacionPago:
// retoma lo que pidió (marca, nombre, concentración/ml si los dejó) para no obligar al admin a
// volver a mirar la fila antes de escribir.
function mensajeRespuestaCotizacion(c) {
  const nombre = primerNombre(c.cliente);
  const saludo = nombre && nombre !== '—' ? `Hola ${nombre}!` : 'Hola!';
  const detalle = [c.concentracion, c.mililitros ? `${c.mililitros}ml` : null].filter(Boolean).join(', ');
  return `${saludo} Te escribimos por tu cotización de ${c.marca_solicitada} — ${c.nombre_perfume_solicitado}${detalle ? ` (${detalle})` : ''}.`;
}

async function cargarCotizaciones() {
  const mount = document.getElementById('cotizaciones-lista');
  try {
    const cotizaciones = await obtenerCotizacionesAdmin({ estado: cotizacionesFiltro });
    mount.innerHTML = cotizaciones.length ? `
      <div class="admin-table-wrap"><table class="data-table">
        <thead><tr><th>Cliente</th><th>Perfume Solicitado</th><th>Marca</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${cotizaciones.map((c) => {
            const enlaceWa = enlaceWhatsappCliente(c.telefono_cliente, mensajeRespuestaCotizacion(c));
            return `
            <tr data-id="${c.id}">
              <td>${escapeHtml(c.cliente)}<br><span style="font-size:0.72rem; color:var(--color-text-faint);">${escapeHtml(c.correo_cliente || '')}</span></td>
              <td>${escapeHtml(c.nombre_perfume_solicitado)}${c.mililitros ? ` (${c.mililitros}ml)` : ''}</td>
              <td>${escapeHtml(c.marca_solicitada)}</td>
              <td><span class="status-tag">${escapeHtml(c.estado)}</span></td>
              <td>
                ${enlaceWa ? `<a class="btn btn-whatsapp btn-sm" href="${enlaceWa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                <button class="btn btn-outline btn-sm btn-responder-cotizacion">Responder</button>
                ${c.estado !== 'Convertido_A_Producto' ? '<button class="btn btn-ghost btn-sm btn-convertir-cotizacion">Convertir a Producto</button>' : ''}
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table></div>
    ` : '<div class="admin-empty">No hay cotizaciones.</div>';

    mount.querySelectorAll('.btn-responder-cotizacion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('tr').dataset.id);
        const c = cotizaciones.find((x) => x.id === id);
        abrirModalCotizacion(c);
      });
    });
    mount.querySelectorAll('.btn-convertir-cotizacion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('tr').dataset.id);
        const c = cotizaciones.find((x) => x.id === id);
        convertirCotizacionEnProducto(c);
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

function convertirCotizacionEnProducto(c) {
  abrirModalProducto({
    nombre: c.nombre_perfume_solicitado,
    marca: c.marca_solicitada,
    concentracion: c.concentracion || '',
    mililitros: c.mililitros || 100,
    precio_tienda_regular: c.precio_cotizado_tienda || '',
    precio_consolidado_fijo: c.precio_cotizado_consolidado || '',
  });
  document.getElementById('modal-producto-titulo').textContent = `Nuevo Perfume — desde cotización de ${c.cliente}`;
  COTIZACION_ORIGEN = c.id;
}

function abrirModalCotizacion(c) {
  const form = document.getElementById('form-cotizacion');
  form.reset();
  form.id.value = c.id;
  form.precio_cotizado_tienda.value = c.precio_cotizado_tienda || '';
  form.precio_cotizado_consolidado.value = c.precio_cotizado_consolidado || '';
  form.estado.value = c.estado === 'Pendiente' ? 'Cotizado' : c.estado;
  document.getElementById('modal-cotizacion-info').innerHTML = `
    <strong style="color:var(--color-text);">${escapeHtml(c.cliente)}</strong> &middot; ${escapeHtml(c.correo_cliente || '')}<br>
    Solicita: <strong>${escapeHtml(c.marca_solicitada)} — ${escapeHtml(c.nombre_perfume_solicitado)}</strong>
    ${c.concentracion ? ` (${escapeHtml(c.concentracion)})` : ''}${c.mililitros ? `, ${c.mililitros}ml` : ''}
    ${c.notas_cliente ? `<br><em>"${escapeHtml(c.notas_cliente)}"</em>` : ''}
  `;
  abrirModal('modal-cotizacion');
}

/* ================= MODALES: cierre general ================= */

function configurarModales() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
}
