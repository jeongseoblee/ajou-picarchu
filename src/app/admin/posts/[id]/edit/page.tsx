import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/admin/post-form";
import type { Post, PostAttachment } from "@/lib/types";

export const metadata: Metadata = { title: "게시물 수정" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const [{ data }, { data: attachments }] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle<Post>(),
    supabase.from("post_attachments").select("*").eq("post_id", id).order("created_at", { ascending: true }).returns<PostAttachment[]>(),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">게시물 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">저장 후 공개 페이지와 관리자 목록에 즉시 반영됩니다.</p>
      </div>
      <PostForm userId={admin.id} post={data} attachments={attachments ?? []} />
    </div>
  );
}
