// Página del Carrito de Avión (consolidado). Es un carrito aparte del de la tienda: se arma en
// el Catálogo Consolidado (ver catalogo-consolidado.js) y vive en este navegador (ver
// leerCarritoAvion en api.js). Para cerrarlo hay dos caminos:
//   1. Si hay una campaña abierta y el cliente inició sesión: "Confirmar reserva" la registra
//      en la campaña (reservar_carrito_avion, todo o nada, con el mínimo validado en la base).
//   2. Siempre: "Enviar por WhatsApp" manda el pedido completo al número del negocio (el admin
//      lo registra en Pedidos → Registrar pedido → Consolidado).
let MINIMO = 4;
let CAMPANA = null;
let SESION = null;
let PERFIL = null;
let DIRECCIONES = [];
let DESCUENTOS = [];
let RESERVADAS_EN_CAMPANA = 0;
let AVISO_QUITADOS = [];
let CONFIRMACION = null; // resultado de la última reserva confirmada (para mostrar el resumen)

document.addEventListener('DOMContentLoaded', async () => {
  if (!CONSOLIDADOS_ACTIVOS) { window.location.replace(`${SITE_ROOT}catalogo/`); return; }
  await iniciarLayout('catalogo-consolidado/');
  document.getElementById('avion-hero-icono').innerHTML = ICONS.plane;
  const mount = document.getElementById('avion-mount');
  if (!SUPABASE_CONFIGURADO) {
    mount.innerHTML = '<div class="container"><div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div></div>';
    return;
  }
  try {
    const [cfg, campana, sesion, refresco, descuentos] = await Promise.all([
      obtenerConfiguracionSitio().catch(() => null),
      obtenerConsolidadoAbierto().catch(() => null),
      obtenerSesion(),
      refrescarCarritoAvion(),
      obtenerDescuentosVolumen().catch(() => []),
    ]);
    MINIMO = minimoUnidadesConsolidado(cfg);
    CAMPANA = campana;
    SESION = sesion;
    DESCUENTOS = descuentos || [];
    AVISO_QUITADOS = refresco.quitados;
    if (SESION) {
      const [perfil, direcciones, reservas] = await Promise.all([
        obtenerPerfilActual().catch(() => null),
        obtenerDirecciones().catch(() => []),
        CAMPANA ? obtenerMisReservas().catch(() => []) : Promise.resolve([]),
      ]);
      PERFIL = perfil;
      DIRECCIONES = direcciones;
      RESERVADAS_EN_CAMPANA = reservas
        .filter((r) => CAMPANA && String(r.id_consolidado) === String(CAMPANA.id) && (r.estado_item === 'Reservado' || r.estado_item === 'Pendiente_Aprobacion'))
        .reduce((acc, r) => acc + Number(r.cantidad), 0);
    }
  } catch (err) {
    console.error(err);
  }
  renderCarritoAvion();
  document.addEventListener('carrito-avion', renderCarritoAvion);
});

// Mismo cálculo que reservar_en_consolidado() en el servidor: cada perfume toma el descuento
// por volumen según lo acumulado hasta ahí. Solo es una estimación -- el precio real lo fija la
// base al confirmar.
function estimarTotalConDescuento(items) {
  let acumulado = 0;
  let total = 0;
  items.forEach((i) => {
    const precio = DESCUENTOS.length ? estimarPrecioConsolidadoPorVolumen(i.precio, acumulado, i.cantidad, DESCUENTOS) : i.precio;
    acumulado += precio * i.cantidad;
    total += precio * i.cantidad;
  });
  return Math.round(total * 100) / 100;
}

function nombreCliente() {
  return PERFIL ? [PERFIL.nombres, PERFIL.apellidos].filter(Boolean).join(' ') : '';
}

