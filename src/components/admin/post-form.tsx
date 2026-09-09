"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPost, deletePostAttachment, updatePost } from "@/app/actions/posts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPT_ATTR, formatBytes, isAllowedFile, MAX_FILE_SIZE, MAX_POST_ATTACHMENTS } from "@/lib/constants";
import type { Post, PostAttachment, PostType } from "@/lib/types";

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "notice", label: "공지사항" },
  { value: "activity", label: "활동" },
  { value: "project", label: "프로젝트" },
];
const ATTACHMENT_BUCKET = "post-attachments";

type UploadedAttachment = {
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
};

export function PostForm({ userId, post, attachments = [] }: { userId: string; post?: Post; attachments?: PostAttachment[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [progress, setProgress] = useState<string | null>(null);

  async function uploadSelectedFiles(files: File[]): Promise<UploadedAttachment[]> {
    if (!files.length) return [];
    if (attachments.length + files.length > MAX_POST_ATTACHMENTS) {
      throw new Error(`첨부파일은 게시물당 최대 ${MAX_POST_ATTACHMENTS}개까지 등록할 수 있습니다.`);
    }

    for (const file of files) {
      if (!isAllowedFile(file.type, file.name)) throw new Error(`${file.name}: 허용되지 않는 파일 형식입니다.`);
      if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: 파일 크기는 ${formatBytes(MAX_FILE_SIZE)} 이하여야 합니다.`);
    }

    const supabase = createClient();
    const uploaded: UploadedAttachment[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const dot = file.name.lastIndexOf(".");
        const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
        const path = `${userId}/${crypto.randomUUID()}${ext}`;
        setProgress(`첨부파일 업로드 중... (${index + 1}/${files.length})`);
        const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(`${file.name}: Storage 업로드에 실패했습니다.`);
        uploaded.push({ storage_path: path, original_filename: file.name, file_size: file.size, mime_type: file.type });
      }
      return uploaded;
    } catch (error) {
      if (uploaded.length) await supabase.storage.from(ATTACHMENT_BUCKET).remove(uploaded.map((item) => item.storage_path));
      throw error;
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = Array.from(fileRef.current?.files ?? []);
    const baseInput = {
      type: String(data.get("type") ?? "notice"),
      title: String(data.get("title") ?? ""),
      content: String(data.get("content") ?? ""),
      published: data.get("published") === "on",
    };

    startTransition(async () => {
      setMessage(null);
      setFieldErrors({});
      setProgress(files.length ? "첨부파일 확인 중..." : "저장 중...");
      try {
        const uploaded = await uploadSelectedFiles(files);
        setProgress("게시물 저장 중...");
        const result = post
          ? await updatePost(post.id, { ...baseInput, attachments: uploaded })
          : await createPost({ ...baseInput, attachments: uploaded });

        if (!result.ok) {
          if (uploaded.length) await createClient().storage.from(ATTACHMENT_BUCKET).remove(uploaded.map((item) => item.storage_path));
          setMessage({ ok: false, text: result.error });
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }

        setMessage({ ok: true, text: result.message ?? "저장되었습니다." });
        if (!post) {
          router.push("/admin/posts");
        } else {
          if (fileRef.current) fileRef.current.value = "";
          router.refresh();
        }
      } catch (error) {
        setMessage({ ok: false, text: error instanceof Error ? error.message : "첨부파일 처리 중 오류가 발생했습니다." });
      } finally {
        setProgress(null);
      }
    });
  }

  function removeAttachment(attachment: PostAttachment) {
    if (!confirm(`'${attachment.original_filename}' 첨부파일을 삭제할까요?`)) return;
    startTransition(async () => {
      setMessage(null);
      const result = await deletePostAttachment(attachment.id);
      setMessage({ ok: result.ok, text: result.ok ? result.message ?? "삭제되었습니다." : result.error });
      if (result.ok) router.refresh();
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

      <div className="space-y-2">
        <Label htmlFor="attachments">첨부파일</Label>
        {attachments.length > 0 && (
          <div className="divide-y rounded-md border">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{attachment.original_filename}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(attachment.file_size)}</p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => removeAttachment(attachment)}>삭제</Button>
              </div>
            ))}
          </div>
        )}
        <Input
          id="attachments"
          name="attachments"
          type="file"
          ref={fileRef}
          accept={ACCEPT_ATTR}
          multiple
          disabled={attachments.length >= MAX_POST_ATTACHMENTS}
        />
        <p className="text-xs text-muted-foreground">
          PDF, PPT(X), DOC(X), XLS(X), ZIP, 이미지 · 파일당 최대 {formatBytes(MAX_FILE_SIZE)} · 게시물당 최대 {MAX_POST_ATTACHMENTS}개
          {attachments.length > 0 && ` · 현재 ${attachments.length}개`}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={post?.published ?? false} className="size-4" />
        바로 공개
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? progress ?? "처리 중..." : post ? "저장" : "게시물 등록"}</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => router.push("/admin/posts")}>취소</Button>
      </div>
    </form>
  );
}
