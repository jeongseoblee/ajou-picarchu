import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "새 비밀번호 설정" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">새 비밀번호 설정</h1>
      {!user ? (
        <div className="space-y-5 mt-6">
          <Alert variant="destructive">
            <AlertTitle>링크가 만료되었거나 유효하지 않습니다</AlertTitle>
            <AlertDescription>비밀번호 재설정 링크는 1회용이며 유효기간이 있습니다. 재설정을 다시 요청하세요.</AlertDescription>
          </Alert>
          <Button asChild className="w-full"><Link href="/auth/forgot-password">재설정 다시 요청</Link></Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-8">{user.email} 계정의 새 비밀번호를 입력하세요.</p>
          <ResetPasswordForm />
        </>
      )}
    </div>
  );
}
