import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { GuidePlantTable } from "@/components/guides/GuidePlantTable";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Retort co-packers",
  description:
    "Named US retort co-packers for pouches, cans, and trays. Low-acid ambient, last-verified. MOQ only when the plant printed one.",
};

export default function RetortGuidePage() {
  return (
    <>
      <SiteHeader current="/guides/retort" />
      <main id="main">
        <article className="prose wrap">
          <p className="kicker">Process guide</p>
          <h1>Retort Co-Packers for Pouches, Cans, and Trays</h1>
          <p className="meta">
            Last verified 21 Aug 2026. Named plants only. Minimum order only when the plant printed one.
          </p>

          <div className="when">
            <p>
              Use retort when the SKU is low-acid ambient — meal, broth, plant milk, pouch, can, or tray — pH greater than 4.6, commercially sterile. The kill step is a scheduled cook of the already-closed pack. Texture is cooked. That is the trade.
            </p>
            <p>
              Do not send high-acid juice or hot sauce that can take a hot fill. Do not send refrigerated or never-heated SKUs (that is HPP). Spores survive HPP; HPP will not make low-acid soup ambient.
            </p>
            <p>
              LACF filing, pouch vs can vs tray, and the full decision table sit in the <a href="#textbook">textbook below</a>.
            </p>
          </div>
          <nav className="jump" aria-label="On this page">
            <a href="#retort-co-packers">Retort co-packers</a>
            <a href="#request-an-intro">Request an intro</a>
            <a href="#textbook">Textbook</a>
          </nav>

          <h2 id="retort-co-packers">Retort co-packers</h2>
          <p>
            Facts below are from the plant’s own pages fetched <strong>21 Aug 2026</strong>. If a cell is blank on their site, it is <Unpublished />. This is not a complete census.
          </p>
          <p><strong>Omitted from this table</strong></p>
          <ul>
            <li><strong>Truitt Bros as a standalone listing:</strong> now <a href="https://baxtersna.com/">Baxters North America</a>.</li>
            <li>
              <strong>MACRO Brands</strong> (<a href="https://www.macrobrands.llc/">macrobrands.llc</a>): publishes retort canning 12/8/8.4 oz. <strong>California city unpublished.</strong> Not a ninth table row.
            </li>
            <li><strong>CoPack Connect retorting page:</strong> textbook only; <strong>no named plants</strong>.</li>
            <li>Plants that do not say <strong>retort</strong> on their own site, closed plants, and non-US plants. Directory cards are not used as plant facts.</li>
          </ul>
          <GuidePlantTable guide="retort" />
          <h3>How to read the MOQ column</h3>
          <p>
            Published minimums are not comparable units. Big Brands quotes <strong>100k units/SKU</strong> on the retort page only. Select Brands publishes a <strong>run range</strong> (10k–100k+ pouches), not a floor. If MOQ is unpublished, assume nothing. Walker’s “large or small” is not a number.
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
                  <td>Broth, plant milk, protein drink, dairy RTD, low-acid soup, pH &gt; 4.6 ambient</td>
                  <td>LACF? Hermetic pack, aw &gt; 0.85?</td>
                  <td>Retort (or aseptic). File a schedule. Berner (dairy RTD), Thermal Kitchen (spouted, no chunks), Big Brands (100k units/SKU), Select Brands (pouch).</td>
                  <td>Do not send it to a juice hot-fill line.</td>
                </tr>
                <tr>
                  <td>Ambient meal, entree, sides, baby food in pouch/tray/bowl</td>
                  <td>Need commercial sterility?</td>
                  <td>SOPAKCO / AmeriQual / Baxters / Select Brands.</td>
                  <td>“Never heated” + refrigerated → HPP.</td>
                </tr>
                <tr>
                  <td>High-acid juice, tea, hot sauce that can take 185–200°F</td>
                  <td>Finished pH ≤ 4.6 in time?</td>
                  <td><strong>Hot fill</strong>, not this page.</td>
                  <td>If pH will not hold ≤ 4.6 ambient → retort.</td>
                </tr>
                <tr>
                  <td>Meat-containing ambient meal</td>
                  <td>USDA-FSIS or FDA?</td>
                  <td>AmeriQual publishes USDA–FSIS. SOPAKCO publishes USDA on-site / FSIS.</td>
                  <td>Do not assume Berner’s dairy retort is a meat line.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-hint">On a small screen, scroll the table sideways — cells are not smashed.</p>

          <h2 id="request-an-intro">Request an intro</h2>
          <p>
            If a plant in the table fits pH, format, and published minimum, we can <strong>introduce you</strong>. A named intro, not an AI match. See the{" "}
            <Link href="/copackers?process=retort">retort directory cards</Link>.
          </p>

          <details className="textbook" id="textbook">
            <summary>What retort is, LACF, pouch vs can vs tray, decision table, gaps, sources</summary>
            <p className="textbook-mark">Textbook — after the shortlist</p>
            <h2>What retort actually is</h2>
            <p>
              Retort is a <strong>scheduled thermal process after seal</strong>. Product is filled into a hermetically sealed container, then the closed pack is cooked in a pressure vessel (the retort). The kill step is the cook of the <strong>already-closed</strong> pack, not the fill temperature. When the schedule is met, the pack is <strong>commercially sterile</strong> and ambient-stable.
            </p>
            <p>Three plants publish that sequence on their own sites:</p>
            <ul>
              <li><a href="https://bernerfoodandbeverage.com/build-your-brand/make-it-happen">Berner</a>: close the product, then cook it in a large vessel at high temperature under pressurization.</li>
              <li><a href="https://thermalkitchen.com/">Thermal Kitchen</a>: fill spouted pouches, seal, then cook in a <strong>pressurized water-spray vessel</strong>.</li>
              <li><a href="https://www.bigbrandsllc.com/beverage-copacking-process">Big Brands</a>: retort “sterilizes and pasteurizes” beverages they describe as <strong>pH greater than 4.5</strong>. FDA’s LACF line is <strong>4.6</strong>, not 4.5 — use a process authority, not their marketing pH.</li>
            </ul>
            <p>
              It is the wrong process when you are selling “never heated,” live cultures, or a refrigerated set — that is HPP. It is also the wrong process when the formula acidifies to pH <strong>≤ 4.6</strong> in time and can take a hot fill.
            </p>
            <h2>Low-acid scheduled process</h2>
            <p>
              FDA’s LACF pages: commercial processors of shelf-stable acidified and low-acid canned foods in hermetically sealed containers sold in the US must <strong>register each establishment</strong> and <strong>file a scheduled process</strong> per product, style, container, and method (<strong>21 CFR 108</strong>).
            </p>
            <p>
              A <strong>thermal process authority (TPA)</strong> establishes the scheduled process. Published: AmeriQual <strong>on-site TPA</strong>; Baxters TPA <strong>on staff</strong>; Thermal Kitchen <strong>third-party TPA</strong>. Nobody published a Form 2541d SID for a customer SKU.
            </p>
            <h2>What is still unpublished (do not invent it)</h2>
            <ul>
              <li><strong>Numeric retort MOQ</strong> except Big Brands (<strong>100k units/SKU</strong>). Select Brands publishes a 10k–100k+ <strong>run range</strong>, not a floor.</li>
              <li><strong>City</strong> for Big Brands’ California plants; SOPAKCO’s third US facility.</li>
              <li><strong>Walker’s retort formats</strong> (they say retort; RTE specialty is 35–60 days, not commercial sterility).</li>
              <li><strong>Continuous hydrostatic</strong> at any plant here.</li>
            </ul>
            <p>
              Sources fetched 21 Aug 2026 are on each <Link href="/copackers">company page</Link>. Truitt Bros is omitted as a separate row (now Baxters); MACRO Brands is omitted as a table row (city unpublished).
            </p>
          </details>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
