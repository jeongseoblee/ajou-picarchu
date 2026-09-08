import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-32 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <Link href="/" className="mt-6 inline-block underline underline-offset-4">홈으로</Link>
    </div>
  );
}
