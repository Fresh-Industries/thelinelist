import Link from "next/link";

const STEPS = [
  {
    n: "1",
    title: "Tell us about your product",
    body: "Hot sauce, juice, hummus — everyday words. We map them to the filters the directory already uses.",
  },
  {
    n: "2",
    title: "See matching manufacturers",
    body: "Only plant-site-verified companies. If we do not have coverage, we say so instead of inventing a match.",
  },
  {
    n: "3",
    title: "Read the plant page and ask for an intro",
    body: "You pick a named plant. We can introduce you — not a blind RFQ, not a login, not a commission.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="how" aria-labelledby="how-heading">
      <div className="how-copy">
        <p className="kicker">New to manufacturing?</p>
        <h2 id="how-heading">From idea to a real plant conversation</h2>
        <p>
          Most first-time founders do not need a lecture on psi or LACF. Start
          with the product. Process guides stay in Learn when you want the
          textbook.
        </p>
        <Link className="btn btn-gold" href="/copackers">
          Find My Match
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
      <ol className="how-steps">
        {STEPS.map((step) => (
          <li key={step.n}>
            <span className="how-num">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
