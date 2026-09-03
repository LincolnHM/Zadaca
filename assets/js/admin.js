const ESTADOS_CONSOLIDADO = ['Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito', 'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado'];
// 'Pendiente_Aprobacion': reservas de 10+ unidades de un mismo perfume (ver migración 0006) —
// no cuentan en el progreso de la campaña hasta que el admin las cambia a 'Reservado' (aprobar)
// o 'Cancelado' (rechazar) desde este mismo selector.
const ESTADOS_RESERVA = ['Reservado', 'Pendiente_Aprobacion', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'];
let PERFIL_ADMIN = null;
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
    margenes: cargarMargenes,
    pedidos: cargarPedidos,
    consolidados: cargarConsolidados,
    reservas: cargarTodasLasReservas,
    clientes: cargarClientes,
    resenas: cargarResenas,
    cotizaciones: cargarCotizaciones,
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
      <div class="stat-card"><div class="stat-value">${s.consolidadosAbiertos}</div><div class="stat-label">Consolidados Abiertos</div></div>
      <div class="stat-card"><div class="stat-value">${s.reservasPendientes}</div><div class="stat-label">Reservas Pendientes</div></div>
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
          <div class="dashboard-row-main">Pedido #${p.id}</div>
          <div class="dashboard-row-sub">${escapeHtml(p.cliente)}</div>
        </div>
        <div class="dashboard-row-value">
          <div class="dashboard-row-amount">${formatoMoneda(p.monto_total)}</div>
          <span class="status-tag ${claseEstadoPago(p.estado_pago)}">${escapeHtml(p.estado_pago)}</span>
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
          <div class="dashboard-row-sub">${p.stock} und. restantes</div>
        </div>
        <span class="dashboard-count-badge">${p.stock} und.</span>
      </div>
    `).join('') : '<div class="admin-empty">Todo el stock está por encima del mínimo.</div>';
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
      <div class="admin-field-row"><span>Precio consolidado</span><input type="number" class="input-precio-consolidado" step="0.01" value="${p.precio_consolidado_fijo}" /></div>
      <div class="admin-field-row"><span>Stock físico</span><input type="number" class="input-stock" value="${inv.stock_fisico ?? 0}" min="0" /></div>
      <div class="admin-field-row"><span>Reservado (consolidado)</span><span>${inv.stock_reservado_consolidados ?? 0}</span></div>
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
      const precioConsolidado = Number(card.querySelector('.input-precio-consolidado').value);
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

// Tienda / Decants / Consolidado: los dos primeros son ambos tipo_pedido='Directo_Tienda' por
// dentro (nacen del mismo carrito), separados según si el pedido tiene o no algún decant
// adentro -- ver soloDecants en obtenerPedidosAdmin(). "Tienda" queda con undefined/false
// (excluye los que sí tienen decant), "Decants" con true, "Consolidado" no usa esto.
let pedidosTipoActual = 'Directo_Tienda';
let pedidosSoloDecants = false;

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('pedidos-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarPedidos, 350); });
  document.getElementById('pedidos-filtro-estado')?.addEventListener('change', cargarPedidos);
  document.querySelectorAll('#pedidos-tipo-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#pedidos-tipo-tabs .admin-tab').forEach((t2) => t2.classList.remove('active'));
      tab.classList.add('active');
      pedidosTipoActual = tab.dataset.tipo;
      pedidosSoloDecants = tab.dataset.tipo === 'Consolidado' ? undefined : tab.dataset.decants === '1';
      cargarPedidos();
    });
  });
});

async function cargarPedidos() {
  const tbody = document.getElementById('pedidos-tbody');
  const busqueda = document.getElementById('pedidos-busqueda').value;
  const estadoPago = document.getElementById('pedidos-filtro-estado').value;
  try {
    const pedidos = await obtenerPedidosAdmin({ busqueda, estadoPago, tipoPedido: pedidosTipoActual, soloDecants: pedidosSoloDecants });
    tbody.innerHTML = pedidos.length ? pedidos.map(filaPedidoAdmin).join('') : '<tr><td colspan="7" class="admin-empty">No hay pedidos.</td></tr>';
    conectarEventosPedidos();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${err.message}</td></tr>`;
  }
}

