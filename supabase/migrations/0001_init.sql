-- ============================================================
-- 소학회 홈페이지 초기 스키마 / RLS / Storage
-- Supabase SQL Editor 또는 `supabase db push` 로 실행
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'member_role')   then create type public.member_role   as enum ('member', 'executive', 'admin'); end if;
  if not exists (select 1 from pg_type where typname = 'member_status') then create type public.member_status as enum ('pending', 'approved', 'rejected', 'suspended'); end if;
  if not exists (select 1 from pg_type where typname = 'post_type')     then create type public.post_type     as enum ('notice', 'activity', 'project'); end if;
end $$;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null check (char_length(name) between 1 and 50),
  student_id  text not null check (student_id ~ '^[0-9]{6,12}$'),
  department  text not null check (char_length(department) between 1 and 100),
  grade       smallint check (grade between 1 and 6),
  phone       text check (phone is null or phone ~ '^[0-9\-+ ]{9,20}$'),
  role        public.member_role   not null default 'member',
  status      public.member_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_student_id_unique unique (student_id)
);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- ---------- POSTS ----------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  type        public.post_type not null,
  title       text not null check (char_length(title) between 1 and 200),
  content     text not null default '',          -- Markdown (HTML은 렌더링 시 제거)
  author_id   uuid references public.profiles(id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists posts_type_published_idx on public.posts (type, published, created_at desc);

-- ---------- RESOURCES (자료실) ----------
create table if not exists public.resources (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 200),
  description       text not null default '',
  storage_path      text not null unique,
  original_filename text not null,
  file_size         bigint not null check (file_size > 0),
  mime_type         text not null,
  download_count    integer not null default 0,
  uploaded_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists resources_created_at_idx on public.resources (created_at desc);

-- ---------- DOWNLOAD LOGS ----------
create table if not exists public.download_logs (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  file_id       uuid not null references public.resources(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);
create index if not exists download_logs_user_idx on public.download_logs (user_id, downloaded_at desc);
create index if not exists download_logs_file_idx on public.download_logs (file_id, downloaded_at desc);
create index if not exists download_logs_time_idx on public.download_logs (downloaded_at desc);

-- ---------- SITE SETTINGS (소개/연혁/임원진 등) ----------
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.site_settings (key, value) values
  ('about_intro',      '소학회 소개 문구를 관리자 페이지에서 수정하세요.'),
  ('about_goals',      E'- 활동 목표 1\n- 활동 목표 2'),
  ('about_history',    E'| 연도 | 내용 |\n|---|---|\n| 2024 | 소학회 창립 |'),
  ('about_executives', E'| 직책 | 이름 | 학과 |\n|---|---|---|\n| 회장 | 홍길동 | 컴퓨터공학과 |')
on conflict (key) do nothing;

-- ---------- COMMON: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at  before update on public.profiles      for each row execute function public.set_updated_at();
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at     before update on public.posts         for each row execute function public.set_updated_at();
drop trigger if exists resources_updated_at on public.resources;
create trigger resources_updated_at before update on public.resources     for each row execute function public.set_updated_at();
drop trigger if exists settings_updated_at on public.site_settings;
create trigger settings_updated_at  before update on public.site_settings for each row execute function public.set_updated_at();

-- ---------- AUTH HELPERS (security definer -> RLS 재귀 방지) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('executive','admin') and status = 'approved');
$$;
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

-- ---------- 회원가입 시 profile 자동 생성 ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, name, student_id, department, grade, phone)
  values (
    new.id,
    new.email,
    left(coalesce(m->>'name', ''), 50),
    coalesce(m->>'student_id', ''),
    left(coalesce(m->>'department', ''), 100),
    nullif(m->>'grade', '')::smallint,
    nullif(m->>'phone', '')
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 권한 상승/불변 필드 보호 ----------
-- role/status/student_id 는 admin 만 변경 가능.
-- auth.uid() is null 인 경우(= JWT 없는 DB 관리자 세션: Supabase SQL Editor / CLI) 는 최초 admin bootstrap 을 위해 허용.
-- 앱은 anon/authenticated 키만 사용하므로 authenticated 사용자는 항상 auth.uid() 가 존재하며 이 우회를 이용할 수 없다.
create or replace function public.prevent_privilege_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
declare privileged boolean := (auth.uid() is null) or public.is_admin();
begin
  if new.id <> old.id or new.email <> old.email then
    raise exception 'id/email 은 변경할 수 없습니다.' using errcode = '42501';
  end if;
  if (new.role <> old.role or new.status <> old.status) and not privileged then
    raise exception 'role/status 변경 권한이 없습니다.' using errcode = '42501';
  end if;
  if new.student_id <> old.student_id and not privileged then
    raise exception '학번은 변경할 수 없습니다.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- ---------- 다운로드 카운트 ----------
create or replace function public.bump_download_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.resources set download_count = download_count + 1 where id = new.file_id;
  return new;
end $$;
drop trigger if exists download_logs_bump on public.download_logs;
create trigger download_logs_bump after insert on public.download_logs
  for each row execute function public.bump_download_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.resources     enable row level security;
alter table public.download_logs enable row level security;
alter table public.site_settings enable row level security;

-- profiles
drop policy if exists "profiles: self select" on public.profiles;
create policy "profiles: self select"   on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles: admin select" on public.profiles;
create policy "profiles: admin select"  on public.profiles for select to authenticated using (public.is_admin());
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update"   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update"  on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- insert 는 trigger(security definer)만, delete 는 auth.users cascade 만 허용 (정책 없음)

-- posts
drop policy if exists "posts: public read" on public.posts;
create policy "posts: public read"      on public.posts for select to anon, authenticated using (published = true);
drop policy if exists "posts: staff read all" on public.posts;
create policy "posts: staff read all"   on public.posts for select to authenticated using (public.is_staff());
drop policy if exists "posts: staff insert" on public.posts;
create policy "posts: staff insert"     on public.posts for insert to authenticated with check (public.is_staff() and author_id = auth.uid());
drop policy if exists "posts: author/admin update" on public.posts;
create policy "posts: author/admin update" on public.posts for update to authenticated
  using (public.is_admin() or (public.is_staff() and author_id = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and author_id = auth.uid()));
drop policy if exists "posts: admin delete" on public.posts;
create policy "posts: admin delete"     on public.posts for delete to authenticated using (public.is_admin());

-- resources
drop policy if exists "resources: approved read" on public.resources;
create policy "resources: approved read" on public.resources for select to authenticated using (public.is_approved());
drop policy if exists "resources: staff insert" on public.resources;
create policy "resources: staff insert"  on public.resources for insert to authenticated with check (public.is_staff() and uploaded_by = auth.uid());
drop policy if exists "resources: uploader/admin update" on public.resources;
create policy "resources: uploader/admin update" on public.resources for update to authenticated
  using (public.is_admin() or (public.is_staff() and uploaded_by = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and uploaded_by = auth.uid()));
drop policy if exists "resources: admin delete" on public.resources;
create policy "resources: admin delete"  on public.resources for delete to authenticated using (public.is_admin());

-- download_logs
drop policy if exists "logs: self read" on public.download_logs;
create policy "logs: self read"   on public.download_logs for select to authenticated using (user_id = auth.uid());
drop policy if exists "logs: admin read" on public.download_logs;
create policy "logs: admin read"  on public.download_logs for select to authenticated using (public.is_admin());
drop policy if exists "logs: self insert" on public.download_logs;
create policy "logs: self insert" on public.download_logs for insert to authenticated with check (user_id = auth.uid() and public.is_approved());

-- site_settings
drop policy if exists "settings: public read" on public.site_settings;
create policy "settings: public read"  on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "settings: admin update" on public.site_settings;
create policy "settings: admin update" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- STORAGE: private bucket 'resources'
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources', 'resources', false, 52428800, -- 50MB
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage: approved read" on storage.objects;
create policy "storage: approved read"  on storage.objects for select to authenticated
  using (bucket_id = 'resources' and public.is_approved());
drop policy if exists "storage: staff upload" on storage.objects;
create policy "storage: staff upload"   on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resources'
    and public.is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text   -- 자신의 uid 폴더에만 업로드
  );
drop policy if exists "storage: owner/admin update" on storage.objects;
create policy "storage: owner/admin update" on storage.objects for update to authenticated
  using (bucket_id = 'resources' and (public.is_admin() or (public.is_staff() and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text)))
  with check (bucket_id = 'resources' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
drop policy if exists "storage: owner/admin delete" on storage.objects;
create policy "storage: owner/admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resources' and (public.is_admin() or (public.is_staff() and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text)));
