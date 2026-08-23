import { NewsletterCta } from "@/components/NewsletterCta";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { GuidePlantTable } from "@/components/guides/GuidePlantTable";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hot fill co-packers",
  description:
    "Named US hot fill co-packers for high-acid sauces, juices, teas, and shots. Plants, last-verified, MOQ only when the plant printed one.",
};

export default function HotFillGuidePage() {
  return (
    <>
      <SiteHeader current="/guides/hot-fill" />
      <main id="main">
        <article className="prose wrap process-guide">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: "Hot fill", href: "/guides/hot-fill" }]} />
          <p className="kicker">Process guide</p>
          <h1>Hot Fill Co-Packers for Sauces, Juices, Teas, and Shots</h1>
          <p className="meta">
            Last verified 21 Aug 2026. Named plants only. Minimum order only when the plant printed one.
          </p>

          <div className="when">
            <p>
              Use hot fill when high-acid juice, tea, shot, or sauce can take 185–200°F and must be ambient. Heat plus acidity is the kill step. You do not need a retort shell.
            </p>
            <p>
              Do not send never-cooked or probiotic juice here (that is HPP). Do not send low-acid ambient broth or plant milk here (pH greater than 4.6 is LACF — retort or aseptic). Dairy is plant-specific: Yoshida refuses it; InnoMark does not produce high-pH refrigerated products.
            </p>
            <p>
              Acid vs low-acid, PET vs glass vs pouch, and the full decision table sit in the <a href="#textbook">textbook below</a>.
            </p>
          </div>
          <nav className="jump" aria-label="On this page">
            <a href="#hot-fill-co-packers">Hot fill co-packers</a>
            <a href="#request-an-intro">Request an intro</a>
            <a href="#textbook">Textbook</a>
          </nav>

          <h2 id="hot-fill-co-packers">Hot fill co-packers</h2>
          <p>
            Facts below are from the plant’s own pages fetched <strong>21 Aug 2026</strong>. If a cell is blank on their site, it is <Unpublished />. This is not a complete census.
          </p>
          <p><strong>Omitted from this table</strong></p>
          <ul>
            <li>
              <strong>Lenis Foods &amp; Co-Packing</strong> (<a href="https://leniscopacking.com/">leniscopacking.com</a>): homepage states the company <strong>is no longer in operation</strong>. Address published is Abbotsford, BC, <strong>Canada</strong>. Not a US plant.
            </li>
            <li>
              <strong>Motherlode Co-Packing</strong> (Hudson, CO): sauce/condiment co-packer with kettles and 12-head fillers; <strong>their own site does not say “hot fill.”</strong> LinkedIn copy is not used here.
            </li>
          </ul>
          <GuidePlantTable guide="hot-fill" />
          <h3>How to read the MOQ column</h3>
          <p>
            Published minimums are not comparable units. InnoMark quotes <strong>liters</strong>, Creative Foodworks <strong>gallons per batch</strong>, Big Brands <strong>units per SKU</strong>, Yoshida a <strong>gallons-per-day annual screen</strong>, Paradise a <strong>typical project start</strong>. Convert before you rank plants. If MOQ is unpublished, assume nothing.
          </p>

          <h2 id="process-decision-before-you-request-an-intro">Process decision (before you request an intro)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Your SKU</th>
                  <th>First question</th>
                  <th>If yes</th>
                  <th>If no</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Juice, tea, sports drink, wellness shot, acid sauce</td>
                  <td>Finished pH ≤ 4.6, no dairy, can take 185–200°F?</td>
                  <td>Hot fill. Pick PET vs glass from the table.</td>
                  <td>If heat kills the product → HPP/cold-fill. If pH &gt; 4.6 ambient → retort/aseptic.</td>
                </tr>
                <tr>
                  <td>Hot sauce, BBQ, salsa, marinade</td>
                  <td>Acidified or naturally acid? Process authority letter?</td>
                  <td>Creative Foodworks / Yoshida / Paradise / Maryland (glass) are the sauce-shaped plants in this set.</td>
                  <td>Meat in the formula → ask USDA vs FDA before sampling.</td>
                </tr>
                <tr>
                  <td>Dairy drink, creamer, yogurt beverage</td>
                  <td>Can the plant run dairy?</td>
                  <td>Almost none of the plants above publish a dairy hot-fill program. Yoshida <strong>cannot</strong>.</td>
                  <td>Refrigerated dairy, aseptic, or retort — not this page.</td>
                </tr>
                <tr>
                  <td>Protein drink, broth, plant milk at pH &gt; 4.6</td>
                  <td>Is this LACF?</td>
                  <td>File a scheduled process. Look at <strong>retort</strong> plants (Big Brands publishes retort separately at 100k units/SKU).</td>
                  <td>Do not send it to a juice hot-fill line and hope.</td>
                </tr>
                <tr>
                  <td>Live probiotic / “never heated” juice</td>
                  <td>Will 185°F destroy the claim?</td>
                  <td>Yes. Use HPP (Select Juice, Maryland Packaging, Big Brands list HPP).</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Carbonated or alcoholic</td>
                  <td>Does the plant say it will run it?</td>
                  <td>Big Brands hot-fill page includes alcoholic and non-alcoholic. InnoMark FAQ: <strong>no</strong>.</td>
                  <td>Different process (tunnel pasteurization, canning).</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-hint">On a small screen, scroll the table sideways — cells are not smashed.</p>

          <h2 id="request-an-intro">Request an intro</h2>
          <p>
            If a plant in the table fits pH, format, and published minimum, we can <strong>introduce you</strong>. That is a named intro to a plant you already picked, not an AI match, not a blind RFQ blast, and not a guarantee they will take the SKU.
          </p>
          <p>
            See the <Link href="/copackers?process=hot-fill">hot-fill directory cards</Link> for the same plants.
          </p>

          <details className="textbook" id="textbook">
            <summary>What hot fill is, acid vs low-acid, PET vs glass, decision table, gaps, sources</summary>
            <p className="textbook-mark">Textbook — after the shortlist</p>
            <h2>What hot fill actually is</h2>
            <p>
              Hot fill is a thermal fill, not a pressure cook. The product is heated, filled hot into a heat-capable container, closed, and held so the heat sanitizes the product, the headspace, and the closure. The pack is then cooled. As it cools, the headspace contracts and a vacuum forms.
            </p>
            <p>Two plants publish fill temperatures on their own sites:</p>
            <ul>
              <li><a href="https://innomarkinc.com/">InnoMark</a>: product heated to <strong>185–200°F</strong>, filled, sealed, inverted to sanitize the cap, then cooled.</li>
              <li><a href="https://www.bigbrandsllc.com/hot-fill-beverage-co-packing">Big Brands</a>: product heated to <strong>194°F</strong>, filled into glass or PET, held <strong>15–20 seconds</strong>, then cooled (their page also describes a rest to 180°F before cap — confirm the actual line sequence in a plant walkthrough).</li>
            </ul>
            <p>
              Hot fill is the default ambient process for <strong>high-acid</strong> juices, teas, sports drinks, wellness shots, ketchup-style sauces, hot sauce, and many marinades. It is the wrong process when heat destroys the product you are selling, or when acidity cannot carry the safety case.
            </p>
            <h2>Acid vs low-acid (operator version)</h2>
            <p>
              A food with finished equilibrium <strong>pH greater than 4.6</strong> and water activity <strong>greater than 0.85</strong>, packed in a hermetically sealed container for ambient sale, is a <strong>low-acid canned food</strong>. That class needs a filed scheduled process — typically retort or aseptic — not a sauce hot-fill line.
            </p>
            <p>
              <strong>USDA vs FDA</strong> is a different cut. Meat- or poultry-containing sauces can fall under USDA FSIS. None of the plants in the table publish a clear “USDA-inspected meat line vs FDA juice line” split on the pages fetched. Organic is <em>not</em> the same as FSIS meat inspection.
            </p>
            <h2>What is still unpublished (do not invent it)</h2>
            <ul>
              <li><strong>USDA FSIS vs FDA</strong> for meat sauces.</li>
              <li><strong>MOQ</strong> for Maryland Packaging and Select Juice; <strong>city</strong> for Big Brands’ Southern California hot-fill plant.</li>
              <li><strong>Glass</strong> at Select Juice; Yoshida is plastic only.</li>
              <li><strong>Lenis Foods</strong> is closed and Canadian — ignore stale SERP titles.</li>
            </ul>
            <p>
              Sources fetched 21 Aug 2026 are linked in the table and on each{" "}
              <Link href="/copackers">company page</Link>. CoPack Connect, LinkedIn, and extension lists were not used as plant facts.
            </p>
          </details>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
