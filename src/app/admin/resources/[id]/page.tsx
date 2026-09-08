import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/site/container";
import { formatBytes, formatDate } from "@/lib/constants";
import type { Resource } from "@/lib/types";

export const metadata: Metadata = { title: "다운로드 로그" };

export default async function ResourceLogPage({ params }: PageProps<"/admin/resources/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: resource } = await supabase.from("resources").select("*").eq("id", id).single<Resource>();
  if (!resource) notFound();

  const { data: logs } = await supabase
    .from("download_logs")
    .select("id, downloaded_at, profiles(name, student_id, department)")
    .eq("file_id", id)
    .order("downloaded_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/admin/resources" className="text-muted-foreground hover:underline">← 자료 관리</Link></p>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{resource.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{resource.original_filename} · {formatBytes(resource.file_size)} · 총 다운로드 {resource.download_count}회</p>
      </div>
      {!logs?.length ? <EmptyState title="다운로드 기록이 없습니다" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>이름</TableHead><TableHead>학번</TableHead><TableHead>학과</TableHead><TableHead className="text-right">일시</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.map((l) => {
              const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
              return (
                <TableRow key={l.id}>
                  <TableCell>{p?.name ?? "(탈퇴)"}</TableCell>
                  <TableCell className="font-mono text-xs">{p?.student_id ?? "-"}</TableCell>
                  <TableCell>{p?.department ?? "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatDate(l.downloaded_at, true)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
