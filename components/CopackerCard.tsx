import {
  PRODUCT_CATEGORIES,
  formatCardSnippet,
  formatProcesses,
  plantMatchesCategory,
  type Plant,
} from "@/lib/directory";
import Link from "next/link";

const PACKAGE_CAPABILITIES = [
  { label: "Cans", pattern: /\b(can|cans|canning|aluminum)\b/i },
  { label: "Bottles", pattern: /\b(bottle|bottles|bottling|PET|HDPE)\b/i },
  { label: "Jars", pattern: /\b(jar|jars|glass)\b/i },
  { label: "Pouches", pattern: /\b(pouch|pouches|sachet|sachets|stick pack)\b/i },
  { label: "Cups or tubs", pattern: /\b(cup|cups|tub|tubs)\b/i },
] as const;

function primaryLocation(plant: Plant): string {
  const site = plant.sites[0];
  if (!site) return plant.locationDisplay;
  return site.city ? `${site.city}, ${site.state}` : site.state;
}

function goodFor(plant: Plant): string[] {
  return PRODUCT_CATEGORIES
    .filter((category) => plantMatchesCategory(plant, category.slug))
    .slice(0, 4)
    .map((category) => category.label);
}

function capabilities(plant: Plant): string[] {
  const packaging = plant.packaging ?? "";
  const labels = PACKAGE_CAPABILITIES.filter(({ pattern }) => pattern.test(packaging)).map(({ label }) => label);
  return [...new Set([...labels, ...formatProcesses(plant)])].slice(0, 5);
}

function minimumOrderLines(value: string | null): string[] {
  if (!value) return [];

  const hotFillAndRetort = value.match(
    /^Hot fill \/ bottled: ([\d,]+) units \(depending on fill size\)\. Retort: (\d+)K units per SKU\.$/i,
  );
  if (hotFillAndRetort) {
    const retortUnits = Number(hotFillAndRetort[2]) * 1_000;
    return [
      `Hot fill / bottled: ${hotFillAndRetort[1]} units (depending on fill size)`,
      `Retort: ${retortUnits.toLocaleString("en-US")} units per SKU`,
    ];
  }

  return value
    .split(/;\s+|(?<=\.)\s+(?=[A-Z])/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function CopackerCard({ plant }: { plant: Plant }) {
  const products = goodFor(plant);
  const capabilityLabels = capabilities(plant);
  const minimums = minimumOrderLines(plant.moqDisplay);
  const description =
    formatCardSnippet(plant.productTypesPublished, 155)
    ?? formatCardSnippet(plant.overview[0] ?? null, 155);

  return (
    <article className="plant-card">
      <div className="plant-card-body">
        <header className="plant-card-heading">
          <div>
            <h2><Link href={`/manufacturers/${plant.slug}`}>{plant.name}</Link></h2>
            <p className="place">{primaryLocation(plant)}</p>
          </div>
          <span className="plant-card-mark" aria-hidden="true">{plant.name.charAt(0)}</span>
        </header>

        {description ? <p className="plant-card-description">{description}</p> : null}

        {products.length > 0 || capabilityLabels.length > 0 || minimums.length > 0 ? (
          <dl className="plant-card-summary">
            {products.length > 0 ? <div><dt>Good for</dt><dd>{products.join(" · ")}</dd></div> : null}
            {capabilityLabels.length > 0 ? <div><dt>Capabilities</dt><dd>{capabilityLabels.join(" · ")}</dd></div> : null}
            {minimums.length > 0 ? (
              <div>
                <dt>Minimum order</dt>
                <dd className="moq-lines">{minimums.map((line) => <span key={line}>{line}</span>)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <footer className="plant-card-footer">
          {plant.certs.length > 0 ? (
            <ul className="certification-list" aria-label="Publicly listed certifications">
              {plant.certs.slice(0, 3).map((certification) => <li key={certification}>{formatCardSnippet(certification, 26)}</li>)}
            </ul>
          ) : null}
          <Link className="go" href={`/manufacturers/${plant.slug}`}>View manufacturer <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </article>
  );
}
