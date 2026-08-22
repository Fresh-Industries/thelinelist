import { SourceLinks } from "@/components/SourceLinks";
import { Unpublished } from "@/components/Unpublished";
import { formatLastVerified, plantsForGuide, type GuideId, type Plant } from "@/lib/directory";
import Link from "next/link";

function cell(value: string | undefined) {
  if (!value) return <Unpublished />;
  const lowered = value.trim().toLowerCase();
  if (lowered === "unpublished" || lowered.startsWith("unpublished")) {
    return <Unpublished>{value}</Unpublished>;
  }
  return value;
}

function HppTable({ plants }: { plants: Plant[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Plant</th>
          <th>City / state</th>
          <th>Model</th>
          <th>Formats</th>
          <th>Certs (published)</th>
          <th>MOQ</th>
          <th>Site</th>
          <th>Verified</th>
        </tr>
      </thead>
      <tbody>
        {plants.map((plant) => {
          const row = plant.guideRows.hpp;
          return (
            <tr key={plant.slug}>
              <td>
                <strong>
                  <Link href={`/copackers/${plant.slug}`}>{plant.name}</Link>
                </strong>
              </td>
              <td>{cell(row?.location)}</td>
              <td>{cell(row?.model)}</td>
              <td>{cell(row?.formats)}</td>
              <td>{cell(row?.certs)}</td>
              <td>{cell(row?.moq)}</td>
              <td>{row ? <SourceLinks links={row.siteLinks} /> : <Unpublished />}</td>
              <td>{formatLastVerified(plant.lastVerified)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ProcessTable({ plants, guide }: { plants: Plant[]; guide: "hot-fill" | "retort" | "sauce" }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Plant</th>
          <th>City / state</th>
          <th>Formats / process as stated</th>
          <th>Certs published</th>
          <th>MOQ published</th>
          <th>USDA vs FDA</th>
          <th>Organic</th>
          <th>Site</th>
          <th>Last verified</th>
        </tr>
      </thead>
      <tbody>
        {plants.map((plant) => {
          const row = plant.guideRows[guide];
          return (
            <tr key={plant.slug}>
              <td>
                <strong>
                  <Link href={`/copackers/${plant.slug}`}>{plant.name}</Link>
                </strong>
              </td>
              <td>{cell(row?.location)}</td>
              <td>{cell(row?.formats)}</td>
              <td>{cell(row?.certs)}</td>
              <td>{cell(row?.moq)}</td>
              <td>{cell(row?.usdaVsFda)}</td>
              <td>{cell(row?.organic)}</td>
              <td>{row ? <SourceLinks links={row.siteLinks} /> : <Unpublished />}</td>
              <td>{formatLastVerified(plant.lastVerified)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SmallMoqTable({ plants }: { plants: Plant[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>City / state</th>
          <th>Process (as stated)</th>
          <th>Published MOQ</th>
          <th>Certs if published</th>
          <th>Link</th>
          <th>Last verified</th>
        </tr>
      </thead>
      <tbody>
        {plants.map((plant) => {
          const row = plant.guideRows["small-moq"];
          return (
            <tr key={plant.slug}>
              <td>
                <strong>
                  <Link href={`/copackers/${plant.slug}`}>{plant.name}</Link>
                </strong>
              </td>
              <td>{cell(row?.location)}</td>
              <td>{cell(row?.processAsStated)}</td>
              <td>{cell(row?.moq)}</td>
              <td>{cell(row?.certs)}</td>
              <td>{row ? <SourceLinks links={row.siteLinks} /> : <Unpublished />}</td>
              <td>{formatLastVerified(plant.lastVerified)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function GuidePlantTable({ guide }: { guide: GuideId }) {
  const plants = plantsForGuide(guide);

  return (
    <>
      <div className="table-wrap">
        {renderTable(guide, plants)}
      </div>
      <p className="table-hint">On a small screen, scroll the table sideways — cells are not smashed.</p>
    </>
  );
}

function renderTable(guide: GuideId, plants: Plant[]) {
  switch (guide) {
    case "hpp":
      return <HppTable plants={plants} />;
    case "hot-fill":
      return <ProcessTable plants={plants} guide="hot-fill" />;
    case "retort":
      return <ProcessTable plants={plants} guide="retort" />;
    case "sauce":
      return <ProcessTable plants={plants} guide="sauce" />;
    case "small-moq":
      return <SmallMoqTable plants={plants} />;
    default: {
      const _exhaustive: never = guide;
      return _exhaustive;
    }
  }
}
