ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS object_path text;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_profile_source_external_idx
  ON portfolio (profile_id, source, external_id);
CREATE INDEX IF NOT EXISTS portfolio_profile_sort_idx
  ON portfolio (profile_id, sort_order);
CREATE TABLE IF NOT EXISTS portfolio_upload_tickets (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  object_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  declared_mime_type text NOT NULL,
  declared_size integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_upload_tickets_profile_idx
  ON portfolio_upload_tickets (profile_id, status);