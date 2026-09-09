import type { Metadata } from "next";
import { PostList } from "@/components/posts/post-list";

export const metadata: Metadata = { title: "PROJECTS" };
export default function ProjectsPage() {
  return <PostList type="project" basePath="/projects" eyebrow="Projects" title="프로젝트" description="회원들이 수행한 연구·개발 프로젝트를 소개합니다." />;
}
