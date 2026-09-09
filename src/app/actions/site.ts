"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { homeSectionsSchema, siteSettingsSchema } from "@/lib/site-validation";
import { zodFieldErrors, type ActionResult } from "@/lib/validation";

function revalidateSite() {
  for (const p of ["/", "/about", "/admin/site-editor"]) revalidatePath(p);
  revalidatePath("/", "layout"); // navbar/footer
}

export async function saveSiteSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };

  const supabase = await createClient();
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
  // RLS: admin update 정책만 존재(insert 정책 없음) → 각 키는 migration 으로 이미 존재
  const results = await Promise.all(rows.map((r) => supabase.from("site_settings").update({ value: r.value }).eq("key", r.key)));
  const failed = results.find((r) => r.error);
  if (failed) return { ok: false, error: "저장에 실패했습니다. migration 0002 적용 여부를 확인하세요." };
  revalidateSite();
  return { ok: true, message: "저장되었습니다." };
}

export async function saveHomeSections(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = homeSectionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "섹션 설정이 올바르지 않습니다." };

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map((s, i) =>
      supabase.from("home_sections").update({ title: s.title, description: s.description, enabled: s.enabled, sort_order: i + 1 }).eq("key", s.key)
    )
  );
  if (results.some((r) => r.error)) return { ok: false, error: "저장에 실패했습니다." };
  revalidateSite();
  return { ok: true, message: "저장되었습니다." };
}
