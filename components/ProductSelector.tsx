"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { PRODUCT_CATEGORIES } from "@/lib/directory/categories";
import Image from "next/image";
import Link from "next/link";

function categoryImage(slug: string): string {
  return `/images/clay-v2/products/${slug}.webp`;
}

export function ProductSelector() {
  return (
    <section className="product-selector wrap" aria-labelledby="product-selector-heading">
      <div className="product-selector-head">
        <p className="kicker">Start here</p>
        <h2 id="product-selector-heading">What do you want to make?</h2>
        <p>Choose the closest option. You can always change it later.</p>
      </div>
      <ul className="product-choice-grid">
        {PRODUCT_CATEGORIES.map((category, index) => (
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
                  src={categoryImage(category.slug)}
                  alt=""
                  width={640}
                  height={640}
                  sizes="(max-width: 620px) 48vw, (max-width: 1000px) 30vw, 18vw"
                  unoptimized
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
                sizes="(max-width: 620px) 45vw, 12vw"
              />
            </span>
            <strong>Not sure yet?</strong>
            <span className="product-choice-description">Answer a few quick questions and we’ll point you in the right direction.</span>
            <span className="product-choice-action">Take the 60-second quiz <span aria-hidden="true">→</span></span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
