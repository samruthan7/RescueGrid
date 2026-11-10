-- =============================================================================
-- RescueGrid Supabase Database Schema (PostgreSQL + PostGIS)
-- Code Clash 2026 - Emergency Incident Reporting & Monitoring Platform
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. CITIZENS TABLE
CREATE TABLE IF NOT EXISTS citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY, -- Formatted as INC-XXXX
    citizen_id UUID REFERENCES citizens(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    people_affected INT NOT NULL DEFAULT 0,
    trapped BOOLEAN NOT NULL DEFAULT FALSE,
    immediate_danger BOOLEAN NOT NULL DEFAULT FALSE,
    injuries TEXT NOT NULL DEFAULT 'Unknown',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location geography(Point, 4326) GENERATED ALWAYS AS (
        CASE 
            WHEN lat IS NOT NULL AND lng IS NOT NULL 
            THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography 
            ELSE NULL 
        END
    ) STORED,
    address_text TEXT NOT NULL,
    rule_score INT NOT NULL DEFAULT 0,
    rule_severity TEXT NOT NULL DEFAULT 'Low',
    rule_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_status TEXT NOT NULL DEFAULT 'none' CHECK (ai_status IN ('none', 'pending', 'done', 'failed')),
    ai_severity TEXT,
    ai_confidence NUMERIC,
    ai_analysis JSONB,
    final_severity TEXT NOT NULL DEFAULT 'Low',
    severity_override TEXT,
    assigned_team_id TEXT,
    assigned_at TIMESTAMPTZ,
    priority_score NUMERIC NOT NULL DEFAULT 0,
    priority_label TEXT,
    priority_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Reported' CHECK (status IN ('Draft','Reported','Assigned','In Progress','Resolved')),
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INCIDENT MEDIA TABLE
CREATE TABLE IF NOT EXISTS incident_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    duration_seconds INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. HOTSPOT ALERTS TABLE
CREATE TABLE IF NOT EXISTS hotspot_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_m INT NOT NULL,
    incident_ids TEXT[] NOT NULL DEFAULT '{}',
    report_count INT NOT NULL DEFAULT 0,
    category TEXT,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID REFERENCES citizens(id) ON DELETE SET NULL,
    incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS response_teams (
    id TEXT PRIMARY KEY CHECK (id ~ '^TEAM-[0-9]{3,}$'), name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Fire','Medical','Rescue','Police','Disaster Response')),
    lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90), lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    location geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography) STORED,
    availability TEXT NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available','Busy')),
    current_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL, contact_label TEXT,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_assigned_team_fk;
ALTER TABLE incidents ADD CONSTRAINT incidents_assigned_team_fk FOREIGN KEY (assigned_team_id) REFERENCES response_teams(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES response_teams(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('assigned','reassigned','unassigned','released')),
    distance_km NUMERIC, performed_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_final_severity ON incidents (final_severity);
CREATE INDEX IF NOT EXISTS idx_incidents_citizen_id ON incidents (citizen_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_alerts_status ON hotspot_alerts (status);
CREATE INDEX IF NOT EXISTS idx_hotspot_alerts_created_at ON hotspot_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS response_teams_location_gist ON response_teams USING GIST(location);
CREATE INDEX IF NOT EXISTS response_teams_availability_idx ON response_teams (availability);
CREATE INDEX IF NOT EXISTS response_teams_category_idx ON response_teams (category);

-- 8. ROW LEVEL SECURITY (RLS)
-- Enabled on every table with NO public policies. Backend accesses all tables via service_role key.
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- 9. REALTIME PUBLICATION
-- Enable Realtime events for live dashboard and citizen updates
DO $$
BEGIN
    -- Add incidents to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'incidents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
    END IF;

    -- Add hotspot_alerts to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'hotspot_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hotspot_alerts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'response_teams'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE response_teams;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Realtime publication setup skipped or handled automatically: %', SQLERRM;
END $$;

-- 10. SPATIAL PROXIMITY FUNCTION
-- Returns incidents within radius_m meters of given (lat, lng) point since timestamp
CREATE OR REPLACE FUNCTION incidents_within(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_m INT,
    since TIMESTAMPTZ DEFAULT '-infinity'::TIMESTAMPTZ
)
RETURNS SETOF incidents
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM incidents
    WHERE location IS NOT NULL
      AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_m
      )
      AND (since IS NULL OR created_at >= since)
    ORDER BY created_at DESC;
$$;
