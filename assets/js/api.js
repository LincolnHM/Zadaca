const WHATSAPP_NUMERO = '51990278017';

// Cada página vive ahora en su propia carpeta (cuenta/, catalogo/, etc. en vez de cuenta.html,
// catalogo.html) a distintas profundidades, así que un link relativo simple ("catalogo.html")
// ya no apunta al mismo lugar desde todas partes. Se usa esta base absoluta para toda la
// navegación interna generada por JS, y también para resolver imágenes con ruta relativa que
// vienen de la base de datos (columna imagen_url, ej. "assets/img/perfumes/x.jpg") y las URLs
// de notificaciones (columna url_destino, ver supabase/migrations/0009_urls_limpias.sql).
const SITE_ROOT = 'https://madisonzadaca.com/';

// Consolidado (importación por encargo) ACTIVO: Catálogo Consolidado con su propio Carrito de
// Avión (aparte del carrito de tienda/decants, mínimo de unidades por pedido). Si algún día
// hay que apagarlo, basta con poner esto en false y subir el cambio: el menú, el ícono del
// avión y las páginas de consolidado desaparecen (redirigen al catálogo) sin borrar nada. En el
// HTML estático, lo que depende de consolidados lleva el atributo data-consolidado (nace
// oculto y se destapa si esto es true, ver aplicarVisibilidadConsolidados).
const CONSOLIDADOS_ACTIVOS = true;

function aplicarVisibilidadConsolidados(raiz = document) {
  raiz.querySelectorAll('[data-consolidado]').forEach((el) => { el.hidden = !CONSOLIDADOS_ACTIVOS; });
  raiz.querySelectorAll('[data-sin-consolidado]').forEach((el) => { el.hidden = CONSOLIDADOS_ACTIVOS; });
}

// Consolidados por WhatsApp: la web no toma reservas de campañas, pero el cliente cotiza su
// encargo (perfume que no está en stock) escribiendo al WhatsApp del negocio.
function enlaceWhatsappConsolidado(perfume) {
  const texto = perfume
    ? `Hola Maison Zadaca! Quiero cotizar por consolidado: ${perfume}. ¿Me dan precio y tiempo de llegada?`
    : 'Hola Maison Zadaca! Quiero información sobre los consolidados y cotizar un perfume.';
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}

/* ---------------- Libro de Reclamaciones (compartido: página pública y panel admin) ---------------- */

function correoLegal(cfg) {
  return cfg?.correo_legal || cfg?.correo_contacto || '';
}

// Hoja de reclamación imprimible con el formato del Anexo I del Reglamento del Libro de
// Reclamaciones: la misma hoja sirve de constancia para el cliente y de archivo para el negocio.
function htmlHojaReclamacion(r, cfg) {
  const fecha = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(String(r.fecha_registro)) ? r.fecha_registro : `${r.fecha_registro}Z`);
  const pendiente = (texto) => `<span style="color:#b0473a">[${texto} pendiente]</span>`;
  const fila = (etiqueta, valor) => `<tr><th>${etiqueta}</th><td>${valor || '—'}</td></tr>`;
  return `
    <div class="hoja-reclamo">
      <h1>LIBRO DE RECLAMACIONES — HOJA DE RECLAMACIÓN</h1>
      <table>
        ${fila('N° de hoja', `<strong>${escapeHtml(r.numero)}</strong>`)}
        ${fila('Fecha', fecha.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' }))}
        ${fila('Proveedor', `${escapeHtml(cfg?.razon_social || '') || pendiente('Razón social')} (${escapeHtml(cfg?.nombre_comercial || 'Maison Zadaca')})`)}
        ${fila('RUC', escapeHtml(cfg?.ruc || '') || pendiente('RUC'))}
        ${fila('Domicilio', escapeHtml(cfg?.domicilio_fiscal || cfg?.direccion_chiclayo || ''))}
      </table>
      <h2>1. Identificación del consumidor reclamante</h2>
      <table>
        ${fila('Nombre', escapeHtml(r.consumidor_nombre))}
        ${fila(escapeHtml(r.consumidor_documento_tipo), escapeHtml(r.consumidor_documento))}
        ${fila('Domicilio', escapeHtml(r.consumidor_domicilio))}
        ${fila('Teléfono', escapeHtml(r.consumidor_telefono || ''))}
        ${fila('Correo', escapeHtml(r.consumidor_correo))}
        ${r.es_menor ? fila('Padre, madre o apoderado', escapeHtml(r.apoderado_nombre || '')) : ''}
      </table>
      <h2>2. Identificación del bien contratado</h2>
      <table>
        ${fila('Tipo', escapeHtml(r.bien_tipo))}
        ${fila('Descripción', escapeHtml(r.bien_descripcion))}
        ${fila('Monto reclamado', r.monto_reclamado != null ? formatoMoneda(r.monto_reclamado) : '—')}
        ${fila('N° de pedido', escapeHtml(r.numero_pedido || ''))}
      </table>
      <h2>3. Detalle de la reclamación y pedido del consumidor</h2>
      <table>
        ${fila('Tipo', `<strong>${escapeHtml(r.tipo)}</strong>`)}
        ${fila('Detalle', escapeHtml(r.detalle).replace(/\n/g, '<br>'))}
        ${fila('Pedido', escapeHtml(r.pedido_consumidor).replace(/\n/g, '<br>'))}
        ${fila('Respuesta por', r.respuesta_por === 'Domicilio' ? 'Carta al domicilio' : 'Correo electrónico')}
      </table>
      <h2>4. Observaciones y acciones adoptadas por el proveedor</h2>
      <table>
        ${fila('Respuesta', r.respuesta ? escapeHtml(r.respuesta).replace(/\n/g, '<br>') : 'Pendiente')}
        ${fila('Fecha de respuesta', r.fecha_respuesta ? new Date(`${String(r.fecha_respuesta).replace(/Z$/, '')}Z`).toLocaleDateString('es-PE', { dateStyle: 'long' }) : '—')}
      </table>
      <p class="hoja-nota"><strong>Reclamo:</strong> disconformidad relacionada a los productos o servicios. <strong>Queja:</strong> disconformidad no relacionada a los productos o servicios, o malestar o descontento respecto a la atención al público.</p>
      <p class="hoja-nota">La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI. El proveedor debe dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles improrrogables.</p>
    </div>
  `;
}

function estilosHojaReclamacion() {
  return `
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 28px; max-width: 760px; margin: 0 auto; }
    .hoja-reclamo h1 { font-size: 1.05rem; text-align: center; border: 2px solid #111; padding: 10px; margin: 0 0 14px; }
    .hoja-reclamo h2 { font-size: 0.82rem; text-transform: uppercase; background: #eee; padding: 6px 8px; margin: 18px 0 0; border: 1px solid #999; border-bottom: none; }
    .hoja-reclamo table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
    .hoja-reclamo th, .hoja-reclamo td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
    .hoja-reclamo th { width: 30%; background: #fafafa; font-weight: 600; }
    .hoja-nota { font-size: 0.74rem; color: #333; margin: 12px 0 0; line-height: 1.45; }
    @media print { body { padding: 0; } }
  `;
}

// Devuelve { numero, fecha_registro }: el número correlativo lo asigna la base (registrar_reclamo).
async function registrarReclamo(datos) {
  const { data, error } = await supabaseClient.rpc('registrar_reclamo', { p: datos });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

function imprimirHojaReclamacion(r, cfg) {
  const ventana = window.open('', '_blank');
  if (!ventana) { mostrarToast('El navegador bloqueó la ventana — permite ventanas emergentes para imprimir la hoja', 'error'); return; }
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8" /><title>Hoja de reclamación ${escapeHtml(r.numero)}</title><style>${estilosHojaReclamacion()}</style></head><body>${htmlHojaReclamacion(r, cfg)}<script>window.onload = function () { window.print(); };<\/script></body></html>`);
  ventana.document.close();
}

// Los pedidos de tienda y decants se recogen en la tienda de Chiclayo (donde está el stock); los
// de consolidado llegan importados y se recogen en el almacén de Lima.
function etiquetaRecojoEnTienda(modo = 'tienda') {
  return modo === 'consolidado' ? 'Recojo en almacén (Lima)' : 'Recojo en tienda (Chiclayo)';
}

/* ---------------- Sesión ---------------- */

async function obtenerSesion() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function estaLogueado() {
  return !!(await obtenerSesion());
}

async function obtenerPerfilActual() {
  const session = await obtenerSesion();
  if (!session) return null;
  const { data, error } = await supabaseClient.from('perfiles').select('*').eq('id', session.user.id).single();
  if (error) return null;
  return { ...data, correo: session.user.email };
}

// emailRedirectTo explícito: sin esto, Supabase manda al cliente que confirma su correo al
// "Site URL" configurado en el dashboard (Authentication -> URL Configuration) -- ese campo
// suele quedar en algo tipo localhost desde que se probó el proyecto la primera vez, así que
// sin este parámetro un cliente real terminaba en una URL muerta después de confirmar.
async function registrarUsuario({ nombres, apellidos, dni_ce_ruc, telefono, correo, contrasena }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: correo,
    password: contrasena,
    options: { data: { nombres, apellidos, dni_ce_ruc, telefono }, emailRedirectTo: `${SITE_ROOT}cuenta/` },
  });
  if (error) throw new Error(traducirErrorAuth(error));
  return data;
}

async function iniciarSesion({ correo, contrasena }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) throw new Error(traducirErrorAuth(error));
  return data;
}

async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.href = SITE_ROOT;
}

// Dispara el correo de recuperación que ya trae Supabase por defecto (no necesita SMTP ni
// Resend configurado aparte -- eso es solo para notify-email, ver README). El link del correo
// vuelve acá con un token que dispara el evento 'PASSWORD_RECOVERY' (ver cuenta.js), donde se
// pide la contraseña nueva.
async function solicitarRecuperacionContrasena(correo) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(correo, {
    redirectTo: `${SITE_ROOT}cuenta/?modo=restablecer`,
  });
  if (error) throw new Error(traducirErrorAuth(error));
}

