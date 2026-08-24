import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { CORNERSTONE_GUIDES } from "@/lib/guides/cornerstones";
import { pageMetadata } from "@/lib/seo/metadata";
import Image from "next/image";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Food and beverage manufacturing guides",
  description:
    "Beginner guides for finding a manufacturer, choosing a process and package, and preparing a first production run.",
  path: "/guides",
});

const PROCESS_GUIDES = [
  {
    href: "/guides/hpp",
    title: "HPP",
    cue: "Keep it cold",
    bestFor: "Fresh juice, dips, guacamole, and refrigerated foods",
    reality: "The finished product still needs a cold chain.",
    tone: "aqua",
  },
  {
    href: "/guides/hot-fill",
    title: "Hot fill",
    cue: "Shelf stable + high acid",
    bestFor: "Many juices, teas, wellness shots, and acidified sauces",
    reality: "The formula and package must both handle heat.",
    tone: "coral",
  },
  {
    href: "/guides/retort",
    title: "Retort",
    cue: "Shelf stable + low acid",
    bestFor: "Meals, broths, plant milks, pouches, cans, and trays",
    reality: "The sealed package gets a scheduled cook.",
    tone: "lavender",
  },
] as const;

export default function GuidesPage() {
  return (
    <>
      <SiteHeader current="/guides" />
      <main id="main" className="wrap guides-index guide-hub">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Guides", href: "/guides" },
          ]}
        />

        <header className="guide-hub-hero">
          <div className="guide-hub-hero-copy">
            <p className="kicker">Manufacturing, minus the jargon spiral</p>
            <h1>Okay, what are we making?</h1>
            <p className="lede">
              Pick your product, get the decisions that actually matter, and show up to a
              manufacturer conversation prepared.
            </p>
            <div className="guide-hub-actions">
              <a className="btn btn-gold" href="#pick-a-guide">
                Pick my guide
              </a>
              <a className="guide-text-link" href="#process-map">
                Help me choose a process <span aria-hidden="true">↓</span>
              </a>
            </div>
            <ul className="guide-hub-promises" aria-label="What the guides include">
              <li>Plain-language steps</li>
              <li>Saveable checklists</li>
              <li>Source-backed facts</li>
            </ul>
          </div>
          <div className="guide-hub-hero-art">
            <Image
              src="/images/clay-v2/support/beginner-onboarding.webp"
              alt="Clay checklist, question mark, bottle, jar, and can"
              width={640}
              height={640}
              sizes="(max-width: 760px) 82vw, 30rem"
              priority
            />
            <span className="guide-art-note">You do not need to know the technical words yet.</span>
          </div>
        </header>

        <section id="pick-a-guide" className="guide-hub-section" aria-labelledby="pick-a-guide-title">
          <div className="guide-section-heading">
            <div>
              <p className="kicker">Product playbooks</p>
              <h2 id="pick-a-guide-title">Pick the one that sounds like you</h2>
            </div>
            <p>Each guide turns a product idea into a practical first-manufacturer brief.</p>
          </div>

          <div className="guide-card-grid">
            {CORNERSTONE_GUIDES.map((guide, index) => (
              <article className="guide-card" key={guide.slug}>
                <div className="guide-card-image-link">
                  <Image
                    src={guide.image}
                    alt=""
                    width={800}
                    height={520}
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                </div>
                <div>
                  <div className="guide-card-topline">
                    <p className="kicker">{guide.eyebrow}</p>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>
                    <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
                  </h3>
                  <p>{guide.description}</p>
                  <div className="guide-card-learn">
                    <span>You’ll figure out</span>
                    <strong>{guide.decisions.slice(0, 2).map((item) => item.decision).join(" · ")}</strong>
                  </div>
                  <Link className="guide-card-cta" href={`/guides/${guide.slug}`}>
                    Start the guide <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="process-map" className="guide-hub-section process-map" aria-labelledby="process-map-title">
          <div className="guide-section-heading">
            <div>
              <p className="kicker">The process cheat sheet</p>
              <h2 id="process-map-title">Start with where the product lives</h2>
            </div>
            <p>This is a first-pass map. Your formula, package, and qualified process expert make the final call.</p>
          </div>

          <div className="process-map-question">
            <span>First question</span>
            <strong>Fridge or shelf?</strong>
          </div>
          <div className="process-map-grid">
            {PROCESS_GUIDES.map((process, index) => (
              <article className={`process-map-card process-map-card-${process.tone}`} key={process.href}>
                <div className="process-map-card-head">
                  <span aria-hidden="true">0{index + 1}</span>
                  <p>{process.cue}</p>
                </div>
                <h3>{process.title}</h3>
                <dl>
                  <div>
                    <dt>Usually fits</dt>
                    <dd>{process.bestFor}</dd>
                  </div>
                  <div>
                    <dt>Reality check</dt>
                    <dd>{process.reality}</dd>
                  </div>
                </dl>
                <Link href={process.href}>
                  Learn {process.title} <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
          <p className="process-map-caption">
            Still unsure? That is normal. Use the <Link href="/find-manufacturers/wizard">matching wizard</Link> and choose “I’m not sure” when a technical question comes up.
          </p>
        </section>

        <section className="guide-hub-section guide-toolkit" aria-labelledby="toolkit-title">
          <div>
            <p className="kicker">Quick side quests</p>
            <h2 id="toolkit-title">Unblock the next question</h2>
            <p>Short explainers for the terms and constraints that tend to stop a first project.</p>
          </div>
          <div className="guide-toolkit-links">
            <Link href="/guides/sauce"><span>Sauce paths</span><small>Hot fill, kettle, acidified, or retort?</small></Link>
            <Link href="/guides/small-moq"><span>Minimum runs</span><small>What “small MOQ” actually means</small></Link>
            <Link href="/glossary"><span>Plain-English glossary</span><small>Decode co-packer, tolling, MOQ, and more</small></Link>
            <Link href="/how-we-verify"><span>How facts are checked</span><small>See what source-reviewed and unpublished mean</small></Link>
          </div>
        </section>

        <NewsletterCta />
      </main>
    </>
  );
}
