import Link from "next/link";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { getHomeSections, getSiteSettings, SECTION_HREF } from "@/lib/site";

export default async function HomePage() {
  const [s, sections] = await Promise.all([getSiteSettings(), getHomeSections()]);
  const visible = sections.filter((x) => x.enabled);

  return (
    <>
      <section className="border-b">
        <Container className="py-24 sm:py-32">
          {s.hero_eyebrow && <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">{s.hero_eyebrow}</p>}
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl whitespace-pre-line">{s.hero_title}</h1>
          {s.hero_description && <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed whitespace-pre-line">{s.hero_description}</p>}
          {(s.hero_primary_text || s.hero_secondary_text) && (
            <div className="mt-10 flex gap-3 flex-wrap">
              {s.hero_primary_text && s.hero_primary_url && <Button asChild><Link href={s.hero_primary_url}>{s.hero_primary_text}</Link></Button>}
              {s.hero_secondary_text && s.hero_secondary_url && <Button asChild variant="outline"><Link href={s.hero_secondary_url}>{s.hero_secondary_text}</Link></Button>}
            </div>
          )}
        </Container>
      </section>
      {visible.length > 0 && (
        <section>
          <Container className="py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {visible.map((c) => (
              <Link key={c.key} href={SECTION_HREF[c.key]} className="group border-t pt-5">
                <h2 className="font-mono text-sm tracking-widest group-hover:underline underline-offset-4">{c.title}</h2>
                {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
              </Link>
            ))}
          </Container>
        </section>
      )}
    </>
  );
}
