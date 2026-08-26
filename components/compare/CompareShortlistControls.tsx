"use client";

import { comparisonHref, writeComparison } from "@/components/compare/CompareButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface ShortlistPlant {
  slug: string;
  name: string;
}

function focusAfterNavigation(selector: string) {
  const root = document.querySelector("main") ?? document.body;
  const observer = new MutationObserver(() => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    const activeElement = document.activeElement;
    if (activeElement === document.body || activeElement === target || !activeElement || !document.contains(activeElement)) {
      target.focus();
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 5_000);
}

export function CompareShortlistControls({ plants }: { plants: ShortlistPlant[] }) {
  const router = useRouter();
  const slugs = plants.map((plant) => plant.slug);
  const slugKey = slugs.join(",");
  const [selectedSlugs, setSelectedSlugs] = useState(slugs);
  const selectedSlugsRef = useRef(slugs);

  useEffect(() => {
    writeComparison(slugKey ? slugKey.split(",") : []);
  }, [slugKey]);

  function updateShortlist(transform: (current: string[]) => string[]) {
    const next = transform(selectedSlugsRef.current);
    selectedSlugsRef.current = next;
    setSelectedSlugs(next);
    focusAfterNavigation(next.length > 0 ? "#compare-shortlist-heading" : "#compare-empty-heading");
    writeComparison(next);
    router.replace(comparisonHref(next), { scroll: false });
  }

  const selectedPlants = plants.filter((plant) => selectedSlugs.includes(plant.slug));

  return (
    <section className="compare-shortlist" aria-labelledby="compare-shortlist-heading">
      <div className="compare-shortlist-heading">
        <span className="compare-count" aria-hidden="true">{selectedPlants.length}</span>
        <div>
          <h2 id="compare-shortlist-heading" tabIndex={-1}>Your shortlist</h2>
          <p>{selectedPlants.length === 5 ? "Your shortlist is full. Remove one to add another." : `You can add ${5 - selectedPlants.length} more.`}</p>
        </div>
      </div>
      <ul aria-label="Manufacturers in your shortlist">
        {selectedPlants.map((plant, index) => (
          <li key={plant.slug}>
            <span aria-hidden="true">{index + 1}</span>
            <strong>{plant.name}</strong>
            <button type="button" aria-label={`Remove ${plant.name}`} onClick={() => updateShortlist((current) => current.filter((slug) => slug !== plant.slug))}>×</button>
          </li>
        ))}
      </ul>
      <div className="compare-shortlist-actions">
        <Link className="btn btn-gold" href="/find-manufacturers">Add a manufacturer</Link>
        <button type="button" onClick={() => updateShortlist(() => [])}>Clear shortlist</button>
      </div>
    </section>
  );
}
