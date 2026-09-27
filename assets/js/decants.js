// Decants: se traen TODOS los que tienen stock en una sola consulta (porPagina alto -- hoy
// son ~40 familias, lejos del límite de 1000 filas de PostgREST) y la paginación real pasa
// acá, en el cliente. Se necesita así porque el orden que pide el negocio ("de diseñador
// primero") no es un orden alfabético simple que PostgREST pueda resolver con
// .order('tipo_casa') -- Árabe/Diseñador/Nicho no calzan con ningún ASC/DESC de esa columna.
let DECANTS_TODOS = [];
let DECANTS_FILTRADOS = [];
let decantsGenero = '';
let decantsPaginaActual = 1;
const DECANTS_POR_PAGINA = 12;

// Diseñador primero (son las casas más buscadas), después Nicho, después Árabe, y cualquier
// perfume sin tipo_casa clasificado al final -- dentro de cada grupo se mantiene el orden que
// ya trajo la consulta (recientes primero), porque Array.prototype.sort de JS es estable.
const PRIORIDAD_TIPO_CASA = { Diseñador: 0, Nicho: 1, Árabe: 2 };
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
    iniciarFiltrosDecants();
    aplicarFiltrosDecants();
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
});

/* ---------- Filtros (en el navegador: los decants ya están todos cargados) ---------- */

function textoDecant(p) {
  return `${p.marca} ${p.nombre} ${p.inspirado_en || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function precioBaseDecant(p) {
  const tallas = tallasDecant(p);
  return tallas.length ? Number(precioTallaDecant(p, tallas[0])) : Infinity;
}

function iniciarFiltrosDecants() {
  const params = new URLSearchParams(window.location.search);
  const busqueda = document.getElementById('decants-busqueda');
  busqueda.value = params.get('q') || '';

  // Aromas más comunes entre los decants disponibles (de sus notas olfativas).
  const conteo = new Map();
  DECANTS_TODOS.forEach((p) => {
    if (!p.notas_olfativas || p.notas_olfativas.includes('|')) return;
    p.notas_olfativas.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => {
      const nombre = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
      conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
    });
  });
  [...conteo.keys()].forEach((n) => {
    if (n.endsWith('s') && conteo.has(n.slice(0, -1))) {
      conteo.set(n.slice(0, -1), conteo.get(n.slice(0, -1)) + conteo.get(n));
      conteo.delete(n);
    }
  });
  const aromas = [...conteo.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 16);
  const selAroma = document.getElementById('decants-aroma');
  selAroma.innerHTML = '<option value="">Todos los aromas</option>' + aromas.map(([n, c]) => `<option value="${escapeHtml(n)}">${escapeHtml(n)} (${c})</option>`).join('');
  selAroma.hidden = !aromas.length;

  let t;
  busqueda.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { decantsPaginaActual = 1; aplicarFiltrosDecants(); }, 200); });
  ['decants-casa', 'decants-aroma', 'decants-precio', 'decants-orden'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => { decantsPaginaActual = 1; aplicarFiltrosDecants(); });
  });
  document.querySelectorAll('#decants-generos .pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#decants-generos .pill').forEach((x) => x.classList.toggle('active', x === pill));
      decantsGenero = pill.dataset.genero;
      decantsPaginaActual = 1;
      aplicarFiltrosDecants();
    });
  });
}

function aplicarFiltrosDecants() {
  const palabras = document.getElementById('decants-busqueda').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
  const casa = document.getElementById('decants-casa').value;
  const aroma = document.getElementById('decants-aroma').value.toLowerCase();
  const [pMin, pMax] = (document.getElementById('decants-precio').value || '-').split('-');
  const orden = document.getElementById('decants-orden').value;

  DECANTS_FILTRADOS = DECANTS_TODOS.filter((p) => {
    if (palabras.length && !palabras.every((w) => textoDecant(p).includes(w))) return false;
    // Un Unisex sirve tanto para Hombre como para Mujer (mismo criterio que el catálogo).
    if (decantsGenero && decantsGenero !== 'Unisex' && ![decantsGenero, 'Unisex'].includes(p.genero)) return false;
    if (decantsGenero === 'Unisex' && p.genero !== 'Unisex') return false;
    if (casa && p.tipo_casa !== casa) return false;
    if (aroma && !(p.notas_olfativas || '').toLowerCase().includes(aroma)) return false;
    const precio = precioBaseDecant(p);
    if (pMin && precio < Number(pMin)) return false;
    if (pMax && precio > Number(pMax)) return false;
    return true;
  });
  if (orden === 'precio_asc') DECANTS_FILTRADOS.sort((a, b) => precioBaseDecant(a) - precioBaseDecant(b));
  if (orden === 'precio_desc') DECANTS_FILTRADOS.sort((a, b) => precioBaseDecant(b) - precioBaseDecant(a));
  if (orden === 'nombre') DECANTS_FILTRADOS.sort((a, b) => `${a.marca} ${a.nombre}`.localeCompare(`${b.marca} ${b.nombre}`));

  document.getElementById('decants-conteo').textContent = `${DECANTS_FILTRADOS.length} decant${DECANTS_FILTRADOS.length === 1 ? '' : 's'}`;
  renderDecants();
}

function renderDecants() {
  const mount = document.getElementById('grid-decants');
  if (!DECANTS_TODOS.length) {
    mount.innerHTML = '<div class="empty-state">No hay decants disponibles por el momento. Vuelve pronto.</div>';
    return;
  }
  if (!DECANTS_FILTRADOS.length) {
    const q = document.getElementById('decants-busqueda').value.trim();
    mount.innerHTML = `
      <div class="empty-state empty-encargo">
        <p>${q ? `No tenemos decant de "${escapeHtml(q)}" ahora mismo.` : 'Ningún decant coincide con esos filtros.'}</p>
        <div class="hero-actions">
          <a class="btn btn-ghost btn-sm" href="${SITE_ROOT}catalogo/${q ? `?busqueda=${encodeURIComponent(q)}` : ''}">Buscar el frasco completo</a>
          <a class="btn btn-whatsapp btn-sm" href="${enlaceWhatsappConsolidado(q)}" target="_blank" rel="noopener">Pedirlo por consolidado</a>
        </div>
      </div>`;
    renderPaginacionDecants(1);
    return;
  }
  const totalPaginas = Math.max(1, Math.ceil(DECANTS_FILTRADOS.length / DECANTS_POR_PAGINA));
  const desde = (decantsPaginaActual - 1) * DECANTS_POR_PAGINA;
  const pagina = DECANTS_FILTRADOS.slice(desde, desde + DECANTS_POR_PAGINA);
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
