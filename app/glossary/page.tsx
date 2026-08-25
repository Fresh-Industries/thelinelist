import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { Unpublished } from "@/components/Unpublished";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Co-packer vs co-manufacturer vs private label vs tolling",
  description:
    "Co-packer vs co-manufacturer vs private label vs tolling. A CPG glossary, not a plant census. Named examples only as already published.",
  path: "/glossary",
});

export default function GlossaryPage() {
  return (
    <>
      <SiteHeader current="/glossary" />
      <main id="main">
        <article className="prose wrap">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Glossary", href: "/glossary" },
            ]}
          />
          <p className="kicker">Glossary</p>
          <h1>Co-packer vs Co-manufacturer vs Private Label vs Tolling</h1>
          <p className="meta">
            Public sources reviewed 21 Aug 2026. Named plants only. Minimum order only when the plant printed one.
          </p>
          <p>
            A glossary for CPG brand ops. Not a plant census. Not a legal textbook. Ignore the homepage noun. Ask who owns the formula, who buys the ingredients, and which process the line actually runs.
          </p>
          <nav className="jump" aria-label="On this page">
            <a href="#the-four-terms">The four terms</a>
            <a href="#which-process">Which process page</a>
            <a href="#what-these-are-not">What these are not</a>
          </nav>

          <h2 id="the-four-terms">The four terms (food, not cosmetics)</h2>
          <p>
            Textbook split: a <strong>co-packer</strong> packages bulk product you already made; a <strong>co-manufacturer / contract manufacturer</strong> makes the product from your formula, then packs it; <strong>private label</strong> is the plant’s formula under your (or a retailer’s) brand; <strong>tolling</strong> is a fee to run <em>your</em> materials or <em>your</em> filled pack through <em>their</em> equipment.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Term</th>
                  <th>What they do</th>
                  <th>Who owns the formula</th>
                  <th>Who buys inputs</th>
                  <th>Food example (already on our process pages)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Co-packer</strong> (contract packager)</td>
                  <td>Fill, label, case, kit. Strictly: they do not cook your recipe.</td>
                  <td>Brand</td>
                  <td>You ship bulk + often pack</td>
                  <td>
                    <Link href="/manufacturers/minimus-products">Minimus</Link> (Newbury Park, CA) pack-out from <strong>$2,500/project</strong> — they <strong>do not</strong> hot-fill, pasteurize, or run aseptic.{" "}
                    <Link href="/manufacturers/ibr-packaging">IBR</Link> (Carrollton, TX) fills hot sauce and powders into sachets, pouches, and stick packs; published floor <strong>5,000 units</strong>.
                  </td>
                </tr>
                <tr>
                  <td><strong>Co-manufacturer / contract manufacturer</strong></td>
                  <td>Blend, process, and pack your spec in their plant.</td>
                  <td>Brand</td>
                  <td>Plant (turnkey) or you (toll commercial)</td>
                  <td>
                    Sauce: <Link href="/manufacturers/chelten-house">Chelten House</Link>, <Link href="/manufacturers/stir-foods">Stir Foods</Link>,{" "}
                    <Link href="/manufacturers/creative-foodworks">Creative Foodworks</Link> (San Antonio; hot-filled / acidified; <strong>1,000 gallon</strong> floor, quarterly). Hot-fill beverage:{" "}
                    <Link href="/manufacturers/innomark">InnoMark</Link> (St. George, UT; <strong>7,500 L</strong>). Retort pouch:{" "}
                    <Link href="/manufacturers/thermal-kitchen">Thermal Kitchen</Link> (Daytona Beach; spouted 2–16 oz). MOQ unpublished at Chelten and Stir — unpublished ≠ small.
                  </td>
                </tr>
                <tr>
                  <td><strong>Private label</strong></td>
                  <td>Plant’s catalog SKU; you (or a retailer) change the label.</td>
                  <td>Plant / retailer catalog</td>
                  <td>Plant</td>
                  <td>
                    Same ketchup, new label — Fresh Factory’s example. On our pages: Berner and AmeriQual publish private-label programs next to co-man;{" "}
                    <Link href="/manufacturers/el-pinto">El Pinto</Link> lists private label / co-pack for salsa and sauces (floor <strong>10,000 units/year</strong>). You do not own a proprietary formula.
                  </td>
                </tr>
                <tr>
                  <td><strong>Tolling</strong></td>
                  <td>Fee for labor + equipment. Two food uses: (1) you supply ingredients and they cook/fill; (2) you fill elsewhere and they run one process step.</td>
                  <td>Brand</td>
                  <td>You</td>
                  <td>
                    HPP juice / dip: <Link href="/manufacturers/american-pasteurization-company">APC</Link> (Milwaukee, WI; West Sacramento, CA) and{" "}
                    <Link href="/manufacturers/hpp-food-services">HPP Food Services</Link> (Buena Park / Wilmington, CA) take sealed cases, run the cycle, return product. Numeric HPP-toll MOQ: <Unpublished />.
                  </td>
                </tr>
                <tr>
                  <td><strong>Fill + process</strong> (vs a toll)</td>
                  <td>One roof blends, fills, then runs the kill step.</td>
                  <td>Brand</td>
                  <td>Plant or you</td>
                  <td>
                    HPP: <Link href="/manufacturers/universal-pure">Universal Pure</Link> <strong>Meriden, CT</strong> and <strong>Mira Loma, CA</strong> — rotary fill + HPP. Beverage copack floor <strong>20,000 bottles/run</strong>. Their other sites (Lincoln, Villa Rica, Arlington, Malvern, Delphos) are HPP + cold chain, no beverage rotary fill — that is tolling. Same company, two models.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-hint">On a small screen, scroll the table sideways. Cells are not smashed.</p>
          <p>The blogs stop at “pack vs make.” In food, the next question is the <strong>kill step</strong>. Hot-fill sauce is not a retort pouch is not HPP juice.</p>

          <h2 id="which-process">Which process page to use next</h2>
          <p>Pick the process. Then pick the plant.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>If your SKU is…</th>
                  <th>Use this page</th>
                  <th>Not this</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Refrigerated juice, smoothie, dip, guacamole, baby-food pouch, RTE that must stay cold</td>
                  <td><Link href="/guides/hpp">HPP co-packers in the US</Link> — decide fill+HPP vs tolling first</td>
                  <td>Hot-fill (heat kills the claim). Retort (ambient sterility; spores survive HPP).</td>
                </tr>
                <tr>
                  <td>High-acid juice, tea, shot, or sauce that can take 185–200°F and must be ambient</td>
                  <td><Link href="/guides/hot-fill">Hot fill co-packers</Link></td>
                  <td>HPP (still refrigerated). Retort (overkill if pH holds ≤ 4.6).</td>
                </tr>
                <tr>
                  <td>Low-acid ambient meal, broth, plant milk, pouch / can / tray — pH &gt; 4.6, commercially sterile</td>
                  <td><Link href="/guides/retort">Retort co-packers</Link></td>
                  <td>
                    HPP. Juice hot-fill lines. <Link href="/manufacturers/big-brands">Big Brands</Link> retort floor is <strong>100k units/SKU</strong>, not a startup pack-out.
                  </td>
                </tr>
                <tr>
                  <td>Sauce or condiment (hot fill, kettle, acidified; retort if cheese / cream / broth)</td>
                  <td><Link href="/guides/sauce">Sauce / condiment contract manufacturers</Link></td>
                  <td>
                    A 25-gallon launch at Chelten House. <Link href="/manufacturers/parish-foods">Parish</Link> <strong>25/50 gal</strong> and{" "}
                    <Link href="/manufacturers/the-spice-guy">The Spice Guy</Link> <strong>50 gal/flavor</strong> are the published small sauce floors.
                  </td>
                </tr>
                <tr>
                  <td>First run, published floor you can fund</td>
                  <td><Link href="/guides/small-moq">Food co-packers with small MOQs</Link></td>
                  <td>Inventing an HPP or national-sauce minimum. Those pages mark them <Unpublished />.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-hint">On a small screen, scroll the table sideways. Cells are not smashed.</p>
          <p>
            <strong>Queued, not live. Do not RFQ as if we have the file:</strong> acidified / salsa / hot-sauce as its own page, stick-pack / powder / VFFS, aseptic / ESL / cold-fill, and a state / freight page. IBR and InnoMark already sit on the small-MOQ and hot-fill pages if that is the line you need.
          </p>

          <h2 id="what-these-are-not">What these terms are not</h2>
          <p>
            <strong>Not a broker.</strong> A broker takes a cut to match you. CoPack Connect’s own FAQ says it is “neither a manufacturer nor a broker.” We are not one either.
          </p>
          <p>
            <strong>Not a CoPack Connect RFQ login.</strong> That product is a logged-in AI match. Their hot-fill and retorting URLs still name <strong>zero plants</strong>.
          </p>
          <p>
            <strong>Not a 3PL.</strong> A 3PL warehouses and moves finished goods. Cold storage next to an HPP vessel is a plant add-on, not the process.
          </p>
          <p>
            <strong>Not interchangeable with “white label.”</strong> Fresh Factory treats white label as a CPG brand buying a catalog SKU. Same ownership problem as private label: you do not own the formula. We do not have a white-label page.
          </p>

          <h2>Request contact help</h2>
          <p>
            If a plant on a process page matches your process, pack, and published floor, open its <Link href="/find-manufacturers">manufacturer profile</Link> and request contact help. The Line List reviews the request and follows up by email; it does not promise a direct relationship or a manufacturer response.
          </p>
          <p>If you do not know the process yet, say that in the request instead of asking us to “find a co-packer.”</p>

          <h2>Sources</h2>
          <p>Definitions we lean on (fetched 21 Aug 2026), then our process pages for the food examples:</p>
          <ul>
            <li><a href="https://thefreshfactory.co/blog/cpg-manufacturing-models/">The Fresh Factory — Co-Man, Co-packing, Private Label, or White Label</a> (1 May 2026)</li>
            <li><a href="https://legalclarity.org/co-packer-vs-contract-manufacturer-which-do-you-need/">LegalClarity — Co-Packer vs. Contract Manufacturer</a>. We do <strong>not</strong> use their unsourced MOQ ranges.</li>
            <li><a href="https://privatelabelsupply.com/glossary/co-manufacturing">Private Label Supply — Co-Manufacturing vs Co-Packing</a> (updated 10 May 2026). We do <strong>not</strong> use their unsourced case / bar ranges.</li>
            <li><a href="https://copackconnect.com/resources/contract-manufacturing-co-packing-glossary/">CoPack Connect glossary</a></li>
            <li>
              Our process pages: <Link href="/guides/hpp">HPP</Link> · <Link href="/guides/hot-fill">hot fill</Link> · <Link href="/guides/retort">retort</Link> · <Link href="/guides/sauce">sauce</Link> · <Link href="/guides/small-moq">small MOQ</Link>
            </li>
          </ul>
          <p>
            <strong>Not used as plant facts:</strong> CoPack Connect parking-spaces; extension copacker lists; cosmetics or electronics examples; invented search volumes.
          </p>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
