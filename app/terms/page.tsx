// LEGAL REVIEW REQUIRED: This operational draft must be reviewed before policy-sensitive changes.
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({ title: "Terms", description: "Terms of use for The Line List website and manufacturer directory.", path: "/terms" });

export default function TermsPage() {
  return (
    <><SiteHeader /><main id="main"><article className="prose wrap legal-page">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Terms", href: "/terms" }]} />
      <p className="kicker">Last updated August 22, 2026</p><h1>Terms</h1>
      <p className="lede">These terms describe the current site. They are pending legal review.</p>
      <h2>Directory information</h2><p>The Line List provides educational and directory information. Inclusion is not an endorsement, certification, audit, guarantee of capacity, or guarantee that a manufacturer will accept a project.</p>
      <h2>Verify before acting</h2><p>Public information changes. Confirm capabilities, minimum runs, certifications, pricing, contracts, compliance, and contacts directly with the manufacturer and your own professional advisers before making commitments.</p>
      <h2>Introductions</h2><p>An introduction request is a request for help, not an agreement, accepted order, or promise of a match. Manufacturers make their own decisions about projects and terms.</p>
      <h2>Submissions</h2><p>You may submit only information you are authorized to provide. We may review, edit, decline, or remove submissions to keep the directory useful and attributable. Paid placement, if offered later, will remain separate from verification and organic directory order.</p>
      <h2>Acceptable use</h2><p>Do not misuse forms, attempt unauthorized access, scrape personal contact information for spam, or interfere with the service.</p>
      <h2>Changes and contact</h2><p>We may update the site and these terms as the service changes. Questions can be sent to <a href="mailto:hello@thelinelist.com">hello@thelinelist.com</a>.</p>
    </article></main></>
  );
}
