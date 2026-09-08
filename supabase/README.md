# Database 설정

## 1. 스키마 적용
Supabase Dashboard → SQL Editor 에서 `migrations/0001_init.sql` 전체를 실행하거나,
Supabase CLI 사용 시:
```bash
supabase link --project-ref <project-ref>
supabase db push
```

## 2. 초기 admin 지정
1. 홈페이지에서 관리자가 될 계정으로 회원가입합니다 (status = pending 상태가 됨).
2. SQL Editor 에서 아래를 실행합니다 (이메일을 본인 것으로 교체). SQL Editor 는 JWT 가 없는 DB 관리자 세션(`auth.uid()` = null)이므로 `profiles_guard` 트리거가 bootstrap 을 허용합니다. 앱 사용자는 항상 `auth.uid()` 가 있어 이 경로를 사용할 수 없습니다:
```sql
update public.profiles
set role = 'admin', status = 'approved'
where email = 'admin@university.ac.kr';
```
3. 확인: `select email, role, status from public.profiles;`

이후 모든 회원 승인/역할 변경은 `/admin/members` 에서 처리합니다. 학번(student_id) 정정이 필요하면 admin 이 SQL Editor 또는 admin 세션으로만 변경할 수 있습니다(일반 회원은 DB 트리거로 차단).

## 3. Auth 설정 (Dashboard → Authentication)
- **URL Configuration**: Site URL 을 배포 도메인으로, Redirect URLs 에 `https://<domain>/auth/callback` 추가 (로컬은 `http://localhost:3000/auth/callback`).
- **Email → Confirm email**: 이메일 인증을 사용하려면 ON. (코드는 ON/OFF 모두 지원)
- 비밀번호 최소 길이 8 이상 권장.

## 4. Storage
`resources` 버킷은 migration 에서 **private** 으로 생성됩니다 (50MB, 허용 MIME 제한).
Dashboard 에서 public 으로 바꾸지 마세요. 모든 다운로드는 서버가 발급하는 짧은 signed URL 로만 이루어집니다.

## 5. P0 검증 체크리스트 (실제 환경에서 확인)
| # | Flow | 확인 방법 |
|---|------|-----------|
| 1 | 회원가입 → pending | 가입 후 `/mypage` 에 "승인 대기 중" 표시, `profiles.status = 'pending'` |
| 2 | pending → `/archive` | `/mypage?notice=not-approved` 로 redirect |
| 3 | admin → 승인 | `/admin/members` (pending 탭) → 승인 버튼 |
| 4 | approved → `/archive` | 자료 목록 표시 |
| 5 | staff 업로드 | `/admin/resources` 업로드 → Storage `resources/<uid>/...` 객체 + `resources` 행 생성 |
| 6 | member 다운로드 | 다운로드 버튼 → 파일 저장, `download_logs` 1행, `resources.download_count` +1 |
| 7 | 비로그인 Storage 접근 | `https://<proj>.supabase.co/storage/v1/object/resources/<path>` → 400/403 |
| 8 | member → `/admin` | `/mypage?notice=forbidden` 로 redirect |
| 9 | member → 관리자 action | DevTools 로 `setMemberStatus` 호출 시 `requireAdmin` redirect + DB trigger `42501` |
| 10 | suspended/rejected | `/archive` 차단, `/mypage` 에 상태 안내 |
| 11 | 학번 중복 가입 | "이미 등록된 학번 또는 이메일입니다" (DB unique 제약 → trigger 실패 → signUp 오류) |
