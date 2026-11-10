require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const incidentRoutes = require('./routes/incidentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const citizenRoutes = require('./routes/citizenRoutes');
const hotspotRoutes = require('./routes/hotspotRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting on public reporting endpoint (prevent spam submissions)
const reportRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many incident reports submitted from this network. Please wait a few minutes before submitting another report.'
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'RescueGrid Emergency Response API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Database Health check endpoint
app.get('/api/health/db', async (req, res) => {
  const driver = process.env.DEMO_MODE === 'true' ? 'json' : (process.env.STORAGE_DRIVER || 'supabase').toLowerCase();
  const startTime = Date.now();

  if (driver === 'json') {
    return res.json({
      status: 'connected',
      driver: 'json',
      message: 'Using offline JSON repository (backend/data/incidents.json)',
      timestamp: new Date().toISOString()
    });
  }

  const { supabase, isConfigured } = require('./lib/supabase');

  if (!isConfigured) {
    return res.status(503).json({
      status: 'disconnected',
      driver: 'supabase',
      error: 'Supabase URL or Service Role Key is not configured in environment',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { count, error } = await supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      const hint = error.code === 'PGRST205'
        ? 'Tables not found. Please execute supabase/schema.sql in your Supabase project SQL Editor.'
        : undefined;

      return res.status(503).json({
        status: 'error',
        driver: 'supabase',
        error: error.message,
        code: error.code,
        hint,
        latencyMs,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      status: 'connected',
      driver: 'supabase',
      incidentCount: count,
      latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      driver: 'supabase',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Citizen Routes (Auth & My Reports)
app.use('/api/citizen', citizenRoutes);

// Citizen AI Assistant
app.use('/api/citizen/assistant', assistantRoutes);

// Public Incident Routes
app.use('/api/incidents', reportRateLimiter, incidentRoutes);

// Geospatial Hotspot Public & Proximity Routes
app.use('/api/hotspots', hotspotRoutes);

// Authority Dashboard Routes
app.use('/api/admin', adminRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized JSON Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[RescueGrid Backend] Server running on http://localhost:${PORT}`);
    console.log(`[RescueGrid Backend] Accepting requests from: ${CLIENT_ORIGIN}`);
  });
}

module.exports = app;
