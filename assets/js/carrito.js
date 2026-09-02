let CARRITO_ITEMS = [];

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('carrito/');
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('cart-mount').innerHTML = '<div class="container"><div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div></div>';
    return;
  }
  // Sin gate de sesión acá -- un visitante sin cuenta puede ver y editar su carrito de
  // invitado (guardado en localStorage, ver obtenerCarrito/agregarAlCarrito en api.js) igual
  // que uno logueado. Recién se le pide identificarse al confirmar el pedido (ver
  // cargarDirecciones), no antes.
  cargarCarrito();
});

async function cargarCarrito() {
  const mount = document.getElementById('cart-mount');
  try {
    CARRITO_ITEMS = await obtenerCarrito();
    renderCarrito();
  } catch (err) {
    mount.innerHTML = `<div class="container"><div class="empty-state">${err.message}</div></div>`;
  }
}

function renderCarrito() {
  const mount = document.getElementById('cart-mount');
  if (CARRITO_ITEMS.length === 0) {
    mount.innerHTML = `<div class="container"><div class="empty-state"><p>Tu carrito está vacío.</p><a href="${SITE_ROOT}catalogo/" class="btn btn-primary" style="margin-top:16px;">Ir al catálogo</a></div></div>`;
    return;
  }

  const total = CARRITO_ITEMS.reduce((acc, i) => acc + i.cantidad * precioFinalItem(i), 0);

  mount.innerHTML = `
    <div class="container cart-layout">
      <div>${CARRITO_ITEMS.map(filaCarrito).join('')}</div>
      <aside class="summary-panel">
        <h3 style="font-size:1.1rem; margin-bottom:20px;">Resumen del Pedido</h3>
        <div class="summary-line"><span>Subtotal</span><span>${formatoMoneda(total)}</span></div>
        <div class="summary-line"><span>Envío</span><span>Se coordina al despacho</span></div>
        <div class="summary-total"><span>Total</span><span>${formatoMoneda(total)}</span></div>
        <div id="direccion-mount"><div class="loading-state">Cargando direcciones…</div></div>
      </aside>
    </div>
    <div class="container" id="checkout-invitado-wrap"></div>
  `;

  CARRITO_ITEMS.forEach((item) => {
    const minimo = item.es_liquidacion ? Math.max(Number(item.liquidacion_unidad_minima) || 1, 1) : 1;
    document.getElementById(`menos-${item.id}`).addEventListener('click', () => cambiarCantidad(item.id, item.cantidad - 1, minimo, item.stock_disponible));
    document.getElementById(`mas-${item.id}`).addEventListener('click', () => cambiarCantidad(item.id, item.cantidad + 1, minimo, item.stock_disponible));
    document.getElementById(`eliminar-${item.id}`).addEventListener('click', () => eliminarItem(item.id));
  });

  cargarDirecciones();
}

function precioFinalItem(item) {
  return item.es_liquidacion ? Number(item.precio_liquidacion) : precioFinal(item.precio_tienda_regular, item.descuento_tienda_porcentaje);
}

