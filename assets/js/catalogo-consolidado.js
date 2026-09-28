// Catálogo de CONSOLIDADO: misma UI de filtros/paginación que catalogo.js (tienda), pero
// consulta obtenerProductosConsolidado() (todo el catálogo, sin filtrar por stock físico) y
// muestra precio_consolidado_fijo en vez de precio_tienda_regular — ver api.js para el porqué
// de separar las dos consultas. 12 tarjetas por página; cada tarjeta suma directo al Carrito
// de Avión (no abre ninguna ficha de producto).
let paginaActual = 1;
let generoActivo = '';
let cargaProductosSeq = 0;
let MINIMO_UNIDADES = 4;
// Productos de la página actual por id (para armar la línea del Carrito de Avión al agregar).
const PRODUCTOS_PAGINA = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  // Consolidados apagados (ver CONSOLIDADOS_ACTIVOS en api.js): esta página manda al catálogo.
  if (!CONSOLIDADOS_ACTIVOS) { window.location.replace(`${SITE_ROOT}catalogo/`); return; }
  await iniciarLayout('catalogo-consolidado/');
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('grid-catalogo').innerHTML = '<div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  generoActivo = params.get('genero') || '';
  const busquedaInicial = (params.get('busqueda') || '').trim();
  if (busquedaInicial) document.querySelector('#filter-form input[name="busqueda"]').value = busquedaInicial;
  obtenerConfiguracionSitio().then((cfg) => { MINIMO_UNIDADES = minimoUnidadesConsolidado(cfg); renderBarraAvion(); }).catch(() => {});
  iniciarTarjetasAvion();
  renderBarraAvion();
  document.addEventListener('carrito-avion', () => { renderBarraAvion(); actualizarMarcasEnCarrito(); });
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

  // La grilla no depende de que el sidebar de filtros ya haya cargado -- se dispara ya mismo,
  // en paralelo con cargarFiltros(), en vez de esperarlo primero (ver mismo cambio en catalogo.js).
  cargarProductos({
    busqueda: busquedaInicial || undefined,
    genero: generoActivo || undefined,
    marca: params.get('marca') || undefined,
    familia: params.get('familia') || undefined,
    tipo_casa: params.get('casa') || undefined,
    orden: document.getElementById('orden-select').value,
    pagina: paginaActual,
    porPagina: 12,
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
});

async function cargarFiltros(marcaSeleccionada, familiaSeleccionada, casaSeleccionada) {
  try {
    const { marcas, familias } = await obtenerFiltrosCatalogo({ consolidado: true });
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
  const lista = await obtenerSugerenciasBusqueda(q, 6, false, { soloTienda: false });
  if (idSolicitud !== sugerenciasSeq) return;
  renderSugerencias(lista, q);
}

function renderSugerencias(lista, texto) {
  const panel = document.getElementById('search-suggest');
  const filas = lista.map((p) => {
    const precio = formatoMoneda(p.precio_consolidado_fijo);
    const miniatura = p.imagen_url
      ? `<img src="${new URL(p.imagen_url, SITE_ROOT).href}" alt="" loading="lazy" onerror="manejarErrorImagenProducto(this)" />`
      : `<span class="fallback-icon">${ICONS.box}</span>`;
    return `
      <button type="button" class="search-suggest-item" data-texto="${escapeHtml(p.nombre)}" style="width:100%; background:none; border:none; text-align:left;">
        ${miniatura}
        <span class="ss-info">
          <span class="ss-marca">${escapeHtml(p.marca)}</span>
          <span class="ss-nombre">${escapeHtml(p.nombre)}</span>
        </span>
        <span class="ss-precio">${precio}</span>
      </button>`;
  }).join('');

  panel.innerHTML =
    (filas || `<div class="search-suggest-empty">Sin coincidencias para "${escapeHtml(texto)}".</div>`) +
    `<button type="button" class="search-suggest-footer" id="ss-ver-todos">Ver todos los resultados para "${escapeHtml(texto)}"</button>`;
  panel.classList.add('open');

  document.getElementById('ss-ver-todos').addEventListener('click', () => aplicarFiltrosYActualizar());
  panel.querySelectorAll('.search-suggest-item').forEach((item) => item.addEventListener('click', () => elegirSugerencia(item)));
}

// Elegir una sugerencia deja la grilla con ese perfume (para agregarlo desde su tarjeta).
function elegirSugerencia(item) {
  document.querySelector('#filter-form input[name="busqueda"]').value = item.dataset.texto;
  aplicarFiltrosYActualizar();
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
    elegirSugerencia(items[idx]);
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

// filtrosIniciales (opcional): la primera carga de la página dispara esto en paralelo con
// cargarFiltros(), antes de que existan los radios de marca/familia/casa en el DOM -- ver
// mismo motivo en catalogo.js.
async function cargarProductos(filtrosIniciales) {
  const mount = document.getElementById('grid-catalogo');
  mount.innerHTML = '<div class="loading-state">Cargando productos…</div>';
  const idSolicitud = ++cargaProductosSeq;
  try {
    const { productos, total, totalPaginas } = await obtenerProductosConsolidado(filtrosIniciales || leerFiltros());
    if (idSolicitud !== cargaProductosSeq) return;
    document.getElementById('resultado-conteo').textContent = `${total} perfume${total === 1 ? '' : 's'} para traer`;
    PRODUCTOS_PAGINA.clear();
    productos.forEach((p) => PRODUCTOS_PAGINA.set(p.id, p));
    const enCarrito = new Map(leerCarritoAvion().map((i) => [i.id_producto, i.cantidad]));
    mount.innerHTML = productos.length
      ? productos.map((p) => tarjetaProductoConsolidado(p, enCarrito.get(p.id) || 0)).join('')
      : `<div class="empty-state">No encontramos ese perfume en el catálogo consolidado. <a class="link-arrow" href="${enlaceWhatsappConsolidado(leerFiltros().busqueda || '')}" target="_blank" rel="noopener">Cotízalo por WhatsApp &rarr;</a></div>`;
    renderPaginacion(totalPaginas);
  } catch (err) {
    if (idSolicitud !== cargaProductosSeq) return;
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

/* ---------- Carrito de Avión desde la tarjeta ---------- */

// Un solo listener para toda la grilla (las tarjetas se vuelven a dibujar en cada página).
function iniciarTarjetasAvion() {
  const grid = document.getElementById('grid-catalogo');
  grid.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const tarjeta = boton.closest('.card-avion');
    const input = tarjeta.querySelector('.avion-cantidad');
    const actual = Math.max(1, Math.floor(Number(input.value) || 1));
    if (boton.dataset.accion === 'menos') input.value = Math.max(1, actual - 1);
    if (boton.dataset.accion === 'mas') input.value = Math.min(MAX_UNIDADES_AVION_POR_PERFUME, actual + 1);
    if (boton.dataset.accion === 'agregar') agregarDesdeTarjeta(tarjeta, boton, actual);
  });
  grid.addEventListener('change', (e) => {
    if (!e.target.classList.contains('avion-cantidad')) return;
    const n = Math.floor(Number(e.target.value) || 1);
    e.target.value = Math.min(Math.max(n, 1), MAX_UNIDADES_AVION_POR_PERFUME);
  });
  grid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('avion-cantidad')) {
      e.preventDefault();
      const tarjeta = e.target.closest('.card-avion');
      agregarDesdeTarjeta(tarjeta, tarjeta.querySelector('[data-accion="agregar"]'), Math.max(1, Math.floor(Number(e.target.value) || 1)));
    }
  });
}

