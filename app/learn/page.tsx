import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EditorialImage } from "@/components/EditorialImage";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { plantsForGuide } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Learn manufacturing in plain language",
  description:
    "Process guides for first-time CPG founders. HPP, hot fill, retort, small MOQ, and sauces. Education, not the homepage front door.",
  path: "/learn",
});

const GUIDES = [
  {
    href: "/guides/hpp",
    title: "HPP",
    guide: "hpp" as const,
    plain: "Stays cold. Juice, dip, refrigerated foods.",
  },
  {
    href: "/guides/hot-fill",
    title: "Hot fill",
    guide: "hot-fill" as const,
    plain: "High-acid juice, tea, and many sauces that can sit on a shelf.",
  },
  {
    href: "/guides/retort",
    title: "Retort",
    guide: "retort" as const,
    plain: "Shelf-stable meals, broths, pouches, and cans.",
  },
  {
    href: "/guides/sauce",
    title: "Sauces",
    guide: "sauce" as const,
    plain: "Hot fill, kettle, and acidified condiment work.",
  },
  {
    href: "/guides/small-moq",
    title: "Small MOQ",
    guide: "small-moq" as const,
    plain: "Only plants that printed a floor on their own site.",
  },
] as const;

export default function LearnPage() {
  return (
    <>
      <SiteHeader current="/learn" />
      <main id="main">
        <article className="prose wrap">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Learn", href: "/learn" },
            ]}
          />
          <div className="learn-hero">
            <div>
              <p className="kicker">Learn</p>
              <h1>Manufacturing, explained after you have a product idea</h1>
              <p className="lede">
                Start at <Link href="/copackers">Find manufacturers</Link> if you only know the SKU.
                These guides are the textbook. Psi, LACF, and process rules live here, not on the
                homepage.
              </p>
              <p>
                Filter by product, process, place, and published minimum order. Prepare specs,
                volume, and NDA posture before you outreach.
              </p>
              <p>
                <Link className="btn btn-gold" href="/copackers">
                  Find manufacturers
                </Link>
              </p>
            </div>
            <EditorialImage
              src="/images/learn-hub.svg"
              alt="Decorative illustration for manufacturing guides. Not a photograph of a named plant."
              width={480}
              height={320}
              sizes="(max-width: 860px) 100vw, 22rem"
            />
          </div>
          <ul className="learn-list">
            {GUIDES.map((guide) => {
              const count = plantsForGuide(guide.guide).length;
              return (
                <li key={guide.href}>
                  <Link href={guide.href}>
                    <strong>{guide.title}</strong>
                    <span>{guide.plain}</span>
                    <em>
                      {count} {count === 1 ? "verified plant" : "verified plants"} in
                      the table
                    </em>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/glossary">
                <strong>Glossary</strong>
                <span>Co-packer vs co-manufacturer vs private label vs tolling.</span>
                <em>Terms, not a plant census</em>
              </Link>
            </li>
          </ul>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
