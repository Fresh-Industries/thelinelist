"use client";

import { DoubleSide, FrontSide } from "three";
import type { BottleFinish } from "../package-config";

type SurfaceMaterial = {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
};

type ClearSurfaceMaterial = SurfaceMaterial & {
  opacity: number;
  transmission: number;
  thickness: number;
  ior: number;
};

type FinishableBodyMaterialProps = {
  finish: BottleFinish;
  color: string;
  clearColor: string;
  coloredMaterial: SurfaceMaterial;
  clearMaterial: ClearSurfaceMaterial;
};

export function FinishableBodyMaterial({
  finish,
  color,
  clearColor,
  coloredMaterial,
  clearMaterial,
}: FinishableBodyMaterialProps) {
  const isClear = finish === "clear";
  const material = isClear ? clearMaterial : coloredMaterial;

  return (
    <meshPhysicalMaterial
      key={finish}
      color={isClear ? clearColor : color}
      roughness={material.roughness}
      metalness={material.metalness}
      clearcoat={material.clearcoat}
      clearcoatRoughness={material.clearcoatRoughness}
      transparent={isClear}
      opacity={isClear ? clearMaterial.opacity : 1}
      transmission={isClear ? clearMaterial.transmission : 0}
      thickness={isClear ? clearMaterial.thickness : 0}
      ior={isClear ? clearMaterial.ior : 1.5}
      depthWrite={!isClear}
      side={isClear ? DoubleSide : FrontSide}
    />
  );
}
