import { DIRECTORY_PLANTS } from "./plants";

const slugs = DIRECTORY_PLANTS.map((plant) => plant.slug);
const unique = new Set(slugs);

if (unique.size !== slugs.length) {
  throw new Error("Duplicate manufacturer slugs in the directory.");
}

const masterKeys = DIRECTORY_PLANTS.flatMap((plant) => plant.masterDedupeKey ? [plant.masterDedupeKey] : []);
if (new Set(masterKeys).size !== masterKeys.length) {
  throw new Error("Duplicate manufacturer master_dedupe_key values in the directory.");
}
