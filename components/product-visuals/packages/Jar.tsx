"use client";

import { DoubleSide, MathUtils, Vector2 } from "three";
import { LogoArtwork } from "../LogoArtwork";
import { packageConfigs } from "../package-config";
import type { PackageImplementationProps } from "../PackageRenderer";
import { FinishableBodyMaterial } from "./FinishableBodyMaterial";

const jarConfig = packageConfigs.jar;
if (jarConfig.geometry.kind !== "jar") {
  throw new Error("Jar package configuration has the wrong geometry kind.");
}
if (jarConfig.logo.surface.kind !== "cylindrical-decal") {
  throw new Error("Jar package configuration has the wrong logo surface.");
}
const jarGeometry = jarConfig.geometry;
const jarLogoSurface = jarConfig.logo.surface;
const configuredGlassMaterial = jarConfig.material.clearBody;
if (!configuredGlassMaterial) {
  throw new Error("Jar package configuration is missing its glass material.");
}
const glassMaterial = configuredGlassMaterial;
const jarProfile = jarGeometry.profile.map(([radius, y]) => new Vector2(radius, y));

export function Jar({
  baseColor,
  labelColor,
  bottleFinish,
  logoUrl,
  logoAspect,
  logoScale,
  logoPosition,
}: PackageImplementationProps) {
  const config = jarConfig;
  const geometry = jarGeometry;
  const surface = jarLogoSurface;
  const x = MathUtils.clamp(
    surface.anchorX + logoPosition.x,
    surface.anchorX + config.logo.horizontal.min,
    surface.anchorX + config.logo.horizontal.max,
  );
  const y = surface.anchorY + MathUtils.clamp(logoPosition.y, config.logo.vertical.min, config.logo.vertical.max);
  const z = Math.sqrt(Math.max(surface.radius * surface.radius - x * x, 0)) + surface.surfaceOffset;

  return (
    <>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[jarProfile, geometry.segments]} />
        <FinishableBodyMaterial
          finish={bottleFinish}
          color={baseColor}
          clearColor={config.colors.glass}
          coloredMaterial={config.material.body}
          clearMaterial={glassMaterial}
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
      {[geometry.label.y + geometry.label.height / 2, geometry.label.y - geometry.label.height / 2].map((ringY) => (
        <mesh key={ringY} position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[geometry.label.radius - geometry.label.edgeTube, geometry.label.edgeTube, 12, geometry.segments]} />
          <meshPhysicalMaterial color={config.colors.labelEdge} {...config.material.secondary} />
        </mesh>
      ))}

      <mesh position={[0, geometry.lid.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.lid.radius, geometry.lid.radius, geometry.lid.height, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.lid} {...config.material.trim} />
      </mesh>
      <mesh position={[0, geometry.lid.y - geometry.lid.height / 2 + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.lid.ringRadius, geometry.lid.ringTube, 12, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.lidEdge} {...config.material.trim} />
      </mesh>
      <mesh position={[0, geometry.baseRing.y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.baseRing.radius, geometry.baseRing.tube, 12, geometry.segments]} />
        <meshPhysicalMaterial color={config.colors.baseRing} {...config.material.trim} />
      </mesh>
    </>
  );
}
