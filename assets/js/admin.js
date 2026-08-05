const ESTADOS_CONSOLIDADO = ['Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito', 'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado'];
const ESTADOS_RESERVA = ['Reservado', 'Confirmado', 'Cancelado', 'Convertido_A_Pedido'];
let PERFIL_ADMIN = null;
let COTIZACION_ORIGEN = null; // id de la cotización que se está convirtiendo en producto, si aplica

document.addEventListener('DOMContentLoaded', async () => {
  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('admin-login-screen').innerHTML = '<div class="form-card"><p class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md) antes de usar el panel admin.</p></div>';
    return;
  }

  document.getElementById('admin-login-form').addEventListener('submit', manejarLogin);
  document.getElementById('admin-logout-btn').addEventListener('click', cerrarSesion);

  PERFIL_ADMIN = await obtenerPerfilAdmin();
  if (PERFIL_ADMIN) mostrarShell();
});

async function manejarLogin(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const alerta = document.getElementById('admin-login-alert');
  alerta.innerHTML = '';
  try {
    await iniciarSesion(data);
    PERFIL_ADMIN = await obtenerPerfilAdmin();
    if (!PERFIL_ADMIN) {
      await supabaseClient.auth.signOut();
      alerta.innerHTML = '<div class="alert alert-error">Esta cuenta no tiene permisos de administrador.</div>';
      return;
    }
    mostrarShell();
  } catch (err) {
    alerta.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function mostrarShell() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-shell').classList.add('visible');
  configurarNavegacion();
  configurarModales();
  cargarSeccion('dashboard');
  actualizarBadgesNav();
}

function configurarNavegacion() {
  document.querySelectorAll('.admin-nav-btn[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn[data-section]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-section').forEach((s) => s.classList.remove('active'));
      document.getElementById(`section-${btn.dataset.section}`).classList.add('active');
      cargarSeccion(btn.dataset.section);
    });
  });
}

function cargarSeccion(nombre) {
  const cargadores = {
    dashboard: cargarDashboard,
    productos: cargarProductos,
    margenes: cargarMargenes,
    pedidos: cargarPedidos,
    consolidados: cargarConsolidados,
    reservas: cargarTodasLasReservas,
    clientes: cargarClientes,
    resenas: cargarResenas,
    cotizaciones: cargarCotizaciones,
    contabilidad: cargarContabilidad,
  };
  cargadores[nombre]?.();
}

async function actualizarBadgesNav() {
  try {
    const stats = await obtenerEstadisticasDashboard();
    setBadge('badge-resenas', stats.resenasPendientes);
    setBadge('badge-cotizaciones', stats.cotizacionesPendientes);
    setBadge('badge-margenes', stats.productosSinMargen);
  } catch (err) {
    console.error(err);
  }
}
function setBadge(id, valor) {
  const el = document.getElementById(id);
  el.textContent = valor;
  el.hidden = valor === 0;
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }

/* ================= DASHBOARD ================= */

async function cargarDashboard() {
  const mount = document.getElementById('dashboard-stats');
  try {
    const s = await obtenerEstadisticasDashboard();
    mount.innerHTML = `
      <div class="stat-card"><div class="stat-value">${s.totalPedidos}</div><div class="stat-label">Pedidos Tienda</div></div>
      <div class="stat-card"><div class="stat-value">${formatoMoneda(s.ingresos)}</div><div class="stat-label">Ingresos Cobrados</div></div>
      <div class="stat-card"><div class="stat-value">${s.consolidadosAbiertos}</div><div class="stat-label">Consolidados Abiertos</div></div>
      <div class="stat-card"><div class="stat-value">${s.reservasPendientes}</div><div class="stat-label">Reservas Pendientes</div></div>
      <div class="stat-card ${s.cotizacionesPendientes ? 'warn' : ''}"><div class="stat-value">${s.cotizacionesPendientes}</div><div class="stat-label">Cotizaciones Pendientes</div></div>
      <div class="stat-card ${s.resenasPendientes ? 'warn' : ''}"><div class="stat-value">${s.resenasPendientes}</div><div class="stat-label">Reseñas por Moderar</div></div>
      <div class="stat-card ${s.productosStockBajo ? 'warn' : ''}"><div class="stat-value">${s.productosStockBajo}</div><div class="stat-label">Productos con Stock Bajo</div></div>
      <div class="stat-card ${s.productosSinMargen ? 'warn' : ''}"><div class="stat-value">${s.productosSinMargen}</div><div class="stat-label">Productos sin Margen Aplicado</div></div>
    `;
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

/* ================= PRODUCTOS ================= */

let productosBusquedaTimeout;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('productos-busqueda')?.addEventListener('input', (e) => {
    clearTimeout(productosBusquedaTimeout);
    productosBusquedaTimeout = setTimeout(() => cargarProductos(e.target.value), 350);
  });
  document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => abrirModalProducto());
});

