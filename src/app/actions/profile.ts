"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema, zodFieldErrors, type ActionResult } from "@/lib/validation";

/** 본인 프로필 수정 (role/status/학번/이메일은 변경 불가 — DB trigger 로도 차단) */
export async function updateMyProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = profileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: d.name,
      department: d.department,
      grade: d.grade === "" || d.grade === undefined ? null : d.grade,
      phone: d.phone ? d.phone : null,
    })
    .eq("id", me.id);
  if (error) return { ok: false, error: "저장에 실패했습니다." };
  revalidatePath("/mypage");
  return { ok: true, message: "저장되었습니다." };
}
