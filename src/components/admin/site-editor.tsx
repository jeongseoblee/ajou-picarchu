"use client";

import { useState, useTransition } from "react";
import { saveHomeSections, saveSiteSettings } from "@/app/actions/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "@/components/auth/field-error";
import type { HomeSection, SiteSettings, SettingKey } from "@/lib/site";

type Tab = "general" | "hero" | "theme" | "sections" | "about" | "footer";
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" }, { id: "hero", label: "Home Hero" }, { id: "theme", label: "Theme" },
  { id: "sections", label: "Home Sections" }, { id: "about", label: "About" }, { id: "footer", label: "Footer" },
];

const FIELDS: Record<Exclude<Tab, "sections">, { key: SettingKey; label: string; multiline?: boolean; hint?: string }[]> = {
  general: [
    { key: "site_name", label: "사이트 이름" }, { key: "site_subtitle", label: "부제 (영문명 등)" },
    { key: "school_name", label: "학교명" }, { key: "department_name", label: "학과/단과대" },
  ],
  hero: [
    { key: "hero_eyebrow", label: "상단 소제목" }, { key: "hero_title", label: "제목", multiline: true, hint: "줄바꿈 반영" },
    { key: "hero_description", label: "설명", multiline: true },
    { key: "hero_primary_text", label: "주 버튼 문구" }, { key: "hero_primary_url", label: "주 버튼 링크", hint: "/about 또는 https://..." },
    { key: "hero_secondary_text", label: "보조 버튼 문구" }, { key: "hero_secondary_url", label: "보조 버튼 링크" },
  ],
  theme: [{ key: "accent_color", label: "강조 색상 (hex)", hint: "#RRGGBB — 버튼, 링크, 포커스 링에 적용" }],
  about: [
    { key: "about_intro", label: "소학회 소개 (Markdown)", multiline: true }, { key: "about_goals", label: "활동 목표 (Markdown)", multiline: true },
    { key: "about_history", label: "연혁 (Markdown 표 권장)", multiline: true }, { key: "about_executives", label: "임원진 (Markdown 표 권장)", multiline: true },
  ],
  footer: [
    { key: "footer_school", label: "학교" }, { key: "footer_department", label: "학과/단과대" }, { key: "footer_copyright", label: "저작권 문구" },
  ],
};

