"use client";

import { Check, UploadSimple, X } from "@phosphor-icons/react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ProductMockup } from "@/components/product-visuals/ProductMockup";
import { createDefaultLogoSettings, packageConfigs, PACKAGING_TYPES, type BottleFinish, type PackagingType } from "@/components/product-visuals/package-config";
import { formatPackageDirection } from "@/lib/sourcing/package-presentation";
import type { PackageDesign, SourcingWorkspace } from "@/lib/sourcing/types";

const DEFAULT_COLOR = "#b64d2c";
const DEFAULT_LABEL = "#f2e8d5";
const DEFAULT_LOGO_ASPECT = 1345 / 662;

export function SourcingPackageWorkbench({ workspace, initialPreview, onClose, onSaved }: {
  workspace: SourcingWorkspace;
  initialPreview?: PackageDesign | null;
  onClose: () => void;
  onSaved: (workspace: SourcingWorkspace) => void;
}) {
  const initial = initialPreview ?? workspace.packageDesign;
  const [packagingType, setPackagingType] = useState<PackagingType>(initial?.packagingType ?? inferPackage(workspace));
  const [finish, setFinish] = useState<BottleFinish>(initial?.finish ?? "colored");
  const [baseColor, setBaseColor] = useState(initial?.baseColor ?? DEFAULT_COLOR);
  const [labelColor, setLabelColor] = useState(initial?.labelColor ?? DEFAULT_LABEL);
  const [logoSettings, setLogoSettings] = useState(() => {
    const defaults = createDefaultLogoSettings();
    if (initial) defaults[initial.packagingType] = { scale: initial.logoScale, ...initial.logoPosition };
    return defaults;
  });
  const [logoUrl, setLogoUrl] = useState<string | undefined>(workspace.artwork && (initial?.artworkId === workspace.artwork.id || !initial) ? `/api/sourcing/${workspace.id}/artwork/${workspace.artwork.id}` : undefined);
  const [logoAspect, setLogoAspect] = useState(initial && initial.artworkId === workspace.artwork?.id ? initial.logoAspect : DEFAULT_LOGO_ASPECT);
  const [dimensions, setDimensions] = useState(initial?.dimensions ?? { width: null, height: null, depth: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const config = packageConfigs[packagingType];
  const logo = logoSettings[packagingType];
  const summary = useMemo(() => packageSummary(packagingType, finish, dimensions), [dimensions, finish, packagingType]);

  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setLogoAspect(image.naturalWidth / image.naturalHeight || DEFAULT_LOGO_ASPECT);
    };
    image.src = logoUrl;
    return () => { cancelled = true; };
  }, [logoUrl]);

  function setLogo(key: "scale" | "x" | "y", value: number) {
    setLogoSettings((current) => ({ ...current, [packagingType]: { ...current[packagingType], [key]: value } }));
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("artwork", file);
      const response = await fetch(`/api/sourcing/${workspace.id}/artwork`, { method: "POST", body: data });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        setError(failure?.error || "Artwork could not be uploaded.");
        return;
      }
      const body = await response.json().catch(() => null) as { workspace?: SourcingWorkspace; artworkUrl?: string } | null;
      if (!body?.workspace || !body.artworkUrl) {
        setError("Artwork could not be uploaded.");
        return;
      }
      setLogoUrl(body.artworkUrl);
      onSaved(body.workspace);
    } catch {
      setError("Artwork could not be uploaded. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    const packageDesign: PackageDesign = {
      packagingType,
      finish,
      baseColor,
      labelColor,
      artworkId: logoUrl ? workspace.artwork?.id ?? null : null,
      logoAspect,
      logoScale: logo.scale,
      logoPosition: { x: logo.x, y: logo.y },
      dimensions,
      summary,
    };
    try {
      const response = await fetch(`/api/sourcing/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: workspace.revision, packageDesign }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        setError(failure?.error || "The package direction could not be saved.");
        return;
      }
      const body = await response.json().catch(() => null) as { workspace?: SourcingWorkspace } | null;
      if (!body?.workspace) {
        setError("The package direction could not be saved.");
        return;
      }
      onSaved(body.workspace);
      onClose();
    } catch {
      setError("The package direction could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog className="workbench-overlay" aria-labelledby="package-workbench-heading" open onCancel={onClose}>
      <div className="workbench-shell">
        <header className="workbench-heading"><div><p>Packaging workbench</p><h1 id="package-workbench-heading">Make the package direction tangible.</h1></div><button type="button" onClick={onClose} aria-label="Close packaging workbench"><X aria-hidden="true" /></button></header>
        <div className="packaging-layout">
          <aside className="tool-controls">
            <fieldset><legend>Package</legend>{PACKAGING_TYPES.map((type) => <button key={type} type="button" className={type === packagingType ? "selected" : ""} onClick={() => setPackagingType(type)}>{type === "stand-up-pouch" ? "Bag / pouch" : packageConfigs[type].label}{type === packagingType ? <Check aria-hidden="true" /> : null}</button>)}</fieldset>
            {config.appearance.supportsClearFinish ? <fieldset><legend>Finish</legend>{(["colored", "clear"] as const).map((value) => <button key={value} type="button" className={finish === value ? "selected" : ""} onClick={() => setFinish(value)}>{value === "colored" ? "Colored" : "Clear"}</button>)}</fieldset> : null}
            <label className="color-control">Package color <input type="color" value={baseColor} onChange={(event) => setBaseColor(event.target.value)} disabled={finish === "clear" && config.appearance.supportsClearFinish} /></label>
            {config.appearance.supportsLabelColor ? <label className="color-control">Label color <input type="color" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} /></label> : null}
            <label className="artwork-control"><UploadSimple aria-hidden="true" /><span><strong>Add artwork</strong><small>PNG, JPG, or WebP · 2 MB</small></span><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label>
            <div className="workbench-sliders">
              <label><span>Logo size <i>{logo.scale.toFixed(2)}×</i></span><input type="range" aria-label="Logo size" min={config.logo.scale.min} max={config.logo.scale.max} step={config.logo.scale.step} value={logo.scale} onChange={(event) => setLogo("scale", Number(event.target.value))} /></label>
              <label><span>Left / right <i>{logo.x.toFixed(2)}</i></span><input type="range" aria-label="Logo left or right position" min={config.logo.horizontal.min} max={config.logo.horizontal.max} step={config.logo.horizontal.step} value={logo.x} onChange={(event) => setLogo("x", Number(event.target.value))} /></label>
              <label><span>Up / down <i>{logo.y.toFixed(2)}</i></span><input type="range" aria-label="Logo up or down position" min={config.logo.vertical.min} max={config.logo.vertical.max} step={config.logo.vertical.step} value={logo.y} onChange={(event) => setLogo("y", Number(event.target.value))} /></label>
            </div>
            <div className="dimension-controls"><span>Working dimensions</span>{(["width", "height", "depth"] as const).map((key) => <label key={key}>{key}<input type="number" min="0" max="10000" step="0.1" value={dimensions[key] ?? ""} onChange={(event) => setDimensions((current) => ({ ...current, [key]: event.target.value ? Number(event.target.value) : null }))} /></label>)}</div>
          </aside>
          <section className="package-canvas">
            <div className="package-preview-meta"><div><p>Live 3D preview</p><h2>{config.previewTitle}</h2></div><span>Drag to turn</span></div>
            <ProductMockup packagingType={packagingType} logoUrl={logoUrl} logoAspect={logoAspect} baseColor={baseColor} labelColor={labelColor} bottleFinish={finish} logoScale={logo.scale} logoPosition={{ x: logo.x, y: logo.y }} />
            <div className="tradeoff-note"><span>Working direction</span><p>{summary}</p><small>This is a communication mockup, not a production dieline. Final dimensions and materials still need manufacturer validation.</small></div>
          </section>
        </div>
        {error ? <p className="sourcing-error" role="alert">{error}</p> : null}
        <footer className="workbench-footer"><div><strong>{summary}</strong><span>{initialPreview ? "Agent-staged preview · matching is unchanged until you use it." : "Writes back into this same product brief."}</span></div><button type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : "Use this package direction"}</button></footer>
      </div>
    </dialog>
  );
}

function inferPackage(workspace: SourcingWorkspace): PackagingType {
  const text = `${workspace.fields.packaging_format.value || ""} ${workspace.fields.product_description.value || ""}`.toLowerCase();
  if (/jar/.test(text)) return "jar";
  if (/bottle/.test(text)) return "bottle";
  if (/pouch|bag|bread|bakery/.test(text)) return "stand-up-pouch";
  return "slim-can";
}

function packageSummary(type: PackagingType, _finish: BottleFinish, dimensions: PackageDesign["dimensions"]): string {
  return formatPackageDirection(type, dimensions);
}
