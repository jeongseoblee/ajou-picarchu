import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const SETTING_KEYS = [
  "site_name", "site_subtitle", "school_name", "department_name",
  "hero_eyebrow", "hero_title", "hero_description",
  "hero_primary_text", "hero_primary_url", "hero_secondary_text", "hero_secondary_url",
  "accent_color",
  "about_intro", "about_goals", "about_history", "about_executives",
  "footer_school", "footer_department", "footer_copyright",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type SiteSettings = Record<SettingKey, string>;

export const SECTION_KEYS = ["about", "activities", "projects", "notice", "archive"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export interface HomeSection {
  key: SectionKey;
  title: string;
  description: string;
  enabled: boolean;
  sort_order: number;
}
export const SECTION_HREF: Record<SectionKey, string> = {
  about: "/about", activities: "/activities", projects: "/projects", notice: "/notice", archive: "/archive",
};

/** DB 값이 없을 때(migration 미적용 등) 사용하는 기본값 */
export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "소학회",
  site_subtitle: "Engineering Research Society",
  school_name: "OO대학교",
  department_name: "공과대학",
  hero_eyebrow: "OO대학교 · Engineering Research Society",
  hero_title: "함께 연구하고, 만들고, 공유하는\n공학 소학회",
  hero_description: "학생 주도의 연구·개발 활동을 통해 이론을 실제 프로젝트로 연결합니다.",
  hero_primary_text: "소학회 소개",
  hero_primary_url: "/about",
  hero_secondary_text: "가입 신청",
  hero_secondary_url: "/signup",
  accent_color: "#1e3a8a",
  about_intro: "",
  about_goals: "",
  about_history: "",
  about_executives: "",
  footer_school: "OO대학교",
  footer_department: "공과대학",
  footer_copyright: "© 소학회. All rights reserved.",
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const out: SiteSettings = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) {
    if ((SETTING_KEYS as readonly string[]).includes(row.key)) out[row.key as SettingKey] = row.value;
  }
  return out;
});

export const getHomeSections = cache(async (): Promise<HomeSection[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("home_sections").select("*").order("sort_order");
  return (data as HomeSection[] | null) ?? [];
});

/** 안전한 hex 색상만 통과. 그 외는 기본값 */
export function safeHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : DEFAULT_SETTINGS.accent_color;
}

/** hex → oklch 근사 없이 CSS 변수는 hex 그대로 사용 (Tailwind v4 는 색상값 형식 무관) */
export function accentStyle(hex: string): React.CSSProperties {
  const c = safeHex(hex);
  return { "--primary": c, "--ring": c } as React.CSSProperties;
}
