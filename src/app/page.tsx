import Link from "next/link";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <section className="border-b">
        <Container className="py-24 sm:py-32">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">{SITE.university} · {SITE.nameEn}</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl">
            함께 연구하고, 만들고, 공유하는 공학 소학회
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
            {SITE.name}은 학생 주도의 연구·개발 활동을 통해 이론을 실제 프로젝트로 연결합니다.
            세미나, 프로젝트, 기술 자료 공유를 통해 함께 성장합니다.
          </p>
          <div className="mt-10 flex gap-3">
            <Button asChild><Link href="/about">소학회 소개</Link></Button>
            <Button asChild variant="outline"><Link href="/signup">가입 신청</Link></Button>
          </div>
        </Container>
      </section>
      <section>
        <Container className="py-16 grid sm:grid-cols-3 gap-10">
          {[
            { title: "ACTIVITIES", href: "/activities", desc: "정기 세미나, 스터디, 워크숍 등 소학회의 활동 기록" },
            { title: "PROJECTS", href: "/projects", desc: "회원들이 수행한 연구·개발 프로젝트" },
            { title: "ARCHIVE", href: "/archive", desc: "회원 전용 기술 자료 및 발표 자료 (승인된 회원)" },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="group border-t pt-5">
              <h2 className="font-mono text-sm tracking-widest group-hover:underline underline-offset-4">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </Container>
      </section>
    </>
  );
}
