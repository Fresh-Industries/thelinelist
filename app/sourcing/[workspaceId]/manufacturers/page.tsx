import type { Metadata } from "next";
import { SourcingManufacturers } from "@/components/sourcing/SourcingManufacturers";

export const metadata: Metadata = {
  title: "Manufacturer possibilities",
  description: "Review evidence-backed manufacturer possibilities for this private product plan.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ManufacturersPage() {
  return (
    <main id="main" className="sourcing-workspace-view sourcing-manufacturers-view">
      <SourcingManufacturers />
    </main>
  );
}
