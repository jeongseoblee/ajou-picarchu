-- ============================================================
-- 게시물 첨부파일
-- public post에 연결되는 공개 다운로드용 파일. 업로드/삭제는 admin만.
-- ============================================================

create table if not exists public.post_attachments (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.posts(id) on delete cascade,
  storage_path      text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  file_size         bigint not null check (file_size > 0 and file_size <= 52428800),
  mime_type         text not null check (char_length(mime_type) between 1 and 100),
  uploaded_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists post_attachments_post_idx on public.post_attachments (post_id, created_at);

alter table public.post_attachments enable row level security;

drop policy if exists "post attachments: public read published" on public.post_attachments;
create policy "post attachments: public read published"
on public.post_attachments for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.published = true
  )
);

drop policy if exists "post attachments: admin read all" on public.post_attachments;
create policy "post attachments: admin read all"
on public.post_attachments for select to authenticated
using (public.is_admin());

drop policy if exists "post attachments: admin insert" on public.post_attachments;
create policy "post attachments: admin insert"
on public.post_attachments for insert to authenticated
with check (public.is_admin() and uploaded_by = auth.uid());

drop policy if exists "post attachments: admin delete" on public.post_attachments;
create policy "post attachments: admin delete"
on public.post_attachments for delete to authenticated
using (public.is_admin());

-- 공개 게시물에서 바로 내려받을 수 있는 전용 bucket.
-- 객체 이름은 무작위 UUID를 사용하고, 쓰기/삭제는 RLS로 admin만 허용한다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-attachments', 'post-attachments', true, 52428800,
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
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post attachments storage: admin read" on storage.objects;
create policy "post attachments storage: admin read"
on storage.objects for select to authenticated
using (bucket_id = 'post-attachments' and public.is_admin());

drop policy if exists "post attachments storage: admin insert" on storage.objects;
create policy "post attachments storage: admin insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-attachments'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "post attachments storage: admin update" on storage.objects;
create policy "post attachments storage: admin update"
on storage.objects for update to authenticated
using (bucket_id = 'post-attachments' and public.is_admin())
with check (bucket_id = 'post-attachments' and public.is_admin());

drop policy if exists "post attachments storage: admin delete" on storage.objects;
create policy "post attachments storage: admin delete"
on storage.objects for delete to authenticated
using (bucket_id = 'post-attachments' and public.is_admin());
