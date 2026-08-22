import Link from "next/link";
import {
  formatLastVerified,
  formatProcesses,
  formatProductTypes,
  type Plant,
} from "@/lib/directory";
import { Unpublished } from "./Unpublished";

export function CopackerCard({ plant }: { plant: Plant }) {
  const processes = formatProcesses(plant);
  const products = formatProductTypes(plant);

  return (
    <article className="plant-card">
      <h2>
        <Link href={`/copackers/${plant.slug}`}>{plant.name}</Link>
      </h2>
      <p className="place">{plant.locationDisplay}</p>
      <dl>
        <div>
          <dt>Processes</dt>
          <dd>{processes.length > 0 ? processes.join(" · ") : <Unpublished />}</dd>
        </div>
        <div>
          <dt>Product types</dt>
          <dd>
            {products.length > 0
              ? products.join(" · ")
              : plant.productTypesPublished ?? <Unpublished />}
          </dd>
        </div>
        <div>
          <dt>Packaging</dt>
          <dd>{plant.packaging ?? <Unpublished />}</dd>
        </div>
        <div>
          <dt>Published MOQ</dt>
          <dd>{plant.moqDisplay ?? <Unpublished />}</dd>
        </div>
        <div>
          <dt>Certs</dt>
          <dd>{plant.certs.length > 0 ? plant.certs.join(" · ") : <Unpublished />}</dd>
        </div>
        <div>
          <dt>Last verified</dt>
          <dd>{formatLastVerified(plant.lastVerified)}</dd>
        </div>
      </dl>
      <Link className="go" href={`/copackers/${plant.slug}`}>
        View company
      </Link>
    </article>
  );
}
