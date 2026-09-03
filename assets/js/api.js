const WHATSAPP_NUMERO = '51990278017';

// Cada página vive ahora en su propia carpeta (cuenta/, catalogo/, etc. en vez de cuenta.html,
// catalogo.html) a distintas profundidades, así que un link relativo simple ("catalogo.html")
// ya no apunta al mismo lugar desde todas partes. Se usa esta base absoluta para toda la
// navegación interna generada por JS, y también para resolver imágenes con ruta relativa que
// vienen de la base de datos (columna imagen_url, ej. "assets/img/perfumes/x.jpg") y las URLs
// de notificaciones (columna url_destino, ver supabase/migrations/0009_urls_limpias.sql).
const SITE_ROOT = 'https://madisonzadaca.com/';

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
const CAMPOS_PRODUCTO_PUBLICO = 'id, slug, nombre, marca, genero, familia_olfativa, concentracion, mililitros, descripcion, notas_olfativas, precio_tienda_regular, descuento_tienda_porcentaje, precio_consolidado_fijo, estado, es_nuevo, es_bestseller, imagen_url, es_liquidacion, precio_liquidacion, liquidacion_unidad_minima, tipo_casa, es_decant, id_decant_grupo';

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

async function obtenerProductos({ genero, marca, familia, tipo_casa, busqueda, destacado, orden, pagina = 1, porPagina = 12, soloConStock = false } = {}) {
  let query = supabaseClient
    .from('perfumes')
    .select(soloConStock ? `${CAMPOS_PRODUCTO_PUBLICO}, inventario!inner(stock_disponible)` : `${CAMPOS_PRODUCTO_PUBLICO}, inventario(stock_disponible)`, { count: 'exact' })
    .eq('activo', true);

  if (soloConStock) query = query.gt('inventario.stock_disponible', 0);
  query = aplicarFiltroGenero(query, genero);
  if (marca) query = query.eq('marca', marca);
  if (familia) query = query.eq('familia_olfativa', familia);
  if (tipo_casa) query = query.eq('tipo_casa', tipo_casa);
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);
  if (destacado === 'nuevo') query = query.eq('es_nuevo', true);
  if (destacado === 'bestseller') query = query.eq('es_bestseller', true);
  if (destacado === 'liquidacion') query = query.eq('es_liquidacion', true);
  // Decants: cada tamaño (3ml/5ml/10ml...) es su propia fila de perfumes, agrupada bajo una
  // fila "raíz" (id_decant_grupo is null) -- el catálogo de tienda normal nunca los muestra
  // (viven en su propia sección, ver decants/index.html), y esa sección solo lista las raíces
  // para no repetir el mismo perfume una vez por tamaño.
  if (destacado === 'decant') query = query.eq('es_decant', true).is('id_decant_grupo', null);
  else query = query.eq('es_decant', false);

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
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);

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

