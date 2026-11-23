/* ==========================================================
   OPINIONES DE CLIENTES (migración 0024)
   - Estrellas (1 a 5) + comentario sobre un perfume (tienda, decant o Catálogo Consolidado) o
     sobre el servicio de consolidado. Solo clientes con cuenta; una opinión por perfume y una
     sobre el consolidado, que cada quien puede editar o borrar.
   - Se publican al instante (salvo que el admin active "aprobar antes de publicar") y el admin
     las supervisa en Panel → Reseñas. El nombre que se muestra ("Juan P.") y la marca "Compra
     verificada" los pone la base, no el navegador.
   Usa supabaseClient, obtenerSesion, escapeHtml, ICONS y SITE_ROOT de api.js / main.js.
   ========================================================== */

const RESENA_ETIQUETAS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
const RESENA_MAX_COMENTARIO = 1000;
const RESENAS_POR_TANDA = 6;
const CAMPOS_RESENA_PUBLICA = 'id, tipo, id_producto, calificacion, comentario, nombre_publico, compra_verificada, fecha_creacion, fecha_actualizacion';
const ESTRELLA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.83 6.07 6.67.73-4.97 4.5 1.38 6.56L12 17.13 6.09 20.46l1.38-6.56L2.5 9.4l6.67-.73L12 2.6z"/></svg>';

/* ---------------- Datos ---------------- */

