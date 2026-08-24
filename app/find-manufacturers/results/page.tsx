import { DIRECTORY_DESCRIPTION, DIRECTORY_TITLE, ManufacturerDirectory } from "@/components/ManufacturerDirectory";
import { parseDirectoryQuery } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...pageMetadata({ title: DIRECTORY_TITLE, description: DIRECTORY_DESCRIPTION, path: "/find-manufacturers", absoluteTitle: true }),
  robots: { index: false, follow: true },
};

export default async function FilteredManufacturerResults({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseDirectoryQuery(await searchParams, { allowSort: true });
  return <ManufacturerDirectory query={query} requestedPage={query.page} />;
}
