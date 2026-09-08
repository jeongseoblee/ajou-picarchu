"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation";

const statusSchema = z.enum(["pending", "approved", "rejected", "suspended"]);
const roleSchema = z.enum(["member", "executive", "admin"]);
const uuid = z.string().uuid();

/** 회원 상태 변경 (승인/거절/정지/대기). 서버 측 admin 검증 + DB trigger/RLS 이중 방어. */
export async function setMemberStatus(userId: string, status: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = uuid.safeParse(userId);
  const st = statusSchema.safeParse(status);
  if (!id.success || !st.success) return { ok: false, error: "잘못된 요청입니다." };
  if (id.data === admin.id && st.data !== "approved") return { ok: false, error: "자기 자신의 상태는 변경할 수 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status: st.data }).eq("id", id.data);
  if (error) return { ok: false, error: "상태 변경에 실패했습니다." };
  revalidatePath("/admin/members");
  revalidatePath("/admin");
  return { ok: true };
}

/** 회원 역할 변경 */
export async function setMemberRole(userId: string, role: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = uuid.safeParse(userId);
  const r = roleSchema.safeParse(role);
  if (!id.success || !r.success) return { ok: false, error: "잘못된 요청입니다." };
  if (id.data === admin.id && r.data !== "admin") return { ok: false, error: "자기 자신의 관리자 권한은 해제할 수 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: r.data }).eq("id", id.data);
  if (error) return { ok: false, error: "역할 변경에 실패했습니다." };
  revalidatePath("/admin/members");
  return { ok: true };
}
