-- Migration: Add email verification columns to profiles
-- Applied: 2026-05-20
-- Uses IF NOT EXISTS so it is safe to re-run on an already-migrated database.
-- Existing rows default to email_verified = TRUE so no existing accounts are locked out.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMPTZ;
