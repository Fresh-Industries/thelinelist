import Link from "next/link";

export function ManufacturerExamples() {
  return <section id="examples" className="manufacturer-examples" aria-labelledby="example-heading">
    <h2 id="example-heading">See the advice in practice</h2>
    <p><strong>Fictional examples for learning.</strong> These describe no real founder, manufacturer, quote, or approved production specification. Use your own facts in your plan.</p>
    <h3>A useful early product brief</h3>
    <dl className="example-brief">
      <div><dt>Product</dt><dd>A smooth roasted-pepper hot sauce for local specialty shops.</dd><small>Names the product and intended first channel.</small></div>
      <div><dt>Recipe stage</dt><dd>Home recipe. Needs commercial development and a qualified process review.</dd><small>States the help needed without claiming it is ready for production.</small></div>
      <div><dt>Packaging direction</dt><dd>A small glass bottle is preferred; size, closure, and line compatibility remain open.</dd><small>A preference that can still change after technical review.</small></div>
      <div><dt>Storage goal</dt><dd>Room-temperature sale is the goal. Process classification and shelf life are not validated.</dd><small>A goal is separate from a product-safety claim.</small></div>
      <div><dt>First-run planning amount</dt><dd>Exploring 1,000 finished bottles of one flavor, subject to the manufacturer’s actual minimum.</dd><small>A fictional planning amount with units, not a recommended or available minimum.</small></div>
      <div><dt>Useful next question</dt><dd>Do you offer development and trial support for this type of sauce?</dd><small>Gives the recipient a specific fit question to answer.</small></div>
    </dl>
    <h3>A first email with enough context</h3>
    <div className="example-email"><p><strong>Subject:</strong> Hot sauce development and first-run fit inquiry</p><p>Hello [manufacturer team],</p><p>I’m developing a smooth roasted-pepper hot sauce for local specialty shops. I have a home recipe and need help with commercial development and process review.</p><p>I’m considering a small glass bottle and exploring a first run of 1,000 finished bottles of one flavor. Both are flexible. Room-temperature sale is a goal; the process and shelf life still need validation.</p><p>Does this fit your services? If so, what would you need next to discuss development, a trial, and your current minimum for this product and package?</p><p>Thank you,<br />[Your name and reply details]</p></div>
    <p className="meta">Add a reason for choosing a real recipient only after checking that manufacturer’s published information. Review sharing separately for each recipient.</p>
    <h3>Two quote lines that need different follow-up</h3>
    <div className="example-quote-table"><table><caption>Fictional quote comparison — values are teaching examples, not market prices</caption><thead><tr><th scope="col">Quote</th><th scope="col">What it says</th><th scope="col">What to clarify</th></tr></thead><tbody><tr><th scope="row">A</th><td>$0.60 per finished bottle for filling only.</td><td>Who supplies ingredients, bottles, closures, and labels? What are the separate setup, storage, and freight charges?</td></tr><tr><th scope="row">B</th><td>$1.90 per finished bottle, including ingredients, bottle, and filling.</td><td>Are closure, label, case packing, testing, setup, storage, and freight included? Is the quantity and package the same as A?</td></tr></tbody></table></div>
    <p>You cannot identify the cheaper complete run from these lines. Put only separate charges into the worksheet; use zero and a note where a cost is already included elsewhere. Leave missing charges blank.</p>
    <p><Link href="/guides/first-run-costs">Compare your own first-run costs <span aria-hidden="true">→</span></Link></p>
  </section>;
}