function filaPedidoAdmin(p) {
  return `
    <tr data-id="${p.id}">
      <td>#${p.id}${p.campana ? `<br><span style="font-size:0.7rem; color:var(--color-text-faint);">${escapeHtml(p.campana)}</span>` : ''}</td>
      <td>${escapeHtml(p.cliente)}<br><span style="font-size:0.72rem; color:var(--color-text-faint);">${escapeHtml(p.correo_cliente || '')}</span></td>
      <td>${new Date(p.fecha_creacion).toLocaleDateString('es-PE')}</td>
      <td>${formatoMoneda(p.monto_total)}</td>
      <td><span class="status-tag ${claseEstadoPago(p.estado_pago)}" title="Se calcula solo a partir de los pagos registrados">${escapeHtml(p.estado_pago)}</span></td>
      <td>${escapeHtml(p.envio?.estado_envio || 'Preparando')}</td>
      <td><button class="btn btn-ghost btn-sm btn-ver-pedido">Ver</button></td>
    </tr>
  `;
}

function conectarEventosPedidos() {
  document.querySelectorAll('#pedidos-tbody .btn-ver-pedido').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetallePedido(Number(btn.closest('tr').dataset.id)));
  });
}

// Comprobante para armar el paquete al despachar -- ventana aparte con su propio HTML/CSS
// mínimo (no depende de admin.css, así no arrastra el layout ni el sidebar del panel) que se
// manda a imprimir apenas termina de cargar.
function imprimirPedido(p) {
  const dir = p.direccion;
  const ventana = window.open('', '_blank');
  if (!ventana) { mostrarToast('El navegador bloqueó la ventana de impresión -- habilítala para este sitio', 'error'); return; }
  const direccionCompleta = dir
    ? [dir.direccion_detalle, dir.ubigeo?.distrito, dir.ubigeo?.provincia, dir.ubigeo?.departamento].filter(Boolean).join(', ')
    : 'Sin dirección registrada';
  ventana.document.write(`
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Pedido #${p.id} — Maison Zadaca</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 640px; margin: 0 auto; }
        h1 { font-size: 1.3rem; margin: 0 0 4px; }
        .sub { color: #666; font-size: 0.85rem; margin-bottom: 20px; }
        .bloque { margin-bottom: 18px; }
        .bloque h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #7a2030; margin: 0 0 6px; }
        .bloque p { margin: 2px 0; font-size: 0.92rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #ddd; font-size: 0.9rem; }
        th:last-child, td:last-child { text-align: right; }
        tfoot td { font-weight: 700; border-bottom: none; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>Maison Zadaca — Pedido #${p.id}</h1>
      <div class="sub">${new Date(p.fecha_creacion).toLocaleDateString('es-PE')}${p.campana ? ` &middot; Consolidado: ${escapeHtml(p.campana)}` : ''}</div>

      <div class="bloque">
        <h2>Cliente</h2>
        <p>${escapeHtml(p.cliente)}</p>
        <p>${escapeHtml(p.telefono_cliente || '—')}</p>
        ${dir?.nombre_receptor ? `<p>Recibe: ${escapeHtml(dir.nombre_receptor)}</p>` : ''}
      </div>

      <div class="bloque">
        <h2>Entrega</h2>
        <p>${escapeHtml(direccionCompleta)}</p>
        <p>${escapeHtml((dir?.tipo_despacho || '').replace(/_/g, ' '))}${dir?.agencia_nombre ? ` — ${escapeHtml(dir.agencia_nombre)}` : ''}</p>
      </div>

      <div class="bloque">
        <h2>Productos</h2>
        <table>
          <thead><tr><th>Cant.</th><th>Producto</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${p.items.map((i) => `<tr><td>${i.cantidad}</td><td>${escapeHtml(i.marca)} — ${escapeHtml(i.nombre)}${i.es_decant ? ` (${i.talla_ml}ml)` : ''}</td><td>${formatoMoneda(i.subtotal)}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr><td colspan="2">Total</td><td>${formatoMoneda(p.monto_total)}</td></tr></tfoot>
        </table>
      </div>
    </body>
    </html>
  `);
  ventana.document.close();
  ventana.onload = () => ventana.print();
}

async function abrirDetallePedido(id) {
  const mount = document.getElementById('modal-pedido-contenido');
  mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  abrirModal('modal-pedido');
  try {
    const p = await obtenerDetallePedidoAdmin(id);
    const dir = p.direccion;
    mount.innerHTML = `
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:6px;"><strong style="color:var(--color-text);">${escapeHtml(p.cliente)}</strong> &middot; ${escapeHtml(p.correo_cliente || '')} ${p.telefono_cliente ? `&middot; ${escapeHtml(p.telefono_cliente)}` : ''}</p>
      ${p.campana ? `<p style="font-size:0.78rem; color:var(--color-gold); margin-bottom:6px;">Consolidado: ${escapeHtml(p.campana)}</p>` : ''}
      <p style="font-size:0.8rem; color:var(--color-text-faint); margin-bottom:20px;">${dir ? `${escapeHtml(dir.direccion_detalle)}, ${escapeHtml(dir.ubigeo?.distrito || '')} &middot; ${escapeHtml(dir.tipo_despacho?.replace(/_/g, ' ') || '')}` : 'Sin dirección registrada'}</p>

      <strong style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Productos</strong>
      <div style="margin:10px 0 20px;">
        ${p.items.map((i) => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0; border-bottom:1px solid var(--color-border);"><span>${i.cantidad} &times; ${escapeHtml(i.marca)} — ${escapeHtml(i.nombre)}${i.es_decant ? ` (${i.talla_ml}ml)` : ''}</span><span>${formatoMoneda(i.subtotal)}</span></div>`).join('')}
        <div style="display:flex; justify-content:space-between; font-weight:700; padding-top:10px;"><span>Total</span><span>${formatoMoneda(p.monto_total)}</span></div>
      </div>

      <strong style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Envío</strong>
      <div class="form-row" style="margin-top:10px;">
        <div class="form-group"><label>Estado de envío</label>
          <select id="det-estado-envio">
            <option value="Preparando" ${p.envio?.estado_envio === 'Preparando' ? 'selected' : ''}>Preparando</option>
            <option value="En_Agencia" ${p.envio?.estado_envio === 'En_Agencia' ? 'selected' : ''}>En agencia</option>
            <option value="En_Ruta" ${p.envio?.estado_envio === 'En_Ruta' ? 'selected' : ''}>En ruta</option>
            <option value="Entregado" ${p.envio?.estado_envio === 'Entregado' ? 'selected' : ''}>Entregado</option>
            <option value="Devuelto" ${p.envio?.estado_envio === 'Devuelto' ? 'selected' : ''}>Devuelto</option>
          </select>
        </div>
        <div class="form-group"><label>N° de guía</label><input type="text" id="det-numero-guia" value="${escapeHtml(p.envio?.numero_guia_seguimiento || '')}" /></div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-guardar-envio">Guardar Envío</button>
      <button class="btn btn-ghost btn-sm" id="btn-imprimir-pedido">Imprimir</button>

      <strong style="display:block; margin-top:24px; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Pagos — el comprobante se coordina por WhatsApp, esto solo registra lo ya confirmado</strong>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:8px 0; margin-bottom:6px;">
        <span>Pagado: ${formatoMoneda(p.monto_adelanto_pagado)}</span>
        <span>Saldo pendiente: <strong style="color:var(--color-gold);">${formatoMoneda(p.monto_saldo_pendiente)}</strong></span>
      </div>
      <div style="margin:10px 0;">
        ${p.pagos.length ? p.pagos.map((pg) => `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; padding:6px 0; gap:10px;">
            <span>${escapeHtml(pg.metodo_pago || '—')} &middot; ${new Date(pg.fecha_pago).toLocaleDateString('es-PE')}</span>
            <span style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              ${formatoMoneda(pg.monto)}
              <span class="status-tag" style="${pg.estado_pago === 'Anulado' ? 'background:rgba(196,106,95,0.15); color:var(--color-danger);' : ''}">${escapeHtml(pg.estado_pago)}</span>
              ${pg.estado_pago === 'Aprobado' ? `<button type="button" class="btn btn-ghost btn-sm btn-anular-pago" data-id="${pg.id}">Anular</button>` : ''}
            </span>
          </div>`).join('') : '<p style="font-size:0.8rem; color:var(--color-text-faint);">Sin pagos registrados.</p>'}
      </div>
      <div class="form-row">
        <div class="form-group"><label>Registrar pago (S/)</label><input type="number" id="det-pago-monto" step="0.01" min="0" value="${p.monto_saldo_pendiente > 0 ? p.monto_saldo_pendiente : ''}" /></div>
        <div class="form-group"><label>Método</label>
          <select id="det-pago-metodo">
            <option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Transferencia_Bancaria">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option><option value="PagoEfectivo">PagoEfectivo</option><option value="Efectivo">Efectivo</option>
          </select>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-registrar-pago">Registrar Pago</button>

      <div style="margin-top:14px;">
        ${(() => {
          const enlaceWa = enlaceWhatsappCliente(p.telefono_cliente, mensajeNotificacionPago(p));
          return enlaceWa
            ? `<a class="btn btn-whatsapp btn-sm" href="${enlaceWa}" target="_blank" rel="noopener">Notificar estado de pago por WhatsApp</a>`
            : '<span class="form-hint">Este cliente no tiene un WhatsApp válido registrado — no se puede armar el link de notificación.</span>';
        })()}
      </div>
    `;

    document.getElementById('btn-guardar-envio').addEventListener('click', async () => {
      try {
        await actualizarEnvioPedido(id, {
          estado_envio: document.getElementById('det-estado-envio').value,
          numero_guia_seguimiento: document.getElementById('det-numero-guia').value || null,
        });
        mostrarToast('Envío actualizado');
        cargarPedidos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    document.getElementById('btn-imprimir-pedido').addEventListener('click', () => imprimirPedido(p));

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
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-cerrar-pedido')?.addEventListener('click', () => cerrarModal('modal-pedido'));
});

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

/* ================= CONTABILIDAD ================= */

let CONTABILIDAD_CONSOLIDADO_ACTUAL = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contabilidad-select-consolidado')?.addEventListener('change', (e) => {
    CONTABILIDAD_CONSOLIDADO_ACTUAL = e.target.value || null;
    renderContabilidad();
  });
});

async function cargarContabilidad() {
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
  if (CONTABILIDAD_CONSOLIDADO_ACTUAL) renderContabilidad();
}

async function renderContabilidad() {
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
        <div class="stat-card"><div class="stat-value">${formatoMoneda(c.costoTotalImportacion)}</div><div class="stat-label">Costo de Importación Estimado</div></div>
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
              <td>${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)} (${p.mililitros}ml)</td>
              <td>${p.unidades}</td>
              <td>${p.costo_importacion_pen != null ? formatoMoneda(p.costo_importacion_pen) : '—'}</td>
              <td>${formatoMoneda(p.costoTotal)}</td>
              <td>${formatoMoneda(p.montoEsperado)}</td>
            </tr>
          `).join('') : '<tr><td colspan="5" class="admin-empty">Sin reservas todavía.</td></tr>'}
        </tbody>
      </table></div>

      ${c.pedidosGenerados === 0 ? '<p class="form-hint" style="margin-top:16px;">Todavía no se generaron pedidos para esta campaña — "Generar Pedidos" convierte las reservas en pedidos reales (con seguimiento de pago) cuando cierres la campaña.</p>' : ''}
    `;

    document.getElementById('btn-generar-pedidos')?.addEventListener('click', async () => {
      if (!confirm(`¿Generar pedidos para las ${c.reservasSinConvertir} reservas de esta campaña? Cada cliente con reservas quedará con un pedido real y podrás cobrarle su saldo. Esta acción no se puede deshacer.`)) return;
      try {
        const creados = await generarPedidosDeConsolidado(CONTABILIDAD_CONSOLIDADO_ACTUAL);
        mostrarToast(`${creados} pedido(s) generado(s)`);
        renderContabilidad();
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
    ['instagram_url', 'tiktok_url', 'facebook_url'].forEach((campo) => { if (!data[campo]) data[campo] = null; });
    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await actualizarConfiguracionSitio(data);
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

/* ================= PUBLICIDAD (popup del inicio) ================= */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-publicidad')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.activo = e.target.elements.activo.checked;
    data.fecha_inicio = data.fecha_inicio ? new Date(data.fecha_inicio).toISOString() : null;
    data.fecha_fin = data.fecha_fin ? new Date(data.fecha_fin).toISOString() : null;
    ['titulo', 'mensaje', 'imagen_url', 'texto_boton', 'url_boton'].forEach((campo) => { if (!data[campo]) data[campo] = null; });
    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await actualizarPublicidad(data);
      mostrarToast('Publicidad guardada');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
});

async function cargarPublicidad() {
  const form = document.getElementById('form-publicidad');
  try {
    const p = await obtenerPublicidadAdmin();
    form.elements.activo.checked = p.activo;
    form.titulo.value = p.titulo || '';
    form.mensaje.value = p.mensaje || '';
    form.imagen_url.value = p.imagen_url || '';
    form.texto_boton.value = p.texto_boton || '';
    form.url_boton.value = p.url_boton || '';
    // datetime-local espera "YYYY-MM-DDTHH:mm" -- el timestamp de Postgres viene con segundos
    // y offset, se recorta a los primeros 16 caracteres tal como hace cuenta.js con fechas.
    form.fecha_inicio.value = p.fecha_inicio ? p.fecha_inicio.slice(0, 16) : '';
    form.fecha_fin.value = p.fecha_fin ? p.fecha_fin.slice(0, 16) : '';
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

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
