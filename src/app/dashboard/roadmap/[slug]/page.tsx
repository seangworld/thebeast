import { notFound } from "next/navigation";
import { ProductRoadmapDetail } from "@/app/components/ProductRoadmapVisibility";
import { getProductRoadmapItemForAudience, getProductRoadmapItemsForAudience } from "@/lib/productRoadmapVisibility";

export const dynamicParams = false;

export function generateStaticParams() {
  return getProductRoadmapItemsForAudience("member").map((item) => ({ slug: item.slug }));
}

export default async function MemberProductRoadmapDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = getProductRoadmapItemForAudience((await params).slug, "member");
  if (!item) notFound();
  return <main className="beast-page"><div className="beast-container"><ProductRoadmapDetail item={item} member /></div></main>;
}
