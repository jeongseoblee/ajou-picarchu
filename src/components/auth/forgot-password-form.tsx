"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "./field-error";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div className="space-y-5">
        <Alert><AlertDescription>{state.message}</AlertDescription></Alert>
        <Button asChild variant="outline" className="w-full"><Link href="/login">로그인 페이지로</Link></Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
      <div>
        <Label htmlFor="email">가입한 이메일</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        <FieldError errors={fe?.email} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "전송 중..." : "재설정 이메일 보내기"}</Button>
      <p className="text-sm text-muted-foreground text-center">
        <Link href="/login" className="underline underline-offset-4 text-foreground">로그인으로 돌아가기</Link>
      </p>
    </form>
  );
}
