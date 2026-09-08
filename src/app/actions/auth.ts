"use server";

import { redirect } from "next/navigation";
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

