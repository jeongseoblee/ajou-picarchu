"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost } from "@/app/actions/posts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Post, PostType } from "@/lib/types";

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "notice", label: "공지사항" },
  { value: "activity", label: "활동" },
  { value: "project", label: "프로젝트" },
];

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      type: String(data.get("type") ?? "notice"),
      title: String(data.get("title") ?? ""),
      content: String(data.get("content") ?? ""),
      published: data.get("published") === "on",
    };

    startTransition(async () => {
      setMessage(null);
      setFieldErrors({});
      const result = post ? await updatePost(post.id, input) : await createPost(input);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setMessage({ ok: true, text: result.message ?? "저장되었습니다." });
      if (!post) {
        router.push("/admin/posts");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-3xl">
      {message && (
        <Alert variant={message.ok ? "default" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="type">종류</Label>
        <select
          id="type"
          name="type"
          defaultValue={post?.type ?? "notice"}
          className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {fieldErrors.type?.map((e) => <p key={e} className="mt-1 text-xs text-destructive">{e}</p>)}
      </div>

      <div>
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" defaultValue={post?.title ?? ""} maxLength={200} required className="mt-1.5" />
        {fieldErrors.title?.map((e) => <p key={e} className="mt-1 text-xs text-destructive">{e}</p>)}
      </div>

      <div>
        <Label htmlFor="content">본문</Label>
        <Textarea id="content" name="content" defaultValue={post?.content ?? ""} rows={18} maxLength={50000} className="mt-1.5 font-mono text-sm" />
        <p className="mt-1 text-xs text-muted-foreground">Markdown 문법을 사용할 수 있습니다. HTML은 렌더링되지 않습니다.</p>
        {fieldErrors.content?.map((e) => <p key={e} className="mt-1 text-xs text-destructive">{e}</p>)}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={post?.published ?? false} className="size-4" />
        바로 공개
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "저장 중..." : post ? "저장" : "게시물 등록"}</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => router.push("/admin/posts")}>취소</Button>
      </div>
    </form>
  );
}
