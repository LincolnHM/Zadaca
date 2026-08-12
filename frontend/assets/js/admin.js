/* ==========================================================
   MAISON ZADACA — PANEL DE ADMINISTRACIÓN
   Auth admin, layout, dashboard, productos, pedidos,
   consolidados, reseñas y cotizaciones — todo en un solo archivo.
   ========================================================== */

const ICONOS_ADMIN = {
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.1 6.6 7.2.9-5.3 5 1.5 7.2L12 18.3 5.5 21.7 7 14.5l-5.3-5 7.2-.9L12 2Z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`,
};

const ADMIN_NAV_ITEMS = [
  { seccion: 'dashboard', href: 'admin-dashboard.html', label: 'Resumen', icon: 'grid' },
  { seccion: 'productos', href: 'admin-productos.html', label: 'Productos', icon: 'box' },
  { seccion: 'pedidos', href: 'admin-pedidos.html', label: 'Pedidos', icon: 'bag' },
  { seccion: 'consolidados', href: 'admin-consolidados.html', label: 'Consolidados', icon: 'layers' },
  { seccion: 'resenas', href: 'admin-resenas.html', label: 'Reseñas', icon: 'star' },
  { seccion: 'cotizaciones', href: 'admin-cotizaciones.html', label: 'Cotizaciones', icon: 'mail' },
];

const TITULOS_SECCION = {
  dashboard: 'Resumen', productos: 'Productos', pedidos: 'Pedidos',
  consolidados: 'Consolidados', resenas: 'Reseñas', cotizaciones: 'Cotizaciones',
};

const ESTADOS_CONSOLIDADO = [
  'Borrador', 'Abierto', 'Cerrado_Procesando', 'Comprado_En_Transito',
  'En_Aduanas', 'En_Almacen_Local', 'Finalizado', 'Cancelado',
];
const ESTADOS_ENVIO = ['Preparando', 'En_Agencia', 'En_Ruta', 'Entregado', 'Devuelto'];
const ESTADOS_COTIZACION = ['Pendiente', 'Cotizado', 'Aceptado', 'Rechazado', 'Convertido_A_Producto'];
const METODOS_PAGO = ['Yape', 'Plin', 'Transferencia_Bancaria', 'Tarjeta', 'PagoEfectivo', 'Efectivo'];
const TIPOS_PAGO = ['Adelanto', 'Abono_Parcial', 'Saldo_Final'];

/* ==================== HELPERS COMPARTIDOS ==================== */

function sesionAdminValida() {
  const cliente = getCliente();
  return estaLogueado() && cliente && cliente.rol === 'Admin';
}

function adminLogout() {
  localStorage.removeItem('zadaca_token');
  localStorage.removeItem('zadaca_cliente');
  window.location.href = 'admin-login.html';
}

function etiqueta(estado) {
  return (estado || '').replace(/_/g, ' ');
}

function claseEstado(estado) {
  const positivos = ['Completado', 'Aprobado', 'Aprobada', 'Finalizado', 'Entregado', 'Aceptado', 'Convertido_A_Producto', 'Confirmado'];
  const negativos = ['Cancelado', 'Rechazado', 'Devuelto'];
  if (positivos.includes(estado)) return 'is-success';
  if (negativos.includes(estado)) return 'is-danger';
  return '';
}

function badgeEstado(estado) {
  return `<span class="status-badge ${claseEstado(estado)}">${escapeHtml(etiqueta(estado))}</span>`;
}

function fechaCorta(fechaIso) {
  if (!fechaIso) return '—';
  return new Date(fechaIso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDatetimeLocal(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function debounce(fn, ms) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), ms);
  };
}

function datosFormulario(form, camposNumericos = []) {
  const data = Object.fromEntries(new FormData(form));
  camposNumericos.forEach((campo) => {
    if (data[campo] === undefined) return;
    if (data[campo] === '') { delete data[campo]; return; }
    data[campo] = Number(data[campo]);
  });
  return data;
}

function cerrarModalEscape(e) {
  if (e.key === 'Escape') cerrarModal();
}

function abrirModal(tituloHtml, contenidoHtml) {
  cerrarModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${tituloHtml}</h3>
        <button type="button" class="modal-close" id="admin-modal-close">${ICONOS_ADMIN.close}</button>
      </div>
      <div id="admin-modal-body">${contenidoHtml}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarModal(); });
  document.getElementById('admin-modal-close').addEventListener('click', cerrarModal);
  document.addEventListener('keydown', cerrarModalEscape);
  return overlay;
}

function cerrarModal() {
  const overlay = document.getElementById('admin-modal-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', cerrarModalEscape);
}

/* ==================== AUTH / LOGIN ==================== */

function renderAdminLogin() {
  document.getElementById('admin-shell').innerHTML = `
    <div class="admin-login-shell">
      <div class="admin-login-card form-card">
        <div class="admin-login-brand">
          <div class="brand-icon">${ICONOS_ADMIN.sparkle}</div>
          <h1 style="font-size:1.4rem;margin:10px 0 2px;">Maison Zadaca</h1>
          <p class="eyebrow" style="margin:0;">Panel de Administración</p>
        </div>
        <div id="admin-alert"></div>
        <form id="admin-login-form">
          <div class="form-group"><label>Correo</label><input type="email" name="correo" required /></div>
          <div class="form-group"><label>Contraseña</label><input type="password" name="contrasena" required /></div>
          <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const alerta = document.getElementById('admin-alert');
    try {
      const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      if (res.cliente.rol !== 'Admin') {
        alerta.innerHTML = `<div class="alert alert-error">Esta cuenta no tiene permisos de administrador.</div>`;
        return;
      }
      setSesion(res.token, res.cliente);
      window.location.href = 'admin-dashboard.html';
    } catch (err) {
      alerta.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

/* ==================== LAYOUT ==================== */

function renderAdminShell(seccion) {
  const cliente = getCliente();
  document.getElementById('admin-shell').innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-brand">
          <a href="admin-dashboard.html" class="brand">
            <span class="brand-icon">${ICONOS_ADMIN.sparkle}</span>
            <span class="brand-text">
              <span class="brand-name">Maison <span>Zadaca</span></span>
            </span>
          </a>
          <span class="admin-sidebar-tag">Panel Admin</span>
        </div>
        <nav class="admin-nav">
          ${ADMIN_NAV_ITEMS.map((item) => `
            <a href="${item.href}" class="${item.seccion === seccion ? 'active' : ''}">${ICONOS_ADMIN[item.icon]}<span>${item.label}</span></a>
          `).join('')}
        </nav>
        <div class="admin-sidebar-footer">
          <a href="index.html" class="text-muted" style="font-size:0.75rem;display:block;margin-bottom:12px;">&larr; Volver al sitio</a>
          <div class="admin-user">
            <strong>${escapeHtml(cliente.nombres)} ${escapeHtml(cliente.apellidos || '')}</strong>
            <span>${escapeHtml(cliente.correo)}</span>
          </div>
          <button class="btn btn-outline btn-sm btn-block" id="admin-logout-btn">Cerrar sesión</button>
        </div>
      </aside>
      <main class="admin-main">
        <div class="admin-topbar">
          <h1>${TITULOS_SECCION[seccion] || ''}</h1>
          <div class="admin-topbar-actions" id="admin-topbar-actions"></div>
        </div>
        <div class="admin-content" id="admin-content">
          <div class="loading-state">Cargando…</div>
        </div>
      </main>
    </div>
  `;
  document.getElementById('admin-logout-btn').addEventListener('click', adminLogout);
}

/* ==================== DASHBOARD ==================== */

async function initDashboard() {
  const cont = document.getElementById('admin-content');
  try {
    const d = await apiFetch('/admin/dashboard');
    cont.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Ingresos del mes</div>
          <div class="stat-value">${formatoMoneda(d.pedidos_mes.ingresos)}</div>
          <div class="stat-hint">${d.pedidos_mes.cantidad} pedido(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pagos pendientes</div>
          <div class="stat-value">${d.pedidos_pendientes_pago}</div>
          <div class="stat-hint">pedidos por cobrar</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Reseñas pendientes</div>
          <div class="stat-value">${d.resenas_pendientes}</div>
          <div class="stat-hint">por moderar</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cotizaciones pendientes</div>
          <div class="stat-value">${d.cotizaciones_pendientes}</div>
          <div class="stat-hint">por responder</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Clientes registrados</div>
          <div class="stat-value">${d.total_clientes}</div>
        </div>
      </div>
      <div class="dash-grid">
        <div>
          <div class="dash-panel">
            <h3>Últimos pedidos</h3>
            ${d.ultimos_pedidos.length ? `<div class="dash-list">${d.ultimos_pedidos.map((p) => `
              <div class="dash-list-item">
                <span class="item-title">#${p.id} — ${escapeHtml(p.nombres)} ${escapeHtml(p.apellidos)}</span>
                <span>${formatoMoneda(p.monto_total)} ${badgeEstado(p.estado_pago)}</span>
              </div>`).join('')}</div>` : `<p class="text-muted">Sin pedidos todavía.</p>`}
          </div>
          <div class="dash-panel">
            <h3>Consolidados abiertos</h3>
            ${d.consolidados_abiertos.length ? d.consolidados_abiertos.map((c) => `
              <div style="margin-bottom:16px;">
                <div class="kv-row" style="border-bottom:none;padding-bottom:2px;">
                  <span>${escapeHtml(c.codigo_campana)}</span>
                  <span>${c.total_unidades_acumuladas}/${c.minimo_unidades} unidades</span>
                </div>
                <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${c.porcentaje_avance}%"></div></div>
              </div>`).join('') : `<p class="text-muted">No hay consolidados abiertos.</p>`}
          </div>
        </div>
        <div class="dash-panel">
          <h3>Stock bajo</h3>
          ${d.stock_bajo.length ? `<div class="dash-list">${d.stock_bajo.map((p) => `
            <div class="dash-list-item">
              <span class="item-title">${escapeHtml(p.marca)} — ${escapeHtml(p.nombre)}</span>
              <span class="stock-low">${p.stock_disponible} / min ${p.stock_minimo_alerta}</span>
            </div>`).join('')}</div>` : `<p class="text-muted">Todo el inventario está en buen nivel.</p>`}
        </div>
      </div>
    `;
  } catch (err) {
    cont.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

/* ==================== PRODUCTOS ==================== */

let PRODUCTOS_CACHE = [];

async function initProductos() {
  document.getElementById('admin-topbar-actions').innerHTML =
    `<button class="btn btn-primary btn-sm" id="btn-nuevo-producto">${ICONOS_ADMIN.plus} Nuevo producto</button>`;
  document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirFormProducto());

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-filters">
      <input type="search" id="filtro-productos" placeholder="Buscar por nombre o marca…" />
    </div>
    <div id="productos-tabla-wrap"><div class="loading-state">Cargando…</div></div>
  `;
  document.getElementById('filtro-productos').addEventListener('input', debounce((e) => renderTablaProductos(e.target.value), 350));
  await renderTablaProductos('');
}

async function renderTablaProductos(busqueda) {
  const wrap = document.getElementById('productos-tabla-wrap');
  try {
    const qs = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    const productos = await apiFetch(`/admin/productos${qs}`);
    PRODUCTOS_CACHE = productos;
    if (!productos.length) { wrap.innerHTML = `<div class="empty-state">No se encontraron productos.</div>`; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Producto</th><th>Género</th><th>Precio tienda</th><th>Precio consolidado</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${productos.map((p) => `
            <tr>
              <td><strong>${escapeHtml(p.marca)}</strong>${p.es_liquidacion ? ` <span class="status-badge">Liquidación</span>` : ''}<br /><span class="text-muted">${escapeHtml(p.nombre)} · ${p.mililitros}ml</span></td>
              <td>${escapeHtml(p.genero)}</td>
              <td>${formatoMoneda(p.precio_tienda_regular)}${Number(p.descuento_tienda_porcentaje) > 0 ? ` <span class="text-muted">(-${Number(p.descuento_tienda_porcentaje)}%)</span>` : ''}</td>
              <td>${formatoMoneda(p.precio_consolidado_fijo)}</td>
              <td class="${p.stock_disponible <= p.stock_minimo_alerta ? 'stock-low' : ''}">${p.stock_disponible}</td>
              <td>${badgeEstado(p.estado)}</td>
              <td class="table-actions">
                <button class="btn btn-ghost btn-sm" data-editar="${p.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-eliminar="${p.id}">Eliminar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('[data-editar]').forEach((btn) => btn.addEventListener('click', () => abrirFormProducto(Number(btn.dataset.editar))));
    wrap.querySelectorAll('[data-eliminar]').forEach((btn) => btn.addEventListener('click', () => eliminarProducto(Number(btn.dataset.eliminar))));
  } catch (err) {
    wrap.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function abrirFormProducto(id) {
  const p = id ? PRODUCTOS_CACHE.find((x) => x.id === id) : null;
  abrirModal(p ? 'Editar producto' : 'Nuevo producto', `
    <form id="form-producto">
      <div class="form-grid">
        <div class="form-group"><label>Nombre</label><input name="nombre" required value="${p ? escapeHtml(p.nombre) : ''}" /></div>
        <div class="form-group"><label>Marca</label><input name="marca" required value="${p ? escapeHtml(p.marca) : ''}" /></div>
        <div class="form-group"><label>Género</label>
          <select name="genero">
            ${['Unisex', 'Hombre', 'Mujer'].map((g) => `<option value="${g}" ${p && p.genero === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Concentración</label><input name="concentracion" value="${p && p.concentracion ? escapeHtml(p.concentracion) : ''}" placeholder="Eau de Parfum" /></div>
        <div class="form-group"><label>Familia olfativa</label><input name="familia_olfativa" value="${p && p.familia_olfativa ? escapeHtml(p.familia_olfativa) : ''}" /></div>
        <div class="form-group"><label>Mililitros</label><input type="number" name="mililitros" min="1" required value="${p ? p.mililitros : ''}" /></div>
        <div class="form-group"><label>Precio tienda (S/)</label><input type="number" step="0.01" min="0.01" name="precio_tienda_regular" required value="${p ? p.precio_tienda_regular : ''}" /></div>
        <div class="form-group"><label>Descuento tienda (%)</label><input type="number" step="0.01" min="0" max="100" name="descuento_tienda_porcentaje" value="${p ? p.descuento_tienda_porcentaje : 0}" /></div>
        <div class="form-group"><label>Precio consolidado (S/)</label><input type="number" step="0.01" min="0.01" name="precio_consolidado_fijo" required value="${p ? p.precio_consolidado_fijo : ''}" /></div>
        <div class="form-group"><label>Precio liquidación (S/)</label><input type="number" step="0.01" min="0.01" name="precio_liquidacion" value="${p && p.precio_liquidacion ? p.precio_liquidacion : ''}" placeholder="Solo si es liquidación" /></div>
        <div class="form-group"><label>Unidad mínima liquidación</label><input type="number" min="1" name="liquidacion_unidad_minima" value="${p && p.liquidacion_unidad_minima ? p.liquidacion_unidad_minima : 1}" /></div>
        <div class="form-group"><label>Estado</label>
          <select name="estado">
            ${['Disponible', 'Agotado', 'Bajo_Pedido'].map((e) => `<option value="${e}" ${p && p.estado === e ? 'selected' : ''}>${etiqueta(e)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Stock físico</label><input type="number" min="0" name="stock_fisico" value="${p ? p.stock_fisico : 0}" /></div>
        <div class="form-group"><label>Stock mínimo (alerta)</label><input type="number" min="0" name="stock_minimo_alerta" value="${p ? p.stock_minimo_alerta : 5}" /></div>
        <div class="form-group"><label>URL de imagen</label><input name="imagen_url" value="${p && p.imagen_url ? escapeHtml(p.imagen_url) : ''}" /></div>
      </div>
      <div class="form-group"><label>Descripción</label><textarea name="descripcion" rows="2">${p && p.descripcion ? escapeHtml(p.descripcion) : ''}</textarea></div>
      <div class="form-group"><label>Notas olfativas</label><textarea name="notas_olfativas" rows="2">${p && p.notas_olfativas ? escapeHtml(p.notas_olfativas) : ''}</textarea></div>
      <label class="form-checkbox"><input type="checkbox" name="es_nuevo" ${p && p.es_nuevo ? 'checked' : ''} /> Marcar como nuevo ingreso</label>
      <label class="form-checkbox"><input type="checkbox" name="es_bestseller" ${p && p.es_bestseller ? 'checked' : ''} /> Marcar como bestseller</label>
      <label class="form-checkbox"><input type="checkbox" name="es_liquidacion" ${p && p.es_liquidacion ? 'checked' : ''} /> Marcar como liquidación (por mayor y por unidad — completa el precio y la unidad mínima de arriba)</label>
      <div id="form-producto-alert"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="btn-cancelar-producto">Cancelar</button>
        <button type="submit" class="btn btn-primary">${p ? 'Guardar cambios' : 'Crear producto'}</button>
      </div>
    </form>
  `);

  document.getElementById('btn-cancelar-producto').addEventListener('click', cerrarModal);
  document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = datosFormulario(e.target, ['mililitros', 'precio_tienda_regular', 'descuento_tienda_porcentaje', 'precio_consolidado_fijo', 'precio_liquidacion', 'liquidacion_unidad_minima', 'stock_fisico', 'stock_minimo_alerta']);
    data.es_nuevo = e.target.es_nuevo.checked;
    data.es_bestseller = e.target.es_bestseller.checked;
    data.es_liquidacion = e.target.es_liquidacion.checked;
    if (data.es_liquidacion && !data.precio_liquidacion) {
      document.getElementById('form-producto-alert').innerHTML = `<div class="alert alert-error">Ingresa el precio de liquidación</div>`;
      return;
    }
    try {
      if (p) {
        await apiFetch(`/admin/productos/${p.id}`, { method: 'PUT', body: JSON.stringify(data) });
        mostrarToast('Producto actualizado');
      } else {
        await apiFetch('/admin/productos', { method: 'POST', body: JSON.stringify(data) });
        mostrarToast('Producto creado');
      }
      cerrarModal();
      renderTablaProductos(document.getElementById('filtro-productos').value);
    } catch (err) {
      document.getElementById('form-producto-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  try {
    await apiFetch(`/admin/productos/${id}`, { method: 'DELETE' });
    mostrarToast('Producto eliminado');
    renderTablaProductos(document.getElementById('filtro-productos').value);
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ==================== PEDIDOS ==================== */

async function initPedidos() {
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-filters">
      <select id="filtro-estado-pago">
        <option value="">Todos los estados de pago</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Parcial">Parcial</option>
        <option value="Completado">Completado</option>
      </select>
      <select id="filtro-tipo-pedido">
        <option value="">Todos los tipos</option>
        <option value="Directo_Tienda">Directo Tienda</option>
        <option value="Consolidado">Consolidado</option>
      </select>
    </div>
    <div id="pedidos-tabla-wrap"><div class="loading-state">Cargando…</div></div>
  `;
  document.getElementById('filtro-estado-pago').addEventListener('change', () => renderTablaPedidos());
  document.getElementById('filtro-tipo-pedido').addEventListener('change', () => renderTablaPedidos());
  await renderTablaPedidos();
}

async function renderTablaPedidos() {
  const wrap = document.getElementById('pedidos-tabla-wrap');
  const estadoPago = document.getElementById('filtro-estado-pago').value;
  const tipoPedido = document.getElementById('filtro-tipo-pedido').value;
  const params = new URLSearchParams();
  if (estadoPago) params.set('estado_pago', estadoPago);
  if (tipoPedido) params.set('tipo_pedido', tipoPedido);
  try {
    const pedidos = await apiFetch(`/admin/pedidos?${params.toString()}`);
    if (!pedidos.length) { wrap.innerHTML = `<div class="empty-state">No hay pedidos con esos filtros.</div>`; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>Cliente</th><th>Tipo</th><th>Total</th><th>Pago</th><th>Envío</th><th>Fecha</th><th></th></tr></thead>
        <tbody>
          ${pedidos.map((p) => `
            <tr>
              <td>#${p.id}</td>
              <td>${escapeHtml(p.nombres)} ${escapeHtml(p.apellidos)}<br /><span class="text-muted">${escapeHtml(p.correo)}</span></td>
              <td>${etiqueta(p.tipo_pedido)}</td>
              <td>${formatoMoneda(p.monto_total)}</td>
              <td>${badgeEstado(p.estado_pago)}</td>
              <td>${p.estado_envio ? badgeEstado(p.estado_envio) : '<span class="text-muted">—</span>'}</td>
              <td>${fechaCorta(p.fecha_creacion)}</td>
              <td class="table-actions"><button class="btn btn-ghost btn-sm" data-ver="${p.id}">Ver</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('[data-ver]').forEach((btn) => btn.addEventListener('click', () => abrirDetallePedido(Number(btn.dataset.ver))));
  } catch (err) {
    wrap.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

async function abrirDetallePedido(id) {
  abrirModal(`Pedido #${id}`, `<div class="loading-state">Cargando…</div>`);
  try {
    const p = await apiFetch(`/admin/pedidos/${id}`);
    document.getElementById('admin-modal-body').innerHTML = `
      <div class="detail-block">
        <div class="kv-row"><span>Cliente</span><span>${escapeHtml(p.nombres)} ${escapeHtml(p.apellidos)} — ${escapeHtml(p.correo)}</span></div>
        <div class="kv-row"><span>Tipo</span><span>${etiqueta(p.tipo_pedido)}</span></div>
        <div class="kv-row"><span>Total</span><span>${formatoMoneda(p.monto_total)}</span></div>
        <div class="kv-row"><span>Pagado</span><span>${formatoMoneda(p.monto_adelanto_pagado)}</span></div>
        <div class="kv-row"><span>Saldo</span><span>${formatoMoneda(p.monto_saldo_pendiente)}</span></div>
        <div class="kv-row"><span>Estado de pago</span><span>${badgeEstado(p.estado_pago)}</span></div>
        <div class="kv-row"><span>Dirección</span><span>${p.direccion_detalle ? `${escapeHtml(p.etiqueta || '')} — ${escapeHtml(p.direccion_detalle)}` : 'No registrada'}</span></div>
      </div>
      ${p.items.length ? `
      <div class="detail-block">
        <h4 style="margin-bottom:10px;">Productos</h4>
        ${p.items.map((it) => `<div class="kv-row"><span>${it.cantidad}x ${escapeHtml(it.marca)} — ${escapeHtml(it.nombre)}</span><span>${formatoMoneda(it.subtotal)}</span></div>`).join('')}
      </div>` : ''}
      <div class="detail-block">
        <h4 style="margin-bottom:10px;">Registrar pago</h4>
        <form id="form-pago">
          <div class="form-grid">
            <div class="form-group"><label>Monto (S/)</label><input type="number" step="0.01" min="0.01" name="monto" required /></div>
            <div class="form-group"><label>Método</label>
              <select name="metodo_pago" required>
                ${METODOS_PAGO.map((m) => `<option value="${m}">${etiqueta(m)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Tipo</label>
              <select name="tipo_pago">
                ${TIPOS_PAGO.map((t) => `<option value="${t}">${etiqueta(t)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="form-pago-alert"></div>
          <button type="submit" class="btn btn-primary btn-sm">Registrar pago</button>
        </form>
      </div>
      <div class="detail-block">
        <h4 style="margin-bottom:10px;">Envío</h4>
        <form id="form-envio">
          <div class="form-grid">
            <div class="form-group"><label>Estado</label>
              <select name="estado_envio">
                ${ESTADOS_ENVIO.map((e) => `<option value="${e}" ${p.estado_envio === e ? 'selected' : ''}>${etiqueta(e)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Empresa</label><input name="empresa_transporte" value="${p.empresa_transporte ? escapeHtml(p.empresa_transporte) : ''}" placeholder="Shalom / Olva" /></div>
          </div>
          <div class="form-group"><label>N° de guía</label><input name="numero_guia_seguimiento" value="${p.numero_guia_seguimiento ? escapeHtml(p.numero_guia_seguimiento) : ''}" /></div>
          <div id="form-envio-alert"></div>
          <button type="submit" class="btn btn-outline btn-sm">Actualizar envío</button>
        </form>
      </div>
    `;

    document.getElementById('form-pago').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = datosFormulario(e.target, ['monto']);
      try {
        await apiFetch(`/admin/pedidos/${id}/pago`, { method: 'PUT', body: JSON.stringify(data) });
        mostrarToast('Pago registrado');
        cerrarModal();
        renderTablaPedidos();
      } catch (err) {
        document.getElementById('form-pago-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      }
    });

    document.getElementById('form-envio').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = datosFormulario(e.target, []);
      try {
        await apiFetch(`/admin/pedidos/${id}/envio`, { method: 'PUT', body: JSON.stringify(data) });
        mostrarToast('Envío actualizado');
        cerrarModal();
        renderTablaPedidos();
      } catch (err) {
        document.getElementById('form-envio-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      }
    });
  } catch (err) {
    document.getElementById('admin-modal-body').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

/* ==================== CONSOLIDADOS ==================== */

let CONSOLIDADOS_CACHE = [];

async function initConsolidados() {
  document.getElementById('admin-topbar-actions').innerHTML =
    `<button class="btn btn-primary btn-sm" id="btn-nuevo-consolidado">${ICONOS_ADMIN.plus} Nuevo consolidado</button>`;
  document.getElementById('btn-nuevo-consolidado').addEventListener('click', () => abrirFormConsolidado());
  document.getElementById('admin-content').innerHTML = `<div id="consolidados-tabla-wrap"><div class="loading-state">Cargando…</div></div>`;
  await renderTablaConsolidados();
}

async function renderTablaConsolidados() {
  const wrap = document.getElementById('consolidados-tabla-wrap');
  try {
    const consolidados = await apiFetch('/admin/consolidados');
    CONSOLIDADOS_CACHE = consolidados;
    if (!consolidados.length) { wrap.innerHTML = `<div class="empty-state">Aún no hay consolidados.</div>`; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Campaña</th><th>Apertura</th><th>Cierre programado</th><th>Progreso</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${consolidados.map((c) => `
            <tr>
              <td>${escapeHtml(c.codigo_campana)}</td>
              <td>${fechaCorta(c.fecha_apertura)}</td>
              <td>${fechaCorta(c.fecha_cierre_programada)}</td>
              <td style="min-width:140px;">
                <div class="text-muted" style="font-size:0.78rem;">${c.total_unidades_acumuladas}/${c.minimo_unidades} uds</div>
                <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${c.porcentaje_avance}%"></div></div>
              </td>
              <td>${badgeEstado(c.estado)}</td>
              <td class="table-actions">
                <button class="btn btn-ghost btn-sm" data-ver="${c.id}">Ver</button>
                <button class="btn btn-ghost btn-sm" data-editar="${c.id}">Editar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('[data-ver]').forEach((btn) => btn.addEventListener('click', () => abrirDetalleConsolidado(Number(btn.dataset.ver))));
    wrap.querySelectorAll('[data-editar]').forEach((btn) => btn.addEventListener('click', () => abrirFormConsolidado(Number(btn.dataset.editar))));
  } catch (err) {
    wrap.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function abrirFormConsolidado(id) {
  const c = id ? CONSOLIDADOS_CACHE.find((x) => x.id === id) : null;
  abrirModal(c ? 'Editar consolidado' : 'Nuevo consolidado', `
    <form id="form-consolidado">
      <div class="form-group"><label>Código de campaña</label><input name="codigo_campana" required value="${c ? escapeHtml(c.codigo_campana) : ''}" ${c ? 'readonly' : ''} /></div>
      <div class="form-grid">
        <div class="form-group"><label>Apertura</label><input type="datetime-local" name="fecha_apertura" required value="${c ? toDatetimeLocal(c.fecha_apertura) : ''}" /></div>
        <div class="form-group"><label>Cierre programado</label><input type="datetime-local" name="fecha_cierre_programada" required value="${c ? toDatetimeLocal(c.fecha_cierre_programada) : ''}" /></div>
        <div class="form-group"><label>Mínimo de unidades</label><input type="number" min="4" name="minimo_unidades" value="${c ? c.minimo_unidades : 4}" /></div>
        ${c ? `<div class="form-group"><label>Estado</label>
          <select name="estado">
            ${ESTADOS_CONSOLIDADO.map((e) => `<option value="${e}" ${c.estado === e ? 'selected' : ''}>${etiqueta(e)}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      <div class="form-group"><label>Notas internas</label><textarea name="notas_admin" rows="2">${c && c.notas_admin ? escapeHtml(c.notas_admin) : ''}</textarea></div>
      ${c ? `<div class="form-group"><label>Nota pública del cambio de estado (opcional)</label><input name="descripcion_publica" placeholder="Ej: Pedido realizado al proveedor" /></div>` : ''}
      <div id="form-consolidado-alert"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="btn-cancelar-consolidado">Cancelar</button>
        <button type="submit" class="btn btn-primary">${c ? 'Guardar cambios' : 'Crear consolidado'}</button>
      </div>
    </form>
  `);

  document.getElementById('btn-cancelar-consolidado').addEventListener('click', cerrarModal);
  document.getElementById('form-consolidado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = datosFormulario(e.target, ['minimo_unidades']);
    try {
      if (c) {
        await apiFetch(`/admin/consolidados/${c.id}`, { method: 'PUT', body: JSON.stringify(data) });
        mostrarToast('Consolidado actualizado');
      } else {
        await apiFetch('/admin/consolidados', { method: 'POST', body: JSON.stringify(data) });
        mostrarToast('Consolidado creado');
      }
      cerrarModal();
      renderTablaConsolidados();
    } catch (err) {
      document.getElementById('form-consolidado-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function abrirDetalleConsolidado(id) {
  abrirModal('Detalle del consolidado', `<div class="loading-state">Cargando…</div>`);
  try {
    const c = await apiFetch(`/admin/consolidados/${id}`);
    document.getElementById('admin-modal-body').innerHTML = `
      <div class="detail-block">
        <div class="kv-row"><span>Campaña</span><span>${escapeHtml(c.codigo_campana)}</span></div>
        <div class="kv-row"><span>Progreso</span><span>${c.total_unidades_acumuladas}/${c.minimo_unidades} uds (${c.porcentaje_avance}%)</span></div>
        <div class="kv-row"><span>Estado</span><span>${badgeEstado(c.estado)}</span></div>
      </div>
      <div class="detail-block">
        <h4 style="margin-bottom:10px;">Reservas (${c.reservas.length})</h4>
        ${c.reservas.length ? c.reservas.map((r) => `
          <div class="kv-row">
            <span>${escapeHtml(r.nombres)} ${escapeHtml(r.apellidos)} — ${r.cantidad}x ${escapeHtml(r.producto)}</span>
            <span>${formatoMoneda(r.cantidad * r.precio_consolidado_aplicado)} ${badgeEstado(r.estado_item)}</span>
          </div>`).join('') : '<p class="text-muted">Sin reservas todavía.</p>'}
      </div>
      <div class="detail-block">
        <h4 style="margin-bottom:10px;">Historial</h4>
        ${c.historial.length ? c.historial.map((h) => `
          <div class="kv-row">
            <span>${badgeEstado(h.estado)}${h.descripcion_publica ? ` — ${escapeHtml(h.descripcion_publica)}` : ''}</span>
            <span>${fechaCorta(h.fecha_evento)}</span>
          </div>`).join('') : '<p class="text-muted">Sin historial.</p>'}
      </div>
    `;
  } catch (err) {
    document.getElementById('admin-modal-body').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

/* ==================== RESEÑAS ==================== */

async function initResenas() {
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-filters">
      <select id="filtro-resenas">
        <option value="pendiente">Pendientes de aprobación</option>
        <option value="todas">Todas</option>
      </select>
    </div>
    <div id="resenas-lista-wrap"><div class="loading-state">Cargando…</div></div>
  `;
  document.getElementById('filtro-resenas').addEventListener('change', () => renderListaResenas());
  await renderListaResenas();
}

async function renderListaResenas() {
  const wrap = document.getElementById('resenas-lista-wrap');
  const estado = document.getElementById('filtro-resenas').value;
  try {
    const resenas = await apiFetch(`/admin/resenas?estado=${estado}`);
    if (!resenas.length) { wrap.innerHTML = `<div class="empty-state">No hay reseñas ${estado === 'pendiente' ? 'pendientes' : 'registradas'}.</div>`; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Cliente</th><th>Producto</th><th>Calificación</th><th>Comentario</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${resenas.map((r) => `
            <tr>
              <td>${escapeHtml(r.nombres)} ${escapeHtml(r.apellidos)}</td>
              <td>${r.producto ? escapeHtml(r.producto) : '<span class="text-muted">General</span>'}</td>
              <td>${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</td>
              <td style="max-width:280px;">${r.comentario ? escapeHtml(r.comentario) : '<span class="text-muted">Sin comentario</span>'}</td>
              <td>${r.aprobado ? '<span class="status-badge is-success">Aprobada</span>' : '<span class="status-badge">Pendiente</span>'}</td>
              <td class="table-actions">
                ${!r.aprobado ? `<button class="btn btn-outline btn-sm" data-aprobar="${r.id}">Aprobar</button>` : `<button class="btn btn-ghost btn-sm" data-ocultar="${r.id}">Ocultar</button>`}
                <button class="btn btn-danger btn-sm" data-eliminar="${r.id}">Eliminar</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('[data-aprobar]').forEach((btn) => btn.addEventListener('click', () => cambiarEstadoResena(Number(btn.dataset.aprobar), true)));
    wrap.querySelectorAll('[data-ocultar]').forEach((btn) => btn.addEventListener('click', () => cambiarEstadoResena(Number(btn.dataset.ocultar), false)));
    wrap.querySelectorAll('[data-eliminar]').forEach((btn) => btn.addEventListener('click', () => eliminarResena(Number(btn.dataset.eliminar))));
  } catch (err) {
    wrap.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

async function cambiarEstadoResena(id, aprobado) {
  try {
    await apiFetch(`/admin/resenas/${id}`, { method: 'PUT', body: JSON.stringify({ aprobado }) });
    mostrarToast(aprobado ? 'Reseña aprobada' : 'Reseña ocultada');
    renderListaResenas();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

async function eliminarResena(id) {
  if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
  try {
    await apiFetch(`/admin/resenas/${id}`, { method: 'DELETE' });
    mostrarToast('Reseña eliminada');
    renderListaResenas();
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

/* ==================== COTIZACIONES ==================== */

let COTIZACIONES_CACHE = [];

async function initCotizaciones() {
  document.getElementById('admin-content').innerHTML = `<div id="cotizaciones-tabla-wrap"><div class="loading-state">Cargando…</div></div>`;
  await renderTablaCotizaciones();
}

async function renderTablaCotizaciones() {
  const wrap = document.getElementById('cotizaciones-tabla-wrap');
  try {
    const cotizaciones = await apiFetch('/admin/cotizaciones');
    COTIZACIONES_CACHE = cotizaciones;
    if (!cotizaciones.length) { wrap.innerHTML = `<div class="empty-state">No hay solicitudes de cotización.</div>`; return; }
    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Cliente</th><th>Perfume solicitado</th><th>Precio tienda</th><th>Precio consolidado</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
        <tbody>
          ${cotizaciones.map((c) => `
            <tr>
              <td>${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)}<br /><span class="text-muted">${escapeHtml(c.correo)}</span></td>
              <td>${escapeHtml(c.marca_solicitada)} — ${escapeHtml(c.nombre_perfume_solicitado)}${c.mililitros ? ` (${c.mililitros}ml)` : ''}</td>
              <td>${c.precio_cotizado_tienda ? formatoMoneda(c.precio_cotizado_tienda) : '<span class="text-muted">—</span>'}</td>
              <td>${c.precio_cotizado_consolidado ? formatoMoneda(c.precio_cotizado_consolidado) : '<span class="text-muted">—</span>'}</td>
              <td>${badgeEstado(c.estado)}</td>
              <td>${fechaCorta(c.fecha_solicitud)}</td>
              <td class="table-actions"><button class="btn btn-ghost btn-sm" data-editar="${c.id}">Gestionar</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    wrap.querySelectorAll('[data-editar]').forEach((btn) => btn.addEventListener('click', () => abrirFormCotizacion(Number(btn.dataset.editar))));
  } catch (err) {
    wrap.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function abrirFormCotizacion(id) {
  const c = COTIZACIONES_CACHE.find((x) => x.id === id);
  abrirModal('Gestionar cotización', `
    <div class="detail-block">
      <div class="kv-row"><span>Cliente</span><span>${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos)} — ${escapeHtml(c.correo)}${c.telefono ? ` · ${escapeHtml(c.telefono)}` : ''}</span></div>
      <div class="kv-row"><span>Solicitado</span><span>${escapeHtml(c.marca_solicitada)} — ${escapeHtml(c.nombre_perfume_solicitado)}</span></div>
      ${c.notas_cliente ? `<div class="kv-row"><span>Notas del cliente</span><span>${escapeHtml(c.notas_cliente)}</span></div>` : ''}
    </div>
    <form id="form-cotizacion">
      <div class="form-grid">
        <div class="form-group"><label>Precio tienda (S/)</label><input type="number" step="0.01" min="0" name="precio_cotizado_tienda" value="${c.precio_cotizado_tienda || ''}" /></div>
        <div class="form-group"><label>Precio consolidado (S/)</label><input type="number" step="0.01" min="0" name="precio_cotizado_consolidado" value="${c.precio_cotizado_consolidado || ''}" /></div>
      </div>
      <div class="form-group"><label>Estado</label>
        <select name="estado">
          ${ESTADOS_COTIZACION.map((e) => `<option value="${e}" ${c.estado === e ? 'selected' : ''}>${etiqueta(e)}</option>`).join('')}
        </select>
      </div>
      <div id="form-cotizacion-alert"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" id="btn-cancelar-cotizacion">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `);

  document.getElementById('btn-cancelar-cotizacion').addEventListener('click', cerrarModal);
  document.getElementById('form-cotizacion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = datosFormulario(e.target, ['precio_cotizado_tienda', 'precio_cotizado_consolidado']);
    try {
      await apiFetch(`/admin/cotizaciones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      mostrarToast('Cotización actualizada');
      cerrarModal();
      renderTablaCotizaciones();
    } catch (err) {
      document.getElementById('form-cotizacion-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  });
}

/* ==================== BOOTSTRAP ==================== */

document.addEventListener('DOMContentLoaded', () => {
  const seccion = document.body.dataset.seccion;

  if (seccion === 'login') {
    if (sesionAdminValida()) { window.location.href = 'admin-dashboard.html'; return; }
    renderAdminLogin();
    return;
  }

  if (!sesionAdminValida()) {
    window.location.href = 'admin-login.html';
    return;
  }

  renderAdminShell(seccion);

  const iniciadores = {
    dashboard: initDashboard,
    productos: initProductos,
    pedidos: initPedidos,
    consolidados: initConsolidados,
    resenas: initResenas,
    cotizaciones: initCotizaciones,
  };
  const iniciar = iniciadores[seccion];
  if (iniciar) iniciar();
});
