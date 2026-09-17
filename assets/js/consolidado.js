let CONSOLIDADO_ID = null;

document.addEventListener('DOMContentLoaded', async () => {
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
        <p class="avion-minimo-note">Los perfumes de esta campaña llegan por importación grupal (viajan por avión junto con los del resto de clientes), no de stock inmediato. Ve agregando lo que quieras reservar y confirma todo junto.</p>
        ${abierto
          ? `<div id="progreso-volumen-mount"></div><div id="mis-reservas-mount"></div><div id="reserva-form-mount"></div>`
          : `<p style="font-size:0.85rem; color:var(--color-text-muted);">${vencido && c.estado === 'Abierto' ? `El plazo para reservar venció el ${cierreTexto}. Escríbenos por WhatsApp si aún quieres participar.` : 'Esta campaña ya no admite nuevas reservas.'}</p>`}
      </aside>
    </div>
  `;

  if (abierto) renderFormularioReserva();
}

let PROGRESO_VOLUMEN = null;
let DESCUENTOS_VOLUMEN = [];
let DIRECCIONES_CLIENTE = [];
let MINIMO_UNIDADES_CONSOLIDADO = 4;
let UNIDADES_YA_RESERVADAS = 0;

// Carrito de Avión: perfumes que el cliente va sumando ANTES de confirmar la reserva de
// verdad (que recién dispara reservarEnConsolidado, ver confirmarCarritoAvion). Se guarda en
// localStorage por campaña (mismo patrón que el carrito de invitado en api.js) para no perder
// lo que llevaba armado si recarga la página por accidente antes de confirmar.
let CARRITO_AVION = [];
function claveCarritoAvion(idConsolidado) {
  return `zadaca_carrito_avion_${idConsolidado}`;
}
function leerCarritoAvion(idConsolidado) {
  try {
    return JSON.parse(localStorage.getItem(claveCarritoAvion(idConsolidado)) || '[]');
  } catch {
    return [];
  }
}
function guardarCarritoAvion(idConsolidado, items) {
  try {
    localStorage.setItem(claveCarritoAvion(idConsolidado), JSON.stringify(items));
  } catch { /* localStorage bloqueado (modo privado, etc.) -- el carrito de avión no persiste entre visitas, pero no rompe nada en la actual */ }
}

async function renderFormularioReserva() {
  const mount = document.getElementById('reserva-form-mount');
  const session = await obtenerSesion();
  if (!session) {
    mount.innerHTML = `<a href="${SITE_ROOT}cuenta/?retorno=${encodeURIComponent(SITE_ROOT + 'consolidado/?id=' + CONSOLIDADO_ID)}" class="btn btn-primary btn-block">Inicia sesión para reservar</a>`;
    return;
  }
  mount.innerHTML = '<div class="loading-state">Cargando…</div>';
  try {
    const [direcciones, progreso, descuentos, misReservas, cfg] = await Promise.all([
      obtenerDirecciones(),
      obtenerProgresoVolumenConsolidado(CONSOLIDADO_ID).catch(() => null),
      obtenerDescuentosVolumen().catch(() => []),
      obtenerMisReservas().catch(() => []),
      obtenerConfiguracionSitio().catch(() => null),
    ]);
    DIRECCIONES_CLIENTE = direcciones;
    PROGRESO_VOLUMEN = progreso;
    DESCUENTOS_VOLUMEN = descuentos;
    MINIMO_UNIDADES_CONSOLIDADO = Number(cfg?.consolidado_minimo_unidades) || 4;
    // Solo cuentan para el mínimo las reservas de ESTA campaña que siguen vigentes -- una ya
    // convertida en pedido (campaña cerrada) no es parte del carrito de avión que se está
    // armando ahora.
    UNIDADES_YA_RESERVADAS = misReservas
      .filter((r) => String(r.id_consolidado) === String(CONSOLIDADO_ID) && (r.estado_item === 'Reservado' || r.estado_item === 'Pendiente_Aprobacion'))
      .reduce((acc, r) => acc + Number(r.cantidad), 0);
    CARRITO_AVION = leerCarritoAvion(CONSOLIDADO_ID);
    renderProgresoVolumen();
    renderMisReservas();

    mount.innerHTML = `
      <form id="reserva-form">
        <div class="form-group">
          <label>Perfume</label>
          <div class="combo-perfume">
            <input type="text" id="buscador-perfume" placeholder="Escribe el nombre o la marca…" autocomplete="off" required />
            <input type="hidden" name="id_producto" />
            <input type="hidden" name="precio_base" />
            <input type="hidden" name="imagen_url" />
            <div class="combo-resultados" id="combo-resultados"></div>
          </div>
        </div>
        <div class="form-group"><label>Cantidad</label><input type="number" name="cantidad" id="cantidad-input" value="1" min="1" required /></div>
        <div class="form-hint" id="precio-estimado-hint" style="margin-bottom:14px;"></div>
        <button type="submit" class="btn btn-outline btn-block" id="btn-agregar-avion">Agregar al Carrito de Avión</button>
      </form>
      <div id="avion-cart-mount" style="margin-top:22px;"></div>
    `;
    iniciarBuscadorPerfume();
    document.getElementById('cantidad-input').addEventListener('input', actualizarPrecioEstimado);
    document.getElementById('reserva-form').addEventListener('submit', agregarAlCarritoAvionUI);
    renderCarritoAvion();
  } catch (err) {
    mount.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// Le muestra al cliente cuánto lleva acumulado en soles en esta campaña (sumando todos los
// perfumes que ya reservó, no solo uno), el descuento por unidad que ya tiene ganado, y
// cuánto le falta para el siguiente escalón — ver migración 0005 y progreso_volumen_consolidado().
function renderProgresoVolumen() {
  const mount = document.getElementById('progreso-volumen-mount');
  if (!mount) return;
  if (!PROGRESO_VOLUMEN || !DESCUENTOS_VOLUMEN.length) { mount.innerHTML = ''; return; }
  const { total_acumulado: total, descuento_actual: descuento, siguiente_umbral: siguienteUmbral, siguiente_descuento: siguienteDescuento, falta_para_siguiente: falta } = PROGRESO_VOLUMEN;
  mount.innerHTML = `
    <div class="volumen-progreso">
      <div class="volumen-progreso-linea">Llevas acumulado <strong>${formatoMoneda(total)}</strong> en esta campaña${descuento > 0 ? ` — ya tienes <strong style="color:var(--color-gold)">-${formatoMoneda(descuento)}</strong> por unidad` : ''}.</div>
      ${siguienteUmbral
        ? `<div class="volumen-progreso-linea">Te faltan <strong>${formatoMoneda(falta)}</strong> para llegar a S/ ${Number(siguienteUmbral).toLocaleString('es-PE')} y bajar a <strong style="color:var(--color-gold)">-${formatoMoneda(siguienteDescuento)}</strong> por unidad.</div>`
        : total > 0 ? '<div class="volumen-progreso-linea">Ya alcanzaste el mejor precio por volumen de esta campaña.</div>' : ''}
    </div>`;
}

function renderMisReservas() {
  const mount = document.getElementById('mis-reservas-mount');
  if (!mount) return;
  if (UNIDADES_YA_RESERVADAS <= 0) { mount.innerHTML = ''; return; }
  mount.innerHTML = `<p class="form-hint" style="margin-bottom:16px;">Ya llevas <strong>${UNIDADES_YA_RESERVADAS} unidad${UNIDADES_YA_RESERVADAS === 1 ? '' : 'es'}</strong> reservada${UNIDADES_YA_RESERVADAS === 1 ? '' : 's'} en esta campaña. Lo que agregues abajo se suma a eso.</p>`;
}

// Vista previa del precio ANTES de reservar (mismo cálculo que hace el servidor en
// reservar_en_consolidado, ver api.js). Se suma lo ya acumulado en el servidor + lo que ya
// lleva el Carrito de Avión sin confirmar, para que el estimado no ignore lo que el cliente
// ya viene juntando en esta misma visita.
function actualizarPrecioEstimado() {
  const hint = document.getElementById('precio-estimado-hint');
  if (!hint) return;
  const form = document.getElementById('reserva-form');
  const precioBase = Number(form.precio_base.value);
  const cantidad = Number(form.cantidad.value);
  if (!precioBase || !cantidad || cantidad < 1) { hint.textContent = ''; return; }
  const montoCarritoAvion = CARRITO_AVION.reduce((acc, i) => acc + i.cantidad * i.precio_base, 0);
  const acumuladoPrevio = (PROGRESO_VOLUMEN ? Number(PROGRESO_VOLUMEN.total_acumulado) : 0) + montoCarritoAvion;
  const precioUnidad = DESCUENTOS_VOLUMEN.length
    ? estimarPrecioConsolidadoPorVolumen(precioBase, acumuladoPrevio, cantidad, DESCUENTOS_VOLUMEN)
    : precioBase;
  hint.innerHTML = `Precio estimado: <strong style="color:var(--color-gold)">${formatoMoneda(precioUnidad)}</strong> por unidad &middot; total ${formatoMoneda(precioUnidad * cantidad)}`;
}

// Agregar NO reserva todavía -- solo suma la fila al Carrito de Avión (local), igual que
// "Agregar al Carrito" en un producto normal no crea el pedido de una. Recién
// confirmarCarritoAvion() llama a reservarEnConsolidado() por cada línea.
function agregarAlCarritoAvionUI(e) {
  e.preventDefault();
  const form = e.target;
  const idProducto = Number(form.id_producto.value);
  const precioBase = Number(form.precio_base.value);
  const cantidad = Number(form.cantidad.value);
  if (!idProducto || !precioBase) { mostrarToast('Elige un perfume de la lista de resultados', 'error'); return; }
  if (!Number.isInteger(cantidad) || cantidad < 1) { mostrarToast('Elige una cantidad válida', 'error'); return; }

  const existente = CARRITO_AVION.find((i) => i.id_producto === idProducto);
  if (existente) existente.cantidad += cantidad;
  else {
    CARRITO_AVION.push({
      id_producto: idProducto,
      marca: form.dataset.marcaElegida || '',
      nombre: form.dataset.nombreElegido || '',
      imagen_url: form.imagen_url.value || null,
      precio_base: precioBase,
      cantidad,
    });
  }
  guardarCarritoAvion(CONSOLIDADO_ID, CARRITO_AVION);
  renderCarritoAvion();
  mostrarToast('Agregado al Carrito de Avión');

  form.reset();
  form.id_producto.value = '';
  form.precio_base.value = '';
  form.imagen_url.value = '';
  document.getElementById('cantidad-input').value = 1;
  document.getElementById('precio-estimado-hint').textContent = '';
}

function renderCarritoAvion() {
  const mount = document.getElementById('avion-cart-mount');
  if (!mount) return;

  const totalUnidadesCarrito = CARRITO_AVION.reduce((acc, i) => acc + i.cantidad, 0);
  const totalUnidades = UNIDADES_YA_RESERVADAS + totalUnidadesCarrito;
  const totalMonto = CARRITO_AVION.reduce((acc, i) => acc + i.cantidad * i.precio_base, 0);
  const faltan = Math.max(MINIMO_UNIDADES_CONSOLIDADO - totalUnidades, 0);

  if (!CARRITO_AVION.length) {
    mount.innerHTML = `<p class="form-hint">Tu Carrito de Avión está vacío. Busca un perfume arriba para empezar.</p>`;
    return;
  }

  mount.innerHTML = `
    <h4 style="font-size:0.9rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-chrome-dim); margin-bottom:10px;">Tu Carrito de Avión</h4>
    ${CARRITO_AVION.map(filaCarritoAvion).join('')}
    <div class="summary-panel" style="position:static; padding:18px; margin-top:14px;">
      <div class="summary-line"><span>Unidades en este carrito</span><span>${totalUnidadesCarrito}</span></div>
      <div class="summary-line"><span>Precio estimado</span><span>${formatoMoneda(totalMonto)}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.min(Math.round((100 * totalUnidades) / MINIMO_UNIDADES_CONSOLIDADO), 100)}%"></div></div>
      <div class="progress-label" style="margin-bottom:0;">
        <span>${totalUnidades} de ${MINIMO_UNIDADES_CONSOLIDADO} unidades mínimas</span>
        <span>${faltan > 0 ? `Faltan ${faltan}` : '¡Listo!'}</span>
      </div>
      ${DIRECCIONES_CLIENTE.length
        ? `<div class="form-group" style="margin-top:16px;">
            <label>Entrega</label>
            <select id="select-direccion-avion">${DIRECCIONES_CLIENTE.map((d) => `<option value="${d.id}" ${d.predeterminada ? 'selected' : ''}>${escapeHtml(d.etiqueta || 'Dirección')} — ${escapeHtml(d.tipo_despacho === 'Recojo_En_Tienda' ? 'Recojo en almacén (Lima)' : (d.tipo_despacho || '').replace(/_/g, ' '))}${d.agencia_nombre ? ' (' + escapeHtml(d.agencia_nombre) + ')' : ''}</option>`).join('')}</select>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="btn-confirmar-avion" ${faltan > 0 ? 'disabled' : ''} style="margin-top:6px;">${ICONS.plane} Confirmar Reserva de Avión</button>`
        : `<p class="form-hint" style="margin-top:16px;">No tienes direcciones guardadas. <a href="${SITE_ROOT}cuenta/?tab=direcciones&retorno=${encodeURIComponent(SITE_ROOT + 'consolidado/?id=' + CONSOLIDADO_ID)}" class="link-arrow">Agregar una</a></p>`}
    </div>
  `;

  CARRITO_AVION.forEach((item) => {
    document.getElementById(`avion-menos-${item.id_producto}`)?.addEventListener('click', () => cambiarCantidadAvion(item.id_producto, item.cantidad - 1));
    document.getElementById(`avion-mas-${item.id_producto}`)?.addEventListener('click', () => cambiarCantidadAvion(item.id_producto, item.cantidad + 1));
    document.getElementById(`avion-eliminar-${item.id_producto}`)?.addEventListener('click', () => eliminarDeCarritoAvion(item.id_producto));
  });
  document.getElementById('btn-confirmar-avion')?.addEventListener('click', confirmarCarritoAvion);
}

function filaCarritoAvion(item) {
  return `
    <div class="cart-row">
      <div class="cr-media">${imagenProducto(item)}</div>
      <div>
        <p class="cr-name">${escapeHtml(item.marca)} — ${escapeHtml(item.nombre)}</p>
        <span class="cr-meta">${formatoMoneda(item.precio_base)} c/u</span>
      </div>
      <div class="cr-qty">
        <button type="button" id="avion-menos-${item.id_producto}">${ICONS.minus}</button>
        <input type="text" value="${item.cantidad}" readonly />
        <button type="button" id="avion-mas-${item.id_producto}">${ICONS.plus}</button>
      </div>
      <button class="cr-remove" id="avion-eliminar-${item.id_producto}" aria-label="Eliminar">${ICONS.trash}</button>
    </div>
  `;
}

function cambiarCantidadAvion(idProducto, nuevaCantidad) {
  if (nuevaCantidad < 1) return eliminarDeCarritoAvion(idProducto);
  const item = CARRITO_AVION.find((i) => i.id_producto === idProducto);
  if (item) item.cantidad = nuevaCantidad;
  guardarCarritoAvion(CONSOLIDADO_ID, CARRITO_AVION);
  renderCarritoAvion();
}

function eliminarDeCarritoAvion(idProducto) {
  CARRITO_AVION = CARRITO_AVION.filter((i) => i.id_producto !== idProducto);
  guardarCarritoAvion(CONSOLIDADO_ID, CARRITO_AVION);
  renderCarritoAvion();
}

// Confirma TODO el Carrito de Avión de una: recorre cada línea y recién ahí llama a
// reservarEnConsolidado() (que valida y calcula el precio del lado del servidor, ver api.js),
// una por una -- si alguna falla a mitad de camino, las que ya se confirmaron se sacan del
// carrito local (no se pierden ni se duplican si el cliente reintenta) y el resto queda
// esperando para reintentarlo.
async function confirmarCarritoAvion() {
  const btn = document.getElementById('btn-confirmar-avion');
  const idDireccion = Number(document.getElementById('select-direccion-avion').value);
  btn.disabled = true;
  btn.textContent = 'Confirmando…';

  let algunaPendienteAprobacion = false;
  const pendientes = [...CARRITO_AVION];
  try {
    while (pendientes.length) {
      const item = pendientes[0];
      const estado = await reservarEnConsolidado(CONSOLIDADO_ID, item.id_producto, item.cantidad, idDireccion);
      if (estado === 'Pendiente_Aprobacion') algunaPendienteAprobacion = true;
      pendientes.shift();
      CARRITO_AVION = CARRITO_AVION.filter((i) => i.id_producto !== item.id_producto);
      guardarCarritoAvion(CONSOLIDADO_ID, CARRITO_AVION);
    }
    mostrarToast(algunaPendienteAprobacion
      ? '¡Reserva confirmada! Una cantidad grande de un mismo perfume quedó pendiente de aprobación del equipo.'
      : '¡Reserva de avión confirmada con éxito!');
    cargarConsolidado();
  } catch (err) {
    mostrarToast(err.message, 'error');
    renderCarritoAvion();
  }
}

// Antes el selector de perfume era un <select> con como mucho 48 de los 217 perfumes del
// catálogo (los primeros por orden alfabético) — el resto simplemente no se podía reservar.
// Este buscador consulta el catálogo completo por texto a medida que el cliente escribe, así
// que cualquier perfume es encontrable sin importar dónde caiga alfabéticamente.
function iniciarBuscadorPerfume() {
  const input = document.getElementById('buscador-perfume');
  const form = document.getElementById('reserva-form');
  const hidden = form.querySelector('input[name="id_producto"]');
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
              <button type="button" class="combo-opcion" data-id="${p.id}" data-precio="${p.precio_consolidado_fijo}" data-marca="${escapeHtml(p.marca)}" data-nombre="${escapeHtml(p.nombre)}" data-imagen="${escapeHtml(p.imagen_url || '')}" data-label="${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}">
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
    form.querySelector('input[name="precio_base"]').value = opcion.dataset.precio;
    form.querySelector('input[name="imagen_url"]').value = opcion.dataset.imagen;
    form.dataset.marcaElegida = opcion.dataset.marca;
    form.dataset.nombreElegido = opcion.dataset.nombre;
    resultados.innerHTML = '';
    resultados.classList.remove('open');
    actualizarPrecioEstimado();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.combo-perfume')) resultados.classList.remove('open');
  });
}