// Sirve para dos casos: completar la recuperación (sesión temporal que crea Supabase al abrir
// el link del correo) y cambiar la contraseña estando ya logueado normalmente -- en ambos
// casos es la misma llamada, Supabase no pide la contraseña anterior.
async function cambiarContrasena(nuevaContrasena) {
  const { error } = await supabaseClient.auth.updateUser({ password: nuevaContrasena });
  if (error) throw new Error(traducirErrorAuth(error));
}

function traducirErrorAuth(error) {
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese correo';
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
  if (msg.includes('security purposes') || msg.includes('rate limit')) return 'Ya pediste esto hace poco -- espera unos minutos antes de volver a intentar.';
  return msg || 'Ocurrió un error inesperado';
}

// "retorno" siempre viaja como URL absoluta completa (no un nombre de archivo suelto) --
// con las páginas repartidas en carpetas a distinta profundidad, reconstruir el destino a
// mano (ej. tomar el último segmento del path) ya no alcanza para volver al lugar correcto.
// cuenta.js hace "window.location.href = RETORNO" directo, así que tiene que ser absoluta.
function irALoginConRetorno() {
  window.location.href = `${SITE_ROOT}cuenta/?retorno=${encodeURIComponent(window.location.href)}`;
}

/* ---------------- Catálogo ---------------- */

// Los filtros .or()/.ilike() de PostgREST usan coma y paréntesis como sintaxis propia — si el
// cliente escribe "Dior, Sauvage" o "Sauvage (100ml)" en el buscador, esos caracteres cortarían
// el filtro en vez de buscarse como texto literal. Se escapan con backslash antes de armar la
// query (ver docs de PostgREST: https://postgrest.org/en/stable/references/api/tables_views.html#operators).
function escaparFiltroSupabase(texto) {
  return String(texto).replace(/[,()]/g, (c) => `\\${c}`);
}

// Columnas que puede ver CUALQUIERA (anon incluido) en las consultas públicas de catálogo.
// A propósito NO incluye costo_importacion_pen/usd ni margen_aplicado -- esos son datos
// internos del admin (ver comentario en schema.sql), pero un `select('*')` los manda igual en
// la respuesta JSON aunque la UI nunca los pinte: cualquiera que abra el Network tab del
// navegador los puede leer. RLS es a nivel de fila, no de columna, así que la única forma de
// no filtrarlos es no pedirlos.
// precio_3ml/5ml/10ml: solo decants (ver migración 0016), null = esa talla no se vende. A
// propósito NO incluye mililitros_restantes -- es un gauge interno del admin (cuánto queda del
// frasco fuente), nunca se muestra al cliente, mismo criterio que costo_importacion_pen/usd.
const CAMPOS_PRODUCTO_PUBLICO = 'id, slug, nombre, marca, genero, familia_olfativa, concentracion, mililitros, descripcion, notas_olfativas, inspirado_en, precio_tienda_regular, descuento_tienda_porcentaje, precio_consolidado_fijo, estado, es_nuevo, es_bestseller, imagen_url, es_liquidacion, precio_liquidacion, liquidacion_unidad_minima, tipo_casa, es_decant, id_decant_grupo, id_perfume_tienda, precio_3ml, precio_5ml, precio_10ml';

// soloConStock=true es el catálogo de TIENDA FÍSICA: solo perfumes con stock_fisico > 0 (lo
// que el admin cargó en "Stock físico" por producto). Usa !inner para forzar el join con
// inventario, así el .gt() puede filtrar filas del catálogo, no solo del inventario embebido
// (con left join normal, un perfume sin stock igual aparecería con inventario: null).
// soloConStock=false (por default) es el comportamiento de siempre: todo el catálogo, sin
// mirar stock — lo usa el buscador de consolidado.js, porque una reserva de consolidado se
// importa bajo pedido y no depende de lo que haya físicamente en la tienda ahora mismo.
// Un perfume Unisex sirve tanto para "Hombre" como para "Mujer" -- si el filtro pide un
// género puntual, se incluye también lo Unisex en vez de dejarlo fuera con un .eq() estricto
// (antes un perfume marcado Unisex solo aparecía filtrando "Unisex", nunca en "Hombre" ni
// "Mujer" aunque calzara igual). Filtrar por "Unisex" en sí sigue siendo exacto: no tendría
// sentido mezclarle ahí productos exclusivos de Hombre o Mujer.
function aplicarFiltroGenero(query, genero) {
  if (genero === 'Hombre' || genero === 'Mujer') return query.in('genero', [genero, 'Unisex']);
  if (genero) return query.eq('genero', genero);
  return query;
}

// Búsqueda: nombre, marca y también "Inspirado en" -- así quien busca "Sauvage" encuentra
// además los árabes que se le parecen. aroma: una nota de notas_olfativas (ej. "Vainilla").
// precioMin/precioMax: sobre el precio de tienda.
function filtroBusquedaProductos(busqueda) {
  const q = escaparFiltroSupabase(busqueda);
  return `nombre.ilike.%${q}%,marca.ilike.%${q}%,inspirado_en.ilike.%${q}%`;
}

