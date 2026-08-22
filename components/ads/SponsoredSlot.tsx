/**
 * Future paid placement. Rendered beside organic results, never inside
 * `filterPlants()` / card ranking. Empty until a rate card exists.
 */
type SlotPosition = "directory-top" | "homepage" | "company";

export function SponsoredSlot({ position }: { position: SlotPosition }) {
  return (
    <aside className="sponsored-slot" data-slot={position} aria-label="Sponsored listing">
      <p className="label">Sponsored</p>
      <p>No sponsored listings yet. Paid slots will sit here and will not change the organic order.</p>
    </aside>
  );
}
