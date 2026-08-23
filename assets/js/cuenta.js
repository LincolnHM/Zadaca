const PARAMS = new URLSearchParams(window.location.search);
// Todo "retorno" legítimo lo arma el propio sitio como SITE_ROOT + ruta (ver consolidado.js,
// cuenta.js mismo, etc.) -- sin este chequeo, un link tipo cuenta/?retorno=https://sitio-falso.com
// mandaba al cliente recién logueado a cualquier dominio externo apenas iniciaba sesión.
const RETORNO_CRUDO = PARAMS.get('retorno');
const RETORNO = RETORNO_CRUDO && RETORNO_CRUDO.startsWith(SITE_ROOT) ? RETORNO_CRUDO : null;
const PEDIDO_A_RESALTAR = PARAMS.get('pedido');
let TAB_ACTIVA = PARAMS.get('tab') || 'pedidos';

document.addEventListener('DOMContentLoaded', async () => {
  await iniciarLayout('cuenta/');

  if (!SUPABASE_CONFIGURADO) {
    document.getElementById('cuenta-mount').innerHTML = '<div class="container"><div class="empty-state">Configura Supabase en assets/js/supabase-config.js (ver README.md).</div></div>';
    return;
  }

  // El link del correo de "recuperar contraseña" vuelve a esta misma página con un token en
  // la URL; Supabase lo procesa solo y dispara este evento (antes de que getSession() abajo
  // resuelva) -- hay que registrar el listener antes de pedir la sesión normal, si no el
  // evento puede llegar y perderse.
  let enRecuperacion = false;
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      enRecuperacion = true;
      document.getElementById('page-heading').textContent = 'Restablecer Contraseña';
      renderNuevaContrasenaForm();
    }
  });

  const session = await obtenerSesion();
  if (enRecuperacion) return;
  if (session) {
    document.getElementById('page-heading').textContent = 'Mi Cuenta';
    renderDashboard();
  } else {
    document.getElementById('page-heading').textContent = 'Ingresa o Crea tu Cuenta';
    renderAuthForms();
  }
});

// Bloque reutilizado por "Crear Cuenta", "Restablecer contraseña" (link del correo) y
// "Seguridad" (cambiar contraseña ya logueado) -- mismo checklist en vivo, mismos requisitos,
// un solo lugar donde mantenerlos en vez de tres copias que puedan divergir.
function formularioContrasenaHtml(prefix) {
  return `
    <div class="form-group has-icon">
      <label>Nueva contraseña</label>
      <div class="input-wrap password-field">
        <span class="form-icon">${ICONS.lock}</span>
        <input type="password" name="contrasena" id="${prefix}-contrasena" minlength="8" autocomplete="new-password" required />
        <button type="button" class="toggle-password" aria-label="Mostrar contraseña">${ICONS.eye}</button>
      </div>
    </div>
    <ul class="pwd-requirements" id="${prefix}-requirements" aria-live="polite">
      <li data-req="longitud"><span class="pwd-req-mark">•</span> Mínimo 8 caracteres</li>
      <li data-req="mayuscula"><span class="pwd-req-mark">•</span> Una letra mayúscula</li>
      <li data-req="numero"><span class="pwd-req-mark">•</span> Un número</li>
      <li data-req="especial"><span class="pwd-req-mark">•</span> Un carácter especial (ej. ! @ # $)</li>
    </ul>
    <div class="form-group has-icon">
      <label>Repetir Contraseña</label>
      <div class="input-wrap password-field">
        <span class="form-icon">${ICONS.lock}</span>
        <input type="password" name="confirmar_contrasena" id="${prefix}-confirmar" autocomplete="new-password" required />
        <button type="button" class="toggle-password" aria-label="Mostrar contraseña">${ICONS.eye}</button>
      </div>
      <p class="form-hint" id="${prefix}-confirmar-hint"></p>
    </div>
  `;
}

/* ---------------- AUTENTICACIÓN ---------------- */

