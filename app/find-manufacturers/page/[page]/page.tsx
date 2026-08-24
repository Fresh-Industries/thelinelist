import { DIRECTORY_DESCRIPTION, DIRECTORY_TITLE, ManufacturerDirectory } from "@/components/ManufacturerDirectory";
import { DIRECTORY_PAGE_SIZE, getDirectoryPlants } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  const pageCount = Math.ceil(getDirectoryPlants().length / DIRECTORY_PAGE_SIZE);
  return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return pageMetadata({
    title: `${DIRECTORY_TITLE} — Page ${page}`,
    description: DIRECTORY_DESCRIPTION,
    path: `/find-manufacturers/page/${page}`,
    absoluteTitle: true,
  });
}

export default async function ManufacturerDirectoryPage({ params }: { params: Promise<{ page: string }> }) {
  const page = Number((await params).page);
  const pageCount = Math.ceil(getDirectoryPlants().length / DIRECTORY_PAGE_SIZE);
  if (!Number.isSafeInteger(page) || page < 2 || page > pageCount) notFound();
  return <ManufacturerDirectory query={{}} requestedPage={page} schemaPath={`/find-manufacturers/page/${page}`} />;
}
