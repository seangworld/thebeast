import { notFound } from "next/navigation";
import { ProductRoadmapDetail } from "@/app/components/ProductRoadmapVisibility";
import { getProductRoadmapItem, productRoadmapItems } from "@/lib/productRoadmapVisibility";

export const dynamicParams = false;

export function generateStaticParams() {
  return productRoadmapItems.map((item) => ({ slug: item.slug }));
}

export default async function MemberProductRoadmapDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = getProductRoadmapItem((await params).slug);
  if (!item) notFound();
  return <main className="beast-page"><div className="beast-container"><ProductRoadmapDetail item={item} member /></div></main>;
}
