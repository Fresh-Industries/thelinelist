import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { PackageMockupLab } from "@/components/product-visuals/PackageMockupLab";
import "./package-mockup.css";

export const metadata: Metadata = {
  title: "Package Mockup Lab",
  description: "An internal Line List experiment for previewing founder artwork on packaging.",
  robots: { index: false, follow: false },
};

export default function PackageMockupLabPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="package-lab-page">
        <PackageMockupLab />
      </main>
    </>
  );
}
