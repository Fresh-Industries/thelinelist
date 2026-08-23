import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { LAST_CHECKED_LABEL } from "@/lib/site";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "How We Verify Listings",
  description: "Where Line List manufacturer listings come from, why missing fields stay visible, and how to claim or correct a plant.",
  path: "/how-we-verify",
});

export default function HowWeVerifyPage() {
  return (
    <>
      <SiteHeader current="/how-we-verify" />
      <main id="main">
        <article className="prose wrap trust-page">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "How we verify", href: "/how-we-verify" }]} />
          <p className="kicker">Trust and sourcing</p>
          <h1>How we verify listings</h1>
          <p className="lede">We show where a listing came from, when it was reviewed, and what we do not know. Inclusion is not an endorsement. Verify compliance, capacity, and fit yourself.</p>

          <h2>Where listings come from</h2>
          <p>We use attributable public sources: manufacturer websites, university Extension lists, state agriculture directories, and details plants submit for review. Every profile links to its source pages.</p>
          <p>We review public evidence before adding product or process capabilities. A submitted correction is not published automatically.</p>

          <h2>What listed means</h2>
          <p>Listed means we found public information that may help someone evaluate a manufacturer. It does not mean we audited the facility, ranked it, or endorsed its work.</p>
          <p>FDA Food Facility Registration is not a public manufacturer directory, so we do not use registration numbers as listing evidence.</p>

          <h2>Not publicly listed is useful</h2>
          <p>If a source does not publish a minimum run, process, certification, phone number, or email, we say “Not publicly listed.” We do not fill the gap with an estimate.</p>
          <p>An unlisted capability is not a no. It is a question to ask the manufacturer.</p>

          <h2>Certifications need a second check</h2>
          <p>We show certifications only when a source names them. Buyers can confirm organic status in the <a href="https://organic.ams.usda.gov/integrity/" rel="noreferrer">USDA Organic Integrity Database</a> and current SQF certification in the <a href="https://www.sqfi.com/find-a-certified-site" rel="noreferrer">SQF Certified Site Directory</a>.</p>
          <p>The absence of a certification on The Line List means we do not have public evidence. Confirm current scope and status directly.</p>

          <h2>Freshness and corrections</h2>
          <p>Current listings were last reviewed {LAST_CHECKED_LABEL}. Public pages change, so each profile keeps its own review date and source links.</p>
          <p><Link href="/claim-submit">Claim or submit a plant</Link> to propose a correction. You can also email <a href="mailto:hello@thelinelist.com">hello@thelinelist.com</a>.</p>

          <div className="cta-band">
            <Link className="btn btn-gold" href="/find-manufacturers">Browse manufacturers</Link>
            <Link className="btn btn-ghost" href="/claim-submit">Claim or submit a plant</Link>
          </div>
        </article>
      </main>
    </>
  );
}
