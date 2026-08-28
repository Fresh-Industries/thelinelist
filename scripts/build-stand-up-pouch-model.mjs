import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(scriptDirectory, "../public/models/packaging/stand-up-pouch.glb");

if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    onerror = null;

    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((result) => {
          this.result = result;
          this.onloadend?.();
        })
        .catch((error) => this.onerror?.(error));
    }

    readAsDataURL(blob) {
      blob
        .arrayBuffer()
        .then((result) => {
          this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
          this.onloadend?.();
        })
        .catch((error) => this.onerror?.(error));
    }
  };
}

function makeGridGeometry({ columns, rows, sample, flip = false }) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      positions.push(...sample(u, v));
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      if (flip) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const bodyBottom = -1.42;
const bodyTop = 1.29;

function halfWidthAt(y) {
  if (y < -1.12) return 0.93 + ((y + 1.42) / 0.3) * 0.08;
  if (y <= 0.7) return 1.01;
  return 1.01 - ((y - 0.7) / (bodyTop - 0.7)) * 0.18;
}

function edgeDepthAt(y) {
  const normalizedY = (y - bodyBottom) / (bodyTop - bodyBottom);
  const middle = Math.sin(Math.PI * normalizedY);
  return 0.085 + 0.055 * Math.pow(Math.max(0, middle), 0.72);
}

function panelPoint(u, v, direction, inset = 0) {
  const y = bodyBottom + v * (bodyTop - bodyBottom);
  const normalizedX = u * 2 - 1;
  const width = halfWidthAt(y) - inset;
  const centerWeight = Math.pow(Math.max(0, 1 - normalizedX * normalizedX), 1.35);
  const verticalWeight = Math.pow(Math.max(0, Math.sin(Math.PI * v)), 0.62);
  const bow = 0.105 * centerWeight * verticalWeight;
  const seamWeight = Math.pow(Math.abs(normalizedX), 7) + Math.pow(Math.max(0, (v - 0.76) / 0.24), 5);
  const wrinkle = 0.009 * Math.sin(v * Math.PI * 10 + normalizedX * 3.4) * Math.min(1, seamWeight);
  const upperTension = Math.pow(Math.max(0, (v - 0.62) / 0.38), 2);
  const tensionCrease =
    0.012 *
    Math.sin((normalizedX + 1) * Math.PI * 4.5) *
    upperTension *
    Math.pow(Math.abs(normalizedX), 1.4);
  const z = direction * (edgeDepthAt(y) + bow + wrinkle + tensionCrease + inset * 0.5);
  return [normalizedX * width, y, z];
}

const frontPanel = makeGridGeometry({
  columns: 20,
  rows: 24,
  sample: (u, v) => panelPoint(u, v, 1),
});
const backPanel = makeGridGeometry({
  columns: 20,
  rows: 24,
  sample: (u, v) => panelPoint(1 - u, v, -1),
});
const pouchBodyGeometry = mergeGeometries([frontPanel, backPanel], false);

function sideGussetPoint(side, u, v) {
  const y = bodyBottom + v * (bodyTop - bodyBottom);
  const across = u * 2 - 1;
  const foldWeight = 1 - Math.abs(across);
  const x = side * (halfWidthAt(y) - 0.068 * foldWeight);
  const z = -across * edgeDepthAt(y);
  return [x, y, z];
}

const leftGusset = makeGridGeometry({
  columns: 6,
  rows: 24,
  sample: (u, v) => sideGussetPoint(-1, u, v),
  flip: true,
});
const rightGusset = makeGridGeometry({
  columns: 6,
  rows: 24,
  sample: (u, v) => sideGussetPoint(1, 1 - u, v),
  flip: true,
});
const sideGussetGeometry = mergeGeometries([leftGusset, rightGusset], false);

const bottomGussetGeometry = makeGridGeometry({
  columns: 16,
  rows: 8,
  sample: (u, v) => {
    const normalizedX = u * 2 - 1;
    const across = v * 2 - 1;
    const foldWeight = 1 - Math.abs(across);
    const width = halfWidthAt(bodyBottom) - 0.045 * foldWeight;
    const z = across * edgeDepthAt(bodyBottom);
    const y = bodyBottom + 0.16 * foldWeight * (0.75 + 0.25 * (1 - normalizedX * normalizedX));
    return [normalizedX * width, y, z];
  },
});

