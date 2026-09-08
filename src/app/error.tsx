"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-32 text-center">
      <h1 className="text-2xl font-semibold">문제가 발생했습니다</h1>
      <p className="mt-2 text-muted-foreground text-sm">잠시 후 다시 시도하세요.</p>
      <button onClick={reset} className="mt-6 underline underline-offset-4">다시 시도</button>
    </div>
  );
}