function renderCarritoAvion() {
  const mount = document.getElementById('avion-mount');
  const items = leerCarritoAvion();
  const aviso = AVISO_QUITADOS.length
    ? `<div class="avion-aviso">Quitamos de tu carrito ${AVISO_QUITADOS.length === 1 ? 'un perfume que ya no traemos' : 'perfumes que ya no traemos'}: ${escapeHtml(AVISO_QUITADOS.join(', '))}.</div>`
    : '';

  if (!items.length) {
    mount.innerHTML = `
      <div class="container">
        ${CONFIRMACION ? htmlConfirmacion() : aviso}
        ${CONFIRMACION ? '' : `
        <div class="empty-state">
          <p style="margin-bottom:18px;">Tu Carrito de Avión está vacío.</p>
          <a href="${SITE_ROOT}catalogo-consolidado/" class="btn btn-primary">${ICONS.plane} Ver Catálogo Consolidado</a>
        </div>`}
      </div>`;
    return;
  }

  const unidades = unidadesCarritoAvion(items);
  const unidadesParaMinimo = unidades + RESERVADAS_EN_CAMPANA;
  const faltan = Math.max(MINIMO - unidadesParaMinimo, 0);
  const subtotal = totalCarritoAvion(items);
  const totalEstimado = estimarTotalConDescuento(items);
  const descuento = Math.round((subtotal - totalEstimado) * 100) / 100;

  mount.innerHTML = `
    <div class="container">
      ${aviso}
      <div class="cart-layout">
        <div>
          ${items.map(filaCarritoAvion).join('')}
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-top:18px;">
            <a href="${SITE_ROOT}catalogo-consolidado/" class="link-arrow">&larr; Seguir agregando perfumes</a>
            <button type="button" class="link-arrow" id="btn-vaciar-avion" style="background:none; border:none; color:var(--color-text-faint);">Vaciar carrito</button>
          </div>
        </div>
        <aside class="summary-panel">
          <h3 class="avion-title" style="font-size:1.1rem; margin-bottom:16px;">${ICONS.plane} Resumen</h3>
          <div class="summary-line"><span>Unidades</span><span>${unidades}</span></div>
          <div class="summary-line"><span>Subtotal (precio consolidado)</span><span>${formatoMoneda(subtotal)}</span></div>
          ${descuento > 0 ? `<div class="summary-line"><span>Descuento por volumen (estimado)</span><span style="color:var(--color-success);">-${formatoMoneda(descuento)}</span></div>` : ''}
          <div class="summary-total"><span>Total estimado</span><span>${formatoMoneda(totalEstimado)}</span></div>
          ${RESERVADAS_EN_CAMPANA ? `<p class="form-hint" style="margin:-8px 0 12px;">Ya tienes ${RESERVADAS_EN_CAMPANA} unidad${RESERVADAS_EN_CAMPANA === 1 ? '' : 'es'} reservada${RESERVADAS_EN_CAMPANA === 1 ? '' : 's'} en esta campaña: cuentan para el mínimo.</p>` : ''}
          ${htmlProgresoAvion(unidadesParaMinimo, MINIMO)}
          ${htmlCierre(items, faltan)}
          <p class="form-hint" style="margin:14px 0 0;">Llega en <span data-cfg="envio_dias_texto">7 a 14</span> días aprox. después del cierre de la campaña. El precio final se confirma al reservar.</p>
        </aside>
      </div>
    </div>`;

  items.forEach((item) => {
    const fila = mount.querySelector(`.cart-row[data-id="${item.id_producto}"]`);
    fila.querySelector('.avion-menos').addEventListener('click', () => cambiarCantidadCarritoAvion(item.id_producto, item.cantidad - 1));
    fila.querySelector('.avion-mas').addEventListener('click', () => cambiarCantidadCarritoAvion(item.id_producto, item.cantidad + 1));
    fila.querySelector('.avion-cant').addEventListener('change', (e) => cambiarCantidadCarritoAvion(item.id_producto, e.target.value));
    fila.querySelector('.cr-remove').addEventListener('click', () => quitarDelCarritoAvion(item.id_producto));
  });
  document.getElementById('btn-vaciar-avion').addEventListener('click', () => {
    if (confirm('¿Vaciar tu Carrito de Avión?')) vaciarCarritoAvion();
  });
  document.getElementById('btn-confirmar-avion')?.addEventListener('click', confirmarReserva);
  // Los textos de configuración (días de envío) se vuelven a aplicar sobre lo recién dibujado.
  obtenerConfiguracionSitio().then((cfg) => cfg && mount.querySelectorAll('[data-cfg]').forEach((el) => { if (cfg[el.dataset.cfg]) el.textContent = cfg[el.dataset.cfg]; })).catch(() => {});
}

