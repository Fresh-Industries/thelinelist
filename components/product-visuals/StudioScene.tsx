"use client";

import { ContactShadows, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { PackageFrontText } from "@/lib/sourcing/types";
import { packageConfigs, type BottleFinish, type PackagingType } from "./package-config";
import { PackageRenderer } from "./PackageRenderer";

type StudioSceneProps = {
  packagingType: PackagingType;
  logoUrl?: string;
  logoAspect: number;
  baseColor: string;
  labelColor: string;
  bottleFinish: BottleFinish;
  logoScale: number;
  logoPosition: { x: number; y: number };
  frontText: PackageFrontText | null;
  windowScale: number;
  interactive?: boolean;
  shadowResolution?: number;
};

export function StudioScene({
  packagingType,
  logoUrl,
  logoAspect,
  baseColor,
  labelColor,
  bottleFinish,
  logoScale,
  logoPosition,
  frontText,
  windowScale,
  interactive = true,
  shadowResolution = 256,
}: StudioSceneProps) {
  const config = packageConfigs[packagingType];

  return (
    <>
      <PerspectiveCamera
        key={`camera-${packagingType}`}
        makeDefault
        position={config.camera.position}
        fov={config.camera.fov}
        near={0.1}
        far={40}
      />
      <hemisphereLight color="#fff6e8" groundColor="#718478" intensity={1.55} />
      <directionalLight color="#ffe1a3" intensity={3.1} position={[4.5, 5.5, 5]} />
      <directionalLight color="#cdebe3" intensity={1.65} position={[-4, 1.5, 3]} />
      <pointLight color="#f8b39b" intensity={11} distance={12} position={[-3.5, 3.2, -3]} />

      <group position={config.object.position} rotation={config.object.rotation} scale={config.object.scale}>
        <PackageRenderer
          packagingType={packagingType}
          baseColor={baseColor}
          labelColor={labelColor}
          bottleFinish={bottleFinish}
          logoUrl={logoUrl}
          logoAspect={logoAspect}
          logoScale={logoScale}
          logoPosition={logoPosition}
          frontText={frontText}
          windowScale={windowScale}
        />
      </group>

      <ContactShadows
        position={config.shadow.position}
        opacity={config.shadow.opacity}
        scale={config.shadow.scale}
        blur={config.shadow.blur}
        far={config.shadow.far}
        resolution={shadowResolution}
        color="#14352b"
        frames={1}
      />
      <OrbitControls
        key={`controls-${packagingType}`}
        makeDefault={interactive}
        enabled={interactive}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={config.camera.minPolarAngle}
        maxPolarAngle={config.camera.maxPolarAngle}
        target={config.camera.target}
      />
    </>
  );
}
