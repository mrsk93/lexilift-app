-- Schema additions
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS llm_model text DEFAULT 'gpt-4o',
  ADD COLUMN IF NOT EXISTS documents_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_region text DEFAULT 'us';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents(org_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents(sha256);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
