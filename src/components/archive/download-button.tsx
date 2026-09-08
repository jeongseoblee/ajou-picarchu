"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestDownload } from "@/app/actions/resources";

export function DownloadButton({ id, size = "sm" }: { id: string; size?: "sm" | "default" }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size={size}
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await requestDownload(id);
            if (!r.ok) return setErr(r.error);
            // signed URL 은 60초 유효. 브라우저가 Content-Disposition 헤더로 저장한다.
            window.location.assign(r.data!.url);
          })
        }
      >
        <Download className="size-4" /> {pending ? "준비 중..." : "다운로드"}
      </Button>
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
    </div>
  );
}
