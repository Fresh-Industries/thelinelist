import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Copy,
  MagnifyingGlass,
  Package,
  PaperPlaneRight,
  X,
} from "@phosphor-icons/react";

const founderExample = "I want individually wrapped mini loaves sold at coffee shops.";

const manufacturers = [
  {
    id: "bramble",
    name: "Bramble Bakeworks",
    location: "Waco, Texas",
    reason: "Its reviewed capability information describes mini loaves and individually wrapped bakery products.",
    supported: ["Commercial bakery", "Mini loaves", "Horizontal flow wrap"],
    unknowns: ["First-run minimum", "Shelf-life validation"],
    concern: "Recipe-development support is not described.",
    evidence: "2 reviewed references",
    questions: ["Minimum run for this format", "Shelf-life validation", "Case-pack requirements"],
  },
  {
    id: "hearthline",
    name: "Hearthline Foods",
    location: "Tulsa, Oklahoma",
    reason: "Its reviewed services information describes flow-wrapped ambient baked snacks and recipe scale-up.",
    supported: ["Commercial bakery", "Flow-wrapped products", "Recipe scale-up"],
    unknowns: ["Exact 12 oz format", "Coffee-shop case packs"],
    concern: "The published minimum depends on format.",
    evidence: "2 reviewed references",
    questions: ["Minimum run for this format", "12 oz loaf experience", "Case-pack requirements"],
  },
  {
    id: "daymark",
    name: "Daymark Bakery Co.",
    location: "Fort Worth, Texas",
    reason: "Its reviewed equipment information lists horizontal flow wrapping for single-serve bakery products.",
    supported: ["Single-serve bakery", "Horizontal flow wrap", "Retail case packing"],
    unknowns: ["Shelf-life support", "Relevant certifications"],
    concern: "Relevant certifications were not found in the reviewed information.",
    evidence: "2 reviewed references",
    questions: ["Shelf-life validation", "Relevant facility certifications", "First-run minimum"],
  },
];

const formatOptions = {
  "mini-loaf": {
    label: "Mini loaf",
    briefLabel: "12 oz mini loaf",
    weight: "12 oz",
    compatiblePackages: ["flow-wrap", "bakery-bag"],
    defaultPackage: "flow-wrap",
  },
  slices: {
    label: "Two slices",
    briefLabel: "Two banana bread slices",
    weight: "Approx. 5 oz",
    compatiblePackages: ["tray"],
    defaultPackage: "tray",
  },
};

const packageOptions = {
  "flow-wrap": {
    label: "Flow wrap",
    briefLabel: "horizontal flow wrap",
    image: "/assets/flow-wrap-mini-loaf.png",
    consequence: "Usually the clearest direction for an individually sold loaf and may align with more commercial wrapping lines.",
  },
  tray: {
    label: "Tray",
    briefLabel: "film-sealed tray",
    image: "/assets/tray-film-mini-loaf.png",
    consequence: "Adds structure and protection, but introduces another packaging component and a different packing line.",
  },
  "bakery-bag": {
    label: "Bakery bag",
    briefLabel: "bakery bag",
    image: "/assets/bakery-bag-mini-loaf.png",
    consequence: "Feels more bakery-led and flexible, but may provide less protection and fewer shelf-life options than flow wrap.",
  },
};

const finishOptions = {
  "clear-film": { label: "Clear film", briefLabel: "clear film" },
  "printed-film": { label: "Printed film", briefLabel: "printed film" },
};

const initialPackaging = {
  format: "mini-loaf",
  package: "flow-wrap",
  finish: "clear-film",
  weight: "12 oz",
  dimensions: { length: "", width: "", height: "" },
};

