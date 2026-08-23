import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import type { CornerstoneGuide } from "@/lib/guides/cornerstones";
import { articleJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld";
import { LAST_CHECKED_LABEL, LAST_REVIEWED } from "@/lib/site";
import Image from "next/image";
import Link from "next/link";
import { GuideDiagram } from "./GuideDiagram";
import { GuideDirectoryLink } from "./GuideDirectoryLink";

export function GuideLayout({ guide }: { guide: CornerstoneGuide }) {
  const path = `/guides/${guide.slug}`;
  return (
    <>
      <SiteHeader current="/guides" />
      <JsonLd data={articleJsonLd({ headline: guide.title, description: guide.description, path, image: guide.image, dateModified: LAST_REVIEWED })} />
      <JsonLd data={faqPageJsonLd(guide.faq)} />
      <main id="main">
        <article className="wrap guide-page expressive-page">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: guide.title, href: path }]} />
          <header className="guide-hero">
            <div>
              <p className="kicker">{guide.eyebrow}</p>
              <h1>{guide.title}</h1>
              <p className="lede">{guide.description}</p>
              <p className="meta">Last reviewed {LAST_CHECKED_LABEL}</p>
            </div>
            <Image src={guide.image} alt={guide.imageAlt} width={1200} height={800} sizes="(max-width: 760px) 100vw, 46vw" priority />
          </header>

          <div className="guide-body">
            <aside className="guide-toc" aria-label="On this page">
              <strong>On this page</strong>
              <a href="#steps">Steps</a><a href="#checklist">Checklist</a><a href="#decisions">Decisions</a><a href="#terms">Plain terms</a><a href="#questions">Questions</a><a href="#sources">Sources</a>
            </aside>
            <div className="prose guide-copy">
              <section className="direct-answer" aria-labelledby="direct-answer-heading">
                <h2 id="direct-answer-heading">The short answer</h2><p>{guide.directAnswer}</p>
              </section>
              <GuideDiagram variant={guide.diagram} />

              <section id="steps"><h2>Steps</h2><ol className="guide-steps">{guide.steps.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
              <section id="checklist"><h2>Preparation checklist</h2><ul className="checklist">{guide.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section id="decisions"><h2>Important decisions</h2><div className="decision-table" role="table" aria-label="Important manufacturing decisions">{guide.decisions.map((item) => <div role="row" key={item.decision}><strong role="cell">{item.decision}</strong><span role="cell">{item.why}</span></div>)}</div></section>
              <section id="terms"><h2>Plain terms</h2><dl className="term-list">{guide.definitions.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></section>
              <section id="questions"><h2>Questions to ask manufacturers</h2><ol>{guide.questions.map((item) => <li key={item}>{item}</li>)}</ol></section>
              <section><h2>Common mistakes</h2><ul>{guide.mistakes.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section><h2>Frequently asked questions</h2>{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
              <section className="guide-directory-cta"><h2>Ready to compare manufacturers?</h2><p>Start with public product, process, package, and location details. Ask about anything that is not publicly listed.</p><GuideDirectoryLink href={guide.directoryHref} label={guide.directoryLabel} guide={guide.slug} /></section>
              <section id="sources"><h2>Sources</h2><ul className="source-list">{guide.sources.map((source) => <li key={source.href}><a href={source.href} rel="noreferrer">{source.label}</a></li>)}</ul><p className="meta">Reviewed {LAST_CHECKED_LABEL}. Sources are provided for learning and verification.</p></section>
              <p><Link href="/guides">Browse all guides</Link></p>
              <NewsletterCta />
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