async function cargarProductos(busqueda) {
  const mount = document.getElementById('productos-grid');
  try {
    const productos = await obtenerProductosAdmin({ busqueda });
    mount.innerHTML = productos.length ? productos.map(tarjetaProductoAdmin).join('') : '<div class="admin-empty">Sin productos.</div>';
    conectarEventosProductos();
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

function tarjetaProductoAdmin(p) {
  const inv = p.inventario || {};
  return `
    <div class="admin-card" data-id="${p.id}">
      <div class="admin-card-top">
        <div class="admin-card-thumb">${imagenProducto(p)}</div>
        <div style="min-width:0;">
          <span class="admin-card-sub">${escapeHtml(p.marca)}</span>
          <h3 class="admin-card-title">${escapeHtml(p.nombre)}</h3>
          <span style="font-size:0.72rem; color:var(--color-text-faint);">${p.mililitros} ml &middot; ${escapeHtml(p.concentracion || '—')}</span>
        </div>
      </div>
      <div class="admin-field-row"><span>Precio tienda</span><input type="number" class="input-precio-tienda" step="0.01" value="${p.precio_tienda_regular}" /></div>
      <div class="admin-field-row"><span>Precio consolidado</span><input type="number" class="input-precio-consolidado" step="0.01" value="${p.precio_consolidado_fijo}" /></div>
      <div class="admin-field-row"><span>Stock físico</span><input type="number" class="input-stock" value="${inv.stock_fisico ?? 0}" min="0" /></div>
      <div class="admin-field-row"><span>Reservado (consolidado)</span><span>${inv.stock_reservado_consolidados ?? 0}</span></div>
      <div class="admin-field-row"><span>Estado</span>
        <select class="select-estado">
          <option value="Disponible" ${p.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
          <option value="Agotado" ${p.estado === 'Agotado' ? 'selected' : ''}>Agotado</option>
          <option value="Bajo_Pedido" ${p.estado === 'Bajo_Pedido' ? 'selected' : ''}>Bajo Pedido</option>
        </select>
      </div>
      <div class="admin-field-row"><span>Nuevo</span><label class="switch"><input type="checkbox" class="chk-nuevo" ${p.es_nuevo ? 'checked' : ''}/><span class="switch-track"></span></label></div>
      <div class="admin-field-row"><span>Best Seller</span><label class="switch"><input type="checkbox" class="chk-bestseller" ${p.es_bestseller ? 'checked' : ''}/><span class="switch-track"></span></label></div>
      <div class="admin-card-actions">
        <button class="btn btn-outline btn-sm btn-guardar-producto">Guardar</button>
        <button class="btn btn-ghost btn-sm btn-editar-producto">Editar</button>
        <button class="btn btn-danger btn-sm btn-eliminar-producto">Eliminar</button>
      </div>
    </div>
  `;
}

function conectarEventosProductos() {
  document.querySelectorAll('#productos-grid .btn-guardar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-card');
      const id = Number(card.dataset.id);
      try {
        await actualizarProducto(id, {
          precio_tienda_regular: Number(card.querySelector('.input-precio-tienda').value),
          precio_consolidado_fijo: Number(card.querySelector('.input-precio-consolidado').value),
          estado: card.querySelector('.select-estado').value,
          es_nuevo: card.querySelector('.chk-nuevo').checked,
          es_bestseller: card.querySelector('.chk-bestseller').checked,
          margen_aplicado: true,
        });
        await actualizarInventario(id, { stock_fisico: Number(card.querySelector('.input-stock').value) });
        mostrarToast('Producto actualizado');
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .btn-eliminar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-card');
      if (!confirm('¿Eliminar este perfume del catálogo? Esta acción no se puede deshacer.')) return;
      try {
        await eliminarProducto(Number(card.dataset.id));
        mostrarToast('Producto eliminado');
        cargarProductos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#productos-grid .btn-editar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.closest('.admin-card').dataset.id);
      const productos = await obtenerProductosAdmin({});
      const producto = productos.find((p) => p.id === id);
      if (producto) abrirModalProducto(producto);
    });
  });
}

