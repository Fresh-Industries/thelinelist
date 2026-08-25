"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { PRODUCT_CATEGORIES, PRODUCT_MACRO_GROUPS, type ProductCategorySlug } from "@/lib/directory/categories";
import Image from "next/image";
import Link from "next/link";

const IMAGE_LED_CATEGORIES = [
  "soda",
  "energy-drink",
  "sports-hydration",
  "functional-beverages",
  "cold-pressed-juice",
  "juice",
  "rtd-coffee-tea",
  "water",
  "hot-sauce",
  "sauce",
  "salsa",
  "dressings-marinades",
  "dips-hummus",
  "prepared-refrigerated-foods",
] as const satisfies readonly ProductCategorySlug[];

export function ProductSelector({ visibleCategories }: { visibleCategories: ProductCategorySlug[] }) {
  const visible = new Set(visibleCategories);
  const imageLedCategories = IMAGE_LED_CATEGORIES.flatMap((slug) => {
    const category = PRODUCT_CATEGORIES.find((candidate) => candidate.slug === slug);
    return category && visible.has(slug) ? [category] : [];
  });
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
      <div className="product-selector-subhead">
        <div>
          <h3>Popular starting points</h3>
          <p>Swipe or scroll through the products people ask about most.</p>
        </div>
        <span aria-hidden="true">Scroll to browse →</span>
      </div>
      <ul className="product-choice-grid product-image-rail">
        {imageLedCategories.map((category, index) => (
          <li key={category.slug}>
            <Link
              href={`/find-manufacturers/${category.slug}`}
              className={`product-choice product-choice-tone-${(index % 4) + 1}`}
              aria-label={`Explore ${category.label} manufacturers`}
              onClick={() => track(ANALYTICS_EVENTS.product_selected, { product: category.slug, source: "home" })}
            >
              <span className="product-choice-corner" aria-hidden="true">↗</span>
              <span className="product-choice-art" aria-hidden="true">
                <Image
                  src={`/images/clay-v2/products/${category.slug}.webp`}
                  alt=""
                  width={640}
                  height={640}
                  sizes="(max-width: 680px) 44vw, (max-width: 1040px) 22vw, 11rem"
                />
              </span>
              <strong>{category.label}</strong>
              <span className="product-choice-action">Explore <span aria-hidden="true">→</span></span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/find-manufacturers/wizard"
            className="product-choice product-choice-unsure"
            aria-label="Take the 60-second product matching quiz"
            onClick={() => track(ANALYTICS_EVENTS.product_selected, { product: "unsure", source: "home" })}
          >
            <span className="product-choice-corner" aria-hidden="true">↗</span>
            <span className="product-choice-art product-choice-art-unsure" aria-hidden="true">
              <Image
                src="/images/clay-v2/support/question-mark.webp"
                alt=""
                width={640}
                height={640}
                sizes="(max-width: 680px) 44vw, (max-width: 1040px) 22vw, 11rem"
              />
            </span>
            <strong>Not sure yet?</strong>
            <span className="product-choice-action">Take the quiz <span aria-hidden="true">→</span></span>
          </Link>
        </li>
      </ul>
      <div className="product-selector-subhead product-selector-all-head">
        <div>
          <h3>Browse every product type</h3>
          <p>Including snacks, bakery, dry goods, dairy, frozen foods, and prepared meals.</p>
        </div>
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
