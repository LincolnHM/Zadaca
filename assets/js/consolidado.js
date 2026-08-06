let CONSOLIDADO_ID = null;

const ESTADOS_LEGIBLES = {
  Borrador: 'Próximamente', Abierto: 'Abierto', Cerrado_Procesando: 'Cerrado — Procesando',
  Comprado_En_Transito: 'En tránsito', En_Aduanas: 'En aduanas', En_Almacen_Local: 'En almacén local',
  Finalizado: 'Finalizado', Cancelado: 'Cancelado',
};

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('consolidados.html');
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div></div>';
    return;
  }
  CONSOLIDADO_ID = new URLSearchParams(window.location.search).get('id');
  if (!CONSOLIDADO_ID) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Consolidado no especificado.</div></div>';
    return;
  }
  cargarConsolidado();
});

async function cargarConsolidado() {
  try {
    const c = await obtenerConsolidadoPorId(CONSOLIDADO_ID);
    document.getElementById('page-title').textContent = `${c.codigo_campana} — Maison Zadaca`;
    document.getElementById('crumb-codigo').textContent = c.codigo_campana;
    document.getElementById('og-title').setAttribute('content', `${c.codigo_campana} — Maison Zadaca`);
    document.getElementById('og-description').setAttribute('content', `${c.total_unidades_acumuladas} de ${c.minimo_unidades} unidades reservadas. Compra grupal de perfumes importados a precio preferencial.`);
    renderConsolidado(c);
  } catch (err) {
    document.getElementById('detalle-mount').innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

// Lo que de verdad cierra una campaña es la FECHA límite, no solo el estado que el admin le
// puso — antes esta página solo miraba c.estado === 'Abierto', así que si el admin se
// olvidaba de cambiar el estado el día del cierre programado, el formulario de reserva
// seguía funcionando indefinidamente (aunque el servidor ya lo rechazaría, ver api.js).
function calcularEstadoTiempo(c) {
  const cierre = new Date(c.fecha_cierre_programada);
  const vencido = cierre.getTime() <= Date.now();
  const diasRestantes = Math.ceil((cierre.getTime() - Date.now()) / 86400000);
  return { cierre, vencido, diasRestantes, abierto: c.estado === 'Abierto' && !vencido };
}

function renderConsolidado(c) {
  const { cierre, vencido, diasRestantes, abierto } = calcularEstadoTiempo(c);
  const cierreTexto = cierre.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  const cuentaRegresiva = abierto
    ? ` &middot; <strong style="color:var(--color-gold)">${diasRestantes <= 0 ? 'Cierra hoy' : `Queda${diasRestantes === 1 ? '' : 'n'} ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`}</strong>`
    : '';

  document.getElementById('detalle-mount').innerHTML = `
    <div class="container consolidado-layout">
      <div>
        <span class="status-pill">${ESTADOS_LEGIBLES[c.estado] || c.estado}</span>
        <h1 style="margin:14px 0 8px;">${escapeHtml(c.codigo_campana)}</h1>
        <p style="color:var(--color-text-faint); font-size:0.85rem; margin-bottom:24px;">Cierre programado: ${cierreTexto}${cuentaRegresiva}</p>
        <div class="progress-track"><div class="progress-fill" style="width:${c.porcentaje_avance}%"></div></div>
        <div class="progress-label"><span>${c.total_unidades_acumuladas} de ${c.minimo_unidades} unidades mínimas</span><span>${c.porcentaje_avance}%</span></div>

        <h3 style="margin-top:40px; font-size:1.2rem;">Perfumes reservados en esta campaña</h3>
        <div style="margin:16px 0 40px;">
          ${c.productos.length
            ? c.productos.map((p) => `
              <div class="participante-row">
                <span><a href="producto.html?slug=${p.slug}" style="color:var(--color-text)">${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}</a></span>
                <span style="color:var(--color-gold)">${p.unidades_reservadas} und. &middot; ${formatoMoneda(p.precio_consolidado_aplicado)}</span>
              </div>`).join('')
            : '<p style="color:var(--color-text-faint); font-size:0.85rem;">Aún no hay reservas en esta campaña.</p>'}
        </div>

        <h3 style="font-size:1.2rem;">Seguimiento de la campaña</h3>
        <div class="timeline" style="margin-top:20px;">
          ${c.historial.map((h) => `
            <div class="timeline-item">
              <div class="t-estado">${ESTADOS_LEGIBLES[h.estado] || h.estado}</div>
              <div class="t-fecha">${new Date(h.fecha_evento).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              ${h.descripcion_publica ? `<p>${escapeHtml(h.descripcion_publica)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <aside class="reserva-panel">
        <h3 style="font-size:1.1rem; margin-bottom:6px;">Reservar en esta campaña</h3>
        <p style="font-size:0.82rem; color:var(--color-text-faint); margin-bottom:20px;">Elige el perfume y la cantidad que deseas reservar al precio consolidado.</p>
        ${abierto
          ? `<div id="reserva-form-mount"></div>`
          : `<p style="font-size:0.85rem; color:var(--color-text-muted);">${vencido && c.estado === 'Abierto' ? `El plazo para reservar venció el ${cierreTexto}. Escríbenos por WhatsApp si aún quieres participar.` : 'Esta campaña ya no admite nuevas reservas.'}</p>`}
      </aside>
    </div>
  `;

  if (abierto) renderFormularioReserva();
}

async function renderFormularioReserva() {
  const mount = document.getElementById('reserva-form-mount');
  const session = await obtenerSesion();
  if (!session) {
    mount.innerHTML = `<a href="cuenta.html?retorno=${encodeURIComponent('consolidado.html?id=' + CONSOLIDADO_ID)}" class="btn btn-primary btn-block">Inicia sesión para reservar</a>`;
    return;
  }
  mount.innerHTML = '<div class="loading-state">Cargando…</div>';
  try {
    const direcciones = await obtenerDirecciones();
    mount.innerHTML = `
      <form id="reserva-form">
        <div class="form-group">
          <label>Perfume</label>
          <div class="combo-perfume">
            <input type="text" id="buscador-perfume" placeholder="Escribe el nombre o la marca…" autocomplete="off" required />
            <input type="hidden" name="id_producto" />
            <div class="combo-resultados" id="combo-resultados"></div>
          </div>
        </div>
        <div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" value="1" min="1" required /></div>
        <div class="form-group">
          <label>Entrega</label>
          ${direcciones.length
            ? `<select name="id_direccion" required>${direcciones.map((d) => `<option value="${d.id}" ${d.predeterminada ? 'selected' : ''}>${escapeHtml(d.etiqueta || 'Dirección')} — ${escapeHtml((d.tipo_despacho || '').replace(/_/g, ' '))}${d.agencia_nombre ? ' (' + escapeHtml(d.agencia_nombre) + ')' : ''}</option>`).join('')}</select>`
            : `<p class="form-hint">No tienes direcciones guardadas. <a href="cuenta.html?tab=direcciones&retorno=${encodeURIComponent('consolidado.html?id=' + CONSOLIDADO_ID)}" class="link-arrow">Agregar una</a></p>`}
        </div>
        <button type="submit" class="btn btn-primary btn-block" ${direcciones.length ? '' : 'disabled'}>Reservar Ahora</button>
      </form>
    `;
    iniciarBuscadorPerfume();
    document.getElementById('reserva-form').addEventListener('submit', enviarReserva);
  } catch (err) {
    mount.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// Antes el selector de perfume era un <select> con como mucho 48 de los 217 perfumes del
// catálogo (los primeros por orden alfabético) — el resto simplemente no se podía reservar.
// Este buscador consulta el catálogo completo por texto a medida que el cliente escribe, así
// que cualquier perfume es encontrable sin importar dónde caiga alfabéticamente.
function iniciarBuscadorPerfume() {
  const input = document.getElementById('buscador-perfume');
  const hidden = document.querySelector('#reserva-form input[name="id_producto"]');
  const resultados = document.getElementById('combo-resultados');
  let temporizador = null;

  input.addEventListener('input', () => {
    hidden.value = '';
    clearTimeout(temporizador);
    const texto = input.value.trim();
    if (texto.length < 2) { resultados.innerHTML = ''; resultados.classList.remove('open'); return; }
    temporizador = setTimeout(async () => {
      try {
        const { productos } = await obtenerProductos({ busqueda: texto, porPagina: 12, orden: 'nombre' });
        resultados.innerHTML = productos.length
          ? productos.map((p) => `
              <button type="button" class="combo-opcion" data-id="${p.id}" data-label="${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}">
                <span><strong>${escapeHtml(p.marca)}</strong> — ${escapeHtml(p.nombre)}</span>
                <span class="combo-precio">${formatoMoneda(p.precio_consolidado_fijo)}</span>
              </button>`).join('')
          : '<div class="combo-vacio">Sin resultados para ese perfume</div>';
        resultados.classList.add('open');
      } catch (err) {
        resultados.innerHTML = `<div class="combo-vacio">${err.message}</div>`;
        resultados.classList.add('open');
      }
    }, 300);
  });

  resultados.addEventListener('click', (e) => {
    const opcion = e.target.closest('.combo-opcion');
    if (!opcion) return;
    hidden.value = opcion.dataset.id;
    input.value = opcion.dataset.label;
    resultados.innerHTML = '';
    resultados.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.combo-perfume')) resultados.classList.remove('open');
  });
}

async function enviarReserva(e) {
  e.preventDefault();
  const idProducto = Number(e.target.id_producto.value);
  if (!idProducto) { mostrarToast('Elige un perfume de la lista de resultados', 'error'); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await reservarEnConsolidado(CONSOLIDADO_ID, idProducto, Number(e.target.cantidad.value), Number(e.target.id_direccion.value));
    mostrarToast('¡Reserva registrada con éxito!');
    cargarConsolidado();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}