function abrirModalProducto(producto) {
  COTIZACION_ORIGEN = null;
  const form = document.getElementById('form-producto');
  form.reset();
  document.getElementById('modal-producto-titulo').textContent = producto ? 'Editar Perfume' : 'Agregar Perfume';
  form.id.value = producto?.id || '';
  if (producto) {
    Object.entries(producto).forEach(([key, val]) => {
      const field = form.elements[key];
      if (!field) return;
      if (field.type === 'checkbox') field.checked = !!val;
      else field.value = val ?? '';
    });
  }
  abrirModal('modal-producto');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-cancelar-producto')?.addEventListener('click', () => { COTIZACION_ORIGEN = null; cerrarModal('modal-producto'); });
  document.getElementById('form-producto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    delete data.id;
    data.mililitros = Number(data.mililitros);
    data.precio_tienda_regular = Number(data.precio_tienda_regular);
    data.precio_consolidado_fijo = Number(data.precio_consolidado_fijo);
    data.descuento_tienda_porcentaje = Number(data.descuento_tienda_porcentaje || 0);
    data.costo_importacion_pen = data.costo_importacion_pen ? Number(data.costo_importacion_pen) : null;
    data.costo_importacion_usd = data.costo_importacion_usd ? Number(data.costo_importacion_usd) : null;
    data.es_nuevo = e.target.elements.es_nuevo.checked;
    data.es_bestseller = e.target.elements.es_bestseller.checked;
    // un precio de venta puesto a mano por el admin cuenta como "margen aplicado" (evita que
    // la Calculadora de Márgenes lo pise después con el modo "solo sin margen")
    data.margen_aplicado = true;
    try {
      let idProducto = id ? Number(id) : null;
      if (idProducto) await actualizarProducto(idProducto, data);
      else idProducto = await crearProducto(data);
      if (COTIZACION_ORIGEN) {
        await responderCotizacionAdmin(COTIZACION_ORIGEN, { estado: 'Convertido_A_Producto', id_producto_creado: idProducto });
        COTIZACION_ORIGEN = null;
        actualizarBadgesNav();
      }
      mostrarToast('Perfume guardado');
      cerrarModal('modal-producto');
      cargarProductos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

/* ================= CALCULADORA DE MÁRGENES ================= */

let margenesBusquedaTimeout;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('margenes-busqueda')?.addEventListener('input', () => {
    clearTimeout(margenesBusquedaTimeout);
    margenesBusquedaTimeout = setTimeout(cargarMargenes, 350);
  });
  document.getElementById('margenes-filtro')?.addEventListener('change', cargarMargenes);
  document.getElementById('btn-aplicar-margen-masivo')?.addEventListener('click', aplicarMargenMasivoDesdeUI);
  document.getElementById('margen-masivo-solo-pendientes')?.addEventListener('change', actualizarPreviewMargenMasivo);
});

async function actualizarPreviewMargenMasivo() {
  const preview = document.getElementById('margen-masivo-preview');
  const soloSinMargen = document.getElementById('margen-masivo-solo-pendientes').checked;
  try {
    const n = await contarProductosConCosto({ soloSinMargen });
    preview.textContent = `Esto afectará a ${n} producto(s) con costo de importación registrado.`;
  } catch (err) {
    preview.textContent = '';
  }
}

async function cargarMargenes() {
  const tbody = document.getElementById('margenes-tbody');
  const busqueda = document.getElementById('margenes-busqueda')?.value;
  const soloSinMargen = document.getElementById('margenes-filtro')?.value === 'pendientes';
  actualizarPreviewMargenMasivo();
  try {
    const productos = await obtenerProductosParaMargenes({ busqueda, soloSinMargen });
    tbody.innerHTML = productos.length ? productos.map(filaMargenAdmin).join('') : '<tr><td colspan="7" class="admin-empty">Sin productos.</td></tr>';
    conectarEventosMargenes();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${err.message}</td></tr>`;
  }
}

function ganancia(costo, precio) {
  if (!costo || !precio) return '—';
  const soles = precio - costo;
  const pct = (soles / costo) * 100;
  return `${formatoMoneda(soles)} <span style="color:var(--color-text-faint);">(${pct.toFixed(0)}%)</span>`;
}

function filaMargenAdmin(p) {
  return `
    <tr data-id="${p.id}">
      <td>${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}</td>
      <td>${p.costo_importacion_pen != null ? formatoMoneda(p.costo_importacion_pen) : '<span class="admin-empty">sin costo</span>'}</td>
      <td><input type="number" class="input-precio-consolidado-margen" step="0.01" min="0.01" value="${p.precio_consolidado_fijo}" style="width:90px;" /></td>
      <td>${ganancia(p.costo_importacion_pen, p.precio_consolidado_fijo)}</td>
      <td><input type="number" class="input-precio-tienda-margen" step="0.01" min="0.01" value="${p.precio_tienda_regular}" style="width:90px;" /></td>
      <td>${ganancia(p.costo_importacion_pen, p.precio_tienda_regular)}</td>
      <td>
        ${p.margen_aplicado ? '<span class="status-tag">Con margen</span>' : '<span class="status-tag" style="background:rgba(196,106,95,0.15); color:var(--color-danger);">Sin margen</span>'}
        <button class="btn btn-outline btn-sm btn-guardar-margen" style="margin-left:6px;">Guardar</button>
      </td>
    </tr>
  `;
}

function conectarEventosMargenes() {
  document.querySelectorAll('#margenes-tbody .btn-guardar-margen').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fila = btn.closest('tr');
      const id = Number(fila.dataset.id);
      const precioConsolidado = Number(fila.querySelector('.input-precio-consolidado-margen').value);
      const precioTienda = Number(fila.querySelector('.input-precio-tienda-margen').value);
      if (!precioConsolidado || !precioTienda || precioConsolidado > precioTienda) {
        mostrarToast('El precio consolidado debe ser mayor a 0 y no puede superar el precio tienda', 'error');
        return;
      }
      try {
        await actualizarProducto(id, { precio_consolidado_fijo: precioConsolidado, precio_tienda_regular: precioTienda, margen_aplicado: true });
        mostrarToast('Precio actualizado');
        cargarMargenes();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });
}

async function aplicarMargenMasivoDesdeUI() {
  const margenConsolidado = Number(document.getElementById('margen-masivo-consolidado').value);
  const margenTienda = Number(document.getElementById('margen-masivo-tienda').value);
  const soloSinMargen = document.getElementById('margen-masivo-solo-pendientes').checked;

  if (margenConsolidado < 0 || margenTienda < 0 || margenTienda < margenConsolidado) {
    mostrarToast('Revisa los márgenes: el de tienda debe ser mayor o igual al consolidado', 'error');
    return;
  }
  const alcance = soloSinMargen ? 'los productos que aún no tienen margen aplicado' : 'TODO el catálogo (incluyendo precios ya ajustados a mano)';
  if (!confirm(`¿Aplicar margen consolidado ${margenConsolidado}% y tienda ${margenTienda}% a ${alcance}? Esto sobrescribirá esos precios de venta.`)) return;

  const boton = document.getElementById('btn-aplicar-margen-masivo');
  boton.disabled = true;
  try {
    const actualizados = await aplicarMargenMasivo(margenConsolidado, margenTienda, soloSinMargen);
    mostrarToast(`Margen aplicado a ${actualizados} producto(s)`);
    cargarMargenes();
    actualizarBadgesNav();
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
}

/* ================= PEDIDOS (TIENDA DIRECTA) ================= */

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('pedidos-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarPedidos, 350); });
  document.getElementById('pedidos-filtro-estado')?.addEventListener('change', cargarPedidos);
});

async function cargarPedidos() {
  const tbody = document.getElementById('pedidos-tbody');
  const busqueda = document.getElementById('pedidos-busqueda').value;
  const estadoPago = document.getElementById('pedidos-filtro-estado').value;
  try {
    const pedidos = await obtenerPedidosAdmin({ busqueda, estadoPago });
    tbody.innerHTML = pedidos.length ? pedidos.map(filaPedidoAdmin).join('') : '<tr><td colspan="7" class="admin-empty">No hay pedidos.</td></tr>';
    conectarEventosPedidos();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${err.message}</td></tr>`;
  }
}

function filaPedidoAdmin(p) {
  return `
    <tr data-id="${p.id}">
      <td>#${p.id}</td>
      <td>${escapeHtml(p.cliente)}<br><span style="font-size:0.72rem; color:var(--color-text-faint);">${escapeHtml(p.correo_cliente || '')}</span></td>
      <td>${new Date(p.fecha_creacion).toLocaleDateString('es-PE')}</td>
      <td>${formatoMoneda(p.monto_total)}</td>
      <td><span class="status-tag" title="Se calcula solo a partir de los pagos registrados">${escapeHtml(p.estado_pago)}</span></td>
      <td>${escapeHtml(p.envio?.estado_envio || 'Preparando')}</td>
      <td><button class="btn btn-ghost btn-sm btn-ver-pedido">Ver</button></td>
    </tr>
  `;
}

function conectarEventosPedidos() {
  document.querySelectorAll('#pedidos-tbody .btn-ver-pedido').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetallePedido(Number(btn.closest('tr').dataset.id)));
  });
}

