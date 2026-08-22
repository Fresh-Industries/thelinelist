import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClaimBand } from "@/components/ClaimBand";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { claimPlantOptions } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "What The Line List is and is not. How a plant gets on a page. How unpublished fields are treated. Fresh Industries.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <SiteHeader current="/about" />
      <main id="main">
        <article className="prose wrap">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "About", href: "/about" },
            ]}
          />
          <p className="kicker">Fresh Industries</p>
          <h1>About The Line List</h1>
          <p>
            The Line List is a public directory of verified U.S. food and beverage manufacturers,
            plus a Tuesday weekly for CPG founders and brand ops. The directory is the public
            utility. The weekly points at it. Process guides stay in Learn. They are not the front
            door.
          </p>

          <div className="split">
            <section>
              <h2>What it is</h2>
              <ul>
                <li>A searchable directory of plant-site-verified U.S. food and beverage manufacturers.</li>
                <li>Named plants, last-verified dates, minimum order only when the plant printed one.</li>
                <li>A Tuesday morning note for founders and brand ops.</li>
                <li>
                  A named intro to a plant you already picked, if you ask. We do not take a
                  commission on the run.
                </li>
              </ul>
            </section>
            <section>
              <h2>What it is not</h2>
              <ul>
                <li>Not an RFQ tool and not a login. Not CoPack Connect.</li>
                <li>Not a broker. We do not match you for a cut.</li>
                <li>Not a plant-side magazine.</li>
                <li>Not a 3PL finder.</li>
              </ul>
            </section>
          </div>

          <h2 id="verify">How a plant gets on a page</h2>
          <p>
            The plant publishes the process on its own site. We fetch that page, quote what it
            prints, and link it. Directory cards, LinkedIn copy, and extension copacker lists are
            not used as plant facts, only as a lead to the plant&apos;s own site.
          </p>
          <p>
            If the site does not say the process, the plant is omitted from that process table.
            Closed plants, non-U.S. plants, and equipment OEMs are out. This is not a complete
            census of every U.S. vessel or kettle.
          </p>
          <p>
            The public directory is the plants already named on the process pages. The spreadsheet
            in <code>data/copackers.csv</code> is a public-list lead sheet, not a live verified
            directory. Unverified CSV rows are not published as company cards.
          </p>

          <h2>How we treat unpublished fields</h2>
          <p>
            If a cell is blank on the plant&apos;s site, it is marked <Unpublished />. We do not
            invent a plant, phone, email, minimum order, cert, city, or search volume to fill it.
            Unpublished is not small. Throughput (kg/hour, vessel size) is not a minimum order.
          </p>
          <p>Re-verify the URL on the company page before you send a deposit. Plant copy moves.</p>

          <h2>The weekly</h2>
          <p>
            <strong>The Line List</strong>, Tuesday morning, America/Chicago. 400–700 words.
            Audience: CPG brand operators. Each issue: one mismatch (process, minimum order,
            allergen, or cert); who will actually run it (named plants, public facts); one process
            rule; one thing that changed; a reply ask. We do not email plants unless asked.
          </p>
          <p>
            Sponsorship: one slot later (co-packer, packaging converter, or 3PL). We do not publish
            a rate. Featured slots on this site do not affect organic ranking.
          </p>

          <h2 id="prepare">What to have ready</h2>
          <p>
            Founders who outgrow a cottage, home, or commercial kitchen often hit MOQ, setup, and
            first-run cash walls, and worry a kitchen recipe will not survive scale-up. Get clarity
            before you outreach.
          </p>
          <ol>
            <li>Business and marketing clarity: goals, product description, and a realistic order size.</li>
            <li>
              Written specs: ingredients preferably by weight, pack and label notes,
              finished-product quality.
            </li>
            <li>Volume and forecast honesty: target run size and rough scale-up goals.</li>
            <li>
              Ask early about audits or certs buyers may need (HACCP / Preventive Controls,
              third-party audits, USDA for meat/poultry, Kosher / Halal / organic / gluten-free /
              non-GMO when relevant). There is no universal required-cert list.
            </li>
            <li>Packaging format and who buys materials.</li>
            <li>Timeline: when you need product; expect trials and revisions.</li>
            <li>Capital plus storage and distribution after the run.</li>
            <li>
              NDA posture: be ready to discuss confidentiality before sharing the full recipe.
            </li>
          </ol>
          <p className="honest">
            There is no universal MOQ or required-cert checklist that every plant demands. Who
            files acidified Forms FDA 2541 / 2541e (brand vs plant) depends on who is the
            commercial processor of record. Leave that to counsel and the plant.
          </p>
          <p>
            This directory is not FDA Food Facility Registration. FFR data are not a public plant
            list.
          </p>
          <ol className="footnotes">
            <li>
              [S1] Process, pack, and published floor still come from the plant&apos;s own site, not
              from a generic checklist.
            </li>
            <li>
              [S2] Filing ownership for acidified foods is a commercial-processor question, not a
              directory field we invent.
            </li>
          </ol>

          <h2 id="intro">Request an intro</h2>
          <p>
            If a plant in the <Link href="/copackers">directory</Link> matches your process, pack,
            and published floor, we can introduce you. Bring the prep checklist above. You pick the
            plant. We introduce you. No commission. An intro is not a guarantee they will take the
            SKU.
          </p>
          <p>
            Open a company page and use Request an intro there. We will review before we make an
            intro. We will not email a plant until you name one and ask.
          </p>

          <ClaimBand plants={claimPlantOptions()} withForm />
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
