ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS handling_mode varchar(20) NOT NULL DEFAULT 'direct';
ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS release_expires_at timestamptz;
ALTER TABLE interest_requests ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS consent_to_share boolean NOT NULL DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS consent_scope jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS consented_at timestamptz;
UPDATE interest_requests
SET expires_at = now() + interval '14 days'
WHERE status IN ('pending', 'pending_hmr', 'pending_candidate') AND expires_at IS NULL;
UPDATE interest_requests
SET release_expires_at = now() + interval '30 days'
WHERE status = 'approved' AND release_expires_at IS NULL;