function renderAuthForms() {
  document.getElementById('cuenta-mount').innerHTML = `
    <div class="container">
      <div class="auth-shell">
        <div class="auth-visual">
          <div class="auth-visual-content">
            <span class="brand-icon-lg">${LOGO_IMG}</span>
            <h2>La casa de tus fragancias favoritas</h2>
            <p>Crea tu cuenta para reservar en consolidados, guardar favoritos y seguir tus pedidos.</p>
            <div class="auth-perks">
              <div class="auth-perk"><span>${ICONS.shield}</span> Perfumes 100% originales importados</div>
              <div class="auth-perk"><span>${ICONS.truck}</span> Envíos a todo el Perú</div>
              <div class="auth-perk"><span>${ICONS.box}</span> Compra individual o consolidada</div>
            </div>
          </div>
        </div>
        <div class="form-card auth-card">
          <div class="form-tabs">
            <button class="form-tab active" data-tab="login">Iniciar Sesión</button>
            <button class="form-tab" data-tab="registro">Crear Cuenta</button>
            <div class="tab-indicator"></div>
          </div>
          <div id="alert-mount"></div>
          <form id="login-form">
            <div class="form-group has-icon">
              <label>Correo</label>
              <div class="input-wrap"><span class="form-icon">${ICONS.mail}</span><input type="email" name="correo" required /></div>
            </div>
            <div class="form-group has-icon">
              <label>Contraseña</label>
              <div class="input-wrap password-field">
                <span class="form-icon">${ICONS.lock}</span>
                <input type="password" name="contrasena" required />
                <button type="button" class="toggle-password" aria-label="Mostrar contraseña">${ICONS.eye}</button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
            <button type="button" id="btn-olvide-contrasena" class="link-arrow" style="margin-top:14px; font-size:0.78rem;">¿Olvidaste tu contraseña?</button>
          </form>
          <form id="registro-form" style="display:none;">
            <div class="form-row">
              <div class="form-group has-icon">
                <label>Nombres</label>
                <div class="input-wrap"><span class="form-icon">${ICONS.user}</span><input type="text" name="nombres" required /></div>
              </div>
              <div class="form-group"><label>Apellidos</label><input type="text" name="apellidos" required /></div>
            </div>
            <div class="form-row">
              <div class="form-group has-icon">
                <label>DNI / CE / RUC</label>
                <div class="input-wrap"><span class="form-icon">${ICONS.idCard}</span><input type="text" name="dni_ce_ruc" maxlength="15" /></div>
              </div>
              <div class="form-group has-icon">
                <label>Teléfono</label>
                <div class="input-wrap"><span class="form-icon">${ICONS.phone}</span><input type="text" name="telefono" /></div>
              </div>
            </div>
            <div class="form-group has-icon">
              <label>Correo</label>
              <div class="input-wrap"><span class="form-icon">${ICONS.mail}</span><input type="email" name="correo" required /></div>
            </div>
            ${formularioContrasenaHtml('registro')}
            <button type="submit" class="btn btn-primary btn-block" id="registro-submit" disabled>Crear Cuenta</button>
          </form>
        </div>
      </div>
    </div>
  `;

  activarTogglesPassword(document.getElementById('cuenta-mount'));

  document.querySelectorAll('.form-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.form-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const esLogin = tab.dataset.tab === 'login';
      document.querySelector('.form-tabs').classList.toggle('tab-registro', !esLogin);
      document.getElementById('login-form').style.display = esLogin ? '' : 'none';
      document.getElementById('registro-form').style.display = esLogin ? 'none' : '';
    });
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await iniciarSesion(data);
      window.location.href = RETORNO || `${SITE_ROOT}cuenta/`;
    } catch (err) {
      mostrarAlerta(err.message);
    }
  });

  document.getElementById('btn-olvide-contrasena').addEventListener('click', renderRecuperarForm);

  conectarValidacionContrasena('registro', 'registro-submit');

  document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!passwordValida(data.contrasena) || data.contrasena !== data.confirmar_contrasena) {
      mostrarAlerta('Revisa los requisitos de la contraseña antes de continuar.');
      return;
    }
    try {
      const resultado = await registrarUsuario(data);
      if (resultado.session) {
        mostrarToast('¡Cuenta creada con éxito!');
        window.location.href = RETORNO || `${SITE_ROOT}cuenta/`;
      } else {
        // Si el proyecto tiene "Confirm email" activo en Supabase, acá se corta el flujo hasta
        // que el cliente confirme -- como no hay proveedor de correo propio configurado
        // (ver README), ese correo puede demorar o no llegar. Se deja el aviso honesto con
        // salida por WhatsApp en vez de prometer algo que no podemos garantizar.
        mostrarAlertaExito(
          'Cuenta creada. Si tu proyecto pide confirmar el correo antes de ingresar, revisa tu bandeja ' +
          '(y spam). Si no te llega nada, escríbenos por WhatsApp y te activamos la cuenta manualmente.'
        );
        e.target.reset();
        actualizarValidacionContrasena('registro', 'registro-submit');
      }
    } catch (err) {
      mostrarAlerta(err.message);
    }
  });
}

