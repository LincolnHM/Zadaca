document.addEventListener('DOMContentLoaded', async () => {
  iniciarLayout('index.html');
  wireNewsletterForm();

  document.getElementById('icon-truck').innerHTML = ICONS.truck;
  document.getElementById('icon-shield').innerHTML = ICONS.shield;
  document.getElementById('icon-lock').innerHTML = ICONS.lock;
  document.getElementById('icon-box').innerHTML = ICONS.box;
  document.getElementById('icon-hombre').innerHTML = iconoBottle();
  document.getElementById('icon-mujer').innerHTML = iconoBottle();
  document.getElementById('icon-unisex').innerHTML = iconoBottle();
  document.getElementById('icon-consolidado').innerHTML = ICONS.box;
  document.getElementById('icon-liquidacion').innerHTML = ICONS.sparkle;
  document.getElementById('info-icon-catalogo').innerHTML = ICONS.bag;
  document.getElementById('info-icon-consolidados').innerHTML = ICONS.box;
  document.getElementById('info-icon-liquidaciones').innerHTML = ICONS.sparkle;

  cargarNuevos();
  cargarBestsellers();
  cargarConsolidados();
  cargarLiquidaciones();
  cargarTestimonios();
});

async function cargarNuevos() {
  const mount = document.getElementById('grid-nuevos');
  try {
    const { productos } = await apiFetch('/productos?destacado=nuevo&por_pagina=4');
    mount.innerHTML = productos.length
      ? productos.map(tarjetaProducto).join('')
      : '<div class="empty-state">Aún no hay nuevos ingresos.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function cargarBestsellers() {
  const mount = document.getElementById('grid-bestsellers');
  try {
    const { productos } = await apiFetch('/productos?destacado=bestseller&por_pagina=4');
    mount.innerHTML = productos.length
      ? productos.map(tarjetaProducto).join('')
      : '<div class="empty-state">Aún no hay best sellers.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function cargarConsolidados() {
  const mount = document.getElementById('grid-consolidados');
  try {
    const consolidados = await apiFetch('/consolidados');
    const activos = consolidados.filter((c) => c.estado === 'Abierto').slice(0, 3);
    mount.innerHTML = activos.length
      ? activos.map(tarjetaConsolidado).join('')
      : '<div class="empty-state">No hay consolidados abiertos por el momento.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function cargarLiquidaciones() {
  const mount = document.getElementById('grid-liquidaciones');
  try {
    const { productos } = await apiFetch('/productos?destacado=liquidacion&por_pagina=4');
    mount.innerHTML = productos.length
      ? productos.map(tarjetaProducto).join('')
      : '<div class="empty-state">No hay liquidaciones activas por el momento.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function tarjetaConsolidado(c) {
  const cierre = new Date(c.fecha_cierre_programada).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  return `
    <a href="consolidado.html?id=${c.id}" class="consolidado-card">
      <span class="status-pill">${c.estado}</span>
      <h3>${escapeHtml(c.codigo_campana)}</h3>
      <div class="cc-dates">Cierra el ${cierre}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${c.porcentaje_avance}%"></div></div>
      <div class="progress-label">
        <span>${c.total_unidades_acumuladas} de ${c.minimo_unidades} unidades</span>
        <span>${c.porcentaje_avance}%</span>
      </div>
      <span class="link-arrow">Ver detalle &rarr;</span>
    </a>
  `;
}

async function cargarTestimonios() {
  const mount = document.getElementById('grid-testimonios');
  try {
    const resenas = await apiFetch('/resenas/destacadas');
    mount.innerHTML = resenas.length
      ? resenas.slice(0, 3).map(tarjetaTestimonio).join('')
      : '<div class="empty-state">Aún no hay reseñas publicadas.</div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function tarjetaTestimonio(r) {
  return `
    <div class="testimonial-card">
      <div class="stars">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
      <p>"${escapeHtml(r.comentario || '')}"</p>
      <div class="testimonial-name">${escapeHtml(r.nombres)}${r.producto ? ` &middot; ${escapeHtml(r.producto)}` : ''}</div>
    </div>
  `;
}