async function abrirDetallePedido(id) {
  const mount = document.getElementById('modal-pedido-contenido');
  mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  abrirModal('modal-pedido');
  try {
    const p = await obtenerDetallePedidoAdmin(id);
    const dir = p.direccion;
    mount.innerHTML = `
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:6px;"><strong style="color:var(--color-text);">${escapeHtml(p.cliente)}</strong> &middot; ${escapeHtml(p.correo_cliente || '')} ${p.telefono_cliente ? `&middot; ${escapeHtml(p.telefono_cliente)}` : ''}</p>
      <p style="font-size:0.8rem; color:var(--color-text-faint); margin-bottom:20px;">${dir ? `${escapeHtml(dir.direccion_detalle)}, ${escapeHtml(dir.ubigeo?.distrito || '')} &middot; ${escapeHtml(dir.tipo_despacho?.replace(/_/g, ' ') || '')}` : 'Sin dirección registrada'}</p>

      <strong style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Productos</strong>
      <div style="margin:10px 0 20px;">
        ${p.items.map((i) => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0; border-bottom:1px solid var(--color-border);"><span>${i.cantidad} &times; ${escapeHtml(i.marca)} — ${escapeHtml(i.nombre)}</span><span>${formatoMoneda(i.subtotal)}</span></div>`).join('')}
        <div style="display:flex; justify-content:space-between; font-weight:700; padding-top:10px;"><span>Total</span><span>${formatoMoneda(p.monto_total)}</span></div>
      </div>

      <strong style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Envío</strong>
      <div class="form-row" style="margin-top:10px;">
        <div class="form-group"><label>Estado de envío</label>
          <select id="det-estado-envio">
            <option value="Preparando" ${p.envio?.estado_envio === 'Preparando' ? 'selected' : ''}>Preparando</option>
            <option value="En_Agencia" ${p.envio?.estado_envio === 'En_Agencia' ? 'selected' : ''}>En agencia</option>
            <option value="En_Ruta" ${p.envio?.estado_envio === 'En_Ruta' ? 'selected' : ''}>En ruta</option>
            <option value="Entregado" ${p.envio?.estado_envio === 'Entregado' ? 'selected' : ''}>Entregado</option>
            <option value="Devuelto" ${p.envio?.estado_envio === 'Devuelto' ? 'selected' : ''}>Devuelto</option>
          </select>
        </div>
        <div class="form-group"><label>N° de guía</label><input type="text" id="det-numero-guia" value="${escapeHtml(p.envio?.numero_guia_seguimiento || '')}" /></div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-guardar-envio">Guardar Envío</button>

      <strong style="display:block; margin-top:24px; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Pagos — el comprobante se coordina por WhatsApp, esto solo registra lo ya confirmado</strong>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:8px 0; margin-bottom:6px;">
        <span>Pagado: ${formatoMoneda(p.monto_adelanto_pagado)}</span>
        <span>Saldo pendiente: <strong style="color:var(--color-gold);">${formatoMoneda(p.monto_saldo_pendiente)}</strong></span>
      </div>
      <div style="margin:10px 0;">
        ${p.pagos.length ? p.pagos.map((pg) => `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; padding:6px 0; gap:10px;">
            <span>${escapeHtml(pg.metodo_pago || '—')} &middot; ${new Date(pg.fecha_pago).toLocaleDateString('es-PE')}</span>
            <span style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              ${formatoMoneda(pg.monto)}
              <span class="status-tag" style="${pg.estado_pago === 'Anulado' ? 'background:rgba(196,106,95,0.15); color:var(--color-danger);' : ''}">${escapeHtml(pg.estado_pago)}</span>
              ${pg.estado_pago === 'Aprobado' ? `<button type="button" class="btn btn-ghost btn-sm btn-anular-pago" data-id="${pg.id}">Anular</button>` : ''}
            </span>
          </div>`).join('') : '<p style="font-size:0.8rem; color:var(--color-text-faint);">Sin pagos registrados.</p>'}
      </div>
      <div class="form-row">
        <div class="form-group"><label>Registrar pago (S/)</label><input type="number" id="det-pago-monto" step="0.01" min="0" value="${p.monto_saldo_pendiente > 0 ? p.monto_saldo_pendiente : ''}" /></div>
        <div class="form-group"><label>Método</label>
          <select id="det-pago-metodo">
            <option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Transferencia_Bancaria">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option><option value="PagoEfectivo">PagoEfectivo</option><option value="Efectivo">Efectivo</option>
          </select>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-registrar-pago">Registrar Pago</button>
    `;

    document.getElementById('btn-guardar-envio').addEventListener('click', async () => {
      try {
        await actualizarEnvioPedido(id, {
          estado_envio: document.getElementById('det-estado-envio').value,
          numero_guia_seguimiento: document.getElementById('det-numero-guia').value || null,
        });
        mostrarToast('Envío actualizado');
        cargarPedidos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    mount.querySelectorAll('.btn-anular-pago').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Anular este pago? Se descuenta del total pagado del pedido.')) return;
        try {
          await anularPagoAdmin(Number(btn.dataset.id));
          mostrarToast('Pago anulado');
          abrirDetallePedido(id);
          cargarPedidos();
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });

    document.getElementById('btn-registrar-pago').addEventListener('click', async () => {
      const monto = Number(document.getElementById('det-pago-monto').value);
      if (!monto || monto <= 0) return mostrarToast('Ingresa un monto válido', 'error');
      try {
        await registrarPago(id, { monto, metodo_pago: document.getElementById('det-pago-metodo').value, tipo_pago: 'Abono_Parcial' });
        mostrarToast('Pago registrado');
        abrirDetallePedido(id);
        cargarPedidos();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-cerrar-pedido')?.addEventListener('click', () => cerrarModal('modal-pedido'));
});

/* ================= CONSOLIDADOS ================= */

const ESTADOS_CONSOLIDADO_LABEL = {
  Borrador: 'Borrador', Abierto: 'Abierto', Cerrado_Procesando: 'Cerrado — Procesando', Comprado_En_Transito: 'En tránsito',
  En_Aduanas: 'En aduanas', En_Almacen_Local: 'En almacén local', Finalizado: 'Finalizado', Cancelado: 'Cancelado',
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-nuevo-consolidado')?.addEventListener('click', () => abrirModalConsolidado());
  document.getElementById('btn-cancelar-consolidado')?.addEventListener('click', () => cerrarModal('modal-consolidado'));
  document.getElementById('form-consolidado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    delete data.id;
    data.minimo_unidades = Number(data.minimo_unidades);
    try {
      if (id) await actualizarConsolidadoAdmin(Number(id), data);
      else await crearConsolidadoAdmin(data);
      mostrarToast('Campaña guardada');
      cerrarModal('modal-consolidado');
      cargarConsolidados();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

function abrirModalConsolidado(c) {
  const form = document.getElementById('form-consolidado');
  form.reset();
  document.getElementById('modal-consolidado-titulo').textContent = c ? 'Editar Campaña' : 'Nueva Campaña de Consolidado';
  form.id.value = c?.id || '';
  if (c) {
    form.codigo_campana.value = c.codigo_campana;
    form.fecha_apertura.value = c.fecha_apertura?.slice(0, 10);
    form.fecha_cierre_programada.value = c.fecha_cierre_programada?.slice(0, 10);
    form.minimo_unidades.value = c.minimo_unidades;
    form.notas_admin.value = c.notas_admin || '';
  }
  abrirModal('modal-consolidado');
}

async function cargarConsolidados() {
  const mount = document.getElementById('consolidados-lista');
  try {
    const consolidados = await obtenerConsolidadosAdmin();
    mount.innerHTML = consolidados.length ? consolidados.map(tarjetaConsolidadoAdmin).join('') : '<div class="admin-empty">No hay consolidados aún.</div>';
    conectarEventosConsolidados(consolidados);
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

function tarjetaConsolidadoAdmin(c) {
  const pct = Math.min(Math.round((100 * c.total_unidades_acumuladas) / c.minimo_unidades), 100);
  return `
    <div class="campaign-detail-card" data-id="${c.id}">
      <div class="campaign-detail-head">
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:4px;">${escapeHtml(c.codigo_campana)}</h3>
          <span style="font-size:0.78rem; color:var(--color-text-faint);">Apertura: ${new Date(c.fecha_apertura).toLocaleDateString('es-PE')} &middot; Cierre programado: ${new Date(c.fecha_cierre_programada).toLocaleDateString('es-PE')}</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select class="status-select select-estado-consolidado">
            ${ESTADOS_CONSOLIDADO.map((e) => `<option value="${e}" ${c.estado === e ? 'selected' : ''}>${ESTADOS_CONSOLIDADO_LABEL[e]}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm btn-editar-consolidado">Editar</button>
        </div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label"><span>${c.total_unidades_acumuladas} de ${c.minimo_unidades} unidades</span><span>${pct}%</span></div>
      <button class="btn btn-outline btn-sm btn-ver-reservas" style="margin-top:12px;">Ver Reservas de esta Campaña</button>
      <div class="reservas-panel" style="display:none; margin-top:16px;"></div>
    </div>
  `;
}

function conectarEventosConsolidados(consolidados) {
  document.querySelectorAll('#consolidados-lista .select-estado-consolidado').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const card = sel.closest('.campaign-detail-card');
      const id = Number(card.dataset.id);
      const descripcion = prompt('Descripción pública para el historial de esta campaña (opcional):', '');
      try {
        await cambiarEstadoConsolidado(id, sel.value, descripcion);
        mostrarToast('Estado de campaña actualizado');
        cargarConsolidados();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('#consolidados-lista .btn-editar-consolidado').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.closest('.campaign-detail-card').dataset.id);
      const c = consolidados.find((x) => x.id === id);
      if (c) abrirModalConsolidado(c);
    });
  });

  document.querySelectorAll('#consolidados-lista .btn-ver-reservas').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.campaign-detail-card');
      const panel = card.querySelector('.reservas-panel');
      const visible = panel.style.display !== 'none';
      if (visible) { panel.style.display = 'none'; return; }
      panel.style.display = '';
      panel.innerHTML = '<div class="admin-empty">Cargando…</div>';
      try {
        const reservas = await obtenerReservasDeConsolidadoAdmin(Number(card.dataset.id));
        panel.innerHTML = reservas.length ? `
          <div class="admin-table-wrap"><table class="data-table">
            <thead><tr><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Estado</th></tr></thead>
            <tbody>
              ${reservas.map((r) => `
                <tr data-reserva-id="${r.id}">
                  <td>${escapeHtml(r.cliente)}<br><span style="font-size:0.7rem; color:var(--color-text-faint);">${escapeHtml(r.correo_cliente || '')}</span></td>
                  <td>${escapeHtml(r.marca)} — ${escapeHtml(r.nombre)}</td>
                  <td>${r.cantidad}</td>
                  <td>${formatoMoneda(r.precio_consolidado_aplicado)}</td>
                  <td><select class="status-select select-estado-reserva">
                    ${ESTADOS_RESERVA.map((e) => `<option value="${e}" ${r.estado_item === e ? 'selected' : ''}>${e}</option>`).join('')}
                  </select></td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        ` : '<p class="admin-empty">Sin reservas en esta campaña.</p>';

        panel.querySelectorAll('.select-estado-reserva').forEach((sel) => {
          sel.addEventListener('change', async () => {
            const idReserva = Number(sel.closest('tr').dataset.reservaId);
            try {
              await actualizarEstadoReserva(idReserva, sel.value);
              mostrarToast('Reserva actualizada');
              cargarConsolidados();
            } catch (err) {
              mostrarToast(err.message, 'error');
            }
          });
        });
      } catch (err) {
        panel.innerHTML = `<div class="admin-empty">${err.message}</div>`;
      }
    });
  });
}

/* ================= CONTABILIDAD ================= */

let CONTABILIDAD_CONSOLIDADO_ACTUAL = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contabilidad-select-consolidado')?.addEventListener('change', (e) => {
    CONTABILIDAD_CONSOLIDADO_ACTUAL = e.target.value || null;
    renderContabilidad();
  });
});

async function cargarContabilidad() {
  const select = document.getElementById('contabilidad-select-consolidado');
  try {
    const consolidados = await obtenerConsolidadosAdmin();
    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Selecciona una campaña…</option>' +
      consolidados.map((c) => `<option value="${c.id}">${escapeHtml(c.codigo_campana)} — ${ESTADOS_CONSOLIDADO_LABEL[c.estado] || c.estado}</option>`).join('');
    if (valorPrevio) select.value = valorPrevio;
  } catch (err) {
    document.getElementById('contabilidad-contenido').innerHTML = `<div class="admin-empty">${err.message}</div>`;
    return;
  }
  if (CONTABILIDAD_CONSOLIDADO_ACTUAL) renderContabilidad();
}

async function renderContabilidad() {
  const mount = document.getElementById('contabilidad-contenido');
  if (!CONTABILIDAD_CONSOLIDADO_ACTUAL) {
    mount.innerHTML = '<div class="admin-empty">Elige una campaña para ver su contabilidad.</div>';
    return;
  }
  mount.innerHTML = '<div class="admin-empty">Cargando…</div>';
  try {
    const c = await obtenerContabilidadConsolidado(CONTABILIDAD_CONSOLIDADO_ACTUAL);
    mount.innerHTML = `
      <div class="stat-grid" style="margin-bottom:28px;">
        <div class="stat-card"><div class="stat-value">${c.unidadesTotales}</div><div class="stat-label">Unidades a Pedir</div></div>
        <div class="stat-card"><div class="stat-value">${formatoMoneda(c.costoTotalImportacion)}</div><div class="stat-label">Costo de Importación Estimado</div></div>
        <div class="stat-card"><div class="stat-value">${formatoMoneda(c.montoTotalReservado)}</div><div class="stat-label">Monto Reservado (venta)</div></div>
        <div class="stat-card ${c.montoPendienteCobro ? 'warn' : ''}"><div class="stat-value">${formatoMoneda(c.montoCobrado)}</div><div class="stat-label">Cobrado de ${formatoMoneda(c.montoTotalPedidos)}</div></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <strong style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Perfumes a pedir al proveedor</strong>
        <div style="display:flex; gap:8px;">
          ${c.reservasSinConvertir > 0 ? `<button class="btn btn-primary btn-sm" id="btn-generar-pedidos">Generar Pedidos (${c.reservasSinConvertir} reservas sin convertir)</button>` : ''}
          ${c.pedidosGenerados > 0 ? `<button class="btn btn-outline btn-sm" id="btn-exportar-excel">Exportar a Excel</button>` : ''}
        </div>
      </div>
      <div class="admin-table-wrap"><table class="data-table">
        <thead><tr><th>Perfume</th><th>Unidades</th><th>Costo unitario</th><th>Costo total</th><th>Venta esperada</th></tr></thead>
        <tbody>
          ${c.productos.length ? c.productos.map((p) => `
            <tr>
              <td>${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)} (${p.mililitros}ml)</td>
              <td>${p.unidades}</td>
              <td>${p.costo_importacion_pen != null ? formatoMoneda(p.costo_importacion_pen) : '—'}</td>
              <td>${formatoMoneda(p.costoTotal)}</td>
              <td>${formatoMoneda(p.montoEsperado)}</td>
            </tr>
          `).join('') : '<tr><td colspan="5" class="admin-empty">Sin reservas todavía.</td></tr>'}
        </tbody>
      </table></div>

      ${c.pedidosGenerados === 0 ? '<p class="form-hint" style="margin-top:16px;">Todavía no se generaron pedidos para esta campaña — "Generar Pedidos" convierte las reservas en pedidos reales (con seguimiento de pago) cuando cierres la campaña.</p>' : ''}
    `;

    document.getElementById('btn-generar-pedidos')?.addEventListener('click', async () => {
      if (!confirm(`¿Generar pedidos para las ${c.reservasSinConvertir} reservas de esta campaña? Cada cliente con reservas quedará con un pedido real y podrás cobrarle su saldo. Esta acción no se puede deshacer.`)) return;
      try {
        const creados = await generarPedidosDeConsolidado(CONTABILIDAD_CONSOLIDADO_ACTUAL);
        mostrarToast(`${creados} pedido(s) generado(s)`);
        renderContabilidad();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });

    document.getElementById('btn-exportar-excel')?.addEventListener('click', async (e) => {
      const btn = e.target;
      btn.disabled = true;
      try {
        await exportarConsolidadoExcel(CONTABILIDAD_CONSOLIDADO_ACTUAL);
      } catch (err) {
        mostrarToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

async function exportarConsolidadoExcel(idConsolidado) {
  const filas = await obtenerFilasExportacionConsolidado(idConsolidado);
  if (!filas.length) { mostrarToast('No hay pedidos generados todavía para exportar', 'error'); return; }
  const nombreCampana = document.getElementById('contabilidad-select-consolidado').selectedOptions[0]?.text.split(' — ')[0] || `consolidado-${idConsolidado}`;
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 13 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 9 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 13 }, { wch: 13 }, { wch: 11 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Pedidos');
  XLSX.writeFile(libro, `${nombreCampana}-pedidos.xlsx`);
}

/* ================= TODAS LAS RESERVAS ================= */

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('reservas-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarTodasLasReservas, 350); });
});

async function cargarTodasLasReservas() {
  const tbody = document.getElementById('reservas-tbody');
  const busqueda = document.getElementById('reservas-busqueda').value;
  try {
    const reservas = await obtenerTodasLasReservasAdmin({ busqueda });
    tbody.innerHTML = reservas.length ? reservas.map((r) => `
      <tr data-id="${r.id}">
        <td>${escapeHtml(r.cliente)}</td>
        <td>${escapeHtml(r.producto)}</td>
        <td><a href="consolidado.html?id=${r.id_consolidado}" target="_blank" style="color:var(--color-gold)">${escapeHtml(r.campana || '—')}</a></td>
        <td>${r.cantidad}</td>
        <td>${formatoMoneda(r.precio_consolidado_aplicado)}</td>
        <td><select class="status-select select-estado-reserva-global">${ESTADOS_RESERVA.map((e) => `<option value="${e}" ${r.estado_item === e ? 'selected' : ''}>${e}</option>`).join('')}</select></td>
        <td><span class="status-tag">${escapeHtml(r.estado_consolidado || '')}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="admin-empty">Sin reservas.</td></tr>';

    tbody.querySelectorAll('.select-estado-reserva-global').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = Number(sel.closest('tr').dataset.id);
        try {
          await actualizarEstadoReserva(id, sel.value);
          mostrarToast('Reserva actualizada');
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-empty">${err.message}</td></tr>`;
  }
}

