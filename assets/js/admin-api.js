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
  // Los pedidos anulados (cancelado=true) no cuentan en ninguna cifra de venta del dashboard.
  const [pedidos, pedidosHoy, pagosSemana, pedidosPorConfirmar, consolidados, reservasPendientes, cotizacionesPendientes, resenasPendientes, stockBajo, productosSinMargen, porDespachar, reclamos, saldos] = await Promise.all([
    supabaseClient.from('pedidos').select('monto_adelanto_pagado', { count: 'exact' }).eq('tipo_pedido', 'Directo_Tienda').eq('cancelado', false),
    supabaseClient.from('pedidos').select('id', { count: 'exact', head: true }).eq('tipo_pedido', 'Directo_Tienda').eq('cancelado', false).gte('fecha_creacion', inicioHoy.toISOString()),
    supabaseClient.from('pagos').select('monto, fecha_pago').eq('estado_pago', 'Aprobado').gte('fecha_pago', inicioSemana.toISOString()),
    supabaseClient.from('pedidos').select('id', { count: 'exact', head: true }).eq('tipo_pedido', 'Directo_Tienda').eq('cancelado', false).in('estado_pago', ['Pendiente', 'Parcial']),
    supabaseClient.from('consolidados').select('id', { count: 'exact' }).eq('estado', 'Abierto'),
    supabaseClient.from('detalle_consolidado').select('id', { count: 'exact' }).eq('estado_item', 'Reservado'),
    supabaseClient.from('solicitudes_cotizacion').select('id', { count: 'exact' }).eq('estado', 'Pendiente'),
    supabaseClient.from('resenas').select('id', { count: 'exact' }).eq('aprobado', false),
    obtenerStockBajoDashboard(1000),
    supabaseClient.from('perfumes').select('id', { count: 'exact', head: true }).eq('margen_aplicado', false).eq('activo', true),
    supabaseClient.from('pedidos').select('id, envios!inner(estado_envio)', { count: 'exact', head: true }).eq('tipo_pedido', 'Directo_Tienda').eq('cancelado', false).eq('envios.estado_envio', 'Preparando'),
    supabaseClient.from('libro_reclamaciones').select('id', { count: 'exact', head: true }).neq('estado', 'Respondido'),
    // Lo que te deben (todos los pedidos vigentes con saldo, tienda y consolidado).
    supabaseClient.from('pedidos').select('monto_saldo_pendiente').eq('cancelado', false).gt('monto_saldo_pendiente', 0),
  ]);

  // Suma lo realmente cobrado (monto_adelanto_pagado), no monto_total filtrado a "Completado"
  // -- así los pedidos con pago Parcial también aportan al total en vez de contar como 0 (ver
  // el mismo criterio ya usado en obtenerContabilidadConsolidado más abajo).
  const ingresos = (pedidos.data || []).reduce((acc, p) => acc + Number(p.monto_adelanto_pagado || 0), 0);

  const ingresosSemana = (pagosSemana.data || []).reduce((acc, p) => acc + Number(p.monto), 0);
  const cobradoHoy = (pagosSemana.data || []).filter((p) => fechaDB(p.fecha_pago) >= inicioHoy).reduce((acc, p) => acc + Number(p.monto), 0);
  const porCobrar = (saldos.data || []).reduce((acc, p) => acc + Number(p.monto_saldo_pendiente), 0);

  const productosStockBajo = stockBajo.length;

  return {
    pedidosPorDespachar: porDespachar.count || 0,
    reclamosPendientes: reclamos.count || 0,
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
    cobradoHoy,
    porCobrar,
    pedidosConSaldo: (saldos.data || []).length,
  };
}

