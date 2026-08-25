import { FindManufacturerCta } from "@/components/FindManufacturerCta";

const STEPS = [
  {
    n: "1",
    title: "Choose your product",
    body: "Pick the closest food or beverage idea. “Not sure” works too.",
    icon: "bottle",
  },
  {
    n: "2",
    title: "Tell us what you know",
    body: "Share details like formula, packaging, volume, and timing—or skip what you do not know yet.",
    icon: "notes",
  },
  {
    n: "3",
    title: "Review possible matches",
    body: "See why each manufacturer may fit, what is sourced, and what you still need to ask.",
    icon: "matches",
  },
  {
    n: "4",
    title: "Decide who to contact",
    body: "Open a profile when you are ready to view public contact details or request help reaching the manufacturer.",
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
          <p className="kicker">From idea to outreach</p>
          <h2 id="how-heading">Four clear steps. No manufacturing degree required.</h2>
        </div>
        <p>
          Start with the decision in front of you. We explain process terms only when they help
          you compare plants or prepare a useful question.
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
        <FindManufacturerCta className="btn btn-gold how-button">
          Find my manufacturer
          <span aria-hidden="true"> →</span>
        </FindManufacturerCta>
        <p>Preview possible matches, then open a profile when you’re ready to view public contact details.</p>
      </div>
    </section>
  );
}
