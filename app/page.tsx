import { HowItWorks } from "@/components/HowItWorks";
import { NewsletterCta } from "@/components/NewsletterCta";
import { ProductSelector } from "@/components/ProductSelector";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustStrip } from "@/components/TrustStrip";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const HOME_GUIDES = [
  {
    href: "/guides/first-production-run",
    label: "First production run",
    title: "Plan your first production run",
    description: "Get clear on specs, trials, packaging, storage, and the questions to ask before production day.",
    time: "8 min read",
    tone: "yellow",
    featured: true,
  },
  {
    href: "/guides/start-hot-sauce",
    label: "Hot sauce",
    title: "Manufacture your first hot sauce product",
    description: "Compare private label and custom paths, then learn the acidified-food basics.",
    time: "7 min read",
    tone: "coral",
    featured: false,
  },
  {
    href: "/guides/energy-drink",
    label: "Energy drinks",
    title: "Launch an energy drink",
    description: "Understand formula paths, carbonation, packaging, and what makes a filling line fit.",
    time: "7 min read",
    tone: "aqua",
    featured: false,
  },
  {
    href: "/guides/cold-pressed-juice",
    label: "Cold-pressed juice",
    title: "Manufacture cold-pressed juice",
    description: "Separate extraction from food safety, then plan process, packaging, and cold storage.",
    time: "8 min read",
    tone: "lavender",
    featured: false,
  },
] as const;

function GuideGraphic({ tone }: { tone: (typeof HOME_GUIDES)[number]["tone"] }) {
  return (
    <svg className={`home-guide-graphic home-guide-graphic-${tone}`} viewBox="0 0 120 76" aria-hidden="true">
      <path className="guide-graphic-page" d="M18 13h52l14 14v37H18z" />
      <path className="guide-graphic-fold" d="M70 13v14h14" />
      <path className="guide-graphic-line" d="M30 35h36M30 45h29M30 55h22" />
      <path className="guide-graphic-arrow" d="M79 52h24m-9-9 9 9-9 9" />
      <circle className="guide-graphic-dot" cx="100" cy="22" r="8" />
    </svg>
  );
}

export const metadata: Metadata = pageMetadata({
  title: "The Line List | Food and Beverage Manufacturers",
  description:
    "Learn what your food or drink product needs, find manufacturers that may fit, and prepare for your first conversation.",
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <>
      <SiteHeader current="/" />
      <main id="main" className="home">
        <section className="hero-immersive">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="kicker">From idea to first run</p>
              <h1>Find the right food or beverage manufacturer.</h1>
              <p className="sub">
                Learn what your product needs, find manufacturers that may fit, and prepare for your first conversation.
              </p>
              <div className="hero-actions">
                <Link className="btn hero-primary" href="/find-manufacturers/wizard">
                  Find manufacturers for my product
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn hero-secondary" href="#how-it-works">
                  Show me how it works
                </Link>
              </div>
            </div>
            <figure className="hero-visual clay-hero-journey">
              <span className="hero-shape" aria-hidden="true" />
              <span className="hero-dots" aria-hidden="true">•••</span>
              <span className="hero-idea-label" aria-hidden="true">idea</span>
              <span className="hero-product-label" aria-hidden="true">product!</span>
              <Image
                src="/images/clay-v2/support/idea-to-product.webp"
                alt="A clay diorama moving from a product sketch and samples to mixing, filling, and finished unbranded products"
                width={1600}
                height={800}
                sizes="(max-width: 960px) 100vw, (max-width: 1280px) 56vw, 40rem"
                preload
              />
            </figure>
          </div>
        </section>

        <ProductSelector />

        <HowItWorks />

        <TrustStrip />

        <section className="home-guides wrap" aria-labelledby="home-guides-heading">
          <div className="section-head">
            <div>
              <p className="kicker">Learn by goal</p>
              <h2 id="home-guides-heading">Know what to ask before you call</h2>
            </div>
            <Link className="text-link-arrow" href="/guides">Browse all guides <span aria-hidden="true">→</span></Link>
          </div>
          <div className="home-guide-grid">
            {HOME_GUIDES.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className={`home-guide-card guide-tone-${guide.tone}${guide.featured ? " home-guide-featured" : ""}`}
              >
                <span className="home-guide-label">{guide.label}</span>
                <GuideGraphic tone={guide.tone} />
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <span className="home-guide-footer">
                  <span>{guide.time}</span>
                  <strong>Read the guide <span aria-hidden="true">→</span></strong>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="wrap">
          <NewsletterCta />
        </div>
      </main>
    </>
  );
}