function filaCarrito(item) {
  const final = precioFinalItem(item);
  const minimo = item.es_liquidacion ? Math.max(Number(item.liquidacion_unidad_minima) || 1, 1) : 1;
  return `
    <div class="cart-row">
      <div class="cr-media">${imagenProducto(item)}</div>
      <div>
        <p class="cr-name">${escapeHtml(item.marca)} — ${escapeHtml(item.nombre)}${item.es_liquidacion ? ' <span class="badge badge-liquidacion">Liquidación</span>' : ''}</p>
        <span class="cr-meta">${item.mililitros} ml &middot; ${formatoMoneda(final)} c/u${minimo > 1 ? ` &middot; mínimo ${minimo} uds.` : ''}</span>
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

// El botón "+" no tenía techo -- se podía seguir sumando unidades del carrito más allá del
// stock real, porque acá nunca se miraba stock_disponible (a diferencia de producto.html,
// que sí lo usa para el máximo del selector). "maximo" default 99 solo aplica si el item no
// trae stock_disponible por alguna razón, para no bloquear de más.
async function cambiarCantidad(id, nuevaCantidad, minimo = 1, maximo = 99) {
  if (nuevaCantidad < minimo) return eliminarItem(id);
  if (nuevaCantidad > maximo) {
    mostrarToast(`Solo hay ${maximo} unidad${maximo === 1 ? '' : 'es'} disponible${maximo === 1 ? '' : 's'}`, 'error');
    return;
  }
  try {
    await actualizarCantidadCarrito(id, nuevaCantidad);
    // No se vuelve a pedir el carrito al servidor acá: un GET inmediatamente después de este
    // update a veces trae de vuelta una respuesta vieja (cacheada por el navegador/CDN, misma
    // URL que la del último GET), y el producto parecía "no actualizarse". Como el update de
    // arriba ya confirmó que se guardó, alcanza con reflejarlo en el estado local.
    const item = CARRITO_ITEMS.find((i) => i.id === id);
    if (item) item.cantidad = nuevaCantidad;
    renderCarrito();
    actualizarEstadoSesionHeader();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function eliminarItem(id) {
  try {
    await eliminarDelCarrito(id);
    mostrarToast('Producto eliminado del carrito');
    // Mismo motivo que en cambiarCantidad(): no se vuelve a pedir el carrito al servidor,
    // se quita el item del estado local ya que el delete de arriba confirmó el borrado.
    CARRITO_ITEMS = CARRITO_ITEMS.filter((i) => i.id !== id);
    renderCarrito();
    actualizarEstadoSesionHeader();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function cargarDirecciones() {
  const mount = document.getElementById('direccion-mount');
  const session = await obtenerSesion();
  if (!session) {
    // El formulario de invitado tiene muchos campos -- si se mete en esta misma columna
    // angosta de 380px (pensada solo para el resumen), la página queda larguísima. Se renderiza
    // a lo ancho completo, debajo de las dos columnas (ver #checkout-invitado-wrap en
    // renderCarrito), y acá solo queda un aviso corto.
    mount.innerHTML = '<p class="form-hint">Completa tus datos más abajo para continuar &darr;</p>';
    renderCheckoutInvitado(document.getElementById('checkout-invitado-wrap'));
    return;
  }

  try {
    const direcciones = await obtenerDirecciones();
    if (direcciones.length === 0) {
      mount.innerHTML = `<p class="form-hint" style="margin-bottom:14px;">Aún no tienes direcciones guardadas.</p>
        <a href="${SITE_ROOT}cuenta/?tab=direcciones&retorno=${encodeURIComponent(SITE_ROOT + 'carrito/')}" class="btn btn-outline btn-block btn-sm">Agregar dirección</a>`;
      return;
    }
    mount.innerHTML = `
      <div class="form-group">
        <label>Dirección de entrega</label>
        <select id="select-direccion">
          ${direcciones.map((d) => `<option value="${d.id}" ${d.predeterminada ? 'selected' : ''}>${escapeHtml(d.etiqueta || 'Dirección')} — ${escapeHtml(d.direccion_detalle)}, ${escapeHtml(d.distrito)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-block" id="btn-checkout">Confirmar Pedido</button>
    `;
    document.getElementById('btn-checkout').addEventListener('click', confirmarPedido);
  } catch (err) {
    mount.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// Checkout sin cuenta previa: pide los datos necesarios de un pedido normal (identidad +
// dirección de envío) a lo ancho completo de la página, no metido en la columna angosta del
// resumen (esa se pensó para 4 líneas de totales, no para un formulario entero). La contraseña
// / creación de cuenta NO se muestra por defecto -- solo si el cliente marca la casilla "Crear
// una cuenta" (ver conectarCheckboxCrearCuenta). Si no la marca, igual se crea una cuenta
// liviana por dentro (ver crearPedidoInvitado en api.js, necesaria para que el pedido tenga
// dueño), pero con una contraseña aleatoria que el cliente nunca ve -- puede recuperarla más
// adelante con "¿Olvidaste tu contraseña?" si alguna vez quiere entrar a "Mis Pedidos".
async function renderCheckoutInvitado(mount) {
  mount.innerHTML = '<div class="loading-state">Cargando…</div>';
  let ubigeos, cfg;
  try {
    [ubigeos, cfg] = await Promise.all([obtenerUbigeos(), obtenerConfiguracionSitio()]);
  } catch (err) {
    mount.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    return;
  }

  mount.innerHTML = `
    <div class="form-card" style="max-width:820px; margin:0 auto;">
      <h3 style="font-size:1rem; margin-bottom:4px;">Completa tus datos para continuar</h3>
      <p class="form-hint" style="margin-bottom:18px;">Solo lo necesario para tu pedido -- si quieres, más abajo puedes crear una cuenta para guardar estos datos y ver tus pedidos la próxima vez.</p>
      <form id="checkout-invitado-form">
        <div class="form-row-3">
          <div class="form-group"><label>Nombres</label><input type="text" name="nombres" required /></div>
          <div class="form-group"><label>Apellidos</label><input type="text" name="apellidos" required /></div>
          <div class="form-group"><label>Teléfono</label><input type="text" name="telefono" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>DNI / CE / RUC</label><input type="text" name="dni_ce_ruc" maxlength="15" /></div>
          <div class="form-group"><label>Correo</label><input type="email" name="correo" required /></div>
        </div>

        <label class="filter-option" style="margin:2px 0 16px;">
          <input type="checkbox" id="checkout-crear-cuenta" /> Crear una cuenta con contraseña para guardar mis datos y ver mis pedidos más fácil la próxima vez
        </label>
        <div id="checkout-password-wrap" style="display:none;">${formularioContrasenaHtml('checkout')}</div>

        <h3 style="font-size:1rem; margin:6px 0 14px; padding-top:14px; border-top:1px solid var(--color-border);">¿A dónde lo enviamos?</h3>
        <div class="form-row">
          <div class="form-group"><label>¿Quién recibe/recoge el pedido?</label><input type="text" name="nombre_receptor" placeholder="Déjalo vacío si eres tú mismo" /></div>
          <div class="form-group">
            <label>Tipo de despacho</label>
            <select name="tipo_despacho" id="tipo-despacho-select" required>
              <option value="Domicilio">Entrega a domicilio</option>
              <option value="Agencia_Shalom">Agencia Shalom</option>
              <option value="Agencia_Olva">Agencia Olva</option>
              <option value="Recojo_En_Tienda">Recojo en almacén (Lima)</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Dirección</label><textarea name="direccion_detalle" rows="2" required></textarea></div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Departamento</label>
            <select id="ubigeo-depto-select" required><option value="">Selecciona...</option>${[...new Set(ubigeos.map((u) => u.departamento))].sort().map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}</select>
          </div>
          <div class="form-group">
            <label>Provincia</label>
            <select id="ubigeo-prov-select" required disabled><option value="">Elige primero el departamento</option></select>
          </div>
          <div class="form-group">
            <label>Distrito</label>
            <select name="codigo_ubigeo" id="ubigeo-dist-select" required disabled><option value="">Elige primero la provincia</option></select>
          </div>
        </div>
        <div class="form-group" id="agencia-group" style="display:none;"><label>Nombre de la agencia</label><input type="text" name="agencia_nombre" /></div>
        <p class="form-hint" id="recojo-hint" style="display:none; margin:-10px 0 18px;">El recojo es en nuestro almacén de Lima: ${escapeHtml(cfg?.direccion_lima || 'Jr. Ávila Godoy 664, San Martín de Porres')}. No es tienda física de atención al público.</p>
        <button type="submit" class="btn btn-primary btn-block" id="checkout-invitado-submit">Confirmar Pedido</button>
      </form>
      <p class="form-hint" style="margin-top:14px;">¿Ya tienes cuenta? <a href="${SITE_ROOT}cuenta/?retorno=${encodeURIComponent(SITE_ROOT + 'carrito/')}" class="link-arrow">Inicia sesión</a> para usar una dirección guardada.</p>
    </div>
  `;

  activarTogglesPassword(mount);
  conectarCheckboxCrearCuenta();
  iniciarSelectsUbigeoCascada(ubigeos);

  document.getElementById('tipo-despacho-select').addEventListener('change', (e) => {
    document.getElementById('agencia-group').style.display = e.target.value.startsWith('Agencia') ? '' : 'none';
    document.getElementById('recojo-hint').style.display = e.target.value === 'Recojo_En_Tienda' ? '' : 'none';
  });

  document.getElementById('checkout-invitado-form').addEventListener('submit', confirmarPedidoInvitado);
}

// La casilla "Crear una cuenta" muestra/oculta el bloque de contraseña y, mientras está
// visible, el botón queda atado a la misma validación en vivo que el registro normal
// (conectarValidacionContrasena) -- destapada recién al marcar la casilla, para no arrancar
// con el botón deshabilitado por una contraseña que ni siquiera se está pidiendo todavía.
function conectarCheckboxCrearCuenta() {
  const checkbox = document.getElementById('checkout-crear-cuenta');
  const wrap = document.getElementById('checkout-password-wrap');
  const submit = document.getElementById('checkout-invitado-submit');
  let conectada = false;

  checkbox.addEventListener('change', () => {
    wrap.style.display = checkbox.checked ? '' : 'none';
    wrap.querySelectorAll('input[name="contrasena"], input[name="confirmar_contrasena"]').forEach((input) => {
      input.required = checkbox.checked;
    });
    if (checkbox.checked) {
      if (!conectada) { conectarValidacionContrasena('checkout', 'checkout-invitado-submit'); conectada = true; }
      actualizarValidacionContrasena('checkout', 'checkout-invitado-submit');
    } else {
      submit.disabled = false;
    }
  });
}

// Genera una contraseña que cumple los mismos requisitos que passwordValida() (mínimo 8,
// mayúscula, número, carácter especial) para la cuenta liviana que se crea cuando el cliente
// NO marcó "Crear una cuenta" -- nunca se le muestra; si alguna vez quiere entrar, la
// restablece con "¿Olvidaste tu contraseña?" (llega por correo, no depende de recordar esta).
function generarPasswordAleatoria() {
  const minusculas = 'abcdefghijkmnpqrstuvwxyz';
  const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '23456789';
  const especiales = '!@#$%*?';
  const pool = minusculas + mayusculas + numeros + especiales;
  const elegir = (set) => set[Math.floor(Math.random() * set.length)];
  let extra = '';
  for (let i = 0; i < 10; i++) extra += elegir(pool);
  return elegir(mayusculas) + elegir(minusculas) + elegir(numeros) + elegir(especiales) + extra;
}

async function confirmarPedidoInvitado(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));

  // Con la casilla "Crear una cuenta" marcada, se exige y valida la contraseña que escribió el
  // cliente (misma regla que el registro normal). Sin marcar, se genera una al azar que nunca
  // ve -- igual hace falta una cuenta por dentro para que el pedido tenga dueño (ver
  // crearPedidoInvitado en api.js), pero no se le pide pensar una contraseña para eso.
  const creaCuenta = document.getElementById('checkout-crear-cuenta').checked;
  if (creaCuenta) {
    if (!passwordValida(data.contrasena) || data.contrasena !== data.confirmar_contrasena) {
      mostrarToast('Revisa los requisitos de la contraseña antes de continuar.', 'error');
      return;
    }
  } else {
    data.contrasena = generarPasswordAleatoria();
  }

  const datosCuenta = { nombres: data.nombres, apellidos: data.apellidos, dni_ce_ruc: data.dni_ce_ruc || null, telefono: data.telefono, correo: data.correo, contrasena: data.contrasena };
  const datosDireccion = {
    etiqueta: 'Principal',
    direccion_detalle: data.direccion_detalle,
    codigo_ubigeo: data.codigo_ubigeo,
    tipo_despacho: data.tipo_despacho,
    agencia_nombre: data.agencia_nombre || null,
    nombre_receptor: data.nombre_receptor || null,
    predeterminada: true,
  };

  const btn = document.getElementById('checkout-invitado-submit');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Procesando…';
  try {
    const { pedidoId } = await crearPedidoInvitado(datosCuenta, datosDireccion);
    if (pedidoId) {
      const montoTotal = CARRITO_ITEMS.reduce((acc, i) => acc + i.cantidad * precioFinalItem(i), 0);
      window.open(enlaceWhatsappConfirmarPedido({ idPedido: pedidoId, items: CARRITO_ITEMS, montoTotal }), '_blank', 'noopener');
      mostrarToast('¡Pedido creado! Confirma el pago por WhatsApp.');
      window.location.href = `${SITE_ROOT}cuenta/?tab=pedidos&pedido=${pedidoId}`;
    } else {
      // Sin sesión inmediata: el proyecto tiene confirmación de correo activa. El pedido se
      // completa solo apenas el cliente confirme e inicie sesión (ver
      // intentarResumirCheckoutPendiente en api.js).
      mostrarToast('Cuenta creada. Revisa tu correo para confirmar -- apenas ingreses, tu pedido queda listo solo.');
      btn.textContent = 'Revisa tu correo para continuar';
    }
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

async function confirmarPedido() {
  const btn = document.getElementById('btn-checkout');
  const idDireccion = Number(document.getElementById('select-direccion').value);
  btn.disabled = true;
  btn.textContent = 'Procesando…';
  try {
    const montoTotal = CARRITO_ITEMS.reduce((acc, i) => acc + i.cantidad * precioFinalItem(i), 0);
    const idPedido = await crearPedido(idDireccion);
    // Todavía no hay pasarela de pago -- se abre WhatsApp con el pedido ya creado para que el
    // cliente coordine el pago ahí mismo (ver enlaceWhatsappConfirmarPedido en api.js).
    window.open(enlaceWhatsappConfirmarPedido({ idPedido, items: CARRITO_ITEMS, montoTotal }), '_blank', 'noopener');
    mostrarToast('¡Pedido creado! Confirma el pago por WhatsApp.');
    window.location.href = `${SITE_ROOT}cuenta/?tab=pedidos&pedido=${idPedido}`;
  } catch (err) {
    mostrarToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Confirmar Pedido';
  }
}
