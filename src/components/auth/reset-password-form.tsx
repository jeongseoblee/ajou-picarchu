"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NewPasswordFields } from "./password-fields";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div className="space-y-5">
        <Alert><AlertDescription>{state.message}</AlertDescription></Alert>
        <Button asChild className="w-full"><Link href="/login">로그인</Link></Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
      <NewPasswordFields fe={fe} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "변경 중..." : "비밀번호 변경"}</Button>
    </form>
  );
}
