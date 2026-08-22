import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { GuidePlantTable } from "@/components/guides/GuidePlantTable";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sauce and condiment contract manufacturers",
  description:
    "Named US sauce and condiment contract manufacturers — hot fill, kettle, acidified. MOQ only when the plant printed one.",
};

export default function SauceGuidePage() {
  return (
    <>
      <SiteHeader current="/guides/sauce" />
      <main id="main">
        <article className="prose wrap">
          <p className="kicker">Process guide</p>
          <h1>Sauce and Condiment Contract Manufacturers (Hot Fill, Kettle, Acidified)</h1>
          <p className="meta">
            Last verified 21 Aug 2026 · Search volume: unpublished · Named plants only · MOQ only when the plant printed one
          </p>

          <div className="when">
            <p>
              Use this page for sauce or condiment — hot fill, kettle, acidified; retort if cheese, cream, or broth. A sauce is not one process.
            </p>
            <p>
              If pH will not hold at or below 4.6 ambient, that is LACF — retort, not a hot-fill acid line. If the claim is never-cooked, that is HPP. Unpublished MOQ is not small: Chelten House, Stir Foods, and Tulkoff did not print a number.
            </p>
            <p>
              Acid vs low-acid and the full decision table sit in the <a href="#textbook">textbook below</a>.
            </p>
          </div>
          <nav className="jump" aria-label="On this page">
            <a href="#sauce-contract-manufacturers">Sauce contract manufacturers</a>
            <a href="#request-an-intro">Request an intro</a>
            <a href="#textbook">Textbook</a>
          </nav>

          <h2 id="sauce-contract-manufacturers">Sauce contract manufacturers</h2>
          <p>
            Facts from the plant’s own pages fetched <strong>21 Aug 2026</strong>. Blank on their site = <Unpublished />. Not a census. Unpublished MOQ ≠ small — Chelten, Stir, and Tulkoff are not 25-gallon plants.
          </p>
          <GuidePlantTable guide="sauce" />
          <p>
            <strong>Omitted</strong> (fetched 21 Aug 2026; one-line reason): <strong>Yoshida</strong> — hot-fill, plastic only, no dairy (still in the <Link href="/copackers/yoshida-foods">directory</Link> via the hot-fill page). <strong>Co-Packing Express</strong> — 100 gal liquid (still in the directory via small MOQ). <strong>Lanovara</strong> — hot/cold fill; acidified/LACF; average 75–250 cases, not a floor. <strong>Spicin / Flavorcraft / Carolina CoPacking</strong> — sauce claims; MOQ or fill unpublished. <strong>Sauce Crafters</strong> (Riviera Beach, FL) — 30-year sauce copack, pH test + test batch; MOQ/fill unpublished. <strong>Beaverton</strong> — brand shop; no incoming copack service page. <strong>Stello</strong> — contract packaging/private label; MOQ/fill unpublished. <strong>Woeber</strong> — mustard/horseradish/vinegar/garlic private label only. <strong>Heritage Specialty Foods</strong> — refrigerated kettle soups/sauces; not ambient hot-fill. <strong>Motherlode</strong> (Hudson, CO) — sauce/dressing/salsa copack; first trial <strong>400 gal</strong>; SQF Level II (CO already covered; table capped). Misses: <strong>Sauceology</strong> (dead domain), <strong>Vermont Bottling</strong> (500), <strong>Hinkle</strong> (500), <strong>Allegro</strong> (404), <strong>Pacific Choice</strong> (down), <strong>Golden West</strong> (no copack), <strong>Fuel Kitchens</strong> (commissary). Directories are not plant facts.
          </p>
          <h3>How to read the MOQ column</h3>
          <p>
            Published minimums are not comparable units. Parish and The Spice Guy quote <strong>gallons per flavor/run</strong>. Creative and Supreme quote <strong>1,000 gallons</strong>. Fischer <strong>2,500 units/SKU</strong>. El Pinto <strong>10,000 units/year</strong>. Onofrio <strong>100 cases</strong>. If MOQ is unpublished, assume nothing.
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
                  <td>Hot sauce, BBQ, ketchup, marinade, acid salsa</td>
                  <td>pH ≤ 4.6 in time? Process authority?</td>
                  <td>Hot fill / acidified kettle. Spice Guy 50 gal/flavor; Parish 25/50 gal; Creative / Supreme 1,000 gal.</td>
                  <td>pH will not hold ambient → retort. Never heated → HPP.</td>
                </tr>
                <tr>
                  <td>Creamy dressing, aioli</td>
                  <td>Ambient or refrigerated? Dairy?</td>
                  <td>Stir, Tulkoff, Best Brand, Paradigm name dressings. Fischer: <strong>no ambient-fill salad dressings</strong>.</td>
                  <td>Refrigerated-only: not a shelf-stable hot-fill house.</td>
                </tr>
                <tr>
                  <td>Cheese/cream sauce, bone broth, pH &gt; 4.6 ambient</td>
                  <td>LACF?</td>
                  <td>Retort. Supreme and Stir publish retort.</td>
                  <td>Do not force hot fill.</td>
                </tr>
                <tr>
                  <td>Meat in the formula</td>
                  <td>USDA-FSIS or FDA?</td>
                  <td>Supreme and Stir state USDA inspection. Confirm the <strong>room</strong>.</td>
                  <td>Do not assume Chelten’s dressing line is a meat line.</td>
                </tr>
                <tr>
                  <td>Glass jar, first run under ~100 gal</td>
                  <td>Who publishes a small gallon floor?</td>
                  <td>Parish 25/50 gal; Spice Guy 50 gal/flavor; Onofrio <strong>100 cases</strong>.</td>
                  <td>Chelten / Stir / Tulkoff unpublished. Creative / Supreme <strong>1,000 gal</strong>.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-hint">On a small screen, scroll the table sideways — cells are not smashed.</p>

          <h2 id="request-an-intro">Request an intro</h2>
          <p>
            If a plant in the table fits pH, format, and published minimum, we can introduce you. See the{" "}
            <Link href="/copackers?product=sauce">sauce directory cards</Link>.
          </p>

          <details className="textbook" id="textbook">
            <summary>What process a sauce needs, acid vs low-acid, decision table, gaps, sources</summary>
            <p className="textbook-mark">Textbook — after the shortlist</p>
            <h2>What process your sauce actually needs</h2>
            <p>A sauce is not one process. Hot fill, cold fill, retort, and acidified kettle are different kill steps, different filings, and different plants.</p>
            <p><strong>Hot fill.</strong> Heated, filled hot, held, then cooled. Default ambient path for <strong>high-acid</strong> ketchup, hot sauce, many BBQ sauces and marinades.</p>
            <p>
              <strong>Acidified kettle.</strong> Acid added so finished pH is <strong>4.6 or below</strong> — <strong>acidified food</strong> under 21 CFR 108/114. Needs a process authority letter and Form FDA 2541e. The Spice Guy will not quote without one. FAQ floor is <strong>50 gallons per flavor</strong>.
            </p>
            <p>
              <strong>Retort.</strong> Scheduled cook of the <strong>already-closed</strong> pack when pH <strong>&gt; 4.6</strong>, aw <strong>&gt; 0.85</strong>, hermetic, ambient — <strong>LACF</strong>. Supreme and Stir publish retort separately.
            </p>
            <h2>When this page is the wrong process</h2>
            <p><strong>pH will not hold at or below 4.6 ambient.</strong> File a scheduled LACF process.</p>
            <p><strong>“Never cooked,” live culture, or HPP-only claims.</strong> Heat destroys that story. Use the HPP page.</p>
            <p>
              <strong>Dairy.</strong> Cream and cheese sauces are often low-acid. Yoshida (not in this table) refuses dairy because the Portland plant is Kosher Pareve.
            </p>
            <h2>What is still unpublished (do not invent it)</h2>
            <ul>
              <li><strong>Numeric MOQ</strong> for Chelten, Stir, Tulkoff, Sonoma, Paradigm, Best Brand.</li>
              <li><strong>City</strong> for Chelten House (New Jersey only) and Parish Foods (Louisiana only).</li>
              <li><strong>Hot vs cold vs retort</strong> at Chelten, Tulkoff, Sonoma, Paradigm, and Best Brand.</li>
              <li><strong>Organic certifier</strong> — none named Oregon Tilth / CCOF / QAI on this table except where a company page already states one from another process page.</li>
            </ul>
            <p>
              Sources fetched 21 Aug 2026 are linked in the table. Directories, LinkedIn, and extension lists were not used as plant facts.
            </p>
          </details>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
