import Link from "next/link";
import {
  formatLastVerified,
  formatProductTypes,
  type FinderProduct,
  type Plant,
} from "@/lib/directory";
import { Unpublished } from "./Unpublished";

function cardTone(plant: Plant): string {
  const first: FinderProduct | undefined = plant.finderProducts[0];
  if (first === undefined) return "tone-unknown";
  switch (first) {
    case "beverage":
      return "tone-beverage";
    case "sauce":
      return "tone-sauce";
    case "prepared-rte":
      return "tone-rte";
    default: {
      const _exhaustive: never = first;
      return _exhaustive;
    }
  }
}

export function CopackerCard({ plant }: { plant: Plant }) {
  const products = formatProductTypes(plant);

  return (
    <article className={`plant-card ${cardTone(plant)}`}>
      <div className="plant-card-media" aria-hidden="true" />
      <div className="plant-card-body">
        <h2>
          <Link href={`/copackers/${plant.slug}`}>{plant.name}</Link>
        </h2>
        <p className="place">{plant.locationDisplay}</p>
        <dl>
          <div>
            <dt>Makes</dt>
            <dd>
              {products.length > 0
                ? products.join(" · ")
                : plant.productTypesPublished ?? <Unpublished />}
            </dd>
          </div>
          <div>
            <dt>Published MOQ</dt>
            <dd>{plant.moqDisplay ?? <Unpublished />}</dd>
          </div>
          <div>
            <dt>Last verified</dt>
            <dd>{formatLastVerified(plant.lastVerified)}</dd>
          </div>
        </dl>
        <Link className="go" href={`/copackers/${plant.slug}`}>
          View manufacturer
        </Link>
      </div>
    </article>
  );
}
