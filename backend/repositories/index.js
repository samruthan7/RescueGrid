const supabaseRepository = require('./supabaseRepository');
const jsonRepository = require('./jsonRepository');
const { isConfigured } = require('../lib/supabase');

const driver = process.env.DEMO_MODE === 'true' ? 'json' : (process.env.STORAGE_DRIVER || 'supabase').toLowerCase();

let selectedRepository;

if (driver === 'json') {
  console.log('[Storage] Using JSON file storage driver (backend/data/incidents.json)');
  selectedRepository = jsonRepository;
} else {
  if (isConfigured) {
    console.log('[Storage] Using Supabase PostgreSQL + PostGIS storage driver');
    selectedRepository = supabaseRepository;
  } else {
    console.warn('[Storage] Warning: STORAGE_DRIVER is supabase but Supabase credentials are not configured. Falling back to JSON storage.');
    selectedRepository = jsonRepository;
  }
}

module.exports = selectedRepository;