// "¿Olvidaste tu contraseña?" -- pide el correo y dispara el link de recuperación que ya
// manda Supabase por defecto (no depende de que el negocio tenga su propio envío de correo
// configurado). Si no llega, el mensaje deja la salida por WhatsApp, igual que el resto del
// sitio resuelve todo lo que no puede garantizar por correo.
function renderRecuperarForm() {
  document.getElementById('cuenta-mount').querySelector('.auth-card').innerHTML = `
    <h3 style="margin-bottom:6px;">Recuperar contraseña</h3>
    <p class="form-hint" style="margin-bottom:20px;">Te enviaremos un link para elegir una contraseña nueva.</p>
    <div id="alert-mount"></div>
    <form id="recuperar-form">
      <div class="form-group has-icon">
        <label>Correo</label>
        <div class="input-wrap"><span class="form-icon">${ICONS.mail}</span><input type="email" name="correo" required /></div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Enviar link de recuperación</button>
      <button type="button" id="btn-volver-login" class="link-arrow" style="margin-top:14px; font-size:0.78rem;">&larr; Volver a iniciar sesión</button>
    </form>
  `;
  document.getElementById('btn-volver-login').addEventListener('click', renderAuthForms);
  document.getElementById('recuperar-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = e.target.correo.value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await solicitarRecuperacionContrasena(correo);
      document.getElementById('cuenta-mount').querySelector('.auth-card').innerHTML = `
        <h3 style="margin-bottom:12px;">Revisa tu correo</h3>
        <p class="form-hint">Si <strong style="color:var(--color-text);">${escapeHtml(correo)}</strong> tiene una cuenta con nosotros, te llegará un link para elegir una contraseña nueva en unos minutos (revisa spam también).</p>
        <p class="form-hint" style="margin-top:14px;">¿No te llega nada? <a href="https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola, no puedo recuperar mi contraseña. Mi correo es: ' + correo)}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> y te ayudamos directo.</p>
        <button type="button" id="btn-volver-login" class="link-arrow" style="margin-top:20px; font-size:0.78rem;">&larr; Volver a iniciar sesión</button>
      `;
      document.getElementById('btn-volver-login').addEventListener('click', renderAuthForms);
    } catch (err) {
      mostrarAlerta(err.message);
      btn.disabled = false;
    }
  });
}

