import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { GuidePlantTable } from "@/components/guides/GuidePlantTable";
import { plantsForGuide } from "@/lib/directory";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Food co-packers with small MOQs",
  description:
    "“Small MOQ” is not a number. It is a process, a line, and a plant’s published floor — if they even publish one.",
};

export default function SmallMoqGuidePage() {
  const count = plantsForGuide("small-moq").length;

  return (
    <>
      <SiteHeader current="/guides/small-moq" />
      <main id="main">
        <article className="prose wrap">
          <p className="kicker">Process guide</p>
          <h1>Food Co-Packers With Small MOQs (What “Small” Actually Means)</h1>
          <p className="meta">
            Last verified 21 Aug 2026 · Search volume: unpublished · Named plants only · MOQ only when the plant printed one
          </p>

          <div className="when">
            <p>
              Use this page for a first run when you can fund a published floor. Only plants that printed a number (or a dollar floor) are in the table. If they did not print one, they are not here.
            </p>
            <p>Compare in the unit they quote: $2,500 is not 5,000 pouches is not 7,500 liters is not 25 gallons of sauce.</p>
            <p>
              What “small” means by process, and who will not take you, sit in the <a href="#textbook">textbook below</a>.
            </p>
          </div>
          <nav className="jump" aria-label="On this page">
            <a href="#food-co-packers-with-small-moqs">Food co-packers with small MOQs</a>
            <a href="#how-to-show-up-ready">Show up ready</a>
            <a href="#request-an-intro">Request an intro</a>
            <a href="#textbook">Textbook</a>
          </nav>

          <h2 id="food-co-packers-with-small-moqs">Food co-packers with small MOQs</h2>
          <p>
            Only plants that <strong>publish an MOQ</strong> or a clearly numeric small-run pitch. If the MOQ is unpublished, the plant is not here. EU plants are not here. Certifications are what the plant printed, not what we inferred.
          </p>
          <GuidePlantTable guide="small-moq" />
          <p>
            <strong>Plant count in this table: {count}.</strong> That is every US food co-packer we re-verified on 21 Aug 2026 that printed a numeric or dollar MOQ and pitched small/startup runs. It is not a census of US plants. Most plants hide the number.
          </p>

          <h2 id="how-to-show-up-ready">How to show up ready (we are not brokering this draft)</h2>
          <p>Plants that print low minimums still waste a week on a founder who cannot answer the line questions. Bring this, in writing:</p>
          <ol>
            <li><strong>Process, not vibe.</strong> Hot-fill, retort, acidified kettle, cold-fill, HPP, dry blend, flexible pack, bakery. Minimus will not hot-fill you. InnoMark will not carbonate you. IBR is a pouch/sachet/stick-pack house, not a 100k can retort.</li>
            <li><strong>Formula that can be made on a line.</strong> Finished commercial recipe, not a home batch.</li>
            <li><strong>pH, aw, and scheduled process status.</strong> Acidified and low-acid foods are not “sauce, but spicy.”</li>
            <li><strong>Packaging that exists.</strong> A 5,000-unit fill is useless if the printed pouch MOQ is 25,000.</li>
            <li><strong>A forecast, not a wish.</strong> First-run quantity <strong>and</strong> 12-month replenishment.</li>
            <li><strong>Cash and certs.</strong> Match the badge in the table. Do not send an organic brief to a plant that did not publish organic.</li>
          </ol>
          <p>
            A founder who finishes this page should be able to say one of: <strong>25-gallon kettle sauce</strong>, <strong>5,000-unit pouch</strong>, <strong>~7,000–7,500 liter hot-fill</strong>, <strong>$2,500 pack-out</strong>, or <strong>not ready</strong>.
          </p>

          <h2 id="request-an-intro">Request an intro</h2>
          <p>
            If a plant in the table matches your process <strong>and</strong> you can fund the published floor, request an intro. We will not email the plant for you from this page. See the{" "}
            <Link href="/copackers?smallMoq=1">small-MOQ directory cards</Link>.
          </p>

          <details className="textbook" id="textbook">
            <summary>What small means by process, who will not take you, sources</summary>
            <p className="textbook-mark">Textbook — after the shortlist</p>
            <h2>The SERP is selling hope. Plants sell line time.</h2>
            <p>
              On 21 Aug 2026, the <em>food co-packer small MOQ</em> query was bid by plant homepages, not by a public directory of minimums. If a plant did not print a number, this page writes <Unpublished />. We do not guess a minimum. We do not list unpublished plants as “small-MOQ co-packers.”
            </p>
            <h2>What “small” means, by process</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Process</th>
                    <th>Published “small” (21 Aug 2026)</th>
                    <th>Not this</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Contract fill / pack-out</strong></td>
                    <td>Minimus: <strong>$2,500 per project</strong>. Does <strong>not</strong> hot-fill, pasteurize, or run aseptic.</td>
                    <td>Hot-fill, retort, USDA meat/dairy</td>
                  </tr>
                  <tr>
                    <td><strong>Flexible pack</strong></td>
                    <td>IBR: “regularly run orders as small as <strong>5,000 units</strong>.”</td>
                    <td>100k retort; 7,500 L hot-fill</td>
                  </tr>
                  <tr>
                    <td><strong>Hot-fill liquid</strong></td>
                    <td>InnoMark: hero “as low as <strong>7,500 liters</strong>”; FAQ “<strong>must be larger than 7,000 liters</strong>.”</td>
                    <td>25-gallon kettle sauce; $2,500 pack-out</td>
                  </tr>
                  <tr>
                    <td><strong>Kettle sauce / dry blend</strong></td>
                    <td>Parish Foods: <strong>25 gal</strong> / <strong>50 gal</strong>. Co-Packing Express: <strong>100 gal</strong> liquids, <strong>400 lb</strong> dry.</td>
                    <td>National sauce houses</td>
                  </tr>
                  <tr>
                    <td><strong>Spout-pouch liquid fill</strong></td>
                    <td>Precision Pack Partners: “as low as <strong>250 units</strong>” (20–500 ml).</td>
                    <td>Hot-fill liters; HPP; retort</td>
                  </tr>
                  <tr>
                    <td><strong>HPP tolling</strong></td>
                    <td><Unpublished /> (Universal Pure, Maryland Packaging). Throughput is not an MOQ.</td>
                    <td>A named “HPP small-MOQ plant.” We do not have one.</td>
                  </tr>
                  <tr>
                    <td><strong>Retort / can</strong></td>
                    <td>Not small. Big Brands: <strong>100K units/SKU</strong> retort; <strong>25,000</strong> bottled.</td>
                    <td>A Kickstarter-funded first run</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="table-hint">On a small screen, scroll the table sideways — cells are not smashed.</p>
            <h2>Who will not take you</h2>
            <p>
              Chelten House, Stir Foods, Tulkoff, and Supreme Cuisine rank for sauce co-man queries. On the public pages reviewed, <strong>none published a numeric MOQ</strong> except Supreme (1,000 gallons). Unpublished ≠ small.
            </p>
            <p>
              <strong>Unpublished:</strong> search volume; HPP numeric MOQs; named bakery MOQs; IBR stick-pack/kitting floors (stated as variable); Parish Foods facility city on its own site.
            </p>
          </details>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
