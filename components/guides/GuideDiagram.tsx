import type { CornerstoneGuide } from "@/lib/guides/cornerstones";

const HOT_SAUCE_STEPS = [
  ["Choose your", "route"],
  ["Write the", "product brief"],
  ["Get safety", "review"],
  ["Confirm bottle", "+ process"],
  ["Run a trial"],
  ["Choose a", "manufacturer"],
] as const;

const FIRST_RUN_STEPS = ["Product brief", "Specifications", "Trial", "Approval", "Production", "Storage + freight"] as const;

function HotSauceDiagram() {
  return (
    <figure className="guide-diagram">
      <figcaption>The beginner path from sauce idea to manufacturer</figcaption>
      <svg className="guide-diagram-svg guide-diagram-svg-hot-sauce" viewBox="0 0 940 235" role="img" aria-labelledby="hot-sauce-title hot-sauce-desc">
        <title id="hot-sauce-title">Six steps to prepare a hot sauce brand for manufacturing</title>
        <desc id="hot-sauce-desc">Choose private label or your own recipe, write a clear product brief, get a qualified food-safety review, confirm the bottle and process together, run a trial, and choose a fitting manufacturer.</desc>
        <defs><marker id="hot-sauce-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" className="diagram-arrowhead" /></marker></defs>
        {HOT_SAUCE_STEPS.map((lines, index) => {
          const x = 18 + index * 154;
          return (
            <g key={lines.join(" ")}>
              <circle className="diagram-step-number" cx={x + 66} cy="48" r="22" />
              <text className="diagram-number" x={x + 66} y="55" textAnchor="middle">{index + 1}</text>
              <rect className={index === 2 ? "diagram-node diagram-node-accent" : "diagram-node"} x={x} y="88" width="132" height="94" rx="18" />
              <text className={index === 2 ? "diagram-label diagram-label-light" : "diagram-label"} x={x + 66} y={lines.length > 1 ? "124" : "136"} textAnchor="middle">
                {lines.map((line, lineIndex) => <tspan key={line} x={x + 66} dy={lineIndex === 0 ? 0 : 21}>{line}</tspan>)}
              </text>
              {index < HOT_SAUCE_STEPS.length - 1 ? <path className="diagram-line" d={`M${x + 132} 135 H${x + 150}`} markerEnd="url(#hot-sauce-arrow)" /> : null}
            </g>
          );
        })}
        <text className="diagram-note" x="480" y="220" textAnchor="middle">The qualified expert and manufacturer set the exact process. This is a planning map, not a recipe.</text>
      </svg>
    </figure>
  );
}

function FormulaDiagram() {
  return (
    <figure className="guide-diagram">
      <figcaption>Two accurate ways to start</figcaption>
      <svg className="guide-diagram-svg" viewBox="0 0 760 340" role="img" aria-labelledby="formula-title formula-desc">
        <title id="formula-title">Private-label and custom-formula paths</title>
        <desc id="formula-desc">Private label starts with a manufacturer base before brand and package decisions. A custom product starts with a written formula before trials and process review.</desc>
        <defs><marker id="formula-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" className="diagram-arrowhead" /></marker></defs>
        <rect className="diagram-node diagram-node-accent" x="55" y="20" width="270" height="62" rx="18" />
        <text className="diagram-label diagram-label-light" x="190" y="57" textAnchor="middle">Private label</text>
        <path className="diagram-line" d="M190 82 V128" markerEnd="url(#formula-arrow)" />
        <rect className="diagram-node" x="55" y="132" width="270" height="62" rx="18" />
        <text className="diagram-label" x="190" y="157" textAnchor="middle">Manufacturer&apos;s existing base</text>
        <text className="diagram-note" x="190" y="178" textAnchor="middle">Confirm terms and allowed changes</text>
        <path className="diagram-line" d="M190 194 V240" markerEnd="url(#formula-arrow)" />
        <rect className="diagram-node" x="55" y="244" width="270" height="70" rx="18" />
        <text className="diagram-label" x="190" y="273" textAnchor="middle">Brand + compatible package</text>
        <text className="diagram-note" x="190" y="294" textAnchor="middle">Then confirm the run minimum</text>

        <rect className="diagram-node diagram-node-accent" x="435" y="20" width="270" height="62" rx="18" />
        <text className="diagram-label diagram-label-light" x="570" y="57" textAnchor="middle">Custom formula</text>
        <path className="diagram-line" d="M570 82 V128" markerEnd="url(#formula-arrow)" />
        <rect className="diagram-node" x="435" y="132" width="270" height="62" rx="18" />
        <text className="diagram-label" x="570" y="157" textAnchor="middle">Written product specification</text>
        <text className="diagram-note" x="570" y="178" textAnchor="middle">Formula, package, storage goal</text>
        <path className="diagram-line" d="M570 194 V240" markerEnd="url(#formula-arrow)" />
        <rect className="diagram-node" x="435" y="244" width="270" height="70" rx="18" />
        <text className="diagram-label" x="570" y="273" textAnchor="middle">Trials + process review</text>
        <text className="diagram-note" x="570" y="294" textAnchor="middle">Approve before production</text>
      </svg>
    </figure>
  );
}

