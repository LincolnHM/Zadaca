// Maizon Zadaca Courier (USA → Perú), páginas de /courier/. Sección aparte de la perfumería
// con sus propios colores: no usa Supabase, main.js ni style.css. Todo termina en WhatsApp
// (crear casillero, compramos por ti, cotizar): no se guarda ningún dato en la web.
//
// Para cambiar la tarifa, el número o el tope sin impuestos, se edita CX (abajo) y nada más.
const CX_ROOT = 'https://madisonzadaca.com/';
const CX = {
  whatsapp: '51990278017',
  tarifaUsd: 9,
  // SUNAT: un envío courier de hasta US$200 no paga impuestos de aduana (y suma los paquetes
  // de una misma persona que llegan en el mismo vuelo).
  limiteSinImpuestosUsd: 200,
};

const CX_ICONOS = {
  whatsapp: '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16.03 3C9.4 3 4 8.4 4 15.03c0 2.23.62 4.32 1.68 6.12L4 29l8.03-1.65a12 12 0 0 0 4 .68c6.63 0 12.03-5.4 12.03-12.03C28.06 8.4 22.66 3 16.03 3Zm0 21.94c-1.9 0-3.68-.5-5.24-1.4l-.38-.22-4.77.98.99-4.65-.25-.4a9.9 9.9 0 0 1-1.5-5.22c0-5.48 4.46-9.94 9.95-9.94 5.48 0 9.94 4.46 9.94 9.94 0 5.49-4.46 9.91-9.74 9.91Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17-.35.22-.65.07a8.14 8.14 0 0 1-2.4-1.48 9 9 0 0 1-1.66-2.06c-.17-.3 0-.46.13-.6.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.91-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.5.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  externo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  volver: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
};

const CX_NAV = [
  { href: 'courier/como-funciona/', label: 'Cómo funciona', pagina: 'como-funciona' },
  { href: 'courier/tarifas/', label: 'Tarifas', pagina: 'tarifas' },
  { href: 'courier/compramos-por-ti/', label: 'Compramos por ti', pagina: 'compramos-por-ti' },
  { href: 'courier/tiendas/', label: 'Tiendas', pagina: 'tiendas' },
  { href: 'courier/ayuda/', label: 'Ayuda', pagina: 'ayuda' },
];

