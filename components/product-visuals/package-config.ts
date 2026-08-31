export const PACKAGING_TYPES = ["slim-can", "bottle", "jar", "stand-up-pouch", "bakery-bag"] as const;

export type PackagingType = (typeof PACKAGING_TYPES)[number];
export type BottleFinish = "colored" | "clear";
export type Vector3Tuple = [number, number, number];

type RangeConfig = {
  min: number;
  max: number;
  step: number;
};

type SurfaceMaterialConfig = {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
};

type ClearSurfaceMaterialConfig = SurfaceMaterialConfig & {
  opacity: number;
  transmission: number;
  thickness: number;
  ior: number;
};

type CylindricalLogoSurface = {
  kind: "cylindrical-decal";
  radius: number;
  surfaceOffset: number;
  anchorX: number;
  anchorY: number;
  rotation: number;
  projectionDepth: number;
  mirrorX: boolean;
};

type FlatLogoSurface = {
  kind: "flat-decal";
  anchorX: number;
  anchorY: number;
  z: number;
  rotation: Vector3Tuple;
  projectionDepth: number;
  mirrorX: boolean;
};

export type PackageImplementation =
  | { kind: "procedural" }
  | {
      kind: "gltf";
      modelUrl: string;
      artworkNode: string;
      parts: Record<string, string>;
    };

export type PackageLogoConfig = {
  defaultScale: number;
  scale: RangeConfig;
  horizontal: RangeConfig;
  vertical: RangeConfig;
  surface: CylindricalLogoSurface | FlatLogoSurface;
};

export type PackageWindowConfig = {
  defaultScale: number;
  scale: RangeConfig;
};

type SlimCanGeometryConfig = {
  kind: "slim-can";
  segments: number;
  radius: number;
  bodyHeight: number;
  bodyHeightSegments: number;
  topShoulder: { topRadius: number; bottomRadius: number; height: number; y: number };
  topNeck: { topRadius: number; bottomRadius: number; height: number; y: number };
  topLid: { radius: number; height: number; y: number };
  topRim: { radius: number; tube: number; y: number };
  tab: { radius: number; tube: number; position: Vector3Tuple; rotation: Vector3Tuple; scale: Vector3Tuple };
  rivet: { radius: number; height: number; position: Vector3Tuple };
  bottomShoulder: { topRadius: number; bottomRadius: number; height: number; y: number };
  bottomFoot: { topRadius: number; bottomRadius: number; height: number; y: number };
  bottomRim: { radius: number; tube: number; y: number };
};

type BottleGeometryConfig = {
  kind: "bottle";
  segments: number;
  profile: Array<[number, number]>;
  label: { radius: number; height: number; y: number; edgeTube: number };
  cap: { radius: number; height: number; y: number; ringRadius: number; ringTube: number; topRingY: number; bottomRingY: number };
  baseRing: { radius: number; tube: number; y: number };
};

type JarGeometryConfig = {
  kind: "jar";
  segments: number;
  profile: Array<[number, number]>;
  label: { radius: number; height: number; y: number; edgeTube: number };
  lid: { radius: number; height: number; y: number; ringRadius: number; ringTube: number };
  baseRing: { radius: number; tube: number; y: number };
};

type GltfModelGeometryConfig = { kind: "gltf-model" };

type BakeryBagGeometryConfig = {
  kind: "bakery-bag";
  width: number;
  height: number;
  depth: number;
  panelThickness: number;
  opening: {
    centerY: number;
    maxWidth: number;
    maxHeight: number;
  };
};

type PackageGeometryConfig = SlimCanGeometryConfig | BottleGeometryConfig | JarGeometryConfig | GltfModelGeometryConfig | BakeryBagGeometryConfig;

export type PackageConfig = {
  id: PackagingType;
  implementation: PackageImplementation;
  label: string;
  previewTitle: string;
  shortName: string;
  defaultColor: string;
  appearance: {
    baseColorLabel: string;
    supportsLabelColor: boolean;
    supportsClearFinish: boolean;
  };
  camera: {
    position: Vector3Tuple;
    target: Vector3Tuple;
    fov: number;
    minPolarAngle: number;
    maxPolarAngle: number;
  };
  object: {
    position: Vector3Tuple;
    rotation: Vector3Tuple;
    scale: Vector3Tuple;
  };
  shadow: {
    position: Vector3Tuple;
    scale: number;
    opacity: number;
    blur: number;
    far: number;
  };
  logo: PackageLogoConfig;
  window?: PackageWindowConfig;
  material: {
    body: SurfaceMaterialConfig;
    clearBody?: ClearSurfaceMaterialConfig;
    secondary: SurfaceMaterialConfig;
    trim: SurfaceMaterialConfig;
  };
  colors: Record<string, string>;
  geometry: PackageGeometryConfig;
};