/* ================= CLIENTES ================= */

document.addEventListener('DOMContentLoaded', () => {
  let t;
  document.getElementById('clientes-busqueda')?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargarClientes, 350); });
});

async function cargarClientes() {
  const tbody = document.getElementById('clientes-tbody');
  const busqueda = document.getElementById('clientes-busqueda').value;
  try {
    const clientes = await obtenerClientesAdmin({ busqueda });
    tbody.innerHTML = clientes.length ? clientes.map((c) => `
      <tr data-id="${c.id}">
        <td>${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}</td>
        <td>${escapeHtml(c.correo || '—')}</td>
        <td>${escapeHtml(c.dni_ce_ruc || '—')}</td>
        <td>${escapeHtml(c.telefono || '—')}</td>
        <td>${new Date(c.fecha_registro).toLocaleDateString('es-PE')}</td>
        <td>
          <span class="status-tag" style="${c.rol === 'Admin' ? '' : 'opacity:.5;'}">${escapeHtml(c.rol)}</span>
          <button class="btn btn-ghost btn-sm btn-cambiar-rol" data-rol-actual="${c.rol}" ${c.id === PERFIL_ADMIN?.id ? 'disabled title="No puedes cambiar tu propio rol desde acá"' : ''}>
            ${c.rol === 'Admin' ? 'Quitar Admin' : 'Hacer Admin'}
          </button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="admin-empty">Sin clientes.</td></tr>';

    tbody.querySelectorAll('.btn-cambiar-rol').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const fila = btn.closest('tr');
        const id = fila.dataset.id;
        const rolActual = btn.dataset.rolActual;
        const nuevoRol = rolActual === 'Admin' ? 'Cliente' : 'Admin';
        const nombre = fila.querySelector('td').textContent.trim();
        if (!confirm(`¿${nuevoRol === 'Admin' ? 'Dar permisos de Admin a' : 'Quitarle Admin a'} ${nombre}?`)) return;
        try {
          await cambiarRolCliente(id, nuevoRol);
          mostrarToast('Rol actualizado');
          cargarClientes();
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">${err.message}</td></tr>`;
  }
}

/* ================= RESEÑAS ================= */

let resenasFiltro = 'pendientes';
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#resenas-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#resenas-tabs .admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      resenasFiltro = tab.dataset.filtro;
      cargarResenas();
    });
  });
});

