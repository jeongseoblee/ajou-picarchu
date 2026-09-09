import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "./field-error";

/** 새 비밀번호 + 확인 입력 (변경/재설정 공용) */
export function NewPasswordFields({ fe }: { fe?: Record<string, string[]> }) {
  return (
    <>
      <div>
        <Label htmlFor="new_password">새 비밀번호</Label>
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={8} className="mt-1.5" />
        <p className="text-xs text-muted-foreground mt-1">8자 이상, 영문과 숫자 포함</p>
        <FieldError errors={fe?.new_password} />
      </div>
      <div>
        <Label htmlFor="confirm_password">새 비밀번호 확인</Label>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} className="mt-1.5" />
        <FieldError errors={fe?.confirm_password} />
      </div>
    </>
  );
}
