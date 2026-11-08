-- Vibely social features migration: follows are already in schema.sql; this adds secure direct messages.
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint dm_no_self_message check (sender_id <> recipient_id)
);
create index if not exists direct_messages_pair_time_idx on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists direct_messages_recipient_time_idx on public.direct_messages (recipient_id, sender_id, created_at);
alter table public.direct_messages enable row level security;
drop policy if exists "participants read direct messages" on public.direct_messages;
create policy "participants read direct messages" on public.direct_messages for select to authenticated using ((select auth.uid())=sender_id or (select auth.uid())=recipient_id);
drop policy if exists "sender creates own direct messages" on public.direct_messages;
create policy "sender creates own direct messages" on public.direct_messages for insert to authenticated with check (sender_id=(select auth.uid()) and sender_id<>recipient_id and exists(select 1 from public.profiles p where p.id=recipient_id));
drop policy if exists "participants delete own direct messages" on public.direct_messages;
create policy "participants delete own direct messages" on public.direct_messages for delete to authenticated using ((select auth.uid())=sender_id or (select auth.uid())=recipient_id);
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object or undefined_object then null;
end $$;
