"use client";

import { Check, UploadSimple, X } from "@phosphor-icons/react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ProductMockup } from "@/components/product-visuals/ProductMockup";
import { createDefaultLogoSettings, packageConfigs, PACKAGING_TYPES, type BottleFinish, type PackagingType } from "@/components/product-visuals/package-config";
import { formatPackageDirection, getPackageValidationGuidance } from "@/lib/sourcing/package-presentation";
import { getRecommendedWorkbenchPackageTypes } from "@/lib/sourcing/package-recommendations";
import { getProductCategory } from "@/lib/sourcing/product-catalog";
import type { PackageDesign, PackageFrontText, SourcingWorkspace } from "@/lib/sourcing/types";

const DEFAULT_LABEL = "#f2e8d5";
const DEFAULT_LOGO_ASPECT = 1345 / 662;

export function SourcingPackageWorkbench({ workspace, initialPreview, onClose, onWorkspaceChanged, onStage, onCommit, onSaved }: {
  workspace: SourcingWorkspace;
  initialPreview?: PackageDesign | null;
  onClose: () => void;
  onWorkspaceChanged: (workspace: SourcingWorkspace) => void;
  onStage: (design: PackageDesign) => Promise<SourcingWorkspace>;
  onCommit: (design: PackageDesign) => Promise<SourcingWorkspace>;
  onSaved: (workspace: SourcingWorkspace) => void;
}) {
  const [initial] = useState(() => initialPreview ?? workspace.stagedPackageDesign?.design ?? workspace.packageDesign);
  const [agentStagedSession] = useState(() => Boolean(initialPreview));
  const inferredPackagingType = initial?.packagingType ?? inferPackage(workspace);
  const [packagingType, setPackagingType] = useState<PackagingType>(inferredPackagingType);
  const [finish, setFinish] = useState<BottleFinish>(initial?.finish ?? "colored");
  const [baseColor, setBaseColor] = useState(initial?.baseColor ?? packageConfigs[inferredPackagingType].defaultColor);
  const [labelColor, setLabelColor] = useState(initial?.labelColor ?? DEFAULT_LABEL);
  const [logoSettings, setLogoSettings] = useState(() => {
    const defaults = createDefaultLogoSettings();
    if (initial) defaults[initial.packagingType] = { scale: initial.logoScale, ...initial.logoPosition };
    return defaults;
  });
  const [windowSettings, setWindowSettings] = useState(() => {
    const defaults = Object.fromEntries(PACKAGING_TYPES.map((type) => [type, packageConfigs[type].window?.defaultScale ?? 0])) as Record<PackagingType, number>;
    if (initial) defaults[initial.packagingType] = initial.windowScale;
    return defaults;
  });
  const [frontText, setFrontText] = useState<PackageFrontText>(() => initial?.frontText ?? {
    brand: workspace.fields.brand_name.value ?? "",
    product: workspace.fields.product_type.value ?? workspace.fields.product_name.value ?? "",
  });
  const [logoUrl, setLogoUrl] = useState<string | undefined>(workspace.artwork && (initial?.artworkId === workspace.artwork.id || !initial) ? `/api/sourcing/${workspace.id}/artwork/${workspace.artwork.id}` : undefined);
  const [logoAspect, setLogoAspect] = useState(initial?.logoAspect ?? DEFAULT_LOGO_ASPECT);
  const [dimensions, setDimensions] = useState(initial?.dimensions ?? { width: null, height: null, depth: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAllPackageTypes, setShowAllPackageTypes] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const capturePreviewRef = useRef<(() => Promise<Blob | null>) | null>(null);
  const lastStagedDesignRef = useRef(workspace.stagedPackageDesign?.design ? JSON.stringify(workspace.stagedPackageDesign.design) : "");
  const config = packageConfigs[packagingType];
  const productCategory = getProductCategory(workspace);
  const recommendedPackageTypes = getRecommendedWorkbenchPackageTypes(productCategory);
  const primaryPackageTypes = [...new Set([...recommendedPackageTypes, packagingType])];
  const otherPackageTypes = PACKAGING_TYPES.filter((type) => !primaryPackageTypes.includes(type));
  const logo = logoSettings[packagingType];
  const windowScale = windowSettings[packagingType];
  const generatedSummary = useMemo(
    () => packageSummary(packagingType, finish, dimensions, windowScale),
    [dimensions, finish, packagingType, windowScale],
  );
  const [summaryDirty, setSummaryDirty] = useState(false);
  const summary = initial && !summaryDirty ? initial.summary : generatedSummary;
  const currentDesign = useMemo<PackageDesign>(() => ({
    packagingType,
    finish,
    baseColor,
    labelColor,
    artworkId: logoUrl ? workspace.artwork?.id ?? initial?.artworkId ?? null : null,
    previewAssetId: null,
    frontText: packagingType === "bakery-bag" ? normalizedFrontText(frontText) : null,
    windowScale: config.window ? windowScale : 0,
    closure: initial?.closure ?? null,
    logoAspect,
    logoScale: logo.scale,
    logoPosition: { x: logo.x, y: logo.y },
    dimensions,
    summary,
  }), [baseColor, config.window, dimensions, finish, frontText, initial?.artworkId, initial?.closure, labelColor, logo.scale, logo.x, logo.y, logoAspect, logoUrl, packagingType, summary, windowScale, workspace.artwork?.id]);

  useEffect(() => {
    const serialized = JSON.stringify(currentDesign);
    if (serialized === lastStagedDesignRef.current) return;
    const timeout = window.setTimeout(() => {
      lastStagedDesignRef.current = serialized;
      void onStage(currentDesign)
        .catch((cause) => {
          if (lastStagedDesignRef.current === serialized) lastStagedDesignRef.current = "";
          setError(cause instanceof Error ? cause.message : "The staged package direction could not be persisted.");
        });
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [currentDesign, onStage]);

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

  function setWindowScale(value: number) {
    setSummaryDirty(true);
    setWindowSettings((current) => ({ ...current, [packagingType]: value }));
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
      onWorkspaceChanged(body.workspace);
    } catch {
      setError("Artwork could not be uploaded. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const previewAssetId = await uploadPackagePreview(workspace.id, capturePreviewRef.current);
      const committed = await onCommit({ ...currentDesign, previewAssetId });
      onSaved(committed);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The package direction could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog className="workbench-overlay" aria-labelledby="package-workbench-heading" open onCancel={onClose}>
      <div className="workbench-shell">
        <header className="workbench-heading"><div><p>{agentStagedSession ? "Agent-staged 3D refinement" : "Packaging workbench"}</p><h1 id="package-workbench-heading">{agentStagedSession ? "Review what your agent changed." : "Make the package direction tangible."}</h1></div><button type="button" onClick={onClose} aria-label="Close packaging workbench"><X aria-hidden="true" /></button></header>
        <div className="packaging-layout">
          <aside className="tool-controls">
            <fieldset className="package-type-choices">
              <legend>Package</legend>
              <p className="package-choice-context">Recommended 3D models for this {productCategory === "food" ? "product" : productCategory}.</p>
              {primaryPackageTypes.map((type) => <button key={type} type="button" className={type === packagingType ? "selected" : ""} onClick={() => { setSummaryDirty(true); setPackagingType(type); }}>{packageButtonLabel(type)}{type === packagingType ? <Check aria-hidden="true" /> : null}</button>)}
              {otherPackageTypes.length ? <button type="button" className="package-more-toggle" aria-expanded={showAllPackageTypes} onClick={() => setShowAllPackageTypes((current) => !current)}>{showAllPackageTypes ? "Hide other package types" : `More package types (${otherPackageTypes.length})`}</button> : null}
              {showAllPackageTypes ? <div className="other-package-types"><span>Other supported models</span>{otherPackageTypes.map((type) => <button key={type} type="button" className={type === packagingType ? "selected" : ""} onClick={() => { setSummaryDirty(true); setPackagingType(type); }}>{packageButtonLabel(type)}{type === packagingType ? <Check aria-hidden="true" /> : null}</button>)}</div> : null}
            </fieldset>
            {config.appearance.supportsClearFinish ? <fieldset><legend>Finish</legend>{(["colored", "clear"] as const).map((value) => <button key={value} type="button" className={finish === value ? "selected" : ""} onClick={() => { setSummaryDirty(true); setFinish(value); }}>{value === "colored" ? "Colored" : "Clear"}</button>)}</fieldset> : null}
            <label className="color-control">Package color <input type="color" value={baseColor} onChange={(event) => setBaseColor(event.target.value)} disabled={finish === "clear" && config.appearance.supportsClearFinish} /></label>
            {config.appearance.supportsLabelColor ? <label className="color-control">Label color <input type="color" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} /></label> : null}
            <label className="artwork-control"><UploadSimple aria-hidden="true" /><span><strong>Add artwork</strong><small>PNG, JPG, or WebP · 2 MB</small></span><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label>
            {packagingType === "bakery-bag" ? <div className="dimension-controls"><span>Exact front copy</span><label style={{ gridColumn: "1 / -1" }}>Brand text<input type="text" maxLength={120} value={frontText.brand} onChange={(event) => setFrontText((current) => ({ ...current, brand: event.target.value }))} /></label><label style={{ gridColumn: "1 / -1" }}>Product text<input type="text" maxLength={160} value={frontText.product} onChange={(event) => setFrontText((current) => ({ ...current, product: event.target.value }))} /></label></div> : null}
            <div className="workbench-sliders">
              {config.window ? <label><span>Window size <i>{Math.round(windowScale * 100)}%</i></span><input type="range" aria-label="Window size" min={config.window.scale.min} max={config.window.scale.max} step={config.window.scale.step} value={windowScale} onChange={(event) => setWindowScale(Number(event.target.value))} /></label> : null}
              <label><span>{packagingType === "bakery-bag" ? "Front copy size" : "Logo size"} <i>{logo.scale.toFixed(2)}×</i></span><input type="range" aria-label={packagingType === "bakery-bag" ? "Front copy size" : "Logo size"} min={config.logo.scale.min} max={config.logo.scale.max} step={config.logo.scale.step} value={logo.scale} onChange={(event) => setLogo("scale", Number(event.target.value))} /></label>
              <label><span>Left / right <i>{logo.x.toFixed(2)}</i></span><input type="range" aria-label={packagingType === "bakery-bag" ? "Front copy left or right position" : "Logo left or right position"} min={config.logo.horizontal.min} max={config.logo.horizontal.max} step={config.logo.horizontal.step} value={logo.x} onChange={(event) => setLogo("x", Number(event.target.value))} /></label>
              <label><span>Up / down <i>{logo.y.toFixed(2)}</i></span><input type="range" aria-label={packagingType === "bakery-bag" ? "Front copy up or down position" : "Logo up or down position"} min={config.logo.vertical.min} max={config.logo.vertical.max} step={config.logo.vertical.step} value={logo.y} onChange={(event) => setLogo("y", Number(event.target.value))} /></label>
            </div>
            <div className="dimension-controls"><span>Working dimensions</span>{(["width", "height", "depth"] as const).map((key) => <label key={key}>{key}<input type="number" min="0" max="10000" step="0.1" value={dimensions[key] ?? ""} onChange={(event) => { setSummaryDirty(true); setDimensions((current) => ({ ...current, [key]: event.target.value ? Number(event.target.value) : null })); }} /></label>)}</div>
          </aside>
          <section className="package-canvas">
            <div className="package-preview-meta"><div><p>{agentStagedSession ? "Agent preview · live in 3D" : "Live 3D preview"}</p><h2>{config.previewTitle}</h2></div><span>Drag to turn</span></div>
            <ProductMockup packagingType={packagingType} logoUrl={logoUrl} logoAspect={logoAspect} baseColor={baseColor} labelColor={labelColor} bottleFinish={finish} logoScale={logo.scale} logoPosition={{ x: logo.x, y: logo.y }} frontText={packagingType === "bakery-bag" ? normalizedFrontText(frontText) : null} windowScale={config.window ? windowScale : 0} onCaptureReady={(capture) => { capturePreviewRef.current = capture; }} />
            <div className="tradeoff-note"><span>Working direction</span><p>{summary}</p><small>This is a communication mockup, not a production dieline. {getPackageValidationGuidance(packagingType)}</small></div>
          </section>
        </div>
        {error ? <p className="sourcing-error" role="alert">{error}</p> : null}
        <footer className="workbench-footer"><div><strong>{summary}</strong><span>{agentStagedSession ? "Agent-staged preview · matching is unchanged until you use it." : "Writes back into this same product brief."}</span></div><button type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : "Use this package direction"}</button></footer>
      </div>
    </dialog>
  );
}

async function uploadPackagePreview(workspaceId: string, capture: (() => Promise<Blob | null>) | null): Promise<string> {
  if (!capture) throw new Error("The 3D preview is still loading. Wait a moment and try again.");
  const blob = await capture();
  if (!blob?.size) throw new Error("The 3D preview could not be captured. Try turning the package once, then save again.");
  const data = new FormData();
  data.set("preview", new File([blob], "package-preview.png", { type: "image/png" }));
  const response = await fetch(`/api/sourcing/${workspaceId}/package-preview`, { method: "POST", body: data });
  const body = await response.json().catch(() => null) as { previewAssetId?: string; error?: string } | null;
  if (!response.ok || !body?.previewAssetId) throw new Error(body?.error || "The 3D preview could not be saved for the PDF.");
  return body.previewAssetId;
}

function inferPackage(workspace: SourcingWorkspace): PackagingType {
  const text = `${workspace.fields.packaging_format.value || ""} ${workspace.fields.product_description.value || ""}`.toLowerCase();
  if (/jar/.test(text)) return "jar";
  if (/bottle/.test(text)) return "bottle";
  if (/bread|bakery|loaf/.test(text)) return "bakery-bag";
  if (/pouch|bag/.test(text)) return "stand-up-pouch";
  return "slim-can";
}

function packageSummary(type: PackagingType, _finish: BottleFinish, dimensions: PackageDesign["dimensions"], windowScale: number): string {
  const direction = formatPackageDirection(type, dimensions);
  return type === "bakery-bag" && windowScale > 0 ? `${direction} · clear viewing window` : direction;
}

function normalizedFrontText(frontText: PackageFrontText): PackageFrontText | null {
  const normalized = { brand: frontText.brand.trim(), product: frontText.product.trim() };
  return normalized.brand || normalized.product ? normalized : null;
}

function packageButtonLabel(type: PackagingType): string {
  if (type === "stand-up-pouch") return "Bag / pouch";
  if (type === "bakery-bag") return "Bakery bag + window";
  return packageConfigs[type].label;
}
