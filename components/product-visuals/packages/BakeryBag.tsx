"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { Color, DoubleSide, MathUtils } from "three";
import { FrontTextArtwork } from "../FrontTextArtwork";
import { LogoArtwork } from "../LogoArtwork";
import { packageConfigs } from "../package-config";
import type { PackageImplementationProps } from "../PackageRenderer";

const bakeryBagConfig = packageConfigs["bakery-bag"];
if (bakeryBagConfig.geometry.kind !== "bakery-bag") {
  throw new Error("Bakery bag configuration has the wrong geometry kind.");
}
if (bakeryBagConfig.logo.surface.kind !== "flat-decal") {
  throw new Error("Bakery bag configuration has the wrong front artwork surface.");
}
if (!bakeryBagConfig.window) {
  throw new Error("Bakery bag configuration must define a viewing window.");
}

const geometry = bakeryBagConfig.geometry;
const logoSurface = bakeryBagConfig.logo.surface;
const windowConfig = bakeryBagConfig.window;

export function BakeryBag({
  baseColor,
  logoUrl,
  logoAspect,
  logoScale,
  logoPosition,
  frontText,
  windowScale,
}: PackageImplementationProps) {
  const edgeColor = useMemo(
    () => new Color(baseColor).lerp(new Color(bakeryBagConfig.colors.seam), 0.28).getStyle(),
    [baseColor],
  );
  const normalizedWindowScale = MathUtils.clamp(windowScale, windowConfig.scale.min, windowConfig.scale.max);
  const openingWidth = geometry.opening.maxWidth * normalizedWindowScale;
  const openingHeight = geometry.opening.maxHeight * normalizedWindowScale;
  const sidePanelWidth = (geometry.width - openingWidth) / 2;
  const openingTop = geometry.opening.centerY + openingHeight / 2;
  const openingBottom = geometry.opening.centerY - openingHeight / 2;
  const bagTop = geometry.height / 2;
  const bagBottom = -geometry.height / 2;
  const upperPanelHeight = bagTop - openingTop;
  const lowerPanelHeight = openingBottom - bagBottom;
  const frontZ = geometry.depth / 2 + geometry.panelThickness / 2;
  const artworkX = logoSurface.anchorX
    + MathUtils.clamp(logoPosition.x, bakeryBagConfig.logo.horizontal.min, bakeryBagConfig.logo.horizontal.max);
  const artworkY = logoSurface.anchorY
    + MathUtils.clamp(logoPosition.y, bakeryBagConfig.logo.vertical.min, bakeryBagConfig.logo.vertical.max);
  const hasFrontText = Boolean(frontText?.brand.trim() || frontText?.product.trim());

  return (
    <group name="BakeryBag">
      <PaperPanel
        name="BagBack"
        color={baseColor}
        position={[0, 0, -geometry.depth / 2]}
        size={[geometry.width, geometry.height, geometry.panelThickness]}
      />
      <PaperPanel
        name="BagLeftSide"
        color={edgeColor}
        position={[-geometry.width / 2, 0, 0]}
        size={[geometry.panelThickness, geometry.height, geometry.depth]}
        secondary
      />
      <PaperPanel
        name="BagRightSide"
        color={edgeColor}
        position={[geometry.width / 2, 0, 0]}
        size={[geometry.panelThickness, geometry.height, geometry.depth]}
        secondary
      />
      <PaperPanel
        name="BagTopFold"
        color={edgeColor}
        position={[0, bagTop, 0]}
        size={[geometry.width, geometry.panelThickness, geometry.depth]}
        trim
      />
      <PaperPanel
        name="BagBottomFold"
        color={edgeColor}
        position={[0, bagBottom, 0]}
        size={[geometry.width, geometry.panelThickness, geometry.depth]}
        trim
      />

      <PaperPanel
        name="BagFrontUpper"
        color={baseColor}
        position={[0, openingTop + upperPanelHeight / 2, frontZ]}
        size={[geometry.width, upperPanelHeight, geometry.panelThickness]}
      />
      <PaperPanel
        name="BagFrontLower"
        color={baseColor}
        position={[0, bagBottom + lowerPanelHeight / 2, frontZ]}
        size={[geometry.width, lowerPanelHeight, geometry.panelThickness]}
      />
      <PaperPanel
        name="BagFrontLeft"
        color={baseColor}
        position={[-(openingWidth + sidePanelWidth) / 2, geometry.opening.centerY, frontZ]}
        size={[sidePanelWidth, openingHeight, geometry.panelThickness]}
      />
      <PaperPanel
        name="BagFrontRight"
        color={baseColor}
        position={[(openingWidth + sidePanelWidth) / 2, geometry.opening.centerY, frontZ]}
        size={[sidePanelWidth, openingHeight, geometry.panelThickness]}
      />

      <RoundedBox
        name="VisibleBreadLoaf"
        args={[1.44, 0.56, 0.76]}
        radius={0.16}
        smoothness={5}
        position={[0, geometry.opening.centerY - 0.08, 0.08]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color={bakeryBagConfig.colors.loaf} roughness={0.72} clearcoat={0.08} clearcoatRoughness={0.78} />
      </RoundedBox>
      <RoundedBox
        name="BreadLoafTop"
        args={[1.28, 0.18, 0.66]}
        radius={0.08}
        smoothness={4}
        position={[0, geometry.opening.centerY + 0.17, 0.11]}
      >
        <meshStandardMaterial color={bakeryBagConfig.colors.loafTop} roughness={0.76} />
      </RoundedBox>
      {[-0.36, 0, 0.36].map((x) => (
        <RoundedBox
          key={x}
          name="BreadScore"
          args={[0.065, 0.4, 0.025]}
          radius={0.015}
          smoothness={3}
          position={[x, geometry.opening.centerY + 0.04, frontZ + geometry.panelThickness * 0.9]}
          rotation={[0, 0, -0.42]}
        >
          <meshStandardMaterial color="#6f351e" roughness={0.82} />
        </RoundedBox>
      ))}

      <mesh name="ClearViewingWindow" position={[0, geometry.opening.centerY, frontZ + geometry.panelThickness * 0.62]}>
        <planeGeometry args={[openingWidth, openingHeight]} />
        <meshPhysicalMaterial
          color={bakeryBagConfig.colors.window}
          transparent
          opacity={0.12}
          transmission={0.78}
          thickness={0.025}
          roughness={0.16}
          clearcoat={0.7}
          clearcoatRoughness={0.2}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <WindowFrame width={openingWidth} height={openingHeight} z={frontZ + geometry.panelThickness * 0.72} />

      <mesh name="BakeryBagArtworkSurface" position={[0, 0, frontZ + geometry.panelThickness * 0.68]}>
        <planeGeometry args={[geometry.width - 0.16, geometry.height - 0.16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        {logoUrl ? (
          <LogoArtwork
            logoUrl={logoUrl}
            logoAspect={logoAspect}
            logoScale={logoScale * (hasFrontText ? 0.5 : 1)}
            position={[artworkX, artworkY + (hasFrontText ? logoScale * 0.23 : 0), 0.02]}
            rotation={logoSurface.rotation}
            projectionDepth={logoSurface.projectionDepth}
            mirrorX={logoSurface.mirrorX}
          />
        ) : null}
      </mesh>
      {hasFrontText && frontText ? (
        <FrontTextArtwork
          frontText={frontText}
          logoScale={logoScale * (logoUrl ? 0.72 : 1)}
          position={[artworkX, artworkY - (logoUrl ? logoScale * 0.16 : 0), frontZ + geometry.panelThickness * 0.86]}
        />
      ) : null}
    </group>
  );
}

function WindowFrame({ width, height, z }: { width: number; height: number; z: number }) {
  const thickness = 0.025;
  const color = "#f4e5c8";
  return (
    <group name="ClearWindowEdge" position={[0, geometry.opening.centerY, z]}>
      <mesh position={[0, height / 2, 0]}><boxGeometry args={[width, thickness, thickness]} /><meshStandardMaterial color={color} transparent opacity={0.62} /></mesh>
      <mesh position={[0, -height / 2, 0]}><boxGeometry args={[width, thickness, thickness]} /><meshStandardMaterial color={color} transparent opacity={0.62} /></mesh>
      <mesh position={[-width / 2, 0, 0]}><boxGeometry args={[thickness, height, thickness]} /><meshStandardMaterial color={color} transparent opacity={0.62} /></mesh>
      <mesh position={[width / 2, 0, 0]}><boxGeometry args={[thickness, height, thickness]} /><meshStandardMaterial color={color} transparent opacity={0.62} /></mesh>
    </group>
  );
}

function PaperPanel({
  name,
  color,
  position,
  size,
  secondary = false,
  trim = false,
}: {
  name: string;
  color: string;
  position: [number, number, number];
  size: [number, number, number];
  secondary?: boolean;
  trim?: boolean;
}) {
  const material = trim
    ? bakeryBagConfig.material.trim
    : secondary
      ? bakeryBagConfig.material.secondary
      : bakeryBagConfig.material.body;
  return (
    <mesh name={name} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color={color} {...material} />
    </mesh>
  );
}
