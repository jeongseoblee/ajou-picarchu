import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Container, EmptyState, PageHeader } from "@/components/site/container";
import { formatDate } from "@/lib/constants";
import type { Post, PostType } from "@/lib/types";

function excerpt(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export async function PostList({
  type,
  basePath,
  eyebrow,
  title,
  description,
}: {
  type: PostType;
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("type", type)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Post[]>();

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Container className="py-10">
        {error ? (
          <EmptyState title="게시물을 불러오지 못했습니다" />
        ) : !posts?.length ? (
          <EmptyState title="등록된 게시물이 없습니다" />
        ) : (
          <ol className="border-y divide-y">
            {posts.map((post) => {
              const summary = excerpt(post.content);
              return (
                <li key={post.id}>
                  <Link href={`${basePath}/${post.id}`} className="block py-6 group">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                      <h2 className="text-lg font-semibold tracking-tight group-hover:underline underline-offset-4">{post.title}</h2>
                      <time className="text-xs text-muted-foreground shrink-0" dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                    </div>
                    {summary && <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-3xl">{summary}{post.content.length > summary.length ? "…" : ""}</p>}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Container>
    </>
  );
}
