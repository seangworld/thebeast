import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductRoadmapDetail } from "@/app/components/ProductRoadmapVisibility";
import { getProductRoadmapItemForAudience, getProductRoadmapItemsForAudience } from "@/lib/productRoadmapVisibility";

export const dynamicParams = false;

export function generateStaticParams() {
  return getProductRoadmapItemsForAudience("public").map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = getProductRoadmapItemForAudience((await params).slug, "public");
  if (!item) return {};
  return { title: `${item.capability} | Beast Product Roadmap`, description: item.summary, robots: { index: false, follow: true } };
}

export default async function PublicProductRoadmapDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = getProductRoadmapItemForAudience((await params).slug, "public");
  if (!item) notFound();
  return <main className="min-h-screen bg-[#0b1018] px-4 py-8 text-white sm:px-6 sm:py-12"><div className="mx-auto max-w-4xl"><ProductRoadmapDetail item={item} /></div></main>;
}
