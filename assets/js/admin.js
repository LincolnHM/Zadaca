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
      <div class="stat-card"><div class="stat-value">${s.totalPedidos}</div><div class="stat-label">Pedidos Tienda</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(s.ingresos)}</div><div class="stat-label">Ingresos Cobrados</div></div>
      <div class="stat-card ${s.pedidosPorDespachar ? 'warn' : ''}"><div class="stat-value">${s.pedidosPorDespachar}</div><div class="stat-label">Pedidos por Despachar</div></div>
      ${CONSOLIDADOS_EN_ADMIN ? `
      <div class="stat-card"><div class="stat-value">${s.consolidadosAbiertos}</div><div class="stat-label">Consolidados Abiertos</div></div>
      <div class="stat-card"><div class="stat-value">${s.reservasPendientes}</div><div class="stat-label">Reservas Pendientes</div></div>` : ''}
      <div class="stat-card ${s.cotizacionesPendientes ? 'warn' : ''}"><div class="stat-value">${s.cotizacionesPendientes}</div><div class="stat-label">Cotizaciones Pendientes</div></div>
      <div class="stat-card ${s.resenasPendientes ? 'warn' : ''}"><div class="stat-value">${s.resenasPendientes}</div><div class="stat-label">Reseñas por Moderar</div></div>
      <div class="stat-card ${s.productosSinMargen ? 'warn' : ''}"><div class="stat-value">${s.productosSinMargen}</div><div class="stat-label">Productos sin Margen Aplicado</div></div>
    `;
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

const PRODUCTOS_POR_PAGINA = 20;
let productosPaginaActual = 1;
// Con el filtro "Solo Decants" la casa se elige con pestañas (ver #productos-decant-tabs), no
// con el <select> genérico de casa -- ese queda oculto en ese modo.
let productosDecantCasaActual = '';

// Alterna entre el modo "catálogo normal" (dropdown de casa, botón Agregar Perfume) y "Solo
// Decants" (pestañas Diseñador/Nicho/Árabe para distinguirlos de un vistazo, botón Agregar
// Decant) -- antes ambos modos se veían igual y era difícil distinguir un grupo de decants del
// resto del catálogo.
function actualizarModoProductosDecant() {
  const esDecants = document.getElementById('productos-filtro')?.value === 'decants';
  document.getElementById('productos-decant-tabs').style.display = esDecants ? '' : 'none';
  document.getElementById('productos-casa-filtro').style.display = esDecants ? 'none' : '';
  document.getElementById('btn-nuevo-producto').style.display = esDecants ? 'none' : '';
  document.getElementById('btn-nuevo-decant').style.display = esDecants ? '' : 'none';
}

let productosBusquedaTimeout;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('productos-busqueda')?.addEventListener('input', (e) => {
    clearTimeout(productosBusquedaTimeout);
    productosBusquedaTimeout = setTimeout(() => { productosPaginaActual = 1; cargarProductos(e.target.value); }, 350);
  });
  ['productos-filtro', 'productos-genero-filtro', 'productos-casa-filtro'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'productos-filtro') actualizarModoProductosDecant();
      productosPaginaActual = 1;
      cargarProductos(document.getElementById('productos-busqueda')?.value);
    });
  });
  document.querySelectorAll('#productos-decant-tabs .admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#productos-decant-tabs .admin-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      productosDecantCasaActual = btn.dataset.casa;
      productosPaginaActual = 1;
      cargarProductos(document.getElementById('productos-busqueda')?.value);
    });
  });
  document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => abrirModalProducto());
  document.getElementById('btn-nuevo-decant')?.addEventListener('click', () => abrirModalDecant());
});

async function cargarProductos(busqueda) {
  const mount = document.getElementById('productos-grid');
  const filtro = document.getElementById('productos-filtro')?.value;
  const genero = document.getElementById('productos-genero-filtro')?.value;
  const tipoCasa = filtro === 'decants' ? productosDecantCasaActual : document.getElementById('productos-casa-filtro')?.value;
  try {
    let resultado = await obtenerProductosAdmin({ busqueda, filtro, genero, tipoCasa, pagina: productosPaginaActual, porPagina: PRODUCTOS_POR_PAGINA });
    // Si al borrar/filtrar la página actual quedó vacía pero sí hay resultados más atrás
    // (ej. eliminaste el único producto de la última página), vuelve a la página 1 en vez de
    // mostrar una grilla vacía con paginación fantasma.
    if (!resultado.productos.length && productosPaginaActual > 1 && resultado.total > 0) {
      productosPaginaActual = 1;
      resultado = await obtenerProductosAdmin({ busqueda, filtro, genero, tipoCasa, pagina: productosPaginaActual, porPagina: PRODUCTOS_POR_PAGINA });
    }
    const { productos, total, totalPaginas } = resultado;
    const conteo = document.getElementById('productos-conteo');
    if (conteo) conteo.textContent = total ? `${total} perfume${total === 1 ? '' : 's'}` : '';
    mount.innerHTML = productos.length ? productos.map(tarjetaProductoAdmin).join('') : '<div class="admin-empty">Sin productos.</div>';
    conectarEventosProductos();
    renderPaginacionAdmin('productos-paginacion', productosPaginaActual, totalPaginas, (pagina) => {
      productosPaginaActual = pagina;
      cargarProductos(busqueda);
      mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

// Un decant "raíz" (es_decant=true, sin id_decant_grupo) es una familia completa desde la
// migración 0016 -- tarjeta especial (tarjetaDecantAdmin) con precios por talla y el gauge del
// frasco en vez de los campos genéricos. Las filas "hijas" que quedaron de antes de esa
// migración (id_decant_grupo apunta a su raíz) siguen existiendo pero desactivadas (activo=
// false, ver migración) -- si algún día se ven (filtro "Solo Ocultos"), caen a la tarjeta
// genérica de siempre, sin ningún botón para seguir sumándoles tamaños.
function tarjetaProductoAdmin(p) {
  if (p.es_decant && !p.id_decant_grupo) return tarjetaDecantAdmin(p);

  const inv = p.inventario || {};
  return `
    <div class="admin-card" data-id="${p.id}" style="${p.activo === false ? 'opacity:0.6;' : ''}">
      <div class="admin-card-top">
        <div class="admin-card-thumb">${imagenProductoAdmin(p)}</div>
        <div style="min-width:0;">
          <span class="admin-card-sub">${escapeHtml(p.marca)} &middot; #${p.id} &middot; ${escapeHtml(p.genero)} &middot; ${escapeHtml(p.tipo_casa || 'Sin definir')}</span>
          <h3 class="admin-card-title">${escapeHtml(p.nombre)}${p.es_liquidacion ? ' <span class="badge badge-liquidacion">Liquidación</span>' : ''}${p.es_decant ? ' <span class="badge badge-decant">Decant</span>' : ''}${p.activo === false ? ' <span class="badge badge-out">Oculto</span>' : ''}</h3>
          <span style="font-size:0.72rem; color:var(--color-text-faint);">${p.mililitros} ml &middot; ${escapeHtml(p.concentracion || '—')}${p.id_decant_grupo ? ` &middot; tamaño de #${p.id_decant_grupo}` : ''}</span>
        </div>
      </div>
      <div class="admin-field-row"><span>Precio tienda</span><input type="number" class="input-precio-tienda" step="0.01" value="${p.precio_tienda_regular}" /></div>
      <div class="admin-field-row" ${CONSOLIDADOS_EN_ADMIN ? '' : 'hidden'}><span>Precio consolidado</span><input type="number" class="input-precio-consolidado" step="0.01" value="${p.precio_consolidado_fijo}" /></div>
      <div class="admin-field-row"><span>Frascos cerrados (stock tienda)</span><input type="number" class="input-stock" value="${inv.stock_fisico ?? 0}" min="0" /></div>
      ${CONSOLIDADOS_EN_ADMIN ? `<div class="admin-field-row"><span>Reservado (consolidado)</span><span>${inv.stock_reservado_consolidados ?? 0}</span></div>` : ''}
      <div class="admin-field-row"><span>Estado</span>
        <select class="select-estado">
          <option value="Disponible" ${p.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
          <option value="Agotado" ${p.estado === 'Agotado' ? 'selected' : ''}>Agotado</option>
          <option value="Bajo_Pedido" ${p.estado === 'Bajo_Pedido' ? 'selected' : ''}>Bajo Pedido</option>
        </select>
      </div>
      <div class="admin-field-row"><span>Nuevo</span><label class="switch"><input type="checkbox" class="chk-nuevo" ${p.es_nuevo ? 'checked' : ''}/><span class="switch-track"></span></label></div>
      <div class="admin-field-row"><span>Best Seller</span><label class="switch"><input type="checkbox" class="chk-bestseller" ${p.es_bestseller ? 'checked' : ''}/><span class="switch-track"></span></label></div>
      <div class="admin-field-row"><span>Activo (visible en catálogo)</span><label class="switch"><input type="checkbox" class="chk-activo" ${p.activo !== false ? 'checked' : ''}/><span class="switch-track"></span></label></div>
      <div class="admin-card-actions">
        <button class="btn btn-outline btn-sm btn-guardar-producto">Guardar</button>
        <button class="btn btn-ghost btn-sm btn-editar-producto">Editar</button>
        <button class="btn btn-danger btn-sm btn-eliminar-producto">Eliminar</button>
      </div>
    </div>
  `;
}

// Tarjeta unificada de un decant: una sola fila representa las 3 tallas (ver migración 0016).
// Stock/Popular son toggles simples (estado/es_bestseller) -- un decant no lleva stock exacto
// por unidad, así que no tiene sentido pedirle un número al admin como en un producto normal.
function tarjetaDecantAdmin(p) {
  const restante = p.mililitros_restantes;
  const total = p.mililitros || 100;
  const porcentaje = restante != null ? Math.max(0, Math.min(100, Math.round((Number(restante) / total) * 100))) : 0;
  return `
    <div class="admin-card" data-id="${p.id}" style="${p.activo === false ? 'opacity:0.6;' : ''}">
      <div class="admin-card-top">
        <div class="admin-card-thumb">${imagenProductoAdmin(p)}</div>
        <div style="min-width:0;">
          <span class="admin-card-sub">${escapeHtml(p.tipo_casa || 'Sin definir')} &middot; ${escapeHtml(p.genero)}</span>
          <h3 class="admin-card-title">${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}${p.activo === false ? ' <span class="badge badge-out">Oculto</span>' : ''}</h3>
          <span style="font-size:0.72rem; color:var(--color-text-faint);">${escapeHtml(p.familia_olfativa || '—')}</span>
        </div>
        <div class="admin-card-actions" style="margin-left:auto;">
          <button class="btn btn-ghost btn-sm btn-editar-producto">Editar</button>
          <button class="btn btn-danger btn-sm btn-eliminar-producto">Eliminar</button>
        </div>
      </div>

      <div class="admin-field-row"><span>Stock</span><span class="decant-toggle"><label class="switch"><input type="checkbox" class="chk-decant-disponible" ${p.estado !== 'Agotado' ? 'checked' : ''}/><span class="switch-track"></span></label><span class="decant-toggle-label">${p.estado !== 'Agotado' ? 'Disponible' : 'Agotado'}</span></span></div>
      <div class="admin-field-row"><span>Popular</span><span class="decant-toggle"><label class="switch"><input type="checkbox" class="chk-decant-bestseller" ${p.es_bestseller ? 'checked' : ''}/><span class="switch-track"></span></label><span class="decant-toggle-label">Popular</span></span></div>

      <div class="decant-precios">
        <div class="decant-precios-top">
          <span class="decant-precios-label">Precios por talla (S/)</span>
          <button class="btn btn-primary btn-sm btn-guardar-precios-decant">Guardar precios</button>
        </div>
        <div class="decant-precios-grid">
          <label>3ml <input type="number" class="input-precio-3ml" min="0.01" step="0.01" value="${p.precio_3ml ?? ''}" placeholder="—" /></label>
          <label>5ml <input type="number" class="input-precio-5ml" min="0.01" step="0.01" value="${p.precio_5ml ?? ''}" placeholder="—" /></label>
          <label>10ml <input type="number" class="input-precio-10ml" min="0.01" step="0.01" value="${p.precio_10ml ?? ''}" placeholder="—" /></label>
        </div>
      </div>

      <div class="decant-frasco">
        <div class="decant-frasco-header"><span>Frascos abiertos: <strong>${p.inventario?.frascos_abiertos ?? 0}</strong></span><button type="button" class="link-arrow btn-link-inline" data-goto-inventario="${p.id}">Gestionar en Inventario &rarr;</button></div>
        <div class="decant-frasco-header"><span>Perfume en frasco:</span><strong>${restante ?? '—'} ml / ${total} ml</strong></div>
        <div class="decant-frasco-bar"><div class="decant-frasco-fill" style="width:${porcentaje}%;"></div></div>
        <div class="decant-frasco-inputs">
          <label>Restante (ml) <input type="number" class="input-ml-restante" min="0" step="0.1" value="${restante ?? ''}" /></label>
          <label>Total frasco (ml) <input type="number" class="input-ml-total" min="1" step="1" value="${total}" /></label>
          <button class="btn btn-outline btn-sm btn-guardar-ml-decant">Guardar ml</button>
        </div>
      </div>
    </div>
  `;
}

function conectarEventosProductos() {
  document.querySelectorAll('#productos-grid .btn-guardar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-card');
      const id = Number(card.dataset.id);
      const precioTienda = Number(card.querySelector('.input-precio-tienda').value);
      let precioConsolidado = Number(card.querySelector('.input-precio-consolidado').value);
      // Con consolidados apagados el campo no se ve: si bajan el precio de tienda por debajo
      // del consolidado viejo, se lo acompaña (la base exige consolidado <= tienda).
      if (!CONSOLIDADOS_EN_ADMIN) precioConsolidado = Math.min(precioConsolidado || precioTienda, precioTienda);
      if (precioConsolidado > precioTienda) {
        mostrarToast('El precio consolidado no puede ser mayor al precio tienda', 'error');
        return;
      }
      try {
        await actualizarProducto(id, {
          precio_tienda_regular: precioTienda,
          precio_consolidado_fijo: precioConsolidado,
          estado: card.querySelector('.select-estado').value,
          es_nuevo: card.querySelector('.chk-nuevo').checked,
          es_bestseller: card.querySelector('.chk-bestseller').checked,
          activo: card.querySelector('.chk-activo').checked,
          margen_aplicado: true,
        });
        await actualizarInventario(id, { stock_fisico: Number(card.querySelector('.input-stock').value) });
        mostrarToast('Producto actualizado');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .btn-eliminar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-card');
      if (!confirm('¿Eliminar este perfume del catálogo? Esta acción no se puede deshacer.')) return;
      try {
        await eliminarProducto(Number(card.dataset.id));
        mostrarToast('Producto eliminado');
        cargarProductos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .btn-editar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.closest('.admin-card').dataset.id);
      try {
        abrirModalProducto(await obtenerProductoAdminPorId(id));
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  // ---- Tarjeta unificada de decant (ver tarjetaDecantAdmin): toggles que guardan solo, y los
  // 2 botones "Guardar" propios (precios por talla / ml del frasco) -- no hay un botón
  // genérico único como en la tarjeta normal porque son 2 grupos de datos independientes.
  document.querySelectorAll('#productos-grid .chk-decant-disponible').forEach((chk) => {
    chk.addEventListener('change', async () => {
      const id = Number(chk.closest('.admin-card').dataset.id);
      const label = chk.closest('.admin-field-row').querySelector('.decant-toggle-label');
      try {
        await actualizarProducto(id, { estado: chk.checked ? 'Disponible' : 'Agotado' });
        if (label) label.textContent = chk.checked ? 'Disponible' : 'Agotado';
      } catch (err) {
        chk.checked = !chk.checked;
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .chk-decant-bestseller').forEach((chk) => {
    chk.addEventListener('change', async () => {
      const id = Number(chk.closest('.admin-card').dataset.id);
      try {
        await actualizarProducto(id, { es_bestseller: chk.checked });
      } catch (err) {
        chk.checked = !chk.checked;
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .btn-guardar-precios-decant').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-card');
      const id = Number(card.dataset.id);
      const leer = (selector) => {
        const v = card.querySelector(selector).value;
        return v === '' ? null : Number(v);
      };
      const precio_3ml = leer('.input-precio-3ml');
      const precio_5ml = leer('.input-precio-5ml');
      const precio_10ml = leer('.input-precio-10ml');
      if (precio_3ml == null && precio_5ml == null && precio_10ml == null) {
        mostrarToast('Carga el precio de al menos una talla', 'error');
        return;
      }
      try {
        await actualizarProducto(id, { precio_3ml, precio_5ml, precio_10ml, margen_aplicado: true });
        mostrarToast('Precios actualizados');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .btn-guardar-ml-decant').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-card');
      const id = Number(card.dataset.id);
      const restanteVal = card.querySelector('.input-ml-restante').value;
      const totalVal = card.querySelector('.input-ml-total').value;
      const total = Number(totalVal);
      if (!total || total <= 0) {
        mostrarToast('El total del frasco debe ser mayor a 0', 'error');
        return;
      }
      try {
        await actualizarProducto(id, { mililitros: total, mililitros_restantes: restanteVal === '' ? null : Number(restanteVal) });
        mostrarToast('Frasco actualizado');
        cargarProductos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid [data-goto-inventario]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.admin-card');
      abrirInventarioBuscando(card.querySelector('.admin-card-title')?.textContent.split('—').pop().trim() || '');
    });
  });
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
  // Precio/stock/liquidación/mililitros de un decant se editan inline en su tarjeta (ver
  // tarjetaDecantAdmin), no en este modal genérico -- se ocultan para no dar 2 lugares
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
  abrirModal('modal-producto');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-cancelar-producto')?.addEventListener('click', () => { COTIZACION_ORIGEN = null; cerrarModal('modal-producto'); });
  document.getElementById('form-producto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    delete data.id;
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

const TIPOS_MOVIMIENTO_LABEL = {
  Ingreso: 'Ingreso', Venta: 'Venta', Anulacion_Venta: 'Venta anulada', Apertura_Decant: 'Frasco abierto',
  Frasco_Terminado: 'Frasco terminado', Ajuste: 'Ajuste', Merma: 'Merma', Conteo: 'Conteo',
};

function construirLineasInventario(productos) {
  const tienda = productos.filter((p) => !p.es_decant);
  const decants = productos.filter((p) => p.es_decant);
  const tiendaPorId = new Map(tienda.map((t) => [t.id, t]));
  const decantPorTienda = new Map();
  decants.forEach((d) => {
    if (d.id_perfume_tienda && tiendaPorId.has(d.id_perfume_tienda) && !decantPorTienda.has(d.id_perfume_tienda)) decantPorTienda.set(d.id_perfume_tienda, d);
  });
  const lineas = tienda.map((t) => ({ clave: `t${t.id}`, tienda: t, decant: decantPorTienda.get(t.id) || null }));
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
        cerrados,
        abiertos,
        ml,
        precio,
        costo,
        bajo: bajoTienda || bajoDecant,
        conStock: (cerrados || 0) > 0 || (abiertos || 0) > 0,
        activo: (l.tienda?.activo ?? false) || (l.decant?.activo ?? false),
        textoBusqueda: normalizarBusqueda(`${base.marca} ${base.nombre} ${l.decant && l.tienda ? `${l.decant.marca} ${l.decant.nombre}` : ''}`),
      };
    })
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.nombre.localeCompare(b.nombre));
}

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('inventario-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderInventario, 200); });
  document.getElementById('inventario-filtro')?.addEventListener('change', renderInventario);
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

  document.getElementById('btn-cancelar-ajuste')?.addEventListener('click', () => cerrarModal('modal-ajuste-inventario'));
  document.getElementById('ajuste-motivo')?.addEventListener('change', prepararCamposAjuste);
  document.getElementById('form-ajuste-inventario')?.addEventListener('submit', guardarAjusteInventario);
  document.getElementById('btn-cancelar-vincular')?.addEventListener('click', () => cerrarModal('modal-vincular'));
  document.getElementById('form-vincular')?.addEventListener('submit', guardarVinculo);
});

function cambiarVistaInventario(vista) {
  document.querySelectorAll('#inventario-tabs .admin-tab').forEach((b) => b.classList.toggle('active', b.dataset.vista === vista));
  document.getElementById('inventario-vista-stock').hidden = vista !== 'stock';
  document.getElementById('inventario-vista-movimientos').hidden = vista !== 'movimientos';
  if (vista === 'movimientos') cargarMovimientos();
  else cargarInventario();
}

// Entrada desde otra sección (ej. tarjeta de decant en Productos): abre el inventario ya
// filtrado por ese perfume.
function abrirInventarioBuscando(texto) {
  const input = document.getElementById('inventario-busqueda');
  if (input) input.value = texto;
  const filtro = document.getElementById('inventario-filtro');
  if (filtro) filtro.value = 'todos';
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
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderKpisInventario() {
  const L = INVENTARIO_LINEAS;
  const conStock = L.filter((l) => l.conStock).length;
  const cerrados = L.reduce((acc, l) => acc + (l.cerrados || 0), 0);
  const abiertos = L.reduce((acc, l) => acc + (l.abiertos || 0), 0);
  const valorCosto = L.reduce((acc, l) => acc + (l.cerrados > 0 && l.costo ? l.cerrados * l.costo : 0), 0);
  const sinCosto = L.filter((l) => l.cerrados > 0 && !l.costo).length;
  const valorVenta = L.reduce((acc, l) => acc + (l.cerrados > 0 && l.precio ? l.cerrados * l.precio : 0), 0);
  const bajos = L.filter((l) => l.bajo).length;
  document.getElementById('inventario-kpis').innerHTML = `
    <div class="stat-card"><div class="stat-value">${conStock}</div><div class="stat-label">Perfumes con stock</div></div>
    <div class="stat-card"><div class="stat-value">${cerrados}</div><div class="stat-label">Frascos cerrados</div></div>
    <div class="stat-card"><div class="stat-value">${abiertos}</div><div class="stat-label">Frascos abiertos (decants)</div></div>
    <div class="stat-card"><div class="stat-value">${formatoMoneda(valorVenta)}</div><div class="stat-label">Cerrados a precio de venta</div></div>
    <div class="stat-card"><div class="stat-value">${formatoMoneda(valorCosto)}</div><div class="stat-label">Cerrados a costo${sinCosto ? ` (${sinCosto} sin costo)` : ''}</div></div>
    <div class="stat-card ${bajos ? 'warn' : ''}"><div class="stat-value">${bajos}</div><div class="stat-label">Por acabarse</div></div>
  `;
}

function lineasInventarioFiltradas() {
  const q = normalizarBusqueda(document.getElementById('inventario-busqueda')?.value);
  const palabras = q.split(' ').filter(Boolean);
  const filtro = document.getElementById('inventario-filtro')?.value || 'con-stock';
  return INVENTARIO_LINEAS.filter((l) => {
    if (palabras.length && !palabras.every((w) => l.textoBusqueda.includes(w))) return false;
    if (filtro === 'con-stock') return l.conStock;
    if (filtro === 'bajo') return l.bajo;
    if (filtro === 'abiertos') return (l.abiertos || 0) > 0;
    if (filtro === 'cerrados') return (l.cerrados || 0) > 0;
    if (filtro === 'sin-stock') return !l.conStock && l.activo;
    if (filtro === 'sin-vincular') return !!l.decant && !l.tienda;
    return true;
  });
}

function renderInventario() {
  const tbody = document.getElementById('inventario-tbody');
  const lineas = lineasInventarioFiltradas();
  const conteo = document.getElementById('inventario-conteo');
  if (conteo) conteo.textContent = `${lineas.length} perfume${lineas.length === 1 ? '' : 's'}`;
  tbody.innerHTML = lineas.length ? lineas.map(filaInventario).join('') : '<tr><td colspan="6" class="admin-empty">Nada con este filtro.</td></tr>';
  conectarEventosInventario();
}

function filaInventario(l) {
  const t = l.tienda;
  const d = l.decant;
  const capacidad = d ? (t?.mililitros || d.mililitros || 100) * Math.max(l.abiertos || 0, 1) : 0;
  const pctMl = d && l.ml != null ? Math.max(0, Math.min(100, Math.round((l.ml / capacidad) * 100))) : null;
  const oculto = (t && !t.activo) || (!t && d && !d.activo);
  const tipo = t && d ? 'Tienda + decants' : t ? 'Solo tienda' : 'Solo decants — sin perfume de tienda vinculado';
  const puedeAbrir = !!d;
  return `
    <tr data-clave="${l.clave}" class="${l.bajo ? 'fila-alerta' : ''}">
      <td>
        <div class="inv-nombre"><strong>${escapeHtml(l.marca)} — ${escapeHtml(l.nombre)}</strong>${t ? ` <span class="celda-sub">${t.mililitros} ml</span>` : ''}${oculto ? ' <span class="badge badge-out">Oculto en web</span>' : ''}</div>
        <div class="celda-sub">${tipo}${d || t ? ` · <button type="button" class="btn-link-inline btn-vincular">${t && d ? 'Cambiar vínculo' : 'Vincular'}</button>` : ''}</div>
      </td>
      <td class="num">
        ${t ? `<div class="stepper">
          <button type="button" class="stepper-btn btn-cerrados-menos" aria-label="Restar 1 frasco cerrado" ${l.cerrados <= 0 ? 'disabled' : ''}>&minus;</button>
          <span class="stepper-val ${l.cerrados > 0 && l.cerrados <= t.minimo ? 'texto-alerta' : ''}">${l.cerrados}</span>
          <button type="button" class="stepper-btn btn-cerrados-mas" aria-label="Sumar 1 frasco cerrado">+</button>
        </div>` : '<span class="celda-sub">—</span>'}
      </td>
      <td class="num">
        ${d ? `<div class="inv-abiertos"><strong>${l.abiertos}</strong>${l.abiertos > 0 ? '<button type="button" class="btn-link-inline btn-terminar-frasco" title="Se acabó un frasco abierto">Terminado</button>' : '<span class="celda-sub">Agotado</span>'}</div>` : '<span class="celda-sub">—</span>'}
      </td>
      <td class="num">
        ${d ? `<input type="number" class="inv-ml" min="0" step="0.5" value="${l.ml ?? ''}" placeholder="—" aria-label="ml en frasco abierto" />
          ${pctMl != null ? `<div class="mini-bar"><div style="width:${pctMl}%"></div></div>` : ''}` : '<span class="celda-sub">—</span>'}
      </td>
      <td class="num">${l.precio ? formatoMoneda(l.precio) : d ? `<span class="celda-sub">${tallasDecant(d).map((tm) => `${tm}ml ${formatoMoneda(precioTallaDecant(d, tm))}`).join('<br>')}</span>` : '—'}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          ${puedeAbrir ? '<button type="button" class="btn btn-outline btn-sm btn-abrir-frasco" title="Pasa 1 frasco cerrado de tienda a abierto para decants">Abrir frasco</button>' : ''}
          <button type="button" class="btn btn-ghost btn-sm btn-ajustar">Ajustar</button>
          <button type="button" class="btn btn-ghost btn-sm btn-historial">Historial</button>
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

function conectarEventosInventario() {
  const tbody = document.getElementById('inventario-tbody');
  tbody.querySelectorAll('.btn-cerrados-mas').forEach((btn) => btn.addEventListener('click', () => {
    const l = lineaDeFila(btn);
    btn.disabled = true;
    ejecutarAccionInventario(ajustarInventario({ idProducto: l.tienda.id, cerrados: 1, motivo: 'Ingreso', nota: 'Ingreso rápido desde Inventario' }), `${l.nombre}: +1 frasco cerrado`);
  }));
  tbody.querySelectorAll('.btn-cerrados-menos').forEach((btn) => btn.addEventListener('click', () => {
    const l = lineaDeFila(btn);
    btn.disabled = true;
    ejecutarAccionInventario(ajustarInventario({ idProducto: l.tienda.id, cerrados: -1, motivo: 'Ajuste', nota: 'Ajuste rápido desde Inventario' }), `${l.nombre}: −1 frasco cerrado`);
  }));
  tbody.querySelectorAll('.btn-abrir-frasco').forEach((btn) => btn.addEventListener('click', () => {
    const l = lineaDeFila(btn);
    const hayCerrados = l.tienda && l.cerrados > 0;
    const ml = l.tienda?.mililitros || l.decant.mililitros || 100;
    const mensaje = hayCerrados
      ? `¿Abrir 1 frasco de ${l.marca} ${l.nombre} para decants?\n\nCerrados en tienda: ${l.cerrados} → ${l.cerrados - 1}\nAbiertos: ${l.abiertos} → ${l.abiertos + 1} (+${ml} ml)`
      : `${l.tienda ? 'No quedan frascos cerrados en tienda' : 'Este decant no tiene perfume de tienda vinculado'}.\n\n¿Registrar igual 1 frasco abierto de ${l.nombre} (+${ml} ml) sin descontar de tienda?`;
    if (!confirm(mensaje)) return;
    btn.disabled = true;
    ejecutarAccionInventario(abrirFrascoDecant(l.decant.id, hayCerrados), `Frasco abierto: ${l.nombre}`);
  }));
  tbody.querySelectorAll('.btn-terminar-frasco').forEach((btn) => btn.addEventListener('click', () => {
    const l = lineaDeFila(btn);
    const ultimo = l.abiertos <= 1;
    if (!confirm(`¿Se terminó un frasco abierto de ${l.nombre}?\n\nAbiertos: ${l.abiertos} → ${l.abiertos - 1}${ultimo ? '\n\nEra el último: el decant pasa a Agotado en la web hasta que abras otro.' : ''}`)) return;
    btn.disabled = true;
    const accion = ultimo
      ? ajustarInventario({ idProducto: l.decant.id, abiertos: 0, ml: 0, esDelta: false, motivo: 'Frasco_Terminado', nota: 'Último frasco abierto terminado' })
      : ajustarInventario({ idProducto: l.decant.id, abiertos: -1, motivo: 'Frasco_Terminado', nota: 'Frasco abierto terminado' });
    ejecutarAccionInventario(accion, `Frasco terminado: ${l.nombre}`);
  }));
  tbody.querySelectorAll('.inv-ml').forEach((input) => input.addEventListener('change', () => {
    const l = lineaDeFila(input);
    const valor = input.value === '' ? null : Number(input.value);
    if (valor == null || valor < 0) { input.value = l.ml ?? ''; return; }
    ejecutarAccionInventario(ajustarInventario({ idProducto: l.decant.id, ml: valor, esDelta: false, motivo: 'Conteo', nota: 'ml medidos en el frasco' }), `${l.nombre}: ${valor} ml`);
  }));
  tbody.querySelectorAll('.btn-ajustar').forEach((btn) => btn.addEventListener('click', () => abrirModalAjuste(lineaDeFila(btn))));
  tbody.querySelectorAll('.btn-historial').forEach((btn) => btn.addEventListener('click', () => {
    const l = lineaDeFila(btn);
    MOVIMIENTOS_FILTRO = { ids: [l.tienda?.id, l.decant?.id].filter(Boolean), nombre: `${l.marca} — ${l.nombre}` };
    document.getElementById('movimientos-periodo').value = '';
    cambiarVistaInventario('movimientos');
  }));
  tbody.querySelectorAll('.btn-vincular').forEach((btn) => btn.addEventListener('click', () => abrirModalVincular(lineaDeFila(btn))));
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

// Tres cifras distintas, para no mezclarlas:
//  - Ventas: lo que se vendió (monto de los pedidos no anulados, del día en que se hizo el pedido).
//  - Cobrado: la plata que entró (pagos aprobados, del día en que se pagaron) -- es lo que se
//    compara contra los gastos para la utilidad de caja.
//  - Por cobrar: saldo pendiente de los pedidos del período.
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
let CONTA_DATOS = null;
let CONTA_ANIO_CARGADO = null;
let contaVista = 'resumen';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contabilidad-anio')?.addEventListener('change', () => cargarContabilidad());
  document.getElementById('contabilidad-mes')?.addEventListener('change', () => renderVistaContabilidad());
  document.querySelectorAll('#contabilidad-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#contabilidad-tabs .admin-tab').forEach((b) => b.classList.toggle('active', b === tab));
      contaVista = tab.dataset.vista;
      ['resumen', 'ventas', 'gastos', 'consolidados'].forEach((v) => {
        document.getElementById(`contabilidad-vista-${v}`).hidden = v !== contaVista;
      });
      if (contaVista === 'consolidados') cargarContabilidadConsolidados();
      else renderVistaContabilidad();
    });
  });
  const categoria = document.getElementById('gasto-categoria');
  if (categoria) categoria.innerHTML = CATEGORIAS_GASTO.map((c) => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('form-gasto')?.addEventListener('submit', guardarGasto);
});

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
  try {
    CONTA_DATOS = await obtenerDatosContabilidad(anio);
    CONTA_ANIO_CARGADO = anio;
    if (contaVista === 'consolidados') cargarContabilidadConsolidados();
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

  let ventasEnteros = 0;
  let ventasDecants = 0;
  let costoEnteros = 0;
  let ventasEnterosConCosto = 0;
  const porProducto = new Map();
  activos.forEach((p) => (p.detalle_pedido || []).forEach((i) => {
    const prod = i.perfumes || {};
    const subtotal = Number(i.subtotal || 0);
    if (prod.es_decant) ventasDecants += subtotal;
    else {
      ventasEnteros += subtotal;
      if (prod.costo_importacion_pen) {
        costoEnteros += Number(prod.costo_importacion_pen) * i.cantidad;
        ventasEnterosConCosto += subtotal;
      }
    }
    const clave = prod.id ? `${prod.id}-${prod.es_decant ? i.talla_ml : 0}` : `libre-${(i.descripcion_libre || '').trim().toLowerCase()}`;
    if (!porProducto.has(clave)) porProducto.set(clave, { nombre: prod.id ? `${prod.marca || ''} — ${prod.nombre || ''}${prod.es_decant ? ` (decant ${i.talla_ml}ml)` : ''}` : `${i.descripcion_libre || 'Producto libre'} (libre)`, unidades: 0, monto: 0 });
    const entrada = porProducto.get(clave);
    entrada.unidades += i.cantidad;
    entrada.monto += subtotal;
  }));

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
    ventas, cobrado, porCobrar, totalGastos,
    utilidad: cobrado - totalGastos,
    ticket: activos.length ? ventas / activos.length : 0,
    ventasEnteros, ventasDecants, costoEnteros, ventasEnterosConCosto,
    porCanal: agrupar(activos, (p) => etiquetaCanal(p.canal), (p) => Number(p.monto_total)),
    porMetodo: agrupar(pagosPeriodo, (pg) => METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || 'Sin método', (pg) => Number(pg.monto)),
    porCategoria: agrupar(gastosPeriodo, (g) => g.categoria, (g) => Number(g.monto)),
    topProductos: [...porProducto.values()].sort((a, b) => b.unidades - a.unidades || b.monto - a.monto).slice(0, 10),
  };
}