function agregarDesdeTarjeta(tarjeta, boton, cantidad) {
  const p = PRODUCTOS_PAGINA.get(Number(tarjeta.dataset.id));
  if (!p) return;
  agregarAlCarritoAvion(p, cantidad);
  animarAgregarAvion(boton);
  const unidades = unidadesCarritoAvion();
  const faltan = Math.max(MINIMO_UNIDADES - unidades, 0);
  mostrarToast(`${cantidad} × ${p.nombre} al Carrito de Avión${faltan ? ` — te faltan ${faltan} para el mínimo` : ''}`);
  tarjeta.querySelector('.avion-cantidad').value = 1;
  boton.classList.add('agregado');
  boton.innerHTML = `${ICONS.check} Agregado`;
  setTimeout(() => { boton.classList.remove('agregado'); boton.innerHTML = `${ICONS.plane} Agregar`; }, 1400);
}

// "✓ 2 en tu Carrito de Avión" debajo de cada tarjeta que ya está en el carrito.
function actualizarMarcasEnCarrito() {
  const enCarrito = new Map(leerCarritoAvion().map((i) => [i.id_producto, i.cantidad]));
  document.querySelectorAll('#grid-catalogo .card-avion').forEach((t) => {
    const marca = t.querySelector('.avion-en-carrito');
    const n = enCarrito.get(Number(t.dataset.id)) || 0;
    marca.hidden = !n;
    marca.querySelector('span').textContent = n;
  });
}

function renderBarraAvion() {
  const barra = document.getElementById('avion-barra');
  if (!barra) return;
  const items = leerCarritoAvion();
  const unidades = unidadesCarritoAvion(items);
  if (!unidades) {
    barra.classList.remove('visible');
    document.body.classList.remove('con-barra-avion');
    return;
  }
  const faltan = Math.max(MINIMO_UNIDADES - unidades, 0);
  barra.innerHTML = `
    <div class="avion-barra-inner">
      <span class="avion-barra-icono">${ICONS.plane}</span>
      <div class="avion-barra-texto">
        <strong>${unidades} unidad${unidades === 1 ? '' : 'es'}</strong><span class="solo-desktop"> en tu Carrito de Avión</span> · ${formatoMoneda(totalCarritoAvion(items))}
        <span class="avion-barra-sub">${faltan ? `Te falta${faltan === 1 ? '' : 'n'} ${faltan} para el mínimo de ${MINIMO_UNIDADES}` : '¡Pedido mínimo completo!'}</span>
      </div>
      <a href="${SITE_ROOT}carrito-avion/" class="btn ${faltan ? 'btn-outline' : 'btn-primary'} btn-sm">Ver carrito</a>
    </div>`;
  barra.classList.add('visible');
  document.body.classList.add('con-barra-avion');
}
