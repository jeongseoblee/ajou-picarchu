import { Container } from "./container";
import type { SiteSettings } from "@/lib/site";

export function Footer({ settings: s }: { settings: SiteSettings }) {
  const line = [s.footer_school, s.footer_department, s.site_subtitle].filter(Boolean).join(" · ");
  return (
    <footer className="border-t mt-16">
      <Container className="py-10 flex flex-col sm:flex-row justify-between gap-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">{s.site_name}</p>
          {line && <p className="mt-1">{line}</p>}
        </div>
        <p>{s.footer_copyright}</p>
      </Container>
    </footer>
  );
}
