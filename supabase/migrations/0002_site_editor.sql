-- ============================================================
-- 0002: Site Editor V1
--  - site_settings 에 편집 가능 키 추가 (기존 행 유지)
--  - home_sections: 홈 섹션 표시 여부/순서
-- 재실행 안전.
-- ============================================================

insert into public.site_settings (key, value) values
  ('site_name',           '소학회'),
  ('site_subtitle',       'Engineering Research Society'),
  ('school_name',         'OO대학교'),
  ('department_name',     '공과대학'),
  ('hero_eyebrow',        'OO대학교 · Engineering Research Society'),
  ('hero_title',          E'함께 연구하고, 만들고, 공유하는\n공학 소학회'),
  ('hero_description',    '학생 주도의 연구·개발 활동을 통해 이론을 실제 프로젝트로 연결합니다. 세미나, 프로젝트, 기술 자료 공유를 통해 함께 성장합니다.'),
  ('hero_primary_text',   '소학회 소개'),
  ('hero_primary_url',    '/about'),
  ('hero_secondary_text', '가입 신청'),
  ('hero_secondary_url',  '/signup'),
  ('accent_color',        '#1e3a8a'),
  ('footer_school',       'OO대학교'),
  ('footer_department',   '공과대학'),
  ('footer_copyright',    '© 소학회. All rights reserved.')
on conflict (key) do nothing;

create table if not exists public.home_sections (
  key        text primary key check (key in ('about','activities','projects','notice','archive')),
  title      text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  enabled    boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.home_sections (key, title, description, enabled, sort_order) values
  ('about',      'ABOUT',      '소학회 소개, 활동 목표, 연혁, 임원진',                 true, 1),
  ('activities', 'ACTIVITIES', '정기 세미나, 스터디, 워크숍 등 소학회의 활동 기록',      true, 2),
  ('projects',   'PROJECTS',   '회원들이 수행한 연구·개발 프로젝트',                     true, 3),
  ('notice',     'NOTICE',     '공지사항',                                              true, 4),
  ('archive',    'ARCHIVE',    '회원 전용 기술 자료 및 발표 자료 (승인된 회원)',           true, 5)
on conflict (key) do nothing;

drop trigger if exists home_sections_updated_at on public.home_sections;
create trigger home_sections_updated_at before update on public.home_sections
  for each row execute function public.set_updated_at();

alter table public.home_sections enable row level security;

drop policy if exists "home_sections: public read" on public.home_sections;
create policy "home_sections: public read"  on public.home_sections for select to anon, authenticated using (true);
drop policy if exists "home_sections: admin update" on public.home_sections;
create policy "home_sections: admin update" on public.home_sections for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- insert/delete 정책 없음: 5개 고정 섹션은 migration 으로만 관리
