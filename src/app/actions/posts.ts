"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { postSchema, zodFieldErrors, type ActionResult } from "@/lib/validation";

const uuidSchema = z.string().uuid();

function revalidatePostPaths(id?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  for (const base of ["/notice", "/activities", "/projects"]) {
    revalidatePath(base);
    if (id) revalidatePath(`${base}/${id}`);
  }
}

export async function createPost(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...parsed.data, author_id: admin.id })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "게시물 등록에 실패했습니다." };
  revalidatePostPaths(data.id);
  return { ok: true, data: { id: data.id }, message: "게시물이 등록되었습니다." };
}

export async function updatePost(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = uuidSchema.safeParse(id);
  const parsed = postSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "잘못된 게시물입니다." };
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posts").update(parsed.data).eq("id", parsedId.data);
  if (error) return { ok: false, error: "게시물 수정에 실패했습니다." };
  revalidatePostPaths(parsedId.data);
  return { ok: true, message: "저장되었습니다." };
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
  const { error } = await supabase.from("posts").delete().eq("id", parsedId.data);
  if (error) return { ok: false, error: "게시물 삭제에 실패했습니다." };
  revalidatePostPaths(parsedId.data);
  return { ok: true, message: "삭제되었습니다." };
}