async function obtenerFiltrosCatalogo() {
  // es_decant=false: los decants viven en su propia sección (ver destacado: 'decant' en
  // obtenerProductos()), así que una marca que solo tenga decants no debe aparecer como
  // opción de filtro acá -- si apareciera, filtrar por ella daría 0 resultados.
  // Trae también el stock (join a inventario) en la misma consulta: de acá salen tanto el
  // conteo por marca ("Dior (39)") como el conteo de disponibilidad ("En stock" / "Todos"),
  // sin necesitar una consulta aparte para cada uno.
  const { data: filasData } = await supabaseClient
    .from('perfumes')
    .select('marca, familia_olfativa, inventario(stock_disponible)')
    .eq('activo', true)
    .eq('es_decant', false);

  const filas = (filasData || []).map((r) => ({
    marca: r.marca,
    familia_olfativa: r.familia_olfativa,
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
  return { marcas, familias, conteoMarcas, disponibilidad: { enStock, agotado: filas.length - enStock } };
}

// A diferencia de marca/familia (que salen de los datos reales), tipo_casa es un vocabulario
// fijo — ver constraint chk_perfumes_tipo_casa en schema.sql — así que no hace falta una
// consulta aparte para listar sus valores posibles.
const TIPOS_CASA = ['Árabe', 'Diseñador', 'Nicho'];

// Sugerencias del buscador en vivo del catálogo (dropdown mientras se escribe). Trae pocos
// campos y un límite bajo porque se dispara en cada tecleo (con debounce) — a diferencia de
// obtenerProductos(), que trae la página completa con paginación.
async function obtenerSugerenciasBusqueda(texto, limite = 6, soloConStock = false) {
  const q = (texto || '').trim();
  if (!q) return [];
  const campos = 'slug, nombre, marca, imagen_url, precio_tienda_regular, descuento_tienda_porcentaje, precio_consolidado_fijo';
  let query = supabaseClient
    .from('perfumes')
    .select(soloConStock ? `${campos}, inventario!inner(stock_disponible)` : campos)
    .eq('activo', true)
    .eq('es_decant', false)
    .or(`nombre.ilike.%${escaparFiltroSupabase(q)}%,marca.ilike.%${escaparFiltroSupabase(q)}%`)
    .order('nombre', { ascending: true })
    .limit(limite);
  if (soloConStock) query = query.gt('inventario.stock_disponible', 0);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

async function obtenerProductoPorSlug(slug) {
  const { data: producto, error } = await supabaseClient
    .from('perfumes')
    .select(`${CAMPOS_PRODUCTO_PUBLICO}, inventario(stock_disponible)`)
    .eq('slug', slug)
    .eq('activo', true)
    .single();
  if (error || !producto) throw new Error('Producto no encontrado');

  // Decants: la raíz (id_decant_grupo null) y sus tamaños hijos (id_decant_grupo = id de la
  // raíz) se muestran juntos como pastillas de tamaño en la misma ficha -- ver producto.js.
  const idRaiz = producto.es_decant ? (producto.id_decant_grupo || producto.id) : null;

  // Tamaños del decant y "también te puede interesar" son dos consultas que no dependen una de
  // la otra (recién se combinan al final, para no repetir un tamaño como "relacionado") -- se
  // disparan en paralelo en vez de una detrás de la otra, para no sumar un viaje de red más
  // antes de que la ficha del producto esté completa.
  //
  // Un decant "también te puede interesar" debe ofrecer OTROS decants con stock real -- antes
  // filtraba solo por marca igual que un perfume normal, así que en la ficha de un decant
  // podían salir botellas completas, sets, o productos agotados de la misma marca (nada que
  // ver con "prueba antes de comprar", la lógica de decants). Reutiliza obtenerProductos() con
  // el mismo filtro que ya usa decants/index.html (destacado:'decant' + soloConStock) en vez
  // de duplicar esa consulta acá.
  const [tamanosData, relacionadosCrudos] = await Promise.all([
    idRaiz
      ? supabaseClient
          .from('perfumes')
          .select(`${CAMPOS_PRODUCTO_PUBLICO}, inventario(stock_disponible)`)
          .eq('activo', true)
          .eq('es_decant', true)
          .or(`id.eq.${idRaiz},id_decant_grupo.eq.${idRaiz}`)
          .order('mililitros', { ascending: true })
          .then(({ data }) => data)
      : Promise.resolve(null),
    producto.es_decant
      ? obtenerProductos({ destacado: 'decant', soloConStock: true, orden: 'recientes', porPagina: 8 }).then(({ productos }) => productos)
      : supabaseClient
          .from('perfumes')
          .select('id, slug, nombre, marca, genero, precio_tienda_regular, descuento_tienda_porcentaje, imagen_url, estado')
          .eq('marca', producto.marca)
          .eq('activo', true)
          .neq('id', producto.id)
          .limit(8)
          .then(({ data }) => data),
  ]);
  const tamanosDecant = (tamanosData || []).map(normalizarProducto);

  // Los otros tamaños del mismo decant ya se muestran como pastillas de tamaño arriba -- no
  // tiene sentido repetirlos acá abajo como "también te puede interesar".
  const idsPropioGrupoDecant = new Set(tamanosDecant.map((t) => t.id));
  const relacionados = (relacionadosCrudos || []).filter((r) => !idsPropioGrupoDecant.has(r.id)).slice(0, 4);

  return {
    producto: normalizarProducto(producto),
    relacionados,
    tamanosDecant,
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
    .select('id, slug, nombre, marca, genero, mililitros, precio_tienda_regular, descuento_tienda_porcentaje, es_liquidacion, precio_liquidacion, liquidacion_unidad_minima, imagen_url, inventario(stock_disponible)')
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
      return {
        ...p,
        id: `invitado-${p.id}`,
        cantidad: i.cantidad,
        stock_disponible: Math.max(Array.isArray(p.inventario) ? (p.inventario[0]?.stock_disponible ?? 0) : (p.inventario?.stock_disponible ?? 0), 0),
      };
    });
}

function idProductoDesdeItemCarrito(idItem) {
  return Number(String(idItem).replace('invitado-', ''));
}

async function obtenerCarrito() {
  const session = await obtenerSesion();
  if (!session) return obtenerCarritoInvitado();
  const { data, error } = await supabaseClient
    .from('carrito_items')
    .select('id, cantidad, perfumes(id, slug, nombre, marca, genero, mililitros, precio_tienda_regular, descuento_tienda_porcentaje, es_liquidacion, precio_liquidacion, liquidacion_unidad_minima, imagen_url, inventario(stock_disponible))')
    .eq('id_cliente', session.user.id)
    .order('fecha_agregado', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((item) => ({
    id: item.id,
    cantidad: item.cantidad,
    ...item.perfumes,
    stock_disponible: Math.max(item.perfumes.inventario?.[0]?.stock_disponible ?? item.perfumes.inventario?.stock_disponible ?? 0, 0),
  }));
}

async function agregarAlCarrito(idProducto, cantidad = 1) {
  const session = await obtenerSesion();
  if (!session) {
    const items = leerCarritoInvitado();
    const existente = items.find((i) => i.id_producto === idProducto);
    if (existente) existente.cantidad += cantidad;
    else items.push({ id_producto: idProducto, cantidad });
    guardarCarritoInvitado(items);
    return;
  }
  const { data: existente } = await supabaseClient
    .from('carrito_items')
    .select('id, cantidad')
    .eq('id_cliente', session.user.id)
    .eq('id_producto', idProducto)
    .maybeSingle();

  if (existente) {
    const { error } = await supabaseClient.from('carrito_items').update({ cantidad: existente.cantidad + cantidad }).eq('id', existente.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseClient.from('carrito_items').insert({ id_cliente: session.user.id, id_producto: idProducto, cantidad });
    if (error) throw new Error(error.message);
  }
}

async function actualizarCantidadCarrito(idItem, cantidad) {
  const session = await obtenerSesion();
  if (!session) {
    const items = leerCarritoInvitado();
    const item = items.find((i) => i.id_producto === idProductoDesdeItemCarrito(idItem));
    if (item) { item.cantidad = cantidad; guardarCarritoInvitado(items); }
    return;
  }
  const { error } = await supabaseClient.from('carrito_items').update({ cantidad }).eq('id', idItem);
  if (error) throw new Error(error.message);
}

async function eliminarDelCarrito(idItem) {
  const session = await obtenerSesion();
  if (!session) {
    guardarCarritoInvitado(leerCarritoInvitado().filter((i) => i.id_producto !== idProductoDesdeItemCarrito(idItem)));
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
      const { data: existente } = await supabaseClient
        .from('carrito_items')
        .select('id, cantidad')
        .eq('id_cliente', session.user.id)
        .eq('id_producto', item.id_producto)
        .maybeSingle();
      if (existente) {
        await supabaseClient.from('carrito_items').update({ cantidad: existente.cantidad + item.cantidad }).eq('id', existente.id);
      } else {
        await supabaseClient.from('carrito_items').insert({ id_cliente: session.user.id, id_producto: item.id_producto, cantidad: item.cantidad });
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
    .select('id, tipo_pedido, monto_total, estado_pago, fecha_creacion, envios(estado_envio, numero_guia_seguimiento)')
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
    .select('cantidad, precio_unitario_aplicado, subtotal, perfumes(nombre, marca, imagen_url, slug)')
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
    items: (items || []).map((i) => ({ ...i, ...i.perfumes })),
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

// El precio se calcula del lado del servidor (ver reservar_en_consolidado en schema.sql):
// el cliente nunca manda el precio, así no hay forma de manipular a cuánto se reserva. La
// función también valida ahí mismo que la campaña siga dentro de su fecha límite y que la
// dirección sea del cliente que llama.
// Devuelve el estado_item resultante (no solo el id): si esa fila llegó a 10 unidades o más
// del mismo perfume, el servidor la deja en 'Pendiente_Aprobacion' en vez de 'Reservado' (ver
// migración 0006) — consolidado.js usa esto para avisarle al cliente que su reserva no se
// perdió, solo está esperando que el admin la confirme.
async function reservarEnConsolidado(idConsolidado, idProducto, cantidad, idDireccion) {
  const session = await obtenerSesion();
  if (!session) throw new Error('Debes iniciar sesión');
  const { data: idDetalle, error } = await supabaseClient.rpc('reservar_en_consolidado', {
    p_id_consolidado: idConsolidado,
    p_id_producto: idProducto,
    p_cantidad: cantidad,
    p_id_direccion: idDireccion,
  });
  if (error) throw new Error(error.message);
  const { data: detalle } = await supabaseClient.from('detalle_consolidado').select('estado_item').eq('id', idDetalle).single();
  return detalle?.estado_item || 'Reservado';
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
function formatoWhatsapp() {
  return `+${WHATSAPP_NUMERO.slice(0, 2)} ${WHATSAPP_NUMERO.slice(2)}`;
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
async function obtenerPublicidadPopup() {
  if (!SUPABASE_CONFIGURADO) return null;
  try {
    const { data, error } = await supabaseClient.from('publicidad_popup').select('*').eq('id', 1).maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
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

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
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
