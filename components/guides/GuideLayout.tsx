import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import type { CornerstoneGuide } from "@/lib/guides/cornerstones";
import { articleJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld";
import Image from "next/image";
import Link from "next/link";
import { GuideDiagram } from "./GuideDiagram";
import { GuideDirectoryLink } from "./GuideDirectoryLink";
import { GuideByline } from "./GuideByline";

const GUIDE_REVIEWED_LABEL = "24 Aug 2026";

export function GuideLayout({ guide }: { guide: CornerstoneGuide }) {
  const path = `/guides/${guide.slug}`;
  return (
    <>
      <SiteHeader current="/guides" />
      <JsonLd data={articleJsonLd({ headline: guide.title, description: guide.description, path, image: guide.image, datePublished: "2026-08-23", dateModified: "2026-08-24" })} />
      <JsonLd data={faqPageJsonLd(guide.faq)} />
      <main id="main">
        <article className="wrap guide-page expressive-page">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: guide.title, href: path }]} />
          <header className="guide-hero">
            <div>
              <p className="kicker">{guide.eyebrow}</p>
              <h1>{guide.title}</h1>
              <p className="lede">{guide.description}</p>
              <ul className="guide-hero-facts" aria-label="Guide format">
                <li>{guide.steps.length} clear steps</li>
                <li>Beginner friendly</li>
                <li>Last reviewed {GUIDE_REVIEWED_LABEL}</li>
              </ul>
              <GuideByline reviewed={GUIDE_REVIEWED_LABEL} />
            </div>
            <Image src={guide.image} alt={guide.imageAlt} width={1200} height={800} sizes="(max-width: 760px) 100vw, 46vw" priority />
          </header>

          <div className="guide-body">
            <aside className="guide-toc" aria-label="On this page">
              <strong>Your guide</strong>
              <a href="#steps">Game plan</a><a href="#checklist">Checklist</a><a href="#decisions">Big choices</a><a href="#terms">Quick glossary</a><a href="#questions">Questions to copy</a><a href="#sources">Sources</a>
            </aside>
            <div className="prose guide-copy">
              <section className="direct-answer" aria-labelledby="direct-answer-heading">
                <p className="kicker">The 30-second version</p>
                <h2 id="direct-answer-heading">Here’s the deal</h2><p>{guide.directAnswer}</p>
              </section>
              <GuideDiagram variant={guide.diagram} />

              <section id="steps"><p className="section-number">01 / Start here</p><h2>Your game plan</h2><ol className="guide-steps">{guide.steps.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
              <section id="checklist" className="guide-checklist-section"><p className="section-number">02 / Get ready</p><h2>Your save-this checklist</h2><p>Bring these details into the first conversation. “I’m not sure yet” is still a useful answer.</p><ul className="checklist">{guide.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section id="decisions"><p className="section-number">03 / Choose your path</p><h2>The big choices</h2><table className="decision-table" aria-label="Important manufacturing decisions"><tbody>{guide.decisions.map((item) => <tr key={item.decision}><th scope="row">{item.decision}</th><td>{item.why}</td></tr>)}</tbody></table></section>
              <section id="terms"><p className="section-number">04 / Decode it</p><h2>The no-stress glossary</h2><dl className="term-list">{guide.definitions.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></section>
              <section id="questions" className="guide-questions"><p className="section-number">05 / Reach out</p><h2>Copy these questions into your email</h2><ol>{guide.questions.map((item) => <li key={item}>{item}</li>)}</ol></section>
              <section className="guide-mistakes"><h2>Avoid these first-run traps</h2><ul>{guide.mistakes.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section className="guide-faq"><h2>Quick answers</h2>{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
              <section className="guide-directory-cta"><h2>Ready to compare manufacturers?</h2><p>Start with public product, process, package, and location details. Ask about anything that is not publicly listed.</p><GuideDirectoryLink href={guide.directoryHref} label={guide.directoryLabel} guide={guide.slug} /></section>
              <section id="sources"><h2>Sources</h2><ul className="source-list">{guide.sources.map((source) => <li key={source.href}><a href={source.href} rel="noreferrer">{source.label}</a></li>)}</ul><p className="meta">Reviewed {GUIDE_REVIEWED_LABEL}. Sources are provided for learning and verification.</p></section>
              <p><Link href="/guides">Browse all guides</Link></p>
              <NewsletterCta />
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
