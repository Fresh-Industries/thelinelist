import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { GuidePlantTable } from "@/components/guides/GuidePlantTable";
import { plantsForGuide } from "@/lib/directory";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HPP co-packers in the US",
  description:
    "Named US HPP plants for refrigerated juice, dip, guacamole, baby-food pouch, and RTE. Tolling vs fill+HPP. Verified 21 Aug 2026.",
};

export default function HppGuidePage() {
  const count = plantsForGuide("hpp").length;

  return (
    <>
      <SiteHeader current="/guides/hpp" />
      <main id="main">
        <article className="prose wrap">
          <p className="kicker">Process guide</p>
          <h1>HPP Co-Packers in the US: Tolling vs Fill+HPP (Juice, Dips, RTE)</h1>
          <p className="meta">
            Last verified 21 Aug 2026 · Search volume: unpublished · Named plants only · MOQ only when the plant printed one
          </p>

          <div className="when">
            <p>
              Use HPP when the SKU is <strong>refrigerated</strong> juice, smoothie, dip, guacamole, baby-food pouch, or RTE that must stay cold. Not ambient. Spores survive HPP — this is not shelf-stable.
            </p>
            <p>Tolling: you fill elsewhere; the plant runs the cycle. Fill+HPP: one roof blends, fills, and HPPs.</p>
            <p>
              Psi, 5-log, spores, the full comparison table, and packaging physics sit in the <a href="#textbook">textbook below</a>.
            </p>
          </div>
          <nav className="jump" aria-label="On this page">
            <a href="#hpp-co-packers">HPP co-packers</a>
            <a href="#how-to-rfq-without-wasting-a-month">RFQ checklist</a>
            <a href="#textbook">Textbook</a>
          </nav>

          <h2 id="hpp-co-packers">HPP co-packers</h2>
          <p>
            {count} plants (or plant groups) that <strong>publish a US HPP copack or tolling page</strong>. Stay Fresh Foods is <strong>omitted as a listing</strong>: Universal Pure acquired it 1 Jul 2019 (Universal Pure press release); Meriden is now a Universal Pure fill+HPP site. True Fresh HPP (<code>truefreshhpp.com</code>) resolved as a domain-for-sale page on fetch — <strong>omitted</strong>. New Mexico Fresh Foods’ own site was a private WordPress login — <strong>omitted</strong>. Hiperbaric is an <strong>equipment OEM</strong>, not a copacker; its “HPP Food Services” URL ranks because it is a customer story.
          </p>
          <p>
            MOQ: only Universal Pure published a numeric band on the pages fetched (beverage copack <strong>20,000 bottles/run</strong>). Everyone else: <Unpublished />.
          </p>
          <GuidePlantTable guide="hpp" />
          <p>
            These rows are the same records as the <Link href="/copackers?process=hpp">directory HPP filter</Link>. Company cards do not invent fields the table left blank.
          </p>

          <h2 id="how-to-rfq-without-wasting-a-month">How to RFQ without wasting a month</h2>
          <p>Bring this, or you sit in “send us your deck” limbo:</p>
          <ol>
            <li><strong>Process, already chosen.</strong> HPP, refrigerated, not hot fill. Attach pH, Brix/viscosity, Aw, and juice vs dip vs meat.</li>
            <li><strong>Pack drawing.</strong> Resin, closure, induction seal, headspace, pre- vs post-HPP label. Glass → stop and redesign.</li>
            <li><strong>Fill vs toll.</strong> “Blend and fill” or “arrive in finished cases.”</li>
            <li><strong>Volume</strong> in units and pounds (first PO and 12-month).</li>
            <li><strong>Certs you actually need.</strong> Ask for the current PDF. This table is not a live cert register.</li>
            <li><strong>Inspection.</strong> Juice/dip = FDA. RTE meat = USDA. Which rooms?</li>
            <li><strong>Validation.</strong> Who pays for the 5-log / Listeria study, which lab, and are you on their HACCP?</li>
          </ol>
          <h2 id="request-intro">Request intro</h2>
          <p>
            Fresh Industries can <strong>request an intro</strong> to a plant in the table that matches your process, pack, and region. This is not an instant AI match and not an RFQ black box. You still send the brief. We do not broker commission on the run.
          </p>
          <p>
            If your SKU is hot-fill, retort, or aseptic instead, do not force it onto this list — use a <Link href="/copackers">different filter</Link>.
          </p>

          <details className="textbook" id="textbook">
            <summary>What HPP is, when to use it, tolling vs fill+HPP, pack, gaps, sources</summary>
            <p className="textbook-mark">Textbook</p>
            <h2>What HPP is (operator definition)</h2>
            <p>
              High Pressure Processing is a <strong>post-package, non-thermal</strong> food-safety step. Sealed product goes into a water-filled vessel. Cold potable water is pumped to roughly <strong>87,000 psi / ~600 MPa</strong> and held for about <strong>1–5 minutes</strong>. Pressure is isostatic (equal from all sides). Vegetative pathogens (Listeria, Salmonella, E. coli) plus yeasts and molds are inactivated. Flavor, color, and many heat-sensitive nutrients are retained better than in a cook.
            </p>
            <p>
              Universal Pure, American Pasteurization Company (APC), Green Plant, Cal Pack, and Hiperbaric describe the same mechanics. It is <strong>not</strong> commercial sterility. Green Plant’s FAQ: HPP <strong>does not reliably inactivate bacterial spores</strong>, so it is not for shelf-stable low-acid foods. APC: HPP pasteurizes without sterilizing. Finished goods stay <strong>refrigerated</strong> through consumption (Universal Pure).
            </p>
            <p>
              FDA juice HACCP’s 5-log pathogen reduction is the juice-side reason brands specify HPP. Universal Pure claims HPP is “scientifically validated to deliver up to a 5-log reduction”; Cal Pack says most of its products use HPP to obtain a 5-log reduction. USDA-FSIS treats HPP as a post-lethality intervention for RTE meats (Universal Pure FAQ; Green Plant FAQ). Your plant still has to <strong>validate the specific formula</strong>. There is no blanket FDA pre-approval of “HPP” as a process.
            </p>
            <h2>When to use HPP vs hot-fill vs retort vs aseptic</h2>
            <p>Use this as a first-pass screen before you contact a plant. Heat paths below are general process facts, not a plant quote.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>If your SKU is…</th>
                    <th>Use</th>
                    <th>Why</th>
                    <th>Do not send it to</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Refrigerated juice, smoothie, shot, hummus, guacamole, salsa, wet salad, baby-food pouch, RTE dip</td>
                    <td><strong>HPP</strong></td>
                    <td>Cold process. Vendor shelf-life: Universal Pure 2–3×; Green Plant ~2×–8×. Pack must flex.</td>
                    <td>Hot-fill-only (if “never heated”) or retort (if ambient).</td>
                  </tr>
                  <tr>
                    <td>High-acid beverage or sauce that can take heat and must be <strong>ambient</strong></td>
                    <td><strong>Hot fill</strong></td>
                    <td>Heat + hot fill + cool-down vacuum. Glass or hot-fill PET. Cheaper logistics than a cold chain.</td>
                    <td>An HPP toller (they will not make it shelf-stable).</td>
                  </tr>
                  <tr>
                    <td>Low-acid meal, soup, or protein that must be <strong>ambient / commercially sterile</strong></td>
                    <td><strong>Retort</strong> (can, pouch, tray)</td>
                    <td>Scheduled thermal process after seal. Handles spores. Texture is cooked.</td>
                    <td>HPP. Spores survive HPP.</td>
                  </tr>
                  <tr>
                    <td>Ambient beverage, UHT-ok</td>
                    <td><strong>Aseptic / ESL</strong></td>
                    <td>Heat-treat, then sterile fill. Different capital than an HPP vessel.</td>
                    <td>HPP juice houses unless they also run HTST (most here do not).</td>
                  </tr>
                  <tr>
                    <td>Frozen, dry, or low-Aw</td>
                    <td><strong>Not HPP</strong></td>
                    <td>Pressure needs free water. Universal Pure: dense/dry products crush; product must be tempered above 32°F. Green Plant: dry foods “generally no.”</td>
                    <td>Any HPP house except as a hard no.</td>
                  </tr>
                  <tr>
                    <td>Carbonated, glass, can, or carton</td>
                    <td><strong>Not standard in-pack HPP</strong></td>
                    <td>Universal Pure beverage copack: cold-filled, <strong>non-carbonated</strong>, flexible pack only.</td>
                    <td>In-pack HPP lines.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="table-hint">On a small screen, scroll the table sideways — cells are not smashed.</p>
            <p>
              <strong>Operator rule:</strong> cold-pressed / never-cooked / short deck <strong>and</strong> a refrigerated set → HPP. Ambient retail → heat (hot fill, retort, or aseptic). Do not force hummus into retort, or low-acid ambient soup into an HPP toller.
            </p>
            <h2>Tolling vs integrated fill+HPP</h2>
            <p>
              <strong>Tolling (HPP only).</strong> You (or your copacker) fill elsewhere. Sealed cases arrive cold; the plant runs the cycle and returns HPP’d product, sometimes with labeling, kitting, or cold storage. Pay per cycle / per pound. APC claims it was “the first company in the United States to offer High Pressure Processing (HPP) on a commercial tolling basis.” Universal Pure’s non-bottling sites (Lincoln, Villa Rica, Arlington, Malvern, Delphos) are this model: HPP + cold storage + value-add, no beverage rotary fill listed.
            </p>
            <p>
              <strong>Integrated fill+HPP.</strong> One roof (or a sister plant a few miles away) blends, fills, codes, HPPs, and case-packs. Universal Pure’s Meriden, CT and Mira Loma, CA sites combine rotary beverage fill with HPP. Maryland Packaging sells co-pack + HPP at two Maryland plants. Green Plant: “manufacturing, filling, labeling, and HPP under one roof.” Youngstown: pressing and HPP “under the same roof right on the farm.” Cal Pack Foods fills in Torrance and trucks product in its own refrigerated truck to partner <strong>HPP Food Services</strong> a few miles away — legally two companies, operationally one cold chain.
            </p>
            <h2>Package constraints and the cold chain after HPP</h2>
            <p>
              <strong>The pack has to flex.</strong> At HPP pressure, water (and the product) compresses about <strong>15–18%</strong> by volume, then recovers (Hiperbaric; Universal Pure FAQ: “up to 15 percent”). Plants and Hiperbaric agree: <strong>PET / PP / PE / PA / EVOH</strong> work; <strong>glass, metal, paperboard, cans</strong> do not. APC also rejects styrofoam and “very lightweight or plant-based plastics.” Universal Pure beverage copack: flexible pack only — “no aluminum, glass, etc.”
            </p>
            <p>
              <strong>After HPP, the product is still a refrigerated food.</strong> Universal Pure: products “must remain at specified temperatures throughout the process and up to consumption.” HPP is not a license to ship ambient.
            </p>
            <h2>Gaps (unpublished on the pages fetched 21 Aug 2026)</h2>
            <ul>
              <li><strong>Numeric MOQ</strong> for every plant except Universal Pure’s 20,000-bottle beverage-copack minimum.</li>
              <li><strong>Organic / kosher / gluten-free</strong> as current, named certificates for several plants.</li>
              <li><strong>USDA vs FDA room-level scope</strong> for most plants.</li>
              <li>Not a census of every US HPP vessel.</li>
            </ul>
            <h2>Sources</h2>
            <p>
              Fetched or searched 21 Aug 2026. Primary URLs are in the plant table and on each{" "}
              <Link href="/copackers">company page</Link>. Not used as a plant list: Penn State Extension copacker list; CoPack Connect parking-spaces.
            </p>
          </details>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
