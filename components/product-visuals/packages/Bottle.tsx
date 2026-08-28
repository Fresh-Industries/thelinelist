"use client";

import { DoubleSide, MathUtils, Vector2 } from "three";
import { LogoArtwork } from "../LogoArtwork";
import { packageConfigs } from "../package-config";
import type { PackageImplementationProps } from "../PackageRenderer";
import { FinishableBodyMaterial } from "./FinishableBodyMaterial";

const bottleConfig = packageConfigs.bottle;
if (bottleConfig.geometry.kind !== "bottle") {
  throw new Error("Bottle package configuration has the wrong geometry kind.");
}
const bottleGeometry = bottleConfig.geometry;
const configuredBottleLogoSurface = bottleConfig.logo.surface;
if (configuredBottleLogoSurface.kind !== "cylindrical-decal") {
  throw new Error("Bottle package configuration has the wrong logo surface.");
}
const bottleLogoSurface = configuredBottleLogoSurface;
const configuredClearBodyMaterial = bottleConfig.material.clearBody;
if (!configuredClearBodyMaterial) {
  throw new Error("Bottle package configuration is missing its clear material.");
}
const clearBodyMaterial = configuredClearBodyMaterial;
const bottleProfile = bottleGeometry.profile.map(([radius, y]) => new Vector2(radius, y));

export function Bottle({
  baseColor,
  labelColor,
  bottleFinish,
  logoUrl,
  logoAspect,
  logoScale,
  logoPosition,
}: PackageImplementationProps) {
  const config = bottleConfig;
  const geometry = bottleGeometry;
  const surface = bottleLogoSurface;
  const x = MathUtils.clamp(surface.anchorX + logoPosition.x, surface.anchorX + config.logo.horizontal.min, surface.anchorX + config.logo.horizontal.max);
  const y = surface.anchorY + MathUtils.clamp(logoPosition.y, config.logo.vertical.min, config.logo.vertical.max);
  const z = Math.sqrt(Math.max(surface.radius * surface.radius - x * x, 0)) + surface.surfaceOffset;

  return (
    <>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[bottleProfile, geometry.segments]} />
        <FinishableBodyMaterial
          finish={bottleFinish}
          color={baseColor}
          clearColor="#dcefeb"
          coloredMaterial={config.material.body}
          clearMaterial={clearBodyMaterial}
        />
      </mesh>

      <mesh position={[0, geometry.label.y, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[geometry.label.radius, geometry.label.radius, geometry.label.height, geometry.segments, 1, true]} />
        <meshPhysicalMaterial color={labelColor} side={DoubleSide} {...config.material.secondary} />
        {logoUrl ? (
          <LogoArtwork
            logoUrl={logoUrl}
            logoAspect={logoAspect}
            logoScale={logoScale}
            position={[x, y - geometry.label.y, z]}
            rotation={surface.rotation}
            projectionDepth={surface.projectionDepth}
            mirrorX={surface.mirrorX}
          />
        ) : null}
      </mesh>
      <mesh position={[0, geometry.label.y + geometry.label.height / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.label.radius - geometry.label.edgeTube, geometry.label.edgeTube, 12, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.labelEdge} {...config.material.secondary} />
      </mesh>
      <mesh position={[0, geometry.label.y - geometry.label.height / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.label.radius - geometry.label.edgeTube, geometry.label.edgeTube, 12, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.labelEdge} {...config.material.secondary} />
      </mesh>

      <mesh position={[0, geometry.cap.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.cap.radius, geometry.cap.radius, geometry.cap.height, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.cap} {...config.material.trim} />
      </mesh>
      {[geometry.cap.topRingY, geometry.cap.bottomRingY].map((ringY) => (
        <mesh key={ringY} position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[geometry.cap.ringRadius, geometry.cap.ringTube, 12, geometry.segments]} />
          <meshPhysicalMaterial color={config.colors.capEdge} {...config.material.trim} />
        </mesh>
      ))}
      <mesh position={[0, geometry.baseRing.y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.baseRing.radius, geometry.baseRing.tube, 12, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.baseRing} {...config.material.trim} />
      </mesh>
    </>
  );
}