// Pantalla que se muestra cuando el cliente vuelve del link de recuperación (evento
// PASSWORD_RECOVERY, ver DOMContentLoaded) -- pide la contraseña nueva dos veces y la guarda
// con cambiarContrasena(), que no necesita la contraseña anterior porque Supabase ya validó
// el token del correo.
function renderNuevaContrasenaForm() {
  document.getElementById('cuenta-mount').innerHTML = `
    <div class="container">
      <div class="auth-shell" style="grid-template-columns: 1fr;">
        <div class="form-card auth-card" style="max-width:440px; margin:0 auto;">
          <h3 style="margin-bottom:6px;">Elige tu nueva contraseña</h3>
          <p class="form-hint" style="margin-bottom:20px;">Ya verificamos tu identidad con el link del correo -- solo falta la contraseña nueva.</p>
          <div id="alert-mount"></div>
          <form id="restablecer-form">
            ${formularioContrasenaHtml('restablecer')}
            <button type="submit" class="btn btn-primary btn-block" id="restablecer-submit" disabled>Guardar Nueva Contraseña</button>
          </form>
        </div>
      </div>
    </div>
  `;
  activarTogglesPassword(document.getElementById('cuenta-mount'));
  conectarValidacionContrasena('restablecer', 'restablecer-submit');
  document.getElementById('restablecer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!passwordValida(data.contrasena) || data.contrasena !== data.confirmar_contrasena) {
      mostrarAlerta('Revisa los requisitos de la contraseña antes de continuar.');
      return;
    }
    try {
      await cambiarContrasena(data.contrasena);
      mostrarToast('Contraseña actualizada. ¡Ya puedes usarla para ingresar!');
      window.location.href = `${SITE_ROOT}cuenta/`;
    } catch (err) {
      mostrarAlerta(err.message);
    }
  });
}

function mostrarAlerta(mensaje) {
  document.getElementById('alert-mount').innerHTML = `<div class="alert alert-error">${escapeHtml(mensaje)}</div>`;
}
function mostrarAlertaExito(mensaje) {
  document.getElementById('alert-mount').innerHTML = `<div class="alert alert-success">${escapeHtml(mensaje)}</div>`;
}

// Requisitos de contraseña para Crear Cuenta: mínimo 8 caracteres, al menos una mayúscula,
// un número y un carácter especial. Se validan también acá (no solo en el HTML) porque el
// checklist en vivo y el botón deshabilitado dependen de esta misma función.
function evaluarPassword(valor) {
  const v = valor || '';
  return {
    longitud: v.length >= 8,
    mayuscula: /[A-Z]/.test(v),
    numero: /[0-9]/.test(v),
    especial: /[^A-Za-z0-9]/.test(v),
  };
}
function passwordValida(valor) {
  return Object.values(evaluarPassword(valor)).every(Boolean);
}

// prefix identifica qué instancia del formulario (ver formularioContrasenaHtml): 'registro',
// 'restablecer' (link del correo) o 'cambiar' (Seguridad, ya logueado) -- misma lógica,
// distintos IDs, así que ninguna de las tres copias puede divergir en los requisitos.
function actualizarValidacionContrasena(prefix, submitId) {
  const passInput = document.getElementById(`${prefix}-contrasena`);
  const confirmInput = document.getElementById(`${prefix}-confirmar`);
  const confirmHint = document.getElementById(`${prefix}-confirmar-hint`);
  const submitBtn = document.getElementById(submitId);
  if (!passInput) return;

  const estado = evaluarPassword(passInput.value);
  document.querySelectorAll(`#${prefix}-requirements li`).forEach((li) => {
    const ok = estado[li.dataset.req];
    li.classList.toggle('valid', ok);
    li.querySelector('.pwd-req-mark').textContent = ok ? '✓' : '•';
  });

  let coincide = true;
  if (confirmInput.value) {
    coincide = confirmInput.value === passInput.value;
    confirmHint.textContent = coincide ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.';
    confirmHint.className = `form-hint ${coincide ? 'pwd-match-ok' : 'pwd-match-error'}`;
  } else {
    confirmHint.textContent = '';
    confirmHint.className = 'form-hint';
  }

  submitBtn.disabled = !(Object.values(estado).every(Boolean) && confirmInput.value && coincide);
}

function conectarValidacionContrasena(prefix, submitId) {
  const actualizar = () => actualizarValidacionContrasena(prefix, submitId);
  document.getElementById(`${prefix}-contrasena`).addEventListener('input', actualizar);
  document.getElementById(`${prefix}-confirmar`).addEventListener('input', actualizar);
}

/* ---------------- DASHBOARD ---------------- */

