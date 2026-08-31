"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { packageConfigs } from "./package-config";
import { StudioScene } from "./StudioScene";
import type { ProductMockupProps } from "./ProductMockup";

export default function ProductMockupCanvas({
  packagingType,
  logoUrl,
  logoAspect = 1,
  baseColor,
  labelColor = packageConfigs.bottle.colors.label,
  bottleFinish = "colored",
  logoScale,
  logoPosition = { x: 0, y: 0 },
  frontText = null,
  windowScale = 0,
  sceneKey = 0,
  variant = "studio",
  onCaptureReady,
}: ProductMockupProps) {
  const config = packageConfigs[packagingType];
  const thumbnail = variant === "thumbnail";

  return (
    <Canvas
      key={sceneKey}
      aria-label={thumbnail ? `Saved 3D ${config.label.toLowerCase()} packaging direction` : `Interactive 3D ${config.label.toLowerCase()} package preview`}
      camera={{ position: config.camera.position, fov: config.camera.fov, near: 0.1, far: 40 }}
      dpr={thumbnail ? [1.5, 2] : [1, 1.75]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      shadows
      fallback={<p className="product-mockup-error">This preview needs a browser with WebGL support.</p>}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor(0x000000, 0);
        onCaptureReady?.(async () => {
          for (let attempt = 0; attempt < 40; attempt += 1) {
            gl.render(scene, camera);
            if (canvasHasVisibleContent(gl.domElement)) {
              const dataUrl = gl.domElement.toDataURL("image/png");
              return fetch(dataUrl).then((response) => response.blob()).catch(() => null);
            }
            await new Promise((resolve) => window.setTimeout(resolve, 100));
          }
          return null;
        });
      }}
    >
      <Suspense fallback={null}>
        <StudioScene
          packagingType={packagingType}
          logoUrl={logoUrl}
          logoAspect={logoAspect}
          baseColor={baseColor ?? config.defaultColor}
          labelColor={labelColor}
          bottleFinish={bottleFinish}
          logoScale={logoScale ?? config.logo.defaultScale}
          logoPosition={logoPosition}
          frontText={frontText}
          windowScale={windowScale}
          interactive={!thumbnail}
          shadowResolution={256}
        />
      </Suspense>
    </Canvas>
  );
}

function canvasHasVisibleContent(source: HTMLCanvasElement): boolean {
  const sample = document.createElement("canvas");
  sample.width = 48;
  sample.height = 48;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.clearRect(0, 0, sample.width, sample.height);
  context.drawImage(source, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let visible = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 8) visible += 1;
  }
  return visible / (sample.width * sample.height) > 0.01;
}
