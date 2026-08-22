import { getVerifiedPlants } from "./query";

export function claimPlantOptions() {
  return getVerifiedPlants()
    .map((plant) => ({
      slug: plant.slug,
      name: plant.name,
      city: plant.sites[0]?.city ?? "",
      state: plant.sites[0]?.state ?? "",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
