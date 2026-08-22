import { VERIFIED_PLANTS } from "./plants";

const slugs = VERIFIED_PLANTS.map((plant) => plant.slug);
const unique = new Set(slugs);

if (unique.size !== slugs.length) {
  throw new Error("Duplicate plant slugs in the verified directory.");
}