function PackageDiagram() {
  return (
    <figure className="guide-diagram">
      <figcaption>The package determines required line equipment</figcaption>
      <svg className="guide-diagram-svg" viewBox="0 0 760 315" role="img" aria-labelledby="package-title package-desc">
        <title id="package-title">Bottle, can, and pouch line requirements</title>
        <desc id="package-desc">A product specification branches to bottle filling and closing, can filling and seaming, or pouch filling and sealing. Carbonated products also require carbonation-capable equipment.</desc>
        <defs><marker id="package-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" className="diagram-arrowhead" /></marker></defs>
        <rect className="diagram-node diagram-node-accent" x="250" y="18" width="260" height="62" rx="18" />
        <text className="diagram-label diagram-label-light" x="380" y="45" textAnchor="middle">Product specification</text>
        <text className="diagram-note diagram-note-light" x="380" y="66" textAnchor="middle">Formula · storage · carbonation</text>
        <path className="diagram-line" d="M380 80 V116 H126 V148 M380 116 V148 M380 116 H634 V148" markerEnd="url(#package-arrow)" />
        <rect className="diagram-node" x="30" y="152" width="192" height="128" rx="18" />
        <text className="diagram-label" x="126" y="184" textAnchor="middle">Bottle</text>
        <text className="diagram-note" x="126" y="210" textAnchor="middle">Compatible filler</text>
        <text className="diagram-note" x="126" y="232" textAnchor="middle">Capper + closure</text>
        <text className="diagram-note" x="126" y="254" textAnchor="middle">Process-tolerant pack</text>
        <rect className="diagram-node" x="284" y="152" width="192" height="128" rx="18" />
        <text className="diagram-label" x="380" y="184" textAnchor="middle">Can</text>
        <text className="diagram-note" x="380" y="210" textAnchor="middle">Compatible filler</text>
        <text className="diagram-note" x="380" y="232" textAnchor="middle">Seamer + end</text>
        <text className="diagram-note" x="380" y="254" textAnchor="middle">Carbonation when needed</text>
        <rect className="diagram-node" x="538" y="152" width="192" height="128" rx="18" />
        <text className="diagram-label" x="634" y="184" textAnchor="middle">Pouch</text>
        <text className="diagram-note" x="634" y="210" textAnchor="middle">Pouch filler</text>
        <text className="diagram-note" x="634" y="232" textAnchor="middle">Film + seal fit</text>
        <text className="diagram-note" x="634" y="254" textAnchor="middle">Process-tolerant pack</text>
      </svg>
    </figure>
  );
}

