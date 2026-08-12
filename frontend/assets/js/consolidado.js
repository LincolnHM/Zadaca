let CONSOLIDADO_ID = null;

document.addEventListener('DOMContentLoaded', async () => {
  iniciarLayout('consolidados.html');
  CONSOLIDADO_ID = new URLSearchParams(window.location.search).get('id');
  if (!CONSOLIDADO_ID) {
    document.getElementById('detalle-mount').innerHTML = '<div class="container"><div class="empty-state">Consolidado no especificado.</div></div>';
    return;
  }
  cargarConsolidado();
});

const ESTADOS_LEGIBLES = {
  Borrador: 'Próximamente', Abierto: 'Abierto', Cerrado_Procesando: 'Cerrado — Procesando',
  Comprado_En_Transito: 'En tránsito', En_Aduanas: 'En aduanas', En_Almacen_Local: 'En almacén local',
  Finalizado: 'Finalizado', Cancelado: 'Cancelado',
};

async function cargarConsolidado() {
  try {
    const c = await apiFetch(`/consolidados/${CONSOLIDADO_ID}`);
    document.getElementById('page-title').textContent = `${c.codigo_campana} — Maison Zadaca`;
    document.getElementById('crumb-codigo').textContent = c.codigo_campana;
    renderConsolidado(c);
  } catch (err) {
    document.getElementById('detalle-mount').innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

function renderConsolidado(c) {
  const abierto = c.estado === 'Abierto';
  const cierre = new Date(c.fecha_cierre_programada).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  document.getElementById('detalle-mount').innerHTML = `
    <div class="container consolidado-layout">
      <div>
        <span class="status-pill">${ESTADOS_LEGIBLES[c.estado] || c.estado}</span>
        <h1 style="margin:14px 0 8px;">${escapeHtml(c.codigo_campana)}</h1>
        <p style="color:var(--color-text-faint); font-size:0.85rem; margin-bottom:24px;">Cierre programado: ${cierre}</p>

        <div class="progress-track"><div class="progress-fill" style="width:${c.porcentaje_avance}%"></div></div>
        <div class="progress-label">
          <span>${c.total_unidades_acumuladas} de ${c.minimo_unidades} unidades mínimas</span>
          <span>${c.porcentaje_avance}%</span>
        </div>

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
        ${abierto ? `<div id="reserva-form-mount"></div>` : `<p style="font-size:0.85rem; color:var(--color-text-muted);">Esta campaña ya no admite nuevas reservas.</p>`}
      </aside>
    </div>
  `;

  if (abierto) renderFormularioReserva();
}

async function renderFormularioReserva() {
  const mount = document.getElementById('reserva-form-mount');
  if (!estaLogueado()) {
    mount.innerHTML = `<a href="cuenta.html?retorno=${encodeURIComponent('consolidado.html?id=' + CONSOLIDADO_ID)}" class="btn btn-primary btn-block">Inicia sesión para reservar</a>`;
    return;
  }
  mount.innerHTML = '<div class="loading-state">Cargando catálogo…</div>';
  try {
    const { productos } = await apiFetch('/productos?por_pagina=48&orden=nombre');
    mount.innerHTML = `
      <form id="reserva-form">
        <div class="form-group">
          <label>Perfume</label>
          <select name="id_producto" required>
            ${productos.map((p) => `<option value="${p.id}">${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)} (${p.mililitros}ml) — ${formatoMoneda(p.precio_consolidado_fijo)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Cantidad</label>
          <input type="number" name="cantidad" value="1" min="1" required />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Reservar Ahora</button>
      </form>
    `;
    document.getElementById('reserva-form').addEventListener('submit', enviarReserva);
  } catch (err) {
    mount.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function enviarReserva(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiFetch(`/consolidados/${CONSOLIDADO_ID}/reservar`, {
      method: 'POST',
      body: JSON.stringify({ id_producto: Number(e.target.id_producto.value), cantidad: Number(e.target.cantidad.value) }),
    });
    mostrarToast('¡Reserva registrada con éxito!');
    cargarConsolidado();
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
  }
}
