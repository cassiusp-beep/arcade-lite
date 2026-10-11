// Generates the base product GLBs in public/models/ at real-world scale (meters, floor at y=0).
// Each model's printable surface uses a material named "pattern" so the app can swap in the
// Arcade pattern as its base color texture. Run: node scripts/make-models.mjs
import fs from "node:fs";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter reads blobs through FileReader, which Node lacks.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(r).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

const pattern = () => new THREE.MeshStandardMaterial({ name: "pattern", color: 0xffffff, roughness: 0.9 });
const solid = (name, color, roughness = 0.7) => new THREE.MeshStandardMaterial({ name, color, roughness });

/** A cushion: two puffed faces meeting at a seam. */
function cushion(w, h, depth, segs = 32) {
  const group = new THREE.Group();
  for (const side of [1, -1]) {
    const g = new THREE.PlaneGeometry(w, h, segs, segs);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (w / 2), y = pos.getY(i) / (h / 2);
      const puff = Math.cos((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2);
      // Bulge toward +z, then turn the back face around so the halves bulge apart.
      pos.setZ(i, (depth / 2) * Math.pow(Math.max(puff, 0), 0.6));
    }
    if (side === -1) g.rotateY(Math.PI);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, pattern()));
  }
  return group;
}

function pillow() {
  const c = cushion(0.56, 0.36, 0.14); // 22" x 14", the size Arcade makes
  c.position.y = 0.18; // standing upright on the floor/sofa
  c.rotation.x = -0.12;
  return c;
}

function floorPillow() {
  const c = cushion(0.7, 0.7, 0.2);
  c.rotation.x = -Math.PI / 2;
  c.position.y = 0.1;
  return c;
}

function curtain() {
  // Two panels with soft folds, hung from a rod. Origin at the wall's floor line.
  const group = new THREE.Group();
  for (const x of [-0.42, 0.42]) {
    const g = new THREE.PlaneGeometry(0.75, 2.2, 48, 8);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.03 * Math.sin((pos.getX(i) / 0.75) * Math.PI * 8));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, pattern());
    m.position.set(x, 1.15, 0.08);
    group.add(m);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 16), solid("rod", 0x2b2a28, 0.4));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 2.28, 0.08);
  group.add(rod);
  return group;
}

function duvet() {
  const group = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 2.0), solid("bed", 0xd9d2c5));
  bed.position.y = 0.2;
  group.add(bed);
  // Duvet: top sheet draping over three sides.
  const g = new THREE.PlaneGeometry(1.6, 1.9, 40, 40);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const overX = Math.max(Math.abs(x) - 0.7, 0);
    pos.setZ(i, -overX * 2.2 + 0.02 * Math.sin(y * 9) * Math.cos(x * 4));
  }
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.43, 0.1);
  g.computeVertexNormals();
  group.add(new THREE.Mesh(g, pattern()));
  return group;
}

function tablecloth() {
  const group = new THREE.Group();
  const legMat = solid("wood", 0x6b4f3a);
  for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), legMat);
    leg.position.set(x, 0.37, z);
    group.add(leg);
  }
  // Cloth draped 0.25m over each side of a 1.4 x 0.9 top.
  const g = new THREE.PlaneGeometry(1.9, 1.4, 60, 44);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const over = Math.max(Math.abs(x) - 0.7, 0) + Math.max(Math.abs(y) - 0.45, 0);
    pos.setX(i, Math.sign(x) * Math.min(Math.abs(x), 0.7 + 0.01));
    pos.setY(i, Math.sign(y) * Math.min(Math.abs(y), 0.45 + 0.01));
    pos.setZ(i, -over);
  }
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.755, 0);
  g.computeVertexNormals();
  group.add(new THREE.Mesh(g, pattern()));
  return group;
}

function lampshade() {
  const group = new THREE.Group();
  const shadeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 64, 1, true);
  const shadeMat = pattern();
  shadeMat.side = THREE.DoubleSide;
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.y = 0.52;
  group.add(shade);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 32), solid("base", 0xa08c5b, 0.35));
  base.position.y = 0.03;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 16), solid("stem", 0xa08c5b, 0.35));
  stem.position.y = 0.27;
  group.add(base, stem);
  return group;
}

const MODELS = {
  pillow,
  "floor-pillow": floorPillow,
  curtain,
  duvet,
  tablecloth,
  lampshade,
};

fs.mkdirSync("public/models", { recursive: true });
const exporter = new GLTFExporter();
for (const [name, build] of Object.entries(MODELS)) {
  const scene = new THREE.Scene();
  scene.add(build());
  const glb = await exporter.parseAsync(scene, { binary: true });
  fs.writeFileSync(`public/models/${name}.glb`, Buffer.from(glb));
  console.log(`public/models/${name}.glb`, (glb.byteLength / 1024).toFixed(0), "KB");
}
