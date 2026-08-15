// Catálogo de CONSOLIDADO: misma UI de filtros/paginación que catalogo.js (tienda), pero
// consulta obtenerProductosConsolidado() (todo el catálogo, sin filtrar por stock físico) y
// muestra precio_consolidado_fijo en vez de precio_tienda_regular — ver api.js para el porqué
// de separar las dos consultas.
let paginaActual = 1;
let generoActivo = '';

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('catalogo-consolidado.html');
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('grid-catalogo').innerHTML = '<div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  generoActivo = params.get('genero') || '';
  document.querySelectorAll('.pill[data-genero]').forEach((p) => {
    p.classList.toggle('active', p.dataset.genero === generoActivo);
    p.addEventListener('click', () => {
      generoActivo = p.dataset.genero;
      document.querySelectorAll('.pill[data-genero]').forEach((x) => x.classList.remove('active'));
      p.classList.add('active');
      paginaActual = 1;
      cargarProductos();
      actualizarUIFiltros();
    });
  });

  await cargarFiltros(params.get('marca'), params.get('familia'), params.get('casa'));
  iniciarDropdownsFiltro();
  iniciarBuscadorEnVivo();

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    ocultarSugerencias();
    paginaActual = 1;
    cargarProductos();
    actualizarUIFiltros();
  });
  document.getElementById('orden-select').addEventListener('change', () => {
    paginaActual = 1;
    cargarProductos();
  });

  cargarProductos();
});

