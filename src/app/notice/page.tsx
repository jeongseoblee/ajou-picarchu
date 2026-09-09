import type { Metadata } from "next";
import { PostList } from "@/components/posts/post-list";

export const metadata: Metadata = { title: "NOTICE" };
export default function NoticePage() {
  return <PostList type="notice" basePath="/notice" eyebrow="Notice" title="공지사항" description="소학회 운영 및 활동 관련 공지입니다." />;
}
