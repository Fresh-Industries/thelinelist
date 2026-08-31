"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { CanvasTexture, MathUtils, SRGBColorSpace } from "three";
import type { PackageFrontText } from "@/lib/sourcing/types";
import type { Vector3Tuple } from "./package-config";

type FrontTextArtworkProps = {
  frontText: PackageFrontText;
  logoScale: number;
  position: Vector3Tuple;
};

export function FrontTextArtwork({ frontText, logoScale, position }: FrontTextArtworkProps) {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const invalidate = useThree((state) => state.invalidate);
  const brand = frontText.brand.trim();
  const product = frontText.product.trim();
  const texture = useMemo(
    () => createFrontTextTexture(brand, product, maxAnisotropy),
    [brand, maxAnisotropy, product],
  );

  useEffect(() => {
    invalidate();
    return () => texture.dispose();
  }, [invalidate, texture]);

  if (!brand && !product) return null;

  const width = MathUtils.clamp(1.65 * logoScale, 0.88, 1.94);
  return (
    <mesh position={position} renderOrder={3}>
      <planeGeometry args={[width, width / 2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-14}
        toneMapped={false}
      />
    </mesh>
  );
}

function createFrontTextTexture(brand: string, product: string, maxAnisotropy: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Package front text needs Canvas 2D support.");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (brand) {
    context.fillStyle = "#173b31";
    context.font = `800 ${fitFontSize(context, brand, 850, 118, 42)}px Arial, sans-serif`;
    context.fillText(brand, canvas.width / 2, product ? 178 : 256);
  }
  if (product) {
    context.fillStyle = "#5b3525";
    context.font = `700 ${fitFontSize(context, product, 860, brand ? 78 : 108, 34)}px Arial, sans-serif`;
    context.fillText(product, canvas.width / 2, brand ? 328 : 256);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

function fitFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
): number {
  for (let size = maxSize; size > minSize; size -= 2) {
    context.font = `800 ${size}px Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}
