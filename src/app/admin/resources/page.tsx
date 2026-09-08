import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResourceForm } from "@/components/admin/resource-form";
import { ResourceRowActions } from "@/components/admin/resource-row-actions";
import { EmptyState } from "@/components/site/container";
import { formatBytes, formatDate } from "@/lib/constants";
import type { Resource } from "@/lib/types";

export const metadata: Metadata = { title: "자료 관리" };

export default async function AdminResourcesPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [{ data: resources, error }, { data: recentLogs }] = await Promise.all([
    supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(200).returns<Resource[]>(),
    supabase
      .from("download_logs")
      .select("id, downloaded_at, profiles(name, student_id), resources(title)")
      .order("downloaded_at", { ascending: false })
      .limit(30),
  ]);

  const popular = [...(resources ?? [])].sort((a, b) => b.download_count - a.download_count).slice(0, 5);
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">자료 관리</h1>

      <section className="border rounded-md p-5 max-w-2xl">
        <h2 className="font-semibold mb-4">새 자료 업로드</h2>
        <ResourceForm userId={admin.id} />
      </section>

      <section>
        <h2 className="font-semibold mb-3">전체 자료 ({resources?.length ?? 0})</h2>
        {error ? <EmptyState title="자료를 불러오지 못했습니다" /> : !resources?.length ? <EmptyState title="등록된 자료가 없습니다" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead><TableHead>파일</TableHead><TableHead className="text-right">크기</TableHead>
                <TableHead className="text-right">다운로드</TableHead><TableHead>업로드</TableHead><TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-56 truncate">{r.original_filename}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatBytes(r.file_size)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link href={`/admin/resources/${r.id}`} className="underline underline-offset-4">{r.download_count}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                  <TableCell><ResourceRowActions resource={r} userId={admin.id} canDelete /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="font-semibold mb-3">인기 자료</h2>
          <ol className="divide-y border-y text-sm">
            {popular.map((r, i) => (
              <li key={r.id} className="py-2.5 flex justify-between gap-3">
                <span className="truncate"><span className="text-muted-foreground font-mono mr-2">{i + 1}</span>{r.title}</span>
                <span className="tabular-nums shrink-0">{r.download_count}</span>
              </li>
            ))}
            {!popular.length && <li className="py-6 text-center text-muted-foreground">없음</li>}
          </ol>
        </section>
        <section>
          <h2 className="font-semibold mb-3">최근 다운로드</h2>
          <ul className="divide-y border-y text-sm">
            {recentLogs?.map((l) => {
              const p = one(l.profiles); const r = one(l.resources);
              return (
                <li key={l.id} className="py-2.5 flex justify-between gap-3">
                  <span className="truncate">{p?.name ?? "(탈퇴)"} <span className="text-muted-foreground">· {r?.title ?? "(삭제된 자료)"}</span></span>
                  <span className="text-muted-foreground shrink-0">{formatDate(l.downloaded_at, true)}</span>
                </li>
              );
            })}
            {!recentLogs?.length && <li className="py-6 text-center text-muted-foreground">없음</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
