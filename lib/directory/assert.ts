import { DIRECTORY_PLANTS } from "./plants";
import type { FinderProcess, Plant } from "./types";

const slugs = DIRECTORY_PLANTS.map((plant) => plant.slug);
const unique = new Set(slugs);

if (unique.size !== slugs.length) {
  throw new Error("Duplicate manufacturer slugs in the directory.");
}

const masterKeys = DIRECTORY_PLANTS.flatMap((plant) => plant.masterDedupeKey ? [plant.masterDedupeKey] : []);
if (new Set(masterKeys).size !== masterKeys.length) {
  throw new Error("Duplicate manufacturer master_dedupe_key values in the directory.");
}

const CAPABILITY_TERMS: Record<FinderProcess, string> = {
  hpp: "HPP",
  "hot-fill": "hot[- ]fill",
  retort: "retort",
  "cold-fill": "cold[- ]fill",
  acidified: "acidified",
};

function directlyNegatesCapability(description: string, process: FinderProcess): boolean {
  const term = CAPABILITY_TERMS[process];
  const directSubject = "(?:we|this|it|the\\s+(?:manufacturer|facility|plant|company|operation|service|line))";
  return [
    new RegExp(`(?:^|[.!?;]\\s+)${directSubject}\\s+(?:is|are)\\s+not\\s+(?:an?\\s+)?${term}\\b`, "i"),
    new RegExp(`(?:^|[.!?;]\\s+)(?:${directSubject}\\s+)?(?:does|do)\\s+not\\s+(?:offer|provide|run|use|support|perform|process)?\\s*${term}\\b`, "i"),
    new RegExp(`(?:^|[.!?;]\\s+)(?:no|not)\\s+(?:an?\\s+)?${term}\\b`, "i"),
  ].some((pattern) => pattern.test(description));
}

export function capabilityContradictions(plant: Plant): FinderProcess[] {
  const guideDescriptions = Object.values(plant.guideRows).flatMap((row) => row
    ? [row.formats, row.processAsStated, row.model].filter((value): value is string => Boolean(value))
    : []);
  const publicDescription = [
    plant.productTypesPublished,
    plant.manufacturingCapabilitiesPublished,
    plant.packaging,
    ...plant.overview,
    ...guideDescriptions,
  ].filter((value): value is string => Boolean(value)).join(" ");
  return plant.finderProcesses.filter((process) => directlyNegatesCapability(publicDescription, process));
}

for (const plant of DIRECTORY_PLANTS) {
  const contradictions = capabilityContradictions(plant);
  if (contradictions.length > 0) {
    throw new Error(`${plant.slug}: public description negates selected capabilities: ${contradictions.join(", ")}.`);
  }

  const hasClaims = Boolean(
    plant.productTypesPublished || plant.manufacturingCapabilitiesPublished || plant.packaging
      || plant.moqDisplay || plant.processes.length || plant.certs.length,
  );
  const sources = [plant.website, ...(plant.extraLinks ?? [])];
  if (hasClaims && !sources.some((source) => /^https?:\/\//.test(source.href))) {
    throw new Error(`${plant.slug}: public product, process, packaging, certification, or MOQ claims require a source URL.`);
  }
}