function cxEscape(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cxTelefono() {
  const n = CX.whatsapp;
  return `+${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
}

function cxWa(texto = '') {
  return `https://wa.me/${CX.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

function cxAbrirWhatsapp(texto) {
  const a = document.createElement('a');
  a.href = cxWa(texto);
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function cxUsd(n) {
  return `US$${Number(n).toLocaleString('es-PE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/* ================= Encabezado, pie y WhatsApp flotante ================= */

function cxRenderHeader() {
  const mount = document.getElementById('cx-header');
  if (!mount) return;
  const pagina = document.body.dataset.pagina || '';
  mount.innerHTML = `
    <div class="cx-topbar">
      <div class="cx-container">
        <span class="cx-topbar-texto">Envíos semanales USA → Perú · Escríbenos al WhatsApp <a href="${cxWa('Hola Maizon Zadaca, tengo una consulta sobre el courier.')}" target="_blank" rel="noopener">${cxTelefono()}</a></span>
        <a class="cx-topbar-volver" href="${CX_ROOT}">${CX_ICONOS.volver} Ir a Maison Zadaca Perfumería</a>
      </div>
    </div>
    <header class="cx-header" id="cx-header-barra">
      <div class="cx-container cx-header-inner">
        <a class="cx-logo" href="${CX_ROOT}courier/" aria-label="Maizon Zadaca Courier, inicio">
          <img src="${CX_ROOT}assets/img/courier/logo-maizon-zadaca.webp" alt="Maizon Zadaca" width="408" height="96" />
        </a>
        <nav class="cx-nav" id="cx-nav" aria-label="Menú del courier">
          ${CX_NAV.map((l) => `<a href="${CX_ROOT}${l.href}"${l.pagina === pagina ? ' class="activo" aria-current="page"' : ''}>${l.label}</a>`).join('')}
          <a class="cx-btn cx-btn-naranja cx-btn-sm" href="${CX_ROOT}courier/casillero/"${pagina === 'casillero' ? ' aria-current="page"' : ''}>Crear casillero gratis</a>
          <a class="cx-nav-volver" href="${CX_ROOT}">← Maison Zadaca Perfumería</a>
        </nav>
        <button type="button" class="cx-menu-btn" id="cx-menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="cx-nav">${CX_ICONOS.menu}</button>
      </div>
    </header>`;

  const nav = document.getElementById('cx-nav');
  const boton = document.getElementById('cx-menu-btn');
  let fondo = null;
  const cerrar = () => {
    nav.classList.remove('abierto');
    boton.classList.remove('cerrar');
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
    boton.innerHTML = CX_ICONOS.menu;
    fondo?.remove();
    fondo = null;
    document.body.style.overflow = '';
  };
  const abrir = () => {
    nav.classList.add('abierto');
    boton.classList.add('cerrar');
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
    boton.innerHTML = CX_ICONOS.cerrar;
    fondo = document.createElement('div');
    fondo.className = 'cx-nav-fondo';
    fondo.addEventListener('click', cerrar);
    document.body.appendChild(fondo);
    document.body.style.overflow = 'hidden';
    nav.querySelector('a')?.focus();
  };
  boton.addEventListener('click', () => (nav.classList.contains('abierto') ? cerrar() : abrir()));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', cerrar));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('abierto')) { cerrar(); boton.focus(); } });
  window.matchMedia('(min-width: 901px)').addEventListener?.('change', (e) => { if (e.matches) cerrar(); });

  const barra = document.getElementById('cx-header-barra');
  const sombra = () => barra.classList.toggle('con-sombra', window.scrollY > 8);
  window.addEventListener('scroll', sombra, { passive: true });
  sombra();
}

function cxRenderFooter() {
  const mount = document.getElementById('cx-footer');
  if (!mount) return;
  const r = `${CX_ROOT}courier/`;
  mount.innerHTML = `
    <footer class="cx-footer">
      <div class="cx-container">
        <div class="cx-footer-grid">
          <div>
            <a class="cx-footer-logo" href="${r}"><img src="${CX_ROOT}assets/img/courier/logo-maizon-zadaca.webp" alt="Maizon Zadaca" width="408" height="96" loading="lazy" /></a>
            <p>Traemos tus compras de USA a Perú con tarifa plana de ${cxUsd(CX.tarifaUsd)} por envío. Entregamos tus sueños.</p>
            <a href="${cxWa('Hola Maizon Zadaca, tengo una consulta sobre el courier.')}" target="_blank" rel="noopener">WhatsApp ${cxTelefono()}</a>
          </div>
          <div>
            <h4>Servicio</h4>
            <a href="${r}como-funciona/">Cómo funciona</a>
            <a href="${r}casillero/">Crear casillero gratis</a>
            <a href="${r}compramos-por-ti/">Compramos por ti</a>
            <a href="${r}tiendas/">Tiendas recomendadas</a>
          </div>
          <div>
            <h4>Tarifas</h4>
            <a href="${r}tarifas/">Tarifa ${cxUsd(CX.tarifaUsd)} por envío</a>
            <a href="${r}tarifas/#calculadora">Calculadora</a>
            <a href="${r}ayuda/#aduana">Impuestos y aduana</a>
          </div>
          <div>
            <h4>Ayuda</h4>
            <a href="${r}ayuda/">Preguntas frecuentes</a>
            <a href="${r}ayuda/#contacto">Contacto por WhatsApp</a>
            <a href="${r}prohibidos/">Productos prohibidos</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="${r}prohibidos/#terminos">Condiciones del servicio</a>
            <a href="${CX_ROOT}libro-de-reclamaciones/">Libro de Reclamaciones</a>
            <a href="${CX_ROOT}politica-privacidad/">Privacidad</a>
          </div>
        </div>
        <div class="cx-footer-bottom">
          <span>&copy; ${new Date().getFullYear()} Maizon Zadaca · Envíos desde USA</span>
          <a href="${CX_ROOT}">Visita también Maison Zadaca Perfumería →</a>
        </div>
      </div>
    </footer>`;
}

function cxRenderWhatsappFlotante() {
  const a = document.createElement('a');
  a.className = 'cx-wa-float';
  a.href = cxWa('Hola Maizon Zadaca, tengo una consulta sobre el courier.');
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
  a.innerHTML = CX_ICONOS.whatsapp;
  document.body.appendChild(a);
}

// <a data-wa="texto">: abre WhatsApp con ese mensaje ya escrito.
function cxEnlacesWhatsapp() {
  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = cxWa(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  document.querySelectorAll('[data-cx="telefono"]').forEach((el) => { el.textContent = cxTelefono(); });
  document.querySelectorAll('[data-cx="tarifa"]').forEach((el) => { el.textContent = cxUsd(CX.tarifaUsd); });
  document.querySelectorAll('[data-cx="tarifa-num"]').forEach((el) => { el.textContent = CX.tarifaUsd; });
  document.querySelectorAll('[data-cx="limite"]').forEach((el) => { el.textContent = cxUsd(CX.limiteSinImpuestosUsd); });
}

function cxRevelar() {
  const elementos = document.querySelectorAll('.cx-revela');
  if (!('IntersectionObserver' in window)) { elementos.forEach((el) => el.classList.add('visible')); return; }
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  elementos.forEach((el) => obs.observe(el));
}

/* ================= Calculadora ================= */

function cxCalculadoras() {
  document.querySelectorAll('[data-calc]').forEach((form) => {
    const valor = form.elements.valor;
    const paquetes = form.elements.paquetes;
    const salida = (clave) => form.querySelector(`[data-res="${clave}"]`);
    const msg = form.querySelector('.cx-calc-msg');
    const botonWa = form.querySelector('[data-calc-wa]');
    const calcular = () => {
      const v = Math.max(0, Number(String(valor.value).replace(',', '.')) || 0);
      const n = Math.min(50, Math.max(1, Math.round(Number(paquetes.value) || 1)));
      const envio = n * CX.tarifaUsd;
      const conImpuestos = v > CX.limiteSinImpuestosUsd;
      salida('compra').textContent = v ? cxUsd(v) : '—';
      salida('envio-label').textContent = `Envío (${n} × ${cxUsd(CX.tarifaUsd)})`;
      salida('envio').textContent = cxUsd(envio);
      salida('impuestos').textContent = !v ? '—' : conImpuestos ? 'Por confirmar' : 'US$0';
      salida('total').textContent = v ? cxUsd(v + envio) : cxUsd(envio);
      salida('total-label').textContent = conImpuestos ? 'Total estimado (sin impuestos)' : 'Total estimado';
      if (!v) {
        msg.className = 'cx-calc-msg';
        msg.textContent = 'Escribe cuánto cuesta tu compra para ver si pagas impuestos.';
      } else if (conImpuestos) {
        msg.className = 'cx-calc-msg alerta';
        msg.textContent = `Pasa de ${cxUsd(CX.limiteSinImpuestosUsd)}: SUNAT cobra impuestos de importación. Te decimos el monto exacto antes de enviar tu paquete.`;
      } else {
        msg.className = 'cx-calc-msg ok';
        msg.textContent = `Hasta ${cxUsd(CX.limiteSinImpuestosUsd)} no pagas impuestos de aduana.${n > 1 ? ' Ojo: si tus paquetes llegan en el mismo vuelo, SUNAT suma sus valores.' : ''}`;
      }
      botonWa.href = cxWa(`Hola Maizon Zadaca, quiero cotizar un envío de USA a Perú.\n\n• Valor de mi compra: ${v ? cxUsd(v) : 'por definir'}\n• Paquetes: ${n}\n• Envío estimado: ${cxUsd(envio)}\n\n¿Me confirman el precio?`);
    };
    form.addEventListener('input', calcular);
    form.addEventListener('submit', (e) => { e.preventDefault(); calcular(); });
    botonWa.target = '_blank';
    botonWa.rel = 'noopener';
    calcular();
  });
}

/* ================= Formularios que se envían por WhatsApp ================= */

function cxMarcarError(campo, mensaje) {
  const caja = campo.closest('.cx-campo') || campo.closest('.cx-check');
  let error = caja?.querySelector('.error');
  if (mensaje) {
    campo.setAttribute('aria-invalid', 'true');
    if (caja && !error) {
      error = document.createElement('span');
      error.className = 'error';
      error.id = `${campo.id || campo.name}-error`;
      caja.appendChild(error);
      campo.setAttribute('aria-describedby', error.id);
    }
    if (error) error.textContent = mensaje;
  } else {
    campo.removeAttribute('aria-invalid');
    error?.remove();
  }
  return !mensaje;
}

// Reglas: data-valida="dni|celular|url|texto" + required. Devuelve true si todo está bien.
function cxValidar(form) {
  let primero = null;
  form.querySelectorAll('input, select, textarea').forEach((campo) => {
    if (campo.type === 'hidden' || campo.disabled) return;
    const v = campo.type === 'checkbox' ? campo.checked : campo.value.trim();
    let error = '';
    if (campo.required && !v) {
      error = campo.type === 'checkbox' ? 'Necesitamos que aceptes para continuar.' : 'Completa este dato.';
    } else if (v && campo.dataset.valida === 'documento') {
      const tipo = form.elements.tipo_documento?.value || 'DNI';
      if (tipo === 'DNI' && !/^\d{8}$/.test(v)) error = 'El DNI tiene 8 números.';
      if (tipo !== 'DNI' && !/^[A-Za-z0-9]{8,12}$/.test(v)) error = 'Revisa el número de tu documento.';
    } else if (v && campo.dataset.valida === 'celular') {
      const d = v.replace(/[\s()+-]/g, '').replace(/^51(?=9\d{8}$)/, '');
      if (!/^9\d{8}$/.test(d)) error = 'Escribe tu celular de 9 números (empieza con 9).';
    } else if (v && campo.dataset.valida === 'url') {
      try {
        const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
        if (!u.hostname.includes('.')) throw new Error();
      } catch { error = 'Pega el link completo del producto (ej. https://www.amazon.com/...).'; }
    } else if (campo.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      error = 'Revisa tu correo.';
    }
    if (!cxMarcarError(campo, error) && !primero) primero = campo;
  });
  if (primero) primero.focus();
  return !primero;
}

function cxLimpiarErrorAlEscribir(form) {
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) cxMarcarError(e.target, ''); });
  form.addEventListener('change', (e) => { if (e.target.getAttribute('aria-invalid')) cxMarcarError(e.target, ''); });
}

const CX_DEPARTAMENTOS = ['Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'];

function cxFormCasillero() {
  const form = document.getElementById('form-casillero');
  if (!form) return;
  const depto = form.elements.departamento;
  depto.insertAdjacentHTML('beforeend', CX_DEPARTAMENTOS.map((d) => `<option>${d}</option>`).join(''));
  const tipo = form.elements.tipo_documento;
  const doc = form.elements.documento;
  const ajustarDoc = () => {
    const esDni = tipo.value === 'DNI';
    doc.inputMode = esDni ? 'numeric' : 'text';
    doc.maxLength = esDni ? 8 : 12;
    doc.placeholder = esDni ? '8 números' : 'Número de documento';
  };
  tipo.addEventListener('change', () => { ajustarDoc(); cxMarcarError(doc, ''); });
  ajustarDoc();
  cxLimpiarErrorAlEscribir(form);

  let ultimoMensaje = '';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!cxValidar(form)) return;
    const f = form.elements;
    const lineas = [
      'Hola Maizon Zadaca, quiero crear mi casillero gratis en Miami.',
      '',
      `Nombre: ${f.nombre.value.trim()}`,
      `${f.tipo_documento.value}: ${f.documento.value.trim()}`,
      `Celular: ${f.celular.value.trim()}`,
      f.email.value.trim() ? `Correo: ${f.email.value.trim()}` : null,
      `Departamento: ${f.departamento.value}`,
      `Distrito / ciudad: ${f.distrito.value.trim()}`,
      `Dirección de entrega: ${f.direccion.value.trim()}`,
      '',
      'Acepto las condiciones del servicio y la lista de productos prohibidos.',
    ].filter((l) => l !== null);
    ultimoMensaje = lineas.join('\n');
    cxAbrirWhatsapp(ultimoMensaje);
    const nombre = f.nombre.value.trim();
    document.getElementById('casillero-form-caja').hidden = true;
    const exito = document.getElementById('casillero-exito');
    exito.hidden = false;
    exito.querySelector('[data-nombre]').textContent = `${nombre} MZ-····`;
    exito.querySelector('[data-codigo]').textContent = 'MZ-···· (te lo enviamos)';
    exito.scrollIntoView({ behavior: 'smooth', block: 'start' });
    exito.querySelector('h2').focus();
  });
  document.getElementById('casillero-reabrir')?.addEventListener('click', () => cxAbrirWhatsapp(ultimoMensaje));
  document.getElementById('casillero-editar')?.addEventListener('click', () => {
    document.getElementById('casillero-exito').hidden = true;
    document.getElementById('casillero-form-caja').hidden = false;
    form.elements.nombre.focus();
  });
}

function cxFormCompra() {
  const form = document.getElementById('form-compra');
  if (!form) return;
  const lista = document.getElementById('compra-productos');
  const plantilla = document.getElementById('compra-producto-plantilla');
  const botonAgregar = document.getElementById('compra-agregar');
  const MAX = 10;
  let contador = 0;
  const renumerar = () => {
    const filas = [...lista.querySelectorAll('.compra-producto')];
    filas.forEach((fila, i) => {
      fila.querySelector('[data-titulo]').textContent = `Producto ${i + 1}`;
      fila.querySelector('[data-quitar]').hidden = filas.length === 1;
    });
    botonAgregar.hidden = filas.length >= MAX;
  };
  const agregar = (enfocar) => {
    contador += 1;
    const nodo = plantilla.content.firstElementChild.cloneNode(true);
    nodo.querySelectorAll('[data-id]').forEach((el) => {
      const id = `${el.dataset.id}-${contador}`;
      if (el.tagName === 'LABEL') el.htmlFor = id; else el.id = id;
    });
    nodo.querySelector('[data-quitar]').addEventListener('click', () => { nodo.remove(); renumerar(); lista.querySelector('input')?.focus(); });
    lista.appendChild(nodo);
    renumerar();
    if (enfocar) nodo.querySelector('input').focus();
  };
  botonAgregar.addEventListener('click', () => agregar(true));
  agregar(false);
  cxLimpiarErrorAlEscribir(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!cxValidar(form)) return;
    const productos = [...lista.querySelectorAll('.compra-producto')].map((fila, i) => {
      const link = fila.querySelector('[name="link"]').value.trim();
      const detalle = fila.querySelector('[name="detalle"]').value.trim();
      const cantidad = fila.querySelector('[name="cantidad"]').value || '1';
      return [`${i + 1}) ${/^https?:\/\//i.test(link) ? link : `https://${link}`}`, detalle ? `   Talla / color: ${detalle}` : '', `   Cantidad: ${cantidad}`].filter(Boolean).join('\n');
    });
    const f = form.elements;
    const texto = [
      'Hola Maizon Zadaca, quiero que compren por mí en USA:',
      '',
      productos.join('\n\n'),
      '',
      `Mi nombre: ${f.nombre_compra.value.trim()}`,
      f.comentarios.value.trim() ? `Comentarios: ${f.comentarios.value.trim()}` : null,
      '',
      `¿Me pasan la cotización? (producto + envío ${cxUsd(CX.tarifaUsd)} + comisión de compra)`,
    ].filter((l) => l !== null).join('\n');
    cxAbrirWhatsapp(texto);
    const aviso = document.getElementById('compra-enviado');
    aviso.hidden = false;
    aviso.focus();
  });
}

