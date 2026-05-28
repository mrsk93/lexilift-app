-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Organizations: Users can view orgs they are a member of
CREATE POLICY "Users can view orgs they belong to" 
ON organizations FOR SELECT 
USING (
  id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- Organizations: Only owners/admins can update org details
CREATE POLICY "Owners and admins can update orgs" 
ON organizations FOR UPDATE 
USING (
  id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Memberships: Users can view memberships in their orgs
CREATE POLICY "Users can view memberships in their orgs"
ON memberships FOR SELECT
USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- Documents: Users can read/write documents in their orgs
CREATE POLICY "Users can view docs in their orgs"
ON documents FOR SELECT
USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert docs in their orgs"
ON documents FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- (Similar policies apply for chunks, chat sessions, etc.)
-- Note: In a production Supabase setup, these should be applied via the Supabase Dashboard or migrations.
