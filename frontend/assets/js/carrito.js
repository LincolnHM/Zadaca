let CARRITO_ITEMS = [];
let DIRECCIONES = [];

document.addEventListener('DOMContentLoaded', async () => {
  iniciarLayout('carrito.html');

  if (!estaLogueado()) {
    document.getElementById('cart-mount').innerHTML = `
      <div class="container">
        <div class="empty-state">
          <p>Inicia sesión para ver tu carrito.</p>
          <a href="cuenta.html?retorno=carrito.html" class="btn btn-primary" style="margin-top:16px;">Ingresar</a>
        </div>
      </div>`;
    return;
  }
  cargarCarrito();
});

async function cargarCarrito() {
  const mount = document.getElementById('cart-mount');
  try {
    CARRITO_ITEMS = await apiFetch('/carrito');
    renderCarrito();
  } catch (err) {
    mount.innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

function renderCarrito() {
  const mount = document.getElementById('cart-mount');
  if (CARRITO_ITEMS.length === 0) {
    mount.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <p>Tu carrito está vacío.</p>
          <a href="catalogo.html" class="btn btn-primary" style="margin-top:16px;">Ir al catálogo</a>
        </div>
      </div>`;
    return;
  }

  const total = CARRITO_ITEMS.reduce((acc, i) => acc + i.cantidad * Number(i.precio_final), 0);

  mount.innerHTML = `
    <div class="container cart-layout">
      <div>
        ${CARRITO_ITEMS.map(filaCarrito).join('')}
      </div>
      <aside class="summary-panel">
        <h3 style="font-size:1.1rem; margin-bottom:20px;">Resumen del Pedido</h3>
        <div class="summary-line"><span>Subtotal</span><span>${formatoMoneda(total)}</span></div>
        <div class="summary-line"><span>Envío</span><span>Se coordina al despacho</span></div>
        <div class="summary-total"><span>Total</span><span>${formatoMoneda(total)}</span></div>
        <div id="direccion-mount"><div class="loading-state">Cargando direcciones…</div></div>
      </aside>
    </div>
  `;

  CARRITO_ITEMS.forEach((item) => {
    const minimo = item.es_liquidacion ? Math.max(Number(item.liquidacion_unidad_minima) || 1, 1) : 1;
    document.getElementById(`menos-${item.id}`).addEventListener('click', () => cambiarCantidad(item.id, item.cantidad - 1, minimo));
    document.getElementById(`mas-${item.id}`).addEventListener('click', () => cambiarCantidad(item.id, item.cantidad + 1, minimo));
    document.getElementById(`eliminar-${item.id}`).addEventListener('click', () => eliminarItem(item.id));
  });

  cargarDirecciones();
}

function filaCarrito(item) {
  const minimo = item.es_liquidacion ? Math.max(Number(item.liquidacion_unidad_minima) || 1, 1) : 1;
  return `
    <div class="cart-row">
      <div class="cr-media ${tonoPorGenero(item.genero)}">${mediaProducto(item.imagen_url, item.nombre)}</div>
      <div>
        <p class="cr-name">${escapeHtml(item.marca)} — ${escapeHtml(item.nombre)}${item.es_liquidacion ? ' <span class="badge badge-liquidacion">Liquidación</span>' : ''}</p>
        <span class="cr-meta">${item.mililitros} ml &middot; ${formatoMoneda(item.precio_final)} c/u${minimo > 1 ? ` &middot; mínimo ${minimo} uds.` : ''}</span>
      </div>
      <div class="cr-qty">
        <button type="button" id="menos-${item.id}">${ICONS.minus}</button>
        <input type="text" value="${item.cantidad}" readonly />
        <button type="button" id="mas-${item.id}">${ICONS.plus}</button>
      </div>
      <button class="cr-remove" id="eliminar-${item.id}" aria-label="Eliminar">${ICONS.trash}</button>
    </div>
  `;
}

async function cambiarCantidad(id, nuevaCantidad, minimo = 1) {
  if (nuevaCantidad < minimo) return eliminarItem(id);
  try {
    await apiFetch(`/carrito/${id}`, { method: 'PUT', body: JSON.stringify({ cantidad: nuevaCantidad }) });
    await cargarCarrito();
    actualizarBadgeCarrito();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function eliminarItem(id) {
  try {
    await apiFetch(`/carrito/${id}`, { method: 'DELETE' });
    mostrarToast('Producto eliminado del carrito');
    await cargarCarrito();
    actualizarBadgeCarrito();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function cargarDirecciones() {
  const mount = document.getElementById('direccion-mount');
  try {
    DIRECCIONES = await apiFetch('/direcciones');
    if (DIRECCIONES.length === 0) {
      mount.innerHTML = `<p class="form-hint" style="margin-bottom:14px;">Aún no tienes direcciones guardadas.</p>
        <a href="cuenta.html?tab=direcciones&retorno=carrito.html" class="btn btn-outline btn-block btn-sm">Agregar dirección</a>`;
      return;
    }
    mount.innerHTML = `
      <div class="form-group">
        <label>Dirección de entrega</label>
        <select id="select-direccion">
          ${DIRECCIONES.map((d) => `<option value="${d.id}" ${d.predeterminada ? 'selected' : ''}>${escapeHtml(d.etiqueta || 'Dirección')} — ${escapeHtml(d.direccion_detalle)}, ${escapeHtml(d.distrito)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-block" id="btn-checkout">Confirmar Pedido</button>
    `;
    document.getElementById('btn-checkout').addEventListener('click', confirmarPedido);
  } catch (err) {
    mount.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function confirmarPedido() {
  const btn = document.getElementById('btn-checkout');
  const idDireccion = Number(document.getElementById('select-direccion').value);
  btn.disabled = true;
  btn.textContent = 'Procesando…';
  try {
    const resultado = await apiFetch('/pedidos', { method: 'POST', body: JSON.stringify({ id_direccion_entrega: idDireccion }) });
    mostrarToast('¡Pedido creado con éxito!');
    window.location.href = `cuenta.html?tab=pedidos&pedido=${resultado.id_pedido}`;
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Confirmar Pedido';
  }
}
