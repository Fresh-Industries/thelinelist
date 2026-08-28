"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Color, MathUtils, Mesh } from "three";
import type { GLTF } from "three-stdlib";
import { LogoArtwork } from "../LogoArtwork";
import { packageConfigs } from "../package-config";
import type { PackageImplementationProps } from "../PackageRenderer";

const pouchConfig = packageConfigs["stand-up-pouch"];
if (pouchConfig.implementation.kind !== "gltf") {
  throw new Error("Stand-up pouch configuration must use a GLB implementation.");
}
if (pouchConfig.geometry.kind !== "gltf-model") {
  throw new Error("Stand-up pouch configuration has the wrong geometry kind.");
}
if (pouchConfig.logo.surface.kind !== "flat-decal") {
  throw new Error("Stand-up pouch configuration has the wrong logo surface.");
}

const pouchImplementation = pouchConfig.implementation;
const pouchLogoSurface = pouchConfig.logo.surface;

type StandUpPouchModel = GLTF & {
  nodes: Record<string, Mesh>;
};

function modelMesh(nodes: StandUpPouchModel["nodes"], name: string) {
  const node = nodes[name];
  if (!node?.isMesh) throw new Error(`Stand-up pouch GLB is missing the ${name} mesh.`);
  return node;
}

export function StandUpPouch({ baseColor, logoUrl, logoAspect, logoScale, logoPosition }: PackageImplementationProps) {
  const { nodes } = useGLTF(pouchImplementation.modelUrl) as unknown as StandUpPouchModel;
  const body = modelMesh(nodes, pouchImplementation.parts.body);
  const sideGussets = modelMesh(nodes, pouchImplementation.parts.sideGussets);
  const bottomGusset = modelMesh(nodes, pouchImplementation.parts.bottomGusset);
  const heatSeal = modelMesh(nodes, pouchImplementation.parts.heatSeal);
  const artworkSurface = modelMesh(nodes, pouchImplementation.artworkNode);

  const seamColor = useMemo(() => new Color(baseColor).lerp(new Color("#fff6e8"), 0.15).getStyle(), [baseColor]);
  const gussetColor = useMemo(() => new Color(baseColor).lerp(new Color("#173b31"), 0.13).getStyle(), [baseColor]);
  const x =
    pouchLogoSurface.anchorX +
    MathUtils.clamp(logoPosition.x, pouchConfig.logo.horizontal.min, pouchConfig.logo.horizontal.max);
  const y =
    pouchLogoSurface.anchorY +
    MathUtils.clamp(logoPosition.y, pouchConfig.logo.vertical.min, pouchConfig.logo.vertical.max);

  return (
    <group name="StandUpPouch">
      <mesh name="PouchBody" geometry={body.geometry} castShadow receiveShadow>
        <meshPhysicalMaterial color={baseColor} {...pouchConfig.material.body} />
      </mesh>
      <mesh name="SideGussets" geometry={sideGussets.geometry} castShadow receiveShadow>
        <meshPhysicalMaterial color={gussetColor} {...pouchConfig.material.secondary} />
      </mesh>
      <mesh name="BottomGusset" geometry={bottomGusset.geometry} castShadow receiveShadow>
        <meshPhysicalMaterial color={gussetColor} {...pouchConfig.material.secondary} />
      </mesh>
      <mesh name="HeatSeal" geometry={heatSeal.geometry} castShadow receiveShadow>
        <meshPhysicalMaterial color={seamColor} {...pouchConfig.material.trim} />
      </mesh>
      <mesh name="ArtworkSurface" geometry={artworkSurface.geometry}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        {logoUrl ? (
          <LogoArtwork
            logoUrl={logoUrl}
            logoAspect={logoAspect}
            logoScale={logoScale}
            position={[x, y, pouchLogoSurface.z]}
            rotation={pouchLogoSurface.rotation}
            projectionDepth={pouchLogoSurface.projectionDepth}
            mirrorX={pouchLogoSurface.mirrorX}
          />
        ) : null}
      </mesh>
    </group>
  );
}

useGLTF.preload(pouchImplementation.modelUrl);
