const PARAMS = new URLSearchParams(window.location.search);
const RETORNO = PARAMS.get('retorno');
let TAB_ACTIVA = PARAMS.get('tab') || 'pedidos';

document.addEventListener('DOMContentLoaded', () => {
  iniciarLayout('cuenta.html');
  if (estaLogueado()) {
    document.getElementById('page-heading').textContent = 'Mi Cuenta';
    renderDashboard();
  } else {
    document.getElementById('page-heading').textContent = 'Ingresa o Crea tu Cuenta';
    renderAuthForms();
  }
});

/* ---------------- AUTENTICACIÓN ---------------- */

function renderAuthForms() {
  document.getElementById('cuenta-mount').innerHTML = `
    <div class="container">
      <div class="form-card">
        <div class="form-tabs">
          <button class="form-tab active" data-tab="login">Iniciar Sesión</button>
          <button class="form-tab" data-tab="registro">Crear Cuenta</button>
        </div>
        <div id="alert-mount"></div>
        <form id="login-form">
          <div class="form-group"><label>Correo</label><input type="email" name="correo" required /></div>
          <div class="form-group"><label>Contraseña</label><input type="password" name="contrasena" required /></div>
          <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
        </form>
        <form id="registro-form" style="display:none;">
          <div class="form-row">
            <div class="form-group"><label>Nombres</label><input type="text" name="nombres" required /></div>
            <div class="form-group"><label>Apellidos</label><input type="text" name="apellidos" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>DNI / CE / RUC</label><input type="text" name="dni_ce_ruc" maxlength="15" required /></div>
            <div class="form-group"><label>Teléfono</label><input type="text" name="telefono" /></div>
          </div>
          <div class="form-group"><label>Correo</label><input type="email" name="correo" required /></div>
          <div class="form-group"><label>Contraseña</label><input type="password" name="contrasena" minlength="8" required /></div>
          <p class="form-hint" style="margin:-10px 0 18px;">Mínimo 8 caracteres.</p>
          <button type="submit" class="btn btn-primary btn-block">Crear Cuenta</button>
        </form>
      </div>
    </div>
  `;

  document.querySelectorAll('.form-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.form-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const esLogin = tab.dataset.tab === 'login';
      document.getElementById('login-form').style.display = esLogin ? '' : 'none';
      document.getElementById('registro-form').style.display = esLogin ? 'none' : '';
    });
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      setSesion(res.token, res.cliente);
      window.location.href = RETORNO ? RETORNO : 'cuenta.html';
    } catch (err) {
      mostrarAlerta(err.message);
    }
  });

  document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await apiFetch('/auth/registro', { method: 'POST', body: JSON.stringify(data) });
      setSesion(res.token, res.cliente);
      mostrarToast('¡Cuenta creada con éxito!');
      window.location.href = RETORNO ? RETORNO : 'cuenta.html';
    } catch (err) {
      mostrarAlerta(err.message);
    }
  });
}

function mostrarAlerta(mensaje) {
  document.getElementById('alert-mount').innerHTML = `<div class="alert alert-error">${escapeHtml(mensaje)}</div>`;
}

/* ---------------- DASHBOARD ---------------- */

function renderDashboard() {
  const cliente = getCliente();
  const tabs = [
    { id: 'pedidos', label: 'Mis Pedidos' },
    { id: 'reservas', label: 'Mis Reservas' },
    { id: 'direcciones', label: 'Mis Direcciones' },
    { id: 'favoritos', label: 'Favoritos' },
    { id: 'cotizaciones', label: 'Cotizaciones' },
  ];

  document.getElementById('cuenta-mount').innerHTML = `
    <div class="container dash-layout">
      <nav class="dash-nav">
        <div style="padding:10px 14px 18px; border-bottom:1px solid var(--color-border); margin-bottom:10px;">
          <div style="font-weight:600;">${escapeHtml(cliente.nombres)} ${escapeHtml(cliente.apellidos || '')}</div>
          <div style="font-size:0.75rem; color:var(--color-text-faint);">${escapeHtml(cliente.correo)}</div>
        </div>
        ${tabs.map((t) => `<button data-tab="${t.id}" class="${TAB_ACTIVA === t.id ? 'active' : ''}">${t.label}</button>`).join('')}
        <button id="btn-logout" style="margin-top:10px; color:var(--color-danger);">Cerrar Sesión</button>
      </nav>
      <div id="tab-content"><div class="loading-state">Cargando…</div></div>
    </div>
  `;

  document.querySelectorAll('.dash-nav button[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      TAB_ACTIVA = btn.dataset.tab;
      document.querySelectorAll('.dash-nav button[data-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      cargarTab();
    });
  });
  document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

  cargarTab();
}

