"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, zodFieldErrors, type ActionResult } from "@/lib/validation";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

type SignUpResult = ActionResult<{ needsEmailConfirm: boolean }>;
export async function signUp(_prev: SignUpResult | null, formData: FormData): Promise<SignUpResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  // 학번 중복은 DB UNIQUE 제약(profiles_student_id_unique)이 최종 기준. trigger 실패 시 signUp 이 'Database error' 를 반환한다.

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/mypage`,
      data: {
        name: d.name,
        student_id: d.student_id,
        department: d.department,
        grade: d.grade === "" || d.grade === undefined ? "" : String(d.grade),
        phone: d.phone ?? "",
      },
    },
  });

  if (error) {
    if (/database error/i.test(error.message)) return { ok: false, error: "이미 등록된 학번 또는 이메일입니다." };
    if (/already registered/i.test(error.message)) return { ok: false, error: "이미 가입된 이메일입니다." };
    return { ok: false, error: "회원가입에 실패했습니다. 잠시 후 다시 시도하세요." };
  }
  // 이메일 인증 ON 이면 session 이 null, identities 가 비어 있으면 기존 이메일
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: "이미 가입된 이메일입니다." };

  return { ok: true, data: { needsEmailConfirm: !data.session } };
}

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "입력값을 확인하세요.", fieldErrors: zodFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/email not confirmed/i.test(error.message)) return { ok: false, error: "이메일 인증이 완료되지 않았습니다. 메일함을 확인하세요." };
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const nextRaw = String(formData.get("next") ?? "");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/mypage";
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resendConfirmation(email: string): Promise<ActionResult> {
  const parsed = loginSchema.shape.email.safeParse(email);
  if (!parsed.success) return { ok: false, error: "올바른 이메일을 입력하세요." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/mypage` },
  });
  if (error) return { ok: false, error: "재전송에 실패했습니다. 잠시 후 다시 시도하세요." };
  return { ok: true, message: "인증 메일을 다시 보냈습니다." };
}


// ---------- Account Security V1 ----------
const newPasswordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .max(72)
  .regex(/[A-Za-z]/, "영문을 포함해야 합니다")
  .regex(/[0-9]/, "숫자를 포함해야 합니다");

/** 로그인 사용자의 비밀번호 변경: 현재 비밀번호 재인증 → updateUser */
export async function changePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "로그인이 필요합니다." };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const fieldErrors: Record<string, string[]> = {};
  if (!current) fieldErrors.current_password = ["현재 비밀번호를 입력하세요"];
  const np = newPasswordSchema.safeParse(next);
  if (!np.success) fieldErrors.new_password = np.error.issues.map((i) => i.message);
  if (next !== confirm) fieldErrors.confirm_password = ["새 비밀번호가 일치하지 않습니다"];
  if (current && next && current === next) fieldErrors.new_password = ["현재 비밀번호와 다른 비밀번호를 사용하세요"];
  if (Object.keys(fieldErrors).length) return { ok: false, error: "입력값을 확인하세요.", fieldErrors };

  // 현재 비밀번호 재인증 (실패 시 변경하지 않음)
  const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (reauthErr) return { ok: false, error: "현재 비밀번호가 올바르지 않습니다.", fieldErrors: { current_password: ["현재 비밀번호가 올바르지 않습니다"] } };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (/same_password|different from the old/i.test(error.message)) return { ok: false, error: "현재 비밀번호와 다른 비밀번호를 사용하세요." };
    if (/weak|pwned|easy to guess/i.test(error.message)) return { ok: false, error: "너무 쉬운 비밀번호입니다. 다른 비밀번호를 사용하세요." };
    return { ok: false, error: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도하세요." };
  }
  return { ok: true, message: "비밀번호가 변경되었습니다." };
}

/** 비밀번호 재설정 메일 요청. 이메일 존재 여부와 무관하게 동일한 응답을 돌려준다. */
export async function requestPasswordReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.shape.email.safeParse(formData.get("email"));
  const done: ActionResult = { ok: true, message: "가입된 계정이라면 비밀번호 재설정 이메일을 전송했습니다. 메일함(스팸함 포함)을 확인하세요." };
  if (!parsed.success) return { ok: false, error: "올바른 이메일을 입력하세요.", fieldErrors: { email: ["올바른 이메일을 입력하세요"] } };

  const supabase = await createClient();
  // 오류(미가입, rate limit 등)도 사용자에게는 동일 메시지 → 계정 존재 여부 노출 방지
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/reset-password`,
  });
  return done;
}

/** recovery 세션에서 새 비밀번호 설정 */
export async function resetPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "재설정 링크가 만료되었거나 유효하지 않습니다. 비밀번호 재설정을 다시 요청하세요." };

  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  const fieldErrors: Record<string, string[]> = {};
  const np = newPasswordSchema.safeParse(next);
  if (!np.success) fieldErrors.new_password = np.error.issues.map((i) => i.message);
  if (next !== confirm) fieldErrors.confirm_password = ["새 비밀번호가 일치하지 않습니다"];
  if (Object.keys(fieldErrors).length) return { ok: false, error: "입력값을 확인하세요.", fieldErrors };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (/same_password|different from the old/i.test(error.message)) return { ok: false, error: "이전 비밀번호와 다른 비밀번호를 사용하세요." };
    if (/weak|pwned|easy to guess/i.test(error.message)) return { ok: false, error: "너무 쉬운 비밀번호입니다. 다른 비밀번호를 사용하세요." };
    return { ok: false, error: "비밀번호 변경에 실패했습니다. 링크가 만료되었다면 재설정을 다시 요청하세요." };
  }
  // recovery 세션 종료 → 새 비밀번호로 재로그인 유도
  await supabase.auth.signOut();
  return { ok: true, message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요." };
}
