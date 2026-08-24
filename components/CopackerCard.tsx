import {
  PRODUCT_CATEGORIES,
  formatCardSnippet,
  formatProcesses,
  plantMatchesCategory,
  type Plant,
} from "@/lib/directory";
import { packagingSummaryLabels } from "@/lib/directory/packaging";
import Link from "next/link";

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

function packagingCapabilities(plant: Plant): string[] {
  return packagingSummaryLabels(plant.packaging).map((label) => label.charAt(0).toUpperCase() + label.slice(1));
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
  const processLabels = formatProcesses(plant);
  const packageLabels = packagingCapabilities(plant);
  const minimums = minimumOrderLines(plant.moqDisplay);
  const productFit = products.length > 0
    ? products.join(" · ")
    : formatCardSnippet(plant.productTypesPublished, 120);

  return (
    <article className="plant-card">
      <div className="plant-card-body">
        <header className="plant-card-heading">
          <div>
            <h2><Link href={`/manufacturers/${plant.slug}`}>{plant.name}</Link></h2>
          </div>
        </header>
        <dl className="plant-card-summary">
          <div><dt>Product fit</dt><dd>{productFit ?? "Not publicly listed"}</dd></div>
          <div><dt>Location</dt><dd>{primaryLocation(plant)}</dd></div>
          <div><dt>Process</dt><dd>{processLabels.length > 0 ? processLabels.join(" · ") : "Not publicly listed"}</dd></div>
          <div><dt>Packaging</dt><dd>{packageLabels.length > 0 ? packageLabels.join(" · ") : formatCardSnippet(plant.packaging, 90) ?? "Not publicly listed"}</dd></div>
          <div><dt>Minimum order</dt><dd className="moq-lines">{minimums.length > 0 ? minimums.map((line) => <span key={line}>{line}</span>) : "Not publicly listed"}</dd></div>
        </dl>

        <footer className="plant-card-footer">
          {plant.certs.length > 0 ? (
            <ul className="certification-list" aria-label="Publicly listed certifications">
              {plant.certs.slice(0, 2).map((certification) => <li key={certification}>{formatCardSnippet(certification, 26)}</li>)}
              {plant.certs.length > 2 ? <li>+{plant.certs.length - 2} more</li> : null}
            </ul>
          ) : null}
          <Link className="go" href={`/manufacturers/${plant.slug}`}>View manufacturer <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </article>
  );
}
