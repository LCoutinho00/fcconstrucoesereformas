/* FC Construção & Reforma — cena 3D do hero: a obra se constrói com o scroll */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const FC = (window.FC = window.FC || { intro: 0, scroll: 0, build: 0, mouseX: 0, mouseY: 0 });
const canvas = document.getElementById('scene');
const hero = document.getElementById('hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 900px)').matches || matchMedia('(pointer: coarse)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeBack = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}
if (renderer) init();

function init() {
  const DPR = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.Fog('#2a211d', 45, 120);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);

  /* ---------- céu: golden hour → hora azul na entrega ---------- */
  const SKY = {
    golden: { top: new THREE.Color('#141821'), mid: new THREE.Color('#3b2c29'), hor: new THREE.Color('#b8754a') },
    blue: { top: new THREE.Color('#06080e'), mid: new THREE.Color('#141a2c'), hor: new THREE.Color('#3b4766') },
  };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: SKY.golden.top.clone() }, mid: { value: SKY.golden.mid.clone() }, hor: { value: SKY.golden.hor.clone() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = mix(hor, mid, smoothstep(-0.02, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.6, h));
      c = mix(c, hor * .35, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c, 1.); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
  scene.add(sky);

  /* ---------- luzes ---------- */
  const hemi = new THREE.HemisphereLight('#c9d3e2', '#2a2018', 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffc48a', 3.2);
  sun.position.set(-26, 18, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#ff5a3c', 0.9);
  rim.position.set(20, 10, -24);
  scene.add(rim);

  /* ---------- materiais ---------- */
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    soil: std({ color: '#1a1714', roughness: 1 }),
    lawn: std({ color: '#35422f', roughness: 1 }),
    concrete: std({ color: '#a8a39a', roughness: 0.9 }),
    concreteDark: std({ color: '#7c776f', roughness: 0.95 }),
    eps: std({ color: '#dedbd3', roughness: 0.8 }),
    steel: std({ color: '#3a3d42', roughness: 0.4, metalness: 0.8 }),
    scaffold: std({ color: '#c9ccd1', roughness: 0.35, metalness: 0.85 }),
    plank: std({ color: '#8a6a45', roughness: 0.85 }),
    white: std({ color: '#dcd8d0', roughness: 0.7, envMapIntensity: 0.55 }),
    floor: std({ color: '#d9d3c8', roughness: 0.25, metalness: 0.05 }),
    stone: std({ color: '#cbbfa8', roughness: 0.8 }),
    stoneWall: std({ color: '#8f7f69', roughness: 0.95 }),
    wood: std({ color: '#9a6a3f', roughness: 0.6 }),
    frame: std({ color: '#26282c', roughness: 0.35, metalness: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#a9c8da', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3, envMapIntensity: 1.1, clearcoat: 0.3, depthWrite: false }),
    light: std({ color: '#1c1610', emissive: '#ff9440', emissiveIntensity: 0, roughness: 1 }),
    poolTile: std({ color: '#2a8fc4', roughness: 0.5 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#4fb6e6', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.78, clearcoat: 1, envMapIntensity: 1.6, emissive: '#0a5f8f', emissiveIntensity: 0.25 }),
    leaf: std({ color: '#3f5a3a', roughness: 0.9, flatShading: true }),
    leaf2: std({ color: '#55704a', roughness: 0.9, flatShading: true }),
    trunk: std({ color: '#4b3b2c', roughness: 1 }),
    red: std({ color: '#e2231a', roughness: 0.45, metalness: 0.3 }),
    beacon: std({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 4 }),
  };

  /* ---------- chão ---------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), M.soil);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // marcação do lote (gabarito) — some quando a obra termina
  const plot = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(26, 24)),
    new THREE.LineDashedMaterial({ color: '#e2231a', dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.8 })
  );
  plot.rotation.x = -Math.PI / 2;
  plot.position.set(0, 0.02, 2);
  plot.computeLineDistances();
  scene.add(plot);

  /* ---------- peças animadas (instanciadas, com cantos arredondados) ---------- */
  const tmp = new THREE.Object3D();
  const all = [];
  const geoCache = new Map();
  const rbox = (w, h, d, r = 0.035) => {
    const k = [w, h, d, r].join();
    if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)));
    return geoCache.get(k);
  };
  class Batch {
    constructor(geo, mat, h = 1, { shadow = true, cast = shadow } = {}) {
      this.geo = geo; this.mat = mat; this.h = h; this.items = []; this.cast = cast;
      all.push(this);
    }
    add(x, y, z, start, dur = 0.05, mode = 'drop', end = null, ry = 0) {
      this.items.push({ x, y, z, start, dur, mode, end, ry, spin: (rand() - 0.5) * 0.5 });
      return this;
    }
    build() {
      this.mesh = new THREE.InstancedMesh(this.geo, this.mat, Math.max(1, this.items.length));
      this.mesh.castShadow = this.cast;
      this.mesh.receiveShadow = true;
      this.mesh.frustumCulled = false;
      scene.add(this.mesh);
    }
    update(b) {
      this.items.forEach((it, i) => {
        const t = clamp((b - it.start) / it.dur);
        const k = it.end == null ? 1 : 1 - easeInOut(clamp((b - it.end) / 0.06));
        tmp.rotation.set(0, it.ry, 0);
        if (t <= 0 || k <= 0.001) {
          tmp.position.set(it.x, -80, it.z); tmp.scale.setScalar(0.0001);
        } else if (it.mode === 'grow') {
          const e = easeOut(t) * k;
          tmp.scale.set(1, Math.max(0.0001, e), 1);
          tmp.position.set(it.x, it.y - (this.h * (1 - e)) / 2, it.z);
        } else if (it.mode === 'pop') {
          const e = Math.max(0.0001, easeBack(t) * k);
          tmp.scale.setScalar(e);
          tmp.position.set(it.x, it.y, it.z);
        } else if (it.mode === 'slide') {
          const e = easeOut(t);
          tmp.scale.setScalar(k);
          tmp.position.set(it.x + (1 - e) * 3, it.y, it.z);
        } else { // drop: desce do guindaste girando levemente e assenta
          const e = easeOut(t);
          tmp.scale.setScalar(k);
          tmp.position.set(it.x, it.y + (1 - e) * 7, it.z);
          tmp.rotation.set(0, it.ry + (1 - e) * it.spin, (1 - e) * it.spin * 0.4);
        }
        tmp.updateMatrix();
        this.mesh.setMatrixAt(i, tmp.matrix);
      });
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  const batch = (w, h, d, mat, opts, r) => new Batch(rbox(w, h, d, r), mat, h, opts);

  // dimensões da obra
  const XS = [-6, -2, 2, 6];
  const ZS = [-4, 0, 4];
  const W = 12, D = 8, FH = 3;
  const F0 = 0.4;
  const floors = [F0, F0 + FH + 0.52];

  // 1. fundação (radier em placas, em onda)
  const found = batch(0.98, F0, 0.98, M.concreteDark, {}, 0.03);
  for (let x = -6.5; x < 6.5; x += 1) for (let z = -4.5; z < 4.5; z += 1) {
    const d = Math.hypot(x + 7, z + 5) / 16;
    found.add(x + 0.5, F0 / 2, z + 0.5, d * 0.1, 0.035, 'drop');
  }

  // 2. andaimes: sobem com a estrutura e são desmontados no fim
  const tube = new THREE.CylinderGeometry(0.045, 0.045, 1, 6);
  const sPost = new Batch(tube.clone().scale(1, 8.6, 1), M.scaffold, 8.6);
  const sLedX = new Batch(tube.clone().rotateZ(Math.PI / 2).scale(16, 1, 1), M.scaffold, 0.09);
  const sLedZ = new Batch(tube.clone().rotateX(Math.PI / 2).scale(1, 1, 12), M.scaffold, 0.09);
  const sPlank = batch(15.6, 0.06, 0.55, M.plank, {}, 0.02);
  const sPlankZ = batch(0.55, 0.06, 11.4, M.plank, {}, 0.02);
  for (let x = -7.4; x <= 7.41; x += 2.1) [-5.6, -5.0, 5.0, 5.6].forEach((z) => sPost.add(x, 4.3, z, 0.12 + (x + 7.4) / 14.8 * 0.08, 0.05, 'grow', 0.66 + (x + 7.4) / 14.8 * 0.04));
  for (let z = -5.6; z <= 5.61; z += 2.24) [-7.9, 7.9].forEach((x) => sPost.add(x, 4.3, z, 0.14 + (z + 5.6) / 11.2 * 0.06, 0.05, 'grow', 0.67));
  [1.9, 3.9, 5.9, 7.9].forEach((y, i) => {
    [-5.6, -5.0, 5.0, 5.6].forEach((z) => sLedX.add(0, y, z, 0.17 + i * 0.03, 0.04, 'pop', 0.65 + i * 0.008));
    [-7.9].concat([7.9]).forEach((x) => sLedZ.add(x, y, 0, 0.18 + i * 0.03, 0.04, 'pop', 0.65 + i * 0.008));
    [-5.3, 5.3].forEach((z) => sPlank.add(0, y + 0.05, z, 0.19 + i * 0.03, 0.04, 'drop', 0.64 + i * 0.008));
  });
  [-7.6, 7.6].forEach((x) => [3.95, 7.95].forEach((y, i) => sPlankZ.add(x, y, 0, 0.24 + i * 0.05, 0.04, 'drop', 0.645)));

  // 3. estrutura por pavimento: pilares, vigas, laje treliçada com EPS e capa
  const col = batch(0.42, FH, 0.42, M.concrete, {}, 0.04);
  const beamX = batch(W + 0.42, 0.42, 0.36, M.concrete, {}, 0.03);
  const beamZ = batch(0.36, 0.42, D + 0.42, M.concrete, {}, 0.03);
  const joist = batch(W, 0.14, 0.1, M.steel, {}, 0.02);
  const eps = batch(0.92, 0.26, 0.38, M.eps, {}, 0.04);
  const topping = batch(2.02, 0.12, D + 0.42, M.concrete, {}, 0.02);
  const phase = [
    { col: 0.12, beam: 0.19, joist: 0.22, eps: 0.245, top: 0.335 },
    { col: 0.37, beam: 0.43, joist: 0.455, eps: 0.475, top: 0.555 },
  ];
  floors.forEach((base, f) => {
    const P = phase[f];
    const top = base + FH;
    let k = 0;
    XS.forEach((x) => ZS.forEach((z) => col.add(x, base + FH / 2, z, P.col + (k++ / 12) * 0.05, 0.045, 'grow')));
    ZS.forEach((z, i) => beamX.add(0, top + 0.21, z, P.beam + i * 0.012, 0.04));
    XS.forEach((x, i) => beamZ.add(x, top + 0.21, 0, P.beam + 0.03 + i * 0.008, 0.04));
    const rows = [];
    for (let z = -3.75; z <= 3.76; z += 0.5) rows.push(z);
    rows.forEach((z, i) => joist.add(0, top + 0.12, z, P.joist + (i / rows.length) * 0.03, 0.035));
    rows.slice(0, -1).forEach((z, i) => {
      for (let x = -5.5; x <= 5.5; x += 1) eps.add(x, top + 0.17, z + 0.25, P.eps + ((i + (x + 5.5) / 11) / rows.length) * 0.07, 0.028);
    });
    for (let x = -5; x <= 5; x += 2) topping.add(x, top + 0.48, 0, P.top + ((x + 5) / 10) * 0.02, 0.03);
  });

  // 4. cobertura em balanço e marquise (as lajes brancas das casas do Lago Sul)
  const roofY = floors[1] + FH + 0.78;
  batch(16.4, 0.42, 11.6, M.white, {}, 0.1).add(-0.4, roofY, 0.5, 0.585, 0.06, 'drop');
  batch(15.2, 0.3, 3.4, M.white, {}, 0.08).add(0, floors[1] - 0.02, 5.6, 0.605, 0.05, 'drop');
  batch(13.6, 1.0, 0.03, M.glass, { shadow: false }, 0.01).add(0, floors[1] + 0.62, 7.2, 0.87, 0.04, 'pop');

  // 5. vedações
  const wallX = batch(3.6, FH, 0.22, M.white, {}, 0.04);
  const wallZ = batch(0.22, FH, 3.6, M.white, {}, 0.04);
  floors.forEach((base, f) => {
    const y = base + FH / 2;
    const t0 = 0.625 + f * 0.045;
    [-4, 0, 4].forEach((x, i) => wallX.add(x, y, -4, t0 + i * 0.012, 0.045, 'grow'));
    [[-6, -2], [6, -2], [6, 2]].forEach(([x, z], i) => wallZ.add(x, y, z, t0 + 0.02 + i * 0.01, 0.045, 'grow'));
  });
  // parede em pedra (lateral esquerda do térreo) e volume branco superior
  batch(0.35, FH, 3.8, M.stoneWall, {}, 0.05).add(-6.05, F0 + FH / 2, 2, 0.7, 0.05, 'grow');
  batch(0.22, FH, 3.6, M.white, {}, 0.04).add(-6, floors[1] + FH / 2, 2, 0.7, 0.045, 'grow');
  batch(4.2, FH + 0.2, 1.1, M.white, {}, 0.12).add(0, floors[1] + FH / 2, 4.45, 0.72, 0.05, 'grow');

  // 6. esquadrias: vidro, caixilhos e brise de madeira
  const glassPane = batch(1.74, FH - 0.24, 0.04, M.glass, { shadow: false }, 0.01);
  const mullion = batch(0.07, FH - 0.1, 0.12, M.frame, {}, 0.02);
  const sill = batch(3.7, 0.08, 0.14, M.frame, {}, 0.02);
  const lightPanel = batch(3.4, FH - 0.5, 0.04, M.light, { shadow: false }, 0.01);
  const front = [[0, -4], [0, 0], [0, 4], [1, -4], [1, 4]];
  front.forEach(([f, x], i) => {
    const base = floors[f];
    const y = base + FH / 2;
    const t = 0.735 + i * 0.012;
    [-0.9, 0.9].forEach((dx, j) => glassPane.add(x + dx, y, 4.05, t + j * 0.006, 0.05, 'slide'));
    [-1.8, 0, 1.8].forEach((dx) => mullion.add(x + dx, y, 4.05, t - 0.01, 0.04, 'grow'));
    sill.add(x, base + 0.04, 4.05, t - 0.01, 0.04, 'pop');
    sill.add(x, base + FH - 0.04, 4.05, t - 0.01, 0.04, 'pop');
    lightPanel.add(x, y, 3.3, t, 0.04, 'pop');
  });
  lightPanel.add(-2, floors[1] + FH / 2, -3.7, 0.74, 0.04, 'pop');
  lightPanel.add(2, floors[1] + FH / 2, -3.7, 0.74, 0.04, 'pop');
  const slat = batch(0.12, FH - 0.1, 0.18, M.wood, {}, 0.02);
  for (let i = 0; i < 15; i++) slat.add(2.35 + i * 0.25, floors[1] + FH / 2, 4.32, 0.77 + i * 0.003, 0.03, 'grow');
  batch(W - 0.3, 0.04, D - 0.3, M.floor, { cast: false }, 0.01).add(0, F0 + 0.02, 0, 0.71, 0.04, 'pop');

  // 7. paisagismo: gramado, deck de pedra, piscina
  batch(30, 0.04, 26, M.lawn, { cast: false }, 0.01).add(0, 0.02, 1.5, 0.8, 0.06, 'pop');
  const deck = batch(1.96, 0.12, 1.96, M.stone, {}, 0.03);
  for (let x = -8; x <= 8; x += 2) for (let z = 6; z <= 13; z += 2) {
    if (x >= -6 && x <= 3 && z >= 8 && z <= 11) continue; // vão da piscina
    deck.add(x, 0.1, z, 0.82 + ((x + 8) / 16 + (z - 6) / 7) * 0.035, 0.03);
  }
  batch(9.4, 0.5, 3.6, M.poolTile, {}, 0.05).add(-1.5, -0.1, 9.6, 0.86, 0.04, 'pop');
  Object.values(all).forEach((b) => b.build());

  // água com ondulação
  const waterGeo = new THREE.PlaneGeometry(9.2, 3.4, 40, 16);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, M.water);
  water.position.set(-1.5, 0.12, 9.6);
  water.visible = false;
  scene.add(water);
  const wBase = waterGeo.attributes.position.array.slice();

  // árvores com balanço do vento
  const trees = [];
  [[9, 7.5, 1.3], [10, 11.5, 1.0], [-9.5, 11, 1.15], [-10.4, 6.6, 0.95], [9.6, -2.2, 1.25], [-10, -3, 1.1]].forEach(([x, z, s], i) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 2.2 * s, 6), M.trunk);
    trunk.position.y = 1.1 * s;
    trunk.castShadow = true;
    g.add(trunk);
    for (let k = 0; k < 4; k++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry((0.75 + rand() * 0.4) * s, 1), k % 2 ? M.leaf : M.leaf2);
      leaf.position.set((rand() - 0.5) * 1.1 * s, (2.4 + rand() * 0.9) * s, (rand() - 0.5) * 1.1 * s);
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(0.0001);
    g.userData = { start: 0.88 + i * 0.012, phase: rand() * 6 };
    scene.add(g);
    trees.push(g);
  });

  // luzes internas (acendem na entrega)
  const warm = [[-4, F0 + 2.2, 2], [4, F0 + 2.2, 2], [0, floors[1] + 2.2, 0]].map(([x, y, z]) => {
    const l = new THREE.PointLight('#ffb35c', 0, 14, 1.8);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  });
  const poolLight = new THREE.PointLight('#5fd0ff', 0, 10, 2);
  poolLight.position.set(-1.5, 0.6, 9.6);
  scene.add(poolLight);

  /* ---------- guindaste (cor da marca) ---------- */
  const crane = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: '#ff3b2f' });
  const MH = 19;
  const mast = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(1, MH, 1, 1, 19, 1)), lineMat);
  mast.position.y = MH / 2;
  crane.add(mast);
  const mastCore = new THREE.Mesh(new THREE.BoxGeometry(0.12, MH, 0.12), M.red);
  mastCore.position.y = MH / 2;
  [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].forEach(([x, z]) => {
    const c = mastCore.clone(); c.position.set(x, MH / 2, z); c.castShadow = true; crane.add(c);
  });
  const jibPivot = new THREE.Group();
  jibPivot.position.y = MH;
  crane.add(jibPivot);
  const jib = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(19, 0.9, 0.9, 19, 1, 1)), lineMat);
  jib.position.x = -6.5;
  jibPivot.add(jib);
  [[-0.42, -0.42], [-0.42, 0.42], [0.42, 0]].forEach(([y, z]) => {
    const chord = new THREE.Mesh(new THREE.BoxGeometry(19, 0.09, 0.09), M.red);
    chord.position.set(-6.5, y, z); chord.castShadow = true; jibPivot.add(chord);
  });
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.2, 1.4, 2, 0.12), M.red);
  cab.position.set(0.3, -0.4, 0.9);
  cab.castShadow = true;
  jibPivot.add(cab);
  const counter = new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.1, 1.1, 2, 0.08), M.concreteDark);
  counter.position.set(3.2, -0.3, 0);
  counter.castShadow = true;
  jibPivot.add(counter);
  const peak = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.ConeGeometry(0.7, 2.8, 4, 3)), lineMat);
  peak.position.y = 1.8;
  jibPivot.add(peak);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), M.beacon);
  beacon.position.y = 3.3;
  jibPivot.add(beacon);
  const tipBeacon = beacon.clone();
  tipBeacon.position.set(-15.8, 0.6, 0);
  jibPivot.add(tipBeacon);
  const trolleyX = -10;
  const cable = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(trolleyX, 0, 0), new THREE.Vector3(trolleyX, -6, 0)]),
    new THREE.LineBasicMaterial({ color: '#9a9ca1' })
  );
  jibPivot.add(cable);
  const hook = new THREE.Group();
  const pallet = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.15, 1.1, 2, 0.03), M.plank);
  hook.add(pallet);
  for (let i = 0; i < 3; i++) {
    const blk = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.9, 2, 0.04), M.eps);
    blk.position.set(-0.46 + i * 0.46, 0.29, 0);
    blk.castShadow = true;
    hook.add(blk);
  }
  jibPivot.add(hook);
  crane.position.set(13, 0, -9);
  scene.add(crane);

  /* ---------- poeira dourada ---------- */
  const N = mobile ? 220 : 520;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rand() - 0.5) * 60;
    pos[i * 3 + 1] = rand() * 20;
    pos[i * 3 + 2] = (rand() - 0.5) * 50;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#ffd2a0', size: 0.08, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---------- pós-processamento ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!mobile) {
    try {
      gtao = new GTAOPass(scene, camera, 1, 1);
      gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.1 });
      gtao.blendIntensity = 0.85;
      composer.addPass(gtao);
    } catch (e) { gtao = null; }
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.45, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- câmera cinematográfica (keyframes por etapa) ---------- */
  const camPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-34, 27, 34),  // 0.00 aéreo: gabarito e fundação
    new THREE.Vector3(-30, 13, 27),  // 0.25 desce para a estrutura
    new THREE.Vector3(-10, 22, 37),  // 0.50 por cima: a laje treliçada
    new THREE.Vector3(30, 11, 36),   // 0.75 gira: vedação e esquadrias
    new THREE.Vector3(8, 6, 40),     // 1.00 frontal: entrega com piscina
  ], false, 'catmullrom', 0.5);
  const tgtPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.5, 1),
    new THREE.Vector3(0, 2.8, 0),
    new THREE.Vector3(0, 4.5, 0),
    new THREE.Vector3(0, 4.2, 1.5),
    new THREE.Vector3(0, 3.8, 4),
  ]);

  let w = 0, h = 0;
  const frame = (k) => {
    if (w >= 900) camera.setViewOffset(w, h, -w * 0.2 * (1 - k * 0.45), 0, w, h);
    else camera.setViewOffset(w, h, w * 0.03 * (1 - k), h * (0.15 - 0.11 * k), w, h);
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    composer.setPixelRatio(DPR);
    camera.aspect = w / h;
    frame(0);
  };
  addEventListener('resize', resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const tmpC = new THREE.Color();
  let bs = 0, lastB = -1, mx = 0, my = 0, last = 0;

  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, t - last);
    last = t;

    // progresso suavizado (inércia cinematográfica)
    const target = clamp(FC.build || 0);
    bs += (target - bs) * (1 - Math.exp(-dt * (reduce ? 30 : 3.2)));
    if (Math.abs(target - bs) < 0.0001) bs = target;

    if (Math.abs(bs - lastB) > 0.00005) {
      all.forEach((b) => b.update(bs));
      lastB = bs;
    }

    // atmosfera: golden hour → hora azul
    const night = easeInOut(clamp((bs - 0.84) / 0.16));
    ['top', 'mid', 'hor'].forEach((k) => skyMat.uniforms[k].value.copy(SKY.golden[k]).lerp(SKY.blue[k], night));
    scene.fog.color.copy(skyMat.uniforms.hor.value).multiplyScalar(0.45);
    sun.color.copy(tmpC.set('#ffc48a').lerp(new THREE.Color('#8ea6ff'), night));
    sun.intensity = lerp(3.2, 0.9, night);
    hemi.intensity = lerp(0.5, 0.32, night);
    rim.intensity = lerp(0.9, 0.35, night);
    renderer.toneMappingExposure = lerp(1.0, 1.05, night);
    const lights = clamp((bs - 0.88) / 0.1);
    M.light.emissiveIntensity = lights * 0.85;
    warm.forEach((l) => (l.intensity = lights * 9));
    poolLight.intensity = lights * 8;
    M.water.emissiveIntensity = 0.2 + lights * 0.45;
    plot.material.opacity = 0.8 * (1 - clamp((bs - 0.75) / 0.08));
    bloom.strength = lerp(0.3, 0.55, night);

    // água
    water.visible = bs > 0.875;
    if (water.visible) {
      const p = waterGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = wBase[i * 3], z = wBase[i * 3 + 2];
        p.array[i * 3 + 1] = Math.sin(x * 1.6 + t * 1.4) * 0.025 + Math.cos(z * 2.1 + t * 1.1) * 0.02;
      }
      p.needsUpdate = true;
      waterGeo.computeVertexNormals();
      water.scale.setScalar(easeOut(clamp((bs - 0.875) / 0.04)));
    }

    // árvores crescem e balançam
    trees.forEach((g) => {
      const e = easeBack(clamp((bs - g.userData.start) / 0.05));
      g.scale.setScalar(Math.max(0.0001, e));
      g.rotation.z = Math.sin(t * 0.9 + g.userData.phase) * 0.025;
      g.rotation.x = Math.cos(t * 0.7 + g.userData.phase) * 0.02;
    });

    // guindaste: o braço acompanha a obra e o guindaste é desmontado na entrega
    jibPivot.rotation.y = -0.4 + Math.sin(t * 0.16) * 0.35 + bs * 2.4;
    const drop = 6 + Math.sin(t * 0.45) * 1.8;
    cable.geometry.attributes.position.setY(1, -drop);
    cable.geometry.attributes.position.needsUpdate = true;
    hook.position.set(trolleyX, -drop - 0.1, 0);
    hook.rotation.y = Math.sin(t * 0.6) * 0.35;
    hook.rotation.z = Math.sin(t * 1.2) * 0.03;
    const out = easeInOut(clamp((bs - 0.9) / 0.1));
    crane.position.y = -out * (MH + 4);
    M.beacon.emissiveIntensity = (Math.sin(t * 4) > 0.2 ? 6 : 0.4) * (1 - out);

    dust.rotation.y = t * 0.012;
    dust.position.y = Math.sin(t * 0.25) * 0.4;
    dustMat.opacity = lerp(0.6, 0.15, night);

    // câmera
    mx += (FC.mouseX - mx) * 0.035;
    my += (FC.mouseY - my) * 0.035;
    const u = easeInOut(bs);
    camPath.getPoint(u, camPos);
    tgtPath.getPoint(u, camTgt);
    if (w < 900) camPos.sub(camTgt).multiplyScalar(1.25 + 0.35 / Math.max(0.45, w / h)).add(camTgt);
    if (!reduce) {
      camPos.x += Math.sin(t * 0.11) * 0.8 + mx * 2.2;
      camPos.y += Math.cos(t * 0.09) * 0.4 - my * 1.2;
    }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    frame(easeOut(clamp((FC.scroll - 0.62) / 0.3)));

    composer.render(dt);
  };
  tick();
}
