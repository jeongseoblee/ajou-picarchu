import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">비밀번호 재설정</h1>
      <p className="text-sm text-muted-foreground mb-8">가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
      <ForgotPasswordForm />
    </div>
  );
}
