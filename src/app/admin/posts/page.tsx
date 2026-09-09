import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/site/container";
import { PostRowActions } from "@/components/admin/post-row-actions";
import { formatDate } from "@/lib/constants";
import { POST_TYPE_LABEL, type Post, type PostType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "게시물 관리" };

type FilterType = PostType | "all";
type Visibility = "all" | "published" | "draft";
const TYPES: FilterType[] = ["all", "notice", "activity", "project"];
const VISIBILITIES: Visibility[] = ["all", "published", "draft"];

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const rawType = typeof sp.type === "string" ? sp.type : "all";
  const rawVisibility = typeof sp.visibility === "string" ? sp.visibility : "all";
  const type: FilterType = TYPES.includes(rawType as FilterType) ? rawType as FilterType : "all";
  const visibility: Visibility = VISIBILITIES.includes(rawVisibility as Visibility) ? rawVisibility as Visibility : "all";

  const supabase = await createClient();
  let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(200);
  if (type !== "all") query = query.eq("type", type);
  if (visibility === "published") query = query.eq("published", true);
  if (visibility === "draft") query = query.eq("published", false);
  const { data: posts, error } = await query.returns<Post[]>();

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id).filter((id): id is string => !!id))];
  const authorMap = new Map<string, string>();
  if (authorIds.length) {
    const { data: authors } = await supabase.from("profiles").select("id, name").in("id", authorIds);
    for (const author of authors ?? []) authorMap.set(author.id, author.name);
  }

  const href = (nextType: FilterType, nextVisibility: Visibility) => `/admin/posts?type=${nextType}&visibility=${nextVisibility}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">게시물 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">공지사항, 활동, 프로젝트를 작성하고 공개 상태를 관리합니다.</p>
        </div>
        <Button asChild><Link href="/admin/posts/new">새 게시물</Link></Button>
      </div>

      <div className="space-y-2">
        <nav className="flex gap-1 flex-wrap" aria-label="게시물 종류 필터">
          {TYPES.map((item) => (
            <Link key={item} href={href(item, visibility)} className={cn("text-sm px-3 py-1.5 rounded-md border", item === type ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}>
              {item === "all" ? "전체" : POST_TYPE_LABEL[item]}
            </Link>
          ))}
        </nav>
        <nav className="flex gap-1 flex-wrap" aria-label="공개 상태 필터">
          {VISIBILITIES.map((item) => (
            <Link key={item} href={href(type, item)} className={cn("text-xs px-2.5 py-1 rounded-md border", item === visibility ? "bg-muted font-medium" : "hover:bg-muted")}>
              {item === "all" ? "전체 상태" : item === "published" ? "공개" : "비공개"}
            </Link>
          ))}
        </nav>
      </div>

      {error ? (
        <EmptyState title="게시물 목록을 불러오지 못했습니다" />
      ) : !posts?.length ? (
        <EmptyState title="해당하는 게시물이 없습니다" description="새 게시물을 작성하면 공개 페이지에 표시할 수 있습니다." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>종류</TableHead><TableHead>제목</TableHead><TableHead>상태</TableHead><TableHead>작성자</TableHead><TableHead>작성일</TableHead><TableHead className="text-right">작업</TableHead></TableRow></TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="whitespace-nowrap">{POST_TYPE_LABEL[post.type]}</TableCell>
                <TableCell className="font-medium max-w-md"><Link href={`/admin/posts/${post.id}/edit`} className="hover:underline underline-offset-4">{post.title}</Link></TableCell>
                <TableCell><span className={cn("text-xs px-2 py-1 rounded-full border", post.published ? "bg-foreground text-background border-foreground" : "text-muted-foreground")}>{post.published ? "공개" : "비공개"}</span></TableCell>
                <TableCell className="text-muted-foreground">{post.author_id ? authorMap.get(post.author_id) ?? "(알 수 없음)" : "-"}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(post.created_at)}</TableCell>
                <TableCell><PostRowActions post={post} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
