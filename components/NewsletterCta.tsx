export function NewsletterCta() {
  return (
    <aside className="nl" id="newsletter" aria-label="The Line List weekly">
      <div className="nl-icon" aria-hidden="true">
        ✉
      </div>
      <div className="nl-copy">
        <h2>The Line List Weekly</h2>
        <p>
          A Tuesday morning note (America/Chicago) for first-time CPG founders.
          Named plants, public facts, one process rule. The list is not open yet.
        </p>
        <label htmlFor="nl-email">Email</label>
        <div className="row">
          <input
            id="nl-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            disabled
          />
          <a className="btn btn-gold" href="mailto:hello@thelinelist.com">
            Join Free
          </a>
        </div>
        <p className="note">
          Visual only — there is no subscribe backend. Write{" "}
          <a href="mailto:hello@thelinelist.com">hello@thelinelist.com</a> if you
          want the Tuesday issue when a list exists.
        </p>
      </div>
    </aside>
  );
}
