import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요").max(50),
  student_id: z.string().trim().regex(/^[0-9]{6,12}$/, "학번은 6~12자리 숫자입니다"),
  department: z.string().trim().min(1, "학과를 입력하세요").max(100),
  email: z.string().trim().email("올바른 이메일을 입력하세요").max(254),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(72)
    .regex(/[A-Za-z]/, "영문을 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다"),
  grade: z.union([z.literal(""), z.coerce.number().int().min(1).max(6)]).optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9\-+ ]{9,20}$|^$/, "올바른 전화번호를 입력하세요")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export const profileUpdateSchema = z.object({
  name: signupSchema.shape.name,
  department: signupSchema.shape.department,
  grade: signupSchema.shape.grade,
  phone: signupSchema.shape.phone,
});

export const postSchema = z.object({
  type: z.enum(["notice", "activity", "project"]),
  title: z.string().trim().min(1, "제목을 입력하세요").max(200),
  content: z.string().max(50_000, "본문이 너무 깁니다"),
  published: z.boolean(),
});

export const resourceMetaSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200),
  description: z.string().trim().max(2000),
});

export const settingsSchema = z.object({
  about_intro: z.string().max(10_000),
  about_goals: z.string().max(10_000),
  about_history: z.string().max(10_000),
  about_executives: z.string().max(10_000),
});

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function zodFieldErrors(err: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "_");
    (out[k] ??= []).push(issue.message);
  }
  return out;
}