async function obtenerProductos({ genero, marca, familia, tipo_casa, busqueda, destacado, orden, pagina = 1, porPagina = 12, soloConStock = false, aroma, precioMin, precioMax } = {}) {
  // Un decant no tiene stock por unidad que mirar en "inventario" (sus 3 tallas comparten un
  // mismo frasco, ver migración 0016) -- "disponible" para ellos es el toggle Disponible/
  // Agotado del admin (columna estado), no inventario.stock_disponible.
  const filtrarPorInventario = soloConStock && destacado !== 'decant';
  let query = supabaseClient
    .from('perfumes')
    .select(filtrarPorInventario ? `${CAMPOS_PRODUCTO_PUBLICO}, inventario!inner(stock_disponible)` : `${CAMPOS_PRODUCTO_PUBLICO}, inventario(stock_disponible)`, { count: 'exact' })
    .eq('activo', true);

  if (filtrarPorInventario) query = query.gt('inventario.stock_disponible', 0);
  if (soloConStock && destacado === 'decant') query = query.neq('estado', 'Agotado');
  query = aplicarFiltroGenero(query, genero);
  if (marca) query = query.eq('marca', marca);
  if (familia) query = query.eq('familia_olfativa', familia);
  if (tipo_casa) query = query.eq('tipo_casa', tipo_casa);
  if (busqueda) query = query.or(filtroBusquedaProductos(busqueda));
  if (aroma) query = query.ilike('notas_olfativas', `%${escaparFiltroSupabase(aroma)}%`);
  if (precioMin != null && precioMin !== '') query = query.gte('precio_tienda_regular', Number(precioMin));
  if (precioMax != null && precioMax !== '') query = query.lte('precio_tienda_regular', Number(precioMax));
  if (destacado === 'nuevo') query = query.eq('es_nuevo', true);
  if (destacado === 'bestseller') query = query.eq('es_bestseller', true);
  if (destacado === 'liquidacion') query = query.eq('es_liquidacion', true);
  // Decants: cada perfume es UNA fila con sus 3 precios por talla adentro (ver migración
  // 0016) -- el catálogo de tienda normal nunca los muestra (viven en su propia sección, ver
  // decants/index.html).
  if (destacado === 'decant') query = query.eq('es_decant', true);
  // 'Bajo_Pedido' = perfume que solo se trae por consolidado (lo carga el admin con nombre y
  // precio): vive únicamente en el Catálogo Consolidado, nunca en la tienda.
  else query = query.eq('es_decant', false).neq('estado', 'Bajo_Pedido');

  // 'marca' (default): agrupa por marca y, dentro de cada marca, por nombre -- así las
  // variantes de una misma línea (ej. todos los Khamrah, todos los Game of Spades) salen
  // seguidas en vez de mezcladas por fecha de creación (que es cuando se cargó cada Excel,
  // no tiene ninguna relación con qué perfumes son parecidos entre sí).
  query = aplicarOrden(query, orden, 'precio_tienda_regular');

  const desde = (pagina - 1) * porPagina;
  query = query.range(desde, desde + porPagina - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const productos = (data || []).map(normalizarProducto);
  return { productos, total: count || 0, totalPaginas: Math.ceil((count || 0) / porPagina) };
}

// Compartido entre obtenerProductos() y obtenerProductosConsolidado() -- el único que cambia
// entre tienda y consolidado es qué columna de precio se usa para precio_asc/precio_desc.
function aplicarOrden(query, orden, columnaPrecio) {
  if (orden === 'precio_asc') return query.order(columnaPrecio, { ascending: true });
  if (orden === 'precio_desc') return query.order(columnaPrecio, { ascending: false });
  if (orden === 'nombre') return query.order('nombre', { ascending: true });
  if (orden === 'recientes') return query.order('fecha_creacion', { ascending: false });
  return query.order('marca', { ascending: true }).order('nombre', { ascending: true });
}

// Catálogo de CONSOLIDADO: a diferencia de obtenerProductos(), muestra TODO lo que tenemos
// (sin filtrar por stock de tienda) y ordena/muestra precio_consolidado_fijo en vez de
// precio_tienda_regular — son dos catálogos con precios independientes (ver schema.sql,
// precio_consolidado_fijo <= precio_tienda_regular no implica que sean el mismo número).
async function obtenerProductosConsolidado({ genero, marca, familia, tipo_casa, busqueda, orden, pagina = 1, porPagina = 12 } = {}) {
  // Los decants no participan de consolidados: son stock físico ya fraccionado, no
  // importación bajo pedido -- se venden solo por tienda directa (ver destacado: 'decant'
  // en obtenerProductos()).
  let query = supabaseClient.from('perfumes').select(CAMPOS_PRODUCTO_PUBLICO, { count: 'exact' }).eq('activo', true).eq('es_decant', false);

  query = aplicarFiltroGenero(query, genero);
  if (marca) query = query.eq('marca', marca);
  if (familia) query = query.eq('familia_olfativa', familia);
  if (tipo_casa) query = query.eq('tipo_casa', tipo_casa);
  if (busqueda) query = query.or(filtroBusquedaProductos(busqueda));

  query = aplicarOrden(query, orden, 'precio_consolidado_fijo');

  const desde = (pagina - 1) * porPagina;
  query = query.range(desde, desde + porPagina - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { productos: data || [], total: count || 0, totalPaginas: Math.ceil((count || 0) / porPagina) };
}

function normalizarProducto(p) {
  const stock = Array.isArray(p.inventario) ? p.inventario[0]?.stock_disponible : p.inventario?.stock_disponible;
  return { ...p, stock_disponible: Math.max(stock ?? 0, 0) };
}

// consolidado=true: opciones del Catálogo Consolidado (incluye los perfumes 'Bajo_Pedido', que
// solo se traen por consolidado y en la tienda no existen).
async function obtenerFiltrosCatalogo({ consolidado = false } = {}) {
  // es_decant=false: los decants viven en su propia sección (ver destacado: 'decant' en
  // obtenerProductos()), así que una marca que solo tenga decants no debe aparecer como
  // opción de filtro acá -- si apareciera, filtrar por ella daría 0 resultados.
  // Trae también el stock (join a inventario) en la misma consulta: de acá salen tanto el
  // conteo por marca ("Dior (39)") como el conteo de disponibilidad ("En stock" / "Todos"),
  // sin necesitar una consulta aparte para cada uno.
  const { data: filasData } = await supabaseClient
    .from('perfumes')
    .select('marca, familia_olfativa, notas_olfativas, estado, inventario(stock_disponible)')
    .eq('activo', true)
    .eq('es_decant', false);

  const filas = (filasData || []).filter((r) => consolidado || r.estado !== 'Bajo_Pedido').map((r) => ({
    marca: r.marca,
    familia_olfativa: r.familia_olfativa,
    notas_olfativas: r.notas_olfativas,
    stock_disponible: Math.max(Array.isArray(r.inventario) ? (r.inventario[0]?.stock_disponible ?? 0) : (r.inventario?.stock_disponible ?? 0), 0),
  }));

  const conteoMarcas = new Map();
  filas.forEach((r) => conteoMarcas.set(r.marca, (conteoMarcas.get(r.marca) || 0) + 1));
  const marcas = [...conteoMarcas.keys()].sort();

  // .filter(Boolean): familia_olfativa es texto libre en el form de admin, así que puede
  // quedar guardada como '' (no NULL) -- sin esto, esa fila generaba una opción de filtro en
  // blanco, sin texto, en el dropdown del catálogo.
  const familias = [...new Set(filas.map((r) => r.familia_olfativa).filter(Boolean))].sort();

  const enStock = filas.filter((r) => r.stock_disponible > 0).length;
  return { marcas, familias, conteoMarcas, aromas: aromasFrecuentes(filas), disponibilidad: { enStock, agotado: filas.length - enStock } };
}

// Las notas vienen como lista separada por comas ("Ámbar, Cálido, Dulce"): se cuentan y se
// devuelven las más frecuentes como opciones del filtro "Aroma" (las fichas viejas con el
// formato "Salida: ... | Fondo: ..." no se parten).
function aromasFrecuentes(filas, limite = 16) {
  const conteo = new Map();
  filas.forEach((r) => {
    if (!r.notas_olfativas || r.notas_olfativas.includes('|')) return;
    r.notas_olfativas.split(',').map((n) => n.trim()).filter((n) => n && n.length <= 24).forEach((n) => {
      const nombre = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
      conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
    });
  });
  // "Afrutados" y "Afrutado" son la misma opción: el plural se suma al singular (el filtro
  // busca por coincidencia parcial, así que "Afrutado" encuentra ambos).
  [...conteo.keys()].forEach((n) => {
    if (n.endsWith('s') && conteo.has(n.slice(0, -1))) {
      conteo.set(n.slice(0, -1), conteo.get(n.slice(0, -1)) + conteo.get(n));
      conteo.delete(n);
    }
  });
  return [...conteo.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, limite).map(([n, c]) => ({ nombre: n, cantidad: c }));
}

// A diferencia de marca/familia (que salen de los datos reales), tipo_casa es un vocabulario
// fijo — ver constraint chk_perfumes_tipo_casa en schema.sql — así que no hace falta una
// consulta aparte para listar sus valores posibles.
const TIPOS_CASA = ['Árabe', 'Diseñador', 'Nicho'];

// Sugerencias del buscador en vivo del catálogo (dropdown mientras se escribe). Trae pocos
// campos y un límite bajo porque se dispara en cada tecleo (con debounce) — a diferencia de
// obtenerProductos(), que trae la página completa con paginación.
async function obtenerSugerenciasBusqueda(texto, limite = 6, soloConStock = false, { soloTienda = true } = {}) {
  const q = (texto || '').trim();
  if (!q) return [];
  const campos = 'id, slug, nombre, marca, imagen_url, inspirado_en, precio_tienda_regular, descuento_tienda_porcentaje, precio_consolidado_fijo';
  let query = supabaseClient
    .from('perfumes')
    .select(soloConStock ? `${campos}, inventario!inner(stock_disponible)` : campos)
    .eq('activo', true)
    .eq('es_decant', false)
    .or(filtroBusquedaProductos(q))
    .order('nombre', { ascending: true })
    .limit(limite);
  if (soloConStock) query = query.gt('inventario.stock_disponible', 0);
  if (soloTienda) query = query.neq('estado', 'Bajo_Pedido');
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

// Buscador del encabezado: perfumes enteros con stock + decants disponibles, en una sola lista.
async function buscarEnTodaLaTienda(texto, limite = 8) {
  const q = (texto || '').trim();
  if (!q) return [];
  const campos = 'slug, nombre, marca, imagen_url, inspirado_en, es_decant, precio_tienda_regular, descuento_tienda_porcentaje, es_liquidacion, precio_liquidacion, precio_3ml, precio_5ml, precio_10ml, estado';
  const [enteros, decants] = await Promise.all([
    supabaseClient.from('perfumes').select(`${campos}, inventario!inner(stock_disponible)`)
      .eq('activo', true).eq('es_decant', false).gt('inventario.stock_disponible', 0)
      .or(filtroBusquedaProductos(q)).order('nombre').limit(limite),
    supabaseClient.from('perfumes').select(campos)
      .eq('activo', true).eq('es_decant', true).neq('estado', 'Agotado')
      .or(filtroBusquedaProductos(q)).order('nombre').limit(limite),
  ]);
  return [...(enteros.data || []), ...(decants.data || [])].slice(0, limite);
}

async function obtenerProductoPorSlug(slug) {
  const { data: producto, error } = await supabaseClient
    .from('perfumes')
    .select(`${CAMPOS_PRODUCTO_PUBLICO}, inventario(stock_disponible)`)
    .eq('slug', slug)
    .eq('activo', true)
    .single();
  if (error || !producto) throw new Error('Producto no encontrado');

  // Un decant ya trae sus 3 precios por talla en la misma fila (ver migración 0016) -- no hace
  // falta ninguna consulta aparte para armar el selector de tamaño, ver producto.js.
  //
  // Un decant "también te puede interesar" debe ofrecer OTROS decants con stock real -- antes
  // filtraba solo por marca igual que un perfume normal, así que en la ficha de un decant
  // podían salir botellas completas, sets, o productos agotados de la misma marca (nada que
  // ver con "prueba antes de comprar", la lógica de decants). Reutiliza obtenerProductos() con
  // el mismo filtro que ya usa decants/index.html (destacado:'decant' + soloConStock) en vez
  // de duplicar esa consulta acá.
  //
  // Un perfume entero sugiere otros enteros CON stock: primero de la misma marca y, si no
  // alcanzan, del mismo género (antes podían salir decants con su precio de 3ml como si fuera
  // un frasco, o productos agotados).
  let relacionadosCrudos;
  if (producto.es_decant) {
    relacionadosCrudos = await obtenerProductos({ destacado: 'decant', soloConStock: true, orden: 'recientes', porPagina: 8 }).then(({ productos }) => productos);
  } else {
    const mismaMarca = await obtenerProductos({ marca: producto.marca, soloConStock: true, porPagina: 8 }).then(({ productos }) => productos).catch(() => []);
    relacionadosCrudos = mismaMarca.filter((r) => r.id !== producto.id);
    if (relacionadosCrudos.length < 4) {
      const mismoGenero = await obtenerProductos({ genero: producto.genero, soloConStock: true, orden: 'recientes', porPagina: 12 }).then(({ productos }) => productos).catch(() => []);
      const ya = new Set([producto.id, ...relacionadosCrudos.map((r) => r.id)]);
      relacionadosCrudos.push(...mismoGenero.filter((r) => !ya.has(r.id)));
    }
  }
  const relacionados = (relacionadosCrudos || []).filter((r) => r.id !== producto.id).slice(0, 4);

  // El mismo perfume en la otra presentación: el decant que se sirve de este frasco (para
  // "pruébalo antes") o el frasco entero del que sale este decant (para "llévalo completo").
  let otraPresentacion = null;
  try {
    if (producto.es_decant && producto.id_perfume_tienda) {
      const { data } = await supabaseClient.from('perfumes')
        .select(`${CAMPOS_PRODUCTO_PUBLICO}, inventario(stock_disponible)`)
        .eq('id', producto.id_perfume_tienda).eq('activo', true).maybeSingle();
      if (data && normalizarProducto(data).stock_disponible > 0) otraPresentacion = normalizarProducto(data);
    } else if (!producto.es_decant) {
      const { data } = await supabaseClient.from('perfumes')
        .select(CAMPOS_PRODUCTO_PUBLICO)
        .eq('id_perfume_tienda', producto.id).eq('es_decant', true).eq('activo', true).neq('estado', 'Agotado')
        .limit(1);
      if (data?.length) otraPresentacion = data[0];
    }
  } catch { /* no es crítico: la ficha se muestra igual sin el vínculo */ }

  return {
    producto: normalizarProducto(producto),
    relacionados,
    otraPresentacion,
  };
}

async function obtenerResenasDestacadas() {
  const { data, error } = await supabaseClient
    .from('resenas')
    .select('calificacion, comentario, fecha_creacion, perfiles(nombres), perfumes(nombre)')
    .eq('aprobado', true)
    .order('fecha_creacion', { ascending: false })
    .limit(6);
  if (error) return [];
  return data.map((r) => ({ ...r, nombres: r.perfiles?.nombres || 'Cliente', producto: r.perfumes?.nombre }));
}

/* ---------------- Favoritos ---------------- */

async function obtenerFavoritos() {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('favoritos')
    .select('id_producto, perfumes(slug, nombre, marca, genero, precio_tienda_regular, descuento_tienda_porcentaje, imagen_url, estado)')
    .eq('id_cliente', session.user.id);
  if (error) return [];
  return data.map((f) => f.perfumes);
}

async function alternarFavorito(idProducto, activo) {
  const session = await obtenerSesion();
  if (!session) return irALoginConRetorno();
  if (activo) {
    await supabaseClient.from('favoritos').delete().eq('id_cliente', session.user.id).eq('id_producto', idProducto);
  } else {
    await supabaseClient.from('favoritos').insert({ id_cliente: session.user.id, id_producto: idProducto });
  }
}

// Para pintar el corazón ya relleno al entrar a producto.html si el cliente ya lo tiene en
// favoritos (sin esto, el botón nace siempre "vacío" aunque el producto ya esté guardado).
async function esFavorito(idProducto) {
  const session = await obtenerSesion();
  if (!session) return false;
  const { data } = await supabaseClient.from('favoritos').select('id_producto').eq('id_cliente', session.user.id).eq('id_producto', idProducto).maybeSingle();
  return !!data;
}

/* ---------------- Carrito ---------------- */

// Un visitante sin cuenta puede armar su carrito igual que uno logueado -- se guarda en
// localStorage (solo id de producto + cantidad, el detalle se resuelve siempre fresco contra
// la base) hasta que confirma el pedido, momento en el que recién se le pide identificarse
// (ver crearPedidoInvitado más abajo). Antes agregarAlCarrito() mandaba a la pantalla de login
// apenas alguien sin cuenta tocaba "Agregar al Carrito", incluso antes de ver el carrito.
const CLAVE_CARRITO_INVITADO = 'zadaca_carrito_invitado';

function leerCarritoInvitado() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO_INVITADO) || '[]');
  } catch {
    return [];
  }
}
function guardarCarritoInvitado(items) {
  try {
    localStorage.setItem(CLAVE_CARRITO_INVITADO, JSON.stringify(items));
  } catch { /* localStorage bloqueado (modo privado, etc.) -- el carrito de invitado no persiste entre visitas, pero no rompe nada en la actual */ }
}

