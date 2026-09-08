import { Container } from "./container";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t mt-16">
      <Container className="py-10 flex flex-col sm:flex-row justify-between gap-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">{SITE.name}</p>
          <p className="mt-1">{SITE.university} · {SITE.nameEn}</p>
        </div>
        <p>© {SITE.name}. All rights reserved.</p>
      </Container>
    </footer>
  );
}
