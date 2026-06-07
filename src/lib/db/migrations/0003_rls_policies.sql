-- Enable RLS on all tables (idempotent)
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table invites enable row level security;
alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table widget_tokens enable row level security;

-- Drop existing policies (for re-runs)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy "profiles self select" on profiles for select using (auth.uid() = id);
create policy "profiles self update" on profiles for update using (auth.uid() = id);

-- organizations
create policy "orgs member select" on organizations for select using (is_org_member(id));
create policy "orgs self insert" on organizations for insert with check (auth.uid() = created_by);
create policy "orgs admin update" on organizations for update using (is_org_admin(id));
create policy "orgs owner delete" on organizations for delete using (is_org_owner(id));

-- memberships
create policy "memberships member select" on memberships for select using (is_org_member(org_id));
create policy "memberships admin insert" on memberships for insert with check (is_org_admin(org_id));
create policy "memberships admin update" on memberships for update using (is_org_admin(org_id));
create policy "memberships admin delete" on memberships for delete using (is_org_admin(org_id) and not (user_id = auth.uid() and role = 'owner'));

-- invites
create policy "invites admin select" on invites for select using (is_org_admin(org_id));
create policy "invites admin insert" on invites for insert with check (is_org_admin(org_id));
create policy "invites admin or self update" on invites for update using (is_org_admin(org_id) or invited_by = auth.uid());
create policy "invites admin delete" on invites for delete using (is_org_admin(org_id));

-- documents
create policy "documents member select" on documents for select using (is_org_member(org_id));
create policy "documents admin insert" on documents for insert with check (is_org_admin(org_id));
create policy "documents admin update" on documents for update using (is_org_admin(org_id));
create policy "documents admin delete" on documents for delete using (is_org_admin(org_id));

-- document_chunks: members can read, but only service role writes
create policy "chunks member select" on document_chunks for select using (is_org_member(org_id));

-- chat_sessions
create policy "sessions member select" on chat_sessions for select using (is_org_member(org_id));
create policy "sessions member insert" on chat_sessions for insert with check (is_org_member(org_id));
create policy "sessions self or admin update" on chat_sessions for update using (user_id = auth.uid() or is_org_admin(org_id));
create policy "sessions self or admin delete" on chat_sessions for delete using (user_id = auth.uid() or is_org_admin(org_id));

-- chat_messages
create policy "messages member select" on chat_messages for select using (
  exists(select 1 from chat_sessions s where s.id = session_id and is_org_member(s.org_id))
);
create policy "messages member insert" on chat_messages for insert with check (
  exists(select 1 from chat_sessions s where s.id = session_id and is_org_member(s.org_id))
);
create policy "messages owner update" on chat_messages for update using (
  exists(select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "messages admin delete" on chat_messages for delete using (
  exists(select 1 from chat_sessions s where s.id = session_id and is_org_admin(s.org_id))
);

-- widget_tokens
create policy "widget admin all" on widget_tokens for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));
