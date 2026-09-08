"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "./field-error";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}
      {state && !state.ok && (
        <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
      )}
      <div>
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        <FieldError errors={fe?.email} />
      </div>
      <div>
        <Label htmlFor="password">비밀번호</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1.5" />
        <FieldError errors={fe?.password} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "로그인 중..." : "로그인"}</Button>
      <p className="text-sm text-muted-foreground text-center">
        계정이 없으신가요? <Link href="/signup" className="underline underline-offset-4 text-foreground">회원가입</Link>
      </p>
    </form>
  );
}
