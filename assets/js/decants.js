// Decants: se traen TODOS los que tienen stock en una sola consulta (porPagina alto -- hoy
// son ~40 familias, lejos del límite de 1000 filas de PostgREST) y la paginación real pasa
// acá, en el cliente. Se necesita así porque el orden que pide el negocio ("de diseñador
// primero") no es un orden alfabético simple que PostgREST pueda resolver con
// .order('tipo_casa') -- Árabe/Diseñador/Nicho no calzan con ningún ASC/DESC de esa columna.
let DECANTS_TODOS = [];
let decantsPaginaActual = 1;
const DECANTS_POR_PAGINA = 12;

// Diseñador primero (son las casas más buscadas), después Árabe, después Nicho, y cualquier
// perfume sin tipo_casa clasificado al final -- dentro de cada grupo se mantiene el orden que
// ya trajo la consulta (recientes primero), porque Array.prototype.sort de JS es estable.
const PRIORIDAD_TIPO_CASA = { Diseñador: 0, Árabe: 1, Nicho: 2 };
function prioridadTipoCasa(p) {
  return PRIORIDAD_TIPO_CASA[p.tipo_casa] ?? 3;
}

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('decants/');
  const mount = document.getElementById('grid-decants');
  if (!SUPABASE_CONFIGURADO) { mount.innerHTML = '<div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div>'; return; }
  try {
    const { productos } = await obtenerProductos({ destacado: 'decant', porPagina: 200, orden: 'recientes', soloConStock: true });
    DECANTS_TODOS = [...productos].sort((a, b) => prioridadTipoCasa(a) - prioridadTipoCasa(b));
    renderDecants();
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
});

function renderDecants() {
  const mount = document.getElementById('grid-decants');
  if (!DECANTS_TODOS.length) {
    mount.innerHTML = '<div class="empty-state">No hay decants disponibles por el momento. Vuelve pronto.</div>';
    return;
  }
  const totalPaginas = Math.max(1, Math.ceil(DECANTS_TODOS.length / DECANTS_POR_PAGINA));
  const desde = (decantsPaginaActual - 1) * DECANTS_POR_PAGINA;
  const pagina = DECANTS_TODOS.slice(desde, desde + DECANTS_POR_PAGINA);
  mount.innerHTML = pagina.map(tarjetaProducto).join('');
  renderPaginacionDecants(totalPaginas);
}

// Mismo patrón visual/comportamiento que calcularRangoPaginas/renderPaginacion en catalogo.js
// (primera, última y una ventana alrededor de la actual, con "…" en los saltos) -- copiado acá
// en vez de compartido porque esta página no carga catalogo.js.
function calcularRangoPaginasDecants(actual, total) {
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

function renderPaginacionDecants(totalPaginas) {
  const mount = document.getElementById('paginacion');
  if (!mount) return;
  if (totalPaginas <= 1) { mount.innerHTML = ''; return; }

  const botonNav = (destino, simbolo, etiqueta) => `<button class="pg-nav" data-pagina="${destino}" ${destino < 1 || destino > totalPaginas ? 'disabled' : ''} aria-label="${etiqueta}">${simbolo}</button>`;

  let html = botonNav(decantsPaginaActual - 1, '‹', 'Página anterior');
  html += calcularRangoPaginasDecants(decantsPaginaActual, totalPaginas)
    .map((p) => p === '…' ? '<span class="pg-ellipsis">…</span>' : `<button class="${p === decantsPaginaActual ? 'active' : ''}" data-pagina="${p}">${p}</button>`)
    .join('');
  html += botonNav(decantsPaginaActual + 1, '›', 'Página siguiente');

  mount.innerHTML = html;
  mount.querySelectorAll('button[data-pagina]:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      decantsPaginaActual = Number(btn.dataset.pagina);
      renderDecants();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
