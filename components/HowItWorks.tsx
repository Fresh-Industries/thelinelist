import { ProductPlanCta } from "@/components/ProductPlanCta";

const STEPS = [
  {
    n: "1",
    title: "Start with your idea",
    body: "Describe the food or drink you want to make. You do not need a finished recipe to start your plan.",
    icon: "bottle",
  },
  {
    n: "2",
    title: "Shape your product plan",
    body: "Use short guides and examples to work through recipe readiness, packaging, and how much to make first. “I’m not sure” keeps a decision open.",
    icon: "notes",
  },
  {
    n: "3",
    title: "Explore possible manufacturers",
    body: "Compare public evidence, minimums, and unknowns. A possible fit still needs the manufacturer’s confirmation.",
    icon: "matches",
  },
  {
    n: "4",
    title: "Prepare your introduction",
    body: "Choose who to approach, review your draft and shared product brief, and decide when to contact them.",
    icon: "contact",
  },
] as const;

function JourneyIcon({ icon }: { icon: (typeof STEPS)[number]["icon"] }) {
  if (icon === "bottle") {
    return <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M17 8h10v6l4 5v17H13V19l4-5z" /><path d="M17 23h14" /></svg>;
  }

  if (icon === "notes") {
    return <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M11 9h22v27H11z" /><path d="M16 17h12M16 23h12M16 29h8" /></svg>;
  }

  if (icon === "matches") {
    return <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M8 13h21v21H8z" /><path d="m14 23 4 4 8-9" /><path d="M33 11h3v3M33 20h3v3M33 29h3v3" /></svg>;
  }

  return <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M8 13h28v20H8z" /><path d="m9 15 13 10 13-10" /></svg>;
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="how" aria-labelledby="how-heading">
      <div className="how-heading">
        <div>
          <p className="kicker">From idea to first conversation</p>
          <h2 id="how-heading">Make the next decision, one step at a time.</h2>
        </div>
        <p>
          Start with what you know. Learn the manufacturing terms when they help you make a
          decision, and keep the details you have not figured out visible.
        </p>
      </div>
      <ol className="how-steps">
        {STEPS.map((step) => (
          <li key={step.n}>
            <span className="how-num">{step.n}</span>
            <span className="how-step-icon"><JourneyIcon icon={step.icon} /></span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="how-action">
        <ProductPlanCta className="btn btn-gold how-button" source="home_how_it_works">
          Start my product plan
          <span aria-hidden="true"> →</span>
        </ProductPlanCta>
        <p>A plain-language idea is enough to begin. You control what gets shared and who gets contacted.</p>
      </div>
    </section>
  );
}
