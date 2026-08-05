// Edge Function: notify-email (OPCIONAL)
// Se dispara con un Database Webhook de Supabase cada vez que se inserta una fila en
// "notificaciones", y le manda al cliente un correo con el mismo mensaje que ya ve en la
// campanita del sitio. Si no configuras RESEND_API_KEY, esta función no hace nada (no rompe
// nada): las notificaciones en la web siguen funcionando igual sin ella.
//
// Configuración (ambos pasos son opcionales, no bloquean el resto del sitio):
// 1. Consigue una API key gratis en https://resend.com (plan free: 3000 correos/mes) y
//    verifica tu dominio o usa su dominio de pruebas.
// 2. supabase secrets set RESEND_API_KEY=re_xxxxx
// 3. supabase functions deploy notify-email
// 4. En el dashboard de Supabase: Database → Webhooks → New Webhook
//    - Tabla: notificaciones · Evento: INSERT · destino: esta función.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    // No configurado todavía — respondemos ok para que el webhook no quede reintentando.
    return new Response(JSON.stringify({ skipped: true, motivo: 'RESEND_API_KEY no configurada' }), { status: 200 });
  }

  const REMITENTE = Deno.env.get('NOTIFY_EMAIL_FROM') || 'Maison Zadaca <onboarding@resend.dev>';
  // Configura esto con: supabase secrets set SITE_URL=https://tu-usuario.github.io/tu-repo
  const SITE_URL = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '');

  try {
    const payload = await req.json();
    const fila = payload.record; // formato estándar del Database Webhook de Supabase

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('correo, nombres')
      .eq('id', fila.id_cliente)
      .single();

    if (!perfil?.correo) {
      return new Response(JSON.stringify({ skipped: true, motivo: 'Cliente sin correo' }), { status: 200 });
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: REMITENTE,
        to: perfil.correo,
        subject: fila.titulo,
        html: `<p>Hola ${perfil.nombres || ''},</p><p>${fila.mensaje}</p>${
          fila.url_destino && SITE_URL ? `<p><a href="${SITE_URL}/${fila.url_destino}">Ver en Maison Zadaca</a></p>` : ''
        }<p style="color:#999;font-size:12px;">Maison Zadaca</p>`,
      }),
    });

    if (!resp.ok) {
      const detalle = await resp.text();
      return new Response(JSON.stringify({ error: detalle }), { status: 200 }); // 200: no queremos que Supabase reintente infinito
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200 });
  }
});
