const WHATSAPP_NUMERO = '51990278017';

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

async function registrarUsuario({ nombres, apellidos, dni_ce_ruc, telefono, correo, contrasena }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: correo,
    password: contrasena,
    options: { data: { nombres, apellidos, dni_ce_ruc, telefono } },
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
  window.location.href = 'index.html';
}

function traducirErrorAuth(error) {
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese correo';
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
  return msg || 'Ocurrió un error inesperado';
}

function irALoginConRetorno() {
  const destino = window.location.pathname.split('/').pop() + window.location.search;
  window.location.href = `cuenta.html?retorno=${encodeURIComponent(destino)}`;
}

/* ---------------- Catálogo ---------------- */

// Los filtros .or()/.ilike() de PostgREST usan coma y paréntesis como sintaxis propia — si el
// cliente escribe "Dior, Sauvage" o "Sauvage (100ml)" en el buscador, esos caracteres cortarían
// el filtro en vez de buscarse como texto literal. Se escapan con backslash antes de armar la
// query (ver docs de PostgREST: https://postgrest.org/en/stable/references/api/tables_views.html#operators).
function escaparFiltroSupabase(texto) {
  return String(texto).replace(/[,()]/g, (c) => `\\${c}`);
}

// soloConStock=true es el catálogo de TIENDA FÍSICA: solo perfumes con stock_fisico > 0 (lo
// que el admin cargó en "Stock físico" por producto). Usa !inner para forzar el join con
// inventario, así el .gt() puede filtrar filas del catálogo, no solo del inventario embebido
// (con left join normal, un perfume sin stock igual aparecería con inventario: null).
// soloConStock=false (por default) es el comportamiento de siempre: todo el catálogo, sin
// mirar stock — lo usa el buscador de consolidado.js, porque una reserva de consolidado se
// importa bajo pedido y no depende de lo que haya físicamente en la tienda ahora mismo.
async function obtenerProductos({ genero, marca, familia, tipo_casa, busqueda, destacado, orden, pagina = 1, porPagina = 12, soloConStock = false } = {}) {
  let query = supabaseClient
    .from('perfumes')
    .select(soloConStock ? '*, inventario!inner(stock_disponible)' : '*, inventario(stock_disponible)', { count: 'exact' })
    .eq('activo', true);

  if (soloConStock) query = query.gt('inventario.stock_disponible', 0);
  if (genero) query = query.eq('genero', genero);
  if (marca) query = query.eq('marca', marca);
  if (familia) query = query.eq('familia_olfativa', familia);
  if (tipo_casa) query = query.eq('tipo_casa', tipo_casa);
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);
  if (destacado === 'nuevo') query = query.eq('es_nuevo', true);
  if (destacado === 'bestseller') query = query.eq('es_bestseller', true);
  if (destacado === 'liquidacion') query = query.eq('es_liquidacion', true);

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
  let query = supabaseClient.from('perfumes').select('*', { count: 'exact' }).eq('activo', true);

  if (genero) query = query.eq('genero', genero);
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
  const { data: marcasData } = await supabaseClient.from('perfumes').select('marca').eq('activo', true);
  const { data: familiasData } = await supabaseClient.from('perfumes').select('familia_olfativa').eq('activo', true).not('familia_olfativa', 'is', null);
  const marcas = [...new Set((marcasData || []).map((r) => r.marca))].sort();
  const familias = [...new Set((familiasData || []).map((r) => r.familia_olfativa))].sort();
  return { marcas, familias };
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
    .select('*, inventario(stock_disponible)')
    .eq('slug', slug)
    .eq('activo', true)
    .single();
  if (error || !producto) throw new Error('Producto no encontrado');

  const { data: resenas } = await supabaseClient
    .from('resenas')
    .select('calificacion, comentario, fecha_creacion, perfiles(nombres)')
    .eq('id_producto', producto.id)
    .eq('aprobado', true)
    .order('fecha_creacion', { ascending: false });

  const { data: relacionados } = await supabaseClient
    .from('perfumes')
    .select('slug, nombre, marca, genero, precio_tienda_regular, descuento_tienda_porcentaje, imagen_url, estado')
    .eq('marca', producto.marca)
    .eq('activo', true)
    .neq('id', producto.id)
    .limit(4);

  const resenasNormalizadas = (resenas || []).map((r) => ({ ...r, nombres: r.perfiles?.nombres || 'Cliente' }));
  const promedio = resenasNormalizadas.length
    ? resenasNormalizadas.reduce((acc, r) => acc + r.calificacion, 0) / resenasNormalizadas.length
    : null;

  return {
    producto: normalizarProducto(producto),
    resenas: resenasNormalizadas,
    calificacionPromedio: promedio,
    relacionados: relacionados || [],
  };
}

async function enviarResena({ id_producto, calificacion, comentario }) {
  const session = await obtenerSesion();
  if (!session) throw new Error('Debes iniciar sesión');
  const { error } = await supabaseClient.from('resenas').insert({
    id_cliente: session.user.id,
    id_producto,
    calificacion,
    comentario,
  });
  if (error) throw new Error(error.message);
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

async function obtenerCarrito() {
  const session = await obtenerSesion();
  if (!session) return [];
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
  if (!session) return irALoginConRetorno();
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
  const { error } = await supabaseClient.from('carrito_items').update({ cantidad }).eq('id', idItem);
  if (error) throw new Error(error.message);
}

async function eliminarDelCarrito(idItem) {
  const { error } = await supabaseClient.from('carrito_items').delete().eq('id', idItem);
  if (error) throw new Error(error.message);
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
  const { error } = await supabaseClient.from('direcciones_cliente').insert({ ...direccion, id_cliente: session.user.id });
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''));
  return data;
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
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''));
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

function precioFinal(precioRegular, descuentoPorcentaje) {
  return Number(precioRegular) * (1 - Number(descuentoPorcentaje || 0) / 100);
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