function filaCarritoAvion(item) {
  return `
    <div class="cart-row" data-id="${item.id_producto}">
      <div class="cr-media">${imagenProducto(item)}</div>
      <div>
        <p class="cr-name">${escapeHtml(item.marca)} — ${escapeHtml(item.nombre)}</p>
        <span class="cr-meta">${item.mililitros && item.mililitros > 1 ? `${item.mililitros} ml · ` : ''}${formatoMoneda(item.precio)} c/u</span>
        <div class="cr-subtotal">Subtotal: <strong>${formatoMoneda(item.precio * item.cantidad)}</strong></div>
      </div>
      <div class="cr-qty">
        <button type="button" class="avion-menos" aria-label="Una unidad menos">${ICONS.minus}</button>
        <input type="number" class="avion-cant" value="${item.cantidad}" min="1" max="${MAX_UNIDADES_AVION_POR_PERFUME}" inputmode="numeric" aria-label="Cantidad" />
        <button type="button" class="avion-mas" aria-label="Una unidad más">${ICONS.plus}</button>
      </div>
      <button type="button" class="cr-remove" aria-label="Quitar ${escapeHtml(item.nombre)}">${ICONS.trash}</button>
    </div>`;
}

// Bloque de cierre del pedido según haya campaña abierta, sesión y dirección.
function htmlCierre(items, faltan) {
  const whatsapp = enlaceWhatsappCarritoAvion(items, { nombre: nombreCliente(), campana: CAMPANA?.codigo_campana, minimo: MINIMO });
  const botonWhatsapp = faltan
    ? `<button type="button" class="btn btn-whatsapp" disabled title="Completa el mínimo de ${MINIMO} unidades">${ICONS.whatsapp} Enviar pedido por WhatsApp</button>`
    : `<a class="btn btn-whatsapp" href="${whatsapp}" target="_blank" rel="noopener">${ICONS.whatsapp} Enviar pedido por WhatsApp</a>`;
  const aviso = faltan ? `<div class="avion-aviso">Agrega <strong>${faltan} unidad${faltan === 1 ? '' : 'es'} más</strong> para completar el pedido mínimo de ${MINIMO}. <a href="${SITE_ROOT}catalogo-consolidado/" class="link-arrow">Agregar perfumes</a></div>` : '';

  if (!CAMPANA) {
    return `
      ${aviso}
      <div class="avion-campana">Ahora mismo no hay una campaña abierta para reservar en la web. <strong>Envíanos tu Carrito de Avión por WhatsApp</strong> y te confirmamos el precio final y la fecha de la próxima salida.</div>
      <div class="avion-acciones">${botonWhatsapp}</div>`;
  }

  const { cierre, texto } = calcularTiempoRestanteConsolidado(CAMPANA.fecha_cierre_programada);
  const cierreTexto = cierre.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const campana = `<div class="avion-campana">Campaña abierta: <strong>${escapeHtml(CAMPANA.codigo_campana)}</strong> · cierra el ${escapeHtml(cierreTexto)} (<strong>${escapeHtml(texto.toLowerCase())}</strong>).</div>`;
  const retorno = encodeURIComponent(`${SITE_ROOT}carrito-avion/`);

  let reservar;
  if (!SESION) {
    reservar = `<a class="btn btn-primary" href="${SITE_ROOT}cuenta/?retorno=${retorno}">Inicia sesión para reservar</a>`;
  } else if (!DIRECCIONES.length) {
    reservar = `<a class="btn btn-primary" href="${SITE_ROOT}cuenta/?tab=direcciones&retorno=${retorno}">Agrega una dirección de entrega para reservar</a>`;
  } else {
    reservar = `
      <div class="form-group" style="margin-bottom:4px;">
        <label for="select-direccion-avion">Entrega</label>
        <select id="select-direccion-avion">${DIRECCIONES.map((d) => `<option value="${d.id}" ${d.predeterminada ? 'selected' : ''}>${escapeHtml(d.etiqueta || 'Dirección')} — ${escapeHtml(d.tipo_despacho === 'Recojo_En_Tienda' ? etiquetaRecojoEnTienda('consolidado') : (d.tipo_despacho || '').replace(/_/g, ' '))}${d.agencia_nombre ? ` (${escapeHtml(d.agencia_nombre)})` : ''}</option>`).join('')}</select>
      </div>
      <button type="button" class="btn btn-primary" id="btn-confirmar-avion" ${faltan ? 'disabled' : ''}>${ICONS.plane} Confirmar reserva</button>`;
  }

  return `
    ${aviso}
    ${campana}
    <div class="avion-acciones">
      ${reservar}
      <div class="avion-separador">o</div>
      ${botonWhatsapp}
    </div>`;
}