function cargarTab() {
  if (TAB_ACTIVA === 'pedidos') return cargarPedidos();
  if (TAB_ACTIVA === 'reservas') return cargarReservas();
  if (TAB_ACTIVA === 'direcciones') return cargarDirecciones();
  if (TAB_ACTIVA === 'favoritos') return cargarFavoritos();
  if (TAB_ACTIVA === 'cotizaciones') return cargarCotizaciones();
}

/* ---- Pedidos ---- */
async function cargarPedidos() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando pedidos…</div>';
  try {
    const pedidos = await apiFetch('/pedidos');
    if (!pedidos.length) { mount.innerHTML = '<div class="empty-state">Aún no tienes pedidos. <a href="catalogo.html" class="link-arrow">Ir al catálogo</a></div>'; return; }
    mount.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Pedido</th><th>Fecha</th><th>Total</th><th>Pago</th><th>Envío</th><th></th></tr></thead>
        <tbody>
          ${pedidos.map((p) => `
            <tr>
              <td>#${p.id}</td>
              <td>${new Date(p.fecha_creacion).toLocaleDateString('es-PE')}</td>
              <td>${formatoMoneda(p.monto_total)}</td>
              <td><span class="status-tag">${p.estado_pago}</span></td>
              <td><span class="status-tag">${p.estado_envio || 'Preparando'}</span></td>
              <td><button class="btn btn-ghost btn-sm" data-ver-pedido="${p.id}">Ver detalle</button></td>
            </tr>
            <tr id="detalle-pedido-${p.id}" class="order-detail-row" style="display:none;"><td colspan="6"></td></tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.querySelectorAll('[data-ver-pedido]').forEach((btn) => {
      btn.addEventListener('click', () => togglePedido(btn.dataset.verPedido));
    });
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function togglePedido(id) {
  const fila = document.getElementById(`detalle-pedido-${id}`);
  const visible = fila.style.display !== 'none';
  document.querySelectorAll('.order-detail-row').forEach((f) => (f.style.display = 'none'));
  if (visible) return;
  fila.querySelector('td').innerHTML = '<div class="loading-state">Cargando…</div>';
  fila.style.display = '';
  try {
    const p = await apiFetch(`/pedidos/${id}`);
    fila.querySelector('td').innerHTML = `
      <div style="padding:10px 0;">
        <p style="font-size:0.8rem; color:var(--color-text-faint); margin-bottom:12px;">
          Entrega: ${escapeHtml(p.direccion_detalle || '—')} ${p.numero_guia_seguimiento ? `&middot; Guía: ${escapeHtml(p.numero_guia_seguimiento)}` : ''}
        </p>
        ${p.items.map((i) => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0;"><span>${i.cantidad} &times; ${escapeHtml(i.marca)} — ${escapeHtml(i.nombre)}</span><span>${formatoMoneda(i.subtotal)}</span></div>`).join('')}
      </div>
    `;
  } catch (err) {
    fila.querySelector('td').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

/* ---- Reservas de consolidados ---- */
async function cargarReservas() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando reservas…</div>';
  try {
    const reservas = await apiFetch('/consolidados/mias/reservas');
    if (!reservas.length) { mount.innerHTML = '<div class="empty-state">Aún no tienes reservas en consolidados. <a href="consolidados.html" class="link-arrow">Ver campañas activas</a></div>'; return; }
    mount.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Perfume</th><th>Campaña</th><th>Cantidad</th><th>Precio</th><th>Estado</th></tr></thead>
        <tbody>
          ${reservas.map((r) => `
            <tr>
              <td><a href="producto.html?slug=${r.slug}" style="color:var(--color-text)">${escapeHtml(r.marca)} — ${escapeHtml(r.nombre)}</a></td>
              <td><a href="consolidado.html?id=${escapeHtml(String(r.id))}" style="color:var(--color-gold)">${escapeHtml(r.codigo_campana)}</a></td>
              <td>${r.cantidad}</td>
              <td>${formatoMoneda(r.precio_consolidado_aplicado)}</td>
              <td><span class="status-tag">${escapeHtml(r.estado_item)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

/* ---- Direcciones ---- */
async function cargarDirecciones() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando direcciones…</div>';
  try {
    const [direcciones, ubigeos] = await Promise.all([apiFetch('/direcciones'), apiFetch('/ubigeo')]);
    mount.innerHTML = `
      <div id="lista-direcciones">
        ${direcciones.length
          ? direcciones.map((d) => `
            <div class="direccion-card">
              <div>
                <strong>${escapeHtml(d.etiqueta || 'Dirección')}</strong> ${d.predeterminada ? '<span class="status-tag">Predeterminada</span>' : ''}
                <p style="margin:6px 0 0; font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(d.direccion_detalle)}, ${escapeHtml(d.distrito)}, ${escapeHtml(d.provincia)}</p>
                <p style="margin:4px 0 0; font-size:0.75rem; color:var(--color-text-faint);">${escapeHtml(d.tipo_despacho.replace(/_/g, ' '))}${d.agencia_nombre ? ' — ' + escapeHtml(d.agencia_nombre) : ''}</p>
              </div>
              <button class="btn btn-danger btn-sm" data-eliminar-dir="${d.id}">Eliminar</button>
            </div>
          `).join('')
          : '<p class="form-hint" style="margin-bottom:20px;">No tienes direcciones guardadas.</p>'}
      </div>
      <h3 style="font-size:1rem; margin:28px 0 16px;">Agregar Nueva Dirección</h3>
      <form id="nueva-direccion-form" class="form-card" style="max-width:520px; margin:0;">
        <div class="form-group"><label>Etiqueta</label><input type="text" name="etiqueta" placeholder="Casa, Oficina..." /></div>
        <div class="form-group"><label>Dirección</label><textarea name="direccion_detalle" rows="2" required></textarea></div>
        <div class="form-group">
          <label>Distrito</label>
          <select name="codigo_ubigeo" required>
            ${ubigeos.map((u) => `<option value="${u.codigo_ubigeo}">${escapeHtml(u.distrito)} — ${escapeHtml(u.provincia)}, ${escapeHtml(u.departamento)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Tipo de despacho</label>
          <select name="tipo_despacho" id="tipo-despacho-select" required>
            <option value="Domicilio">Entrega a domicilio</option>
            <option value="Agencia_Shalom">Agencia Shalom</option>
            <option value="Agencia_Olva">Agencia Olva</option>
            <option value="Recojo_En_Tienda">Recojo en tienda</option>
          </select>
        </div>
        <div class="form-group" id="agencia-group" style="display:none;"><label>Nombre de la agencia</label><input type="text" name="agencia_nombre" /></div>
        <label class="filter-option"><input type="checkbox" name="predeterminada" /> Usar como predeterminada</label>
        <button type="submit" class="btn btn-outline btn-block mt-40" style="margin-top:20px;">Guardar Dirección</button>
      </form>
    `;

    document.querySelectorAll('[data-eliminar-dir]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/direcciones/${btn.dataset.eliminarDir}`, { method: 'DELETE' });
          mostrarToast('Dirección eliminada');
          cargarDirecciones();
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });

    document.getElementById('tipo-despacho-select').addEventListener('change', (e) => {
      document.getElementById('agencia-group').style.display = e.target.value.startsWith('Agencia') ? '' : 'none';
    });

    document.getElementById('nueva-direccion-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.predeterminada = !!data.predeterminada;
      try {
        await apiFetch('/direcciones', { method: 'POST', body: JSON.stringify(data) });
        mostrarToast('Dirección agregada');
        cargarDirecciones();
      } catch (err) {
        mostrarToast(err.message, 'error');
      }
    });
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

/* ---- Favoritos ---- */
async function cargarFavoritos() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando favoritos…</div>';
  try {
    const favoritos = await apiFetch('/favoritos');
    mount.innerHTML = favoritos.length
      ? `<div class="fav-grid">${favoritos.map((f) => tarjetaProducto({ ...f, genero: 'Unisex', mililitros: '', concentracion: '', estado: 'Disponible' })).join('')}</div>`
      : '<div class="empty-state">Aún no tienes favoritos. <a href="catalogo.html" class="link-arrow">Explorar catálogo</a></div>';
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

/* ---- Cotizaciones ---- */
async function cargarCotizaciones() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando cotizaciones…</div>';
  try {
    const cotizaciones = await apiFetch('/cotizaciones');
    mount.innerHTML = `
      <p class="form-hint" style="margin-bottom:20px;">¿Buscas un perfume que no está en catálogo? <a href="contacto.html" class="link-arrow">Solicita una cotización</a>.</p>
      ${cotizaciones.length
        ? `<table class="data-table"><thead><tr><th>Perfume</th><th>Marca</th><th>Estado</th><th>Precio Cotizado</th></tr></thead><tbody>
            ${cotizaciones.map((c) => `<tr><td>${escapeHtml(c.nombre_perfume_solicitado)}</td><td>${escapeHtml(c.marca_solicitada)}</td><td><span class="status-tag">${escapeHtml(c.estado)}</span></td><td>${c.precio_cotizado_tienda ? formatoMoneda(c.precio_cotizado_tienda) : '—'}</td></tr>`).join('')}
          </tbody></table>`
        : '<div class="empty-state">No has enviado solicitudes de cotización aún.</div>'}
    `;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}
