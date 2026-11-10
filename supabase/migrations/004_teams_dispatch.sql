-- Dispatch teams, assignment audit trail, incident priority reference fields.
CREATE EXTENSION IF NOT EXISTS postgis;

UPDATE incidents SET status = 'Reported' WHERE status = 'Pending';
UPDATE incidents SET status_history = COALESCE((SELECT jsonb_agg(CASE WHEN item->>'status' = 'Pending' THEN jsonb_set(item, '{status}', '"Reported"'::jsonb) ELSE item END) FROM jsonb_array_elements(COALESCE(status_history, '[]'::jsonb)) item), '[]'::jsonb);
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check CHECK (status IN ('Draft','Reported','Assigned','In Progress','Resolved'));

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_team_id text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority_score numeric NOT NULL DEFAULT 0;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority_label text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS response_teams (
  id text PRIMARY KEY CHECK (id ~ '^TEAM-[0-9]{3,}$'),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Fire','Medical','Rescue','Police','Disaster Response')),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  location geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography) STORED,
  availability text NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available','Busy')),
  current_incident_id text REFERENCES incidents(id) ON DELETE SET NULL,
  contact_label text,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE incidents ADD CONSTRAINT incidents_assigned_team_fk FOREIGN KEY (assigned_team_id) REFERENCES response_teams(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  team_id text REFERENCES response_teams(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('assigned','reassigned','unassigned','released')),
  distance_km numeric,
  performed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS response_teams_location_gist ON response_teams USING GIST(location);
CREATE INDEX IF NOT EXISTS response_teams_availability_idx ON response_teams(availability);
CREATE INDEX IF NOT EXISTS response_teams_category_idx ON response_teams(category);
CREATE INDEX IF NOT EXISTS assignment_history_incident_idx ON assignment_history(incident_id, created_at DESC);
ALTER TABLE response_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='response_teams') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE response_teams;
 END IF;
END $$;
