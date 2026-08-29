import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "For Food and Beverage Manufacturers",
  description: "Claim, correct, or submit a manufacturer profile and ask about clearly labeled featured listings.",
  path: "/for-manufacturers",
});

const actions = [
  {
    title: "Claim an existing profile",
    body: "Tell us who you are and which facility you represent. Every claim is reviewed manually before profile access or facts change.",
  },
  {
    title: "Correct public information",
    body: "Send a source for an outdated product, process, package, certification, contact, or minimum. Blank and unsupported claims stay unpublished.",
  },
  {
    title: "Submit a new facility",
    body: "Add a U.S. food or beverage manufacturing facility that is missing from the directory. We review public sources before listing it.",
  },
  {
    title: "Ask about a featured listing",
    body: "Register interest in a clearly labeled paid placement. Pricing is not published yet, and a featured placement is not an endorsement.",
  },
  {
    title: "Receive qualified inquiries",
    body: "When a founder asks for contact help, The Line List may review the request and follow up about next steps. We do not promise traffic, leads, replies, or sales.",
  },
];

export default function ForManufacturersPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <article className="prose wrap manufacturer-partner-page">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "For manufacturers", href: "/for-manufacturers" }]} />
          <p className="kicker">For manufacturers</p>
          <h1>Keep your public profile useful and accurate</h1>
          <p className="lede">
            The Line List helps food and beverage founders compare publicly sourced manufacturing information. Manufacturers can submit changes and opportunities for manual review.
          </p>

          <div className="split">
            {actions.slice(0, 4).map((action) => (
              <section key={action.title}>
                <h2>{action.title}</h2>
                <p>{action.body}</p>
              </section>
            ))}
          </div>

          <section>
            <h2>{actions[4].title}</h2>
            <p>{actions[4].body}</p>
          </section>

          <aside className="honest" role="note">
            <strong>How paid placement works</strong>
            <p>Paid placements are always labeled. Payment never improves organic A–Z directory ranking, and a featured placement is not an endorsement.</p>
          </aside>

          <h2>What happens after you submit</h2>
          <ol>
            <li>Your submission is stored privately for review.</li>
            <li>We check profile changes against the public sources you provide.</li>
            <li>We follow up by email if we need clarification or have a relevant next step.</li>
          </ol>
          <p>Private contact details are not published. Profile claims are never auto-approved.</p>

          <div className="profile-actions">
            <Link className="btn btn-gold" href="/claim-submit">Claim, correct, or submit a profile</Link>
            <Link className="btn btn-ghost" href="/how-we-verify">How we verify listings</Link>
          </div>
        </article>
      </main>
    </>
  );
}