/* ================= Tiendas recomendadas ================= */

const CX_TIENDAS = [
  { n: 'Amazon', url: 'https://www.amazon.com/', cat: ['todo'], d: 'De todo: tecnología, hogar, perfumes y ropa' },
  { n: 'eBay', url: 'https://www.ebay.com/', cat: ['todo'], d: 'De todo, nuevo y de segunda' },
  { n: 'Walmart', url: 'https://www.walmart.com/', cat: ['todo'], d: 'De todo a buen precio' },
  { n: 'Sephora', url: 'https://www.sephora.com/', cat: ['perfumes'], d: 'Perfumes y maquillaje' },
  { n: 'Ulta Beauty', url: 'https://www.ulta.com/', cat: ['perfumes'], d: 'Perfumes, maquillaje y cuidado personal' },
  { n: 'FragranceNet', url: 'https://www.fragrancenet.com/', cat: ['perfumes'], d: 'Perfumes de marca con descuento' },
  { n: 'Jomashop', url: 'https://www.jomashop.com/', cat: ['relojes', 'perfumes'], d: 'Relojes y perfumes de marca' },
  { n: 'Nike', url: 'https://www.nike.com/', cat: ['zapatillas', 'ropa'], d: 'Zapatillas y ropa deportiva' },
  { n: 'Adidas', url: 'https://www.adidas.com/us', cat: ['zapatillas', 'ropa'], d: 'Zapatillas y ropa deportiva' },
  { n: 'Foot Locker', url: 'https://www.footlocker.com/', cat: ['zapatillas'], d: 'Zapatillas de todas las marcas' },
  { n: 'Best Buy', url: 'https://www.bestbuy.com/', cat: ['tecnologia'], d: 'Celulares, laptops y gadgets' },
  { n: 'B&H Photo', url: 'https://www.bhphotovideo.com/', cat: ['tecnologia'], d: 'Cámaras, audio y computación' },
  { n: "Macy's", url: 'https://www.macys.com/', cat: ['ropa', 'carteras', 'perfumes'], d: 'Ropa, carteras y perfumes' },
  { n: 'Old Navy', url: 'https://oldnavy.gap.com/', cat: ['ropa'], d: 'Ropa para toda la familia' },
  { n: "Carter's", url: 'https://www.carters.com/', cat: ['ropa'], d: 'Ropa de bebé y niños' },
  { n: 'Michael Kors', url: 'https://www.michaelkors.com/', cat: ['carteras', 'relojes'], d: 'Carteras y relojes' },
  { n: 'Coach Outlet', url: 'https://www.coachoutlet.com/', cat: ['carteras'], d: 'Carteras y billeteras' },
  { n: 'Fossil', url: 'https://www.fossil.com/en-us/', cat: ['relojes'], d: 'Relojes y accesorios' },
];
const CX_CATEGORIAS = [
  { id: 'todas', label: 'Todas' },
  { id: 'perfumes', label: 'Perfumes' },
  { id: 'tecnologia', label: 'Tecnología y celulares' },
  { id: 'zapatillas', label: 'Zapatillas' },
  { id: 'ropa', label: 'Ropa' },
  { id: 'carteras', label: 'Carteras' },
  { id: 'relojes', label: 'Relojes' },
];
const CX_COLORES_TIENDA = [['#0b3a7a', '#fff'], ['#1f4fd1', '#fff'], ['#f47b20', '#071d42']];

