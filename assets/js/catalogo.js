let paginaActual = 1;
let generoActivo = '';

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('catalogo.html');
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

  if (params.get('destacado')) document.getElementById('filter-form').dataset.destacado = params.get('destacado');

  await cargarFiltros(params.get('marca'), params.get('familia'));
  iniciarDropdownsFiltro();

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
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

async function cargarFiltros(marcaSeleccionada, familiaSeleccionada) {
  try {
    const { marcas, familias } = await obtenerFiltrosCatalogo();
    document.getElementById('filtro-marcas').innerHTML =
      `<label class="filter-option"><input type="radio" name="marca" value="" ${!marcaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      marcas.map((m) => `<label class="filter-option"><input type="radio" name="marca" value="${escapeHtml(m)}" ${m === marcaSeleccionada ? 'checked' : ''}/> ${escapeHtml(m)}</label>`).join('');
    document.getElementById('filtro-familias').innerHTML =
      `<label class="filter-option"><input type="radio" name="familia" value="" ${!familiaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      familias.map((f) => `<label class="filter-option"><input type="radio" name="familia" value="${escapeHtml(f)}" ${f === familiaSeleccionada ? 'checked' : ''}/> ${escapeHtml(f)}</label>`).join('');

    // La familia olfativa todavía no está cargada en el catálogo real (ver seed.sql) — mientras
    // esté vacía, ocultamos el botón en vez de mostrar un filtro que solo dice "Todas".
    document.getElementById('dd-familia').style.display = familias.length ? '' : 'none';

    document.querySelectorAll('#filtro-marcas input, #filtro-familias input').forEach((input) => {
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

/* ---------- Dropdowns de filtro (compactos, en vez del sidebar fijo) ---------- */

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

// El panel se ancla por defecto al borde izquierdo del botón (ver CSS), pero en pantallas
// angostas eso lo empuja fuera del viewport cuando el botón está cerca del borde (ej. "Marca"
// pegado a la izquierda). Se corrige moviéndolo con JS después de medir su posición real, en
// vez de adivinar un breakpoint fijo que no sirve para cualquier ancho de pantalla o botón.
function posicionarPanel(dd) {
  const panel = dd.querySelector('.filter-dd-panel');
  panel.style.left = '0px';
  const margen = 12;
  const rect = panel.getBoundingClientRect();
  const desborde = rect.right - (window.innerWidth - margen);
  if (desborde > 0) panel.style.left = `-${desborde}px`;
}

// Refleja el estado actual de los filtros en los botones (nombre de la marca elegida en vez
// de "Marca" a secas) y en la fila de chips, para que se note de un vistazo qué está activo
// sin tener que abrir cada dropdown — clave ahora que ya no hay un sidebar siempre visible.
function actualizarUIFiltros() {
  const form = document.getElementById('filter-form');
  const marca = form.querySelector('input[name="marca"]:checked')?.value || '';
  const familia = form.querySelector('input[name="familia"]:checked')?.value || '';
  const busqueda = form.querySelector('input[name="busqueda"]').value.trim();

  const btnMarca = document.querySelector('#dd-marca .filter-dd-btn');
  document.getElementById('dd-marca').classList.toggle('has-value', !!marca);
  btnMarca.childNodes[0].textContent = marca ? `Marca: ${marca}` : 'Marca ';

  const btnFamilia = document.querySelector('#dd-familia .filter-dd-btn');
  document.getElementById('dd-familia').classList.toggle('has-value', !!familia);
  btnFamilia.childNodes[0].textContent = familia ? `Familia: ${familia}` : 'Familia Olfativa ';

  const chips = [];
  if (generoActivo) chips.push({ label: `Género: ${generoActivo}`, quitar: () => limpiarGenero() });
  if (marca) chips.push({ label: `Marca: ${marca}`, quitar: () => seleccionarRadio('marca', '') });
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
    destacado: form.dataset.destacado || undefined,
    orden: document.getElementById('orden-select').value,
    pagina: paginaActual,
    porPagina: 12,
  };
}

async function cargarProductos() {
  const mount = document.getElementById('grid-catalogo');
  mount.innerHTML = '<div class="loading-state">Cargando productos…</div>';
  try {
    const { productos, total, totalPaginas } = await obtenerProductos(leerFiltros());
    document.getElementById('resultado-conteo').textContent = `${total} producto${total === 1 ? '' : 's'} encontrados`;
    mount.innerHTML = productos.length ? productos.map(tarjetaProducto).join('') : '<div class="empty-state">No se encontraron perfumes con esos filtros.</div>';
    renderPaginacion(totalPaginas);
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

// Con muchas páginas (el catálogo real tiene ~19), listarlas todas seguidas es ilegible.
// Se muestra siempre la primera, la última, y una ventana alrededor de la actual, con "…"
// en los saltos — el patrón estándar de paginación.
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