function StorageDiagram() {
  return (
    <figure className="guide-diagram">
      <figcaption>Storage follows the validated product and process</figcaption>
      <svg className="guide-diagram-svg" viewBox="0 0 760 340" role="img" aria-labelledby="storage-title storage-desc">
        <title id="storage-title">Refrigerated and shelf-stable product paths</title>
        <desc id="storage-desc">After product-specific process validation and package confirmation, a refrigerated product requires cold storage and cold freight. A shelf-stable product uses ambient storage only when the validated process and package support it.</desc>
        <defs><marker id="storage-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" className="diagram-arrowhead" /></marker></defs>
        <rect className="diagram-node diagram-node-accent" x="230" y="18" width="300" height="70" rx="18" />
        <text className="diagram-label diagram-label-light" x="380" y="46" textAnchor="middle">Product-specific validation</text>
        <text className="diagram-note diagram-note-light" x="380" y="68" textAnchor="middle">Process + package + shelf-life target</text>
        <path className="diagram-line" d="M380 88 V126 H190 V154 M380 126 H570 V154" markerEnd="url(#storage-arrow)" />
        <rect className="diagram-node" x="55" y="158" width="270" height="64" rx="18" />
        <text className="diagram-label" x="190" y="196" textAnchor="middle">Refrigerated product</text>
        <path className="diagram-line" d="M190 222 V252" markerEnd="url(#storage-arrow)" />
        <rect className="diagram-node" x="55" y="256" width="270" height="58" rx="18" />
        <text className="diagram-note" x="190" y="281" textAnchor="middle">Cold storage</text>
        <text className="diagram-note" x="190" y="301" textAnchor="middle">+ temperature-controlled freight</text>
        <rect className="diagram-node" x="435" y="158" width="270" height="64" rx="18" />
        <text className="diagram-label" x="570" y="196" textAnchor="middle">Shelf-stable product</text>
        <path className="diagram-line" d="M570 222 V252" markerEnd="url(#storage-arrow)" />
        <rect className="diagram-node" x="435" y="256" width="270" height="58" rx="18" />
        <text className="diagram-note" x="570" y="281" textAnchor="middle">Ambient storage only after</text>
        <text className="diagram-note" x="570" y="301" textAnchor="middle">validated process + pack approval</text>
      </svg>
    </figure>
  );
}

function FirstRunDiagram() {
  return (
    <figure className="guide-diagram">
      <figcaption>Required sequence before finished goods leave the plant</figcaption>
      <svg className="guide-diagram-svg guide-diagram-svg-wide" viewBox="0 0 940 220" role="img" aria-labelledby="run-title run-desc">
        <title id="run-title">First production run sequence</title>
        <desc id="run-desc">Product brief leads to written specifications, then a trial, written approval, production, and planned storage and freight.</desc>
        <defs><marker id="run-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" className="diagram-arrowhead" /></marker></defs>
        {FIRST_RUN_STEPS.map((node, index) => {
          const x = 18 + index * 154;
          return (
            <g key={node}>
              <circle className="diagram-step-number" cx={x + 66} cy="48" r="22" />
              <text className="diagram-number" x={x + 66} y="55" textAnchor="middle">{index + 1}</text>
              <rect className={index === 4 ? "diagram-node diagram-node-accent" : "diagram-node"} x={x} y="88" width="132" height="74" rx="18" />
              <text className={index === 4 ? "diagram-label diagram-label-light" : "diagram-label"} x={x + 66} y="120" textAnchor="middle">
                {node === "Storage + freight" ? <><tspan x={x + 66}>Storage</tspan><tspan x={x + 66} dy="21">+ freight</tspan></> : node}
              </text>
              {index < FIRST_RUN_STEPS.length - 1 ? <path className="diagram-line" d={`M${x + 132} 125 H${x + 150}`} markerEnd="url(#run-arrow)" /> : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function GuideDiagram({ variant }: { variant: CornerstoneGuide["diagram"] }) {
  if (variant === "hot-sauce") return <HotSauceDiagram />;
  if (variant === "formula") return <FormulaDiagram />;
  if (variant === "package") return <PackageDiagram />;
  if (variant === "storage") return <StorageDiagram />;
  return <FirstRunDiagram />;
}
