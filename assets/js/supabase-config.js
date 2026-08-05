// ==========================================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos dos valores con los de tu propio proyecto:
// Panel de Supabase -> Project Settings -> API
// ==========================================================
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-AQUI';

const SUPABASE_CONFIGURADO = !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU-ANON-KEY');

// Nota: se usa "supabaseClient" (no "supabase") para no chocar con el
// objeto global que crea la librería CDN (window.supabase).
const supabaseClient = SUPABASE_CONFIGURADO
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!SUPABASE_CONFIGURADO) {
  console.warn('Supabase no está configurado todavía. Edita assets/js/supabase-config.js con tu URL y anon key (ver README.md).');
}
