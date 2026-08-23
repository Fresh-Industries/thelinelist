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

export function CopackerCard({ plant }: { plant: Plant }) {
  const products = goodFor(plant);
  const capabilityLabels = capabilities(plant);
  const description =
    formatCardSnippet(plant.productTypesPublished, 155)
    ?? formatCardSnippet(plant.overview[0] ?? null, 155)
    ?? "Public product details are limited. Open the profile to see the available information.";

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

        <p className="plant-card-description">{description}</p>

        <dl className="plant-card-summary">
          <div>
            <dt>Good for</dt>
            <dd>{products.length > 0 ? products.join(" · ") : <span className="not-listed">Not listed</span>}</dd>
          </div>
          <div>
            <dt>Capabilities</dt>
            <dd>{capabilityLabels.length > 0 ? capabilityLabels.join(" · ") : <span className="not-listed">Ask manufacturer</span>}</dd>
          </div>
          <div>
            <dt>Minimum order</dt>
            <dd>{plant.moqDisplay ?? <span className="not-listed">Not listed</span>}</dd>
          </div>
        </dl>

        <footer className="plant-card-footer">
          {plant.certs.length > 0 ? (
            <ul className="certification-list" aria-label="Publicly listed certifications">
              {plant.certs.slice(0, 3).map((certification) => <li key={certification}>{formatCardSnippet(certification, 26)}</li>)}
            </ul>
          ) : <span />}
          <Link className="go" href={`/manufacturers/${plant.slug}`}>View manufacturer <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </article>
  );
}
