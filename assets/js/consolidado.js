let CONSOLIDADO_ID = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Consolidados apagados (ver CONSOLIDADOS_ACTIVOS en api.js): esta página manda al catálogo.
  if (!CONSOLIDADOS_ACTIVOS) { window.location.replace(`${SITE_ROOT}catalogo/`); return; }
  await iniciarLayout('catalogo-consolidado/');
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
    const estadoTexto = consolidadoEstaAbierto(c) ? 'Abierto' : (ESTADOS_CONSOLIDADO_LEGIBLES[c.estado] || c.estado);
    document.getElementById('og-description').setAttribute('content', `${estadoTexto} — compra grupal de perfumes importados a precio preferencial.`);
    renderConsolidado(c);
  } catch (err) {
    document.getElementById('detalle-mount').innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

function renderConsolidado(c) {
  const abierto = consolidadoEstaAbierto(c);
  const { cierre, vencido, texto } = calcularTiempoRestanteConsolidado(c.fecha_cierre_programada);
  const cierreTexto = cierre.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  const cuentaRegresiva = abierto ? ` &middot; <strong style="color:var(--color-gold)">${texto}</strong>` : '';

  document.getElementById('detalle-mount').innerHTML = `
    <div class="container consolidado-layout">
      <div>
        <span class="status-pill">${ESTADOS_CONSOLIDADO_LEGIBLES[c.estado] || c.estado}</span>
        <h1 style="margin:14px 0 8px;">${escapeHtml(c.codigo_campana)}</h1>
        <p style="color:var(--color-text-faint); font-size:0.85rem; margin-bottom:24px;">Cierre programado: ${cierreTexto}${cuentaRegresiva}</p>

        <h3 style="margin-top:40px; font-size:1.2rem;">Seguimiento de la campaña</h3>
        <div class="timeline" style="margin-top:20px;">
          ${c.historial.map((h) => `
            <div class="timeline-item">
              <div class="t-estado">${ESTADOS_CONSOLIDADO_LEGIBLES[h.estado] || h.estado}</div>
              <div class="t-fecha">${new Date(h.fecha_evento).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              ${h.descripcion_publica ? `<p>${escapeHtml(h.descripcion_publica)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <aside class="reserva-panel">
        <h3 class="avion-title">${ICONS.plane} Carrito de Avión</h3>
        <p class="avion-minimo-note">Los perfumes de esta campaña llegan por importación grupal (viajan por avión junto con los del resto de clientes), no de stock inmediato. Elígelos en el Catálogo Consolidado y confirma todo junto desde tu Carrito de Avión.</p>
        ${abierto
          ? `<div id="mis-reservas-mount"></div><div id="avion-resumen-mount"></div>`
          : `<p style="font-size:0.85rem; color:var(--color-text-muted);">${vencido && c.estado === 'Abierto' ? `El plazo para reservar venció el ${cierreTexto}. Escríbenos por WhatsApp si aún quieres participar.` : 'Esta campaña ya no admite nuevas reservas.'}</p>
             <a class="btn btn-whatsapp btn-block" href="${enlaceWhatsappConsolidado()}" target="_blank" rel="noopener">${ICONS.whatsapp} Cotizar por WhatsApp</a>`}
      </aside>
    </div>
  `;

  if (abierto) {
    renderResumenAvion();
    renderMisReservas();
    document.addEventListener('carrito-avion', renderResumenAvion);
  }
}

// Resumen del Carrito de Avión (el mismo del ícono del encabezado): cuánto lleva, cuánto le
// falta para el mínimo y los botones para seguir agregando o ir a confirmar.
async function renderResumenAvion() {
  const mount = document.getElementById('avion-resumen-mount');
  if (!mount) return;
  const cfg = await obtenerConfiguracionSitio().catch(() => null);
  const minimo = minimoUnidadesConsolidado(cfg);
  const items = leerCarritoAvion();
  const unidades = unidadesCarritoAvion(items);
  mount.innerHTML = `
    ${items.length ? `
      <div class="summary-line"><span>Perfumes en tu carrito</span><span>${items.length}</span></div>
      <div class="summary-line"><span>Subtotal consolidado</span><span>${formatoMoneda(totalCarritoAvion(items))}</span></div>
      ${htmlProgresoAvion(unidades, minimo)}` : '<p class="form-hint" style="margin-bottom:16px;">Tu Carrito de Avión está vacío.</p>'}
    <div class="avion-acciones">
      <a class="btn ${items.length ? 'btn-outline' : 'btn-primary'}" href="${SITE_ROOT}catalogo-consolidado/">Agregar perfumes</a>
      ${items.length ? `<a class="btn btn-primary" href="${SITE_ROOT}carrito-avion/">${ICONS.plane} Ver mi Carrito de Avión</a>` : ''}
    </div>`;
}

// Reservas que el cliente ya confirmó en ESTA campaña (solo con sesión iniciada).
async function renderMisReservas() {
  const mount = document.getElementById('mis-reservas-mount');
  if (!mount) return;
  const session = await obtenerSesion();
  if (!session) return;
  const reservas = (await obtenerMisReservas().catch(() => []))
    .filter((r) => String(r.id_consolidado) === String(CONSOLIDADO_ID) && (r.estado_item === 'Reservado' || r.estado_item === 'Pendiente_Aprobacion'));
  const unidades = reservas.reduce((acc, r) => acc + Number(r.cantidad), 0);
  if (!unidades) return;
  mount.innerHTML = `<p class="form-hint" style="margin-bottom:16px;">Ya tienes <strong>${unidades} unidad${unidades === 1 ? '' : 'es'}</strong> reservada${unidades === 1 ? '' : 's'} en esta campaña. <a href="${SITE_ROOT}cuenta/?tab=reservas" class="link-arrow">Ver mis reservas</a></p>`;
}
