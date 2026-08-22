import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "What The Line List is and is not. How a plant gets on a page. How unpublished fields are treated. Fresh Industries.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader current="/about" />
      <main id="main">
        <article className="prose wrap">
          <p className="kicker">Fresh Industries</p>
          <h1>About The Line List</h1>
          <p className="meta">Working draft · 21 Aug 2026 · Not a live product claim</p>

          <p>
            The Line List is a public directory of US food co-packers, plus a
            Tuesday weekly for CPG brand operators. The directory is the public
            utility. The weekly points at it. Process guides stay education —
            they are not the front door.
          </p>

          <div className="split">
            <section>
              <h2>What it is</h2>
              <ul>
                <li>A searchable directory of plant-site-verified US co-packers.</li>
                <li>Named plants, last-verified dates, MOQ only when the plant printed one.</li>
                <li>A Tuesday morning note for founders, brand ops, and commercialization — not the PMMI/CPA plant-side list.</li>
                <li>A named intro to a plant you already picked, if you ask. We do not take a commission on the run.</li>
              </ul>
            </section>
            <section>
              <h2>What it is not</h2>
              <ul>
                <li>Not an RFQ tool and not a login. Not CoPack Connect.</li>
                <li>Not a broker. We do not match you for a cut.</li>
                <li>Not a plant-side magazine (not Melville/TMG, not a PMMI packager list, not a PACK EXPO recap as the product).</li>
                <li>Not InflateMate. Not generic AI-tools-for-CPG. Not a 3PL finder.</li>
              </ul>
            </section>
          </div>

          <h2 id="verify">How a plant gets on a page</h2>
          <p>
            The plant publishes the process on its own site. We fetch that page,
            quote what it prints, and link it. Directory cards, LinkedIn copy,
            and extension copacker lists are not used as plant facts — only as a
            lead to the plant’s own site.
          </p>
          <p>
            If the site does not say the process, the plant is omitted from that
            process table. Closed plants, non-US plants, and equipment OEMs are
            out. This is not a complete census of every US vessel or kettle.
          </p>
          <p>
            The public directory is the plants already named on the process
            pages. The spreadsheet in <code>data/copackers.csv</code> is a
            public-list lead sheet, not a live verified directory. Unverified
            CSV rows are not published as company cards.
          </p>

          <h2>How we treat unpublished fields</h2>
          <p>
            If a cell is blank on the plant’s site, it is marked <Unpublished />.
            We do not invent a plant, phone, email, MOQ, cert, city, or search
            volume to fill it. Unpublished is not small. Throughput (kg/hour,
            vessel size) is not an MOQ.
          </p>
          <p>Re-verify the URL on the company page before you send a deposit. Plant copy moves.</p>

          <h2>The weekly</h2>
          <p>
            <strong>The Line List</strong> — Tuesday morning, America/Chicago.
            400–700 words. Audience: CPG brand operators. Each issue: one
            mismatch (process, MOQ, allergen, or cert); who will actually run it
            (named plants, public facts); one process rule; one thing that
            changed; a reply ask. We do not email plants unless asked.
          </p>
          <p>
            Distribution starts on LinkedIn. Email when a list exists. The list
            is <strong>not open yet</strong> — there is no subscribe backend on
            this site. Write{" "}
            <a href="mailto:hello@thelinelist.com">hello@thelinelist.com</a> if
            you want the Tuesday issue later.
          </p>
          <p>
            Sponsorship: one slot later (co-packer, packaging converter, or 3PL).
            We do not publish a rate. Empty sponsored slots on this site do not
            affect organic ranking.
          </p>

          <h2 id="intro">Request an intro</h2>
          <p>
            If a plant in the <Link href="/copackers">directory</Link> matches
            your process, pack, and published floor, we can introduce you. That
            is a named intro to a plant you already picked — not an AI match,
            not a blind RFQ blast, and not a guarantee they will take the SKU.
            We will not email a plant until you name one and ask. Line time,
            allergen changeover, and real MOQ still get decided by the plant.
          </p>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
