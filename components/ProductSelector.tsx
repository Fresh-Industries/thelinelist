"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { PRODUCT_CATEGORIES, PRODUCT_MACRO_GROUPS, type ProductCategorySlug } from "@/lib/directory/categories";
import Link from "next/link";

export function ProductSelector({ visibleCategories }: { visibleCategories: ProductCategorySlug[] }) {
  const visible = new Set(visibleCategories);
  const groups = PRODUCT_MACRO_GROUPS.flatMap((group) => {
    const categories = PRODUCT_CATEGORIES.filter((category) => category.group === group.slug && visible.has(category.slug));
    return categories.length > 0 ? [{ ...group, categories }] : [];
  });

  return (
    <section className="product-selector wrap" aria-labelledby="product-selector-heading">
      <div className="product-selector-head">
        <p className="kicker">Start here</p>
        <h2 id="product-selector-heading">What do you want to make?</h2>
        <p>Choose the closest option. You can always change it later.</p>
      </div>
      <ul className="macro-category-grid">
        {groups.map((group, index) => (
          <li key={group.slug} className={`macro-category-card macro-category-tone-${(index % 4) + 1}`}>
            <div className="macro-category-heading">
              <span aria-hidden="true">0{index + 1}</span>
              <div><h3>{group.label}</h3><p>{group.description}</p></div>
            </div>
            <ul className="macro-category-links">
              {group.categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/find-manufacturers/${category.slug}`}
                    onClick={() => track(ANALYTICS_EVENTS.product_selected, { product: category.slug, source: "home" })}
                  >
                    {category.label} <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
        <li className="macro-category-card macro-category-unsure">
          <Link
            href="/find-manufacturers/wizard"
            className="macro-unsure-link"
            aria-label="Take the 60-second product matching quiz"
            onClick={() => track(ANALYTICS_EVENTS.product_selected, { product: "unsure", source: "home" })}
          >
            <span className="macro-unsure-mark" aria-hidden="true">?</span>
            <span><strong>Not sure yet?</strong><small>Answer a few quick questions and see possible matches.</small></span>
            <span aria-hidden="true">→</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
