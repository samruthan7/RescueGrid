const { isConfigured } = require('./lib/supabase');
module.exports = process.env.DEMO_MODE === 'true' || (process.env.STORAGE_DRIVER || 'supabase').toLowerCase() === 'json' || !isConfigured
  ? require('./repositories/jsonTeamRepository') : require('./repositories/supabaseTeamRepository');