async function cargarResenas() {
  const mount = document.getElementById('resenas-lista');
  try {
    const resenas = await obtenerResenasAdmin({ soloPendientes: resenasFiltro === 'pendientes' });
    mount.innerHTML = resenas.length ? resenas.map((r) => `
      <div class="admin-card" data-id="${r.id}" style="margin-bottom:12px;">
        <div class="admin-card-top" style="justify-content:space-between; align-items:flex-start;">
          <div>
            <span class="admin-card-sub">${escapeHtml(r.cliente)} &middot; ${escapeHtml(r.producto)}</span>
            <div class="stars" style="margin:4px 0;">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
            <p style="font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(r.comentario || '')}</p>
          </div>
          ${r.aprobado ? '<span class="status-tag">Publicada</span>' : '<span class="status-tag" style="background:rgba(196,106,95,0.15); color:var(--color-danger);">Pendiente</span>'}
        </div>
        <div class="admin-card-actions">
          ${!r.aprobado ? '<button class="btn btn-outline btn-sm btn-aprobar-resena">Aprobar</button>' : ''}
          <button class="btn btn-danger btn-sm btn-eliminar-resena">Eliminar</button>
        </div>
      </div>
    `).join('') : '<div class="admin-empty">No hay reseñas.</div>';

    mount.querySelectorAll('.btn-aprobar-resena').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('.admin-card').dataset.id);
        try { await aprobarResena(id); mostrarToast('Reseña aprobada'); cargarResenas(); actualizarBadgesNav(); } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
    mount.querySelectorAll('.btn-eliminar-resena').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta reseña?')) return;
        const id = Number(btn.closest('.admin-card').dataset.id);
        try { await eliminarResena(id); mostrarToast('Reseña eliminada'); cargarResenas(); actualizarBadgesNav(); } catch (err) { mostrarToast(err.message, 'error'); }
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

/* ================= COTIZACIONES ================= */

let cotizacionesFiltro = 'Pendiente';
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#cotizaciones-tabs .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#cotizaciones-tabs .admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      cotizacionesFiltro = tab.dataset.filtro;
      cargarCotizaciones();
    });
  });
  document.getElementById('btn-cancelar-cotizacion')?.addEventListener('click', () => cerrarModal('modal-cotizacion'));
  document.getElementById('form-cotizacion')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = Number(data.id);
    try {
      await responderCotizacionAdmin(id, {
        precio_cotizado_tienda: data.precio_cotizado_tienda ? Number(data.precio_cotizado_tienda) : null,
        precio_cotizado_consolidado: data.precio_cotizado_consolidado ? Number(data.precio_cotizado_consolidado) : null,
        estado: data.estado,
      });
      mostrarToast('Cotización actualizada');
      cerrarModal('modal-cotizacion');
      cargarCotizaciones();
      actualizarBadgesNav();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
});

