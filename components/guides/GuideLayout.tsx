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

export function GuideLayout({ guide }: { guide: CornerstoneGuide }) {
  const path = `/guides/${guide.slug}`;
  return (
    <>
      <SiteHeader current="/guides" />
      <JsonLd data={articleJsonLd({ headline: guide.title, description: guide.description, path, image: guide.image, datePublished: guide.datePublished ?? "2026-08-23", dateModified: guide.dateModified })} />
      <JsonLd data={faqPageJsonLd(guide.faq)} />
      <main id="main">
        <article className="wrap guide-page expressive-page">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: guide.title, href: path }]} />
          <header className="guide-hero">
            <div>
              <p className="kicker">{guide.eyebrow}</p>
              <h1>{guide.title}</h1>
              <div id="quick-answer" className="direct-answer"><p>{guide.directAnswer}</p></div>
              <p className="lede">{guide.description}</p>
              <ul className="guide-hero-facts" aria-label="Guide format">
                <li>{guide.steps.length} clear steps</li>
                <li>Beginner friendly</li>
                <li>Last reviewed {guide.reviewedLabel}</li>
              </ul>
              <GuideByline reviewed={guide.reviewedLabel} />
            </div>
            <Image src={guide.image} alt={guide.imageAlt} width={1200} height={800} sizes="(max-width: 760px) 100vw, 46vw" priority />
          </header>

          <div className="guide-body">
            <aside className="guide-toc" aria-label="On this page">
              <strong>On this page</strong>
              <a href="#quick-answer">Quick answer</a><a href="#steps">Steps</a><a href="#checklist">What to have ready</a><a href="#decisions">Choices to make</a><a href="#terms">Words to know</a><a href="#questions">Questions to ask</a><a href="#mistakes">Common mistakes</a><a href="#faq">FAQs</a><a href="#sources">Sources</a>
            </aside>
            <div className="prose guide-copy">
              <section className="guide-audience" aria-labelledby="guide-audience-heading"><h2 id="guide-audience-heading">Who this is for</h2><p>{guide.whoThisIsFor}</p></section>
              <GuideDiagram variant={guide.diagram} />

              <section id="steps"><p className="section-number">01 / Start here</p><h2>What should you do first?</h2><ol className="guide-steps">{guide.steps.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
              <section id="checklist" className="guide-checklist-section"><p className="section-number">02 / Get ready</p><h2>What should you have ready?</h2><p>Bring these details into the first conversation. “I’m not sure yet” is still a useful answer.</p><ul className="checklist">{guide.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section id="decisions"><p className="section-number">03 / Choose your path</p><h2>Which choices shape the project?</h2><table className="decision-table" aria-label="Important manufacturing decisions"><tbody>{guide.decisions.map((item) => <tr key={item.decision}><th scope="row">{item.decision}</th><td>{item.why}</td></tr>)}</tbody></table></section>
              <section id="terms"><p className="section-number">04 / Understand the words</p><h2>Which words should you know?</h2><dl className="term-list">{guide.definitions.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></section>
              <section id="questions" className="guide-questions"><p className="section-number">05 / Reach out</p><h2>What should you ask a manufacturer?</h2><p>You can copy these into your first email.</p><ol>{guide.questions.map((item) => <li key={item}>{item}</li>)}</ol></section>
              <section id="mistakes" className="guide-mistakes"><h2>Which mistakes should you avoid?</h2><ul>{guide.mistakes.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section id="faq" className="guide-faq"><h2>What else do founders ask?</h2>{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
              {guide.relatedLinks?.length ? <nav className="guide-related" aria-labelledby="related-guides-heading"><h2 id="related-guides-heading">What should you learn next?</h2><ul>{guide.relatedLinks.map((item) => <li key={item.href}><Link href={item.href}>{item.label} <span aria-hidden="true">→</span></Link></li>)}</ul></nav> : null}
              <section className="guide-directory-cta"><h2>Ready to compare manufacturers?</h2><p>Start with public product, process, package, and location details. Ask about anything that is not publicly listed.</p><GuideDirectoryLink href={guide.directoryHref} label={guide.directoryLabel} guide={guide.slug} /></section>
              <section id="sources"><h2>Where can you verify this?</h2><ul className="source-list">{guide.sources.map((source) => <li key={source.href}><a href={source.href} rel="noreferrer">{source.label}</a></li>)}</ul><p className="meta">Reviewed {guide.reviewedLabel}. Sources are provided for learning and verification.</p></section>
              <p><Link href="/guides">Browse all guides</Link></p>
              <NewsletterCta />
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
