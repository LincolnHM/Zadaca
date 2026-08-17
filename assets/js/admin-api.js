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
    supabaseClient.from('pedidos').select('monto_total, estado_pago', { count: 'exact' }).eq('tipo_pedido', 'Directo_Tienda'),
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

  const ingresos = (pedidos.data || [])
    .filter((p) => p.estado_pago === 'Completado')
    .reduce((acc, p) => acc + Number(p.monto_total), 0);

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

/* ================= PRODUCTOS ================= */

async function obtenerProductosAdmin({ busqueda } = {}) {
  let query = supabaseClient.from('perfumes').select('*, inventario(stock_fisico, stock_reservado_consolidados, stock_disponible, stock_minimo_alerta)').order('fecha_creacion', { ascending: false });
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map((p) => ({ ...p, inventario: Array.isArray(p.inventario) ? p.inventario[0] : p.inventario }));
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

async function obtenerProductosParaMargenes({ busqueda, soloSinMargen } = {}) {
  let query = supabaseClient
    .from('perfumes')
    .select('id, nombre, marca, costo_importacion_pen, precio_consolidado_fijo, precio_tienda_regular, margen_aplicado')
    .order('marca', { ascending: true });
  if (busqueda) query = query.or(`nombre.ilike.%${escaparFiltroSupabase(busqueda)}%,marca.ilike.%${escaparFiltroSupabase(busqueda)}%`);
  if (soloSinMargen) query = query.eq('margen_aplicado', false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
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

async function obtenerPedidosAdmin({ busqueda, estadoPago } = {}) {
  let query = supabaseClient
    .from('pedidos')
    .select('id, monto_total, monto_adelanto_pagado, monto_saldo_pendiente, estado_pago, fecha_creacion, perfiles(nombres, apellidos, correo, telefono), envios(estado_envio, numero_guia_seguimiento, empresa_transporte)')
    .eq('tipo_pedido', 'Directo_Tienda')
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
  }));
  if (busqueda) {
    const q = busqueda.toLowerCase();
    pedidos = pedidos.filter((p) => p.cliente.toLowerCase().includes(q) || String(p.id).includes(q) || (p.correo_cliente || '').toLowerCase().includes(q));
  }
  return pedidos;
}

async function obtenerDetallePedidoAdmin(id) {
  const { data: pedido, error } = await supabaseClient
    .from('pedidos')
    .select('*, perfiles(nombres, apellidos, correo, telefono), envios(*), direcciones_cliente(direccion_detalle, etiqueta, tipo_despacho, agencia_nombre, ubigeo(departamento, provincia, distrito))')
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
    .select('id, cantidad, precio_consolidado_aplicado, estado_item, fecha_reserva, consolidados(id, codigo_campana, estado), perfiles(nombres, apellidos, correo), perfumes(nombre, marca)')
    .order('fecha_reserva', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let reservas = data.map((r) => ({
    ...r,
    cliente: r.perfiles ? `${r.perfiles.nombres} ${r.perfiles.apellidos}` : '—',
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
  const { count: pedidosCount } = await supabaseClient
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('id_consolidado_asociado', idConsolidado)
    .eq('tipo_pedido', 'Consolidado');

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
