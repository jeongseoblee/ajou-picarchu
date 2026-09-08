"use client";

import { useState, useTransition } from "react";
import { setMemberRole, setMemberStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

export function MemberRowActions({ member, selfId }: { member: Profile; selfId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isSelf = member.id === selfId;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "실패");
    });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {member.status !== "approved" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => setMemberStatus(member.id, "approved"))}>승인</Button>
        )}
        {member.status === "pending" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMemberStatus(member.id, "rejected"))}>거절</Button>
        )}
        {member.status === "approved" && !isSelf && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => { if (confirm(`${member.name} 회원을 정지하시겠습니까?`)) run(() => setMemberStatus(member.id, "suspended")); }}>정지</Button>
        )}
        <select
          aria-label="역할 변경"
          className="h-8 rounded-md border bg-transparent px-2 text-xs"
          value={member.role}
          disabled={pending || isSelf}
          onChange={(e) => run(() => setMemberRole(member.id, e.target.value))}
        >
          <option value="member">회원</option>
          <option value="executive">임원</option>
          <option value="admin">관리자</option>
        </select>
      </div>
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
    </div>
  );
}
