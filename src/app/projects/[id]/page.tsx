import { PostDetail } from "@/components/posts/post-detail";
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} type="project" basePath="/projects" eyebrow="Projects" />;
}
