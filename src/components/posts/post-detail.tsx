import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Container, PageHeader } from "@/components/site/container";
import { Markdown } from "@/components/site/markdown";
import { formatBytes, formatDate } from "@/lib/constants";
import type { Post, PostAttachment, PostType } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTACHMENT_BUCKET = "post-attachments";

export async function PostDetail({ id, type, basePath, eyebrow }: { id: string; type: PostType; basePath: string; eyebrow: string }) {
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("type", type)
    .eq("published", true)
    .maybeSingle<Post>();

  if (!data) notFound();

  const { data: attachments } = await supabase
    .from("post_attachments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .returns<PostAttachment[]>();

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={data.title} description={formatDate(data.created_at)} />
      <Container className="py-10">
        <article className="max-w-3xl"><Markdown content={data.content} /></article>

        {!!attachments?.length && (
          <section className="mt-10 max-w-3xl border-t pt-6" aria-labelledby="attachments-heading">
            <h2 id="attachments-heading" className="text-sm font-semibold">첨부파일</h2>
            <div className="mt-3 divide-y rounded-md border">
              {attachments.map((attachment) => {
                const { data: publicUrl } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(attachment.storage_path);
                return (
                  <a
                    key={attachment.id}
                    href={publicUrl.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 px-3 py-3 text-sm hover:bg-muted/50"
                  >
                    <span className="min-w-0 truncate font-medium">{attachment.original_filename}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(attachment.file_size)}</span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-12 text-sm"><Link href={basePath} className="underline underline-offset-4">목록으로 돌아가기</Link></p>
      </Container>
    </>
  );
}
