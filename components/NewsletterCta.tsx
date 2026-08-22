import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { EditorialImage } from "@/components/EditorialImage";
import { isNewsletterEnabled } from "@/lib/newsletter/config";

export function NewsletterCta() {
  if (!isNewsletterEnabled()) return null;

  return (
    <aside className="nl" id="newsletter" aria-label="The Line List weekly">
      <EditorialImage
        src="/images/newsletter-weekly.svg"
        alt="Decorative editorial illustration of a weekly note and bottles. Not a photograph of a named plant."
        width={160}
        height={160}
        sizes="160px"
        className="nl-visual"
      />
      <div className="nl-copy">
        <h2>The Line List weekly</h2>
        <p>
          A short Tuesday note (America/Chicago) for CPG founders and brand ops. Named plants,
          public facts, one process rule.
        </p>
        <NewsletterForm />
      </div>
    </aside>
  );
}
