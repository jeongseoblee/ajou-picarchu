import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https?:\/\/[^\s]+$/i.test(v), "내부 경로(/...) 또는 http(s) URL 만 허용됩니다");
export const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "#RRGGBB 형식의 hex 색상만 허용됩니다");

export const siteSettingsSchema = z.object({
  site_name: text(50).min(1, "사이트 이름을 입력하세요"),
  site_subtitle: text(100),
  school_name: text(100),
  department_name: text(100),
  hero_eyebrow: text(120),
  hero_title: text(200).min(1, "Hero 제목을 입력하세요"),
  hero_description: text(600),
  hero_primary_text: text(30),
  hero_primary_url: safeUrl,
  hero_secondary_text: text(30),
  hero_secondary_url: safeUrl,
  accent_color: hexColor,
  about_intro: text(10_000),
  about_goals: text(10_000),
  about_history: text(10_000),
  about_executives: text(10_000),
  footer_school: text(100),
  footer_department: text(100),
  footer_copyright: text(200),
});

export const homeSectionsSchema = z.array(
  z.object({
    key: z.enum(["about", "activities", "projects", "notice", "archive"]),
    title: text(60).min(1),
    description: text(200),
    enabled: z.boolean(),
    sort_order: z.number().int().min(0).max(100),
  })
).max(5);