async function renderDashboard() {
  const perfil = await obtenerPerfilActual();
  const tabs = [
    { id: 'pedidos', label: 'Mis Pedidos' },
    { id: 'reservas', label: 'Mis Reservas' },
    { id: 'direcciones', label: 'Mis Direcciones' },
    { id: 'favoritos', label: 'Favoritos' },
    { id: 'cotizaciones', label: 'Cotizaciones' },
    { id: 'notificaciones', label: 'Notificaciones' },
    { id: 'seguridad', label: 'Seguridad' },
  ];

  document.getElementById('cuenta-mount').innerHTML = `
    <div class="container dash-layout">
      <nav class="dash-nav">
        <div style="padding:10px 14px 18px; border-bottom:1px solid var(--color-border); margin-bottom:10px;">
          <div style="font-weight:600;">${escapeHtml(perfil?.nombres || '')} ${escapeHtml(perfil?.apellidos || '')}</div>
          <div style="font-size:0.75rem; color:var(--color-text-faint);">${escapeHtml(perfil?.correo || '')}</div>
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
  if (TAB_ACTIVA === 'notificaciones') return cargarNotificacionesTab();
  if (TAB_ACTIVA === 'seguridad') return cargarSeguridad();
}

/* ---- Seguridad (cambiar contraseña) ---- */
function cargarSeguridad() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = `
    <form id="cambiar-form" class="form-card" style="max-width:420px; margin:0;">
      <h3 style="font-size:1rem; margin-bottom:16px;">Cambiar contraseña</h3>
      ${formularioContrasenaHtml('cambiar')}
      <button type="submit" class="btn btn-outline btn-block" id="cambiar-submit" disabled>Guardar Nueva Contraseña</button>
    </form>
  `;
  activarTogglesPassword(mount);
  conectarValidacionContrasena('cambiar', 'cambiar-submit');
  document.getElementById('cambiar-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!passwordValida(data.contrasena) || data.contrasena !== data.confirmar_contrasena) {
      mostrarToast('Revisa los requisitos de la contraseña antes de continuar.', 'error');
      return;
    }
    try {
      await cambiarContrasena(data.contrasena);
      mostrarToast('Contraseña actualizada');
      e.target.reset();
      actualizarValidacionContrasena('cambiar', 'cambiar-submit');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  });
}

/* ---- Pedidos ---- */
async function cargarPedidos() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando pedidos…</div>';
  try {
    const pedidos = await obtenerPedidos();
    if (!pedidos.length) { mount.innerHTML = `<div class="empty-state">Aún no tienes pedidos. <a href="${SITE_ROOT}catalogo/" class="link-arrow">Ir al catálogo</a></div>`; return; }
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
    document.querySelectorAll('[data-ver-pedido]').forEach((btn) => btn.addEventListener('click', () => togglePedido(btn.dataset.verPedido)));

    // Tras un checkout recién hecho, carrito.js redirige acá con ?pedido=ID — se abre su
    // detalle solo, para que el cliente vea de una que su pedido se creó bien.
    if (PEDIDO_A_RESALTAR && pedidos.some((p) => String(p.id) === PEDIDO_A_RESALTAR)) {
      togglePedido(PEDIDO_A_RESALTAR);
      document.querySelector(`[data-ver-pedido="${PEDIDO_A_RESALTAR}"]`)?.scrollIntoView({ block: 'center' });
    }
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function togglePedido(id) {
  const fila = document.getElementById(`detalle-pedido-${id}`);
  const visible = fila.style.display !== 'none';
  document.querySelectorAll('.order-detail-row').forEach((f) => (f.style.display = 'none'));
  if (visible) return;
  fila.style.display = '';
  cargarDetallePedido(id);
}

async function cargarDetallePedido(id) {
  const fila = document.getElementById(`detalle-pedido-${id}`);
  fila.querySelector('td').innerHTML = '<div class="loading-state">Cargando…</div>';
  try {
    const p = await obtenerPedidoPorId(id);
    const saldoPendiente = Number(p.monto_saldo_pendiente);
    fila.querySelector('td').innerHTML = `
      <div style="padding:10px 0;">
        <p style="font-size:0.8rem; color:var(--color-text-faint); margin-bottom:12px;">
          Entrega: ${escapeHtml(p.direccion_detalle || '—')} ${p.numero_guia_seguimiento ? `&middot; Guía: ${escapeHtml(p.numero_guia_seguimiento)}` : ''}
        </p>
        ${p.items.map((i) => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0;"><span>${i.cantidad} &times; ${escapeHtml(i.marca)} — ${escapeHtml(i.nombre)}</span><span>${formatoMoneda(i.subtotal)}</span></div>`).join('')}
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:8px 0; border-top:1px solid var(--color-border); margin-top:4px;">
          <span>Pagado</span><span>${formatoMoneda(p.monto_adelanto_pagado)} de ${formatoMoneda(p.monto_total)}</span>
        </div>

        <strong style="display:block; margin:18px 0 8px; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-gold);">Pagos registrados</strong>
        ${p.pagos.length ? p.pagos.map((pg) => `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; padding:6px 0;">
            <span>${escapeHtml(pg.metodo_pago || '—')} &middot; ${new Date(pg.fecha_pago).toLocaleDateString('es-PE')}</span>
            <span class="status-tag" style="${pg.estado_pago === 'Anulado' ? 'background:rgba(196,106,95,0.15); color:var(--color-danger);' : 'background:rgba(127,174,131,0.15); color:var(--color-success);'}">${formatoMoneda(pg.monto)} · ${escapeHtml(pg.estado_pago)}</span>
          </div>
        `).join('') : '<p style="font-size:0.8rem; color:var(--color-text-faint);">Aún no hay pagos registrados en este pedido.</p>'}

        ${saldoPendiente > 0 ? `
        <div style="margin-top:16px; border-top:1px solid var(--color-border); padding-top:16px;">
          <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:10px;">
            Saldo pendiente: <strong style="color:var(--color-gold);">${formatoMoneda(saldoPendiente)}</strong>.
            Puedes pagarlo completo o en partes (Yape, Plin o transferencia) — coordina el monto y te enviamos los datos por WhatsApp.
          </p>
          <a class="btn btn-whatsapp btn-sm" href="${enlaceWhatsappPago({ idPedido: id, montoPendiente: saldoPendiente, montoTotal: p.monto_total })}" target="_blank" rel="noopener">Pagar por WhatsApp</a>
        </div>` : ''}
      </div>
    `;
  } catch (err) {
    fila.querySelector('td').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

/* ---- Reservas de consolidados ---- */
const ESTADOS_CAMPANA_LEGIBLES = {
  Borrador: 'Próximamente', Abierto: 'Abierto', Cerrado_Procesando: 'Cerrado — Procesando',
  Comprado_En_Transito: 'En tránsito', En_Aduanas: 'En aduanas', En_Almacen_Local: 'En almacén local',
  Finalizado: 'Finalizado', Cancelado: 'Cancelado',
};
// Reservas de 10 unidades o más de un mismo perfume quedan en 'Pendiente_Aprobacion' hasta que
// el admin las revisa (ver migración 0006) — acá solo se traduce el texto para el cliente.
const ESTADOS_ITEM_LEGIBLES = {
  Reservado: 'Reservado', Pendiente_Aprobacion: 'Pendiente de aprobación', Confirmado: 'Confirmado',
  Cancelado: 'Cancelado', Convertido_A_Pedido: 'Convertido a pedido',
};

async function cargarReservas() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando reservas…</div>';
  try {
    const reservas = await obtenerMisReservas();
    if (!reservas.length) { mount.innerHTML = `<div class="empty-state">Aún no tienes reservas en consolidados. <a href="${SITE_ROOT}consolidados/" class="link-arrow">Ver campañas activas</a></div>`; return; }
    mount.innerHTML = `
      <p class="form-hint" style="margin-bottom:16px;">El estado de la campaña (columna "Envío") se actualiza solo, y también te llega como notificación arriba.</p>
      <table class="data-table">
        <thead><tr><th>Perfume</th><th>Campaña</th><th>Cantidad</th><th>Precio</th><th>Reserva</th><th>Envío</th></tr></thead>
        <tbody>
          ${reservas.map((r) => `
            <tr>
              <td><a href="${SITE_ROOT}producto/?slug=${r.slug}" style="color:var(--color-text)">${escapeHtml(r.marca)} — ${escapeHtml(r.nombre)}</a></td>
              <td><a href="${SITE_ROOT}consolidado/?id=${r.id_consolidado}" style="color:var(--color-gold)">${escapeHtml(r.codigo_campana)}</a></td>
              <td>${r.cantidad}</td>
              <td>${formatoMoneda(r.precio_consolidado_aplicado)}</td>
              <td><span class="status-tag"${r.estado_item === 'Pendiente_Aprobacion' ? ' style="background:rgba(188,186,194,0.15); color:var(--color-gold);"' : ''}>${escapeHtml(ESTADOS_ITEM_LEGIBLES[r.estado_item] || r.estado_item)}</span></td>
              <td><span class="status-tag">${escapeHtml(ESTADOS_CAMPANA_LEGIBLES[r.estado_consolidado] || r.estado_consolidado || '—')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

/* ---- Notificaciones ---- */
async function cargarNotificacionesTab() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando notificaciones…</div>';
  try {
    const notificaciones = await obtenerNotificaciones({ limite: 100 });
    if (!notificaciones.length) { mount.innerHTML = '<div class="empty-state">No tienes notificaciones todavía.</div>'; return; }
    mount.innerHTML = `
      <button class="btn btn-outline btn-sm" id="btn-marcar-todas-tab" style="margin-bottom:16px;">Marcar todas como leídas</button>
      <div id="notif-tab-lista">
        ${notificaciones.map((n) => `
          <div class="direccion-card" data-id="${n.id}" style="${n.leido ? '' : 'border-color:var(--color-gold);'}">
            <div>
              <strong>${escapeHtml(n.titulo)}</strong> ${!n.leido ? '<span class="status-tag">Nuevo</span>' : ''}
              <p style="margin:6px 0 0; font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(n.mensaje)}</p>
              <p style="margin:4px 0 0; font-size:0.72rem; color:var(--color-text-faint);">${new Date(n.fecha_creacion).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            ${n.url_destino ? `<a href="${escapeHtml(SITE_ROOT + n.url_destino)}" class="btn btn-ghost btn-sm">Ver</a>` : ''}
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('btn-marcar-todas-tab').addEventListener('click', async () => {
      try { await marcarTodasNotificacionesLeidas(); cargarNotificacionesTab(); actualizarBadgeNotificaciones(); } catch (err) { mostrarToast(err.message, 'error'); }
    });
    document.querySelectorAll('#notif-tab-lista [data-id]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') return; // deja que el link navegue normal
        marcarNotificacionLeida(Number(card.dataset.id)).then(actualizarBadgeNotificaciones).catch(() => {});
      });
    });
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

/* ---- Direcciones ---- */
async function cargarDirecciones() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando direcciones…</div>';
  try {
    const [direcciones, ubigeos] = await Promise.all([obtenerDirecciones(), obtenerUbigeos()]);
    mount.innerHTML = `
      <div id="lista-direcciones">
        ${direcciones.length
          ? direcciones.map((d) => `
            <div class="direccion-card">
              <div>
                <strong>${escapeHtml(d.etiqueta || 'Dirección')}</strong> ${d.predeterminada ? '<span class="status-tag">Predeterminada</span>' : ''}
                <p style="margin:6px 0 0; font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(d.direccion_detalle)}, ${escapeHtml(d.distrito)}, ${escapeHtml(d.provincia)}</p>
                <p style="margin:4px 0 0; font-size:0.75rem; color:var(--color-text-faint);">${escapeHtml(d.tipo_despacho === 'Recojo_En_Tienda' ? 'Recojo en almacén (Lima)' : d.tipo_despacho.replace(/_/g, ' '))}${d.agencia_nombre ? ' — ' + escapeHtml(d.agencia_nombre) : ''}</p>
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
        <div class="form-group">
          <label>Tipo de despacho</label>
          <select name="tipo_despacho" id="tipo-despacho-select" required>
            <option value="Domicilio">Entrega a domicilio</option>
            <option value="Agencia_Shalom">Agencia Shalom</option>
            <option value="Agencia_Olva">Agencia Olva</option>
            <option value="Recojo_En_Tienda">Recojo en almacén (Lima)</option>
          </select>
        </div>
        <div class="form-group" id="agencia-group" style="display:none;"><label>Nombre de la agencia</label><input type="text" name="agencia_nombre" /></div>
        <p class="form-hint" id="recojo-hint" style="display:none; margin:-10px 0 18px;">El recojo es en nuestro almacén de Lima: Jr. Ávila Godoy 664, San Martín de Porres. No es tienda física de atención al público.</p>
        <label class="filter-option"><input type="checkbox" name="predeterminada" /> Usar como predeterminada</label>
        <button type="submit" class="btn btn-outline btn-block" style="margin-top:20px;">Guardar Dirección</button>
      </form>
    `;

    document.querySelectorAll('[data-eliminar-dir]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await eliminarDireccion(btn.dataset.eliminarDir);
          mostrarToast('Dirección eliminada');
          cargarDirecciones();
        } catch (err) {
          mostrarToast(err.message, 'error');
        }
      });
    });

    document.getElementById('tipo-despacho-select').addEventListener('change', (e) => {
      document.getElementById('agencia-group').style.display = e.target.value.startsWith('Agencia') ? '' : 'none';
      document.getElementById('recojo-hint').style.display = e.target.value === 'Recojo_En_Tienda' ? '' : 'none';
    });

    iniciarSelectsUbigeoCascada(ubigeos);

    document.getElementById('nueva-direccion-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.predeterminada = !!data.predeterminada;
      try {
        await crearDireccion(data);
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

// Departamento -> Provincia -> Distrito en cascada. Con 1874 distritos en la tabla ubigeo
// (ver supabase/carga_ubigeo_completo.sql) un solo <select> con todos sería inmanejable --
// esto reduce cada paso a una lista corta (24 departamentos, ~5-20 provincias, ~5-30 distritos).
function iniciarSelectsUbigeoCascada(ubigeos) {
  const deptoSel = document.getElementById('ubigeo-depto-select');
  const provSel = document.getElementById('ubigeo-prov-select');
  const distSel = document.getElementById('ubigeo-dist-select');

  deptoSel.addEventListener('change', () => {
    const depto = deptoSel.value;
    const provincias = [...new Set(ubigeos.filter((u) => u.departamento === depto).map((u) => u.provincia))].sort();
    provSel.innerHTML = '<option value="">Selecciona...</option>' + provincias.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    provSel.disabled = !depto;
    distSel.innerHTML = '<option value="">Elige primero la provincia</option>';
    distSel.disabled = true;
  });

  provSel.addEventListener('change', () => {
    const depto = deptoSel.value;
    const prov = provSel.value;
    const distritos = ubigeos
      .filter((u) => u.departamento === depto && u.provincia === prov)
      .sort((a, b) => a.distrito.localeCompare(b.distrito));
    distSel.innerHTML = '<option value="">Selecciona...</option>' + distritos.map((d) => `<option value="${d.codigo_ubigeo}">${escapeHtml(d.distrito)}</option>`).join('');
    distSel.disabled = !prov;
  });
}

/* ---- Favoritos ---- */
async function cargarFavoritos() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando favoritos…</div>';
  try {
    const favoritos = await obtenerFavoritos();
    mount.innerHTML = favoritos.length
      ? `<div class="fav-grid">${favoritos.map(tarjetaProducto).join('')}</div>`
      : `<div class="empty-state">Aún no tienes favoritos. <a href="${SITE_ROOT}catalogo/" class="link-arrow">Explorar catálogo</a></div>`;
  } catch (err) {
    mount.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

/* ---- Cotizaciones ---- */
async function cargarCotizaciones() {
  const mount = document.getElementById('tab-content');
  mount.innerHTML = '<div class="loading-state">Cargando cotizaciones…</div>';
  try {
    const cotizaciones = await obtenerCotizaciones();
    mount.innerHTML = `
      <p class="form-hint" style="margin-bottom:20px;">¿Buscas un perfume que no está en catálogo? <a href="${SITE_ROOT}contacto/" class="link-arrow">Solicita una cotización</a>.</p>
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