async function cargarFiltros(marcaSeleccionada, familiaSeleccionada, casaSeleccionada) {
  try {
    const { marcas, familias } = await obtenerFiltrosCatalogo();
    document.getElementById('filtro-marcas').innerHTML =
      `<label class="filter-option"><input type="radio" name="marca" value="" ${!marcaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      marcas.map((m) => `<label class="filter-option"><input type="radio" name="marca" value="${escapeHtml(m)}" ${m === marcaSeleccionada ? 'checked' : ''}/> ${escapeHtml(m)}</label>`).join('');
    document.getElementById('filtro-familias').innerHTML =
      `<label class="filter-option"><input type="radio" name="familia" value="" ${!familiaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      familias.map((f) => `<label class="filter-option"><input type="radio" name="familia" value="${escapeHtml(f)}" ${f === familiaSeleccionada ? 'checked' : ''}/> ${escapeHtml(f)}</label>`).join('');
    document.getElementById('filtro-casas').innerHTML =
      `<label class="filter-option"><input type="radio" name="tipo_casa" value="" ${!casaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      TIPOS_CASA.map((c) => `<label class="filter-option"><input type="radio" name="tipo_casa" value="${escapeHtml(c)}" ${c === casaSeleccionada ? 'checked' : ''}/> ${escapeHtml(c)}</label>`).join('');

    document.getElementById('dd-familia').style.display = familias.length ? '' : 'none';

    document.querySelectorAll('#filtro-marcas input, #filtro-familias input, #filtro-casas input').forEach((input) => {
      input.addEventListener('change', () => {
        cerrarDropdowns();
        paginaActual = 1;
        cargarProductos();
        actualizarUIFiltros();
      });
    });
    actualizarUIFiltros();
  } catch (err) {
    console.error(err);
  }
}

/* ---------- Dropdowns de filtro ---------- */

function iniciarDropdownsFiltro() {
  document.querySelectorAll('.filter-dd').forEach((dd) => {
    const btn = dd.querySelector('.filter-dd-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const yaAbierto = dd.classList.contains('open');
      cerrarDropdowns();
      if (!yaAbierto) {
        dd.classList.add('open');
        posicionarPanel(dd);
      }
    });
    dd.querySelector('.filter-dd-panel').addEventListener('click', (e) => e.stopPropagation());
  });
  document.addEventListener('click', cerrarDropdowns);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarDropdowns(); });

  const buscadorMarca = document.querySelector('#dd-marca .filter-dd-search');
  buscadorMarca.addEventListener('click', (e) => e.stopPropagation());
  buscadorMarca.addEventListener('input', () => {
    const texto = buscadorMarca.value.trim().toLowerCase();
    document.querySelectorAll('#filtro-marcas .filter-option').forEach((label) => {
      label.style.display = label.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
  });
}

function cerrarDropdowns() {
  document.querySelectorAll('.filter-dd.open').forEach((dd) => dd.classList.remove('open'));
}

function posicionarPanel(dd) {
  const panel = dd.querySelector('.filter-dd-panel');
  panel.style.left = '0px';
  const margen = 12;
  const rect = panel.getBoundingClientRect();
  const desborde = rect.right - (window.innerWidth - margen);
  if (desborde > 0) panel.style.left = `-${desborde}px`;
}

/* ---------- Buscador en vivo ---------- */

let busquedaTimeout;
let sugerenciasSeq = 0;

function iniciarBuscadorEnVivo() {
  const input = document.querySelector('input[name="busqueda"]');
  const panel = document.getElementById('search-suggest');

  input.addEventListener('input', () => {
    clearTimeout(busquedaTimeout);
    busquedaTimeout = setTimeout(() => {
      paginaActual = 1;
      cargarProductos();
      actualizarUIFiltros();
      cargarSugerencias(input.value);
    }, 350);
  });
  input.addEventListener('focus', () => { if (input.value.trim()) cargarSugerencias(input.value); });
  input.addEventListener('keydown', manejarTecladoSugerencias);
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-compact')) ocultarSugerencias(); });
  panel.addEventListener('click', (e) => e.stopPropagation());
}

async function cargarSugerencias(texto) {
  const q = texto.trim();
  if (!q) { ocultarSugerencias(); return; }
  const idSolicitud = ++sugerenciasSeq;
  const lista = await obtenerSugerenciasBusqueda(q, 6);
  if (idSolicitud !== sugerenciasSeq) return;
  renderSugerencias(lista, q);
}

function renderSugerencias(lista, texto) {
  const panel = document.getElementById('search-suggest');
  const filas = lista.map((p) => {
    const precio = formatoMoneda(p.precio_consolidado_fijo);
    const miniatura = p.imagen_url
      ? `<img src="${p.imagen_url}" alt="" loading="lazy" onerror="manejarErrorImagenProducto(this)" />`
      : `<span class="fallback-icon">${ICONS.box}</span>`;
    return `
      <a href="producto.html?slug=${p.slug}" class="search-suggest-item">
        ${miniatura}
        <span class="ss-info">
          <span class="ss-marca">${escapeHtml(p.marca)}</span>
          <span class="ss-nombre">${escapeHtml(p.nombre)}</span>
        </span>
        <span class="ss-precio">${precio}</span>
      </a>`;
  }).join('');

  panel.innerHTML =
    (filas || `<div class="search-suggest-empty">Sin coincidencias para "${escapeHtml(texto)}".</div>`) +
    `<button type="button" class="search-suggest-footer" id="ss-ver-todos">Ver todos los resultados para "${escapeHtml(texto)}"</button>`;
  panel.classList.add('open');

  document.getElementById('ss-ver-todos').addEventListener('click', () => ocultarSugerencias());
}

function ocultarSugerencias() {
  document.getElementById('search-suggest').classList.remove('open');
}

function manejarTecladoSugerencias(e) {
  const panel = document.getElementById('search-suggest');
  if (!panel.classList.contains('open')) return;
  const items = [...panel.querySelectorAll('.search-suggest-item')];
  if (!items.length) return;
  let idx = items.findIndex((el) => el.classList.contains('is-active'));

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    idx = (idx + 1) % items.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    idx = idx <= 0 ? items.length - 1 : idx - 1;
  } else if (e.key === 'Enter' && idx >= 0) {
    e.preventDefault();
    window.location.href = items[idx].href;
    return;
  } else if (e.key === 'Escape') {
    ocultarSugerencias();
    return;
  } else {
    return;
  }
  items.forEach((el) => el.classList.remove('is-active'));
  items[idx].classList.add('is-active');
}

function actualizarUIFiltros() {
  const form = document.getElementById('filter-form');
  const marca = form.querySelector('input[name="marca"]:checked')?.value || '';
  const familia = form.querySelector('input[name="familia"]:checked')?.value || '';
  const casa = form.querySelector('input[name="tipo_casa"]:checked')?.value || '';
  const busqueda = form.querySelector('input[name="busqueda"]').value.trim();

  const btnMarca = document.querySelector('#dd-marca .filter-dd-btn');
  document.getElementById('dd-marca').classList.toggle('has-value', !!marca);
  btnMarca.childNodes[0].textContent = marca ? `Marca: ${marca}` : 'Marca ';

  const btnCasa = document.querySelector('#dd-casa .filter-dd-btn');
  document.getElementById('dd-casa').classList.toggle('has-value', !!casa);
  btnCasa.childNodes[0].textContent = casa ? `Casa: ${casa}` : 'Casa ';

  const btnFamilia = document.querySelector('#dd-familia .filter-dd-btn');
  document.getElementById('dd-familia').classList.toggle('has-value', !!familia);
  btnFamilia.childNodes[0].textContent = familia ? `Familia: ${familia}` : 'Familia Olfativa ';

  const chips = [];
  if (generoActivo) chips.push({ label: `Género: ${generoActivo}`, quitar: () => limpiarGenero() });
  if (marca) chips.push({ label: `Marca: ${marca}`, quitar: () => seleccionarRadio('marca', '') });
  if (casa) chips.push({ label: `Casa: ${casa}`, quitar: () => seleccionarRadio('tipo_casa', '') });
  if (familia) chips.push({ label: `Familia: ${familia}`, quitar: () => seleccionarRadio('familia', '') });
  if (busqueda) chips.push({ label: `"${busqueda}"`, quitar: () => { form.querySelector('input[name="busqueda"]').value = ''; aplicarFiltrosYActualizar(); } });

  const mount = document.getElementById('active-chips');
  if (!chips.length) { mount.innerHTML = ''; return; }
  mount.innerHTML = chips.map((c, i) => `<span class="chip" data-i="${i}">${escapeHtml(c.label)} <button type="button" aria-label="Quitar filtro">&times;</button></span>`).join('')
    + (chips.length > 1 ? '<button type="button" class="chip-clear" id="btn-limpiar-chips">Limpiar todo</button>' : '');
  mount.querySelectorAll('.chip').forEach((el, i) => el.querySelector('button').addEventListener('click', chips[i].quitar));
  const btnLimpiar = document.getElementById('btn-limpiar-chips');
  if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
    limpiarGenero(false);
    seleccionarRadio('marca', '', false);
    seleccionarRadio('tipo_casa', '', false);
    seleccionarRadio('familia', '', false);
    form.querySelector('input[name="busqueda"]').value = '';
    aplicarFiltrosYActualizar();
  });
}

function limpiarGenero(aplicar = true) {
  generoActivo = '';
  document.querySelectorAll('.pill[data-genero]').forEach((x) => x.classList.toggle('active', x.dataset.genero === ''));
  if (aplicar) aplicarFiltrosYActualizar();
}

function seleccionarRadio(nombre, valor, aplicar = true) {
  const radio = document.querySelector(`input[name="${nombre}"][value="${CSS.escape(valor)}"]`);
  if (radio) radio.checked = true;
  if (aplicar) aplicarFiltrosYActualizar();
}

function aplicarFiltrosYActualizar() {
  ocultarSugerencias();
  paginaActual = 1;
  cargarProductos();
  actualizarUIFiltros();
}

function leerFiltros() {
  const form = document.getElementById('filter-form');
  const data = new FormData(form);
  return {
    busqueda: data.get('busqueda') || undefined,
    genero: generoActivo || undefined,
    marca: data.get('marca') || undefined,
    familia: data.get('familia') || undefined,
    tipo_casa: data.get('tipo_casa') || undefined,
    orden: document.getElementById('orden-select').value,
    pagina: paginaActual,
    porPagina: 12,
  };
}

async function cargarProductos() {
  const mount = document.getElementById('grid-catalogo');
  mount.innerHTML = '<div class="loading-state">Cargando productos…</div>';
  try {
    const { productos, total, totalPaginas } = await obtenerProductosConsolidado(leerFiltros());
    document.getElementById('resultado-conteo').textContent = `${total} producto${total === 1 ? '' : 's'} encontrados`;
    mount.innerHTML = productos.length ? productos.map(tarjetaProductoConsolidado).join('') : '<div class="empty-state">No se encontraron perfumes con esos filtros.</div>';
    renderPaginacion(totalPaginas);
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function calcularRangoPaginas(actual, total) {
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

function renderPaginacion(totalPaginas) {
  const mount = document.getElementById('paginacion');
  if (totalPaginas <= 1) { mount.innerHTML = ''; return; }

  const botonNav = (destino, simbolo, etiqueta) => `<button class="pg-nav" data-pagina="${destino}" ${destino < 1 || destino > totalPaginas ? 'disabled' : ''} aria-label="${etiqueta}">${simbolo}</button>`;

  let html = botonNav(paginaActual - 1, '‹', 'Página anterior');
  html += calcularRangoPaginas(paginaActual, totalPaginas)
    .map((p) => p === '…' ? '<span class="pg-ellipsis">…</span>' : `<button class="${p === paginaActual ? 'active' : ''}" data-pagina="${p}">${p}</button>`)
    .join('');
  html += botonNav(paginaActual + 1, '›', 'Página siguiente');

  mount.innerHTML = html;
  mount.querySelectorAll('button[data-pagina]:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      paginaActual = Number(btn.dataset.pagina);
      cargarProductos();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