async function obtenerCarritoInvitado() {
  const items = leerCarritoInvitado();
  if (!items.length) return [];
  const { data, error } = await supabaseClient
    .from('perfumes')
    .select('id, slug, nombre, marca, genero, mililitros, precio_tienda_regular, descuento_tienda_porcentaje, es_liquidacion, precio_liquidacion, liquidacion_unidad_minima, imagen_url, es_decant, precio_3ml, precio_5ml, precio_10ml, estado, inventario(stock_disponible)')
    .in('id', items.map((i) => i.id_producto))
    .eq('activo', true);
  if (error) throw new Error(error.message);
  const porId = new Map(data.map((p) => [p.id, p]));
  // Filtra ids que ya no existen o se ocultaron desde que se agregaron -- evita mostrar un
  // renglón vacío en vez de silenciosamente reventar el .map() de abajo.
  return items
    .filter((i) => porId.has(i.id_producto))
    .map((i) => {
      const p = porId.get(i.id_producto);
      const talla_ml = i.talla_ml || 0;
      return {
        ...p,
        id: `invitado-${p.id}-${talla_ml}`,
        cantidad: i.cantidad,
        talla_ml,
        stock_disponible: Math.max(Array.isArray(p.inventario) ? (p.inventario[0]?.stock_disponible ?? 0) : (p.inventario?.stock_disponible ?? 0), 0),
      };
    });
}

// El id de un item de carrito de invitado codifica producto+talla ("invitado-{id}-{talla}")
// para poder distinguir 2 filas del mismo decant en tallas distintas (ver migración 0016).
function idProductoDesdeItemCarrito(idItem) {
  return Number(String(idItem).replace('invitado-', '').split('-')[0]);
}
function tallaDesdeItemCarrito(idItem) {
  return Number(String(idItem).replace('invitado-', '').split('-')[1] || 0);
}

