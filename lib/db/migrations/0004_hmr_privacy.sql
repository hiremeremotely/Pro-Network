ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{"identity":"public","contact":"private","currentEmployer":"hmr","socialLinks":"public","portfolio":"public","experience":"public","education":"public","skills":"public"}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discovery_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS release_scope jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS conversation_id integer;
ALTER TABLE interest_requests ALTER COLUMN status SET DEFAULT 'pending_hmr';
CREATE TABLE IF NOT EXISTS hmr_audit_events (
  id serial PRIMARY KEY,
  interest_request_id integer,
  actor_profile_id integer,
  actor_role text NOT NULL,
  event text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);