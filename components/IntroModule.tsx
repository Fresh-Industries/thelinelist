import { IntroForm } from "@/components/forms/IntroForm";
import Link from "next/link";

export function IntroModule({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  return (
    <section className="intro-module" id="intro" aria-labelledby="intro-heading">
      <h2 id="intro-heading">Request contact help</h2>
      <p className="lede">
        Request help contacting this manufacturer. The Line List reviews the request and follows up by email; we do not promise a direct relationship or a response.
      </p>
      <p>
        Bring written specs (ingredients by weight when you can), pack and label notes, an honest
        first-run volume, and process fit. Be ready to discuss an NDA before sharing the full
        recipe. We email the plant only after you ask.
      </p>
      <p className="honest">
        An intro is not a yes. Line time and real minimums stay with the plant.
      </p>
      <IntroForm
        manufacturerSlug={slug}
        manufacturerName={name}
        sourceUrl={`/copackers/${slug}`}
      />
      <p>
        <Link href="/find-manufacturers">Compare more manufacturers</Link>
      </p>
    </section>
  );
}
