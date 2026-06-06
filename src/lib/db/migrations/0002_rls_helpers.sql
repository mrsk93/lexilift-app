create or replace function public.is_org_member(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from memberships where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from memberships
    where org_id = p_org and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

create or replace function public.is_org_owner(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from memberships
    where org_id = p_org and user_id = auth.uid() and role = 'owner'
  );
$$;

create index if not exists idx_memberships_user on memberships(user_id);
create index if not exists idx_memberships_org_user on memberships(org_id, user_id);