export const packageConfigs: Record<PackagingType, PackageConfig> = {
  "slim-can": {
    id: "slim-can",
    implementation: { kind: "procedural" },
    label: "Slim Can",
    previewTitle: "Slim aluminum can",
    shortName: "can",
    defaultColor: "#25b7b8",
    appearance: { baseColorLabel: "Package color", supportsLabelColor: false, supportsClearFinish: false },
    camera: {
      position: [3, 1.75, 7],
      target: [0, 0.02, 0],
      fov: 32,
      minPolarAngle: Math.PI / 3.2,
      maxPolarAngle: Math.PI / 1.85,
    },
    object: {
      position: [0, -0.02, 0],
      rotation: [0, 0.4, -0.015],
      scale: [1, 1, 1],
    },
    shadow: { position: [0, -1.86, 0], scale: 4.5, opacity: 0.34, blur: 2.6, far: 3.2 },
    logo: {
      defaultScale: 1.35,
      scale: { min: 0.65, max: 1.7, step: 0.05 },
      horizontal: { min: -0.34, max: 0.34, step: 0.02 },
      vertical: { min: -0.8, max: 0.8, step: 0.05 },
      surface: {
        kind: "cylindrical-decal",
        radius: 0.82,
        surfaceOffset: 0.025,
        anchorX: 0,
        anchorY: 0,
        rotation: Math.PI,
        projectionDepth: 0.58,
        mirrorX: true,
      },
    },
    material: {
      body: { roughness: 0.48, metalness: 0.17, clearcoat: 0.24, clearcoatRoughness: 0.58 },
      secondary: { roughness: 0.46, metalness: 0.2, clearcoat: 0, clearcoatRoughness: 0 },
      trim: { roughness: 0.42, metalness: 0.5, clearcoat: 0.18, clearcoatRoughness: 0.55 },
    },
    colors: {
      trim: "#d9d6cc",
      neck: "#d7d4c9",
      lid: "#c9c8c1",
      rim: "#e3e0d5",
      tab: "#aaa9a4",
      rivet: "#d7d5cc",
      foot: "#c7c5bd",
      bottomRim: "#d8d5ca",
    },
    geometry: {
      kind: "slim-can",
      segments: 96,
      radius: 0.82,
      bodyHeight: 3.22,
      bodyHeightSegments: 3,
      topShoulder: { topRadius: 0.765, bottomRadius: 0.82, height: 0.1, y: 1.65 },
      topNeck: { topRadius: 0.745, bottomRadius: 0.765, height: 0.055, y: 1.715 },
      topLid: { radius: 0.745, height: 0.024, y: 1.752 },
      topRim: { radius: 0.67, tube: 0.065, y: 1.775 },
      tab: {
        radius: 0.23,
        tube: 0.055,
        position: [0.04, 1.81, 0.04],
        rotation: [Math.PI / 2, 0, -0.1],
        scale: [0.72, 1.25, 1],
      },
      rivet: { radius: 0.075, height: 0.03, position: [0.025, 1.834, -0.19] },
      bottomShoulder: { topRadius: 0.82, bottomRadius: 0.77, height: 0.1, y: -1.65 },
      bottomFoot: { topRadius: 0.77, bottomRadius: 0.75, height: 0.04, y: -1.715 },
      bottomRim: { radius: 0.68, tube: 0.055, y: -1.745 },
    },
  },
  bottle: {
    id: "bottle",
    implementation: { kind: "procedural" },
    label: "Bottle",
    previewTitle: "Beverage bottle",
    shortName: "bottle",
    defaultColor: "#25b7b8",
    appearance: { baseColorLabel: "Bottle color", supportsLabelColor: true, supportsClearFinish: true },
    camera: {
      position: [3, 1.72, 7.1],
      target: [0, 0.02, 0],
      fov: 32,
      minPolarAngle: Math.PI / 3.2,
      maxPolarAngle: Math.PI / 1.85,
    },
    object: {
      position: [0, -0.01, 0],
      rotation: [0, 0.4, -0.015],
      scale: [1, 1, 1],
    },
    shadow: { position: [0, -1.8, 0], scale: 4.4, opacity: 0.34, blur: 2.6, far: 3.2 },
    logo: {
      defaultScale: 1.08,
      scale: { min: 0.55, max: 1.45, step: 0.05 },
      horizontal: { min: -0.28, max: 0.28, step: 0.02 },
      vertical: { min: -0.38, max: 0.38, step: 0.04 },
      surface: {
        kind: "cylindrical-decal",
        radius: 0.704,
        surfaceOffset: 0.018,
        anchorX: 0,
        anchorY: -0.15,
        rotation: Math.PI,
        projectionDepth: 0.5,
        mirrorX: true,
      },
    },
    material: {
      body: { roughness: 0.5, metalness: 0.04, clearcoat: 0.2, clearcoatRoughness: 0.62 },
      clearBody: {
        roughness: 0.24,
        metalness: 0,
        clearcoat: 0.62,
        clearcoatRoughness: 0.2,
        opacity: 0.38,
        transmission: 0.28,
        thickness: 0.34,
        ior: 1.45,
      },
      secondary: { roughness: 0.68, metalness: 0, clearcoat: 0.04, clearcoatRoughness: 0.72 },
      trim: { roughness: 0.56, metalness: 0.08, clearcoat: 0.12, clearcoatRoughness: 0.65 },
    },
    colors: {
      label: "#f2e8d5",
      labelEdge: "#dfd4c0",
      cap: "#e8dfcf",
      capEdge: "#c9c0b0",
      baseRing: "#d5cbbb",
    },
    geometry: {
      kind: "bottle",
      segments: 96,
      profile: [
        [0, -1.72],
        [0.55, -1.72],
        [0.63, -1.64],
        [0.68, -1.5],
        [0.69, -1.32],
        [0.69, 0.7],
        [0.67, 0.87],
        [0.61, 1.04],
        [0.49, 1.19],
        [0.39, 1.31],
        [0.35, 1.44],
        [0.35, 1.54],
        [0, 1.54],
      ],
      label: { radius: 0.704, height: 1.22, y: -0.15, edgeTube: 0.016 },
      cap: {
        radius: 0.42,
        height: 0.31,
        y: 1.7,
        ringRadius: 0.39,
        ringTube: 0.026,
        topRingY: 1.835,
        bottomRingY: 1.565,
      },
      baseRing: { radius: 0.6, tube: 0.032, y: -1.66 },
    },
  },
  jar: {
    id: "jar",
    implementation: { kind: "procedural" },
    label: "Jar",
    previewTitle: "Glass food jar",
    shortName: "jar",
    defaultColor: "#25b7b8",
    appearance: { baseColorLabel: "Jar color", supportsLabelColor: true, supportsClearFinish: true },
    camera: {
      position: [3, 1.55, 7],
      target: [0, -0.04, 0],
      fov: 32,
      minPolarAngle: Math.PI / 3.2,
      maxPolarAngle: Math.PI / 1.85,
    },
    object: {
      position: [0, -0.03, 0],
      rotation: [0, 0.4, -0.012],
      scale: [1, 1, 1],
    },
    shadow: { position: [0, -1.4, 0], scale: 4.2, opacity: 0.32, blur: 2.5, far: 3 },
    logo: {
      defaultScale: 1.02,
      scale: { min: 0.5, max: 1.42, step: 0.04 },
      horizontal: { min: -0.34, max: 0.34, step: 0.02 },
      vertical: { min: -0.3, max: 0.3, step: 0.03 },
      surface: {
        kind: "cylindrical-decal",
        radius: 0.842,
        surfaceOffset: 0.018,
        anchorX: 0,
        anchorY: -0.14,
        rotation: Math.PI,
        projectionDepth: 0.5,
        mirrorX: true,
      },
    },
    material: {
      body: { roughness: 0.5, metalness: 0.02, clearcoat: 0.12, clearcoatRoughness: 0.62 },
      clearBody: {
        roughness: 0.2,
        metalness: 0,
        clearcoat: 0.72,
        clearcoatRoughness: 0.16,
        opacity: 0.3,
        transmission: 0.24,
        thickness: 0.28,
        ior: 1.46,
      },
      secondary: { roughness: 0.67, metalness: 0, clearcoat: 0.05, clearcoatRoughness: 0.72 },
      trim: { roughness: 0.5, metalness: 0.12, clearcoat: 0.16, clearcoatRoughness: 0.58 },
    },
    colors: {
      glass: "#e1f1ed",
      label: "#f2e8d5",
      labelEdge: "#dfd4c0",
      lid: "#e8dfcf",
      lidEdge: "#c9c0b0",
      baseRing: "#d5cbbb",
    },
    geometry: {
      kind: "jar",
      segments: 96,
      profile: [
        [0, -1.24],
        [0.64, -1.24],
        [0.76, -1.17],
        [0.81, -1.05],
        [0.82, -0.9],
        [0.82, 0.76],
        [0.8, 0.86],
        [0.74, 0.95],
        [0.68, 0.99],
        [0.68, 1.1],
        [0, 1.1],
      ],
      label: { radius: 0.842, height: 0.92, y: -0.14, edgeTube: 0.014 },
      lid: { radius: 0.75, height: 0.28, y: 1.2, ringRadius: 0.7, ringTube: 0.025 },
      baseRing: { radius: 0.68, tube: 0.028, y: -1.18 },
    },
  },
  "stand-up-pouch": {
    id: "stand-up-pouch",
    implementation: {
      kind: "gltf",
      modelUrl: "/models/packaging/stand-up-pouch.glb",
      artworkNode: "ArtworkSurface",
      parts: {
        body: "PouchBody",
        sideGussets: "SideGussets",
        bottomGusset: "BottomGusset",
        heatSeal: "HeatSeal",
      },
    },
    label: "Pouch",
    previewTitle: "Stand-up pouch",
    shortName: "pouch",
    defaultColor: "#25b7b8",
    appearance: { baseColorLabel: "Pouch color", supportsLabelColor: false, supportsClearFinish: false },
    camera: {
      position: [3, 1.58, 7],
      target: [0, -0.02, 0],
      fov: 32,
      minPolarAngle: Math.PI / 3.2,
      maxPolarAngle: Math.PI / 1.85,
    },
    object: {
      position: [0, -0.01, 0],
      rotation: [0, 0.16, -0.01],
      scale: [1, 1, 1],
    },
    shadow: { position: [0, -1.66, 0], scale: 4.6, opacity: 0.32, blur: 2.6, far: 3.2 },
    logo: {
      defaultScale: 1.24,
      scale: { min: 0.55, max: 1.66, step: 0.05 },
      horizontal: { min: -0.58, max: 0.58, step: 0.03 },
      vertical: { min: -0.72, max: 0.72, step: 0.04 },
      surface: {
        kind: "flat-decal",
        anchorX: 0,
        anchorY: -0.06,
        z: 0.255,
        rotation: [0, 0, 0],
        projectionDepth: 0.18,
        mirrorX: false,
      },
    },
    material: {
      body: { roughness: 0.56, metalness: 0.02, clearcoat: 0.16, clearcoatRoughness: 0.62 },
      secondary: { roughness: 0.64, metalness: 0.01, clearcoat: 0.06, clearcoatRoughness: 0.7 },
      trim: { roughness: 0.5, metalness: 0.04, clearcoat: 0.14, clearcoatRoughness: 0.6 },
    },
    colors: {
      seam: "#e8ddc8",
      gusset: "#d8ccb6",
    },
    geometry: {
      kind: "gltf-model",
    },
  },
  "bakery-bag": {
    id: "bakery-bag",
    implementation: { kind: "procedural" },
    label: "Bakery Bag",
    previewTitle: "Kraft-style bread bag",
    shortName: "bakery bag",
    defaultColor: "#b98a5f",
    appearance: { baseColorLabel: "Kraft-style color", supportsLabelColor: false, supportsClearFinish: false },
    camera: {
      position: [3.45, 2.05, 7.4],
      target: [0, -0.02, 0],
      fov: 32,
      minPolarAngle: Math.PI / 3.25,
      maxPolarAngle: Math.PI / 1.82,
    },
    object: {
      position: [0, -0.02, 0],
      rotation: [0, 0.28, -0.012],
      scale: [1, 1, 1],
    },
    shadow: { position: [0, -1.46, 0], scale: 4.8, opacity: 0.34, blur: 2.6, far: 3.2 },
    logo: {
      defaultScale: 0.82,
      scale: { min: 0.48, max: 1.2, step: 0.04 },
      horizontal: { min: -0.34, max: 0.34, step: 0.02 },
      vertical: { min: -0.18, max: 0.21, step: 0.03 },
      surface: {
        kind: "flat-decal",
        anchorX: 0,
        anchorY: 0.75,
        z: 0.67,
        rotation: [0, 0, 0],
        projectionDepth: 0.12,
        mirrorX: false,
      },
    },
    window: {
      defaultScale: 0.72,
      scale: { min: 0.35, max: 1, step: 0.05 },
    },
    material: {
      body: { roughness: 0.9, metalness: 0, clearcoat: 0.015, clearcoatRoughness: 0.96 },
      secondary: { roughness: 0.86, metalness: 0, clearcoat: 0.02, clearcoatRoughness: 0.92 },
      trim: { roughness: 0.82, metalness: 0, clearcoat: 0.03, clearcoatRoughness: 0.88 },
    },
    colors: {
      loaf: "#b9642f",
      loafTop: "#d98a47",
      window: "#fff9e9",
      seam: "#8a5f3d",
    },
    geometry: {
      kind: "bakery-bag",
      width: 2.32,
      height: 2.62,
      depth: 1.12,
      panelThickness: 0.07,
      opening: {
        centerY: -0.32,
        maxWidth: 1.72,
        maxHeight: 1.12,
      },
    },
  },
};

export type LogoControlState = { scale: number; x: number; y: number };

export function createDefaultLogoSettings(): Record<PackagingType, LogoControlState> {
  return Object.fromEntries(
    PACKAGING_TYPES.map((type) => [type, { scale: packageConfigs[type].logo.defaultScale, x: 0, y: 0 }]),
  ) as Record<PackagingType, LogoControlState>;
}
