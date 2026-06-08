ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;
