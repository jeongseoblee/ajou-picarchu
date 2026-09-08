import type { Metadata } from "next";
import Link from "next/link";
import { requireApproved, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Container, PageHeader, EmptyState } from "@/components/site/container";
import { DownloadButton } from "@/components/archive/download-button";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/constants";
import type { Resource } from "@/lib/types";

export const metadata: Metadata = { title: "ARCHIVE" };

export default async function ArchivePage() {
  const profile = await requireApproved("/archive");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Resource[]>();

  return (
    <>
      <PageHeader eyebrow="Archive" title="자료실" description="승인된 회원만 이용할 수 있습니다. 모든 다운로드는 기록됩니다." />
      <Container className="py-10">
        {isStaff(profile) && (
          <div className="mb-6 flex justify-end">
            <Button asChild variant="outline" size="sm"><Link href="/admin/resources">자료 관리</Link></Button>
          </div>
        )}
        {error ? (
          <EmptyState title="자료를 불러오지 못했습니다" description="잠시 후 다시 시도하세요." />
        ) : !data?.length ? (
          <EmptyState title="등록된 자료가 없습니다" />
        ) : (
          <ul className="divide-y border-y">
            {data.map((r) => (
              <li key={r.id} className="py-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{r.title}</h3>
                  {r.description && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{r.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground font-mono truncate">
                    {r.original_filename} · {formatBytes(r.file_size)} · {formatDate(r.created_at)} · 다운로드 {r.download_count}
                  </p>
                </div>
                <DownloadButton id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
