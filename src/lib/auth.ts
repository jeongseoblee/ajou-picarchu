import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** 현재 로그인 사용자 + 프로필. 요청 단위로 캐시된다. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
});

export async function requireUser(next?: string) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return profile;
}

export async function requireApproved(next?: string) {
  const profile = await requireUser(next);
  if (profile.status !== "approved") redirect("/mypage?notice=not-approved");
  return profile;
}

export async function requireStaff() {
  const profile = await requireUser();
  if (profile.status !== "approved" || (profile.role !== "executive" && profile.role !== "admin")) {
    redirect("/mypage?notice=forbidden");
  }
  return profile;
}

export async function requireAdmin() {
  const profile = await requireUser();
  if (profile.status !== "approved" || profile.role !== "admin") redirect("/mypage?notice=forbidden");
  return profile;
}

export const isStaff = (p: Profile | null) =>
  !!p && p.status === "approved" && (p.role === "executive" || p.role === "admin");
export const isAdmin = (p: Profile | null) => !!p && p.status === "approved" && p.role === "admin";
export const isApproved = (p: Profile | null) => !!p && p.status === "approved";