function resolvePackaging(packaging) {
  const format = formatOptions[packaging.format];
  const pack = packageOptions[packaging.package];
  const finish = finishOptions[packaging.finish];
  const dimensionValues = Object.values(packaging.dimensions || {});
  const dimensions = dimensionValues.every(Boolean) ? dimensionValues.join(" × ") + " in" : "";

  return {
    ...packaging,
    formatLabel: format.briefLabel,
    packageLabel: pack.briefLabel,
    packageShortLabel: pack.label,
    finishLabel: finish.briefLabel,
    image: pack.image,
    consequence: pack.consequence,
    dimensions,
    summary: [format.briefLabel, pack.briefLabel, finish.briefLabel, dimensions].filter(Boolean).join(" · "),
  };
}

function createOutreachMessage(manufacturer, product) {
  const packaging = resolvePackaging(product.packaging);
  return `Hello ${manufacturer.name} team,\n\nI’m developing packaged banana bread for individual sale in coffee shops. Our working direction is a ${packaging.summary.toLowerCase()}, and we are considering a first run of ${product.volume.toLowerCase()}.\n\nShelf life is still open. I’d like to understand whether this may fit your facility and what you would need from us next.\n\nThank you,\nFounder`;
}

function approvalSignature(manufacturerId, message, product) {
  return JSON.stringify({ manufacturerId, message, packaging: product.packaging, volume: product.volume });
}

