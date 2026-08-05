// Edge Function: cotizacion-publica
// Gatekeeper de verdad (a nivel de servidor) delante de solicitudes_cotizacion.
// El honeypot + debounce en contacto.js son solo cosmética de navegador; esto es lo que
// realmente limita cuántas cotizaciones puede meter una misma IP.
//
// Despliegue: supabase functions deploy cotizacion-publica
// No necesita secretos nuevos: SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY
// ya vienen inyectados automáticamente en el runtime de Edge Functions.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LIMITE_POR_HORA = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const nombrePerfume = String(payload.nombre_perfume_solicitado || '').trim();
  const marca = String(payload.marca_solicitada || '').trim();
  if (!nombrePerfume || !marca) {
    return json({ error: 'Falta el nombre del perfume o la marca' }, 400);
  }
  if (nombrePerfume.length > 150 || marca.length > 100) {
    return json({ error: 'Nombre o marca demasiado largos' }, 400);
  }

  // Cliente "de usuario": respeta RLS con el JWT que venga en el header (o anon si no hay sesión).
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUsuario = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabaseUsuario.auth.getUser();

  if (!user && !String(payload.telefono_contacto || '').trim()) {
    return json({ error: 'Ingresa un WhatsApp de contacto' }, 400);
  }

  // Cliente "admin": solo para el contador de rate limit (tabla sin políticas RLS públicas).
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'desconocida';
  const ventanaHora = new Date();
  ventanaHora.setMinutes(0, 0, 0);
  const clave = `cotizacion:${ip}`;

  const { data: fila } = await supabaseAdmin
    .from('rate_limits')
    .select('conteo')
    .eq('clave', clave)
    .eq('ventana', ventanaHora.toISOString())
    .maybeSingle();

  if (fila && fila.conteo >= LIMITE_POR_HORA) {
    return json({ error: 'Demasiadas solicitudes desde tu conexión. Intenta de nuevo en un rato, o escríbenos directo por WhatsApp.' }, 429);
  }

  await supabaseAdmin
    .from('rate_limits')
    .upsert(
      { clave, ventana: ventanaHora.toISOString(), conteo: (fila?.conteo || 0) + 1 },
      { onConflict: 'clave,ventana' }
    );

  const datos = {
    id_cliente: user ? user.id : null,
    nombre_contacto: payload.nombre_contacto ? String(payload.nombre_contacto).slice(0, 150) : null,
    telefono_contacto: payload.telefono_contacto ? String(payload.telefono_contacto).slice(0, 20) : null,
    correo_contacto: payload.correo_contacto ? String(payload.correo_contacto).slice(0, 150) : null,
    nombre_perfume_solicitado: nombrePerfume,
    marca_solicitada: marca,
    concentracion: payload.concentracion ? String(payload.concentracion).slice(0, 50) : null,
    mililitros: payload.mililitros ? Number(payload.mililitros) : null,
    notas_cliente: payload.notas_cliente ? String(payload.notas_cliente).slice(0, 2000) : null,
  };

  const { error } = await supabaseUsuario.from('solicitudes_cotizacion').insert(datos);
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
});
