"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteResource } from "@/app/actions/resources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ResourceForm } from "./resource-form";
import type { Resource } from "@/lib/types";

export function ResourceRowActions({ resource, userId, canDelete }: { resource: Resource; userId: string; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline">수정</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>자료 수정</DialogTitle></DialogHeader>
            <ResourceForm userId={userId} resource={resource} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
        {canDelete && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm(`"${resource.title}" 을(를) 삭제하시겠습니까? 파일도 함께 삭제됩니다.`)) return;
              start(async () => {
                const r = await deleteResource(resource.id);
                if (!r.ok) setErr(r.error);
                else router.refresh();
              });
            }}
          >
            삭제
          </Button>
        )}
      </div>
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
    </div>
  );
}
