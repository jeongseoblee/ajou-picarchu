"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/about", label: "ABOUT" },
  { href: "/activities", label: "ACTIVITIES" },
  { href: "/projects", label: "PROJECTS" },
  { href: "/notice", label: "NOTICE" },
  { href: "/archive", label: "ARCHIVE" },
];

export function Navbar({ profile, siteName, siteSubtitle }: { profile: Profile | null; siteName: string; siteSubtitle: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = profile?.role === "admin" && profile.status === "approved";

  const linkCls = (href: string) =>
    cn(
      "text-sm tracking-wide transition-colors hover:text-foreground",
      pathname.startsWith(href) ? "text-foreground font-medium" : "text-muted-foreground"
    );

  const authLinks = profile ? (
    <>
      {isAdmin && (
        <Link href="/admin" className={linkCls("/admin")} onClick={() => setOpen(false)}>
          ADMIN
        </Link>
      )}
      <Link href="/mypage" className={linkCls("/mypage")} onClick={() => setOpen(false)}>
        MY PAGE
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">LOGOUT</Button>
      </form>
    </>
  ) : (
    <>
      <Link href="/login" className={linkCls("/login")} onClick={() => setOpen(false)}>
        LOGIN
      </Link>
      <Button asChild size="sm">
        <Link href="/signup" onClick={() => setOpen(false)}>SIGN UP</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-lg" onClick={() => setOpen(false)}>
          {siteName}
          {siteSubtitle && <span className="hidden sm:inline text-muted-foreground font-normal text-sm ml-2">{siteSubtitle}</span>}
        </Link>

        <nav aria-label="주 메뉴" className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={linkCls(n.href)}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-5">{authLinks}</div>

        <button
          type="button"
          className="md:hidden p-2 -mr-2"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="모바일 메뉴" className="md:hidden border-t bg-background">
          <div className="px-5 py-4 flex flex-col gap-4">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={linkCls(n.href)} onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="border-t pt-4 flex items-center gap-4 flex-wrap">{authLinks}</div>
          </div>
        </nav>
      )}
    </header>
  );
}
