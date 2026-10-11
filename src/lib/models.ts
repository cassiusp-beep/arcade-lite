/**
 * Builds a product's 3D model in the browser from its Arcade selections (size, embellishment,
 * fabric), with the pattern embedded at print scale, and exports a GLB for <model-viewer>.
 * The same GLB drives the 3D view and AR Quick Look, so both match the product photo.
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { MeshKind } from "./catalog";

const IN = 0.0254;

/**
 * Physical width of one pattern repeat for large pieces (curtains, duvets, tablecloths, shades),
 * in inches. An estimate: Arcade's photos for these show the print repeating. Pillows don't
 * repeat; they use one cover-fit copy (see coverUVs).
 */
const REPEAT_IN: Record<MeshKind, number> = {
  pillow: 11,
  "floor-pillow": 14,
  curtain: 26,
  duvet: 30,
  tablecloth: 24,
  lampshade: 10,
};

const DEFAULT_SIZE_IN: Record<MeshKind, [number, number]> = {
  pillow: [18, 18],
  "floor-pillow": [26, 26],
  curtain: [50, 84],
  duvet: [88, 90],
  tablecloth: [60, 84],
  lampshade: [14, 10],
};

export type ModelSpec = { mesh: MeshKind; selections?: Record<string, string>; patternUrl: string };

/** "22x14" (or any "<w>x<h>" in the selections) → inches. */
export function sizeInches(mesh: MeshKind, selections: Record<string, string> = {}): [number, number] {
  for (const value of Object.values(selections)) {
    const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(value);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  return DEFAULT_SIZE_IN[mesh];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Pattern image failed to load"));
    img.src = url;
  });
}

/** Average of the darkest pixels: the trim color Arcade pairs with the print. */
function trimColor(img: HTMLImageElement): THREE.Color {
  const c = document.createElement("canvas");
  c.width = c.height = 48;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data;
  const px: [number, number, number, number][] = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2], d[i] + d[i + 1] + d[i + 2]]);
  px.sort((a, b) => a[3] - b[3]);
  const dark = px.slice(0, Math.max(1, Math.floor(px.length * 0.05)));
  const avg = dark.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((v) => v / dark.length / 255);
  // Trim is dyed solid, so it reads deeper and more saturated than the printed ink.
  const color = new THREE.Color().setRGB(avg[0], avg[1], avg[2], THREE.SRGBColorSpace);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return color.setHSL(hsl.h, Math.min(1, hsl.s * 1.6), hsl.l * 0.75);
}

function patternMaterial(texture: THREE.Texture, selections: Record<string, string>) {
  const fabric = selections.fabric ?? "";
  const velvet = fabric.includes("velvet");
  const mat = new THREE.MeshPhysicalMaterial({
    name: "pattern",
    map: texture,
    roughness: velvet ? 0.75 : fabric.includes("linen") ? 0.95 : 0.88,
    sheen: velvet ? 1 : 0,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(0xffffff),
  });
  return mat;
}

/** Scale a geometry's UVs so the texture repeats at print scale over w x h meters. */
function tileUVs(g: THREE.BufferGeometry, wM: number, hM: number, repeatIn: number) {
  const uv = g.attributes.uv;
  const su = wM / (repeatIn * IN), sv = hM / (repeatIn * IN);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
}

/**
 * Cover-fit: one copy of the image fills the face and the overflow is center-cropped,
 * which is how Arcade prints pillows (compare the product photo to the pattern).
 */
function coverUVs(g: THREE.BufferGeometry, wM: number, hM: number, imgAspect: number) {
  const uv = g.attributes.uv;
  const faceAspect = wM / hM;
  const su = faceAspect < imgAspect ? faceAspect / imgAspect : 1;
  const sv = faceAspect > imgAspect ? imgAspect / faceAspect : 1;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + (uv.getX(i) - 0.5) * su, 0.5 + (uv.getY(i) - 0.5) * sv);
  uv.needsUpdate = true;
}

/** Cushion: two puffed faces meeting at a seam, optional piping along it and corner tassels. */
function cushion(w: number, h: number, depth: number, mat: THREE.Material, imgAspect: number, trim?: THREE.Color, tassels = false) {
  const group = new THREE.Group();
  const segs = 48;
  const edgeZ = (x: number, y: number) => {
    const puff = Math.cos((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2);
    return (depth / 2) * Math.pow(Math.max(puff, 0), 0.55);
  };
  for (const side of [1, -1]) {
    const g = new THREE.PlaneGeometry(w, h, segs, segs);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (w / 2), y = pos.getY(i) / (h / 2);
      // Corners pinch inward slightly, like a real stuffed cover.
      const pinch = 1 - 0.035 * Math.pow(Math.abs(x * y), 3);
      pos.setX(i, pos.getX(i) * pinch);
      pos.setY(i, pos.getY(i) * pinch);
      pos.setZ(i, edgeZ(x, y));
    }
    coverUVs(g, w, h, imgAspect);
    if (side === -1) g.rotateY(Math.PI);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, mat));
  }

  if (trim) {
    const trimMat = new THREE.MeshStandardMaterial({ name: "trim", color: trim, roughness: 0.6 });
    const hw = (w / 2) * 0.965, hh = (h / 2) * 0.965;
    const corners = [
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ];
    const path = new THREE.CurvePath<THREE.Vector3>();
    corners.forEach((c, i) => path.add(new THREE.LineCurve3(c, corners[(i + 1) % 4])));
    const pts = path.getSpacedPoints(240);
    const piping = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.02), 320, 0.0055, 10, true);
    group.add(new THREE.Mesh(piping, trimMat));

    if (tassels) {
      for (const c of corners) {
        const dir = new THREE.Vector3(Math.sign(c.x), Math.sign(c.y), 0).normalize();
        const tassel = new THREE.Group();
        // Cone apex (+y) sits at the knot; the skirt flares out to a flat fringe.
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 12), trimMat);
        const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 24, 1, false), trimMat);
        skirt.position.y = -0.03;
        tassel.add(head, skirt);
        tassel.position.copy(c).addScaledVector(dir, 0.012);
        tassel.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        group.add(tassel);
      }
    }
  }
  return group;
}

