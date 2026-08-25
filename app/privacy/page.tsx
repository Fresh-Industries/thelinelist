// LEGAL REVIEW REQUIRED: This page describes the current implementation and must be reviewed before policy-sensitive changes.
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: "How The Line List handles site, newsletter, contact-help, and listing-submission data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <><SiteHeader /><main id="main"><article className="prose wrap legal-page">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Privacy", href: "/privacy" }]} />
      <p className="kicker">Last updated August 22, 2026</p><h1>Privacy</h1>
      <p className="lede">This page explains the information The Line List currently collects and why. It is pending legal review.</p>
      <h2>Information you provide</h2><p>Newsletter signup collects an email address. Contact-help and listing forms collect the contact, product, production, and manufacturer details you submit. We use those details to respond to your request, review a listing, prevent duplicate submissions, and protect forms from abuse.</p>
      <h2>Where form data goes</h2><p>Depending on deployment configuration, contact-help and listing submissions may be stored in Vercel Blob, sent to our operations inbox for review, or held temporarily in server memory. Newsletter emails are sent to the configured newsletter provider, currently Beehiiv or Kit when enabled.</p>
      <h2>Analytics</h2><p>The site can use Plausible or PostHog when configured. We record interaction events such as product selection, filter use, profile views, contact-help requests, newsletter signups, and guide-to-directory clicks. PostHog is configured to create person profiles only for identified users.</p>
      <h2>Technical information</h2><p>Forms use a privacy-preserving hash derived from request information for rate limiting and duplicate detection. Hosting and analytics providers may process standard request data such as IP address, browser information, and timestamps under their own terms.</p>
      <h2>Your choices</h2><p>You can unsubscribe through any newsletter email. To ask about, correct, or delete information you submitted, email <a href="mailto:hello@thelinelist.com">hello@thelinelist.com</a>.</p>
      <h2>Changes</h2><p>We will update this page when forms, analytics, providers, or data handling change.</p>
    </article></main></>
  );
}
