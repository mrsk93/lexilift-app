CREATE TABLE invoices (
  id text PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  hosted_url text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_org_idx ON invoices(org_id);
CREATE INDEX invoices_org_created_idx ON invoices(org_id, created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members see invoices" ON invoices FOR SELECT
  USING (is_org_member(org_id));
