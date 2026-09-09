import type { Metadata } from "next";
import { PostList } from "@/components/posts/post-list";

export const metadata: Metadata = { title: "ACTIVITIES" };
export default function ActivitiesPage() {
  return <PostList type="activity" basePath="/activities" eyebrow="Activities" title="활동" description="소학회가 진행한 교육, 세미나, 견학 및 교류 활동을 기록합니다." />;
}
