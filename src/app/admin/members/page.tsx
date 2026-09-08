import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/site/status-badge";
import { MemberRowActions } from "@/components/admin/member-row-actions";
import { EmptyState } from "@/components/site/container";
import { formatDate } from "@/lib/constants";
import { STATUS_LABEL, type MemberStatus, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "회원 관리" };

const STATUSES: (MemberStatus | "all")[] = ["pending", "approved", "suspended", "rejected", "all"];

export default async function MembersPage({ searchParams }: PageProps<"/admin/members">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const status = (typeof sp.status === "string" && STATUSES.includes(sp.status as MemberStatus) ? sp.status : "pending") as MemberStatus | "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 50) : "";

  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (q) {
    // PostgREST or 필터 구문 주입 방지: 구분 문자 제거
    const safe = q.replace(/[,()\\%.]/g, "");
    if (safe) query = query.or(`name.ilike.%${safe}%,student_id.ilike.%${safe}%,department.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  const { data: members, error } = await query.returns<Profile[]>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">회원 관리</h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex gap-1 flex-wrap" aria-label="상태 필터">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/members?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn("text-sm px-3 py-1.5 rounded-md border", s === status ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}
            >
              {s === "all" ? "전체" : STATUS_LABEL[s]}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/admin/members">
          <input type="hidden" name="status" value={status} />
          <Input name="q" defaultValue={q} placeholder="이름 / 학번 / 학과 / 이메일" className="w-64" aria-label="회원 검색" />
          <Button type="submit" variant="outline">검색</Button>
        </form>
      </div>

      {error ? (
        <EmptyState title="회원 목록을 불러오지 못했습니다" />
      ) : !members?.length ? (
        <EmptyState title="해당하는 회원이 없습니다" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead><TableHead>학번</TableHead><TableHead>학과</TableHead>
              <TableHead>이메일</TableHead><TableHead>상태</TableHead><TableHead>가입일</TableHead><TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}{m.grade ? <span className="text-muted-foreground"> · {m.grade}학년</span> : null}</TableCell>
                <TableCell className="font-mono text-xs">{m.student_id}</TableCell>
                <TableCell>{m.department}</TableCell>
                <TableCell className="text-muted-foreground">{m.email}{m.phone && <><br /><span className="text-xs">{m.phone}</span></>}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(m.created_at)}</TableCell>
                <TableCell><MemberRowActions member={m} selfId={admin.id} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
