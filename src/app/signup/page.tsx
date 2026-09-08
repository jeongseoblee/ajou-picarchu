import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">회원가입</h1>
      <p className="text-sm text-muted-foreground mb-8">가입 신청 후 관리자 승인을 거쳐 정식 회원이 됩니다.</p>
      <SignupForm />
    </div>
  );
}
