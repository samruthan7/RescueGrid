const { createClient } = require('@supabase/supabase-js');

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip trailing /rest/v1 or /rest/v1/ if present
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  // Strip trailing slash
  cleaned = cleaned.replace(/\/$/, '');
  return cleaned;
}

const rawUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseUrl = normalizeSupabaseUrl(rawUrl);

let supabase = null;

if (supabaseUrl && serviceRoleKey) {
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

module.exports = {
  supabase,
  supabaseUrl,
  isConfigured: !!supabase,
};
