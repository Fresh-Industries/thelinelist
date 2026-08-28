"use client";

import { MathUtils } from "three";
import { LogoArtwork } from "../LogoArtwork";
import { packageConfigs } from "../package-config";
import type { PackageImplementationProps } from "../PackageRenderer";

function AluminumMaterial({ shade }: { shade: string }) {
  const material = packageConfigs["slim-can"].material.trim;
  return <meshPhysicalMaterial color={shade} {...material} />;
}

export function SlimCan({ baseColor, logoUrl, logoAspect, logoScale, logoPosition }: PackageImplementationProps) {
  const config = packageConfigs["slim-can"];
  const geometry = config.geometry;
  if (geometry.kind !== "slim-can") return null;

  const surface = config.logo.surface;
  if (surface.kind !== "cylindrical-decal") return null;
  const x = MathUtils.clamp(surface.anchorX + logoPosition.x, surface.anchorX + config.logo.horizontal.min, surface.anchorX + config.logo.horizontal.max);
  const y = surface.anchorY + MathUtils.clamp(logoPosition.y, config.logo.vertical.min, config.logo.vertical.max);
  const z = Math.sqrt(Math.max(surface.radius * surface.radius - x * x, 0)) + surface.surfaceOffset;

  return (
    <>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[geometry.radius, geometry.radius, geometry.bodyHeight, geometry.segments, geometry.bodyHeightSegments]} />
        <meshPhysicalMaterial color={baseColor} {...config.material.body} />
        {logoUrl ? (
          <LogoArtwork
            logoUrl={logoUrl}
            logoAspect={logoAspect}
            logoScale={logoScale}
            position={[x, y, z]}
            rotation={surface.rotation}
            projectionDepth={surface.projectionDepth}
            mirrorX={surface.mirrorX}
          />
        ) : null}
      </mesh>

      <mesh position={[0, geometry.topShoulder.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.topShoulder.topRadius, geometry.topShoulder.bottomRadius, geometry.topShoulder.height, geometry.segments]} />
        <meshPhysicalMaterial color={baseColor} {...config.material.secondary} />
      </mesh>
      <mesh position={[0, geometry.topNeck.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.topNeck.topRadius, geometry.topNeck.bottomRadius, geometry.topNeck.height, geometry.segments]} />
        <AluminumMaterial shade={config.colors.neck} />
      </mesh>
      <mesh position={[0, geometry.topLid.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.topLid.radius, geometry.topLid.radius, geometry.topLid.height, geometry.segments]} />
        <AluminumMaterial shade={config.colors.lid} />
      </mesh>
      <mesh position={[0, geometry.topRim.y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.topRim.radius, geometry.topRim.tube, 18, geometry.segments]} />
        <AluminumMaterial shade={config.colors.rim} />
      </mesh>

      <mesh position={geometry.tab.position} rotation={geometry.tab.rotation} scale={geometry.tab.scale} castShadow>
        <torusGeometry args={[geometry.tab.radius, geometry.tab.tube, 14, 56]} />
        <AluminumMaterial shade={config.colors.tab} />
      </mesh>
      <mesh position={geometry.rivet.position} castShadow>
        <cylinderGeometry args={[geometry.rivet.radius, geometry.rivet.radius, geometry.rivet.height, 36]} />
        <AluminumMaterial shade={config.colors.rivet} />
      </mesh>

      <mesh position={[0, geometry.bottomShoulder.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.bottomShoulder.topRadius, geometry.bottomShoulder.bottomRadius, geometry.bottomShoulder.height, geometry.segments]} />
        <meshPhysicalMaterial color={baseColor} {...config.material.secondary} />
      </mesh>
      <mesh position={[0, geometry.bottomFoot.y, 0]} castShadow>
        <cylinderGeometry args={[geometry.bottomFoot.topRadius, geometry.bottomFoot.bottomRadius, geometry.bottomFoot.height, geometry.segments]} />
        <AluminumMaterial shade={config.colors.foot} />
      </mesh>
      <mesh position={[0, geometry.bottomRim.y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[geometry.bottomRim.radius, geometry.bottomRim.tube, 16, geometry.segments]} />
        <AluminumMaterial shade={config.colors.bottomRim} />
      </mesh>
    </>
  );
}
