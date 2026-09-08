"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createResource, updateResource } from "@/app/actions/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ACCEPT_ATTR, MAX_FILE_SIZE, formatBytes, isAllowedFile } from "@/lib/constants";
import type { Resource } from "@/lib/types";

/**
 * 업로드: 브라우저 → Supabase Storage 직접 업로드 (사용자 세션, RLS staff-only, bucket 크기/MIME 제한)
 * → server action 이 객체 존재 확인 후 metadata 저장.
 * Server Action 본문 크기 제한 및 Vercel 4.5MB 제한을 피하기 위한 구조.
 */
export function ResourceForm({ userId, resource, onDone }: { userId: string; resource?: Resource; onDone?: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function uploadFile(file: File) {
    if (!isAllowedFile(file.type, file.name)) throw new Error("허용되지 않는 파일 형식입니다.");
    if (file.size > MAX_FILE_SIZE) throw new Error(`파일 크기는 ${formatBytes(MAX_FILE_SIZE)} 이하여야 합니다.`);
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}${ext}`;
    setProgress("업로드 중...");
    const { error } = await createClient().storage.from("resources").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Storage 업로드에 실패했습니다: " + error.message);
    return { storage_path: path, original_filename: file.name, file_size: file.size, mime_type: file.type };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "");
    const description = String(fd.get("description") ?? "");
    const file = fileRef.current?.files?.[0];

    start(async () => {
      setMsg(null);
      try {
        if (!resource) {
          if (!file) throw new Error("파일을 선택하세요.");
          const meta = await uploadFile(file);
          setProgress("등록 중...");
          const r = await createResource({ title, description, ...meta });
          if (!r.ok) {
            await createClient().storage.from("resources").remove([meta.storage_path]);
            throw new Error(r.error);
          }
          setMsg({ ok: true, text: "자료가 등록되었습니다." });
          (e.target as HTMLFormElement).reset();
        } else {
          const replacement = file ? await uploadFile(file) : undefined;
          setProgress("저장 중...");
          const r = await updateResource({ id: resource.id, title, description, replacement });
          if (!r.ok) throw new Error(r.error);
          setMsg({ ok: true, text: "저장되었습니다." });
        }
        router.refresh();
        onDone?.();
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "오류가 발생했습니다." });
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <Alert variant={msg.ok ? "default" : "destructive"}><AlertDescription>{msg.text}</AlertDescription></Alert>}
      <div>
        <Label htmlFor="title">제목 <span className="text-destructive">*</span></Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={resource?.title} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" maxLength={2000} rows={3} defaultValue={resource?.description} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="file">{resource ? "파일 교체 (선택)" : "파일"} {!resource && <span className="text-destructive">*</span>}</Label>
        <Input id="file" name="file" type="file" ref={fileRef} accept={ACCEPT_ATTR} required={!resource} className="mt-1.5" />
        <p className="text-xs text-muted-foreground mt-1">
          PDF, PPT(X), DOC(X), XLS(X), ZIP, 이미지 · 최대 {formatBytes(MAX_FILE_SIZE)}
          {resource && <> · 현재: {resource.original_filename}</>}
        </p>
      </div>
      <Button type="submit" disabled={pending}>{progress ?? (resource ? "저장" : "업로드")}</Button>
    </form>
  );
}
