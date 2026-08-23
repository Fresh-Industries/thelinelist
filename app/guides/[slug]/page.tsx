import { GuideLayout } from "@/components/guides/GuideLayout";
import { CORNERSTONE_GUIDES, getCornerstoneGuide } from "@/lib/guides/cornerstones";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return CORNERSTONE_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getCornerstoneGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return pageMetadata({ title: guide.seoTitle, description: guide.description, path: `/guides/${guide.slug}` });
}

export default async function CornerstoneGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getCornerstoneGuide(slug);
  if (!guide) notFound();
  return <GuideLayout guide={guide} />;
}