function cxHtmlTienda(t, i) {
  const [fondo, letra] = CX_COLORES_TIENDA[i % CX_COLORES_TIENDA.length];
  const sigla = t.n.replace(/[^A-Za-z& ]/g, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return `<a class="cx-tienda" href="${cxEscape(t.url)}" target="_blank" rel="noopener">
      <span class="cx-tienda-marca" style="--color-tienda:${fondo};color:${letra}" aria-hidden="true">${cxEscape(sigla)}</span>
      <span class="cx-tienda-texto"><b>${cxEscape(t.n)}</b><span>${cxEscape(t.d)}</span></span>
      <span class="ir">${CX_ICONOS.externo}<span class="cx-sr"> (abre en otra pestaña)</span></span>
    </a>`;
}

function cxTiendas() {
  const mount = document.getElementById('cx-tiendas');
  if (!mount) return;
  const limite = Number(mount.dataset.limite) || 0;
  const chips = document.getElementById('cx-tiendas-chips');
  const alias = { celulares: 'tecnologia', accesorios: 'todas' };
  let actual = new URLSearchParams(window.location.search).get('cat') || 'todas';
  actual = alias[actual] || actual;
  if (!CX_CATEGORIAS.some((c) => c.id === actual)) actual = 'todas';
  const render = () => {
    let lista = CX_TIENDAS.filter((t) => actual === 'todas' || t.cat.includes(actual) || t.cat.includes('todo'));
    if (limite) lista = lista.slice(0, limite);
    mount.innerHTML = lista.map(cxHtmlTienda).join('');
    chips?.querySelectorAll('.cx-chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === actual)));
  };
  if (chips) {
    chips.innerHTML = CX_CATEGORIAS.map((c) => `<button type="button" class="cx-chip" data-cat="${c.id}" aria-pressed="false">${c.label}</button>`).join('');
    chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.cx-chip');
      if (!chip) return;
      actual = chip.dataset.cat;
      const url = new URL(window.location.href);
      if (actual === 'todas') url.searchParams.delete('cat'); else url.searchParams.set('cat', actual);
      history.replaceState(null, '', url);
      render();
    });
  }
  render();
}

