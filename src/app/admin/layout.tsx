import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Container } from "@/components/site/container";

const MENU = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/members", label: "회원 관리" },
  { href: "/admin/resources", label: "자료 관리" },
  { href: "/admin/site-editor", label: "사이트 편집" },
];

/** 모든 /admin 하위 페이지는 이 layout 에서 서버 측 admin 검증을 거친다. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <Container className="py-10">
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="md:w-44 shrink-0">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Admin</p>
          <nav aria-label="관리자 메뉴" className="flex md:flex-col gap-1 flex-wrap">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className="text-sm px-2 py-1.5 rounded hover:bg-muted">{m.label}</Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Container>
  );
}
