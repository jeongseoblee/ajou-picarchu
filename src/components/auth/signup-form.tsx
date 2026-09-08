"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp, resendConfirmation } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldError } from "./field-error";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    const needsConfirm = state.data?.needsEmailConfirm;
    return (
      <div className="space-y-5">
        <Alert>
          <AlertTitle>회원가입 신청이 완료되었습니다</AlertTitle>
          <AlertDescription className="space-y-2">
            {needsConfirm && <p>입력한 이메일로 인증 메일을 보냈습니다. 메일의 링크를 눌러 이메일 인증을 완료하세요.</p>}
            <p>계정은 현재 <strong>승인 대기(pending)</strong> 상태입니다. 관리자가 승인하면 회원 전용 기능을 이용할 수 있습니다.</p>
          </AlertDescription>
        </Alert>
        {needsConfirm && (
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span>메일이 오지 않았나요?</span>
            <Button type="button" variant="outline" size="sm" onClick={async () => setResendMsg((await resendConfirmation(email)).ok ? "인증 메일을 다시 보냈습니다." : "재전송에 실패했습니다.")}>
              인증 메일 재전송
            </Button>
            {resendMsg && <span>{resendMsg}</span>}
          </div>
        )}
        <Button asChild className="w-full"><Link href="/login">로그인 페이지로</Link></Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && (
        <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">이름 <span className="text-destructive">*</span></Label>
          <Input id="name" name="name" required maxLength={50} className="mt-1.5" />
          <FieldError errors={fe?.name} />
        </div>
        <div>
          <Label htmlFor="student_id">학번 <span className="text-destructive">*</span></Label>
          <Input id="student_id" name="student_id" inputMode="numeric" required className="mt-1.5" placeholder="숫자만" />
          <FieldError errors={fe?.student_id} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">학과 <span className="text-destructive">*</span></Label>
          <Input id="department" name="department" required maxLength={100} className="mt-1.5" />
          <FieldError errors={fe?.department} />
        </div>
        <div>
          <Label htmlFor="grade">학년</Label>
          <select id="grade" name="grade" defaultValue="" className="mt-1.5 h-9 w-full rounded-md border bg-transparent px-3 text-sm">
            <option value="">선택 안 함</option>
            {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
          <FieldError errors={fe?.grade} />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">전화번호</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" className="mt-1.5" placeholder="010-0000-0000" />
        <FieldError errors={fe?.phone} />
      </div>
      <div>
        <Label htmlFor="email">이메일 <span className="text-destructive">*</span></Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
        <FieldError errors={fe?.email} />
      </div>
      <div>
        <Label htmlFor="password">비밀번호 <span className="text-destructive">*</span></Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="mt-1.5" />
        <p className="text-xs text-muted-foreground mt-1">8자 이상, 영문과 숫자 포함</p>
        <FieldError errors={fe?.password} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "처리 중..." : "회원가입 신청"}</Button>
      <p className="text-sm text-muted-foreground text-center">
        이미 계정이 있으신가요? <Link href="/login" className="underline underline-offset-4 text-foreground">로그인</Link>
      </p>
    </form>
  );
}
