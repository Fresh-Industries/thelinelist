"use client";

import { Decal, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { MathUtils, RepeatWrapping, SRGBColorSpace } from "three";
import type { Vector3Tuple } from "./package-config";

type LogoArtworkProps = {
  logoUrl: string;
  logoAspect: number;
  logoScale: number;
  position: Vector3Tuple;
  rotation: number | Vector3Tuple;
  projectionDepth: number;
  mirrorX?: boolean;
};

export function LogoArtwork({
  logoUrl,
  logoAspect,
  logoScale,
  position,
  rotation,
  projectionDepth,
  mirrorX = false,
}: LogoArtworkProps) {
  const sourceTexture = useTexture(logoUrl);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  const texture = useMemo(() => {
    const preparedTexture = sourceTexture.clone();
    preparedTexture.colorSpace = SRGBColorSpace;
    preparedTexture.anisotropy = Math.min(8, maxAnisotropy);
    if (mirrorX) {
      preparedTexture.wrapS = RepeatWrapping;
      preparedTexture.repeat.x = -1;
      preparedTexture.offset.x = 1;
    }
    preparedTexture.needsUpdate = true;
    return preparedTexture;
  }, [maxAnisotropy, mirrorX, sourceTexture]);

  useEffect(() => () => texture.dispose(), [texture]);

  const decalScale = useMemo(() => {
    const safeAspect = MathUtils.clamp(logoAspect || 1, 0.25, 4);
    const width = safeAspect >= 1 ? logoScale : logoScale * safeAspect;
    const height = safeAspect >= 1 ? logoScale / safeAspect : logoScale;
    return [width, height, projectionDepth] as Vector3Tuple;
  }, [logoAspect, logoScale, projectionDepth]);

  return (
    <Decal
      position={position}
      rotation={rotation}
      scale={decalScale}
      map={texture}
      polygonOffsetFactor={-12}
      renderOrder={2}
    />
  );
}