async function obtenerUltimosPedidosDashboard(limite = 5) {
  const { data, error } = await supabaseClient
    .from('pedidos')
    .select('id, monto_total, estado_pago, fecha_creacion, canal, cliente_nombre, cancelado, perfiles(nombres, apellidos)')
    .eq('tipo_pedido', 'Directo_Tienda')
    .order('fecha_creacion', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data.map((p) => ({ ...p, cliente: nombreClientePedido(p) }));
}

// "Stock bajo" = lo que todavía se vende pero está por acabarse: perfumes de tienda activos con
// 1..stock_minimo_alerta frascos cerrados, y decants cuyo frasco abierto baja de 20 ml (solo si
// el admin lleva los ml). Lo que ya está en 0 no es "bajo", es agotado -- mezclarlo llenaba
// este panel con todo el catálogo que nunca tuvo stock.
const ML_ALERTA_DECANT = 20;

async function obtenerStockBajoDashboard(limite = 5) {
  const { data, error } = await supabaseClient
    .from('perfumes')
    .select('id, nombre, marca, es_decant, mililitros_restantes, inventario(stock_fisico, frascos_abiertos, stock_minimo_alerta)')
    .eq('activo', true)
    .is('id_decant_grupo', null);
  if (error) throw new Error(error.message);
  return (data || [])
    .map((p) => {
      const inv = Array.isArray(p.inventario) ? p.inventario[0] : p.inventario;
      if (!inv) return null;
      if (p.es_decant) {
        const ml = p.mililitros_restantes == null ? null : Number(p.mililitros_restantes);
        if (inv.frascos_abiertos > 0 && ml != null && ml < ML_ALERTA_DECANT) {
          return { id: p.id, nombre: p.nombre, marca: p.marca, es_decant: true, stock: ml, detalle: `Decant: quedan ${ml} ml` };
        }
        return null;
      }
      if (inv.stock_fisico > 0 && inv.stock_fisico <= (inv.stock_minimo_alerta ?? 2)) {
        return { id: p.id, nombre: p.nombre, marca: p.marca, es_decant: false, stock: inv.stock_fisico, detalle: `${inv.stock_fisico} frasco${inv.stock_fisico === 1 ? '' : 's'} cerrado${inv.stock_fisico === 1 ? '' : 's'}` };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limite);
}

// Un pedido registrado a mano puede no tener cuenta detrás (perfiles null) -- el nombre sale de
// la "foto" que guarda el propio pedido (migración 0018). Para pedidos viejos sin foto, se cae
// al perfil como siempre.
function nombreClientePedido(p) {
  if (p.cliente_nombre) return p.cliente_nombre;
  if (p.perfiles) return `${p.perfiles.nombres || ''} ${p.perfiles.apellidos || ''}`.trim() || '—';
  return '—';
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
    supabaseClient.from('pedidos').select('id, fecha_creacion').eq('tipo_pedido', 'Directo_Tienda').eq('cancelado', false).gte('fecha_creacion', desde.toISOString()),
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
    .select('cantidad, perfumes(id, nombre, marca), pedidos!inner(tipo_pedido, cancelado)')
    .eq('pedidos.tipo_pedido', 'Directo_Tienda')
    .eq('pedidos.cancelado', false);
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
// Trae un solo producto por id con todos sus campos (para abrir el modal de edición: la lista
// de Productos solo trae las columnas que muestra, ver obtenerInventarioAdmin).
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
// estadoEnvio: filtra por el estado del envío ('Preparando' = por despachar). anulados:
// 'activos' (default, lo que se trabaja día a día), 'anulados' o 'todos'.
async function obtenerPedidosAdmin({ busqueda, estadoPago, tipoPedido = 'Directo_Tienda', soloDecants, estadoEnvio, anulados = 'activos' } = {}) {
  let query = supabaseClient
    .from('pedidos')
    .select('id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, fecha_creacion, canal, cancelado, cliente_nombre, cliente_dni, cliente_telefono, envio_tipo, envio_distrito, envio_provincia, envio_departamento, perfiles(nombres, apellidos, correo, telefono, dni_ce_ruc), envios(estado_envio, numero_guia_seguimiento, empresa_transporte), consolidados(codigo_campana)')
    .eq('tipo_pedido', tipoPedido)
    .order('fecha_creacion', { ascending: false });
  if (estadoPago) query = query.eq('estado_pago', estadoPago);
  if (anulados === 'activos') query = query.eq('cancelado', false);
  if (anulados === 'anulados') query = query.eq('cancelado', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let pedidos = data.map((p) => ({
    ...p,
    cliente: nombreClientePedido(p),
    correo_cliente: p.perfiles?.correo,
    telefono_cliente: p.cliente_telefono || p.perfiles?.telefono,
    dni_cliente: p.cliente_dni || p.perfiles?.dni_ce_ruc,
    envio: Array.isArray(p.envios) ? p.envios[0] : p.envios,
    campana: p.consolidados?.codigo_campana,
  }));

  if (estadoEnvio) pedidos = pedidos.filter((p) => (p.envio?.estado_envio || 'Preparando') === estadoEnvio);

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
    const q = busqueda.toLowerCase().trim();
    const qDigitos = q.replace(/\D/g, '');
    pedidos = pedidos.filter((p) =>
      p.cliente.toLowerCase().includes(q)
      || String(p.id).includes(q.replace(/^#/, ''))
      || (p.correo_cliente || '').toLowerCase().includes(q)
      || (qDigitos.length >= 3 && (String(p.dni_cliente || '').includes(qDigitos) || String(p.telefono_cliente || '').replace(/\D/g, '').includes(qDigitos))));
  }
  return pedidos;
}

// Columnas que necesita cualquier vista de "un pedido completo" (detalle, etiqueta de envío,
// comprobante) -- una sola definición para que la etiqueta y el detalle nunca muestren datos
// distintos del mismo pedido.
const SELECT_PEDIDO_COMPLETO = '*, perfiles(nombres, apellidos, correo, telefono, dni_ce_ruc), envios(*), direcciones_cliente(direccion_detalle, etiqueta, tipo_despacho, agencia_nombre, nombre_receptor, ubigeo(departamento, provincia, distrito)), consolidados(codigo_campana), detalle_pedido(cantidad, precio_unitario_aplicado, subtotal, talla_ml, descripcion_libre, perfumes(id, nombre, marca, imagen_url, es_decant))';

// Datos de envío unificados: primero la "foto" guardada en el pedido (migración 0018 --
// pedidos manuales y web desde esa fecha, editable desde el detalle), si falta algún dato se
// completa con el perfil y la dirección elegida (pedidos viejos / de consolidado).
function datosEnvioPedido(p) {
  const perfil = p.perfiles || {};
  const dir = p.direcciones_cliente || {};
  const ub = dir.ubigeo || {};
  return {
    cliente: nombreClientePedido(p),
    dni: p.cliente_dni || perfil.dni_ce_ruc || '',
    telefono: p.cliente_telefono || perfil.telefono || '',
    correo: perfil.correo || '',
    tipo: p.envio_tipo || dir.tipo_despacho || '',
    agencia: p.envio_agencia || dir.agencia_nombre || '',
    departamento: p.envio_departamento || ub.departamento || '',
    provincia: p.envio_provincia || ub.provincia || '',
    distrito: p.envio_distrito || ub.distrito || '',
    direccion: p.envio_direccion || dir.direccion_detalle || '',
    receptorNombre: p.envio_receptor_nombre || dir.nombre_receptor || '',
    receptorDni: p.envio_receptor_dni || '',
    receptorTelefono: p.envio_receptor_telefono || '',
  };
}

// Una línea de pedido puede ser un producto del catálogo o una línea libre (nombre y precio
// escritos por el admin, sin producto -- migración 0019): se normalizan al mismo formato.
function normalizarItemPedido(i) {
  const prod = i.perfumes || null;
  return {
    ...i,
    ...(prod || {}),
    id_producto: prod?.id ?? null,
    nombre: prod?.nombre ?? i.descripcion_libre ?? '—',
    marca: prod?.marca ?? '',
    es_decant: !!prod?.es_decant,
    es_libre: !prod,
  };
}

function nombreItemPedido(i) {
  return `${i.marca ? `${i.marca} — ` : ''}${i.nombre}${i.es_decant ? ` (decant ${i.talla_ml}ml)` : ''}`;
}

function normalizarPedidoCompleto(pedido) {
  const envioDatos = datosEnvioPedido(pedido);
  return {
    ...pedido,
    cliente: envioDatos.cliente,
    correo_cliente: envioDatos.correo,
    telefono_cliente: envioDatos.telefono,
    dni_cliente: envioDatos.dni,
    envioDatos,
    envio: Array.isArray(pedido.envios) ? pedido.envios[0] : pedido.envios,
    direccion: pedido.direcciones_cliente,
    campana: pedido.consolidados?.codigo_campana,
    items: (pedido.detalle_pedido || []).map(normalizarItemPedido),
  };
}

async function obtenerDetallePedidoAdmin(id) {
  const { data: pedido, error } = await supabaseClient.from('pedidos').select(SELECT_PEDIDO_COMPLETO).eq('id', id).single();
  if (error) throw new Error('Pedido no encontrado');

  const [{ data: pagos }, { data: nota }] = await Promise.all([
    supabaseClient.from('pagos').select('*').eq('id_pedido', id).order('fecha_pago', { ascending: false }),
    supabaseClient.from('pedidos_notas_admin').select('nota').eq('id_pedido', id).maybeSingle(),
  ]);

  return { ...normalizarPedidoCompleto(pedido), pagos: pagos || [], nota_admin: nota?.nota || '' };
}

// Varios pedidos completos de una sola vez (impresión de etiquetas en lote).
async function obtenerPedidosCompletos(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabaseClient.from('pedidos').select(SELECT_PEDIDO_COMPLETO).in('id', ids).order('id');
  if (error) throw new Error(error.message);
  return (data || []).map(normalizarPedidoCompleto);
}

// Corrige la "foto" de envío guardada en el pedido (nombre, DNI, agencia, destino...) --
// es lo que sale impreso en la etiqueta.
async function actualizarDatosPedido(id, cambios) {
  const { error } = await supabaseClient.from('pedidos').update(cambios).eq('id', id);
  if (error) throw new Error(error.message);
}

async function guardarNotaPedidoAdmin(idPedido, nota) {
  const { error } = await supabaseClient
    .from('pedidos_notas_admin')
    .upsert({ id_pedido: idPedido, nota: nota || '', actualizado_en: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// Pedido tomado por WhatsApp o en la tienda física, con o sin cuenta del cliente -- todo lo
// valida y descuenta registrar_pedido_manual() en la base (ver migración 0018).
async function registrarPedidoManual(pedido, items, pago) {
  const { data, error } = await supabaseClient.rpc('registrar_pedido_manual', { p_pedido: pedido, p_items: items, p_pago: pago || null });
  if (error) throw new Error(error.message);
  return data;
}

// Anula el pedido y devuelve su stock (frascos cerrados y ml de decant). Los pagos quedan
// como están -- si hubo devolución de dinero, se anula el pago aparte.
async function cancelarPedidoAdmin(id, motivo) {
  const { error } = await supabaseClient.rpc('cancelar_pedido', { p_id_pedido: id, p_motivo: motivo || null });
  if (error) throw new Error(error.message);
}

// Clientes para autocompletar el pedido manual: cuentas registradas + gente que ya compró sin
// cuenta. De cada uno se guarda el último destino usado, así un cliente que repite solo se
// elige de la lista y se llenan sus datos de envío.
async function obtenerClientesParaPedido() {
  const [{ data: perfiles, error: e1 }, { data: pedidos, error: e2 }] = await Promise.all([
    supabaseClient.from('perfiles').select('id, nombres, apellidos, dni_ce_ruc, telefono, correo'),
    supabaseClient
      .from('pedidos')
      .select('id_cliente, cliente_nombre, cliente_dni, cliente_telefono, envio_tipo, envio_agencia, envio_departamento, envio_provincia, envio_distrito, envio_direccion, envio_receptor_nombre, envio_receptor_dni, envio_receptor_telefono, fecha_creacion')
      .order('fecha_creacion', { ascending: false })
      .limit(1000),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const clientes = new Map();
  const claveDe = (c) => c.id_cliente || (c.dni ? `dni:${c.dni}` : c.telefono ? `tel:${String(c.telefono).replace(/\D/g, '')}` : `nom:${(c.nombre || '').toLowerCase()}`);
  (pedidos || []).forEach((p) => {
    if (!p.cliente_nombre) return;
    const c = { id_cliente: p.id_cliente, nombre: p.cliente_nombre, dni: p.cliente_dni || '', telefono: p.cliente_telefono || '', envio: p.envio_tipo ? p : null };
    const clave = claveDe(c);
    if (!clientes.has(clave)) clientes.set(clave, c);
  });
  (perfiles || []).forEach((pf) => {
    if (clientes.has(pf.id)) return;
    const nombre = `${pf.nombres || ''} ${pf.apellidos || ''}`.trim();
    if (!nombre) return;
    clientes.set(pf.id, { id_cliente: pf.id, nombre, dni: pf.dni_ce_ruc || '', telefono: pf.telefono || '', correo: pf.correo || '', envio: null });
  });
  return [...clientes.values()];
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

/* ================= UTILIDADES ================= */

// Las columnas "timestamp" (sin zona) de la base guardan la hora UTC del servidor, pero llegan
// sin la "Z" final -- new Date() las leía como hora de Perú y corría todo 5 horas (un pedido de
// las 8pm caía en el día siguiente, y a fin de mes, en el mes siguiente de la contabilidad).
function fechaDB(valor) {
  if (!valor) return null;
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [a, m, d] = texto.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(texto) ? texto : `${texto}Z`);
}

// PostgREST corta cada respuesta en 1000 filas -- para la contabilidad de un año entero (o el
// inventario completo) se pide por tramos hasta traer todo.
async function seleccionarTodo(crearQuery, tamanoTramo = 1000) {
  const filas = [];
  for (let desde = 0; ; desde += tamanoTramo) {
    const { data, error } = await crearQuery().range(desde, desde + tamanoTramo - 1);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < tamanoTramo) break;
  }
  return filas;
}

/* ================= INVENTARIO ================= */

// Una fila por perfume (sin las filas "hijas" de decants viejos, ver migración 0016) con su
// inventario: stock_fisico = frascos cerrados de tienda, frascos_abiertos = en uso para
// decants, mililitros_restantes = ml que quedan en los frascos abiertos.
async function obtenerInventarioAdmin() {
  const filas = await seleccionarTodo(() => supabaseClient
    .from('perfumes')
    .select('id, slug, nombre, marca, mililitros, es_decant, id_perfume_tienda, activo, estado, tipo_casa, genero, concentracion, familia_olfativa, inspirado_en, es_nuevo, es_bestseller, margen_aplicado, fecha_creacion, imagen_url, precio_tienda_regular, precio_consolidado_fijo, descuento_tienda_porcentaje, es_liquidacion, precio_liquidacion, costo_importacion_pen, precio_3ml, precio_5ml, precio_10ml, mililitros_restantes, inventario(stock_fisico, frascos_abiertos, stock_minimo_alerta)')
    .is('id_decant_grupo', null)
    .order('marca', { ascending: true })
    .order('nombre', { ascending: true })
    .order('id', { ascending: true }));
  return filas.map((p) => {
    const inv = (Array.isArray(p.inventario) ? p.inventario[0] : p.inventario) || {};
    return {
      ...p,
      cerrados: Number(inv.stock_fisico || 0),
      abiertos: Number(inv.frascos_abiertos || 0),
      minimo: inv.stock_minimo_alerta ?? 2,
      ml_restantes: p.mililitros_restantes == null ? null : Number(p.mililitros_restantes),
    };
  });
}

// esDelta=true suma/resta (Ingreso, Merma, Frasco_Terminado); false fija el valor exacto
// (Conteo). null en cerrados/abiertos/ml = no tocar ese dato.
async function ajustarInventario({ idProducto, cerrados = null, abiertos = null, ml = null, esDelta = true, motivo = 'Ajuste', nota = null }) {
  const { error } = await supabaseClient.rpc('ajustar_inventario', {
    p_id_producto: idProducto,
    p_cerrados: cerrados,
    p_abiertos: abiertos,
    p_ml: ml,
    p_es_delta: esDelta,
    p_motivo: motivo,
    p_nota: nota,
  });
  if (error) throw new Error(error.message);
}

async function abrirFrascoDecant(idDecant, descontarTienda = true, nota = null) {
  const { error } = await supabaseClient.rpc('abrir_frasco_decant', { p_id_decant: idDecant, p_descontar_tienda: descontarTienda, p_nota: nota });
  if (error) throw new Error(error.message);
}

// idTienda null = desvincular.
async function vincularDecantConTienda(idDecant, idTienda) {
  const { error } = await supabaseClient.from('perfumes').update({ id_perfume_tienda: idTienda }).eq('id', idDecant);
  if (error) throw new Error(error.message);
}

async function obtenerMovimientosInventario({ idsProducto, tipo, desde, limite = 400 } = {}) {
  let query = supabaseClient
    .from('movimientos_inventario')
    .select('*, perfumes(nombre, marca, es_decant), perfiles(nombres, apellidos, rol)')
    .order('fecha', { ascending: false })
    .limit(limite);
  if (idsProducto?.length) query = query.in('id_producto', idsProducto);
  if (tipo) query = query.eq('tipo', tipo);
  if (desde) query = query.gte('fecha', desde);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/* ================= CONTABILIDAD (ventas, cobros y gastos) ================= */

// Todo lo del año elegido en 3 consultas -- el resumen mensual, por canal, por método de pago
// y el ranking de productos se arman en admin.js a partir de esto.
async function obtenerDatosContabilidad(anio) {
  // pedidos/pagos guardan hora UTC: el 1 de enero a medianoche de Perú en UTC (toISOString) es
  // el corte exacto del año local. gastos.fecha es una fecha simple, sin hora.
  const desdeUtc = new Date(anio, 0, 1).toISOString();
  const hastaUtc = new Date(anio + 1, 0, 1).toISOString();
  const desde = `${anio}-01-01`;
  const hasta = `${anio + 1}-01-01`;
  const camposPedido = (conCosto) => `id, fecha_creacion, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, canal, tipo_pedido, cancelado, cliente_nombre, cliente_dni, cliente_telefono, perfiles(nombres, apellidos), detalle_pedido(cantidad, subtotal, talla_ml, descripcion_libre${conCosto ? ', costo_unitario' : ''}, perfumes(id, nombre, marca, es_decant, costo_importacion_pen))`;
  const traerPedidos = (conCosto) => seleccionarTodo(() => supabaseClient
    .from('pedidos')
    .select(camposPedido(conCosto))
    .gte('fecha_creacion', desdeUtc)
    .lt('fecha_creacion', hastaUtc)
    .order('id'));
  const [pedidos, pagos, gastos] = await Promise.all([
    // costo_unitario (costo guardado en cada venta) existe desde la migración 0022; si todavía no
    // se corrió, se usa el costo actual del perfume como antes.
    traerPedidos(true).catch((err) => (/costo_unitario/.test(err.message) ? traerPedidos(false) : Promise.reject(err))),
    seleccionarTodo(() => supabaseClient
      .from('pagos')
      .select('id, monto, metodo_pago, fecha_pago, id_pedido')
      .eq('estado_pago', 'Aprobado')
      .gte('fecha_pago', desdeUtc)
      .lt('fecha_pago', hastaUtc)
      .order('id')),
    seleccionarTodo(() => supabaseClient
      .from('gastos')
      .select('*')
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .order('fecha')
      .order('id')),
  ]);
  return { pedidos: pedidos.map((p) => ({ ...p, cliente: nombreClientePedido(p) })), pagos, gastos };
}

const CATEGORIAS_GASTO = ['Mercadería', 'Envíos', 'Empaques', 'Publicidad', 'Alquiler', 'Servicios', 'Sueldos', 'Impuestos', 'Otros'];

async function crearGasto(gasto) {
  const { error } = await supabaseClient.from('gastos').insert(limpiarCamposGasto(gasto));
  if (error) throw new Error(traducirErrorGasto(error));
}

async function actualizarGasto(id, gasto) {
  const { error } = await supabaseClient.from('gastos').update(limpiarCamposGasto(gasto, true)).eq('id', id);
  if (error) throw new Error(traducirErrorGasto(error));
}

// proveedor / comprobante son de la migración 0022: si vienen vacíos no se mandan al crear, así un
// gasto simple se sigue guardando aunque la migración todavía no se haya corrido.
function limpiarCamposGasto(gasto, esEdicion = false) {
  const datos = { ...gasto };
  ['proveedor', 'comprobante_path'].forEach((c) => {
    if (!datos[c]) {
      if (esEdicion && c === 'proveedor' && c in datos) datos[c] = null;
      else delete datos[c];
    }
  });
  return datos;
}

function traducirErrorGasto(error) {
  return /proveedor|comprobante_path/.test(error.message) ? 'Falta correr la migración 0022 en Supabase (proveedor y comprobante de gastos).' : error.message;
}

// Comprobantes de gastos: bucket PRIVADO (migración 0022). Se guarda la ruta, y para verlos se
// pide un link temporal (1 hora) -- nadie fuera del panel puede abrirlos.
const BUCKET_COMPROBANTES = 'comprobantes';

async function subirComprobanteGasto(file) {
  const esPdf = file.type === 'application/pdf';
  const archivo = esPdf ? file : await comprimirImagen(file);
  if (archivo.size > 5 * 1024 * 1024) throw new Error('El comprobante pesa más de 5 MB: usa una foto más liviana.');
  const ext = esPdf ? 'pdf' : (({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' })[archivo.type] || 'jpg');
  const hoy = new Date();
  const ruta = `${hoy.getFullYear()}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage.from(BUCKET_COMPROBANTES).upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (error) throw new Error(/bucket not found/i.test(error.message) ? 'Falta crear el espacio de comprobantes: corre la migración 0022 en Supabase.' : traducirErrorStorage(error));
  return ruta;
}

async function urlComprobanteGasto(ruta) {
  const { data, error } = await supabaseClient.storage.from(BUCKET_COMPROBANTES).createSignedUrl(ruta, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

async function borrarComprobanteGasto(ruta) {
  if (!ruta) return;
  await supabaseClient.storage.from(BUCKET_COMPROBANTES).remove([ruta]).catch(() => {});
}

// Cuentas por cobrar: todos los pedidos vigentes con saldo, de cualquier fecha (lo más antiguo
// primero: es lo que más urge cobrar).
async function obtenerCuentasPorCobrar() {
  const filas = await seleccionarTodo(() => supabaseClient
    .from('pedidos')
    .select('id, fecha_creacion, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, canal, tipo_pedido, cliente_nombre, cliente_telefono, perfiles(nombres, apellidos, telefono)')
    .eq('cancelado', false)
    .gt('monto_saldo_pendiente', 0)
    .order('fecha_creacion', { ascending: true })
    .order('id', { ascending: true }));
  return filas.map((p) => ({ ...p, cliente: nombreClientePedido(p), telefono: p.cliente_telefono || p.perfiles?.telefono || '' }));
}

// Caja de un día (fecha local "YYYY-MM-DD"): lo que entró (pagos), lo que salió (gastos) y las
// ventas registradas ese día.
async function obtenerCajaDelDia(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  const desde = new Date(a, m - 1, d).toISOString();
  const hasta = new Date(a, m - 1, d + 1).toISOString();
  const [pagos, gastos, pedidos] = await Promise.all([
    supabaseClient.from('pagos')
      .select('id, monto, metodo_pago, fecha_pago, id_pedido, pedidos(cliente_nombre, perfiles(nombres, apellidos))')
      .eq('estado_pago', 'Aprobado').gte('fecha_pago', desde).lt('fecha_pago', hasta).order('fecha_pago'),
    supabaseClient.from('gastos').select('*').eq('fecha', fecha).order('id'),
    supabaseClient.from('pedidos')
      .select('id, monto_total, canal, cancelado, cliente_nombre, perfiles(nombres, apellidos)')
      .gte('fecha_creacion', desde).lt('fecha_creacion', hasta).order('id'),
  ]);
  const error = pagos.error || gastos.error || pedidos.error;
  if (error) throw new Error(error.message);
  return {
    pagos: (pagos.data || []).map((pg) => ({ ...pg, cliente: pg.pedidos ? nombreClientePedido(pg.pedidos) : '—' })),
    gastos: gastos.data || [],
    pedidos: (pedidos.data || []).filter((p) => !p.cancelado).map((p) => ({ ...p, cliente: nombreClientePedido(p) })),
  };
}

// Ingreso de mercadería en una sola operación (migración 0022): stock, costo promedio, precio,
// publicar y el gasto de la compra. Devuelve el total de la compra.
async function registrarIngresoMercaderia(items, nota, gasto) {
  const { data, error } = await supabaseClient.rpc('registrar_ingreso_mercaderia', { p_items: items, p_nota: nota, p_gasto: gasto });
  if (error) {
    const err = new Error(error.message);
    err.faltaMigracion = /registrar_ingreso_mercaderia|could not find the function|PGRST202/i.test(`${error.message} ${error.code}`);
    throw err;
  }
  const total = (data || []).find((f) => f.id_producto == null);
  return { totalCompra: Number(total?.total_compra || 0) };
}

async function eliminarGasto(id) {
  const { error } = await supabaseClient.from('gastos').delete().eq('id', id);
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

// detalle_consolidado.id_consolidado y pedidos.id_consolidado_asociado referencian a
// consolidados sin "on delete cascade" a propósito -- si la campaña ya tiene reservas o
// pedidos generados, Postgres rechaza el delete (código 23503) en vez de arrastrarse todo el
// historial. Acá se traduce ese error a algo que el admin entienda, en vez del mensaje crudo
// de Postgres.
async function eliminarConsolidadoAdmin(id) {
  const { error } = await supabaseClient.from('consolidados').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: esta campaña ya tiene reservas o pedidos generados. Cámbiale el estado a Cancelado en vez de eliminarla.');
    }
    throw new Error(error.message);
  }
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
  // Qué hay que pedir al proveedor = reservas web que todavía no pasaron a pedido (Reservado /
  // Confirmado) + TODAS las líneas de los pedidos no anulados de la campaña (los generados desde
  // reservas y los encargos registrados a mano desde WhatsApp, incluidas sus líneas libres).
  // Así una reserva ya convertida no se cuenta dos veces.
  const [{ data: detalle, error: e1 }, { data: pedidos, error: e2 }] = await Promise.all([
    supabaseClient
      .from('detalle_consolidado')
      .select('cantidad, precio_consolidado_aplicado, estado_item, perfumes(id, nombre, marca, costo_importacion_pen, mililitros)')
      .eq('id_consolidado', idConsolidado)
      .in('estado_item', ['Reservado', 'Confirmado']),
    supabaseClient
      .from('pedidos')
      .select('id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, detalle_pedido(cantidad, precio_unitario_aplicado, subtotal, descripcion_libre, perfumes(id, nombre, marca, costo_importacion_pen, mililitros))')
      .eq('id_consolidado_asociado', idConsolidado)
      .eq('tipo_pedido', 'Consolidado')
      .eq('cancelado', false),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const porProducto = new Map();
  const sumar = (prod, descripcionLibre, cantidad, precio) => {
    const clave = prod ? `p${prod.id}` : `l${(descripcionLibre || '').trim().toLowerCase()}`;
    if (!porProducto.has(clave)) {
      porProducto.set(clave, prod
        ? { ...prod, unidades: 0, montoEsperado: 0, costoTotal: 0 }
        : { nombre: descripcionLibre, marca: '', mililitros: null, costo_importacion_pen: null, es_libre: true, unidades: 0, montoEsperado: 0, costoTotal: 0 });
    }
    const entry = porProducto.get(clave);
    entry.unidades += cantidad;
    entry.montoEsperado += cantidad * Number(precio);
    entry.costoTotal += cantidad * Number(prod?.costo_importacion_pen || 0);
  };
  (detalle || []).forEach((d) => sumar(d.perfumes, null, d.cantidad, d.precio_consolidado_aplicado));
  (pedidos || []).forEach((p) => (p.detalle_pedido || []).forEach((i) => sumar(i.perfumes, i.descripcion_libre, i.cantidad, i.precio_unitario_aplicado)));

  const productos = [...porProducto.values()].sort((a, b) => b.unidades - a.unidades);
  return {
    productos,
    unidadesTotales: productos.reduce((acc, p) => acc + p.unidades, 0),
    montoTotalReservado: productos.reduce((acc, p) => acc + p.montoEsperado, 0),
    costoTotalImportacion: productos.reduce((acc, p) => acc + p.costoTotal, 0),
    lineasSinCosto: productos.filter((p) => !p.costo_importacion_pen).length,
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
      id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, fecha_creacion, canal,
      cliente_nombre, cliente_dni, cliente_telefono, envio_tipo, envio_agencia, envio_distrito, envio_provincia, envio_departamento,
      perfiles(nombres, apellidos, telefono, correo),
      detalle_pedido(cantidad, precio_unitario_aplicado, subtotal, descripcion_libre, perfumes(nombre, marca))
    `)
    .eq('id_consolidado_asociado', idConsolidado)
    .eq('tipo_pedido', 'Consolidado')
    .eq('cancelado', false)
    .order('id');
  if (error) throw new Error(error.message);

  const filas = [];
  (data || []).forEach((pedido) => {
    const cliente = nombreClientePedido(pedido);
    (pedido.detalle_pedido || []).forEach((item) => {
      filas.push({
        'N° Pedido': pedido.id,
        Cliente: cliente,
        DNI: pedido.cliente_dni || '',
        Teléfono: pedido.cliente_telefono || pedido.perfiles?.telefono || '',
        Correo: pedido.perfiles?.correo || '',
        Destino: [etiquetaEntregaApi(pedido.envio_tipo), pedido.envio_agencia, pedido.envio_distrito, pedido.envio_departamento].filter(Boolean).join(' · '),
        Marca: item.perfumes?.marca || '',
        Perfume: item.perfumes?.nombre || item.descripcion_libre || '',
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
function etiquetaEntregaApi(tipo) {
  if (!tipo) return '';
  if (tipo === 'Recojo_En_Tienda') return etiquetaRecojoEnTienda();
  return { Agencia_Shalom: 'Agencia Shalom', Agencia_Olva: 'Agencia Olva', Domicilio: 'Delivery' }[tipo] || tipo;
}

function formatearEntrega(dir) {
  if (!dir) return 'Sin dirección registrada';
  if (dir.tipo_despacho === 'Recojo_En_Tienda') return etiquetaRecojoEnTienda();
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
        id, monto_total, cliente_nombre, cliente_dni, cliente_telefono, envio_tipo, envio_agencia, envio_direccion, envio_distrito, envio_departamento,
        perfiles(nombres, apellidos, dni_ce_ruc, telefono),
        direcciones_cliente(tipo_despacho, agencia_nombre, direccion_detalle),
        detalle_pedido(cantidad, descripcion_libre, perfumes(nombre, marca))
      `)
      .eq('id_consolidado_asociado', idConsolidado)
      .eq('tipo_pedido', 'Consolidado')
      .eq('cancelado', false)
      .order('id');
    if (error) throw new Error(error.message);
    return (data || []).map((p) => ({
      cliente: nombreClientePedido(p),
      dni: p.cliente_dni || p.perfiles?.dni_ce_ruc || '—',
      celular: p.cliente_telefono || p.perfiles?.telefono || '—',
      entrega: p.envio_tipo
        ? formatearEntrega({ tipo_despacho: p.envio_tipo, agencia_nombre: p.envio_agencia, direccion_detalle: [p.envio_direccion, p.envio_distrito, p.envio_departamento].filter(Boolean).join(', ') })
        : formatearEntrega(p.direcciones_cliente),
      items: (p.detalle_pedido || []).map((i) => `${i.perfumes ? `${i.perfumes.marca} — ${i.perfumes.nombre}` : i.descripcion_libre} x${i.cantidad}`),
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

/* ================= LIBRO DE RECLAMACIONES ================= */

async function obtenerReclamosAdmin({ estado } = {}) {
  let query = supabaseClient.from('libro_reclamaciones').select('*').order('fecha_registro', { ascending: false });
  if (estado) query = query.eq('estado', estado);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function responderReclamoAdmin(id, { respuesta, estado }) {
  const cambios = { respuesta, estado };
  if (estado === 'Respondido') cambios.fecha_respuesta = new Date().toISOString();
  const { error } = await supabaseClient.from('libro_reclamaciones').update(cambios).eq('id', id);
  if (error) throw new Error(error.message);
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
  // telefono_contacto es el que deja un invitado sin cuenta (el caso más común acá) --
  // perfiles.telefono solo existe si cotizó con sesión iniciada. Se prioriza el de la cuenta
  // por si el invitado dejó un teléfono viejo al registrarse después, pero casi siempre es el
  // mismo dato viniendo de un solo lado.
  return data.map((c) => ({
    ...c,
    cliente: c.perfiles ? `${c.perfiles.nombres} ${c.perfiles.apellidos}` : (c.nombre_contacto || '—'),
    correo_cliente: c.perfiles?.correo || c.correo_contacto,
    telefono_cliente: c.perfiles?.telefono || c.telefono_contacto,
  }));
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
  if (error) {
    if (/imagenes|mostrar_en/.test(error.message)) throw new Error('Falta correr la migración 0020 en Supabase (fotos del anuncio). Ver README.');
    throw new Error(error.message);
  }
}

/* ================= FOTOS (Supabase Storage, bucket "imagenes" — migración 0020) ================= */

const BUCKET_IMAGENES = 'imagenes';

// Achica la foto en el navegador antes de subirla (lado mayor 1600 px, WebP o JPEG): una foto de
// celular de 4-8 MB queda en ~200-400 KB, carga rápido en el anuncio y no llena el Storage.
// Los GIF se suben tal cual (perderían la animación).
//
// La foto se lee con un <img> normal y no con createImageBitmap(): en algunos celulares (sobre
// todo iPhone/Safari) createImageBitmap entregaba la imagen vacía y se subía una foto en BLANCO
// sin ningún error; además <img> respeta la orientación de la foto (no sale girada). Si aun así
// el dibujo sale vacío, se sube la foto original en vez de una en blanco.
const TIPOS_IMAGEN_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

function leerImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, liberar: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

// true si el dibujo quedó vacío (todo transparente): pasa cuando el navegador no pudo pintar la foto.
function canvasVacio(canvas) {
  const ctx = canvas.getContext('2d');
  for (let fy = 1; fy <= 4; fy++) {
    for (let fx = 1; fx <= 4; fx++) {
      const x = Math.min(canvas.width - 1, Math.floor((canvas.width * fx) / 5));
      const y = Math.min(canvas.height - 1, Math.floor((canvas.height * fy) / 5));
      if (ctx.getImageData(x, y, 1, 1).data[3] !== 0) return false;
    }
  }
  return true;
}

function originalSubible(file) {
  if (!TIPOS_IMAGEN_ACEPTADOS.includes(file.type)) {
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || '')) {
      throw new Error('Esa foto está en formato HEIC (iPhone). Envíatela por WhatsApp o cámbiala a JPG y vuelve a subirla (en el iPhone: Ajustes → Cámara → Formatos → Más compatible).');
    }
    throw new Error('Ese formato de imagen no se puede subir: usa JPG, PNG o WebP.');
  }
  return file;
}

async function comprimirImagen(file, { maxLado = 1600, calidad = 0.86 } = {}) {
  if (!file || !(file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name || ''))) throw new Error('El archivo no es una imagen');
  if (file.type === 'image/gif') return file;
  let lectura;
  try {
    lectura = await leerImagen(file);
  } catch {
    return originalSubible(file);
  }
  const { img, liberar } = lectura;
  try {
    const ancho = img.naturalWidth;
    const alto = img.naturalHeight;
    if (!ancho || !alto) return originalSubible(file);
    const escala = Math.min(1, maxLado / Math.max(ancho, alto));
    if (escala === 1 && file.size <= 450 * 1024 && TIPOS_IMAGEN_ACEPTADOS.includes(file.type)) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(ancho * escala));
    canvas.height = Math.max(1, Math.round(alto * escala));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (canvasVacio(canvas)) return originalSubible(file);
    const aBlob = (tipo) => new Promise((r) => canvas.toBlob(r, tipo, calidad));
    let blob = await aBlob('image/webp');
    // Safari viejo no sabe codificar WebP (devuelve PNG, más pesado): ahí se usa JPEG con fondo
    // blanco (el JPEG no tiene transparencia y lo transparente saldría negro).
    if (!blob || blob.type !== 'image/webp') {
      const fondo = document.createElement('canvas');
      fondo.width = canvas.width;
      fondo.height = canvas.height;
      const ctxFondo = fondo.getContext('2d');
      ctxFondo.fillStyle = '#ffffff';
      ctxFondo.fillRect(0, 0, fondo.width, fondo.height);
      ctxFondo.drawImage(canvas, 0, 0);
      blob = await new Promise((r) => fondo.toBlob(r, 'image/jpeg', calidad));
    }
    if (!blob || !blob.size) return originalSubible(file);
    if (blob.size >= file.size && TIPOS_IMAGEN_ACEPTADOS.includes(file.type)) return file;
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${(file.name || 'foto').replace(/\.[^.]+$/, '')}.${ext}`, { type: blob.type });
  } finally {
    liberar();
  }
}

function traducirErrorStorage(error) {
  const m = error?.message || String(error);
  if (/bucket not found/i.test(m)) return 'Falta crear el espacio de fotos: corre la migración 0020 en Supabase (ver README).';
  if (/row-level security|unauthorized|403|permission/i.test(m)) return 'Tu cuenta no tiene permiso para subir fotos (tiene que ser administrador).';
  if (/payload too large|size/i.test(m)) return 'La foto es demasiado pesada (máximo 5 MB).';
  if (/mime|content.type|not supported/i.test(m)) return 'Ese formato de imagen no se puede subir: usa JPG, PNG o WebP.';
  return m;
}

// Carpeta de las fotos del anuncio. NO puede llamarse "publicidad" (ni "anuncios", "ads",
// "banners"...): EasyList trae la regla "/publicidad/*" y todo bloqueador de anuncios (uBlock,
// AdBlock, Brave, Opera) esconde cualquier foto con esa ruta. La foto se subía bien pero en esos
// navegadores salía en blanco, en el panel y en el anuncio de la tienda.
const CARPETA_FOTOS_ANUNCIO = 'vitrina';

// Sube una foto al bucket público y devuelve su URL (sirve directo en imagen_url / anuncio).
async function subirImagen(file, carpeta = CARPETA_FOTOS_ANUNCIO) {
  const archivo = await comprimirImagen(file);
  if (archivo.size > 5 * 1024 * 1024) throw new Error('La foto pesa más de 5 MB incluso comprimida: usa una más liviana.');
  const ext = ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/avif': 'avif' })[archivo.type] || 'jpg';
  const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage.from(BUCKET_IMAGENES).upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(traducirErrorStorage(error));
  return supabaseClient.storage.from(BUCKET_IMAGENES).getPublicUrl(ruta).data.publicUrl;
}

// Borra del Storage una foto que ya no se usa (solo si es una subida al bucket; las rutas
// "assets/img/..." del sitio no se tocan). Si falla no pasa nada: queda una foto huérfana.
async function borrarImagenSubida(url) {
  const marca = `/storage/v1/object/public/${BUCKET_IMAGENES}/`;
  if (!url || !url.includes(marca)) return;
  const ruta = decodeURIComponent(url.split(marca)[1].split('?')[0]);
  await supabaseClient.storage.from(BUCKET_IMAGENES).remove([ruta]).catch(() => {});
}

// Copia a la carpeta nueva las fotos del anuncio que quedaron en "publicidad/" (las bloqueadas).
// Devuelve la lista con las URLs nuevas; la que no se pudo copiar queda igual.
async function moverFotosAnuncioBloqueadas(urls) {
  const marca = `/storage/v1/object/public/${BUCKET_IMAGENES}/publicidad/`;
  let cambio = false;
  const nuevas = [];
  for (const url of urls) {
    if (!url || !url.includes(marca)) { nuevas.push(url); continue; }
    const nombre = decodeURIComponent(url.split(marca)[1].split('?')[0]);
    const destino = `${CARPETA_FOTOS_ANUNCIO}/${nombre}`;
    const { error } = await supabaseClient.storage.from(BUCKET_IMAGENES).copy(`publicidad/${nombre}`, destino);
    // "already exists": otra pestaña del panel ya la copió.
    if (error && !/exist|duplicate/i.test(error.message)) { nuevas.push(url); continue; }
    nuevas.push(supabaseClient.storage.from(BUCKET_IMAGENES).getPublicUrl(destino).data.publicUrl);
    cambio = true;
  }
  return { urls: nuevas, cambio };
}

// Guarda solo las fotos del anuncio (sin tocar título, fechas ni si está activo).
async function actualizarFotosPublicidad(imagenes) {
  const { error } = await supabaseClient.from('publicidad_popup').update({ imagenes, imagen_url: imagenes[0] || null }).eq('id', 1);
  if (error) throw new Error(error.message);
}

/* ================= PERFUMES SOLO POR CONSOLIDADO ================= */

// Perfumes que no están en el catálogo y el admin agrega solo con nombre y precio para que se
// puedan pedir por consolidado. Se guardan con estado 'Bajo_Pedido': aparecen únicamente en el
// Catálogo Consolidado (nunca en la tienda, ver obtenerProductos en api.js).
async function obtenerPerfumesSoloConsolidado() {
  const { data, error } = await supabaseClient
    .from('perfumes')
    .select('id, slug, nombre, marca, mililitros, genero, imagen_url, precio_consolidado_fijo, activo, fecha_creacion')
    .eq('estado', 'Bajo_Pedido')
    .eq('es_decant', false)
    .order('fecha_creacion', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function crearPerfumeConsolidado({ marca, nombre, mililitros = 100, genero = 'Unisex', tipo_casa = null, precio, imagen_url = null }) {
  const payload = {
    marca, nombre, mililitros, genero, tipo_casa, imagen_url,
    precio_tienda_regular: precio,
    precio_consolidado_fijo: precio,
    estado: 'Bajo_Pedido',
    activo: true,
    es_decant: false,
    margen_aplicado: true,
  };
  const base = `${generarSlug(nombre, marca)}-${mililitros}ml-consolidado`;
  for (let intento = 0; intento < 4; intento++) {
    const slug = intento ? `${base}-${intento + 1}` : base;
    const { data, error } = await supabaseClient.from('perfumes').insert({ ...payload, slug }).select('id').single();
    if (!error) return data.id;
    if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error('Ya existe un perfume con ese nombre y marca en el consolidado');
}

// El precio de consolidado y el de tienda van iguales (este perfume no se vende en tienda).
async function actualizarPerfumeConsolidado(id, cambios) {
  const payload = { ...cambios };
  if (payload.precio != null) {
    payload.precio_consolidado_fijo = payload.precio;
    payload.precio_tienda_regular = payload.precio;
    delete payload.precio;
  }
  const { error } = await supabaseClient.from('perfumes').update(payload).eq('id', id);
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
