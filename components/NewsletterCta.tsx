import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { EditorialImage } from "@/components/EditorialImage";
import { isNewsletterEnabled } from "@/lib/newsletter/config";

export function NewsletterCta() {
  if (!isNewsletterEnabled()) return null;

  return (
    <aside className="nl" id="newsletter" aria-label="The Line List newsletter">
      <EditorialImage
        src="/images/clay-v2/support/newsletter.webp"
        alt=""
        width={640}
        height={640}
        sizes="(max-width: 760px) 100vw, 240px"
        className="nl-visual"
      />
      <div className="nl-copy">
        <h2>Notes for your next plant conversation</h2>
        <p>
          Plain-language process explainers, preparation checklists, and newly reviewed listings.
          Food and beverage only.
        </p>
        <NewsletterForm />
      </div>
    </aside>
  );
}
