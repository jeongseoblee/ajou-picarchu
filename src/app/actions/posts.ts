"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAllowedFile, MAX_FILE_SIZE, MAX_POST_ATTACHMENTS } from "@/lib/constants";
import { postSchema, zodFieldErrors, type ActionResult } from "@/lib/validation";
import type { PostAttachment } from "@/lib/types";

const uuidSchema = z.string().uuid();
const ATTACHMENT_BUCKET = "post-attachments";

const attachmentMetaSchema = z.object({
  storage_path: z.string().min(1).max(500),
  original_filename: z.string().min(1).max(255),
  file_size: z.coerce.number().int().positive().max(MAX_FILE_SIZE),
  mime_type: z.string().min(1).max(100),
});

const postWithAttachmentsSchema = postSchema.extend({
  attachments: z.array(attachmentMetaSchema).max(MAX_POST_ATTACHMENTS).default([]),
});

function revalidatePostPaths(id?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  for (const base of ["/notice", "/activities", "/projects"]) {
    revalidatePath(base);
    if (id) revalidatePath(`${base}/${id}`);
  }
}

async function cleanupObjects(paths: string[]) {
  if (!paths.length) return;
  const supabase = await createClient();
  await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);
}

async function verifyUploadedAttachments(
  userId: string,
  attachments: z.infer<typeof attachmentMetaSchema>[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  for (const item of attachments) {
    if (!item.storage_path.startsWith(`${userId}/`) || item.storage_path.includes("..")) {
      return { ok: false, error: "잘못된 첨부파일 경로입니다." };
    }
    if (!isAllowedFile(item.mime_type, item.original_filename)) {
      return { ok: false, error: "허용되지 않는 첨부파일 형식입니다." };
    }

    const slash = item.storage_path.lastIndexOf("/");
    const folder = item.storage_path.slice(0, slash);
    const objectName = item.storage_path.slice(slash + 1);
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .list(folder, { search: objectName, limit: 1 });
    if (error || !data?.some((obj) => obj.name === objectName)) {
      return { ok: false, error: "업로드된 첨부파일을 찾을 수 없습니다." };
    }
  }

  return { ok: true };
}

async function insertAttachmentRows(postId: string, userId: string, attachments: z.infer<typeof attachmentMetaSchema>[]) {
  if (!attachments.length) return { error: null };
  const supabase = await createClient();
  return supabase.from("post_attachments").insert(
    attachments.map((item) => ({
      post_id: postId,
      storage_path: item.storage_path,
      original_filename: item.original_filename,
      file_size: item.file_size,
      mime_type: item.mime_type,
      uploaded_by: userId,
    })),
  );
}

export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = postWithAttachmentsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { attachments, ...post } = parsed.data;
  const paths = attachments.map((a) => a.storage_path);
  const verified = await verifyUploadedAttachments(admin.id, attachments);
  if (!verified.ok) {
    await cleanupObjects(paths);
    return { ok: false, error: verified.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...post, author_id: admin.id })
    .select("id")
    .single();

  if (error || !data) {
    await cleanupObjects(paths);
    return { ok: false, error: "게시물 등록에 실패했습니다." };
  }

  const { error: attachmentError } = await insertAttachmentRows(data.id, admin.id, attachments);
  if (attachmentError) {
    await supabase.from("posts").delete().eq("id", data.id);
    await cleanupObjects(paths);
    return { ok: false, error: "첨부파일 등록에 실패했습니다." };
  }

  revalidatePostPaths(data.id);
  return { ok: true, data: { id: data.id }, message: "게시물이 등록되었습니다." };
}

export async function updatePost(id: string, input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedId = uuidSchema.safeParse(id);
  const parsed = postWithAttachmentsSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "잘못된 게시물입니다." };
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("post_attachments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", parsedId.data);

  const { attachments, ...post } = parsed.data;
  if ((count ?? 0) + attachments.length > MAX_POST_ATTACHMENTS) {
    await cleanupObjects(attachments.map((a) => a.storage_path));
    return { ok: false, error: `첨부파일은 게시물당 최대 ${MAX_POST_ATTACHMENTS}개까지 등록할 수 있습니다.` };
  }

  const verified = await verifyUploadedAttachments(admin.id, attachments);
  if (!verified.ok) {
    await cleanupObjects(attachments.map((a) => a.storage_path));
    return { ok: false, error: verified.error };
  }

  const { error: attachmentError } = await insertAttachmentRows(parsedId.data, admin.id, attachments);
  if (attachmentError) {
    await cleanupObjects(attachments.map((a) => a.storage_path));
    return { ok: false, error: "첨부파일 등록에 실패했습니다." };
  }

  const { error } = await supabase.from("posts").update(post).eq("id", parsedId.data);
  if (error) {
    if (attachments.length) {
      await supabase.from("post_attachments").delete().in("storage_path", attachments.map((a) => a.storage_path));
      await cleanupObjects(attachments.map((a) => a.storage_path));
    }
    return { ok: false, error: "게시물 수정에 실패했습니다." };
  }

  revalidatePostPaths(parsedId.data);
  return { ok: true, message: "저장되었습니다." };
}

export async function deletePostAttachment(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "잘못된 첨부파일입니다." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("post_attachments")
    .select("id, post_id, storage_path")
    .eq("id", parsedId.data)
    .maybeSingle<Pick<PostAttachment, "id" | "post_id" | "storage_path">>();
  if (!data) return { ok: false, error: "첨부파일을 찾을 수 없습니다." };

  const { error } = await supabase.from("post_attachments").delete().eq("id", data.id);
  if (error) return { ok: false, error: "첨부파일 삭제에 실패했습니다." };
  await supabase.storage.from(ATTACHMENT_BUCKET).remove([data.storage_path]);
  revalidatePostPaths(data.post_id);
  revalidatePath(`/admin/posts/${data.post_id}/edit`);
  return { ok: true, message: "첨부파일이 삭제되었습니다." };
}

export async function setPostPublished(id: string, published: boolean): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success || typeof published !== "boolean") return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ published }).eq("id", parsedId.data);
  if (error) return { ok: false, error: "공개 상태 변경에 실패했습니다." };
  revalidatePostPaths(parsedId.data);
  return { ok: true };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "잘못된 게시물입니다." };

  const supabase = await createClient();
  const { data: attachments } = await supabase
    .from("post_attachments")
    .select("storage_path")
    .eq("post_id", parsedId.data)
    .returns<Pick<PostAttachment, "storage_path">[]>();

  const { error } = await supabase.from("posts").delete().eq("id", parsedId.data);
  if (error) return { ok: false, error: "게시물 삭제에 실패했습니다." };
  if (attachments?.length) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove(attachments.map((a) => a.storage_path));
  }
  revalidatePostPaths(parsedId.data);
  return { ok: true, message: "삭제되었습니다." };
}