export function SiteEditor({ initialSettings, initialSections }: { initialSettings: SiteSettings; initialSections: HomeSection[] }) {
  const [tab, setTab] = useState<Tab>("general");
  const [s, setS] = useState<SiteSettings>(initialSettings);
  const [sections, setSections] = useState<HomeSection[]>(initialSections);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fe, setFe] = useState<Record<string, string[]>>({});

  const set = (k: SettingKey, v: string) => setS((p) => ({ ...p, [k]: v }));
  const move = (i: number, dir: -1 | 1) =>
    setSections((p) => { const n = [...p]; const j = i + dir; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = () =>
    start(async () => {
      setMsg(null); setFe({});
      const r = tab === "sections" ? await saveHomeSections(sections) : await saveSiteSettings(s);
      if (!r.ok) { setFe(r.fieldErrors ?? {}); setMsg({ ok: false, text: r.error }); }
      else setMsg({ ok: true, text: r.message ?? "저장되었습니다." });
    });

  const hexOk = /^#[0-9a-fA-F]{6}$/.test(s.accent_color);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
      <div className="space-y-5">
        <nav className="flex flex-wrap gap-1 border-b" aria-label="편집 영역">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setMsg(null); }}
              className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === t.id ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {msg && <Alert variant={msg.ok ? "default" : "destructive"}><AlertDescription>{msg.text}</AlertDescription></Alert>}

        {tab !== "sections" ? (
          <div className="space-y-4">
            {FIELDS[tab].map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.multiline ? (
                  <Textarea id={f.key} value={s[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={f.key.startsWith("about") ? 8 : 3} className="mt-1.5 font-mono text-[13px]" />
                ) : f.key === "accent_color" ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input type="color" aria-label="색상 선택" value={hexOk ? s.accent_color : "#1e3a8a"} onChange={(e) => set("accent_color", e.target.value)} className="h-9 w-12 rounded border p-0.5" />
                    <Input id={f.key} value={s[f.key]} onChange={(e) => set(f.key, e.target.value)} className="font-mono w-36" maxLength={7} />
                  </div>
                ) : (
                  <Input id={f.key} value={s[f.key]} onChange={(e) => set(f.key, e.target.value)} className="mt-1.5" />
                )}
                {f.hint && <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>}
                <FieldError errors={fe[f.key]} />
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y border-y">
            {sections.map((sec, i) => (
              <li key={sec.key} className="py-3 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" size="sm" variant="outline" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                  <Button type="button" size="sm" variant="outline" aria-label="아래로" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>↓</Button>
                  <label className="ml-2 flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={sec.enabled} onChange={(e) => setSections((p) => p.map((x) => x.key === sec.key ? { ...x, enabled: e.target.checked } : x))} />
                    표시
                  </label>
                </div>
                <div className="flex-1 grid sm:grid-cols-[10rem_1fr] gap-2">
                  <Input aria-label={`${sec.key} 제목`} value={sec.title} maxLength={60} onChange={(e) => setSections((p) => p.map((x) => x.key === sec.key ? { ...x, title: e.target.value } : x))} />
                  <Input aria-label={`${sec.key} 설명`} value={sec.description} maxLength={200} onChange={(e) => setSections((p) => p.map((x) => x.key === sec.key ? { ...x, description: e.target.value } : x))} />
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0 self-center">{sec.key}</span>
              </li>
            ))}
            {sections.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">섹션 데이터 없음</li>}
          </ul>
        )}

        <Button type="button" onClick={save} disabled={pending}>{pending ? "저장 중..." : "저장"}</Button>
      </div>

      {/* Preview: 현재 편집 중 상태를 단순 렌더링 (저장 전 미리보기) */}
      <aside className="hidden lg:block">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Preview</p>
        <div className="border rounded-md overflow-hidden text-[13px] bg-background" style={{ ["--primary" as string]: hexOk ? s.accent_color : "#1e3a8a" }}>
          <div className="h-11 border-b flex items-center justify-between px-4">
            <span className="font-semibold">{s.site_name || "사이트 이름"}<span className="ml-2 text-muted-foreground font-normal text-xs">{s.site_subtitle}</span></span>
            <span className="text-xs text-muted-foreground">ABOUT · NOTICE · ARCHIVE</span>
          </div>
          <div className="px-6 py-10 border-b">
            {s.hero_eyebrow && <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{s.hero_eyebrow}</p>}
            <p className="text-xl font-semibold tracking-tight whitespace-pre-line">{s.hero_title}</p>
            {s.hero_description && <p className="mt-3 text-muted-foreground whitespace-pre-line">{s.hero_description}</p>}
            <div className="mt-5 flex gap-2">
              {s.hero_primary_text && <span className="px-3 py-1.5 rounded text-white text-xs" style={{ background: hexOk ? s.accent_color : "#1e3a8a" }}>{s.hero_primary_text}</span>}
              {s.hero_secondary_text && <span className="px-3 py-1.5 rounded border text-xs">{s.hero_secondary_text}</span>}
            </div>
          </div>
          <div className="px-6 py-6 grid grid-cols-3 gap-4 border-b">
            {sections.filter((x) => x.enabled).map((x) => (
              <div key={x.key} className="border-t pt-2">
                <p className="font-mono text-[10px] tracking-widest">{x.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{x.description}</p>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 flex justify-between text-[11px] text-muted-foreground">
            <span><span className="text-foreground font-medium">{s.site_name}</span> · {[s.footer_school, s.footer_department].filter(Boolean).join(" · ")}</span>
            <span>{s.footer_copyright}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">저장 전 상태를 단순화해 보여줍니다. ABOUT 본문은 <a href="/about" target="_blank" className="underline">/about</a> 에서 확인하세요.</p>
      </aside>
    </div>
  );
}
