-- Vibely moderation and owner dashboard migration. Safe to run after supabase/schema.sql.
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','nudity','violence','copyright','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint one_report_per_user_post unique (post_id,reporter_id)
);
create index if not exists content_reports_status_created_idx on public.content_reports(status,created_at desc);
alter table public.content_reports enable row level security;
drop policy if exists "users submit own reports" on public.content_reports;
create policy "users submit own reports" on public.content_reports for insert to authenticated with check (reporter_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id and p.visibility='public'));
drop policy if exists "reporters and moderators read reports" on public.content_reports;
create policy "reporters and moderators read reports" on public.content_reports for select to authenticated using (reporter_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('owner','admin')));
drop policy if exists "moderators resolve reports" on public.content_reports;
create policy "moderators resolve reports" on public.content_reports for update to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('owner','admin'))) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('owner','admin')) and status='reviewed' and reviewed_by=(select auth.uid()));

-- Prevent users from changing their own or other users' elevated role through the client API.
create or replace function public.prevent_client_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Profile roles can only be changed by a trusted database administrator';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update of role on public.profiles for each row execute function public.prevent_client_role_change();
