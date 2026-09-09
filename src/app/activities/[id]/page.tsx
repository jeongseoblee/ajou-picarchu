import { PostDetail } from "@/components/posts/post-detail";
export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} type="activity" basePath="/activities" eyebrow="Activities" />;
}