function curtain(w: number, h: number, mat: THREE.Material, repeatIn: number) {
  const group = new THREE.Group();
  const panelW = w / 2;
  for (const x of [-panelW / 2 - 0.02, panelW / 2 + 0.02]) {
    const g = new THREE.PlaneGeometry(panelW, h, 64, 8);
    tileUVs(g, panelW, h, repeatIn);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.035 * Math.sin((pos.getX(i) / panelW) * Math.PI * 9));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, h / 2 + 0.05, 0.08);
    group.add(m);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, h + 0.08, 0.08);
  group.add(rod);
  return group;
}

function draped(topW: number, topD: number, drop: number, surfaceY: number, mat: THREE.Material, repeatIn: number, sides: "three" | "four") {
  const W = topW + drop * 2, D = topD + (sides === "four" ? drop * 2 : drop);
  const g = new THREE.PlaneGeometry(W, D, 80, 80);
  tileUVs(g, W, D, repeatIn);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const overX = Math.max(Math.abs(x) - topW / 2, 0);
    const overY = sides === "four" ? Math.max(Math.abs(y) - topD / 2, 0) : Math.max(-y - topD / 2 + drop / 2, 0);
    const over = Math.max(overX, overY);
    pos.setX(i, Math.sign(x) * Math.min(Math.abs(x), topW / 2 + 0.01));
    if (sides === "four") pos.setY(i, Math.sign(y) * Math.min(Math.abs(y), topD / 2 + 0.01));
    pos.setZ(i, -over + 0.008 * Math.sin(x * 40) * Math.min(over * 20, 1));
  }
  g.rotateX(-Math.PI / 2);
  g.translate(0, surfaceY, 0);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

function build(mesh: MeshKind, sizeIn: [number, number], mat: THREE.Material, trim: THREE.Color, selections: Record<string, string>, imgAspect: number) {
  const [wIn, hIn] = sizeIn;
  const w = wIn * IN, h = hIn * IN;
  const repeat = REPEAT_IN[mesh];
  const emb = selections.embellishment ?? "";
  const neutral = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

  switch (mesh) {
    case "pillow": {
      const c = cushion(w, h, Math.min(w, h) * 0.38, mat, imgAspect, emb.includes("piping") ? trim : undefined, emb.includes("tassel"));
      c.position.y = h / 2 + 0.01;
      c.rotation.x = -0.1;
      return c;
    }
    case "floor-pillow": {
      const c = cushion(w, h, 0.2, mat, imgAspect, emb.includes("piping") ? trim : undefined, emb.includes("tassel"));
      c.rotation.x = -Math.PI / 2;
      c.position.y = 0.1;
      return c;
    }
    case "curtain":
      return curtain(Math.max(w, 1.2), h, mat, repeat);
    case "duvet": {
      const group = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.42, h - 0.2), neutral(0xd9d2c5));
      bed.position.y = 0.21;
      group.add(bed, draped(w - 0.3, h - 0.2, 0.3, 0.44, mat, repeat, "three"));
      return group;
    }
    case "tablecloth": {
      const group = new THREE.Group();
      const top = Math.max(w - 0.5, 0.9), depth = Math.max(h - 0.5, 0.7);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), neutral(0x6b4f3a));
        leg.position.set((x * top) / 2.2, 0.37, (z * depth) / 2.2);
        group.add(leg);
      }
      group.add(draped(top, depth, 0.25, 0.755, mat, repeat, "four"));
      return group;
    }
    case "lampshade": {
      const group = new THREE.Group();
      const r = w / 2, shadeH = h;
      const g = new THREE.CylinderGeometry(r, r, shadeH, 96, 1, true);
      tileUVs(g, Math.PI * w, shadeH, repeat);
      (mat as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
      const shade = new THREE.Mesh(g, mat);
      shade.position.y = 0.42 + shadeH / 2;
      const brass = new THREE.MeshStandardMaterial({ color: 0xa08c5b, roughness: 0.35, metalness: 0.6 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 32), brass);
      base.position.y = 0.03;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 16), brass);
      stem.position.y = 0.24;
      group.add(shade, base, stem);
      return group;
    }
  }
}

/** Build the product and return an object URL to a GLB with the pattern embedded. */
export async function buildProductGlb({ mesh, selections = {}, patternUrl }: ModelSpec): Promise<string> {
  const img = await loadImage(patternUrl);
  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.add(build(mesh, sizeInches(mesh, selections), patternMaterial(texture, selections), trimColor(img), selections, img.width / img.height));
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true, maxTextureSize: 2048 })) as ArrayBuffer;
  return URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }));
}
