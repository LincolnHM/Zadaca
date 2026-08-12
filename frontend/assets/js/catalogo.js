let paginaActual = 1;

document.addEventListener('DOMContentLoaded', async () => {
  iniciarLayout('catalogo.html');

  const params = new URLSearchParams(window.location.search);
  if (params.get('genero')) {
    const radio = document.querySelector(`input[name="genero"][value="${params.get('genero')}"]`);
    if (radio) radio.checked = true;
  }
  if (params.get('destacado')) document.getElementById('filter-form').dataset.destacado = params.get('destacado');

  await cargarFiltros(params.get('marca'), params.get('familia'));

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    paginaActual = 1;
    cargarProductos();
  });
  document.getElementById('orden-select').addEventListener('change', () => {
    paginaActual = 1;
    cargarProductos();
  });

  cargarProductos();
});

async function cargarFiltros(marcaSeleccionada, familiaSeleccionada) {
  try {
    const { marcas, familias } = await apiFetch('/productos/filtros');
    document.getElementById('filtro-marcas').innerHTML = marcas
      .map((m) => `<label class="filter-option"><input type="radio" name="marca" value="${escapeHtml(m)}" ${m === marcaSeleccionada ? 'checked' : ''}/> ${escapeHtml(m)}</label>`)
      .join('') + `<label class="filter-option"><input type="radio" name="marca" value="" ${!marcaSeleccionada ? 'checked' : ''}/> Todas</label>`;
    document.getElementById('filtro-familias').innerHTML = familias
      .map((f) => `<label class="filter-option"><input type="radio" name="familia" value="${escapeHtml(f)}" ${f === familiaSeleccionada ? 'checked' : ''}/> ${escapeHtml(f)}</label>`)
      .join('') + `<label class="filter-option"><input type="radio" name="familia" value="" ${!familiaSeleccionada ? 'checked' : ''}/> Todas</label>`;
  } catch (err) {
    console.error(err);
  }
}

function construirQuery() {
  const form = document.getElementById('filter-form');
  const data = new FormData(form);
  const params = new URLSearchParams();
  const busqueda = data.get('busqueda');
  const genero = data.get('genero');
  const marca = data.get('marca');
  const familia = data.get('familia');
  const destacado = form.dataset.destacado;
  const orden = document.getElementById('orden-select').value;

  if (busqueda) params.set('busqueda', busqueda);
  if (genero) params.set('genero', genero);
  if (marca) params.set('marca', marca);
  if (familia) params.set('familia', familia);
  if (destacado) params.set('destacado', destacado);
  if (orden) params.set('orden', orden);
  params.set('pagina', paginaActual);
  params.set('por_pagina', 12);
  return params;
}

async function cargarProductos() {
  const mount = document.getElementById('grid-catalogo');
  mount.innerHTML = '<div class="loading-state">Cargando productos…</div>';
  try {
    const params = construirQuery();
    const { productos, total, total_paginas } = await apiFetch(`/productos?${params.toString()}`);
    document.getElementById('resultado-conteo').textContent = `${total} producto${total === 1 ? '' : 's'} encontrados`;
    mount.innerHTML = productos.length
      ? productos.map(tarjetaProducto).join('')
      : '<div class="empty-state">No se encontraron perfumes con esos filtros.</div>';
    renderPaginacion(total_paginas);
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function renderPaginacion(totalPaginas) {
  const mount = document.getElementById('paginacion');
  if (totalPaginas <= 1) { mount.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button class="${i === paginaActual ? 'active' : ''}" data-pagina="${i}">${i}</button>`;
  }
  mount.innerHTML = html;
  mount.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      paginaActual = Number(btn.dataset.pagina);
      cargarProductos();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
