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
        <h2>New manufacturers and practical sourcing notes</h2>
        <p>
          Get newly reviewed manufacturers, practical launch guides, and sourcing tips for food and beverage products.
        </p>
        <NewsletterForm />
      </div>
    </aside>
  );
}
