import { PostDetail } from "@/components/posts/post-detail";
export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} type="notice" basePath="/notice" eyebrow="Notice" />;
}
