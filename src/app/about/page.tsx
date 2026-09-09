import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/site/container";
import { Markdown } from "@/components/site/markdown";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = { title: "ABOUT" };

export default async function AboutPage() {
  const s = await getSiteSettings();
  const blocks = [
    { id: "intro", title: "소학회 소개", content: s.about_intro },
    { id: "goals", title: "활동 목표", content: s.about_goals },
    { id: "history", title: "연혁", content: s.about_history },
    { id: "executives", title: "임원진", content: s.about_executives },
  ].filter((b) => b.content.trim());

  return (
    <>
      <PageHeader eyebrow="About" title={s.site_name} description={[s.school_name, s.department_name].filter(Boolean).join(" · ")} />
      <Container className="py-10 space-y-14">
        {blocks.length === 0 && <p className="text-muted-foreground">소개 내용이 아직 등록되지 않았습니다.</p>}
        {blocks.map((b) => (
          <section key={b.id} id={b.id}>
            <h2 className="text-xl font-semibold tracking-tight mb-4">{b.title}</h2>
            <Markdown content={b.content} />
          </section>
        ))}
      </Container>
    </>
  );
}
