export function NewsletterCta() {
  return (
    <aside className="nl" aria-label="The Line List weekly">
      <h2>Tuesday note — list not open yet</h2>
      <p>
        A Tuesday morning note (America/Chicago) for CPG founders and brand ops.
        Named plants, public facts, one process rule.
      </p>
      <label htmlFor="nl-email">Email</label>
      <div className="row">
        <input
          id="nl-email"
          type="email"
          name="email"
          placeholder="you@brand.com"
          autoComplete="email"
          disabled
        />
        <a className="btn" href="mailto:hello@thelinelist.com">
          hello@thelinelist.com
        </a>
      </div>
      <p className="note">
        Placeholder address. The field is visual only — there is no subscribe
        backend. Mail the address if you want the Tuesday issue when a list exists.
      </p>
    </aside>
  );
}