function IconButton({ label, children, onClick }) {
  return (
    <button className="icon-button" type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function ProductAnchor({ mode, onBack, onReset }) {
  return (
    <header className="product-anchor">
      <div className="anchor-product">
        {mode !== "document" ? (
          <IconButton label="Return to product brief" onClick={onBack}>
            <ArrowLeft aria-hidden="true" weight="bold" />
          </IconButton>
        ) : (
          <img src="/assets/line-list-mark.png" alt="" className="brand-mark" />
        )}
        <div>
          <strong>Packaged banana bread</strong>
          <span>Product brief</span>
        </div>
      </div>
      <button className="quiet-action" type="button" onClick={onReset}>
        <ArrowCounterClockwise aria-hidden="true" />
        Restart
      </button>
    </header>
  );
}

function Field({ label, value, fresh = false, muted = false, detail }) {
  return (
    <div className={`brief-field${fresh ? " field-fresh" : ""}${muted ? " field-muted" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

function BriefSection({ title, children, action, fresh = false }) {
  return (
    <section className={`brief-section${fresh ? " section-fresh" : ""}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AgentExchange({ phase, message, onDismiss }) {
  if (phase === "idle" || phase === "quiet") return null;
  const writing = phase === "responding";
  return (
    <aside className={`agent-exchange${phase === "settling" ? " is-settling" : ""}`} aria-live="polite">
      <button type="button" onClick={onDismiss} aria-label="Dismiss agent response"><X aria-hidden="true" /></button>
      <p className="founder-line">“{message}”</p>
      <p className="agent-line">
        {writing
          ? "I’m reading that as an individually sold mini loaf for coffee shops."
          : "I’ve treated this as an individually sold, grab-and-go mini loaf for coffee shops."}
      </p>
    </aside>
  );
}

function Composer({ value, setValue, onSubmit, busy, defined, prompt, actionLabel, onAction }) {
  return (
    <div className="agent-prompt">
      <div className="prompt-line">
        <div>
          <span>Product collaborator</span>
          <p>{prompt}</p>
        </div>
        {actionLabel ? <button className="text-action strong" type="button" onClick={onAction}>{actionLabel}</button> : null}
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <div className="composer-row">
          <textarea
            aria-label="Tell the product collaborator"
            rows="1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Tell me what you know, or ask what matters next…"
            disabled={busy}
          />
          <button className="send-button" type="submit" disabled={busy || !value.trim()} aria-label="Send to product collaborator">
            <PaperPlaneRight aria-hidden="true" weight="bold" />
          </button>
        </div>
        {!defined && !value ? (
          <button className="try-example" type="button" onClick={() => setValue(founderExample)}>
            Try “{founderExample}”
          </button>
        ) : null}
      </form>
    </div>
  );
}

function LivingDocument({ state, actions }) {
  const { product, input, agentPhase, founderMessage, recentlyChanged, matchesSeen, drafts, approvals } = state;
  const defined = Boolean(product.productFormat && product.salesFormat && product.targetChannel);
  const packaging = product.packaging ? resolvePackaging(product.packaging) : null;
  const contacts = manufacturers.filter((manufacturer) => product.contactIds.includes(manufacturer.id));
  const allApproved = contacts.length > 0 && contacts.every((manufacturer) => {
    const message = drafts[manufacturer.id] || createOutreachMessage(manufacturer, product);
    return approvals[manufacturer.id] === approvalSignature(manufacturer.id, message, product);
  });
  const status = allApproved
    ? "Ready for manufacturer conversation"
    : packaging
      ? "Ready for manufacturer matching"
      : "Product brief";
  const openQuestions = [...new Set(contacts.flatMap((manufacturer) => manufacturer.questions))];
  const firstPendingContact = contacts.find((manufacturer) => {
    const message = drafts[manufacturer.id] || createOutreachMessage(manufacturer, product);
    return approvals[manufacturer.id] !== approvalSignature(manufacturer.id, message, product);
  });
  const collaboratorNext = !defined
    ? { prompt: "Let’s make this concrete. How do you picture someone buying it?" }
    : !packaging
      ? { prompt: "Packaging is the next useful decision. We can compare a couple of directions.", label: "Explore packaging", action: actions.openPackaging }
      : !product.volume
        ? { prompt: "About how much would you like to make first? A range is enough for now." }
        : !contacts.length
          ? { prompt: "This is detailed enough for an initial manufacturer search, even with shelf life still open.", label: "Review possibilities", action: actions.openMatching }
          : !allApproved
            ? { prompt: "The next useful step is reviewing each recipient’s introduction before anything leaves this document.", label: "Review next draft", action: () => actions.openOutreach(firstPendingContact.id) }
            : { prompt: "Your brief and recipient-specific introductions are ready for a manufacturer conversation." };

  return (
    <main className="document-stage">
      <article className="living-document">
        <p className="document-kicker">{status}</p>
        <h1>Packaged banana bread</h1>
        <p className="founder-origin">“I want to make packaged banana bread.”</p>

        <BriefSection title="Product">
          <dl className="field-grid">
            <Field label="Product format" value={packaging ? formatOptions[packaging.format].label : product.productFormat || "Not decided yet"} fresh={recentlyChanged.includes("format")} />
            {product.salesFormat ? <Field label="Sales format" value={product.salesFormat} fresh={recentlyChanged.includes("sales")} /> : null}
            {product.targetChannel ? <Field label="Target channel" value={product.targetChannel} fresh={recentlyChanged.includes("channel")} /> : null}
          </dl>
          <AgentExchange phase={agentPhase} message={founderMessage} onDismiss={actions.dismissAgent} />
          {agentPhase === "quiet" && founderMessage ? (
            <button className="change-marker" type="button" onClick={actions.showLastAgentChange}>Last agent change · 3 product details</button>
          ) : null}
        </BriefSection>

        <BriefSection
          title="Packaging"
          fresh={recentlyChanged.includes("packaging")}
          action={defined ? (
            <button className="section-action" type="button" onClick={actions.openPackaging}>
              <Package aria-hidden="true" />
              {packaging ? "Revisit packaging" : "Explore packaging"}
            </button>
          ) : null}
        >
          {packaging ? (
            <div className="package-writeback">
              <img src={packaging.image} alt={`${packaging.formatLabel} in ${packaging.packageLabel}`} />
              <div>
                <p>{packaging.summary}</p>
                {!packaging.dimensions ? <span>Dimensions still needed</span> : null}
              </div>
            </div>
          ) : <p className="open-value">Not decided yet</p>}
        </BriefSection>

        <div className="quiet-pair">
          <BriefSection title="Shelf life"><p className="open-value">Not known yet</p></BriefSection>
          <BriefSection title="Production">
            {product.volume ? (
              <p className="document-value">{product.volume}</p>
            ) : packaging ? (
              <div className="quiet-choice">
                <p>About how much would you like to make first?</p>
                <div className="choice-row">
                  <button type="button" onClick={() => actions.setVolume("1,000–5,000 units")}>1,000–5,000</button>
                  <button type="button" onClick={() => actions.setVolume("5,000–10,000 units")}>5,000–10,000</button>
                  <button type="button" onClick={() => actions.setVolume("Not known yet")}>Not sure yet</button>
                </div>
              </div>
            ) : <p className="open-value">Not decided yet</p>}
          </BriefSection>
        </div>

        {packaging ? (
          <BriefSection
            title="Manufacturing"
            action={(
              <button className="section-action" type="button" onClick={actions.openMatching}>
                <MagnifyingGlass aria-hidden="true" />
                {matchesSeen ? "Review possibilities" : "Review possible manufacturers"}
              </button>
            )}
          >
            {contacts.length ? (
              <div className="contact-set">
                {contacts.map((manufacturer) => (
                  <div className="contact-line" key={manufacturer.id}>
                    <div><strong>{manufacturer.name}</strong><span>Possible fit</span></div>
                    <p>{manufacturer.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="matching-continuation">
                <p>Your brief is detailed enough to begin looking.</p>
                <span>{product.volume ? "Shelf life would make the search more specific." : "Shelf life and first production quantity would make the search more specific."}</span>
              </div>
            )}
          </BriefSection>
        ) : null}

        {contacts.length ? (
          <BriefSection title="Open questions">
            <ul className="open-question-list">{openQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
          </BriefSection>
        ) : null}

        {contacts.length && product.volume ? (
          <BriefSection title="Introduction">
            <div className="introduction-list">
              {contacts.map((manufacturer) => {
                const message = drafts[manufacturer.id] || createOutreachMessage(manufacturer, product);
                const approved = approvals[manufacturer.id] === approvalSignature(manufacturer.id, message, product);
                return (
                  <div className="introduction-line" key={manufacturer.id}>
                    <div><strong>{manufacturer.name}</strong><span>{approved ? "Ready to copy" : "Ready for review"}</span></div>
                    <button className="text-action strong" type="button" onClick={() => actions.openOutreach(manufacturer.id)}>{approved ? "Review" : "Prepare introduction"}</button>
                  </div>
                );
              })}
            </div>
          </BriefSection>
        ) : null}

        <Composer
          value={input}
          setValue={actions.setInput}
          onSubmit={actions.submitFounderMessage}
          busy={agentPhase === "responding" || agentPhase === "writing"}
          defined={defined}
          prompt={collaboratorNext.prompt}
          actionLabel={collaboratorNext.label}
          onAction={collaboratorNext.action}
        />
      </article>
    </main>
  );
}

function WorkbenchShell({ title, context, onClose, children, footer }) {
  return (
    <main className="workbench-shell">
      <div className="workbench-heading">
        <div>{context ? <p>{context}</p> : null}<h1>{title}</h1></div>
        <button className="quiet-action" type="button" onClick={onClose}><X aria-hidden="true" /> Close</button>
      </div>
      {children}
      {footer ? <div className="workbench-footer">{footer}</div> : null}
    </main>
  );
}

function SegmentedChoices({ label, value, options, onChange }) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      {options.map((option) => (
        <button key={option.value} className={value === option.value ? "selected" : ""} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          <span>{option.label}</span>{value === option.value ? <Check aria-hidden="true" weight="bold" /> : null}
        </button>
      ))}
    </fieldset>
  );
}

function PackageFigure({ packaging, label, zoom = 1, compact = false }) {
  const resolved = resolvePackaging(packaging);
  return (
    <figure className={`package-figure${compact ? " is-compact" : ""}`}>
      <div className="package-image-frame">
        <img className="package-image" src={resolved.image} alt={`${resolved.summary} packaging study`} style={{ transform: `scale(${zoom})` }} />
        {resolved.finish === "printed-film" ? <img className="printed-mark" src="/assets/line-list-mark.png" alt="Printed artwork placement" /> : null}
      </div>
      <figcaption><span>{label}</span><strong>{resolved.packageShortLabel}</strong><small>{resolved.finishLabel}</small></figcaption>
    </figure>
  );
}

function PackagingWorkbench({ canonicalPackaging, onClose, onConfirm }) {
  const [working, setWorking] = useState(canonicalPackaging || initialPackaging);
  const [zoom, setZoom] = useState(1);
  const [comparing, setComparing] = useState(false);
  const resolved = resolvePackaging(working);
  const compatiblePackages = formatOptions[working.format].compatiblePackages;
  const alternativePackage = compatiblePackages.find((packageType) => packageType !== working.package);
  const alternative = alternativePackage ? { ...working, package: alternativePackage } : null;

  function updateFormat(format) {
    const nextFormat = formatOptions[format];
    setWorking((current) => ({
      ...current,
      format,
      weight: nextFormat.weight,
      package: nextFormat.compatiblePackages.includes(current.package) ? current.package : nextFormat.defaultPackage,
    }));
    setComparing(false);
  }

  function updateDimension(key, value) {
    setWorking((current) => ({ ...current, dimensions: { ...current.dimensions, [key]: value } }));
  }

  return (
    <WorkbenchShell
      context="Packaging"
      title="How should this product be packaged?"
      onClose={onClose}
      footer={(
        <>
          <div><strong>{resolved.summary}</strong>{!resolved.dimensions ? <span>Dimensions still needed</span> : null}</div>
          <button className="primary-action" type="button" onClick={() => onConfirm(working)}>Use this package <ArrowRight aria-hidden="true" weight="bold" /></button>
        </>
      )}
    >
      <div className="packaging-layout">
        <aside className="tool-controls">
          <SegmentedChoices label="Product" value={working.format} options={Object.entries(formatOptions).map(([value, option]) => ({ value, label: option.label }))} onChange={updateFormat} />
          <SegmentedChoices label="Package" value={working.package} options={compatiblePackages.map((value) => ({ value, label: packageOptions[value].label }))} onChange={(value) => { setWorking((current) => ({ ...current, package: value })); setComparing(false); }} />
          <SegmentedChoices label="Finish" value={working.finish} options={Object.entries(finishOptions).map(([value, option]) => ({ value, label: option.label }))} onChange={(value) => setWorking((current) => ({ ...current, finish: value }))} />
          <div className="dimension-controls">
            <span>Dimensions, if known</span>
            <div>{["length", "width", "height"].map((key) => <label key={key}>{key[0].toUpperCase()}<input inputMode="decimal" aria-label={`${key} in inches`} value={working.dimensions[key]} onChange={(event) => updateDimension(key, event.target.value)} placeholder="—" /></label>)}</div>
            <small>inches</small>
          </div>
        </aside>
        <section className="package-canvas" aria-live="polite">
          <div className={`package-view${comparing ? " is-comparing" : ""}`}>
            <PackageFigure packaging={working} label={comparing ? "Current" : "Working direction"} zoom={zoom} />
            {comparing && alternative ? <PackageFigure packaging={alternative} label="Alternative" zoom={0.92} compact /> : null}
          </div>
          <div className="package-tools">
            <label>Zoom<input type="range" min="0.8" max="1.35" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
            {alternative ? <button className="text-action strong" type="button" onClick={() => setComparing((value) => !value)}>{comparing ? "Close comparison" : `Compare with ${resolvePackaging(alternative).packageShortLabel.toLowerCase()}`}</button> : null}
            {comparing && alternative ? <button className="text-action" type="button" onClick={() => { setWorking(alternative); setComparing(false); }}>Use {resolvePackaging(alternative).packageShortLabel.toLowerCase()}</button> : null}
          </div>
          <aside className="tradeoff-note">
            <div><span>Product collaborator</span><p>{resolved.consequence}</p><details><summary>Why?</summary><p>Package format changes the equipment, materials, protection, case packing, and manufacturers that may be relevant.</p></details></div>
          </aside>
        </section>
      </div>
    </WorkbenchShell>
  );
}

function ManufacturerRow({ manufacturer, selected, onToggle }) {
  return (
    <article className={`match-row${selected ? " is-selected" : ""}`}>
      <div className="match-heading">
        <div><h2>{manufacturer.name}</h2><p>{manufacturer.location}</p></div>
        <button className="select-control" type="button" aria-pressed={selected} onClick={onToggle}>{selected ? <Check aria-hidden="true" weight="bold" /> : null}{selected ? "Selected" : "Select"}</button>
      </div>
      <p className="fit-reason"><strong>Why it may fit</strong>{manufacturer.reason}</p>
      <div className="evidence-columns">
        <div><h3>Supported by reviewed information</h3><ul>{manufacturer.supported.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>Still unknown</h3><ul>{manufacturer.unknowns.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <details><summary>Evidence and useful questions</summary><p>{manufacturer.evidence}</p><ul>{manufacturer.questions.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </article>
  );
}

function MatchingWorkbench({ product, shortlist, toggleShortlist, onClose, onCompare }) {
  const packaging = resolvePackaging(product.packaging);
  return (
    <WorkbenchShell
      context="Manufacturing"
      title="Which manufacturers are worth a conversation?"
      onClose={onClose}
      footer={(
        <>
          <div><strong>{shortlist.length ? `${shortlist.length} selected` : "Select manufacturers to compare"}</strong><span>Choose up to three; each introduction is reviewed separately.</span></div>
          <button className="primary-action" type="button" disabled={!shortlist.length} onClick={onCompare}>Compare selected <ArrowRight aria-hidden="true" weight="bold" /></button>
        </>
      )}
    >
      <div className="matching-intro"><p>These possibilities come from your {packaging.summary} direction.</p><span>{product.volume ? "Shelf life would make the search more specific, but it is not being treated as a mismatch." : "Shelf life and first-run quantity would make the search more specific, but neither is being treated as a mismatch."}</span></div>
      <div className="match-list">{manufacturers.map((manufacturer) => <ManufacturerRow key={manufacturer.id} manufacturer={manufacturer} selected={shortlist.includes(manufacturer.id)} onToggle={() => toggleShortlist(manufacturer.id)} />)}</div>
    </WorkbenchShell>
  );
}

function ComparisonWorkbench({ shortlist, onClose, onUseContactSet }) {
  const selected = manufacturers.filter((manufacturer) => shortlist.includes(manufacturer.id));
  return (
    <WorkbenchShell
      context="Manufacturing"
      title="Compare the open questions"
      onClose={onClose}
      footer={(
        <>
          <div><strong>{selected.length} manufacturer{selected.length === 1 ? "" : "s"}</strong><span>No capability is treated as confirmed until the manufacturer responds.</span></div>
          <button className="primary-action" type="button" onClick={() => onUseContactSet(selected.map((manufacturer) => manufacturer.id))}>Use this contact set <ArrowRight aria-hidden="true" weight="bold" /></button>
        </>
      )}
    >
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <caption className="visually-hidden">Manufacturer comparison</caption>
          <thead><tr><th>Manufacturer</th><th>Supported</th><th>Unknown</th><th>Concern</th></tr></thead>
          <tbody>{selected.map((manufacturer) => (
            <tr key={manufacturer.id}>
              <th scope="row"><strong>{manufacturer.name}</strong><span>{manufacturer.location}</span></th>
              <td>{manufacturer.supported.join(" · ")}</td>
              <td>{manufacturer.unknowns.join(" · ")}</td>
              <td>{manufacturer.concern}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </WorkbenchShell>
  );
}

function OutreachWorkbench({ manufacturer, product, storedMessage, approvedSignature, onClose, onChangeMessage, onApprove }) {
  const defaultMessage = useMemo(() => createOutreachMessage(manufacturer, product), [manufacturer, product]);
  const [message, setMessage] = useState(storedMessage || defaultMessage);
  const [reviewed, setReviewed] = useState(false);
  const [copied, setCopied] = useState(false);
  const packaging = resolvePackaging(product.packaging);
  const signature = approvalSignature(manufacturer.id, message, product);
  const approved = approvedSignature === signature;

  function updateMessage(value) {
    setMessage(value);
    onChangeMessage(value);
    setReviewed(false);
  }

  async function copyDraft() {
    try { await navigator.clipboard.writeText(message); } catch { /* Clipboard support varies by local browser. */ }
    setCopied(true);
  }

  return (
    <WorkbenchShell context="Introduction" title={`Review the draft for ${manufacturer.name}`} onClose={onClose}>
      <div className="outreach-layout">
        <section className="message-proof">
          <div className="proof-heading"><span>To</span><strong>{manufacturer.name}</strong></div>
          <label htmlFor="introduction-message">Message</label>
          <textarea id="introduction-message" value={message} onChange={(event) => updateMessage(event.target.value)} rows="13" />
        </section>
        <aside className="packet-proof">
          <p>Included from the product brief</p>
          <h2>Packaged banana bread</h2>
          <dl>
            <Field label="Product" value={`${packaging.formatLabel}, sold individually for coffee shops`} />
            <Field label="Packaging" value={packaging.summary} />
            <Field label="First production amount" value={product.volume} />
            <Field label="Shelf life" value="Not known yet" muted />
          </dl>
          <small>Private notes, comparisons, and other manufacturers are not included.</small>
        </aside>
      </div>
      {!approved ? (
        <div className="approval-gate">
          <label><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /><span>I reviewed this recipient, message, and brief.</span></label>
          <button className="primary-action" type="button" disabled={!reviewed} onClick={() => onApprove(signature)}><CheckCircle aria-hidden="true" weight="bold" /> Approve this draft</button>
          <p>Nothing is sent. Editing the message or product brief requires another review.</p>
        </div>
      ) : (
        <div className="approved-panel">
          <div><strong>Approved for this recipient</strong><p>Nothing has been sent.</p></div>
          <button className="primary-action" type="button" onClick={copyDraft}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy introduction"}</button>
        </div>
      )}
    </WorkbenchShell>
  );
}

const initialProduct = {
  productFormat: "",
  salesFormat: "",
  targetChannel: "",
  packaging: null,
  volume: "",
  contactIds: [],
};

export function App() {
  const [mode, setMode] = useState("document");
  const [product, setProduct] = useState(initialProduct);
  const [input, setInput] = useState("");
  const [founderMessage, setFounderMessage] = useState("");
  const [agentPhase, setAgentPhase] = useState("idle");
  const [recentlyChanged, setRecentlyChanged] = useState([]);
  const [matchesSeen, setMatchesSeen] = useState(false);
  const [shortlist, setShortlist] = useState([]);
  const [activeOutreachId, setActiveOutreachId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [approvals, setApprovals] = useState({});
  const timersRef = useRef([]);

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  useEffect(() => clearTimers, []);

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function submitFounderMessage(event) {
    event.preventDefault();
    if (!input.trim() || agentPhase === "responding" || agentPhase === "writing") return;
    clearTimers();
    setFounderMessage(input.trim());
    setInput("");
    setAgentPhase("responding");
    setRecentlyChanged([]);
    schedule(() => {
      setAgentPhase("writing");
      setProduct((current) => ({ ...current, productFormat: "Mini loaf" }));
      setRecentlyChanged(["format"]);
    }, 520);
    schedule(() => {
      setProduct((current) => ({ ...current, salesFormat: "Individual / grab-and-go" }));
      setRecentlyChanged(["format", "sales"]);
    }, 900);
    schedule(() => {
      setProduct((current) => ({ ...current, targetChannel: "Coffee shops" }));
      setRecentlyChanged(["format", "sales", "channel"]);
      setAgentPhase("settling");
    }, 1280);
    schedule(() => setRecentlyChanged([]), 2500);
    schedule(() => setAgentPhase("quiet"), 3300);
  }

  function resetPrototype() {
    clearTimers();
    setMode("document");
    setProduct(initialProduct);
    setInput("");
    setFounderMessage("");
    setAgentPhase("idle");
    setRecentlyChanged([]);
    setMatchesSeen(false);
    setShortlist([]);
    setActiveOutreachId(null);
    setDrafts({});
    setApprovals({});
  }

  function toggleShortlist(id) {
    setShortlist((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 3 ? [...current, id] : current);
  }

  function invalidateApprovalsAndSetProduct(update) {
    setProduct((current) => typeof update === "function" ? update(current) : { ...current, ...update });
    setApprovals({});
  }

  const activeManufacturer = manufacturers.find((manufacturer) => manufacturer.id === activeOutreachId);
  const state = { product, input, agentPhase, founderMessage, recentlyChanged, matchesSeen, drafts, approvals };
  const actions = {
    setInput,
    submitFounderMessage,
    dismissAgent: () => setAgentPhase("quiet"),
    showLastAgentChange: () => setAgentPhase("settling"),
    openPackaging: () => setMode("packaging"),
    openMatching: () => { setMatchesSeen(true); setMode("matching"); },
    setVolume: (volume) => invalidateApprovalsAndSetProduct({ volume }),
    openOutreach: (id) => { setActiveOutreachId(id); setMode("outreach"); },
  };

  return (
    <div className="prototype-app">
      <ProductAnchor mode={mode} onBack={() => setMode("document")} onReset={resetPrototype} />
      {mode === "document" ? <LivingDocument state={state} actions={actions} /> : null}
      {mode === "packaging" ? (
        <PackagingWorkbench
          canonicalPackaging={product.packaging}
          onClose={() => setMode("document")}
          onConfirm={(packaging) => {
            invalidateApprovalsAndSetProduct((current) => ({ ...current, packaging }));
            setRecentlyChanged(["packaging"]);
            schedule(() => setRecentlyChanged([]), 1700);
            setMode("document");
          }}
        />
      ) : null}
      {mode === "matching" ? <MatchingWorkbench product={product} shortlist={shortlist} toggleShortlist={toggleShortlist} onClose={() => setMode("document")} onCompare={() => setMode("comparison")} /> : null}
      {mode === "comparison" ? <ComparisonWorkbench shortlist={shortlist} onClose={() => setMode("document")} onUseContactSet={(contactIds) => { setProduct((current) => ({ ...current, contactIds })); setMode("document"); }} /> : null}
      {mode === "outreach" && activeManufacturer ? (
        <OutreachWorkbench
          manufacturer={activeManufacturer}
          product={product}
          storedMessage={drafts[activeManufacturer.id]}
          approvedSignature={approvals[activeManufacturer.id]}
          onClose={() => setMode("document")}
          onChangeMessage={(message) => { setDrafts((current) => ({ ...current, [activeManufacturer.id]: message })); setApprovals((current) => ({ ...current, [activeManufacturer.id]: undefined })); }}
          onApprove={(signature) => setApprovals((current) => ({ ...current, [activeManufacturer.id]: signature }))}
        />
      ) : null}
      <div className="prototype-note">Prototype data · no external sending</div>
    </div>
  );
}
