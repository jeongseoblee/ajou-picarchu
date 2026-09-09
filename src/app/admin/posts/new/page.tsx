import type { Metadata } from "next";
import { PostForm } from "@/components/admin/post-form";

export const metadata: Metadata = { title: "새 게시물" };

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">새 게시물</h1>
        <p className="mt-1 text-sm text-muted-foreground">공지사항, 활동 또는 프로젝트 글을 작성합니다.</p>
      </div>
      <PostForm />
    </div>
  );
}
