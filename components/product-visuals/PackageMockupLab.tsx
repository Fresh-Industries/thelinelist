"use client";

import { ArrowCounterClockwise, HandSwipeRight, UploadSimple } from "@phosphor-icons/react";
import { ChangeEvent, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  createDefaultLogoSettings,
  packageConfigs,
  PACKAGING_TYPES,
  type BottleFinish,
  type PackagingType,
} from "./package-config";
import { ProductMockup } from "./ProductMockup";

const DEFAULT_PACKAGE: PackagingType = "slim-can";
const DEFAULT_COLOR = packageConfigs[DEFAULT_PACKAGE].defaultColor;
const DEFAULT_LOGO = "/brand/line-list-logo.png";
const DEFAULT_LOGO_ASPECT = 1345 / 662;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const COLOR_SWATCHES = [
  { name: "Tidepool", value: "#25b7b8" },
  { name: "Tomato", value: "#ef5a47" },
  { name: "Mango", value: "#f3a51f" },
  { name: "Blueberry", value: "#7559c8" },
  { name: "Forest", value: "#2f754c" },
];

const LABEL_COLOR_SWATCHES = [
  { name: "Cream", value: "#f2e8d5" },
  { name: "White", value: "#fffaf1" },
  { name: "Blush", value: "#f7d8d3" },
  { name: "Lemon", value: "#f7e7a5" },
  { name: "Mint", value: "#d5e9de" },
  { name: "Lavender", value: "#e1d9f2" },
];

