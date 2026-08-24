import { DIRECTORY_DESCRIPTION, DIRECTORY_TITLE, ManufacturerDirectory } from "@/components/ManufacturerDirectory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const dynamic = "force-static";
export const metadata: Metadata = pageMetadata({
  title: DIRECTORY_TITLE,
  description: DIRECTORY_DESCRIPTION,
  path: "/find-manufacturers",
  absoluteTitle: true,
});

export default function FindManufacturersPage() {
  return <ManufacturerDirectory query={{}} />;
}
