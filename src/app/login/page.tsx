import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "로그인" };

const NOTICES: Record<string, string> = {
  "auth-callback": "이메일 인증 링크가 유효하지 않거나 만료되었습니다. 다시 로그인하거나 인증 메일을 재전송하세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const err = typeof sp.error === "string" ? NOTICES[sp.error] : undefined;
  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">로그인</h1>
      <LoginForm next={next} notice={err} />
    </div>
  );
}
