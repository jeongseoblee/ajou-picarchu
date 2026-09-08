"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireApproved, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAllowedFile, MAX_FILE_SIZE } from "@/lib/constants";
import { resourceMetaSchema, zodFieldErrors, type ActionResult } from "@/lib/validation";
import type { Resource } from "@/lib/types";

const BUCKET = "resources";
const uuid = z.string().uuid();

/**
 * 업로드 흐름: 브라우저가 Storage 에 직접 업로드(RLS: staff only, bucket: 크기/MIME 제한)
 * → 이 action 이 객체 존재를 확인하고 metadata 를 DB 에 기록한다.
 * storage_path 는 반드시 `${uid}/...` 이어야 하며 서버가 검증한다.
 */
const createSchema = resourceMetaSchema.extend({
  storage_path: z.string().min(1).max(500),
  original_filename: z.string().min(1).max(255),
  file_size: z.coerce.number().int().positive().max(MAX_FILE_SIZE),
  mime_type: z.string().min(1).max(100),
});

export async function createResource(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireStaff();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  if (!d.storage_path.startsWith(`${me.id}/`) || d.storage_path.includes("..")) {
    return { ok: false, error: "잘못된 파일 경로입니다." };
  }
  if (!isAllowedFile(d.mime_type, d.original_filename)) return { ok: false, error: "허용되지 않는 파일 형식입니다." };

  const supabase = await createClient();
  // 업로드된 객체 실제 존재 확인
  const folder = d.storage_path.slice(0, d.storage_path.lastIndexOf("/"));
  const objName = d.storage_path.slice(d.storage_path.lastIndexOf("/") + 1);
  const { data: objs, error: listErr } = await supabase.storage.from(BUCKET).list(folder, { search: objName, limit: 1 });
  if (listErr || !objs?.some((o) => o.name === objName)) return { ok: false, error: "업로드된 파일을 찾을 수 없습니다." };

  const { data, error } = await supabase
    .from("resources")
    .insert({
      title: d.title,
      description: d.description,
      storage_path: d.storage_path,
      original_filename: d.original_filename,
      file_size: d.file_size,
      mime_type: d.mime_type,
      uploaded_by: me.id,
    })
    .select("id")
    .single();
  if (error) {
    // metadata 저장 실패 시 고아 객체 제거
    await supabase.storage.from(BUCKET).remove([d.storage_path]);
    return { ok: false, error: "자료 등록에 실패했습니다." };
  }
  revalidatePath("/archive");
  revalidatePath("/admin/resources");
  revalidatePath("/admin");
  return { ok: true, data: { id: data.id } };
}

/** 제목/설명 수정 (+ 선택적으로 파일 교체). 파일 교체 시 새 객체는 이미 업로드된 상태. */
const updateSchema = resourceMetaSchema.extend({
  id: uuid,
  replacement: createSchema.pick({ storage_path: true, original_filename: true, file_size: true, mime_type: true }).optional(),
});

export async function updateResource(input: unknown): Promise<ActionResult> {
  const me = await requireStaff();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("resources").select("*").eq("id", d.id).single<Resource>();
  if (!existing) return { ok: false, error: "자료를 찾을 수 없습니다." };
  if (me.role !== "admin" && existing.uploaded_by !== me.id) return { ok: false, error: "수정 권한이 없습니다." };

  const patch: Partial<Resource> = { title: d.title, description: d.description };
  if (d.replacement) {
    const r = d.replacement;
    if (!r.storage_path.startsWith(`${me.id}/`) || r.storage_path.includes("..")) return { ok: false, error: "잘못된 파일 경로입니다." };
    if (!isAllowedFile(r.mime_type, r.original_filename)) return { ok: false, error: "허용되지 않는 파일 형식입니다." };
    Object.assign(patch, r);
  }

  const { error } = await supabase.from("resources").update(patch).eq("id", d.id);
  if (error) return { ok: false, error: "수정에 실패했습니다." };

  if (d.replacement && d.replacement.storage_path !== existing.storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  }
  revalidatePath("/archive");
  revalidatePath("/admin/resources");
  return { ok: true, message: "저장되었습니다." };
}

/** 삭제: admin 만 (RLS 도 admin 만 delete 허용) */
export async function deleteResource(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("resources").select("storage_path").eq("id", parsedId.data).single();
  if (!existing) return { ok: false, error: "자료를 찾을 수 없습니다." };

  const { error } = await supabase.from("resources").delete().eq("id", parsedId.data);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
  await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  revalidatePath("/archive");
  revalidatePath("/admin/resources");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * 다운로드: 로그인 → approved → 자료 접근(RLS) → signed URL → download_logs 기록.
 * signed URL 발급이 성공한 경우에만 로그를 남겨 실패한 시도가 카운트되지 않도록 한다.
 * 다운로드 수는 download_logs insert trigger 가 원자적으로 증가시킨다.
 */
export async function requestDownload(id: string): Promise<ActionResult<{ url: string; filename: string }>> {
  const me = await requireApproved();
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { data: res } = await supabase
    .from("resources")
    .select("id, storage_path, original_filename")
    .eq("id", parsedId.data)
    .single();
  if (!res) return { ok: false, error: "자료를 찾을 수 없거나 접근 권한이 없습니다." };

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(res.storage_path, 60, { download: res.original_filename });
  if (signErr || !signed) return { ok: false, error: "다운로드 링크 생성에 실패했습니다." };

  const { error: logErr } = await supabase.from("download_logs").insert({ user_id: me.id, file_id: res.id });
  if (logErr) return { ok: false, error: "다운로드 기록 저장에 실패했습니다." };

  revalidatePath("/archive");
  revalidatePath("/mypage");
  return { ok: true, data: { url: signed.signedUrl, filename: res.original_filename } };
}
