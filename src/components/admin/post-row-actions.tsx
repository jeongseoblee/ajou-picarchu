"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost, setPostPublished } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/types";

export function PostRowActions({ post }: { post: Post }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null);
      const result = await task();
      if (!result.ok) setError(result.error ?? "작업에 실패했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button asChild size="sm" variant="outline"><Link href={`/admin/posts/${post.id}/edit`}>수정</Link></Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setPostPublished(post.id, !post.published))}
        >
          {post.published ? "비공개" : "공개"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (confirm(`\"${post.title}\" 게시물을 삭제하시겠습니까?`)) run(() => deletePost(post.id));
          }}
        >
          삭제
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
