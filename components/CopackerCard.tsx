import {
  PRODUCT_CATEGORIES,
  formatCardSnippet,
  formatProcesses,
  certificationCardClaims,
  smallRunSignalForPlant,
  plantMatchesCategory,
  type Plant,
  type ProductCategorySlug,
} from "@/lib/directory";
import { packagingSummaryLabels } from "@/lib/directory/packaging";
import { CompareButton } from "@/components/compare/CompareButton";
import Link from "next/link";

function primaryLocation(plant: Plant): string {
  const site = plant.sites[0];
  if (!site) return plant.locationDisplay;
  return site.city ? `${site.city}, ${site.state}` : site.state;
}

function goodFor(plant: Plant, prioritizedCategory?: ProductCategorySlug): string[] {
  const matches = PRODUCT_CATEGORIES.filter((category) => plantMatchesCategory(plant, category.slug));
  const prioritized = prioritizedCategory ? matches.find((category) => category.slug === prioritizedCategory) : undefined;
  const ordered = prioritized ? [prioritized, ...matches.filter((category) => category.slug !== prioritized.slug)] : matches;
  return ordered
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

function capabilityTags(plant: Plant, productLabels: string[]): Array<{ label: string; kind: "product" | "process" | "package" }> {
  const productTags = productLabels
    .slice(0, 3)
    .map((label) => ({ label, kind: "product" as const }));
  const processTags = formatProcesses(plant)
    .slice(0, 2)
    .map((label) => ({ label, kind: "process" as const }));
  const packageTags = packagingCapabilities(plant)
    .filter((label) => label !== "Other disclosed formats")
    .slice(0, 2)
    .map((label) => ({ label, kind: "package" as const }));

  return [...productTags, ...processTags, ...packageTags].slice(0, 6);
}

export function CopackerCard({ plant, prioritizedCategory }: { plant: Plant; prioritizedCategory?: ProductCategorySlug }) {
  const minimums = minimumOrderLines(plant.moqDisplay);
  const productLabels = goodFor(plant, prioritizedCategory);
  const tags = capabilityTags(plant, productLabels);
  const publicProductFallback = productLabels.length === 0 ? formatCardSnippet(plant.productTypesPublished, 120) : null;
  const certificationClaims = certificationCardClaims(plant);
  const smallRunSignal = smallRunSignalForPlant(plant);

  return (
    <article className="plant-card">
      <div className="plant-card-body">
        <header className="plant-card-heading">
          <div>
            <h2><Link href={`/manufacturers/${plant.slug}`}>{plant.name}</Link></h2>
            <p className="place">{primaryLocation(plant)}</p>
          </div>
        </header>

        {tags.length > 0 ? (
          <ul className="capability-chips" aria-label="Publicly listed products and capabilities">
            {tags.map((tag) => (
              <li className={`capability-chip capability-chip-${tag.kind}`} key={`${tag.kind}-${tag.label}`}>
                <span className="capability-chip-kind">{tag.kind === "product" ? "Product" : tag.kind === "process" ? "Process" : "Package"}</span>
                <span>{tag.label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {publicProductFallback ? <p className="plant-card-public-fit"><strong>Publicly lists:</strong> {publicProductFallback}</p> : null}

        <p className={`plant-card-moq${minimums.length === 0 ? " plant-card-moq-unknown" : ""}`}>
          <strong>MOQ:</strong>{" "}
          {minimums.length > 0 ? minimums.map((line) => <span key={line}>{line}</span>) : "Ask manufacturer"}
        </p>

        {smallRunSignal ? (
          <p className="small-run-signal" title="Public source signal only. Confirm current minimums directly with the manufacturer.">
            <strong>Small-run signal listed</strong>
            <span>Confirm current minimums directly.</span>
          </p>
        ) : null}

        <footer className="plant-card-footer">
          {plant.needsCurrentOwnershipVerification ? <span className="ownership-review-badge">Ownership review needed</span> : null}
          {certificationClaims.length > 0 ? (
            <ul className="certification-list" aria-label="Publicly listed certifications">
              {certificationClaims.slice(0, 2).map((certification) => <li key={certification}>{formatCardSnippet(certification, 34)}</li>)}
              {certificationClaims.length > 2 ? <li>+{certificationClaims.length - 2} more</li> : null}
            </ul>
          ) : null}
          <CompareButton slug={plant.slug} name={plant.name} />
          <Link className="go" href={`/manufacturers/${plant.slug}`}>View manufacturer <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </article>
  );
}
