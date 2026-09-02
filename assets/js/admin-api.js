/* ================= AUTENTICACIÓN ADMIN ================= */

async function obtenerPerfilAdmin() {
  const session = await obtenerSesion();
  if (!session) return null;
  const perfil = await obtenerPerfilActual();
  if (!perfil || perfil.rol !== 'Admin') return null;
  return perfil;
}

/* ================= DASHBOARD ================= */

async function obtenerEstadisticasDashboard() {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - 7);

  // Estas cuentan solo pedidos de Tienda Directa (mismo alcance que la sección "Pedidos —
  // Tienda Directa"): si sumaran también los de Consolidado, el número no cuadraría con lo
  // que el admin ve al hacer clic en "Ver todos" desde acá.
  const [pedidos, pedidosHoy, pagosSemana, pedidosPorConfirmar, consolidados, reservasPendientes, cotizacionesPendientes, resenasPendientes, stockBajo, productosSinMargen] = await Promise.all([
    supabaseClient.from('pedidos').select('monto_adelanto_pagado', { count: 'exact' }).eq('tipo_pedido', 'Directo_Tienda'),
    supabaseClient.from('pedidos').select('id', { count: 'exact', head: true }).eq('tipo_pedido', 'Directo_Tienda').gte('fecha_creacion', inicioHoy.toISOString()),
    supabaseClient.from('pagos').select('monto').eq('estado_pago', 'Aprobado').gte('fecha_pago', inicioSemana.toISOString()),
    supabaseClient.from('pedidos').select('id', { count: 'exact', head: true }).eq('tipo_pedido', 'Directo_Tienda').in('estado_pago', ['Pendiente', 'Parcial']),
    supabaseClient.from('consolidados').select('id', { count: 'exact' }).eq('estado', 'Abierto'),
    supabaseClient.from('detalle_consolidado').select('id', { count: 'exact' }).eq('estado_item', 'Reservado'),
    supabaseClient.from('solicitudes_cotizacion').select('id', { count: 'exact' }).eq('estado', 'Pendiente'),
    supabaseClient.from('resenas').select('id', { count: 'exact' }).eq('aprobado', false),
    supabaseClient.from('inventario').select('id_producto, stock_fisico, stock_minimo_alerta'),
    supabaseClient.from('perfumes').select('id', { count: 'exact' }).eq('margen_aplicado', false),
  ]);

  // Suma lo realmente cobrado (monto_adelanto_pagado), no monto_total filtrado a "Completado"
  // -- así los pedidos con pago Parcial también aportan al total en vez de contar como 0 (ver
  // el mismo criterio ya usado en obtenerContabilidadConsolidado más abajo).
  const ingresos = (pedidos.data || []).reduce((acc, p) => acc + Number(p.monto_adelanto_pagado || 0), 0);

  const ingresosSemana = (pagosSemana.data || []).reduce((acc, p) => acc + Number(p.monto), 0);

  const productosStockBajo = (stockBajo.data || []).filter((i) => i.stock_fisico <= i.stock_minimo_alerta).length;

  return {
    totalPedidos: pedidos.count || 0,
    ingresos,
    pedidosHoy: pedidosHoy.count || 0,
    ingresosSemana,
    pedidosPorConfirmar: pedidosPorConfirmar.count || 0,
    consolidadosAbiertos: consolidados.count || 0,
    reservasPendientes: reservasPendientes.count || 0,
    cotizacionesPendientes: cotizacionesPendientes.count || 0,
    resenasPendientes: resenasPendientes.count || 0,
    productosStockBajo,
    productosSinMargen: productosSinMargen.count || 0,
  };
}