function renderVistaContabilidad() {
  if (!CONTA_DATOS) return;
  if (contaVista === 'ventas') return renderVentasConta();
  if (contaVista === 'gastos') return renderGastosConta();
  return renderResumenConta();
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

function renderResumenConta() {
  const mount = document.getElementById('contabilidad-vista-resumen');
  const mes = mesSeleccionadoConta();
  const anio = CONTA_ANIO_CARGADO;
  const r = calcularPeriodoConta(mes);
  const periodo = mes == null ? `${anio}` : `${MESES[mes]} ${anio}`;
  const meses = MESES.map((_, m) => ({ m, ...calcularPeriodoConta(m) }));
  const margen = r.ventasEnterosConCosto - r.costoEnteros;

  mount.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.ventas)}</div><div class="stat-label">Ventas ${escapeHtml(periodo)} · ${r.activos.length} pedido${r.activos.length === 1 ? '' : 's'}</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.cobrado)}</div><div class="stat-label">Cobrado (entró a caja)</div></div>
      <div class="stat-card ${r.porCobrar ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(r.porCobrar)}</div><div class="stat-label">Por cobrar</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.totalGastos)}</div><div class="stat-label">Gastos</div></div>
      <div class="stat-card ${r.utilidad < 0 ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(r.utilidad)}</div><div class="stat-label">Utilidad (cobrado − gastos)</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(r.ticket)}</div><div class="stat-label">Ticket promedio</div></div>
    </div>

    <div class="dashboard-panel" style="margin-bottom:24px;">
      <div class="dashboard-panel-head"><h3>Mes a mes — ${anio}</h3></div>
      <div class="chart-canvas-wrap chart-canvas-wide"><canvas id="chart-contabilidad"></canvas></div>
    </div>

    <div class="admin-table-wrap" style="margin-bottom:24px;"><table class="data-table conta-tabla">
      <thead><tr><th>Mes</th><th class="num">Pedidos</th><th class="num">Ventas</th><th class="num">Cobrado</th><th class="num">Gastos</th><th class="num">Utilidad</th><th class="num">Por cobrar</th></tr></thead>
      <tbody>
        ${meses.map((x) => `
          <tr class="fila-mes ${mes === x.m ? 'fila-activa' : ''}" data-mes="${x.m}">
            <td>${MESES[x.m]}</td>
            <td class="num">${x.activos.length || '—'}</td>
            <td class="num">${x.ventas ? formatoMoneda(x.ventas) : '—'}</td>
            <td class="num">${x.cobrado ? formatoMoneda(x.cobrado) : '—'}</td>
            <td class="num">${x.totalGastos ? formatoMoneda(x.totalGastos) : '—'}</td>
            <td class="num ${x.utilidad < 0 ? 'texto-alerta' : ''}">${x.cobrado || x.totalGastos ? formatoMoneda(x.utilidad) : '—'}</td>
            <td class="num">${x.porCobrar ? formatoMoneda(x.porCobrar) : '—'}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        ${(() => { const t = calcularPeriodoConta(null); return `<tr><td>Total ${anio}</td><td class="num">${t.activos.length}</td><td class="num">${formatoMoneda(t.ventas)}</td><td class="num">${formatoMoneda(t.cobrado)}</td><td class="num">${formatoMoneda(t.totalGastos)}</td><td class="num">${formatoMoneda(t.utilidad)}</td><td class="num">${formatoMoneda(t.porCobrar)}</td></tr>`; })()}
      </tfoot>
    </table></div>
    <p class="form-hint" style="margin:-14px 0 24px;">Toca un mes para ver su detalle. Los pedidos anulados no suman en ventas.</p>

    <div class="dashboard-panels">
      ${tablaDesglose(`Ventas por canal — ${escapeHtml(periodo)}`, r.porCanal, 'pedidos')}
      ${tablaDesglose(`Cobrado por método de pago — ${escapeHtml(periodo)}`, r.porMetodo, 'pagos')}
    </div>

    <div class="dashboard-panels">
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Qué se vendió — ${escapeHtml(periodo)}</h3></div>
        <div class="desglose-fila"><span>Perfumes enteros</span><strong>${formatoMoneda(r.ventasEnteros)}</strong></div>
        <div class="desglose-fila"><span>Decants</span><strong>${formatoMoneda(r.ventasDecants)}</strong></div>
        ${r.ventasEnterosConCosto ? `<div class="desglose-fila"><span>Margen estimado en enteros <span class="celda-sub">(venta − costo de importación registrado)</span></span><strong>${formatoMoneda(margen)}</strong></div>` : ''}
        ${r.anulados.length ? `<div class="desglose-fila"><span class="texto-alerta">Pedidos anulados</span><strong>${r.anulados.length} · ${formatoMoneda(r.anulados.reduce((acc, p) => acc + Number(p.monto_total), 0))}</strong></div>` : ''}
      </div>
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Más vendidos — ${escapeHtml(periodo)}</h3></div>
        ${r.topProductos.length ? r.topProductos.map((p, i) => `<div class="desglose-fila"><span>${i + 1}. ${escapeHtml(p.nombre)}</span><strong>${p.unidades} und. · ${formatoMoneda(p.monto)}</strong></div>`).join('') : '<div class="admin-empty" style="padding:20px;">Sin ventas en este período.</div>'}
      </div>
    </div>
  `;

  mount.querySelectorAll('.fila-mes').forEach((fila) => fila.addEventListener('click', () => {
    const sel = document.getElementById('contabilidad-mes');
    sel.value = sel.value === fila.dataset.mes ? '' : fila.dataset.mes;
    renderVistaContabilidad();
  }));
  renderGraficoContabilidad(meses);
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
        { type: 'bar', label: 'Ventas', data: meses.map((x) => x.ventas), backgroundColor: 'rgba(188,186,194,0.6)', borderRadius: 3, maxBarThickness: 18, order: 3 },
        { type: 'bar', label: 'Cobrado', data: meses.map((x) => x.cobrado), backgroundColor: '#7a2030', borderRadius: 3, maxBarThickness: 18, order: 2 },
        { type: 'bar', label: 'Gastos', data: meses.map((x) => x.totalGastos), backgroundColor: '#d29a3a', borderRadius: 3, maxBarThickness: 18, order: 4 },
        { type: 'line', label: 'Utilidad', data: meses.map((x) => x.utilidad), borderColor: '#4f8c58', backgroundColor: '#4f8c58', tension: 0, pointRadius: 3, order: 1 },
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

function renderVentasConta() {
  const mount = document.getElementById('contabilidad-vista-ventas');
  const mes = mesSeleccionadoConta();
  const r = calcularPeriodoConta(mes);
  const periodo = mes == null ? `${CONTA_ANIO_CARGADO}` : `${MESES[mes]} ${CONTA_ANIO_CARGADO}`;
  const pedidos = [...r.pedidosPeriodo].sort((a, b) => b.id - a.id);
  mount.innerHTML = `
    <div class="admin-toolbar">
      <span>${pedidos.length} pedido(s) en ${escapeHtml(periodo)} · Ventas ${formatoMoneda(r.ventas)} · Por cobrar ${formatoMoneda(r.porCobrar)}</span>
      <button class="btn btn-outline btn-sm" id="btn-exportar-ventas" style="margin-left:auto;">Exportar a Excel</button>
    </div>
    <div class="admin-table-wrap"><table class="data-table">
      <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Canal</th><th class="num">Total</th><th class="num">Pagado</th><th class="num">Saldo</th><th>Estado</th></tr></thead>
      <tbody>
        ${pedidos.length ? pedidos.map((p) => `
          <tr class="${p.cancelado ? 'fila-anulada' : ''} fila-click" data-id="${p.id}">
            <td>${fechaCortaEs(p.fecha_creacion)}</td>
            <td>#${p.id}</td>
            <td>${escapeHtml(p.cliente)}</td>
            <td>${escapeHtml(etiquetaCanal(p.canal))}</td>
            <td class="num">${formatoMoneda(p.monto_total)}</td>
            <td class="num">${formatoMoneda(p.monto_adelanto_pagado)}</td>
            <td class="num">${Number(p.monto_saldo_pendiente) ? formatoMoneda(p.monto_saldo_pendiente) : '—'}</td>
            <td>${p.cancelado ? '<span class="status-tag tag-anulado">Anulado</span>' : `<span class="status-tag ${claseEstadoPago(p.estado_pago)}">${escapeHtml(p.estado_pago)}</span>`}</td>
          </tr>`).join('') : '<tr><td colspan="8" class="admin-empty">Sin pedidos en este período.</td></tr>'}
      </tbody>
    </table></div>
  `;
  mount.querySelectorAll('.fila-click').forEach((fila) => fila.addEventListener('click', () => abrirDetallePedido(Number(fila.dataset.id))));
  document.getElementById('btn-exportar-ventas').addEventListener('click', () => exportarVentasExcel(pedidos, r.pagosPeriodo, r.gastosPeriodo, periodo));
}

function exportarVentasExcel(pedidos, pagos, gastos, periodo) {
  if (!window.XLSX) return mostrarToast('No cargó la librería de Excel — revisa tu conexión y recarga', 'error');
  const libro = XLSX.utils.book_new();
  const hojaVentas = XLSX.utils.json_to_sheet(sanitizarFilasExcel(pedidos.map((p) => ({
    Fecha: fechaCortaEs(p.fecha_creacion),
    'N° Pedido': p.id,
    Cliente: p.cliente,
    DNI: p.cliente_dni || '',
    Celular: p.cliente_telefono || '',
    Canal: etiquetaCanal(p.canal),
    Productos: (p.detalle_pedido || []).map((i) => `${i.cantidad}x ${i.perfumes ? `${i.perfumes.marca} ${i.perfumes.nombre}${i.perfumes.es_decant ? ` ${i.talla_ml}ml` : ''}` : i.descripcion_libre}`).join(' | '),
    Total: Number(p.monto_total),
    Pagado: Number(p.monto_adelanto_pagado),
    Saldo: Number(p.monto_saldo_pendiente),
    Estado: p.cancelado ? 'Anulado' : p.estado_pago,
  }))));
  hojaVentas['!cols'] = [{ wch: 11 }, { wch: 9 }, { wch: 24 }, { wch: 11 }, { wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 11 }];
  XLSX.utils.book_append_sheet(libro, hojaVentas, 'Ventas');
  const hojaPagos = XLSX.utils.json_to_sheet(pagos.map((pg) => ({ Fecha: fechaCortaEs(pg.fecha_pago), 'N° Pedido': pg.id_pedido, Método: METODOS_PAGO_LABEL[pg.metodo_pago] || pg.metodo_pago || '', Monto: Number(pg.monto) })));
  XLSX.utils.book_append_sheet(libro, hojaPagos, 'Cobros');
  const hojaGastos = XLSX.utils.json_to_sheet(sanitizarFilasExcel(gastos.map((g) => ({ Fecha: fechaCortaEs(g.fecha), Categoría: g.categoria, Descripción: g.descripcion, 'Pagado con': METODOS_PAGO_LABEL[g.metodo_pago] || g.metodo_pago || '', Monto: Number(g.monto) }))));
  XLSX.utils.book_append_sheet(libro, hojaGastos, 'Gastos');
  XLSX.writeFile(libro, `contabilidad-${periodo.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

function renderGastosConta() {
  const mount = document.getElementById('gastos-contenido');
  const mes = mesSeleccionadoConta();
  const r = calcularPeriodoConta(mes);
  const periodo = mes == null ? `${CONTA_ANIO_CARGADO}` : `${MESES[mes]} ${CONTA_ANIO_CARGADO}`;
  const gastos = [...r.gastosPeriodo].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
  mount.innerHTML = `
    <div class="dashboard-panels">
      ${tablaDesglose(`Gastos por categoría — ${escapeHtml(periodo)}`, r.porCategoria, 'registros')}
      <div class="dashboard-panel">
        <div class="dashboard-panel-head"><h3>Total ${escapeHtml(periodo)}</h3></div>
        <div class="desglose-fila"><span>Gastos</span><strong>${formatoMoneda(r.totalGastos)}</strong></div>
        <div class="desglose-fila"><span>Cobrado</span><strong>${formatoMoneda(r.cobrado)}</strong></div>
        <div class="desglose-fila"><span>Utilidad</span><strong class="${r.utilidad < 0 ? 'texto-alerta' : ''}">${formatoMoneda(r.utilidad)}</strong></div>
      </div>
    </div>
    <div class="admin-table-wrap"><table class="data-table">
      <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Pagado con</th><th class="num">Monto</th><th></th></tr></thead>
      <tbody>
        ${gastos.length ? gastos.map((g) => `
          <tr data-id="${g.id}">
            <td>${fechaCortaEs(g.fecha)}</td>
            <td><span class="status-tag">${escapeHtml(g.categoria)}</span></td>
            <td>${escapeHtml(g.descripcion)}</td>
            <td>${escapeHtml(METODOS_PAGO_LABEL[g.metodo_pago] || g.metodo_pago || '—')}</td>
            <td class="num">${formatoMoneda(g.monto)}</td>
            <td><button class="btn btn-ghost btn-sm btn-eliminar-gasto">Eliminar</button></td>
          </tr>`).join('') : `<tr><td colspan="6" class="admin-empty">Sin gastos registrados en ${escapeHtml(periodo)}.</td></tr>`}
      </tbody>
    </table></div>
  `;
  mount.querySelectorAll('.btn-eliminar-gasto').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await eliminarGasto(Number(btn.closest('tr').dataset.id));
      mostrarToast('Gasto eliminado');
      cargarContabilidad();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  }));
}

async function guardarGasto(e) {
  e.preventDefault();
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form));
  const monto = Number(datos.monto);
  if (!monto || monto <= 0) return mostrarToast('Ingresa un monto válido', 'error');
  try {
    await crearGasto({
      fecha: datos.fecha,
      categoria: datos.categoria,
      descripcion: datos.descripcion.trim(),
      monto,
      metodo_pago: datos.metodo_pago || null,
    });
    mostrarToast('Gasto registrado');
    form.descripcion.value = '';
    form.monto.value = '';
    const anioGasto = Number(String(datos.fecha).slice(0, 4));
    if (anioGasto !== Number(document.getElementById('contabilidad-anio').value)) {
      const sel = document.getElementById('contabilidad-anio');
      if ([...sel.options].some((o) => Number(o.value) === anioGasto)) sel.value = String(anioGasto);
    }
    cargarContabilidad();
  } catch (err) {
    mostrarToast(err.message, 'error');
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
      borrarImagenSubida(quitada);
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
  // imagen_url (la foto única de antes) queda con la portada, por compatibilidad.
  data.imagen_url = PUBLI_FOTOS[0] || null;
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
    estado.textContent = `Subiendo foto ${i + 1} de ${lote.length}…`;
    try {
      PUBLI_FOTOS.push(await subirImagen(lote[i], 'publicidad'));
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
      <img src="${escapeHtml(urlSegura(url) || '')}" alt="Foto ${i + 1}" />
      ${i === 0 ? '<span class="publi-portada">Portada</span>' : ''}
      <div class="publi-foto-acciones">
        <button type="button" data-accion="izq" title="Mover a la izquierda" ${i === 0 ? 'disabled' : ''}>&#8249;</button>
        <button type="button" data-accion="quitar" title="Quitar foto">&times;</button>
        <button type="button" data-accion="der" title="Mover a la derecha" ${i === PUBLI_FOTOS.length - 1 ? 'disabled' : ''}>&#8250;</button>
      </div>
    </div>`).join('');
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
    renderFotosPublicidad();
  } catch (err) {
    mostrarToast(err.message, 'error');
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