async function confirmarReserva() {
  const btn = document.getElementById('btn-confirmar-avion');
  const idDireccion = Number(document.getElementById('select-direccion-avion')?.value);
  const items = leerCarritoAvion();
  if (!items.length || !idDireccion) return;
  btn.disabled = true;
  btn.textContent = 'Confirmando…';
  try {
    const resultado = await reservarCarritoAvion(CAMPANA.id, items, idDireccion);
    const pendientes = new Set(resultado.filter((r) => r.estado_item === 'Pendiente_Aprobacion').map((r) => r.id_producto));
    CONFIRMACION = { campana: CAMPANA.codigo_campana, items: items.map((i) => ({ ...i, pendiente: pendientes.has(i.id_producto) })) };
    RESERVADAS_EN_CAMPANA += unidadesCarritoAvion(items);
    AVISO_QUITADOS = [];
    vaciarCarritoAvion(); // dispara el evento y vuelve a dibujar con el resumen de la confirmación
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `${ICONS.plane} Confirmar reserva`;
  }
}

function htmlConfirmacion() {
  const { campana, items } = CONFIRMACION;
  const hayPendientes = items.some((i) => i.pendiente);
  const mensaje = `${mensajeWhatsappCarritoAvion(items, { nombre: nombreCliente(), campana }).replace('Quiero hacer este pedido', 'Acabo de reservar este pedido en la web')}`;
  return `
    <div class="avion-ok">
      <h3 style="margin:0 0 8px; font-size:1.15rem;">${ICONS.check} ¡Reserva confirmada en la campaña ${escapeHtml(campana)}!</h3>
      <p style="margin:0 0 10px;">Reservaste ${unidadesCarritoAvion(items)} unidades. Te avisaremos por WhatsApp cuando cierre la campaña para coordinar el pago y el envío.</p>
      <ul style="margin:0 0 10px; padding-left:18px;">
        ${items.map((i) => `<li>${i.cantidad} × ${escapeHtml(i.marca)} — ${escapeHtml(i.nombre)}${i.pendiente ? ' <em>(pendiente de aprobación por ser 10+ unidades)</em>' : ''}</li>`).join('')}
      </ul>
      ${hayPendientes ? '<p style="margin:0 0 10px;">Las cantidades grandes de un mismo perfume las revisa el equipo antes de confirmarlas.</p>' : ''}
      <div style="display:flex; flex-wrap:wrap; gap:10px;">
        <a class="btn btn-primary btn-sm" href="${SITE_ROOT}cuenta/?tab=reservas">Ver mis reservas</a>
        <a class="btn btn-whatsapp btn-sm" href="https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}" target="_blank" rel="noopener">${ICONS.whatsapp} Avisar por WhatsApp</a>
        <a class="btn btn-ghost btn-sm" href="${SITE_ROOT}catalogo-consolidado/">Seguir viendo el catálogo</a>
      </div>
    </div>`;
}