const bottomFrontFoldGeometry = makeGridGeometry({
  columns: 18,
  rows: 3,
  sample: (u, v) => {
    const normalizedX = u * 2 - 1;
    const foldHeight = 0.04 + 0.13 * Math.pow(Math.max(0, 1 - normalizedX * normalizedX), 0.7);
    const y = bodyBottom + v * foldHeight;
    const panelV = (y - bodyBottom) / (bodyTop - bodyBottom);
    const [x, panelY, z] = panelPoint(u, panelV, 1, 0.004);
    return [x, panelY, z + 0.004];
  },
});
const completeBottomGussetGeometry = mergeGeometries([bottomGussetGeometry, bottomFrontFoldGeometry], false);

const sealBottom = 1.285;
const sealTop = 1.52;
function sealPoint(u, v, direction) {
  const y = sealBottom + v * (sealTop - sealBottom);
  const normalizedX = u * 2 - 1;
  const halfWidth = 0.84 - v * 0.035;
  const ripple = 0.0045 * Math.sin((normalizedX + 1) * Math.PI * 6.5) * Math.sin(Math.PI * v);
  return [normalizedX * halfWidth, y, direction * (0.067 + ripple)];
}

const sealFront = makeGridGeometry({ columns: 20, rows: 4, sample: (u, v) => sealPoint(u, v, 1) });
const sealBack = makeGridGeometry({ columns: 20, rows: 4, sample: (u, v) => sealPoint(1 - u, v, -1) });
const sealLeft = makeGridGeometry({
  columns: 1,
  rows: 4,
  sample: (u, v) => {
    const y = sealBottom + v * (sealTop - sealBottom);
    return [-(0.84 - v * 0.035), y, 0.067 - u * 0.134];
  },
  flip: true,
});
const sealRight = makeGridGeometry({
  columns: 1,
  rows: 4,
  sample: (u, v) => {
    const y = sealBottom + v * (sealTop - sealBottom);
    return [0.84 - v * 0.035, y, -0.067 + u * 0.134];
  },
  flip: true,
});
const sealTopGeometry = makeGridGeometry({
  columns: 20,
  rows: 1,
  sample: (u, v) => [(u * 2 - 1) * 0.805, sealTop, -0.067 + v * 0.134],
  flip: true,
});
const heatSealGeometry = mergeGeometries([sealFront, sealBack, sealLeft, sealRight, sealTopGeometry], false);

const artworkSurfaceGeometry = makeGridGeometry({
  columns: 14,
  rows: 14,
  sample: (u, v) => {
    const x = (u * 2 - 1) * 0.73;
    const y = -0.72 + v * 1.48;
    const panelU = (x / halfWidthAt(y) + 1) / 2;
    const panelV = (y - bodyBottom) / (bodyTop - bodyBottom);
    const [panelX, panelY, panelZ] = panelPoint(panelU, panelV, 1, 0.006);
    return [panelX, panelY, panelZ + 0.003];
  },
});

const bodyMaterial = new MeshStandardMaterial({ color: "#25b7b8", roughness: 0.58, metalness: 0.01 });
bodyMaterial.name = "PouchBodyTemplate";
const gussetMaterial = new MeshStandardMaterial({ color: "#21a2a3", roughness: 0.68, metalness: 0 });
gussetMaterial.name = "PouchGussetTemplate";
const sealMaterial = new MeshStandardMaterial({ color: "#53c5c2", roughness: 0.54, metalness: 0.01 });
sealMaterial.name = "PouchSealTemplate";
const artworkMaterial = new MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.6,
  transparent: true,
  opacity: 0.01,
  depthWrite: false,
});
artworkMaterial.name = "ArtworkSurfaceTemplate";

function namedMesh(name, geometry, material) {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = name !== "ArtworkSurface";
  mesh.receiveShadow = name !== "ArtworkSurface";
  return mesh;
}

const scene = new Scene();
scene.name = "StandUpPouchModel";
scene.userData = {
  packageType: "stand-up-pouch",
  construction: "thin-flexible",
  artworkSurface: "ArtworkSurface",
};
scene.add(
  namedMesh("PouchBody", pouchBodyGeometry, bodyMaterial),
  namedMesh("SideGussets", sideGussetGeometry, gussetMaterial),
  namedMesh("BottomGusset", completeBottomGussetGeometry, gussetMaterial),
  namedMesh("HeatSeal", heatSealGeometry, sealMaterial),
  namedMesh("ArtworkSurface", artworkSurfaceGeometry, artworkMaterial),
);

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, {
  binary: true,
  onlyVisible: false,
  trs: false,
});

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(result));
console.log(`Wrote ${path.relative(process.cwd(), outputPath)} (${Buffer.byteLength(Buffer.from(result))} bytes)`);
