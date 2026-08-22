import { countByFinderProduct, type FinderProduct } from "@/lib/directory";
import Image from "next/image";
import Link from "next/link";

interface CategoryCard {
  product: FinderProduct;
  title: string;
  href: string;
  image: string;
  blurb: string;
}

const CATEGORIES: CategoryCard[] = [
  {
    product: "beverage",
    title: "Beverages",
    href: "/copackers?product=beverage",
    image: "/images/cat-beverage.svg",
    blurb: "Juice, tea, and other drinks that verified plants actually name.",
  },
  {
    product: "sauce",
    title: "Sauces & condiments",
    href: "/copackers?product=sauce",
    image: "/images/cat-sauce.svg",
    blurb: "Hot sauce, salsa, dressings, and kettle work — when the plant said so.",
  },
  {
    product: "prepared-rte",
    title: "Prepared / refrigerated",
    href: "/copackers?product=prepared-rte",
    image: "/images/cat-rte.svg",
    blurb: "Dips, salads, and other cold RTE foods from published coverage.",
  },
];

export function CategoryCards() {
  const cards = CATEGORIES.map((category) => ({
    ...category,
    count: countByFinderProduct(category.product),
  })).filter((category) => category.count > 0);

  if (cards.length === 0) return null;

  return (
    <section className="categories" aria-labelledby="categories-heading">
      <div className="section-head">
        <h2 id="categories-heading">For every type of product we can verify</h2>
        <Link href="/copackers">See all manufacturers →</Link>
      </div>
      <ul className="category-grid">
        {cards.map((card) => (
          <li key={card.product}>
            <Link className="category-card" href={card.href}>
              <Image src={card.image} alt="" width={640} height={400} />
              <span className="category-card-copy">
                <strong>{card.title}</strong>
                <em>
                  {card.count} {card.count === 1 ? "maker" : "makers"}
                </em>
                <span>{card.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
