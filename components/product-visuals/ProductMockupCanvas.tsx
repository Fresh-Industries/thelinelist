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
  sceneKey = 0,
  variant = "studio",
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
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      shadows
      fallback={<p className="product-mockup-error">This preview needs a browser with WebGL support.</p>}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
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
          interactive={!thumbnail}
          shadowResolution={256}
        />
      </Suspense>
    </Canvas>
  );
}