async function obtenerCarrito() {
  const session = await obtenerSesion();
  if (!session) return obtenerCarritoInvitado();
  const { data, error } = await supabaseClient
    .from('carrito_items')
    .select('id, cantidad, talla_ml, perfumes(id, slug, nombre, marca, genero, mililitros, precio_tienda_regular, descuento_tienda_porcentaje, es_liquidacion, precio_liquidacion, liquidacion_unidad_minima, imagen_url, es_decant, precio_3ml, precio_5ml, precio_10ml, estado, inventario(stock_disponible))')
    .eq('id_cliente', session.user.id)
    .order('fecha_agregado', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((item) => ({
    id: item.id,
    cantidad: item.cantidad,
    talla_ml: item.talla_ml,
    ...item.perfumes,
    stock_disponible: Math.max(item.perfumes.inventario?.[0]?.stock_disponible ?? item.perfumes.inventario?.stock_disponible ?? 0, 0),
  }));
}

async function agregarAlCarrito(idProducto, cantidad = 1, tallaMl = 0) {
  const session = await obtenerSesion();
  if (!session) {
    const items = leerCarritoInvitado();
    const existente = items.find((i) => i.id_producto === idProducto && (i.talla_ml || 0) === tallaMl);
    if (existente) existente.cantidad += cantidad;
    else items.push({ id_producto: idProducto, cantidad, talla_ml: tallaMl });
    guardarCarritoInvitado(items);
    return;
  }
  const { data: existente } = await supabaseClient
    .from('carrito_items')
    .select('id, cantidad')
    .eq('id_cliente', session.user.id)
    .eq('id_producto', idProducto)
    .eq('talla_ml', tallaMl)
    .maybeSingle();

  if (existente) {
    const { error } = await supabaseClient.from('carrito_items').update({ cantidad: existente.cantidad + cantidad }).eq('id', existente.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseClient.from('carrito_items').insert({ id_cliente: session.user.id, id_producto: idProducto, cantidad, talla_ml: tallaMl });
    if (error) throw new Error(error.message);
  }
}

async function actualizarCantidadCarrito(idItem, cantidad) {
  const session = await obtenerSesion();
  if (!session) {
    const items = leerCarritoInvitado();
    const idProducto = idProductoDesdeItemCarrito(idItem);
    const talla = tallaDesdeItemCarrito(idItem);
    const item = items.find((i) => i.id_producto === idProducto && (i.talla_ml || 0) === talla);
    if (item) { item.cantidad = cantidad; guardarCarritoInvitado(items); }
    return;
  }
  const { error } = await supabaseClient.from('carrito_items').update({ cantidad }).eq('id', idItem);
  if (error) throw new Error(error.message);
}

async function eliminarDelCarrito(idItem) {
  const session = await obtenerSesion();
  if (!session) {
    const idProducto = idProductoDesdeItemCarrito(idItem);
    const talla = tallaDesdeItemCarrito(idItem);
    guardarCarritoInvitado(leerCarritoInvitado().filter((i) => !(i.id_producto === idProducto && (i.talla_ml || 0) === talla)));
    return;
  }
  const { error } = await supabaseClient.from('carrito_items').delete().eq('id', idItem);
  if (error) throw new Error(error.message);
}

// Se llama apenas hay sesión activa (ver iniciarLayout en main.js, que corre en cada página):
// si el cliente armó un carrito de invitado y luego inició sesión o se registró -- ya sea por
// el checkout de invitado (crearPedidoInvitado) o por el link "Ingresar" normal del header --,
// esos productos se suman al carrito real de la cuenta en vez de perderse.
async function fusionarCarritoInvitadoConCuenta() {
  const items = leerCarritoInvitado();
  if (!items.length) return;
  const session = await obtenerSesion();
  if (!session) return;
  guardarCarritoInvitado([]); // se limpia antes de escribir: si algo falla a medias, no se reintenta en bucle en la próxima carga
  for (const item of items) {
    try {
      const talla_ml = item.talla_ml || 0;
      const { data: existente } = await supabaseClient
        .from('carrito_items')
        .select('id, cantidad')
        .eq('id_cliente', session.user.id)
        .eq('id_producto', item.id_producto)
        .eq('talla_ml', talla_ml)
        .maybeSingle();
      if (existente) {
        await supabaseClient.from('carrito_items').update({ cantidad: existente.cantidad + item.cantidad }).eq('id', existente.id);
      } else {
        await supabaseClient.from('carrito_items').insert({ id_cliente: session.user.id, id_producto: item.id_producto, cantidad: item.cantidad, talla_ml });
      }
    } catch (err) {
      console.error(err); // un producto puntual que falle (ej. se desactivó) no debe frenar el resto de la fusión
    }
  }
}

/* ---------------- Direcciones ---------------- */

async function obtenerDirecciones() {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('direcciones_cliente')
    .select('*, ubigeo(departamento, provincia, distrito)')
    .eq('id_cliente', session.user.id)
    .order('predeterminada', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((d) => ({ ...d, ...d.ubigeo }));
}

async function crearDireccion(direccion) {
  const session = await obtenerSesion();
  if (!session) throw new Error('Debes iniciar sesión');
  if (direccion.predeterminada) {
    await supabaseClient.from('direcciones_cliente').update({ predeterminada: false }).eq('id_cliente', session.user.id);
  }
  const { data: creada, error } = await supabaseClient.from('direcciones_cliente').insert({ ...direccion, id_cliente: session.user.id }).select('id').single();
  if (error) throw new Error(error.message);
  return creada.id;
}

async function eliminarDireccion(id) {
  const { error } = await supabaseClient.from('direcciones_cliente').delete().eq('id', id);
  if (error) throw new Error('No se pudo eliminar (puede estar asociada a un pedido existente)');
}

async function obtenerUbigeos() {
  const { data, error } = await supabaseClient.from('ubigeo').select('*').order('departamento');
  if (error) return [];
  return data;
}

/* ---------------- Pedidos / Checkout ---------------- */

async function crearPedido(idDireccion) {
  const { data, error } = await supabaseClient.rpc('crear_pedido_directo', { p_id_direccion: idDireccion });
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------- Checkout de invitado ---------------- */

// Todo el flujo de pedidos (direcciones_cliente, carrito_items, crear_pedido_directo) exige un
// auth.uid() -- no hay forma de crear un pedido real sin alguna cuenta detrás. En vez de exigir
// que el cliente "tenga cuenta" desde antes, el checkout de invitado (ver carrito.js) le pide
// los mismos datos de un pedido normal (nombre, correo, teléfono, DNI, dirección) y crea la
// cuenta con ESOS datos en el mismo paso -- lo enmarca como "para que veas tu pedido después",
// no como una cuenta aparte que tenga que crear.
//
// Si Supabase tiene "Confirm email" activo en este proyecto, registrarUsuario() no devuelve
// sesión todavía (el cliente tiene que abrir el link del correo primero) -- en ese caso NO se
// puede crear el pedido ahora mismo (no hay auth.uid() hasta que confirme), así que se guarda
// la dirección en localStorage y se completa solo la próxima vez que haya sesión activa (ver
// intentarResumirCheckoutPendiente(), llamado desde iniciarLayout() en cada carga de página).
const CLAVE_CHECKOUT_PENDIENTE = 'zadaca_checkout_pendiente';

function guardarCheckoutPendiente(datosDireccion) {
  try {
    localStorage.setItem(CLAVE_CHECKOUT_PENDIENTE, JSON.stringify(datosDireccion));
  } catch { /* si no se puede guardar, el cliente simplemente tendrá que repetir sus datos al confirmar el correo -- no es un error fatal */ }
}

// datosCuenta: { nombres, apellidos, dni_ce_ruc, telefono, correo, contrasena }
// datosDireccion: mismos campos que usa el formulario de "Mis Direcciones" (direccion_detalle,
// codigo_ubigeo, tipo_despacho, agencia_nombre, nombre_receptor) + predeterminada:true.
// Devuelve { pedidoId } si el pedido quedó creado ya mismo, o { pedidoId: null } si la cuenta
// quedó pendiente de confirmar el correo (el pedido se completa solo más adelante).
async function crearPedidoInvitado(datosCuenta, datosDireccion) {
  const resultadoRegistro = await registrarUsuario(datosCuenta);
  if (!resultadoRegistro.session) {
    guardarCheckoutPendiente(datosDireccion);
    return { pedidoId: null };
  }
  await fusionarCarritoInvitadoConCuenta();
  const idDireccion = await crearDireccion(datosDireccion);
  const idPedido = await crearPedido(idDireccion);
  return { pedidoId: idPedido };
}

// Corre en cada carga de página con sesión activa (ver iniciarLayout en main.js): si quedó un
// checkout de invitado a medias por confirmación de correo pendiente, lo termina solo apenas
// el cliente confirma e inicia sesión, sin que tenga que volver a llenar sus datos de envío.
async function intentarResumirCheckoutPendiente() {
  let pendiente;
  try {
    pendiente = JSON.parse(localStorage.getItem(CLAVE_CHECKOUT_PENDIENTE) || 'null');
  } catch {
    pendiente = null;
  }
  if (!pendiente) return null;
  const session = await obtenerSesion();
  if (!session) return null;
  localStorage.removeItem(CLAVE_CHECKOUT_PENDIENTE);
  try {
    await fusionarCarritoInvitadoConCuenta();
    const idDireccion = await crearDireccion(pendiente);
    return await crearPedido(idDireccion);
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function obtenerPedidos() {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('pedidos')
    .select('id, tipo_pedido, monto_total, estado_pago, fecha_creacion, cancelado, envios(estado_envio, numero_guia_seguimiento)')
    .eq('id_cliente', session.user.id)
    .order('fecha_creacion', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((p) => ({ ...p, estado_envio: p.envios?.[0]?.estado_envio, numero_guia_seguimiento: p.envios?.[0]?.numero_guia_seguimiento }));
}

async function obtenerPedidoPorId(id) {
  const { data: pedido, error } = await supabaseClient
    .from('pedidos')
    .select('*, envios(estado_envio, numero_guia_seguimiento, empresa_transporte), direcciones_cliente(direccion_detalle, etiqueta)')
    .eq('id', id)
    .single();
  if (error) throw new Error('Pedido no encontrado');

  const { data: items } = await supabaseClient
    .from('detalle_pedido')
    .select('cantidad, precio_unitario_aplicado, subtotal, talla_ml, descripcion_libre, perfumes(nombre, marca, imagen_url, slug, es_decant)')
    .eq('id_pedido', id);

  const { data: pagos } = await supabaseClient
    .from('pagos')
    .select('id, monto, metodo_pago, tipo_pago, estado_pago, fecha_pago')
    .eq('id_pedido', id)
    .order('fecha_pago', { ascending: false });

  return {
    ...pedido,
    estado_envio: pedido.envios?.[0]?.estado_envio,
    numero_guia_seguimiento: pedido.envios?.[0]?.numero_guia_seguimiento,
    direccion_detalle: pedido.direcciones_cliente?.direccion_detalle,
    // Una línea libre (perfume fuera del catálogo que el admin escribió a mano) no trae perfumes.
    items: (items || []).map((i) => ({ ...i, ...(i.perfumes || {}), nombre: i.perfumes?.nombre ?? i.descripcion_libre ?? '—', marca: i.perfumes?.marca ?? '' })),
    pagos: pagos || [],
  };
}

/* ---------------- Consolidados ---------------- */

async function obtenerConsolidados() {
  const { data, error } = await supabaseClient
    .from('consolidados')
    .select('*')
    .order('estado', { ascending: true })
    .order('fecha_apertura', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(calcularAvanceConsolidado);
}

function calcularAvanceConsolidado(c) {
  const porcentaje = Math.min(Math.round((100 * c.total_unidades_acumuladas) / c.minimo_unidades), 100);
  return { ...c, porcentaje_avance: porcentaje };
}

// Qué perfume y cuántas unidades lleva reservadas cada producto de la campaña es información
// interna (panel admin → Consolidados) — la página pública ya no la trae ni la muestra, solo
// el estado y el % de avance hacia el mínimo.
async function obtenerConsolidadoPorId(id) {
  const { data: consolidado, error } = await supabaseClient.from('consolidados').select('*').eq('id', id).single();
  if (error) throw new Error('Consolidado no encontrado');

  const { data: historial } = await supabaseClient
    .from('historial_estados_consolidado')
    .select('estado, descripcion_publica, fecha_evento')
    .eq('id_consolidado', id)
    .order('fecha_evento', { ascending: true });

  return {
    ...calcularAvanceConsolidado(consolidado),
    historial: historial || [],
  };
}

// Escalones de descuento por volumen (ver migración 0005): un monto fijo por unidad, igual
// para cualquier perfume, que se activa cuando el cliente supera cierto total acumulado (en
// soles) reservado en esa campaña. Se cachea porque son datos públicos que casi no cambian.
let DESCUENTOS_VOLUMEN_CACHE = null;
async function obtenerDescuentosVolumen() {
  if (DESCUENTOS_VOLUMEN_CACHE) return DESCUENTOS_VOLUMEN_CACHE;
  const { data, error } = await supabaseClient
    .from('descuentos_volumen_consolidado')
    .select('umbral_soles, descuento_por_unidad')
    .order('umbral_soles', { ascending: true });
  if (error) throw new Error(error.message);
  DESCUENTOS_VOLUMEN_CACHE = data;
  return data;
}

// Tabla de precios por escalón para un perfume puntual (para mostrar en producto.html), a
// partir de su precio consolidado base. Es solo informativo — el precio real que se cobra lo
// calcula reservar_en_consolidado() del lado del servidor según lo que el cliente ya acumuló.
function calcularEscalonesPrecio(precioBase, descuentos) {
  const filas = [{ etiqueta: 'Desde 4 unidades', precio: precioBase }];
  for (const d of descuentos) {
    filas.push({ etiqueta: `Acumulando S/ ${Number(d.umbral_soles).toLocaleString('es-PE')}+`, precio: Math.max(precioBase - d.descuento_por_unidad, 0.01) });
  }
  return filas;
}

// Progreso del cliente logueado en una campaña: cuánto lleva acumulado, el descuento por
// unidad que ya tiene, y qué le falta para el siguiente escalón (siguiente_umbral viene null
// cuando ya alcanzó el escalón más alto). Usado en el panel de reserva de consolidado.js.
async function obtenerProgresoVolumenConsolidado(idConsolidado) {
  const session = await obtenerSesion();
  if (!session) return null;
  const { data, error } = await supabaseClient.rpc('progreso_volumen_consolidado', { p_id_consolidado: idConsolidado });
  if (error) throw new Error(error.message);
  return data && data[0] ? data[0] : null;
}

// Espejo en el navegador de la lógica de reservar_en_consolidado(): solo para mostrarle al
// cliente una vista previa del precio ANTES de reservar. El precio que de verdad se cobra
// siempre lo calcula el servidor otra vez (el navegador nunca manda un precio).
function estimarPrecioConsolidadoPorVolumen(precioBase, acumuladoPrevio, cantidad, descuentos) {
  const montoEstaReserva = acumuladoPrevio + precioBase * cantidad;
  const descuento = descuentos
    .filter((d) => d.umbral_soles <= montoEstaReserva)
    .reduce((max, d) => Math.max(max, d.descuento_por_unidad), 0);
  return Math.max(precioBase - descuento, 0.01);
}

async function obtenerMisReservas() {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('detalle_consolidado')
    .select('id, cantidad, precio_consolidado_aplicado, estado_item, fecha_reserva, consolidados(id, codigo_campana, estado), perfumes(slug, nombre, marca, imagen_url)')
    .eq('id_cliente', session.user.id)
    .order('fecha_reserva', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((r) => ({ ...r, ...r.perfumes, codigo_campana: r.consolidados.codigo_campana, estado_consolidado: r.consolidados.estado, id_consolidado: r.consolidados.id }));
}

/* ---------------- Carrito de Avión (consolidado) ---------------- */

// Es un carrito APARTE del de la tienda: lo que se trae por consolidado (importación por
// encargo, a precio de consolidado, con un mínimo de unidades por pedido) no se mezcla con lo
// que hay en stock. Vive en este navegador (localStorage) para que cualquiera lo arme sin
// cuenta; recién al confirmar hace falta iniciar sesión (reserva en la campaña abierta) o se
// envía por WhatsApp. Cada cambio avisa con el evento "carrito-avion" (el ícono del avión del
// encabezado y las páginas que lo muestran se actualizan solos).
const CLAVE_CARRITO_AVION = 'zadaca_carrito_avion';
const MAX_UNIDADES_AVION_POR_PERFUME = 99;

function leerCarritoAvion() {
  try {
    const items = JSON.parse(localStorage.getItem(CLAVE_CARRITO_AVION) || '[]');
    if (!Array.isArray(items)) return [];
    // Se normaliza cada línea (tipos y topes): lo guardado en el navegador no es confiable.
    return items
      .map((i) => ({
        id_producto: Math.floor(Number(i?.id_producto)),
        slug: String(i?.slug || ''),
        marca: String(i?.marca || ''),
        nombre: String(i?.nombre || ''),
        mililitros: Math.floor(Number(i?.mililitros)) || null,
        imagen_url: typeof i?.imagen_url === 'string' ? i.imagen_url : null,
        precio: Number(i?.precio) || 0,
        cantidad: Math.min(Math.floor(Number(i?.cantidad)), MAX_UNIDADES_AVION_POR_PERFUME),
      }))
      .filter((i) => i.id_producto > 0 && i.cantidad > 0);
  } catch {
    return [];
  }
}

function guardarCarritoAvion(items) {
  try {
    localStorage.setItem(CLAVE_CARRITO_AVION, JSON.stringify(items));
  } catch { /* localStorage bloqueado (modo privado, etc.): el carrito dura solo esta visita */ }
  document.dispatchEvent(new CustomEvent('carrito-avion', { detail: items }));
  return items;
}

function unidadesCarritoAvion(items = leerCarritoAvion()) {
  return items.reduce((acc, i) => acc + Number(i.cantidad), 0);
}

function totalCarritoAvion(items = leerCarritoAvion()) {
  return Math.round(items.reduce((acc, i) => acc + Number(i.cantidad) * Number(i.precio), 0) * 100) / 100;
}

// p: fila de perfumes (id, slug, marca, nombre, mililitros, imagen_url, precio_consolidado_fijo).
function agregarAlCarritoAvion(p, cantidad = 1) {
  const items = leerCarritoAvion();
  const n = Math.max(1, Math.floor(Number(cantidad) || 1));
  const existente = items.find((i) => i.id_producto === p.id);
  if (existente) {
    existente.cantidad = Math.min(existente.cantidad + n, MAX_UNIDADES_AVION_POR_PERFUME);
    existente.precio = Number(p.precio_consolidado_fijo);
  } else {
    items.push({
      id_producto: p.id,
      slug: p.slug,
      marca: p.marca,
      nombre: p.nombre,
      mililitros: p.mililitros,
      imagen_url: p.imagen_url || null,
      precio: Number(p.precio_consolidado_fijo),
      cantidad: Math.min(n, MAX_UNIDADES_AVION_POR_PERFUME),
    });
  }
  return guardarCarritoAvion(items);
}

function cambiarCantidadCarritoAvion(idProducto, cantidad) {
  const n = Math.floor(Number(cantidad) || 0);
  if (n < 1) return quitarDelCarritoAvion(idProducto);
  const items = leerCarritoAvion();
  const item = items.find((i) => i.id_producto === idProducto);
  if (item) item.cantidad = Math.min(n, MAX_UNIDADES_AVION_POR_PERFUME);
  return guardarCarritoAvion(items);
}

function quitarDelCarritoAvion(idProducto) {
  return guardarCarritoAvion(leerCarritoAvion().filter((i) => i.id_producto !== idProducto));
}

function vaciarCarritoAvion() {
  return guardarCarritoAvion([]);
}

// El carrito guarda nombre y precio del momento en que se agregó: antes de mostrarlo completo
// se vuelve a leer de la base (precio de consolidado actual, foto, nombre corregido) y se sacan
// los perfumes que el admin ya no ofrece. Devuelve también los nombres de los que se quitaron.
async function refrescarCarritoAvion() {
  const items = leerCarritoAvion();
  if (!items.length || !SUPABASE_CONFIGURADO) return { items, quitados: [] };
  const { data, error } = await supabaseClient
    .from('perfumes')
    .select('id, slug, marca, nombre, mililitros, imagen_url, precio_consolidado_fijo')
    .in('id', items.map((i) => i.id_producto))
    .eq('activo', true)
    .eq('es_decant', false);
  if (error) return { items, quitados: [] };
  const porId = new Map((data || []).map((p) => [p.id, p]));
  const quitados = [];
  const actualizados = [];
  items.forEach((i) => {
    const p = porId.get(i.id_producto);
    if (!p) { quitados.push(`${i.marca} ${i.nombre}`); return; }
    actualizados.push({ ...i, slug: p.slug, marca: p.marca, nombre: p.nombre, mililitros: p.mililitros, imagen_url: p.imagen_url || null, precio: Number(p.precio_consolidado_fijo) });
  });
  guardarCarritoAvion(actualizados);
  return { items: actualizados, quitados };
}

// Campaña que hoy recibe reservas (la que cierra primero, si hubiera más de una). Misma regla
// que consolidadoEstaAbierto() de main.js: estado Abierto y fecha de cierre sin vencer.
async function obtenerConsolidadoAbierto() {
  if (!SUPABASE_CONFIGURADO) return null;
  const { data, error } = await supabaseClient
    .from('consolidados')
    .select('*')
    .eq('estado', 'Abierto')
    .order('fecha_cierre_programada', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).find((c) => new Date(c.fecha_cierre_programada).getTime() > Date.now()) || null;
}

// Confirma TODO el Carrito de Avión en la campaña abierta de una sola vez (ver
// reservar_carrito_avion en la migración 0020: todo o nada, precio y mínimo validados en el
// servidor). Devuelve una fila por perfume con su estado (Reservado / Pendiente_Aprobacion).
async function reservarCarritoAvion(idConsolidado, items, idDireccion) {
  const session = await obtenerSesion();
  if (!session) throw new Error('Inicia sesión para confirmar tu Carrito de Avión');
  const { data, error } = await supabaseClient.rpc('reservar_carrito_avion', {
    p_id_consolidado: idConsolidado,
    p_items: items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
    p_id_direccion: idDireccion,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

// Pedido completo listo para pegar en WhatsApp (el admin lo registra tal cual en el panel →
// Pedidos → Registrar pedido → Consolidado).
function mensajeWhatsappCarritoAvion(items, { nombre, campana, minimo } = {}) {
  const lineas = items.map((i) => `• ${i.cantidad} × ${i.marca} — ${i.nombre}${i.mililitros ? ` (${i.mililitros} ml)` : ''} — ${formatoMoneda(i.precio)} c/u`);
  const unidades = unidadesCarritoAvion(items);
  const partes = [
    `Hola Maison Zadaca! Quiero hacer este pedido por CONSOLIDADO (Carrito de Avión)${campana ? ` — campaña ${campana}` : ''}:`,
    '',
    ...lineas,
    '',
    `Total: ${unidades} unidad${unidades === 1 ? '' : 'es'} — ${formatoMoneda(totalCarritoAvion(items))} (precio de consolidado referencial)`,
  ];
  if (minimo && unidades < minimo) partes.push(`(Sé que el mínimo es de ${minimo} unidades.)`);
  if (nombre) partes.push(`Mi nombre: ${nombre}`);
  partes.push('¿Me confirman disponibilidad, precio final y fecha de llegada?');
  return partes.join('\n');
}

function enlaceWhatsappCarritoAvion(items, opciones) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensajeWhatsappCarritoAvion(items, opciones))}`;
}

function minimoUnidadesConsolidado(cfg) {
  return Math.max(Number(cfg?.consolidado_minimo_unidades) || 4, 1);
}

/* ---------------- Cotizaciones ---------------- */

async function obtenerCotizaciones() {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('solicitudes_cotizacion')
    .select('*')
    .eq('id_cliente', session.user.id)
    .order('fecha_solicitud', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Abierto a visitantes sin cuenta: si hay sesión se ata el registro al cliente logueado,
// si no, se guarda con nombre_contacto/telefono_contacto (ver RLS "cotizaciones insertar").
// Pasa primero por la Edge Function "cotizacion-publica" (rate-limit real por IP); si esa
// función todavía no está desplegada (404 / error de red), cae al insert directo protegido
// por RLS, así el formulario nunca se rompe por no haber corrido `supabase functions deploy`.
async function enviarCotizacion(payload) {
  const session = await obtenerSesion();
  try {
    const { data, error } = await supabaseClient.functions.invoke('cotizacion-publica', { body: payload });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return;
  } catch (err) {
    if (err?.context?.status === 429) throw new Error('Demasiadas solicitudes. Intenta de nuevo en un rato o escríbenos por WhatsApp.');
    console.warn('cotizacion-publica no disponible, usando insert directo:', err?.message || err);
  }
  const datos = { ...payload, id_cliente: session ? session.user.id : null };
  if (!datos.id_cliente && !datos.telefono_contacto) throw new Error('Ingresa un WhatsApp de contacto');
  const { error } = await supabaseClient.from('solicitudes_cotizacion').insert(datos);
  if (error) throw new Error(error.message);
}

function enlaceWhatsappCotizacion(data) {
  const lineas = [
    'Hola! Quiero cotizar un perfume que no encontré en el catálogo:',
    '',
    `Perfume: ${data.marca_solicitada} — ${data.nombre_perfume_solicitado}`,
  ];
  if (data.concentracion) lineas.push(`Concentración: ${data.concentracion}`);
  if (data.mililitros) lineas.push(`Mililitros: ${data.mililitros}`);
  if (data.notas_cliente) lineas.push(`Notas: ${data.notas_cliente}`);
  if (data.nombre_contacto) lineas.push('', `Mi nombre: ${data.nombre_contacto}`);
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(lineas.join('\n'))}`;
}

/* ---------------- Notificaciones ---------------- */

async function obtenerNotificaciones({ limite = 20 } = {}) {
  const session = await obtenerSesion();
  if (!session) return [];
  const { data, error } = await supabaseClient
    .from('notificaciones')
    .select('*')
    .eq('id_cliente', session.user.id)
    .order('fecha_creacion', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data;
}

async function contarNotificacionesNoLeidas() {
  const session = await obtenerSesion();
  if (!session) return 0;
  const { count, error } = await supabaseClient
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('id_cliente', session.user.id)
    .eq('leido', false);
  if (error) return 0;
  return count || 0;
}

async function marcarNotificacionLeida(id) {
  const { error } = await supabaseClient.from('notificaciones').update({ leido: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function marcarTodasNotificacionesLeidas() {
  const session = await obtenerSesion();
  if (!session) return;
  const { error } = await supabaseClient.from('notificaciones').update({ leido: true }).eq('id_cliente', session.user.id).eq('leido', false);
  if (error) throw new Error(error.message);
}

// Formato legible del número de WhatsApp de la tienda (ej. "+51 990278017"), compartido entre
// contacto.js (texto del bloque de contacto) y main.js (footer de todas las páginas) para que
// no queden dos formatos distintos del mismo número.
// 51990278017 → "+51 990 278 017"
function formatoWhatsapp() {
  const n = WHATSAPP_NUMERO;
  return n.length === 11 ? `+${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`;
}

/* ---------------- Pagos por WhatsApp ---------------- */

// El pago (Yape/Plin/transferencia) se resuelve por WhatsApp: el cliente manda su
// comprobante ahí mismo y el admin lo registra en "Registrar Pago" del panel — no hay
// subida de archivos en el sitio.
function enlaceWhatsappPago({ idPedido, montoPendiente, montoTotal }) {
  const mensaje = [
    `Hola! Quiero pagar mi pedido #${idPedido}.`,
    `Saldo pendiente: ${formatoMoneda(montoPendiente)} de ${formatoMoneda(montoTotal)}.`,
    'Te mando la captura del pago apenas me confirmes los datos.',
  ].join('\n');
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

// Todavía no hay pasarela de pago en el sitio -- mientras tanto, al confirmar el pedido del
// carrito se abre WhatsApp con el detalle (qué perfumes, cuántas unidades de cada uno, y el
// monto total) para que el cliente coordine el pago directo ahí, igual que ya se hace en
// "Mis Pedidos" con enlaceWhatsappPago().
function enlaceWhatsappConfirmarPedido({ idPedido, items, montoTotal }) {
  const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0);
  const lineas = [
    `Hola! Acabo de confirmar mi pedido #${idPedido} (${totalUnidades} perfume${totalUnidades === 1 ? '' : 's'}):`,
    '',
    ...items.map((i) => `- ${i.cantidad} x ${i.marca} — ${i.nombre}`),
    '',
    `Total a pagar: ${formatoMoneda(montoTotal)}`,
    'Te mando la captura del pago apenas me confirmes los datos.',
  ];
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(lineas.join('\n'))}`;
}

/* ---------------- Contenido del sitio (FAQ y configuración editable desde admin) ---------------- */

// Promise cacheada (no solo el resultado) para que llamadas concurrentes desde distintos
// scripts en la misma página (main.js para el footer, home.js para el stat de "mínimo de
// unidades", contacto.js para el FAQ) compartan una sola consulta a Supabase en vez de una
// por cada uno.
let _configuracionSitioPromise = null;
function obtenerConfiguracionSitio() {
  if (!SUPABASE_CONFIGURADO) return Promise.resolve(null);
  if (!_configuracionSitioPromise) {
    _configuracionSitioPromise = supabaseClient
      .from('configuracion_sitio')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        return data;
      });
  }
  return _configuracionSitioPromise;
}

// Sustituye {{minimo_unidades}}, {{envio_dias}} y {{dia_cierre}} en un texto de FAQ por los
// valores reales de configuracion_sitio -- así esos 3 números solo se editan en un lugar
// (panel admin → Configuración del Sitio) aunque aparezcan repetidos en varias preguntas.
function aplicarPlaceholdersConfiguracion(texto, cfg) {
  if (!cfg) return texto;
  return texto
    .replace(/\{\{minimo_unidades\}\}/g, cfg.consolidado_minimo_unidades)
    .replace(/\{\{envio_dias\}\}/g, cfg.envio_dias_texto)
    .replace(/\{\{dia_cierre\}\}/g, cfg.consolidado_dia_cierre);
}

// Popup de publicidad del inicio (ver migración 0013) -- fila única, editable desde el panel
// admin (Publicidad). maybeSingle + swallow de error: es un adorno opcional, si la tabla no
// existe todavía (sitio sin migrar) o falla la consulta, la home no debe romperse por esto.
// Datos del anuncio SIN las fotos: las fotos pueden venir guardadas como texto dentro del anuncio
// (ver fotoAnuncioComoTexto en admin-api.js) y pesar cientos de KB, así que se piden aparte con
// obtenerFotosPublicidad() solo cuando el anuncio de verdad se va a mostrar.
async function obtenerPublicidadPopup() {
  if (!SUPABASE_CONFIGURADO) return null;
  try {
    const { data, error } = await supabaseClient.from('publicidad_popup')
      .select('id, activo, titulo, mensaje, texto_boton, url_boton, fecha_inicio, fecha_fin, actualizado_en, mostrar_en')
      .eq('id', 1).maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function obtenerFotosPublicidad() {
  try {
    const { data, error } = await supabaseClient.from('publicidad_popup').select('imagenes, imagen_url').eq('id', 1).maybeSingle();
    return error || !data ? [] : imagenesPublicidad(data);
  } catch {
    return [];
  }
}

// src seguro para una foto: un link http(s) o una foto guardada como texto (data URL de una
// imagen común; SVG no, porque puede traer código).
function fuenteImagenSegura(valor) {
  const texto = String(valor || '').trim();
  if (/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(texto)) return texto;
  return urlSegura(texto);
}

// Fotos del anuncio: la lista "imagenes" (migración 0020) o, si la base todavía no la tiene, la
// imagen única de antes.
function imagenesPublicidad(promo) {
  const lista = Array.isArray(promo?.imagenes) ? promo.imagenes.filter((u) => typeof u === 'string' && u.trim()) : [];
  if (!lista.length && promo?.imagen_url) lista.push(promo.imagen_url);
  return lista.slice(0, 8);
}

// Precarga las fotos del anuncio y devuelve solo las que cargan, en el mismo orden. Así el
// anuncio nunca sale con un cuadro vacío si una foto falta, tarda demasiado o el navegador no la
// muestra: se ve con las fotos que sí cargaron, o solo con el texto.
function fotosQueCargan(urls, msMax = 8000) {
  return Promise.all(urls.map((url) => new Promise((resolve) => {
    const img = new Image();
    const terminar = (ok) => { clearTimeout(reloj); resolve(ok ? url : null); };
    const reloj = setTimeout(() => terminar(false), msMax);
    img.onload = () => terminar(img.naturalWidth > 0);
    img.onerror = () => terminar(false);
    img.src = url;
  }))).then((lista) => lista.filter(Boolean));
}

function publicidadEnFechas(promo, ahora = new Date()) {
  if (promo.fecha_inicio && ahora < new Date(promo.fecha_inicio)) return false;
  if (promo.fecha_fin && ahora > new Date(promo.fecha_fin)) return false;
  return true;
}

function publicidadVigente(promo, ahora = new Date()) {
  if (!promo || !promo.activo) return false;
  if (!promo.titulo && !promo.mensaje && !imagenesPublicidad(promo).length) return false;
  return publicidadEnFechas(promo, ahora);
}

// Dibuja el anuncio encima de la página (lo usa main.js al cargar cualquier página y el panel
// admin para la "Vista previa"). Con varias fotos arma un carrusel: flechas, puntos, deslizar
// con el dedo y avance automático (salvo "reducir movimiento"). Se cierra con la X, tocando
// afuera o con Escape; alCerrar() se llama una sola vez (también si se toca el botón del anuncio).
const ANUNCIO_ANCHO_MAX = 1200;

function mostrarPublicidadPopup(promo, { alCerrar } = {}) {
  document.querySelector('.promo-popup-overlay')?.remove();
  const imagenes = imagenesPublicidad(promo).map(fuenteImagenSegura).filter(Boolean);
  const varias = imagenes.length > 1;
  const enlaceBoton = promo.texto_boton && promo.url_boton ? urlSegura(promo.url_boton) : null;
  const overlay = document.createElement('div');
  overlay.className = 'promo-popup-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', promo.titulo || 'Anuncio');
  overlay.innerHTML = `
    <div class="promo-popup-box${imagenes.length ? ' con-fotos' : ''}">
      <button type="button" class="promo-popup-close" aria-label="Cerrar anuncio">&times;</button>
      ${imagenes.length ? `
      <div class="promo-carrusel">
        <div class="promo-track">
          ${imagenes.map((u, i) => `<div class="promo-slide"><img src="${escapeHtml(u)}" alt="${escapeHtml(promo.titulo || 'Anuncio')}${varias ? ` (${i + 1} de ${imagenes.length})` : ''}" ${i ? 'loading="lazy"' : ''} /></div>`).join('')}
        </div>
        ${varias ? `
        <button type="button" class="promo-nav promo-prev" aria-label="Foto anterior">&#8249;</button>
        <button type="button" class="promo-nav promo-next" aria-label="Foto siguiente">&#8250;</button>
        <div class="promo-dots">${imagenes.map((_, i) => `<button type="button" class="promo-dot${i ? '' : ' active'}" data-i="${i}" aria-label="Ver foto ${i + 1}"></button>`).join('')}</div>` : ''}
      </div>` : ''}
      ${promo.titulo || promo.mensaje || enlaceBoton ? `
      <div class="promo-popup-body">
        ${promo.titulo ? `<h3>${escapeHtml(promo.titulo)}</h3>` : ''}
        ${promo.mensaje ? `<p>${escapeHtml(promo.mensaje)}</p>` : ''}
        ${enlaceBoton ? `<a class="btn btn-primary" href="${escapeHtml(enlaceBoton)}">${escapeHtml(promo.texto_boton)}</a>` : ''}
      </div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('popup-abierto');

  // Tamaño adaptativo: la caja toma la forma de la portada (sin franjas vacías) y crece hasta
  // donde entra en la pantalla: grande en computadora, a todo el ancho en celular y, con el
  // celular echado, foto y texto lado a lado. Se recalcula si cambia el tamaño de la ventana.
  const caja = overlay.querySelector('.promo-popup-box');
  const carrusel = overlay.querySelector('.promo-carrusel');
  const cuerpo = overlay.querySelector('.promo-popup-body');
  let proporcion = 0;
  function ajustarTamano() {
    if (!carrusel || !proporcion) return;
    const estilo = getComputedStyle(overlay);
    const anchoDisp = overlay.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    // Se descuenta el borde de la caja (y 2 px de margen por redondeo) para que nunca aparezca scroll.
    const altoDisp = overlay.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) - (caja.offsetHeight - caja.clientHeight) - 2;
    const ladoALado = !!cuerpo && window.innerHeight <= 560 && window.innerWidth > window.innerHeight;
    caja.classList.add('ajustado');
    caja.classList.toggle('lado-a-lado', ladoALado);
    let altoFoto;
    if (ladoALado) {
      const anchoTexto = Math.min(320, anchoDisp * 0.42);
      const anchoFoto = Math.min(anchoDisp - anchoTexto, altoDisp * proporcion);
      altoFoto = Math.min(altoDisp, anchoFoto / proporcion);
      carrusel.style.width = `${anchoFoto}px`;
      caja.style.width = `${anchoFoto + anchoTexto}px`;
    } else {
      carrusel.style.width = '';
      // El alto del texto depende del ancho (cuántas líneas ocupa): se mide dos veces.
      let ancho = Math.min(anchoDisp, ANUNCIO_ANCHO_MAX);
      for (let vuelta = 0; vuelta < 2; vuelta++) {
        caja.style.width = `${ancho}px`;
        const altoTexto = cuerpo ? cuerpo.offsetHeight : 0;
        ancho = Math.max(Math.min(anchoDisp, 300), Math.min(anchoDisp, ANUNCIO_ANCHO_MAX, (altoDisp - altoTexto) * proporcion));
      }
      caja.style.width = `${ancho}px`;
      altoFoto = Math.max(160, Math.min(ancho / proporcion, altoDisp - (cuerpo ? cuerpo.offsetHeight : 0)));
    }
    carrusel.style.setProperty('--alto-foto', `${Math.round(altoFoto)}px`);
  }
  const portada = overlay.querySelector('.promo-slide img');
  const medirPortada = () => {
    if (!portada?.naturalWidth) return;
    // Fotos extremas (muy altas o muy anchas) se limitan y se muestran completas dentro.
    proporcion = Math.min(2.4, Math.max(0.5, portada.naturalWidth / portada.naturalHeight));
    ajustarTamano();
  };
  if (portada) {
    if (portada.complete) medirPortada();
    else portada.addEventListener('load', medirPortada, { once: true });
  }
  window.addEventListener('resize', ajustarTamano);

  const focoAnterior = document.activeElement;
  const cerrarBtn = overlay.querySelector('.promo-popup-close');
  cerrarBtn.focus({ preventScroll: true });

  let actual = 0;
  let temporizador = null;
  const track = overlay.querySelector('.promo-track');
  const ir = (i) => {
    if (!track) return;
    actual = (i + imagenes.length) % imagenes.length;
    track.style.transform = `translateX(-${actual * 100}%)`;
    overlay.querySelectorAll('.promo-dot').forEach((d, n) => d.classList.toggle('active', n === actual));
  };
  const detenerAuto = () => { clearInterval(temporizador); temporizador = null; };
  if (varias) {
    overlay.querySelector('.promo-prev').addEventListener('click', () => { detenerAuto(); ir(actual - 1); });
    overlay.querySelector('.promo-next').addEventListener('click', () => { detenerAuto(); ir(actual + 1); });
    overlay.querySelectorAll('.promo-dot').forEach((d) => d.addEventListener('click', () => { detenerAuto(); ir(Number(d.dataset.i)); }));
    let inicioX = null;
    track.addEventListener('touchstart', (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (inicioX === null) return;
      const dx = e.changedTouches[0].clientX - inicioX;
      inicioX = null;
      if (Math.abs(dx) > 40) { detenerAuto(); ir(actual + (dx < 0 ? 1 : -1)); }
    });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) temporizador = setInterval(() => ir(actual + 1), 5000);
  }

  let cerrado = false;
  let avisado = false;
  const avisar = () => { if (!avisado && alCerrar) { avisado = true; alCerrar(); } };
  function alEscapar(e) {
    if (e.key === 'Escape') cerrar();
    if (varias && e.key === 'ArrowRight') { detenerAuto(); ir(actual + 1); }
    if (varias && e.key === 'ArrowLeft') { detenerAuto(); ir(actual - 1); }
  }
  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    detenerAuto();
    window.removeEventListener('resize', ajustarTamano);
    overlay.remove();
    document.body.classList.remove('popup-abierto');
    document.removeEventListener('keydown', alEscapar);
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus({ preventScroll: true });
    avisar();
  }
  cerrarBtn.addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.promo-popup-body .btn')?.addEventListener('click', avisar);
  document.addEventListener('keydown', alEscapar);
  return cerrar;
}

async function obtenerPreguntasFrecuentes() {
  const [{ data, error }, cfg] = await Promise.all([
    supabaseClient.from('preguntas_frecuentes').select('pregunta, respuesta').eq('activo', true).order('orden', { ascending: true }),
    obtenerConfiguracionSitio(),
  ]);
  if (error) throw new Error(error.message);
  return data.map((p) => ({ ...p, respuesta: aplicarPlaceholdersConfiguracion(p.respuesta, cfg) }));
}

/* ---------------- Newsletter ---------------- */

async function suscribirNewsletter(correo) {
  const { error } = await supabaseClient.from('newsletter_suscriptores').insert({ correo });
  if (error) throw new Error(error.message.includes('duplicate') ? 'Ese correo ya está suscrito' : error.message);
}

/* ---------------- Utilidades UI ---------------- */

function formatoMoneda(valor) {
  const n = Number(valor);
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Redondeado a 2 decimales por unidad -- crear_pedido_directo (schema.sql) hace exactamente
// este mismo round(precio, 2) por ítem ANTES de multiplicar por cantidad. Sin este redondeo
// acá, el total que el cliente ve en el carrito podía quedar unos centavos distinto del
// monto_total real del pedido que se crea al hacer checkout (se nota más con cantidad > 1).
function precioFinal(precioRegular, descuentoPorcentaje) {
  return Math.round(Number(precioRegular) * (1 - Number(descuentoPorcentaje || 0) / 100) * 100) / 100;
}

// Precio de un decant según la talla elegida (3/5/10 ml, ver migración 0016) -- null si esa
// talla no tiene precio cargado (no se vende en esa presentación) o si tallaMl no es una de
// las 3 válidas. Mismo cálculo que usa crear_pedido_directo() en el servidor.
function precioTallaDecant(p, tallaMl) {
  if (tallaMl === 3) return p.precio_3ml != null ? Number(p.precio_3ml) : null;
  if (tallaMl === 5) return p.precio_5ml != null ? Number(p.precio_5ml) : null;
  if (tallaMl === 10) return p.precio_10ml != null ? Number(p.precio_10ml) : null;
  return null;
}

// Tallas que un decant realmente vende (las que tienen precio cargado), ordenadas de menor a
// mayor -- usado tanto por el selector de tamaño de la ficha de producto como por la tarjeta
// del catálogo ("Desde S/X").
function tallasDecant(p) {
  return [3, 5, 10].filter((t) => precioTallaDecant(p, t) != null);
}

// Escapa también comillas: el resultado se usa tanto dentro de etiquetas como dentro de
// atributos (value="...", data-*="...", title="..."). Sin escapar " y ', un dato escrito por un
// cliente (nombre, dirección...) podía cerrar el atributo e inyectar código en el panel admin.
function escapeHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL segura para un href/src armado con datos: solo http(s) (o rutas del propio sitio, que se
// resuelven contra SITE_ROOT). Cualquier otra cosa (javascript:, data:, texto inválido) → null.
function urlSegura(valor) {
  try {
    const u = new URL(String(valor || '').trim(), SITE_ROOT);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function mostrarToast(mensaje, tipo = 'ok') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'error' ? 'error' : ''}`;
  toast.textContent = mensaje;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}
