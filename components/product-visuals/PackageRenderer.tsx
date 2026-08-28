"use client";

import type { ComponentType } from "react";
import { PACKAGING_TYPES, packageConfigs, type BottleFinish, type PackagingType } from "./package-config";
import { Bottle } from "./packages/Bottle";
import { Jar } from "./packages/Jar";
import { SlimCan } from "./packages/SlimCan";
import { StandUpPouch } from "./packages/StandUpPouch";

export type PackageImplementationProps = {
  baseColor: string;
  labelColor: string;
  bottleFinish: BottleFinish;
  logoUrl?: string;
  logoAspect: number;
  logoScale: number;
  logoPosition: { x: number; y: number };
};

type RegisteredPackageImplementation = {
  kind: "procedural" | "gltf";
  Component: ComponentType<PackageImplementationProps>;
};

const packageImplementations: Record<PackagingType, RegisteredPackageImplementation> = {
  "slim-can": { kind: "procedural", Component: SlimCan },
  bottle: { kind: "procedural", Component: Bottle },
  jar: { kind: "procedural", Component: Jar },
  "stand-up-pouch": { kind: "gltf", Component: StandUpPouch },
};

for (const packagingType of PACKAGING_TYPES) {
  if (packageImplementations[packagingType].kind !== packageConfigs[packagingType].implementation.kind) {
    throw new Error(`${packagingType} package implementation does not match its registry configuration.`);
  }
}

export function PackageRenderer({
  packagingType,
  ...props
}: PackageImplementationProps & { packagingType: PackagingType }) {
  const PackageComponent = packageImplementations[packagingType].Component;
  return <PackageComponent {...props} />;
}
