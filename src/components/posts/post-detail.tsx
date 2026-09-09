import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Container, PageHeader } from "@/components/site/container";
import { Markdown } from "@/components/site/markdown";
import { formatDate } from "@/lib/constants";
import type { Post, PostType } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={data.title} description={formatDate(data.created_at)} />
      <Container className="py-10">
        <article className="max-w-3xl"><Markdown content={data.content} /></article>
        <p className="mt-12 text-sm"><Link href={basePath} className="underline underline-offset-4">목록으로 돌아가기</Link></p>
      </Container>
    </>
  );
}
