import { EditorialImage } from "@/components/EditorialImage";
import { FindManufacturerCta } from "@/components/FindManufacturerCta";

const STEPS = [
  {
    n: "1",
    title: "Describe the product",
    body: "Describe the product in plain words. Hot sauce, cold juice, hummus. Say what you make, not jargon.",
    image: "/images/how-step-1.svg",
  },
  {
    n: "2",
    title: "Compare manufacturers",
    body: "Compare matching manufacturers. Filter by product, process, place, packaging, and published minimum order. Use this when you need to get out of the kitchen for marketing and distribution.",
    image: "/images/how-step-2.svg",
  },
  {
    n: "3",
    title: "Request an intro",
    body: "Open a plant page and request an intro. You pick the plant. We introduce you. No commission.",
    image: "/images/how-step-3.svg",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="how" aria-labelledby="how-heading">
      <div className="how-copy">
        <p className="kicker">New to manufacturing?</p>
        <h2 id="how-heading">From idea to a real plant conversation</h2>
        <p>
          Most first-time founders do not need a lecture on psi or LACF. Start with the product.
          Process guides stay in Learn when you want the textbook.
        </p>
        <FindManufacturerCta className="btn btn-gold">
          Find a Manufacturer
          <span aria-hidden="true"> →</span>
        </FindManufacturerCta>
      </div>
      <ol className="how-steps">
        {STEPS.map((step) => (
          <li key={step.n}>
            <EditorialImage
              src={step.image}
              alt={`Decorative illustration for step ${step.n}. Not a photograph of a named plant.`}
              width={640}
              height={200}
              sizes="(max-width: 860px) 100vw, 28rem"
              className="how-step-image"
            />
            <span className="how-num">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
