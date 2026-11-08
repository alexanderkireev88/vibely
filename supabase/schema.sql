-- Vibely MVP schema for Supabase. Run in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null default 'Новый пользователь' check (char_length(display_name) between 1 and 40),
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin','owner')),
  created_at timestamptz not null default now()
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  media_url text,
  media_type text check (media_type in ('image','video') or media_type is null),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  constraint post_has_content check (char_length(trim(body)) > 0 or media_url is not null)
);
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id,followed_id),
  constraint no_self_follow check (follower_id <> followed_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare base_name text; clean_name text; chosen_name text;
begin
  base_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'user');
  clean_name := lower(regexp_replace(base_name, '[^a-zA-Z0-9_]', '', 'g'));
  if length(clean_name) < 3 then clean_name := 'user_' || substr(replace(new.id::text,'-',''),1,8); end if;
  clean_name := substr(clean_name,1,18);
  chosen_name := clean_name;
  while exists (select 1 from public.profiles where username = chosen_name) loop
    chosen_name := substr(clean_name,1,15) || '_' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  end loop;
  insert into public.profiles(id, username, display_name) values (new.id, chosen_name, left(base_name,40));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable" on public.profiles for select using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = (select role from public.profiles p where p.id = (select auth.uid())));
drop policy if exists "public posts readable" on public.posts;
create policy "public posts readable" on public.posts for select using (visibility = 'public' or author_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
drop policy if exists "authenticated users create own posts" on public.posts;
create policy "authenticated users create own posts" on public.posts for insert to authenticated with check (author_id = (select auth.uid()));
drop policy if exists "authors and admins update posts" on public.posts;
create policy "authors and admins update posts" on public.posts for update to authenticated using (author_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin'))) with check (author_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
drop policy if exists "authors and admins delete posts" on public.posts;
create policy "authors and admins delete posts" on public.posts for delete to authenticated using (author_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner','admin')));
drop policy if exists "likes publicly readable" on public.post_likes;
create policy "likes publicly readable" on public.post_likes for select using (true);
drop policy if exists "users like as themselves" on public.post_likes;
create policy "users like as themselves" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "users remove own likes" on public.post_likes;
create policy "users remove own likes" on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists "comments publicly readable" on public.comments;
create policy "comments publicly readable" on public.comments for select using (exists (select 1 from public.posts p where p.id = post_id and (p.visibility='public' or p.author_id=(select auth.uid()))));
drop policy if exists "authenticated users comment as themselves" on public.comments;
create policy "authenticated users comment as themselves" on public.comments for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id=post_id and p.visibility='public'));
drop policy if exists "authors and admins delete comments" on public.comments;
create policy "authors and admins delete comments" on public.comments for delete to authenticated using (author_id=(select auth.uid()) or exists (select 1 from public.posts p join public.profiles pr on pr.id=(select auth.uid()) where p.id=post_id and (p.author_id=(select auth.uid()) or pr.role in ('owner','admin'))));
drop policy if exists "follows publicly readable" on public.follows;
create policy "follows publicly readable" on public.follows for select using (true);
drop policy if exists "users follow as themselves" on public.follows;
create policy "users follow as themselves" on public.follows for insert to authenticated with check (follower_id=(select auth.uid()));
drop policy if exists "users unfollow themselves" on public.follows;
create policy "users unfollow themselves" on public.follows for delete to authenticated using (follower_id=(select auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vibely-media','vibely-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public=true,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Vibely public media read" on storage.objects;
create policy "Vibely public media read" on storage.objects for select using (bucket_id='vibely-media');
drop policy if exists "Users upload to own Vibely folder" on storage.objects;
create policy "Users upload to own Vibely folder" on storage.objects for insert to authenticated with check (bucket_id='vibely-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users delete own Vibely media" on storage.objects;
create policy "Users delete own Vibely media" on storage.objects for delete to authenticated using (bucket_id='vibely-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Enable realtime for collaborative feed updates.
do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object or undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object or undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.post_likes;
exception when duplicate_object or undefined_object then null;
end $$;
