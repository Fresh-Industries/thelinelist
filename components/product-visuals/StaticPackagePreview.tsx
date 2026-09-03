"use client";

import { useEffect, useRef } from "react";
import type { ProductMockupProps } from "./ProductMockup";
import { packageConfigs } from "./package-config";

const PREVIEW_SIZE = 720;

export function StaticPackagePreview({
  packagingType,
  logoUrl,
  baseColor = packageConfigs[packagingType].defaultColor,
  labelColor = packageConfigs[packagingType].colors.label ?? "#f2e8d5",
  logoScale = packageConfigs[packagingType].logo.defaultScale,
  logoPosition = { x: 0, y: 0 },
  frontText = null,
  windowScale = 0,
  variant = "studio",
  onCaptureReady,
}: ProductMockupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const options = { packagingType, logoUrl, baseColor, labelColor, logoScale, logoPosition, frontText, windowScale };
    void drawPreview(canvas, options);
    onCaptureReady?.(async () => {
      await drawPreview(canvas, options);
      return canvasBlob(canvas);
    });
  }, [baseColor, frontText, labelColor, logoPosition, logoScale, logoUrl, onCaptureReady, packagingType, windowScale]);

  return (
    <div
      className="product-mockup-static"
      role="img"
      aria-label={`Static 2D ${packageConfigs[packagingType].label.toLowerCase()} package preview because interactive 3D is unavailable`}
      data-base-color={baseColor.toLowerCase()}
      data-label-color={labelColor.toLowerCase()}
    >
      <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} aria-hidden="true" />
      <span className="product-mockup-static-label">Static 2D preview · 3D unavailable</span>
      {variant === "studio" ? <span className="product-mockup-static-note">Review the colors, artwork, and front text before using this direction.</span> : null}
    </div>
  );
}

type DrawOptions = Pick<ProductMockupProps, "packagingType" | "logoUrl" | "baseColor" | "labelColor" | "logoScale" | "logoPosition" | "frontText" | "windowScale">;

async function drawPreview(canvas: HTMLCanvasElement, options: DrawOptions): Promise<void> {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  context.save();
  context.shadowColor = "rgba(23, 63, 53, 0.2)";
  context.shadowBlur = 30;
  context.shadowOffsetY = 18;
  drawPackageShape(context, options);
  context.restore();

  if (options.logoUrl) {
    const artwork = await loadImage(options.logoUrl).catch(() => null);
    if (artwork) drawArtwork(context, artwork, options);
  }
  if (options.frontText) drawFrontText(context, options);
}

function drawPackageShape(context: CanvasRenderingContext2D, options: DrawOptions): void {
  const baseColor = options.baseColor ?? "#25b7b8";
  const labelColor = options.labelColor ?? "#f2e8d5";
  context.lineWidth = 5;
  context.strokeStyle = "#173f35";
  context.fillStyle = baseColor;

  if (options.packagingType === "slim-can") {
    roundedRect(context, 238, 82, 244, 556, 52);
    context.fill(); context.stroke();
    ellipse(context, 360, 105, 110, 28, "#d9d6cc");
    return;
  }
  if (options.packagingType === "bottle") {
    context.beginPath();
    context.moveTo(308, 86); context.lineTo(412, 86); context.lineTo(420, 166);
    context.bezierCurveTo(468, 194, 488, 232, 488, 278); context.lineTo(488, 620);
    context.quadraticCurveTo(488, 650, 458, 650); context.lineTo(262, 650);
    context.quadraticCurveTo(232, 650, 232, 620); context.lineTo(232, 278);
    context.bezierCurveTo(232, 232, 252, 194, 300, 166); context.closePath(); context.fill(); context.stroke();
    context.fillStyle = labelColor; roundedRect(context, 248, 300, 224, 220, 20); context.fill();
    context.fillStyle = "#173f35"; roundedRect(context, 300, 65, 120, 55, 14); context.fill();
    return;
  }
  if (options.packagingType === "jar") {
    roundedRect(context, 205, 180, 310, 450, 62); context.fill(); context.stroke();
    context.fillStyle = labelColor; roundedRect(context, 220, 325, 280, 190, 20); context.fill();
    context.fillStyle = "#173f35"; roundedRect(context, 196, 135, 328, 92, 24); context.fill();
    return;
  }
  if (options.packagingType === "stand-up-pouch") {
    context.beginPath(); context.moveTo(218, 112); context.lineTo(502, 112); context.lineTo(535, 615);
    context.quadraticCurveTo(360, 670, 185, 615); context.closePath(); context.fill(); context.stroke();
    context.strokeStyle = labelColor; context.lineWidth = 12; context.beginPath(); context.moveTo(224, 148); context.lineTo(496, 148); context.stroke();
    return;
  }
  roundedRect(context, 180, 90, 360, 560, 28); context.fill(); context.stroke();
  context.strokeStyle = labelColor; context.lineWidth = 12; context.beginPath(); context.moveTo(205, 145); context.lineTo(515, 145); context.stroke();
  if ((options.windowScale ?? 0) > 0) {
    const scale = Math.max(0.45, Math.min(options.windowScale ?? 1, 1.35));
    context.fillStyle = "rgba(255, 248, 230, 0.82)";
    context.strokeStyle = "#173f35";
    context.lineWidth = 4;
    roundedRect(context, 360 - 112 * scale, 438 - 62 * scale, 224 * scale, 124 * scale, 35);
    context.fill(); context.stroke();
  }
}

function drawArtwork(context: CanvasRenderingContext2D, artwork: HTMLImageElement, options: DrawOptions): void {
  const scale = Math.max(0.45, Math.min(options.logoScale ?? 1, 1.8));
  const width = 190 * scale;
  const height = Math.min(190 * scale, width / (artwork.naturalWidth / artwork.naturalHeight || 1));
  const x = 360 - width / 2 + (options.logoPosition?.x ?? 0) * 145;
  const y = 315 - height / 2 - (options.logoPosition?.y ?? 0) * 145;
  context.drawImage(artwork, x, y, width, height);
}

function drawFrontText(context: CanvasRenderingContext2D, options: DrawOptions): void {
  const text = options.frontText;
  if (!text) return;
  const yOffset = -(options.logoPosition?.y ?? 0) * 120;
  context.textAlign = "center";
  context.fillStyle = options.labelColor ?? "#f2e8d5";
  context.font = "700 34px Arial, sans-serif";
  if (text.brand) context.fillText(text.brand, 360, 280 + yOffset, 270);
  context.font = "700 44px Arial, sans-serif";
  if (text.product) context.fillText(text.product, 360, 335 + yOffset, 300);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath(); context.roundRect(x, y, width, height, radius);
}

function ellipse(context: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, color: string): void {
  context.beginPath(); context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2); context.fillStyle = color; context.fill(); context.stroke();
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Package artwork could not be loaded."));
    image.src = source;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