type ColorControlProps = {
  label?: string;
  controlName: string;
  colors: typeof COLOR_SWATCHES;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function ColorControl({ label, controlName, colors, value, disabled = false, onChange }: ColorControlProps) {
  return (
    <div className={`package-color-control${disabled ? " is-disabled" : ""}`}>
      {label ? <p>{label}</p> : null}
      <div className="package-color-row" role="group" aria-label={controlName} aria-disabled={disabled}>
        {colors.map((swatch) => (
          <button
            key={swatch.value}
            className="package-color-swatch"
            type="button"
            aria-label={`${swatch.name} ${controlName.toLowerCase()}`}
            aria-pressed={value === swatch.value}
            disabled={disabled}
            style={{ "--swatch-color": swatch.value } as CSSProperties}
            onClick={() => onChange(swatch.value)}
          />
        ))}
        <label className="package-color-custom" title={`Choose a custom ${controlName.toLowerCase()}`}>
          <span className="sr-only">Custom {controlName.toLowerCase()}</span>
          <input
            type="color"
            value={value}
            disabled={disabled}
            aria-label={`Custom ${controlName.toLowerCase()}`}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <output className="package-color-value" aria-label={`${controlName} value`}>
          {value.toUpperCase()}
        </output>
      </div>
      {disabled ? <small>Saved for the colored finish.</small> : null}
    </div>
  );
}

export function PackageMockupLab() {
  const [packagingType, setPackagingType] = useState<PackagingType>(DEFAULT_PACKAGE);
  const [baseColor, setBaseColor] = useState(DEFAULT_COLOR);
  const [labelColor, setLabelColor] = useState(packageConfigs.bottle.colors.label);
  const [bottleFinish, setBottleFinish] = useState<BottleFinish>("colored");
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [logoAspect, setLogoAspect] = useState(DEFAULT_LOGO_ASPECT);
  const [logoSettings, setLogoSettings] = useState(createDefaultLogoSettings);
  const [artworkName, setArtworkName] = useState("Line List demo artwork");
  const [uploadError, setUploadError] = useState("");
  const [sceneKey, setSceneKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedObjectUrlRef = useRef<string | undefined>(undefined);

  const config = packageConfigs[packagingType];
  const activeLogoSettings = logoSettings[packagingType];
  const hasMultipleAppearanceControls = config.appearance.supportsClearFinish || config.appearance.supportsLabelColor;

  useEffect(() => {
    return () => {
      if (uploadedObjectUrlRef.current) URL.revokeObjectURL(uploadedObjectUrlRef.current);
    };
  }, []);

  function updateActiveLogoSetting(key: "scale" | "x" | "y", value: number) {
    setLogoSettings((settings) => ({
      ...settings,
      [packagingType]: { ...settings[packagingType], [key]: value },
    }));
  }

  function handleArtworkUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      setUploadError("Please choose a PNG so transparent artwork stays transparent.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("That PNG is larger than 8 MB. Try a smaller export.");
      event.target.value = "";
      return;
    }

    if (uploadedObjectUrlRef.current) URL.revokeObjectURL(uploadedObjectUrlRef.current);
    const nextObjectUrl = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = nextObjectUrl;
    const image = new Image();
    image.onload = () => {
      setLogoUrl(nextObjectUrl);
      setLogoAspect(image.naturalWidth / image.naturalHeight || 1);
      setArtworkName(file.name);
      setUploadError("");
    };
    image.onerror = () => {
      URL.revokeObjectURL(nextObjectUrl);
      if (uploadedObjectUrlRef.current === nextObjectUrl) uploadedObjectUrlRef.current = undefined;
      setUploadError("We could not read that PNG. Please try another file.");
      event.target.value = "";
    };
    image.src = nextObjectUrl;
  }

  function resetLab() {
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
      uploadedObjectUrlRef.current = undefined;
    }
    setPackagingType(DEFAULT_PACKAGE);
    setBaseColor(DEFAULT_COLOR);
    setLabelColor(packageConfigs.bottle.colors.label);
    setBottleFinish("colored");
    setLogoUrl(DEFAULT_LOGO);
    setLogoAspect(DEFAULT_LOGO_ASPECT);
    setLogoSettings(createDefaultLogoSettings());
    setArtworkName("Line List demo artwork");
    setUploadError("");
    setSceneKey((key) => key + 1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="package-lab-shell wrap">
      <header className="package-lab-intro">
        <p className="package-lab-kicker">Internal experiment · reusable packaging studio</p>
        <h1>Package Mockup Lab</h1>
        <p>Try one logo across soft 3D packaging. Nothing is uploaded or saved.</p>
      </header>

      <div className="package-lab-grid">
        <aside className="package-lab-controls" aria-label="Package controls">
          <section className="package-control-section">
            <div className="package-control-heading">
              <span>01</span>
              <div>
                <h2>Choose a package</h2>
                <p>Use the same artwork across each format.</p>
              </div>
            </div>
            <div className="package-type-options" role="group" aria-label="Package type">
              {PACKAGING_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={packagingType === type}
                  onClick={() => setPackagingType(type)}
                >
                  {packageConfigs[type].label}
                </button>
              ))}
            </div>
          </section>

          <section className="package-control-section">
            <div className="package-control-heading">
              <span>02</span>
              <div>
                <h2>Add your artwork</h2>
                <p>A transparent PNG works best.</p>
              </div>
            </div>
            <label className="package-upload" htmlFor="package-artwork">
              <UploadSimple size={25} weight="bold" aria-hidden="true" />
              <span>
                <strong>Choose a PNG</strong>
                <small>Up to 8 MB</small>
              </span>
            </label>
            <input
              ref={fileInputRef}
              className="package-file-input"
              id="package-artwork"
              name="package-artwork"
              type="file"
              accept="image/png"
              onChange={handleArtworkUpload}
            />
            <p className="package-artwork-status" aria-live="polite">
              {uploadError || `Showing: ${artworkName}`}
            </p>
          </section>

          <section className="package-control-section">
            <div className="package-control-heading">
              <span>03</span>
              <div>
                <h2>
                  {hasMultipleAppearanceControls
                    ? `Style the ${config.shortName}`
                    : `Choose the ${config.appearance.baseColorLabel.toLowerCase()}`}
                </h2>
                <p>
                  {config.appearance.supportsLabelColor
                    ? `${config.appearance.baseColorLabel.replace(" color", "")} and label colors are independent.`
                    : "Color follows you between package types."}
                </p>
              </div>
            </div>
            {hasMultipleAppearanceControls ? (
              <div className="package-bottle-style">
                {config.appearance.supportsClearFinish ? (
                  <div className="package-finish-control">
                    <p>{config.label} finish</p>
                    <div className="package-finish-options" role="group" aria-label={`${config.label} finish`}>
                      {(["colored", "clear"] as const).map((finish) => (
                        <button
                          key={finish}
                          type="button"
                          aria-pressed={bottleFinish === finish}
                          onClick={() => setBottleFinish(finish)}
                        >
                          {finish === "colored" ? "Colored" : "Clear"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <ColorControl
                  label={config.appearance.baseColorLabel}
                  controlName={config.appearance.baseColorLabel}
                  colors={COLOR_SWATCHES}
                  value={baseColor}
                  disabled={config.appearance.supportsClearFinish && bottleFinish === "clear"}
                  onChange={setBaseColor}
                />
                {config.appearance.supportsLabelColor ? (
                  <ColorControl
                    label="Label color"
                    controlName="Label color"
                    colors={LABEL_COLOR_SWATCHES}
                    value={labelColor}
                    onChange={setLabelColor}
                  />
                ) : null}
              </div>
            ) : (
              <ColorControl
                controlName={config.appearance.baseColorLabel}
                colors={COLOR_SWATCHES}
                value={baseColor}
                onChange={setBaseColor}
              />
            )}
          </section>

          <section className="package-control-section package-sliders">
            <div className="package-control-heading">
              <span>04</span>
              <div>
                <h2>Place the logo</h2>
                <p>Each package remembers its own placement.</p>
              </div>
            </div>
            <div className="package-slider">
              <label htmlFor="package-logo-size">Logo size</label>
              <output htmlFor="package-logo-size">{Math.round(activeLogoSettings.scale * 100)}%</output>
              <input
                id="package-logo-size"
                type="range"
                aria-label="Logo size"
                min={config.logo.scale.min}
                max={config.logo.scale.max}
                step={config.logo.scale.step}
                value={activeLogoSettings.scale}
                onChange={(event) => updateActiveLogoSetting("scale", Number(event.target.value))}
              />
            </div>
            <div className="package-slider">
              <label htmlFor="package-logo-vertical">Move up or down</label>
              <output htmlFor="package-logo-vertical">{activeLogoSettings.y > 0 ? "+" : ""}{Math.round(activeLogoSettings.y * 100)}</output>
              <input
                id="package-logo-vertical"
                type="range"
                aria-label="Logo vertical position"
                min={config.logo.vertical.min}
                max={config.logo.vertical.max}
                step={config.logo.vertical.step}
                value={activeLogoSettings.y}
                onChange={(event) => updateActiveLogoSetting("y", Number(event.target.value))}
              />
            </div>
            <div className="package-slider">
              <label htmlFor="package-logo-horizontal">Move left or right</label>
              <output htmlFor="package-logo-horizontal">{activeLogoSettings.x > 0 ? "+" : ""}{Math.round(activeLogoSettings.x * 100)}</output>
              <input
                id="package-logo-horizontal"
                type="range"
                aria-label="Logo horizontal position"
                min={config.logo.horizontal.min}
                max={config.logo.horizontal.max}
                step={config.logo.horizontal.step}
                value={activeLogoSettings.x}
                onChange={(event) => updateActiveLogoSetting("x", Number(event.target.value))}
              />
            </div>
          </section>

          <button className="package-reset" type="button" onClick={resetLab}>
            <ArrowCounterClockwise size={19} weight="bold" aria-hidden="true" />
            Reset mockup
          </button>
        </aside>

        <section className="package-lab-preview" aria-labelledby="package-preview-title">
          <div className="package-preview-meta">
            <div>
              <p>Live preview</p>
              <h2 id="package-preview-title">{config.previewTitle}</h2>
            </div>
            <span>3D</span>
          </div>
          <ProductMockup
            packagingType={packagingType}
            logoUrl={logoUrl}
            logoAspect={logoAspect}
            baseColor={baseColor}
            labelColor={labelColor}
            bottleFinish={bottleFinish}
            logoScale={activeLogoSettings.scale}
            logoPosition={{ x: activeLogoSettings.x, y: activeLogoSettings.y }}
            sceneKey={sceneKey}
          />
          <p className="package-drag-hint">
            <HandSwipeRight size={22} weight="bold" aria-hidden="true" />
            Drag to turn the {config.shortName}
          </p>
        </section>
      </div>
    </div>
  );
}
