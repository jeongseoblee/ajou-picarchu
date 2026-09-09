import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Container, PageHeader, EmptyState } from "@/components/site/container";
import { StatusBadge, RoleBadge } from "@/components/site/status-badge";
import { ProfileForm } from "@/components/mypage/profile-form";
import { ChangePasswordForm } from "@/components/mypage/change-password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/constants";

export const metadata: Metadata = { title: "MY PAGE" };

const STATUS_NOTICE = {
  pending: { title: "승인 대기 중입니다", desc: "관리자 승인이 완료되면 자료실 등 회원 전용 기능을 이용할 수 있습니다." },
  rejected: { title: "가입이 거절되었습니다", desc: "문의가 필요하면 임원진에게 연락하세요." },
  suspended: { title: "계정이 정지되었습니다", desc: "회원 전용 기능 이용이 제한됩니다. 문의는 임원진에게 연락하세요." },
} as const;

export default async function MyPage({ searchParams }: PageProps<"/mypage">) {
  const profile = await requireUser("/mypage");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("download_logs")
    .select("id, downloaded_at, resources(title, original_filename)")
    .eq("user_id", profile.id)
    .order("downloaded_at", { ascending: false })
    .limit(50);

  const notice = profile.status !== "approved" ? STATUS_NOTICE[profile.status] : null;

  return (
    <>
      <PageHeader eyebrow="My Page" title={`${profile.name} 님`} description={profile.email} />
      <Container className="py-10 space-y-12">
        {sp.notice === "forbidden" && (
          <Alert variant="destructive"><AlertDescription>해당 페이지에 접근할 권한이 없습니다.</AlertDescription></Alert>
        )}
        {sp.notice === "not-approved" && profile.status === "approved" && null}
        {notice && (
          <Alert><AlertTitle>{notice.title}</AlertTitle><AlertDescription>{notice.desc}</AlertDescription></Alert>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">회원 상태</h2>
          <dl className="grid sm:grid-cols-3 gap-6 text-sm">
            <div><dt className="text-muted-foreground mb-1">상태</dt><dd><StatusBadge status={profile.status} /></dd></div>
            <div><dt className="text-muted-foreground mb-1">역할</dt><dd><RoleBadge role={profile.role} /></dd></div>
            <div><dt className="text-muted-foreground mb-1">가입일</dt><dd>{formatDate(profile.created_at)}</dd></div>
          </dl>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">개인정보</h2>
          <ProfileForm profile={profile} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">다운로드 기록</h2>
          {!logs?.length ? (
            <EmptyState title="다운로드 기록이 없습니다" description={profile.status === "approved" ? "자료실에서 자료를 다운로드하면 여기에 표시됩니다." : undefined} />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>자료</TableHead><TableHead>파일명</TableHead><TableHead className="text-right">일시</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map((l) => {
                  const r = Array.isArray(l.resources) ? l.resources[0] : l.resources;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>{r?.title ?? <span className="text-muted-foreground">(삭제된 자료)</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{r?.original_filename ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatDate(l.downloaded_at, true)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {profile.status === "approved" && <p className="text-sm mt-4"><Link href="/archive" className="underline underline-offset-4">자료실로 이동</Link></p>}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">계정 보안</h2>
          <p className="text-sm text-muted-foreground mb-4">비밀번호를 변경하려면 현재 비밀번호를 먼저 확인합니다.</p>
          <ChangePasswordForm />
        </section>
      </Container>
    </>
  );
}
