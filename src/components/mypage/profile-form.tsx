"use client";

import { useActionState } from "react";
import { updateMyProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "@/components/auth/field-error";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateMyProfile, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4 max-w-lg" noValidate>
      {state && (
        <Alert variant={state.ok ? "default" : "destructive"}>
          <AlertDescription>{state.ok ? state.message : state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>이메일</Label>
          <Input value={profile.email} disabled className="mt-1.5" />
        </div>
        <div>
          <Label>학번</Label>
          <Input value={profile.student_id} disabled className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" defaultValue={profile.name} required className="mt-1.5" />
          <FieldError errors={fe?.name} />
        </div>
        <div>
          <Label htmlFor="department">학과</Label>
          <Input id="department" name="department" defaultValue={profile.department} required className="mt-1.5" />
          <FieldError errors={fe?.department} />
        </div>
        <div>
          <Label htmlFor="grade">학년</Label>
          <select id="grade" name="grade" defaultValue={profile.grade ?? ""} className="mt-1.5 h-9 w-full rounded-md border bg-transparent px-3 text-sm">
            <option value="">선택 안 함</option>
            {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="phone">전화번호</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} className="mt-1.5" />
          <FieldError errors={fe?.phone} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "저장 중..." : "저장"}</Button>
    </form>
  );
}
