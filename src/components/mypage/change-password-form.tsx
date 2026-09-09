"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "@/components/auth/field-error";
import { NewPasswordFields } from "@/components/auth/password-fields";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4 max-w-lg" noValidate>
      {state && (
        <Alert variant={state.ok ? "default" : "destructive"}>
          <AlertDescription>{state.ok ? state.message : state.error}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="current_password">현재 비밀번호</Label>
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required className="mt-1.5" />
        <FieldError errors={fe?.current_password} />
      </div>
      <NewPasswordFields fe={fe} />
      <Button type="submit" disabled={pending}>{pending ? "변경 중..." : "비밀번호 변경"}</Button>
    </form>
  );
}
