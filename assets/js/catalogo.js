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
    });
  });

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
    const { marcas, familias } = await obtenerFiltrosCatalogo();
    document.getElementById('filtro-marcas').innerHTML =
      `<label class="filter-option"><input type="radio" name="marca" value="" ${!marcaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      marcas.map((m) => `<label class="filter-option"><input type="radio" name="marca" value="${escapeHtml(m)}" ${m === marcaSeleccionada ? 'checked' : ''}/> ${escapeHtml(m)}</label>`).join('');
    document.getElementById('filtro-familias').innerHTML =
      `<label class="filter-option"><input type="radio" name="familia" value="" ${!familiaSeleccionada ? 'checked' : ''}/> Todas</label>` +
      familias.map((f) => `<label class="filter-option"><input type="radio" name="familia" value="${escapeHtml(f)}" ${f === familiaSeleccionada ? 'checked' : ''}/> ${escapeHtml(f)}</label>`).join('');
  } catch (err) {
    console.error(err);
  }
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

function renderPaginacion(totalPaginas) {
  const mount = document.getElementById('paginacion');
  if (totalPaginas <= 1) { mount.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPaginas; i++) html += `<button class="${i === paginaActual ? 'active' : ''}" data-pagina="${i}">${i}</button>`;
  mount.innerHTML = html;
  mount.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      paginaActual = Number(btn.dataset.pagina);
      cargarProductos();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
