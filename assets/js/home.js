document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('');

  document.getElementById('hero-icon-truck').innerHTML = ICONS.truck;
  document.getElementById('hero-icon-shield').innerHTML = ICONS.shield;
  document.getElementById('hero-icon-pin').innerHTML = ICONS.pin;
  document.getElementById('icon-truck').innerHTML = ICONS.truck;
  document.getElementById('icon-shield').innerHTML = ICONS.shield;
  document.getElementById('icon-lock').innerHTML = ICONS.lock;
  document.getElementById('icon-box').innerHTML = ICONS.box;
  document.getElementById('info-icon-catalogo').innerHTML = ICONS.bag;
  document.getElementById('info-icon-consolidados').innerHTML = ICONS.box;
  document.getElementById('info-icon-liquidaciones').innerHTML = ICONS.check;

  if (!SUPABASE_CONFIGURADO) {
    mostrarAvisoConfiguracion();
    return;
  }

  cargarNuevos();
  cargarConsolidados();
  cargarExplorar();
  cargarSobreNosotros();
  cargarMarcasMarquee();
});

// Franja de marcas disponibles (prueba social real, no inventada -- son las marcas que ya
// están en el catálogo activo). Se duplica la lista una vez para poder animar un scroll
// infinito con un solo translateX(-50%): al llegar a la mitad, la segunda copia ya está
// exactamente donde arrancó la primera, así que el reinicio del loop es invisible.
async function cargarMarcasMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track) return;
  try {
    // "Por Definir" es un marcador interno para productos con marca sin identificar
    // todavía (ver seed.sql) -- no es una marca real, así que no debe salir en una franja
    // pensada como prueba social de cara al cliente.
    const marcas = (await obtenerFiltrosCatalogo()).marcas.filter((m) => m !== 'Por Definir');
    if (!marcas.length) { track.closest('.brand-marquee').style.display = 'none'; return; }
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lista = marcas.map((m) => `<span>${escapeHtml(m)}</span>`).join('<span class="marquee-sep">&#9670;</span>');
    track.innerHTML = reducido ? lista : `${lista}<span class="marquee-sep">&#9670;</span>${lista}`;
    track.classList.toggle('marquee-static', reducido);
  } catch {
    track.closest('.brand-marquee').style.display = 'none';
  }
}

function mostrarAvisoConfiguracion() {
  const aviso = '<div class="empty-state">Configura Supabase en assets/js/supabase-config.js para ver datos reales (ver README.md).</div>';
  ['grid-nuevos', 'grid-consolidados', 'grid-explorar'].forEach((id) => {
    document.getElementById(id).innerHTML = aviso;
  });
}

async function cargarNuevos() {
  const mount = document.getElementById('grid-nuevos');
  try {
    const { productos } = await obtenerProductos({ destacado: 'nuevo', porPagina: 4, soloConStock: true });
    mount.innerHTML = productos.length ? productos.map(tarjetaProducto).join('') : '<div class="empty-state">Aún no hay nuevos ingresos.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function cargarConsolidados() {
  const mount = document.getElementById('grid-consolidados');
  try {
    const consolidados = await obtenerConsolidados();
    const activos = consolidados.filter((c) => c.estado === 'Abierto').slice(0, 3);
    mount.innerHTML = activos.length ? activos.map(tarjetaConsolidado).join('') : '<div class="empty-state">No hay consolidados abiertos por el momento.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function tarjetaConsolidado(c) {
  const cierre = new Date(c.fecha_cierre_programada).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  return `
    <a href="${SITE_ROOT}consolidado/?id=${c.id}" class="consolidado-card">
      <span class="status-pill">${c.estado}</span>
      <h3>${escapeHtml(c.codigo_campana)}</h3>
      <div class="cc-dates">Cierra el ${cierre}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${c.porcentaje_avance}%"></div></div>
      <div class="progress-label"><span>${c.porcentaje_avance}% del mínimo alcanzado</span></div>
      <span class="link-arrow">Ver detalle &rarr;</span>
    </a>
  `;
}

/* ---------- "Sobre Maison Zadaca": stats con conteo animado ---------- */

// El total de perfumes es el único dato real (viene de la BD); el resto de tarjetas ya
// nacen con su data-count-to fijo en el HTML. porPagina:1 porque solo interesa el "count"
// que devuelve Supabase, no la lista de productos en sí.
async function cargarSobreNosotros() {
  try {
    const { total } = await obtenerProductos({ porPagina: 1 });
    if (total > 0) document.getElementById('stat-catalogo').dataset.countTo = total;
  } catch {
    /* si falla, la tarjeta se queda en 0 -- no es crítico para el resto de la página */
  }
  activarContadoresStats();
}

// Anima cada .stat-number de 0 a su data-count-to cuando entra en pantalla (una sola vez).
// Easing "ease-out" (1 - (1-t)^3) para que arranque rápido y se asiente suave al final, en
// vez de un conteo lineal que se siente mecánico.
function activarContadoresStats() {
  const numeros = document.querySelectorAll('.stat-number[data-count-to]');
  if (!numeros.length) return;
  const anima = (el) => {
    const destino = Number(el.dataset.countTo) || 0;
    const sufijo = el.dataset.suffix || '';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = destino + sufijo;
      return;
    }
    const duracion = 1200;
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const facilitado = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(destino * facilitado) + sufijo;
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        anima(entrada.target);
        observer.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.4 });
  numeros.forEach((el) => observer.observe(el));
}

/* ---------- "Explora Nuestro Catálogo": vista paginada, solo con stock real ---------- */
let paginaExplorar = 1;

async function cargarExplorar() {
  const mount = document.getElementById('grid-explorar');
  mount.innerHTML = '<div class="loading-state">Cargando productos…</div>';
  try {
    const { productos, totalPaginas } = await obtenerProductos({ soloConStock: true, orden: 'recientes', pagina: paginaExplorar, porPagina: 8 });
    mount.innerHTML = productos.length ? productos.map(tarjetaProducto).join('') : '<div class="empty-state">Aún no hay perfumes en stock. Vuelve pronto.</div>';
    renderPaginacionExplorar(totalPaginas);
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function renderPaginacionExplorar(totalPaginas) {
  const mount = document.getElementById('paginacion-explorar');
  if (totalPaginas <= 1) { mount.innerHTML = ''; return; }
  const botonNav = (destino, simbolo, etiqueta) => `<button class="pg-nav" data-pagina="${destino}" ${destino < 1 || destino > totalPaginas ? 'disabled' : ''} aria-label="${etiqueta}">${simbolo}</button>`;
  mount.innerHTML = botonNav(paginaExplorar - 1, '‹', 'Página anterior')
    + `<span class="pg-ellipsis">${paginaExplorar} / ${totalPaginas}</span>`
    + botonNav(paginaExplorar + 1, '›', 'Página siguiente');
  mount.querySelectorAll('button[data-pagina]:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      paginaExplorar = Number(btn.dataset.pagina);
      cargarExplorar();
      document.getElementById('grid-explorar').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}