// Opiniones visibles de uno o varios perfumes (el frasco y su decant comparten opiniones) o del
// consolidado. Solo columnas públicas: nunca el id del cliente.
async function obtenerResenasPublicas({ tipo = 'Producto', idsProducto = [] } = {}) {
  let q = supabaseClient.from('resenas').select(CAMPOS_RESENA_PUBLICA).eq('aprobado', true).eq('tipo', tipo)
    .order('fecha_creacion', { ascending: false }).limit(500);
  if (tipo === 'Producto') q = q.in('id_producto', idsProducto);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function obtenerMiResena({ tipo = 'Producto', idProducto = null } = {}) {
  const session = await obtenerSesion();
  if (!session) return null;
  let q = supabaseClient.from('resenas').select(`${CAMPOS_RESENA_PUBLICA}, aprobado, revisada`)
    .eq('id_cliente', session.user.id).eq('tipo', tipo);
  q = tipo === 'Producto' ? q.eq('id_producto', idProducto) : q.is('id_producto', null);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Crea o edita la opinión propia. La base completa nombre, fecha y "compra verificada".
async function guardarResena({ id, tipo = 'Producto', idProducto = null, calificacion, comentario }) {
  const session = await obtenerSesion();
  if (!session) throw new Error('Inicia sesión para opinar');
  const cal = Math.round(Number(calificacion));
  if (!(cal >= 1 && cal <= 5)) throw new Error('Elige de 1 a 5 estrellas');
  const texto = String(comentario || '').trim().slice(0, RESENA_MAX_COMENTARIO) || null;
  const consulta = id
    ? supabaseClient.from('resenas').update({ calificacion: cal, comentario: texto }).eq('id', id)
    : supabaseClient.from('resenas').insert({ id_cliente: session.user.id, tipo, id_producto: tipo === 'Producto' ? idProducto : null, calificacion: cal, comentario: texto });
  const { data, error } = await consulta.select(`${CAMPOS_RESENA_PUBLICA}, aprobado, revisada`).single();
  if (error) throw new Error(traducirErrorResena(error));
  return data;
}

async function borrarResena(id) {
  const { error } = await supabaseClient.from('resenas').delete().eq('id', id);
  if (error) throw new Error(traducirErrorResena(error));
}

function traducirErrorResena(error) {
  const msg = error?.message || '';
  if (/uq_resena|duplicate/.test(msg)) return 'Ya dejaste tu opinión aquí: puedes editarla.';
  if (/row-level security|permission/.test(msg)) return 'Inicia sesión con tu cuenta para opinar.';
  if (/chk_resena_comentario/.test(msg)) return `El comentario puede tener hasta ${RESENA_MAX_COMENTARIO} caracteres.`;
  if (/does not exist|schema cache/.test(msg)) return 'Las opiniones todavía no están activas. Intenta más tarde.';
  if (/muchas opiniones|no está disponible|propia cuenta/.test(msg)) return msg;
  return msg || 'No se pudo guardar tu opinión';
}

// { idProducto: { total, promedio } } de varios perfumes a la vez (estrellas en las tarjetas).
async function obtenerResumenCalificaciones(ids) {
  const unicos = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (!unicos.length) return {};
  const { data, error } = await supabaseClient.from('resenas').select('id_producto, calificacion')
    .eq('aprobado', true).eq('tipo', 'Producto').in('id_producto', unicos).limit(5000);
  if (error) return {};
  const res = {};
  (data || []).forEach((r) => {
    const k = r.id_producto;
    res[k] = res[k] || { total: 0, suma: 0 };
    res[k].total += 1;
    res[k].suma += Number(r.calificacion);
  });
  Object.values(res).forEach((v) => { v.promedio = v.suma / v.total; });
  return res;
}

// Últimas opiniones con comentario (para el inicio) + el promedio general de todo el sitio.
async function obtenerOpinionesDestacadas(limite = 6) {
  const [ultimas, todas] = await Promise.all([
    supabaseClient.from('resenas').select(`${CAMPOS_RESENA_PUBLICA}, perfumes(slug, nombre, marca, imagen_url)`)
      .eq('aprobado', true).not('comentario', 'is', null).order('fecha_creacion', { ascending: false }).limit(limite),
    supabaseClient.from('resenas').select('calificacion').eq('aprobado', true).limit(5000),
  ]);
  if (ultimas.error) throw new Error(ultimas.error.message);
  const califs = (todas.data || []).map((r) => Number(r.calificacion));
  return {
    resenas: ultimas.data || [],
    total: califs.length,
    promedio: califs.length ? califs.reduce((a, b) => a + b, 0) / califs.length : 0,
  };
}

// Mis opiniones (Mi cuenta), con el perfume para poder ir a editarla.
async function obtenerMisResenas() {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient.from('resenas')
    .select(`${CAMPOS_RESENA_PUBLICA}, aprobado, revisada, perfumes(id, slug, nombre, marca, imagen_url, es_decant)`)
    .eq('id_cliente', session.user.id).order('fecha_creacion', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// Perfumes que el cliente compró (pedidos no anulados) o reservó por consolidado, para invitarlo
// a opinar. Devuelve también si trajo algo por consolidado (para la opinión del servicio).
async function obtenerComprasParaOpinar() {
  const session = await obtenerSesion();
  if (!session) return { productos: [], usoConsolidado: false };
  const camposPerfume = 'id, slug, nombre, marca, imagen_url, es_decant, activo';
  const [pedidos, reservas] = await Promise.all([
    supabaseClient.from('pedidos').select(`id, tipo_pedido, fecha_creacion, detalle_pedido(id_producto, perfumes(${camposPerfume}))`)
      .eq('id_cliente', session.user.id).eq('cancelado', false).order('fecha_creacion', { ascending: false }).limit(100),
    CONSOLIDADOS_ACTIVOS
      ? supabaseClient.from('detalle_consolidado').select(`id_producto, estado_item, perfumes(${camposPerfume})`)
        .eq('id_cliente', session.user.id).neq('estado_item', 'Cancelado').limit(200)
      : Promise.resolve({ data: [] }),
  ]);
  const vistos = new Map();
  (pedidos.data || []).forEach((p) => (p.detalle_pedido || []).forEach((d) => {
    if (d.perfumes?.activo && !vistos.has(d.perfumes.id)) vistos.set(d.perfumes.id, d.perfumes);
  }));
  (reservas.data || []).forEach((r) => {
    if (r.perfumes?.activo && !vistos.has(r.perfumes.id)) vistos.set(r.perfumes.id, r.perfumes);
  });
  const usoConsolidado = (pedidos.data || []).some((p) => p.tipo_pedido === 'Consolidado') || (reservas.data || []).length > 0;
  return { productos: [...vistos.values()], usoConsolidado };
}

/* ---------------- Utilidades de presentación ---------------- */

function fechaResena(valor) {
  if (!valor) return null;
  const s = String(valor);
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s}Z`);
}

function haceCuanto(valor) {
  const fecha = fechaResena(valor);
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  const seg = Math.round((Date.now() - fecha.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (seg < 60) return 'hace un momento';
  if (seg < 3600) return rtf.format(-Math.floor(seg / 60), 'minute');
  if (seg < 86400) return rtf.format(-Math.floor(seg / 3600), 'hour');
  if (seg < 86400 * 30) return rtf.format(-Math.floor(seg / 86400), 'day');
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatoPromedio(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// 5 estrellas con relleno parcial (para promedios como 4,3).
function estrellasHtml(valor, { clase = '' } = {}) {
  const pct = Math.max(0, Math.min(100, (Number(valor) / 5) * 100));
  const fila = ESTRELLA_SVG.repeat(5);
  return `<span class="estrellas ${clase}" role="img" aria-label="${formatoPromedio(valor)} de 5 estrellas"><span class="estrellas-base">${fila}</span><span class="estrellas-relleno" style="width:${pct}%">${fila}</span></span>`;
}

function textoOpiniones(n) {
  return `${n} ${n === 1 ? 'opinión' : 'opiniones'}`;
}

function inicialNombre(nombre) {
  return (String(nombre || 'C').trim()[0] || 'C').toUpperCase();
}

function tarjetaResenaHtml(r, { etiquetaVariante = '', mia = false } = {}) {
  const editada = r.fecha_actualizacion ? ' · editada' : '';
  return `
    <article class="resena-card${mia ? ' resena-card-mia' : ''}">
      <header class="resena-card-head">
        <span class="resena-avatar" aria-hidden="true">${escapeHtml(inicialNombre(r.nombre_publico))}</span>
        <div class="resena-autor">
          <strong>${escapeHtml(r.nombre_publico || 'Cliente')}</strong>
          ${r.compra_verificada ? `<span class="resena-verificada" title="Compró este producto en Maison Zadaca">${ICONS.check} Compra verificada</span>` : ''}
          <span class="resena-fecha">${escapeHtml(haceCuanto(r.fecha_creacion))}${editada}</span>
        </div>
        ${estrellasHtml(r.calificacion, { clase: 'estrellas-sm' })}
      </header>
      ${etiquetaVariante ? `<span class="resena-variante">${escapeHtml(etiquetaVariante)}</span>` : ''}
      ${r.comentario ? `<p class="resena-texto">${escapeHtml(r.comentario)}</p>` : `<p class="resena-texto resena-sin-texto">Calificó con ${r.calificacion} ${r.calificacion === 1 ? 'estrella' : 'estrellas'} — ${RESENA_ETIQUETAS[r.calificacion].toLowerCase()}.</p>`}
    </article>`;
}

function urlParaOpinar(base) {
  const url = new URL(base || window.location.href);
  url.hash = 'opinar';
  return url.href;
}

/* ---------------- Componente: opiniones de un perfume o del consolidado ---------------- */

// opciones: { tipo, idProducto, idsRelacionados, variantes: { id: 'Sobre el decant' }, nombre,
//             titulo, placeholder, alResumen(resumen) }
async function montarOpiniones(mount, opciones) {
  if (!mount || !SUPABASE_CONFIGURADO) return;
  const o = { tipo: 'Producto', idsRelacionados: [], variantes: {}, ...opciones };
  const ids = o.tipo === 'Producto' ? [...new Set([o.idProducto, ...o.idsRelacionados].filter(Boolean))] : [];
  const estado = { resenas: [], mia: null, session: null, filtro: 0, orden: 'recientes', mostradas: RESENAS_POR_TANDA, editando: false, cfg: null };

  mount.innerHTML = '<div class="loading-state">Cargando opiniones…</div>';

  async function cargar() {
    const [resenas, session, cfg] = await Promise.all([
      obtenerResenasPublicas({ tipo: o.tipo, idsProducto: ids }),
      obtenerSesion(),
      obtenerConfiguracionSitio().catch(() => null),
    ]);
    estado.resenas = resenas;
    estado.session = session;
    estado.cfg = cfg;
    estado.mia = session ? await obtenerMiResena({ tipo: o.tipo, idProducto: o.idProducto }).catch(() => null) : null;
  }

  function resumen() {
    const total = estado.resenas.length;
    const conteo = [0, 0, 0, 0, 0, 0];
    estado.resenas.forEach((r) => { conteo[r.calificacion] += 1; });
    const promedio = total ? estado.resenas.reduce((a, r) => a + Number(r.calificacion), 0) / total : 0;
    return { total, promedio, conteo };
  }

  function listaVisible() {
    let lista = estado.resenas.filter((r) => !estado.mia || r.id !== estado.mia.id);
    if (estado.filtro) lista = lista.filter((r) => r.calificacion === estado.filtro);
    if (estado.orden === 'mejores') lista = [...lista].sort((a, b) => b.calificacion - a.calificacion);
    if (estado.orden === 'peores') lista = [...lista].sort((a, b) => a.calificacion - b.calificacion);
    return lista;
  }

  function htmlAccion() {
    if (!estado.session) {
      const retorno = encodeURIComponent(urlParaOpinar());
      return `
        <div class="resena-login">
          <span class="resena-login-icono">${ICONS.lock}</span>
          <p><strong>¿Ya lo probaste?</strong> Para opinar necesitas una cuenta: así todas las opiniones son de clientes reales.</p>
          <div class="resena-login-botones">
            <a class="btn btn-primary btn-sm" href="${SITE_ROOT}cuenta/?retorno=${retorno}">Iniciar sesión</a>
            <a class="btn btn-outline btn-sm" href="${SITE_ROOT}cuenta/?registro=1&amp;retorno=${retorno}">Crear cuenta</a>
          </div>
        </div>`;
    }
    if (estado.mia) return '';
    return `<button type="button" class="btn btn-primary btn-block" data-resena="escribir">${ICONS.plus} Escribir mi opinión</button>`;
  }

  function htmlFormulario() {
    const r = estado.mia || {};
    const cal = estado.editando && r.calificacion ? r.calificacion : 0;
    const requiere = !!estado.cfg?.resenas_requieren_aprobacion;
    return `
      <form class="resena-form" novalidate>
        <h3>${r.id ? 'Editar mi opinión' : `Tu opinión sobre ${escapeHtml(o.nombre || 'este perfume')}`}</h3>
        <fieldset class="estrellas-input">
          <legend>Tu calificación</legend>
          <div class="estrellas-input-fila">
            ${[5, 4, 3, 2, 1].map((n) => `
              <input type="radio" name="calificacion" id="${mount.id}-cal-${n}" value="${n}" ${cal === n ? 'checked' : ''} />
              <label for="${mount.id}-cal-${n}" title="${RESENA_ETIQUETAS[n]}" aria-label="${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${RESENA_ETIQUETAS[n]}">${ESTRELLA_SVG}</label>`).join('')}
          </div>
          <span class="estrellas-input-texto" aria-live="polite">${cal ? RESENA_ETIQUETAS[cal] : 'Toca las estrellas'}</span>
        </fieldset>
        <div class="form-group">
          <label for="${mount.id}-comentario">Comentario <span class="opcional">(opcional)</span></label>
          <textarea id="${mount.id}-comentario" name="comentario" rows="4" maxlength="${RESENA_MAX_COMENTARIO}" placeholder="${escapeHtml(o.placeholder || '¿Qué te pareció el aroma, la duración y la proyección?')}">${escapeHtml(estado.editando ? (r.comentario || '') : '')}</textarea>
          <div class="resena-contador"><span>0</span>/${RESENA_MAX_COMENTARIO}</div>
        </div>
        <p class="form-hint resena-aviso">Se publica con tu nombre corto (por ejemplo "Juan P."), nunca con tu correo ni tu teléfono.${requiere ? ' La revisamos antes de publicarla.' : ''} Opiniones ofensivas o con datos personales se eliminan.</p>
        <div class="resena-form-botones">
          <button type="button" class="btn btn-ghost btn-sm" data-resena="cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primary btn-sm">${r.id ? 'Guardar cambios' : 'Publicar opinión'}</button>
        </div>
      </form>`;
  }

  function htmlMia() {
    const r = estado.mia;
    if (!r) return '';
    let aviso = '';
    if (!r.aprobado) {
      aviso = r.revisada
        ? '<p class="resena-mia-aviso">Esta opinión no está visible para otros clientes. Si la editas, la volvemos a revisar.</p>'
        : '<p class="resena-mia-aviso">En revisión: se publicará cuando la aprobemos.</p>';
    }
    return `
      <div class="resena-mia">
        <div class="resena-mia-head">
          <span class="eyebrow">Tu opinión</span>
          <div class="resena-mia-acciones">
            <button type="button" class="link-arrow" data-resena="editar">Editar</button>
            <button type="button" class="link-arrow resena-borrar" data-resena="borrar">Eliminar</button>
          </div>
        </div>
        ${aviso}
        ${tarjetaResenaHtml(r, { mia: true, etiquetaVariante: o.variantes[r.id_producto] || '' })}
      </div>`;
  }

  function render() {
    const { total, promedio, conteo } = resumen();
    if (typeof o.alResumen === 'function') o.alResumen({ total, promedio, resenas: estado.resenas });
    const lista = listaVisible();
    const visibles = lista.slice(0, estado.mostradas);
    const formAbierto = estado.editando || estado.escribiendo;

    mount.innerHTML = `
      <div class="resenas-layout">
        <aside class="resenas-resumen">
          ${total ? `
            <div class="resenas-promedio">
              <span class="resenas-promedio-num">${formatoPromedio(promedio)}</span>
              <div>
                ${estrellasHtml(promedio, { clase: 'estrellas-lg' })}
                <span class="resenas-total">${textoOpiniones(total)}</span>
              </div>
            </div>
            <div class="resenas-barras" role="group" aria-label="Filtrar por estrellas">
              ${[5, 4, 3, 2, 1].map((n) => {
                const pct = total ? Math.round((conteo[n] / total) * 100) : 0;
                return `<button type="button" class="resenas-barra${estado.filtro === n ? ' activa' : ''}" data-filtro="${n}" ${conteo[n] ? '' : 'disabled'} aria-pressed="${estado.filtro === n}" aria-label="${n} estrellas: ${conteo[n]} ${conteo[n] === 1 ? 'opinión' : 'opiniones'}">
                  <span>${n} ${ESTRELLA_SVG}</span><span class="resenas-barra-pista"><span style="width:${pct}%"></span></span><span class="resenas-barra-num">${conteo[n]}</span>
                </button>`;
              }).join('')}
            </div>` : `
            <div class="resenas-vacio">
              ${estrellasHtml(0, { clase: 'estrellas-lg' })}
              <p>${o.tipo === 'Consolidado' ? 'Todavía no hay opiniones sobre el consolidado.' : 'Todavía no hay opiniones de este perfume.'}<br><strong>¡Sé el primero en opinar!</strong></p>
            </div>`}
          ${formAbierto ? '' : htmlAccion()}
        </aside>
        <div class="resenas-cuerpo">
          ${formAbierto ? htmlFormulario() : htmlMia()}
          ${lista.length || estado.filtro ? `
            <div class="resenas-toolbar">
              <span>${estado.filtro ? `${lista.length} con ${estado.filtro} ${estado.filtro === 1 ? 'estrella' : 'estrellas'} <button type="button" class="resenas-quitar-filtro" data-resena="quitar-filtro">Ver todas</button>` : textoOpiniones(lista.length + (estado.mia && estado.mia.aprobado ? 1 : 0))}</span>
              <label class="resenas-orden">Ordenar
                <select data-resena="orden">
                  <option value="recientes" ${estado.orden === 'recientes' ? 'selected' : ''}>Más recientes</option>
                  <option value="mejores" ${estado.orden === 'mejores' ? 'selected' : ''}>Mejor calificadas</option>
                  <option value="peores" ${estado.orden === 'peores' ? 'selected' : ''}>Menor calificación</option>
                </select>
              </label>
            </div>` : ''}
          <div class="resenas-lista">
            ${visibles.map((r) => tarjetaResenaHtml(r, { etiquetaVariante: o.variantes[r.id_producto] || '' })).join('')}
          </div>
          ${lista.length > estado.mostradas ? `<button type="button" class="btn btn-outline btn-sm resenas-mas" data-resena="mas">Ver más opiniones (${lista.length - estado.mostradas})</button>` : ''}
          ${!total && !formAbierto && !estado.mia ? `<p class="resenas-invita">${o.tipo === 'Consolidado' ? '¿Ya trajiste tus perfumes por consolidado? Cuéntale a otros clientes cómo te fue: tiempos, atención y cómo llegó tu pedido.' : 'Ayuda a otros clientes: cuéntales qué te pareció el aroma, cuánto dura y en qué ocasiones lo usas.'}</p>` : ''}
        </div>
      </div>`;

    conectar();
  }

  function conectar() {
    mount.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.filtro);
      estado.filtro = estado.filtro === n ? 0 : n;
      estado.mostradas = RESENAS_POR_TANDA;
      render();
    }));
    mount.querySelector('[data-resena="quitar-filtro"]')?.addEventListener('click', () => { estado.filtro = 0; render(); });
    mount.querySelector('[data-resena="orden"]')?.addEventListener('change', (e) => { estado.orden = e.target.value; render(); });
    mount.querySelector('[data-resena="mas"]')?.addEventListener('click', () => { estado.mostradas += RESENAS_POR_TANDA; render(); });
    mount.querySelector('[data-resena="escribir"]')?.addEventListener('click', () => abrirFormulario(false));
    mount.querySelector('[data-resena="editar"]')?.addEventListener('click', () => abrirFormulario(true));
    mount.querySelector('[data-resena="borrar"]')?.addEventListener('click', borrarMia);

    const form = mount.querySelector('.resena-form');
    if (!form) return;
    const texto = form.querySelector('.estrellas-input-texto');
    const area = form.querySelector('textarea');
    const contador = form.querySelector('.resena-contador span');
    const actualizarContador = () => { contador.textContent = area.value.length; };
    actualizarContador();
    area.addEventListener('input', actualizarContador);
    form.querySelectorAll('input[name="calificacion"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        texto.textContent = RESENA_ETIQUETAS[Number(radio.value)];
        form.querySelector('.estrellas-input').classList.remove('falta');
      });
    });
    form.querySelectorAll('.estrellas-input-fila label').forEach((label) => {
      const n = Number(document.getElementById(label.htmlFor)?.value);
      label.addEventListener('mouseenter', () => { texto.textContent = RESENA_ETIQUETAS[n]; });
      label.addEventListener('mouseleave', () => {
        const elegido = form.querySelector('input[name="calificacion"]:checked');
        texto.textContent = elegido ? RESENA_ETIQUETAS[Number(elegido.value)] : 'Toca las estrellas';
      });
    });
    form.querySelector('[data-resena="cancelar"]').addEventListener('click', () => {
      estado.editando = false;
      estado.escribiendo = false;
      render();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const elegido = form.querySelector('input[name="calificacion"]:checked');
      if (!elegido) {
        mostrarToast('Elige de 1 a 5 estrellas', 'error');
        form.querySelector('.estrellas-input').classList.add('falta');
        return;
      }
      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;
      try {
        const guardada = await guardarResena({
          id: estado.editando ? estado.mia?.id : null,
          tipo: o.tipo,
          idProducto: o.idProducto,
          calificacion: Number(elegido.value),
          comentario: area.value,
        });
        const eraEdicion = estado.editando;
        estado.editando = false;
        estado.escribiendo = false;
        await cargar();
        estado.mia = estado.mia || guardada;
        render();
        mostrarToast(!guardada.aprobado ? '¡Gracias! Publicaremos tu opinión cuando la revisemos.' : (eraEdicion ? 'Opinión actualizada' : '¡Gracias por tu opinión!'));
        mount.querySelector('.resena-mia')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        boton.disabled = false;
        mostrarToast(err.message, 'error');
      }
    });
  }

  function abrirFormulario(editar) {
    if (!estado.session) return;
    estado.editando = !!editar && !!estado.mia;
    estado.escribiendo = !editar;
    render();
    const form = mount.querySelector('.resena-form');
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (form?.querySelector('input[name="calificacion"]:checked') || form?.querySelector('input[name="calificacion"]'))?.focus({ preventScroll: true });
  }

  async function borrarMia() {
    if (!estado.mia || !confirm('¿Eliminar tu opinión? No se puede deshacer.')) return;
    try {
      await borrarResena(estado.mia.id);
      await cargar();
      estado.mia = null;
      render();
      mostrarToast('Tu opinión se eliminó');
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  }

  try {
    await cargar();
    render();
    // Viene de "Opinar" (Mi cuenta) o de iniciar sesión desde aquí: abre el formulario solo.
    if (window.location.hash === '#opinar') {
      if (estado.session) abrirFormulario(!!estado.mia);
      else mount.scrollIntoView({ block: 'start' });
      history.replaceState(null, '', window.location.pathname + window.location.search + '#opiniones');
    } else if (window.location.hash === '#opiniones') {
      mount.closest('section')?.scrollIntoView({ block: 'start' });
    }
  } catch (err) {
    // Sin opiniones disponibles (falla de red o la migración 0024 aún no se corrió): la sección
    // no se muestra en vez de dejar un error a la vista del cliente.
    console.error(err);
    mount.innerHTML = '';
    const seccion = mount.closest('section');
    if (seccion) seccion.hidden = true;
    if (typeof o.alResumen === 'function') o.alResumen(null);
  }
}

/* ---------------- Estrellas en las tarjetas de producto ---------------- */

// Cualquier tarjeta con data-id-producto que aparezca en la página recibe sus estrellas (si el
// perfume ya tiene opiniones). Se agrupan las tarjetas nuevas en una sola consulta.
const CACHE_CALIFICACIONES = new Map();
let _tarjetasPendientes = new Set();
let _timerTarjetas = null;

function htmlCalificacionTarjeta(info) {
  return `<span class="card-rating" aria-label="${formatoPromedio(info.promedio)} de 5 estrellas, ${textoOpiniones(info.total)}">${estrellasHtml(info.promedio, { clase: 'estrellas-xs' })}<span>${formatoPromedio(info.promedio)} (${info.total})</span></span>`;
}

function pintarCalificacionTarjeta(card) {
  const info = CACHE_CALIFICACIONES.get(Number(card.dataset.idProducto));
  card.dataset.cal = '1';
  if (!info || !info.total || card.querySelector('.card-rating')) return;
  const ancla = card.querySelector('.product-price-row');
  if (ancla) ancla.insertAdjacentHTML('beforebegin', htmlCalificacionTarjeta(info));
}

async function procesarTarjetasPendientes() {
  const cards = [..._tarjetasPendientes].filter((c) => c.isConnected);
  _tarjetasPendientes = new Set();
  const faltan = cards.map((c) => Number(c.dataset.idProducto)).filter((id) => !CACHE_CALIFICACIONES.has(id));
  if (faltan.length) {
    const resumen = await obtenerResumenCalificaciones(faltan).catch(() => ({}));
    faltan.forEach((id) => CACHE_CALIFICACIONES.set(id, resumen[id] || null));
  }
  cards.forEach(pintarCalificacionTarjeta);
}

function revisarTarjetasNuevas(raiz = document) {
  raiz.querySelectorAll?.('.product-card[data-id-producto]:not([data-cal])').forEach((c) => _tarjetasPendientes.add(c));
  if (!_tarjetasPendientes.size) return;
  clearTimeout(_timerTarjetas);
  _timerTarjetas = setTimeout(procesarTarjetasPendientes, 80);
}

// Catálogo Consolidado: "4,8 ★ · 12 opiniones de clientes sobre el consolidado →".
async function pintarResumenOpinionesConsolidado() {
  const el = document.getElementById('consolidado-opiniones-resumen');
  if (!el) return;
  try {
    const resenas = await obtenerResenasPublicas({ tipo: 'Consolidado' });
    if (resenas.length) {
      const promedio = resenas.reduce((a, r) => a + Number(r.calificacion), 0) / resenas.length;
      el.innerHTML = `${estrellasHtml(promedio, { clase: 'estrellas-sm' })}<strong>${formatoPromedio(promedio)}</strong><span>${textoOpiniones(resenas.length)} de clientes sobre el consolidado</span><span aria-hidden="true">&rarr;</span>`;
    } else {
      el.innerHTML = `${ICONS.plane}<span>¿Ya trajiste perfumes por consolidado? Cuéntanos cómo te fue</span><span aria-hidden="true">&rarr;</span>`;
    }
    el.hidden = false;
  } catch { /* adorno: si falla no se muestra */ }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof SUPABASE_CONFIGURADO === 'undefined' || !SUPABASE_CONFIGURADO) return;
  revisarTarjetasNuevas();
  new MutationObserver(() => revisarTarjetasNuevas()).observe(document.body, { childList: true, subtree: true });
  pintarResumenOpinionesConsolidado();
});
