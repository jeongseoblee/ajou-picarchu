import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/constants";
import { daysAgoIso } from "@/lib/dates";
import { StatusBadge } from "@/components/site/status-badge";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const since = daysAgoIso(7);
  const [members, pending, resources, posts, downloads, recentMembers, recentResources] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("download_logs").select("id", { count: "exact", head: true }).gte("downloaded_at", since),
    supabase.from("profiles").select("id, name, department, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("resources").select("id, title, download_count, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "전체 회원", value: members.count ?? 0, href: "/admin/members?status=all" },
    { label: "승인 대기", value: pending.count ?? 0, href: "/admin/members?status=pending" },
    { label: "등록 자료", value: resources.count ?? 0, href: "/admin/resources" },
    { label: "게시물", value: posts.count ?? 0 },
    { label: "최근 7일 다운로드", value: downloads.count ?? 0 },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <dl className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border">
        {stats.map((s) => (
          <div key={s.label} className="bg-background p-5">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {s.href ? <Link href={s.href} className="hover:underline">{s.value}</Link> : s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="font-semibold mb-3">최근 가입 회원</h2>
          <ul className="divide-y border-y text-sm">
            {recentMembers.data?.map((m) => (
              <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <span>{m.name} <span className="text-muted-foreground">· {m.department}</span></span>
                <span className="flex items-center gap-3"><StatusBadge status={m.status} /><span className="text-muted-foreground">{formatDate(m.created_at)}</span></span>
              </li>
            ))}
            {!recentMembers.data?.length && <li className="py-6 text-center text-muted-foreground">없음</li>}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold mb-3">최근 업로드 자료</h2>
          <ul className="divide-y border-y text-sm">
            {recentResources.data?.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="truncate">{r.title}</span>
                <span className="text-muted-foreground shrink-0">↓ {r.download_count} · {formatDate(r.created_at)}</span>
              </li>
            ))}
            {!recentResources.data?.length && <li className="py-6 text-center text-muted-foreground">없음</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