/* ================= Preguntas frecuentes (filtro + buscador) ================= */

function cxFaq() {
  const lista = document.getElementById('cx-faq');
  if (!lista) return;
  const items = [...lista.querySelectorAll('details')];
  const chips = document.querySelectorAll('#cx-faq-chips .cx-chip');
  const buscador = document.getElementById('cx-faq-buscar');
  const vacio = document.getElementById('cx-faq-vacio');
  let cat = 'todas';
  const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtrar = () => {
    const q = normalizar(buscador?.value.trim() || '');
    let visibles = 0;
    items.forEach((d) => {
      const ok = (cat === 'todas' || d.dataset.cat === cat) && (!q || normalizar(d.textContent).includes(q));
      d.hidden = !ok;
      if (ok) visibles += 1;
    });
    if (vacio) vacio.hidden = visibles > 0;
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    cat = c.dataset.cat;
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    filtrar();
  }));
  buscador?.addEventListener('input', filtrar);
  // #aduana, #pagos...: abre esa categoría y su primera pregunta
  const hash = window.location.hash.slice(1);
  const chipHash = [...chips].find((c) => c.dataset.cat === hash);
  if (chipHash) {
    chipHash.click();
    const primera = items.find((d) => d.dataset.cat === hash);
    if (primera) primera.open = true;
  }
}

/* ================= Pestañas ================= */

function cxPestanas() {
  document.querySelectorAll('[data-tabs]').forEach((grupo) => {
    const tabs = [...grupo.querySelectorAll('[role="tab"]')];
    const activar = (tab, enfocar) => {
      tabs.forEach((t) => {
        const activo = t === tab;
        t.setAttribute('aria-selected', String(activo));
        t.tabIndex = activo ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !activo;
      });
      if (enfocar) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activar(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') activar(tabs[(i + 1) % tabs.length], true);
        if (e.key === 'ArrowLeft') activar(tabs[(i - 1 + tabs.length) % tabs.length], true);
      });
    });
    const hash = window.location.hash.slice(1);
    const desdeHash = tabs.find((t) => t.dataset.hash === hash);
    activar(desdeHash || tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);
    if (desdeHash) grupo.scrollIntoView({ block: 'start' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cxRenderHeader();
  cxRenderFooter();
  cxRenderWhatsappFlotante();
  cxEnlacesWhatsapp();
  cxCalculadoras();
  cxFormCasillero();
  cxFormCompra();
  cxTiendas();
  cxFaq();
  cxPestanas();
  cxRevelar();
});