async function cargarCotizaciones() {
  const mount = document.getElementById('cotizaciones-lista');
  try {
    const cotizaciones = await obtenerCotizacionesAdmin({ estado: cotizacionesFiltro });
    mount.innerHTML = cotizaciones.length ? `
      <div class="admin-table-wrap"><table class="data-table">
        <thead><tr><th>Cliente</th><th>Perfume Solicitado</th><th>Marca</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${cotizaciones.map((c) => `
            <tr data-id="${c.id}">
              <td>${escapeHtml(c.cliente)}<br><span style="font-size:0.72rem; color:var(--color-text-faint);">${escapeHtml(c.correo_cliente || '')}</span></td>
              <td>${escapeHtml(c.nombre_perfume_solicitado)}${c.mililitros ? ` (${c.mililitros}ml)` : ''}</td>
              <td>${escapeHtml(c.marca_solicitada)}</td>
              <td><span class="status-tag">${escapeHtml(c.estado)}</span></td>
              <td>
                <button class="btn btn-outline btn-sm btn-responder-cotizacion">Responder</button>
                ${c.estado !== 'Convertido_A_Producto' ? '<button class="btn btn-ghost btn-sm btn-convertir-cotizacion">Convertir a Producto</button>' : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    ` : '<div class="admin-empty">No hay cotizaciones.</div>';

    mount.querySelectorAll('.btn-responder-cotizacion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('tr').dataset.id);
        const c = cotizaciones.find((x) => x.id === id);
        abrirModalCotizacion(c);
      });
    });
    mount.querySelectorAll('.btn-convertir-cotizacion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('tr').dataset.id);
        const c = cotizaciones.find((x) => x.id === id);
        convertirCotizacionEnProducto(c);
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="admin-empty">${err.message}</div>`;
  }
}

function convertirCotizacionEnProducto(c) {
  abrirModalProducto({
    nombre: c.nombre_perfume_solicitado,
    marca: c.marca_solicitada,
    concentracion: c.concentracion || '',
    mililitros: c.mililitros || 100,
    precio_tienda_regular: c.precio_cotizado_tienda || '',
    precio_consolidado_fijo: c.precio_cotizado_consolidado || '',
  });
  document.getElementById('modal-producto-titulo').textContent = `Nuevo Perfume — desde cotización de ${c.cliente}`;
  COTIZACION_ORIGEN = c.id;
}

function abrirModalCotizacion(c) {
  const form = document.getElementById('form-cotizacion');
  form.reset();
  form.id.value = c.id;
  form.precio_cotizado_tienda.value = c.precio_cotizado_tienda || '';
  form.precio_cotizado_consolidado.value = c.precio_cotizado_consolidado || '';
  form.estado.value = c.estado === 'Pendiente' ? 'Cotizado' : c.estado;
  document.getElementById('modal-cotizacion-info').innerHTML = `
    <strong style="color:var(--color-text);">${escapeHtml(c.cliente)}</strong> &middot; ${escapeHtml(c.correo_cliente || '')}<br>
    Solicita: <strong>${escapeHtml(c.marca_solicitada)} — ${escapeHtml(c.nombre_perfume_solicitado)}</strong>
    ${c.concentracion ? ` (${escapeHtml(c.concentracion)})` : ''}${c.mililitros ? `, ${c.mililitros}ml` : ''}
    ${c.notas_cliente ? `<br><em>"${escapeHtml(c.notas_cliente)}"</em>` : ''}
  `;
  abrirModal('modal-cotizacion');
}

/* ================= MODALES: cierre general ================= */

function configurarModales() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
}