async function obtenerUltimosPedidosDashboard(limite = 5) {
  const { data, error } = await supabaseClient
    .from('pedidos')
    .select('id, monto_total, estado_pago, fecha_creacion, perfiles(nombres, apellidos)')
    .eq('tipo_pedido', 'Directo_Tienda')
    .order('fecha_creacion', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data.map((p) => ({ ...p, cliente: p.perfiles ? `${p.perfiles.nombres} ${p.perfiles.apellidos}`.trim() : '—' }));
}

async function obtenerStockBajoDashboard(limite = 5) {
  const { data, error } = await supabaseClient
    .from('inventario')
    .select('stock_fisico, stock_minimo_alerta, perfumes(id, nombre, marca)')
    .order('stock_fisico', { ascending: true });
  if (error) throw new Error(error.message);
  return data
    .filter((i) => i.perfumes && i.stock_fisico <= i.stock_minimo_alerta)
    .slice(0, limite)
    .map((i) => ({ id: i.perfumes.id, nombre: i.perfumes.nombre, marca: i.perfumes.marca, stock: i.stock_fisico }));
}

/* ================= DASHBOARD: TENDENCIAS Y GRÁFICOS ================= */

// Ingresos cobrados (pagos Aprobados) y pedidos creados por día, últimos "dias" días -- arma
// la serie completa en JS porque PostgREST no agrupa por fecha del lado del servidor. Mismo
// alcance "Tienda Directa" que el resto del dashboard (ver obtenerEstadisticasDashboard).
async function obtenerTendenciaVentas(dias = 14) {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (dias - 1));

  const [{ data: pagos, error: e1 }, { data: pedidos, error: e2 }] = await Promise.all([
    supabaseClient.from('pagos').select('monto, fecha_pago').eq('estado_pago', 'Aprobado').gte('fecha_pago', desde.toISOString()),
    supabaseClient.from('pedidos').select('id, fecha_creacion').eq('tipo_pedido', 'Directo_Tienda').gte('fecha_creacion', desde.toISOString()),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const claveDia = (fecha) => new Date(fecha).toISOString().slice(0, 10);
  const ingresosPorDia = new Map();
  (pagos || []).forEach((p) => ingresosPorDia.set(claveDia(p.fecha_pago), (ingresosPorDia.get(claveDia(p.fecha_pago)) || 0) + Number(p.monto)));
  const pedidosPorDia = new Map();
  (pedidos || []).forEach((p) => pedidosPorDia.set(claveDia(p.fecha_creacion), (pedidosPorDia.get(claveDia(p.fecha_creacion)) || 0) + 1));

  const serie = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    const clave = claveDia(d);
    serie.push({
      etiqueta: d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
      ingresos: ingresosPorDia.get(clave) || 0,
      pedidos: pedidosPorDia.get(clave) || 0,
    });
  }
  return serie;
}

// Composición del catálogo visible (activo, sin decants -- mismo universo que ve un cliente en
// el catálogo/consolidado) por tipo de casa y por género. tipo_casa null se agrupa en "Sin
// definir" -- así el admin ve de un vistazo cuánto le falta por clasificar.
async function obtenerComposicionCatalogo() {
  const { data, error } = await supabaseClient.from('perfumes').select('genero, tipo_casa').eq('activo', true).eq('es_decant', false);
  if (error) throw new Error(error.message);
  const porGenero = new Map();
  const porCasa = new Map();
  (data || []).forEach((p) => {
    porGenero.set(p.genero, (porGenero.get(p.genero) || 0) + 1);
    const casa = p.tipo_casa || 'Sin definir';
    porCasa.set(casa, (porCasa.get(casa) || 0) + 1);
  });
  return { porGenero: [...porGenero.entries()], porCasa: [...porCasa.entries()] };
}

// Ranking de perfumes más vendidos por unidades, solo pedidos de Tienda Directa (mismo alcance
// que el resto del dashboard). "pedidos!inner" fuerza el join para poder filtrar por
// tipo_pedido desde detalle_pedido (mismo patrón que inventario!inner en api.js).
async function obtenerTopPerfumesVendidos(limite = 6) {
  const { data, error } = await supabaseClient
    .from('detalle_pedido')
    .select('cantidad, perfumes(id, nombre, marca), pedidos!inner(tipo_pedido)')
    .eq('pedidos.tipo_pedido', 'Directo_Tienda');
  if (error) throw new Error(error.message);

  const porProducto = new Map();
  (data || []).forEach((d) => {
    if (!d.perfumes) return;
    const key = d.perfumes.id;
    if (!porProducto.has(key)) porProducto.set(key, { ...d.perfumes, unidades: 0 });
    porProducto.get(key).unidades += d.cantidad;
  });
  return [...porProducto.values()].sort((a, b) => b.unidades - a.unidades).slice(0, limite);
}

/* ================= PRODUCTOS ================= */

// Paginado (catálogo real ya pasa de 80 perfumes y sigue creciendo) + filtros de género y
// tipo de casa -- los mismos que ya existía en el catálogo público (ver TIPOS_CASA en api.js),
// para que el admin pueda encontrar rápido "todos los Árabe sin clasificar" o "los Hombre".
// tipoCasa === '__sin_definir__' es un valor especial (no un tipo_casa real) para ubicar
// productos que todavía no se clasificaron -- ver constraint chk en perfumes.tipo_casa.
async function obtenerProductosAdmin({ busqueda, filtro, genero, tipoCasa, pagina = 1, porPagina = 20 } = {}) {
  let query = supabaseClient
    .from('perfumes')
    .select('*, inventario(stock_fisico, stock_reservado_consolidados, stock_disponible, stock_minimo_alerta)', { count: 'exact' });
  // "Solo Decants" ordena por marca/nombre/ml en vez de fecha de creación -- así los tamaños
  // de un mismo perfume (5ml, 10ml...) salen seguidos en la grilla, no mezclados por cuándo se
  // cargó cada uno (necesario para poder revisar de un vistazo qué tamaños ya tiene cada
  // decant, ver "+ Tamaño" en tarjetaProductoAdmin).
  query = filtro === 'decants'
    ? query.order('marca', { ascending: true }).order('nombre', { ascending: true }).order('mililitros', { ascending: true })
    : query.order('fecha_creacion', { ascending: false });
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);
  if (filtro === 'decants') query = query.eq('es_decant', true);
  if (filtro === 'liquidaciones') query = query.eq('es_liquidacion', true);
  if (filtro === 'ocultos') query = query.eq('activo', false);
  if (genero) query = query.eq('genero', genero);
  if (tipoCasa === '__sin_definir__') query = query.is('tipo_casa', null);
  else if (tipoCasa) query = query.eq('tipo_casa', tipoCasa);

  const desde = (pagina - 1) * porPagina;
  query = query.range(desde, desde + porPagina - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const productos = (data || []).map((p) => ({ ...p, inventario: Array.isArray(p.inventario) ? p.inventario[0] : p.inventario }));
  return { productos, total: count || 0, totalPaginas: Math.max(1, Math.ceil((count || 0) / porPagina)) };
}

// Trae un solo producto por id (para abrir el modal de edición) -- separado de
// obtenerProductosAdmin() porque ese ahora viene paginado: el producto que se quiere editar
// puede estar en cualquier página, no solo en la que está visible en pantalla.
async function obtenerProductoAdminPorId(id) {
  const { data, error } = await supabaseClient
    .from('perfumes')
    .select('*, inventario(stock_fisico, stock_reservado_consolidados, stock_disponible, stock_minimo_alerta)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return { ...data, inventario: Array.isArray(data.inventario) ? data.inventario[0] : data.inventario };
}

function generarSlug(nombre, marca) {
  return `${marca}-${nombre}`
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function crearProducto(data) {
  const payload = { ...data, slug: data.slug || generarSlug(data.nombre, data.marca) };
  const { data: creado, error } = await supabaseClient.from('perfumes').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return creado.id;
}

async function actualizarProducto(id, data) {
  const { error } = await supabaseClient.from('perfumes').update(data).eq('id', id);
  if (error) throw new Error(error.message);
}

async function eliminarProducto(id) {
  const { error } = await supabaseClient.from('perfumes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function actualizarInventario(idProducto, cambios) {
  const { error } = await supabaseClient.from('inventario').update(cambios).eq('id_producto', idProducto);
  if (error) throw new Error(error.message);
}

/* ================= CALCULADORA DE MÁRGENES ================= */

async function obtenerProductosParaMargenes({ busqueda, soloSinMargen, pagina = 1, porPagina = 20 } = {}) {
  let query = supabaseClient
    .from('perfumes')
    .select('id, nombre, marca, costo_importacion_pen, precio_consolidado_fijo, precio_tienda_regular, margen_aplicado', { count: 'exact' })
    .order('marca', { ascending: true });
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);
  if (soloSinMargen) query = query.eq('margen_aplicado', false);

  const desde = (pagina - 1) * porPagina;
  query = query.range(desde, desde + porPagina - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { productos: data || [], total: count || 0, totalPaginas: Math.max(1, Math.ceil((count || 0) / porPagina)) };
}

async function contarProductosConCosto({ soloSinMargen } = {}) {
  let query = supabaseClient.from('perfumes').select('id', { count: 'exact', head: true }).not('costo_importacion_pen', 'is', null).gt('costo_importacion_pen', 0);
  if (soloSinMargen) query = query.eq('margen_aplicado', false);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count || 0;
}

async function aplicarMargenMasivo(margenConsolidado, margenTienda, soloSinMargen) {
  const { data, error } = await supabaseClient.rpc('aplicar_margen_masivo', {
    p_margen_consolidado: margenConsolidado,
    p_margen_tienda: margenTienda,
    p_solo_sin_margen: soloSinMargen,
  });
  if (error) throw new Error(error.message);
  return data; // cantidad de productos actualizados
}

/* ================= PEDIDOS (TIENDA DIRECTA) ================= */

// tipoPedido: 'Directo_Tienda' (default, compras normales) o 'Consolidado' (pedidos generados
// al cerrar una campaña -- ver generar_pedidos_de_consolidado en schema.sql). Antes solo se
// podía ver/gestionar pago de los de Tienda Directa desde acá; los de Consolidado quedaban sin
// ningún lugar del admin para registrarles pago o avisarle al cliente una vez generados.
// "consolidados(codigo_campana)" sale null para pedidos de Tienda Directa (no tienen campaña
// asociada) -- no hace falta pedirlo condicionalmente.
// soloDecants (solo aplica con tipoPedido='Directo_Tienda'): true = solo pedidos con al menos
// un decant adentro, false = solo pedidos SIN ningún decant (tienda "normal"), undefined = sin
// filtrar por esto (usado para Consolidado, que no tiene esta distinción). El pestañeo
// Tienda/Decants del admin necesita separarlos para que el admin sepa de un vistazo si un
// pedido implica fraccionar un decant o solo despachar botellas selladas -- como ambos nacen
// del mismo carrito/checkout (tipo_pedido='Directo_Tienda' para los dos), la única forma de
// distinguirlos es mirando qué hay en detalle_pedido.
async function obtenerPedidosAdmin({ busqueda, estadoPago, tipoPedido = 'Directo_Tienda', soloDecants } = {}) {
  let query = supabaseClient
    .from('pedidos')
    .select('id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, fecha_creacion, perfiles(nombres, apellidos, correo, telefono), envios(estado_envio, numero_guia_seguimiento, empresa_transporte), consolidados(codigo_campana)')
    .eq('tipo_pedido', tipoPedido)
    .order('fecha_creacion', { ascending: false });
  if (estadoPago) query = query.eq('estado_pago', estadoPago);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let pedidos = data.map((p) => ({
    ...p,
    cliente: p.perfiles ? `${p.perfiles.nombres} ${p.perfiles.apellidos}` : '—',
    correo_cliente: p.perfiles?.correo,
    telefono_cliente: p.perfiles?.telefono,
    envio: Array.isArray(p.envios) ? p.envios[0] : p.envios,
    campana: p.consolidados?.codigo_campana,
  }));

  if (tipoPedido === 'Directo_Tienda' && soloDecants !== undefined && pedidos.length) {
    const { data: detalles, error: errorDetalle } = await supabaseClient
      .from('detalle_pedido')
      .select('id_pedido, perfumes(es_decant)')
      .in('id_pedido', pedidos.map((p) => p.id));
    if (errorDetalle) throw new Error(errorDetalle.message);
    const idsConDecant = new Set((detalles || []).filter((d) => d.perfumes?.es_decant).map((d) => d.id_pedido));
    pedidos = pedidos.filter((p) => (soloDecants ? idsConDecant.has(p.id) : !idsConDecant.has(p.id)));
  }

  if (busqueda) {
    const q = busqueda.toLowerCase();
    pedidos = pedidos.filter((p) => p.cliente.toLowerCase().includes(q) || String(p.id).includes(q) || (p.correo_cliente || '').toLowerCase().includes(q));
  }
  return pedidos;
}

async function obtenerDetallePedidoAdmin(id) {
  const { data: pedido, error } = await supabaseClient
    .from('pedidos')
    .select('*, perfiles(nombres, apellidos, correo, telefono), envios(*), direcciones_cliente(direccion_detalle, etiqueta, tipo_despacho, agencia_nombre, ubigeo(departamento, provincia, distrito)), consolidados(codigo_campana)')
    .eq('id', id)
    .single();
  if (error) throw new Error('Pedido no encontrado');

  const { data: items } = await supabaseClient
    .from('detalle_pedido')
    .select('cantidad, precio_unitario_aplicado, subtotal, perfumes(nombre, marca, imagen_url)')
    .eq('id_pedido', id);

  const { data: pagos } = await supabaseClient.from('pagos').select('*').eq('id_pedido', id).order('fecha_pago', { ascending: false });

  return {
    ...pedido,
    cliente: pedido.perfiles ? `${pedido.perfiles.nombres} ${pedido.perfiles.apellidos}` : '—',
    correo_cliente: pedido.perfiles?.correo,
    telefono_cliente: pedido.perfiles?.telefono,
    envio: Array.isArray(pedido.envios) ? pedido.envios[0] : pedido.envios,
    direccion: pedido.direcciones_cliente,
    campana: pedido.consolidados?.codigo_campana,
    items: (items || []).map((i) => ({ ...i, ...i.perfumes })),
    pagos: pagos || [],
  };
}

async function actualizarEnvioPedido(idPedido, cambios) {
  const { data: existente } = await supabaseClient.from('envios').select('id').eq('id_pedido', idPedido).maybeSingle();
  if (existente) {
    const { error } = await supabaseClient.from('envios').update(cambios).eq('id', existente.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseClient.from('envios').insert({ id_pedido: idPedido, ...cambios });
    if (error) throw new Error(error.message);
  }
}

// Nace Aprobado (default de la tabla) y dispara solo el trigger que recalcula
// pedidos.monto_adelanto_pagado / monto_saldo_pendiente / estado_pago, además de la
// notificación al cliente — no hace falta tocar nada más desde acá.
async function registrarPago(idPedido, pago) {
  const { error } = await supabaseClient.from('pagos').insert({ id_pedido: idPedido, ...pago });
  if (error) throw new Error(error.message);
}

// Corrige un pago mal registrado sin borrar el historial (queda como "Anulado" y deja de
// contar para el total pagado — mismo trigger de arriba).
async function anularPagoAdmin(id) {
  const { error } = await supabaseClient.from('pagos').update({ estado_pago: 'Anulado' }).eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================= CONSOLIDADOS ================= */

async function obtenerConsolidadosAdmin() {
  const { data, error } = await supabaseClient.from('consolidados').select('*').order('fecha_apertura', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function crearConsolidadoAdmin(data) {
  const { error } = await supabaseClient.from('consolidados').insert(data);
  if (error) throw new Error(error.message);
}

async function actualizarConsolidadoAdmin(id, data) {
  const { error } = await supabaseClient.from('consolidados').update(data).eq('id', id);
  if (error) throw new Error(error.message);
}

async function cambiarEstadoConsolidado(id, nuevoEstado, descripcionPublica) {
  const cambios = { estado: nuevoEstado };
  if (['Finalizado', 'Cancelado'].includes(nuevoEstado)) cambios.fecha_cierre_real = new Date().toISOString();
  const { error } = await supabaseClient.from('consolidados').update(cambios).eq('id', id);
  if (error) throw new Error(error.message);
  await supabaseClient.from('historial_estados_consolidado').insert({
    id_consolidado: id,
    estado: nuevoEstado,
    descripcion_publica: descripcionPublica || null,
  });
}

async function obtenerReservasDeConsolidadoAdmin(idConsolidado) {
  const { data, error } = await supabaseClient
    .from('detalle_consolidado')
    .select('id, cantidad, precio_consolidado_aplicado, estado_item, fecha_reserva, perfiles(nombres, apellidos, correo, telefono), perfumes(nombre, marca, imagen_url, slug)')
    .eq('id_consolidado', idConsolidado)
    .order('fecha_reserva', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((r) => ({
    ...r,
    cliente: r.perfiles ? `${r.perfiles.nombres} ${r.perfiles.apellidos}` : '—',
    correo_cliente: r.perfiles?.correo,
    telefono_cliente: r.perfiles?.telefono,
    ...r.perfumes,
  }));
}

async function obtenerTodasLasReservasAdmin({ busqueda } = {}) {
  let query = supabaseClient
    .from('detalle_consolidado')
    .select('id, cantidad, precio_consolidado_aplicado, estado_item, fecha_reserva, consolidados(id, codigo_campana, estado), perfiles(nombres, apellidos, correo, telefono), perfumes(nombre, marca)')
    .order('fecha_reserva', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let reservas = data.map((r) => ({
    ...r,
    cliente: r.perfiles ? `${r.perfiles.nombres} ${r.perfiles.apellidos}` : '—',
    telefono_cliente: r.perfiles?.telefono,
    campana: r.consolidados?.codigo_campana,
    id_consolidado: r.consolidados?.id,
    estado_consolidado: r.consolidados?.estado,
    producto: r.perfumes ? `${r.perfumes.marca} — ${r.perfumes.nombre}` : '—',
  }));
  if (busqueda) {
    const q = busqueda.toLowerCase();
    reservas = reservas.filter((r) => r.cliente.toLowerCase().includes(q) || (r.campana || '').toLowerCase().includes(q) || (r.producto || '').toLowerCase().includes(q));
  }
  return reservas;
}

async function actualizarEstadoReserva(idDetalle, nuevoEstado) {
  const { error } = await supabaseClient.from('detalle_consolidado').update({ estado_item: nuevoEstado }).eq('id', idDetalle);
  if (error) throw new Error(error.message);
}

// Antes la única forma de corregir la cantidad de una reserva era editar la fila a mano en
// Supabase — esto le da al admin un camino normal para hacerlo (ej. el cliente pidió por
// WhatsApp que le cambien de 3 a 2 unidades).
async function actualizarCantidadReserva(idDetalle, cantidad) {
  const { error } = await supabaseClient.from('detalle_consolidado').update({ cantidad }).eq('id', idDetalle);
  if (error) throw new Error(error.message);
}

/* ================= CONTABILIDAD ================= */

// Cuánto pedir al proveedor y cuánto se espera cobrar, a partir de las reservas vivas y ya
// aprobadas de la campaña (no canceladas, no pendientes de aprobación — ver migración 0006:
// una reserva de 10+ unidades de un mismo perfume no debe inflar el pedido al proveedor hasta
// que el admin la confirme) — sirve desde antes de cerrarla, para planificar.
async function obtenerContabilidadConsolidado(idConsolidado) {
  const [{ data: detalle, error: e1 }, { data: pedidos, error: e2 }] = await Promise.all([
    supabaseClient
      .from('detalle_consolidado')
      .select('cantidad, precio_consolidado_aplicado, estado_item, perfumes(id, nombre, marca, costo_importacion_pen, mililitros)')
      .eq('id_consolidado', idConsolidado)
      .not('estado_item', 'in', '(Cancelado,Pendiente_Aprobacion)'),
    supabaseClient
      .from('pedidos')
      .select('id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago')
      .eq('id_consolidado_asociado', idConsolidado)
      .eq('tipo_pedido', 'Consolidado'),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const porProducto = new Map();
  (detalle || []).forEach((d) => {
    const key = d.perfumes.id;
    if (!porProducto.has(key)) porProducto.set(key, { ...d.perfumes, unidades: 0, montoEsperado: 0, costoTotal: 0 });
    const entry = porProducto.get(key);
    entry.unidades += d.cantidad;
    entry.montoEsperado += d.cantidad * Number(d.precio_consolidado_aplicado);
    entry.costoTotal += d.cantidad * Number(d.perfumes.costo_importacion_pen || 0);
  });

  return {
    productos: [...porProducto.values()].sort((a, b) => b.unidades - a.unidades),
    unidadesTotales: (detalle || []).reduce((acc, d) => acc + d.cantidad, 0),
    montoTotalReservado: (detalle || []).reduce((acc, d) => acc + d.cantidad * Number(d.precio_consolidado_aplicado), 0),
    costoTotalImportacion: (detalle || []).reduce((acc, d) => acc + d.cantidad * Number(d.perfumes.costo_importacion_pen || 0), 0),
    reservasSinConvertir: (detalle || []).filter((d) => d.estado_item === 'Reservado').length,
    pedidosGenerados: pedidos?.length || 0,
    montoTotalPedidos: (pedidos || []).reduce((acc, p) => acc + Number(p.monto_total), 0),
    montoCobrado: (pedidos || []).reduce((acc, p) => acc + Number(p.monto_adelanto_pagado), 0),
    montoPendienteCobro: (pedidos || []).reduce((acc, p) => acc + Number(p.monto_saldo_pendiente), 0),
  };
}

async function generarPedidosDeConsolidado(idConsolidado) {
  const { data, error } = await supabaseClient.rpc('generar_pedidos_de_consolidado', { p_id_consolidado: idConsolidado });
  if (error) throw new Error(error.message);
  return data;
}

// Una fila por producto por pedido — la forma natural de una fila de Excel para "quién pidió
// qué, cuánto pagó y cuánto debe".
async function obtenerFilasExportacionConsolidado(idConsolidado) {
  const { data, error } = await supabaseClient
    .from('pedidos')
    .select(`
      id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, fecha_creacion,
      perfiles(nombres, apellidos, telefono, correo),
      detalle_pedido(cantidad, precio_unitario_aplicado, subtotal, perfumes(nombre, marca))
    `)
    .eq('id_consolidado_asociado', idConsolidado)
    .eq('tipo_pedido', 'Consolidado')
    .order('id');
  if (error) throw new Error(error.message);

  const filas = [];
  (data || []).forEach((pedido) => {
    const cliente = pedido.perfiles ? `${pedido.perfiles.nombres} ${pedido.perfiles.apellidos}` : '—';
    (pedido.detalle_pedido || []).forEach((item) => {
      filas.push({
        'N° Pedido': pedido.id,
        Cliente: cliente,
        Teléfono: pedido.perfiles?.telefono || '',
        Correo: pedido.perfiles?.correo || '',
        Marca: item.perfumes?.marca || '',
        Perfume: item.perfumes?.nombre || '',
        Cantidad: item.cantidad,
        'Precio Unitario': Number(item.precio_unitario_aplicado),
        Subtotal: Number(item.subtotal),
        'Total Pedido': Number(pedido.monto_total),
        Pagado: Number(pedido.monto_adelanto_pagado),
        'Saldo Pendiente': Number(pedido.monto_saldo_pendiente),
        'Estado de Pago': pedido.estado_pago,
        Fecha: new Date(pedido.fecha_creacion).toLocaleDateString('es-PE'),
      });
    });
  });
  return filas;
}

// Para imprimir la lista de participantes de una campaña: Nombre, DNI, celular, su pedido y
// si es recojo en tienda o envío por agencia (Shalom/Olva). Si la campaña ya generó pedidos
// (el admin le dio "Generar Pedidos"), esa es la fuente oficial porque ya tiene montos y
// dirección confirmados; mientras siga en fase de reservas, se arma directo desde
// detalle_consolidado agrupando por cliente — así el admin puede imprimir la lista para
// planificar incluso antes de cerrar la campaña.
function formatearEntrega(dir) {
  if (!dir) return 'Sin dirección registrada';
  if (dir.tipo_despacho === 'Recojo_En_Tienda') return 'Recojo en almacén (Lima)';
  const tipo = (dir.tipo_despacho || '').replace(/_/g, ' ');
  const partes = [tipo, dir.agencia_nombre, dir.direccion_detalle].filter(Boolean);
  return partes.join(' — ');
}

async function obtenerFilasImpresionConsolidado(idConsolidado) {
  const { count: pedidosCount, error: errorConteo } = await supabaseClient
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('id_consolidado_asociado', idConsolidado)
    .eq('tipo_pedido', 'Consolidado');
  if (errorConteo) throw new Error(errorConteo.message);

  if (pedidosCount > 0) {
    const { data, error } = await supabaseClient
      .from('pedidos')
      .select(`
        id, monto_total,
        perfiles(nombres, apellidos, dni_ce_ruc, telefono),
        direcciones_cliente(tipo_despacho, agencia_nombre, direccion_detalle),
        detalle_pedido(cantidad, perfumes(nombre, marca))
      `)
      .eq('id_consolidado_asociado', idConsolidado)
      .eq('tipo_pedido', 'Consolidado')
      .order('id');
    if (error) throw new Error(error.message);
    return (data || []).map((p) => ({
      cliente: p.perfiles ? `${p.perfiles.nombres} ${p.perfiles.apellidos}` : '—',
      dni: p.perfiles?.dni_ce_ruc || '—',
      celular: p.perfiles?.telefono || '—',
      entrega: formatearEntrega(p.direcciones_cliente),
      items: (p.detalle_pedido || []).map((i) => `${i.perfumes?.marca || ''} — ${i.perfumes?.nombre || ''} x${i.cantidad}`),
      total: Number(p.monto_total),
    }));
  }

  const { data, error } = await supabaseClient
    .from('detalle_consolidado')
    .select(`
      id_cliente, cantidad, precio_consolidado_aplicado,
      perfiles(nombres, apellidos, dni_ce_ruc, telefono),
      direcciones_cliente(tipo_despacho, agencia_nombre, direccion_detalle),
      perfumes(nombre, marca)
    `)
    .eq('id_consolidado', idConsolidado)
    .neq('estado_item', 'Cancelado')
    .order('id_cliente');
  if (error) throw new Error(error.message);

  const porCliente = new Map();
  (data || []).forEach((r) => {
    if (!porCliente.has(r.id_cliente)) {
      porCliente.set(r.id_cliente, {
        cliente: r.perfiles ? `${r.perfiles.nombres} ${r.perfiles.apellidos}` : '—',
        dni: r.perfiles?.dni_ce_ruc || '—',
        celular: r.perfiles?.telefono || '—',
        entrega: formatearEntrega(r.direcciones_cliente),
        items: [],
        total: 0,
      });
    }
    const entry = porCliente.get(r.id_cliente);
    entry.items.push(`${r.perfumes?.marca || ''} — ${r.perfumes?.nombre || ''} x${r.cantidad}`);
    entry.total += r.cantidad * Number(r.precio_consolidado_aplicado);
  });
  return [...porCliente.values()];
}

/* ================= RESEÑAS ================= */

async function obtenerResenasAdmin({ soloPendientes } = {}) {
  let query = supabaseClient.from('resenas').select('*, perfiles(nombres, apellidos), perfumes(nombre, marca)').order('fecha_creacion', { ascending: false });
  if (soloPendientes) query = query.eq('aprobado', false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map((r) => ({ ...r, cliente: r.perfiles ? `${r.perfiles.nombres} ${r.perfiles.apellidos}` : '—', producto: r.perfumes ? `${r.perfumes.marca} — ${r.perfumes.nombre}` : 'General' }));
}

async function aprobarResena(id) {
  const { error } = await supabaseClient.from('resenas').update({ aprobado: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function eliminarResena(id) {
  const { error } = await supabaseClient.from('resenas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================= COTIZACIONES ================= */

async function obtenerCotizacionesAdmin({ estado } = {}) {
  let query = supabaseClient.from('solicitudes_cotizacion').select('*, perfiles(nombres, apellidos, correo, telefono)').order('fecha_solicitud', { ascending: false });
  if (estado) query = query.eq('estado', estado);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map((c) => ({ ...c, cliente: c.perfiles ? `${c.perfiles.nombres} ${c.perfiles.apellidos}` : '—', correo_cliente: c.perfiles?.correo, telefono_cliente: c.perfiles?.telefono }));
}

async function responderCotizacionAdmin(id, cambios) {
  const { error } = await supabaseClient.from('solicitudes_cotizacion').update(cambios).eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================= PREGUNTAS FRECUENTES ================= */

async function obtenerFAQAdmin() {
  const { data, error } = await supabaseClient.from('preguntas_frecuentes').select('*').order('orden', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function crearFAQ(data) {
  const { error } = await supabaseClient.from('preguntas_frecuentes').insert(data);
  if (error) throw new Error(error.message);
}

async function actualizarFAQ(id, data) {
  const { error } = await supabaseClient.from('preguntas_frecuentes').update(data).eq('id', id);
  if (error) throw new Error(error.message);
}

async function eliminarFAQ(id) {
  const { error } = await supabaseClient.from('preguntas_frecuentes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================= CONFIGURACIÓN DEL SITIO ================= */

async function obtenerConfiguracionSitioAdmin() {
  const { data, error } = await supabaseClient.from('configuracion_sitio').select('*').eq('id', 1).single();
  if (error) throw new Error(error.message);
  return data;
}

async function actualizarConfiguracionSitio(data) {
  const { error } = await supabaseClient.from('configuracion_sitio').update({ ...data, actualizado_en: new Date().toISOString() }).eq('id', 1);
  if (error) throw new Error(error.message);
}

/* ================= PUBLICIDAD (popup del inicio) ================= */

async function obtenerPublicidadAdmin() {
  const { data, error } = await supabaseClient.from('publicidad_popup').select('*').eq('id', 1).single();
  if (error) throw new Error(error.message);
  return data;
}

async function actualizarPublicidad(data) {
  const { error } = await supabaseClient.from('publicidad_popup').update({ ...data, actualizado_en: new Date().toISOString() }).eq('id', 1);
  if (error) throw new Error(error.message);
}

/* ================= CLIENTES ================= */

async function obtenerClientesAdmin({ busqueda } = {}) {
  let query = supabaseClient.from('perfiles').select('*').order('fecha_registro', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let clientes = data || [];
  if (busqueda) {
    const q = busqueda.toLowerCase();
    clientes = clientes.filter((c) => `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) || (c.correo || '').toLowerCase().includes(q) || (c.dni_ce_ruc || '').includes(q));
  }
  return clientes;
}

// Único lugar de la app donde se puede ascender/quitar Admin a otra cuenta (antes solo se
// podía tocando la tabla "perfiles" directo en Supabase). Requiere que quien llama ya sea
// Admin — lo exige la policy "perfil propio editar" combinada con el trigger
// fn_bloquear_autoascenso_admin del esquema, no solo esta función.
async function cambiarRolCliente(id, nuevoRol) {
  const { error } = await supabaseClient.from('perfiles').update({ rol: nuevoRol }).eq('id', id);
  if (error) throw new Error(error.message);
}
