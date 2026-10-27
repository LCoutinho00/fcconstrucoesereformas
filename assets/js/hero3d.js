/* FC Construção & Reforma — cena 3D do hero: a obra se constrói com o scroll */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const FC = (window.FC = window.FC || { intro: 0, scroll: 0, build: 0, mouseX: 0, mouseY: 0 });
const canvas = document.getElementById('scene');
const hero = document.getElementById('hero');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 900px)').matches || matchMedia('(pointer: coarse)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const BG = new THREE.Color('#0d0e10');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 38, 95);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  /* ---------- luzes ---------- */
  scene.add(new THREE.HemisphereLight('#c9d3e2', '#1b1611', 0.55));
  const sun = new THREE.DirectionalLight('#ffe0c0', 2.6);
  sun.position.set(16, 28, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.PointLight('#e2231a', 60, 40, 1.6);
  rim.position.set(-14, 8, -10);
  scene.add(rim);

  /* ---------- chão ---------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: '#141518', roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(120, 60, '#3a3c41', '#23252a');
  grid.position.y = 0.01;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  /* ---------- materiais ---------- */
  const M = {
    concrete: new THREE.MeshStandardMaterial({ color: '#a19e97', roughness: 0.92 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: '#7d7a74', roughness: 0.95 }),
    eps: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: '#2e3034', roughness: 0.45, metalness: 0.7 }),
    white: new THREE.MeshStandardMaterial({ color: '#dcd9d2', roughness: 0.7, envMapIntensity: 0.6 }),
    stone: new THREE.MeshStandardMaterial({ color: '#cfc5b2', roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: '#9fc2d6', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.38, envMapIntensity: 1.6 }),
    light: new THREE.MeshStandardMaterial({ color: '#2a2218', emissive: '#ffc77a', emissiveIntensity: 0, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: '#2f95d6', roughness: 0.08, metalness: 0.1, emissive: '#0c4c7a', emissiveIntensity: 0.6 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3d5a3c', roughness: 0.9, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 1 }),
    red: new THREE.MeshStandardMaterial({ color: '#e2231a', roughness: 0.5, metalness: 0.2 }),
  };

  /* ---------- peças instanciadas ---------- */
  const box = new THREE.BoxGeometry(1, 1, 1);
  const tmp = new THREE.Object3D();
  class Batch {
    constructor(mat, { shadow = true, geo = box } = {}) {
      this.mat = mat; this.geo = geo; this.items = []; this.shadow = shadow;
    }
    add(x, y, z, sx, sy, sz, start, dur = 0.05, mode = 'drop') {
      this.items.push({ x, y, z, sx, sy, sz, start, dur, mode });
    }
    build() {
      this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
      this.mesh.castShadow = this.shadow;
      this.mesh.receiveShadow = true;
      this.mesh.frustumCulled = false;
      scene.add(this.mesh);
    }
    update(b) {
      const m = this.mesh;
      this.items.forEach((it, i) => {
        const t = clamp((b - it.start) / it.dur);
        if (t <= 0) {
          tmp.position.set(it.x, -50, it.z); tmp.scale.set(0.0001, 0.0001, 0.0001);
        } else if (it.mode === 'grow') {
          const e = easeOut(t);
          tmp.scale.set(it.sx, it.sy * e, it.sz);
          tmp.position.set(it.x, it.y - (it.sy * (1 - e)) / 2, it.z);
        } else if (it.mode === 'pop') {
          const e = easeBack(t);
          tmp.scale.set(it.sx * e, it.sy * e, it.sz * e);
          tmp.position.set(it.x, it.y, it.z);
        } else { // drop
          const e = easeOut(t);
          tmp.scale.set(it.sx, it.sy, it.sz);
          tmp.position.set(it.x, it.y + (1 - e) * 5, it.z);
        }
        tmp.rotation.set(0, 0, 0);
        tmp.updateMatrix();
        m.setMatrixAt(i, tmp.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  }

  const B = {
    found: new Batch(M.concreteDark),
    col: new Batch(M.concrete),
    beam: new Batch(M.concrete),
    joist: new Batch(M.steel),
    eps: new Batch(M.eps),
    top: new Batch(M.concrete),
    roof: new Batch(M.white),
    wall: new Batch(M.white),
    glass: new Batch(M.glass, { shadow: false }),
    light: new Batch(M.light, { shadow: false }),
    stone: new Batch(M.stone),
    water: new Batch(M.water, { shadow: false }),
    trunk: new Batch(M.trunk),
    leaf: new Batch(M.leaf, { geo: new THREE.IcosahedronGeometry(1, 0) }),
  };

  // dimensões da obra
  const XS = [-6, -2, 2, 6];
  const ZS = [-4, 0, 4];
  const W = 12, D = 8, FH = 3;
  const F0 = 0.4;                // topo da fundação
  const floors = [F0, F0 + FH + 0.5]; // base de cada pavimento

  // fundação em placas, em onda a partir do canto
  for (let x = -6.5; x < 6.5; x += 1) {
    for (let z = -4.5; z < 4.5; z += 1) {
      const d = Math.hypot(x + 7, z + 5) / 16;
      B.found.add(x + 0.5, F0 / 2, z + 0.5, 0.98, F0, 0.98, 0.0 + d * 0.1, 0.035, 'drop');
    }
  }

  // pavimentos: pilares, vigas, laje treliçada com EPS, capa de concreto
  const slabPhase = [
    { col: 0.12, beam: 0.19, joist: 0.22, eps: 0.245, top: 0.335 },
    { col: 0.37, beam: 0.43, joist: 0.455, eps: 0.475, top: 0.555 },
  ];
  floors.forEach((base, f) => {
    const P = slabPhase[f];
    const top = base + FH;
    let k = 0;
    XS.forEach((x) => ZS.forEach((z) => {
      B.col.add(x, base + FH / 2, z, 0.42, FH, 0.42, P.col + (k++ / 12) * 0.05, 0.04, 'grow');
    }));
    ZS.forEach((z, i) => B.beam.add(0, top + 0.2, z, W + 0.42, 0.4, 0.36, P.beam + i * 0.012, 0.035));
    XS.forEach((x, i) => B.beam.add(x, top + 0.2, 0, 0.36, 0.4, D + 0.42, P.beam + 0.03 + i * 0.008, 0.035));
    // vigotas treliçadas (ao longo de X) a cada 0.5 em Z
    const rows = [];
    for (let z = -3.75; z <= 3.76; z += 0.5) rows.push(z);
    rows.forEach((z, i) => B.joist.add(0, top + 0.12, z, W, 0.16, 0.1, P.joist + (i / rows.length) * 0.03, 0.03));
    // blocos de EPS entre as vigotas
    rows.slice(0, -1).forEach((z, i) => {
      for (let x = -5.5; x <= 5.5; x += 1) {
        B.eps.add(x, top + 0.17, z + 0.25, 0.94, 0.26, 0.38, P.eps + ((i + (x + 5.5) / 11) / rows.length) * 0.07, 0.025, 'drop');
      }
    });
    // capa de concreto
    for (let x = -5; x <= 5; x += 2) B.top.add(x, top + 0.45, 0, 2.02, 0.1, D + 0.4, P.top + ((x + 5) / 10) * 0.02, 0.025, 'drop');
  });

  // cobertura em balanço (laje branca marcante, como nas casas do Lago Sul)
  const roofY = floors[1] + FH + 0.72;
  [[-4.5, -3], [-4.5, 3], [4.5, -3], [4.5, 3]].forEach(([x, z], i) => {
    B.roof.add(x, roofY, z * 1.05, 7.2, 0.42, 5.6, 0.585 + i * 0.012, 0.04, 'drop');
  });
  B.roof.add(0, floors[1] - 0.08 + 0.02, 5.6, W + 3, 0.34, 2.4, 0.6, 0.04, 'drop'); // marquise do térreo

  // vedações (paredes brancas) e vidros
  floors.forEach((base, f) => {
    const y = base + FH / 2;
    const t0 = 0.625 + f * 0.05;
    [[-4, -4], [0, -4], [4, -4]].forEach(([x, z], i) => B.wall.add(x, y, z, 3.6, FH, 0.2, t0 + i * 0.012, 0.04, 'grow'));
    [[-6, -2], [-6, 2], [6, -2], [6, 2]].forEach(([x, z], i) => B.wall.add(x, y, z, 0.2, FH, 3.6, t0 + 0.02 + i * 0.01, 0.04, 'grow'));
    // fachada frontal: térreo todo em vidro; superior com volume branco central
    const front = f === 0 ? [-4, 0, 4] : [-4, 4];
    front.forEach((x, i) => {
      B.glass.add(x, y, 4, 3.55, FH - 0.1, 0.06, 0.74 + f * 0.04 + i * 0.012, 0.05, 'pop');
      B.light.add(x, y, 3.5, 3.3, FH - 0.4, 0.04, 0.74 + f * 0.04 + i * 0.012, 0.05, 'pop');
    });
    if (f === 1) B.wall.add(0, y, 4.05, 3.7, FH, 0.3, 0.72, 0.04, 'grow');
  });
  B.light.add(0, floors[1] + FH / 2, -3.75, W - 1, FH - 0.6, 0.04, 0.8, 0.05, 'pop');

  // deck de pedra, piscina e jardim
  for (let x = -7; x <= 7; x += 2) {
    for (let z = 6; z <= 12; z += 2) {
      B.stone.add(x, 0.06, z, 1.96, 0.12, 1.96, 0.82 + ((x + 7) / 14 + (z - 6) / 6) * 0.04, 0.03, 'drop');
    }
  }
  B.water.add(-1.5, 0.14, 9.6, 9, 0.06, 3.4, 0.875, 0.04, 'pop');
  [[8.5, 7.5, 1.3], [9.5, 11, 1.0], [-9, 10.5, 1.15], [-9.8, 6.5, 0.9], [8.6, -2, 1.2]].forEach(([x, z, s], i) => {
    B.trunk.add(x, 0.9 * s, z, 0.18, 1.8 * s, 0.18, 0.88 + i * 0.012, 0.03, 'grow');
    B.leaf.add(x, 2.4 * s, z, 1.1 * s, 1.4 * s, 1.1 * s, 0.89 + i * 0.012, 0.04, 'pop');
  });

  Object.values(B).forEach((b) => b.build());

  /* ---------- guindaste (cor da marca) ---------- */
  const crane = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: '#e2231a' });
  const MH = 17;
  const mast = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(0.9, MH, 0.9, 1, 17, 1)), lineMat);
  mast.position.y = MH / 2;
  crane.add(mast);
  const jibPivot = new THREE.Group();
  jibPivot.position.y = MH;
  crane.add(jibPivot);
  const jib = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(17, 0.8, 0.8, 17, 1, 1)), lineMat);
  jib.position.x = -5.5;
  jibPivot.add(jib);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), M.red);
  cab.position.set(0.2, -0.3, 0);
  cab.castShadow = true;
  jibPivot.add(cab);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1), M.steel);
  counter.position.set(2.6, -0.4, 0);
  jibPivot.add(counter);
  const peak = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.ConeGeometry(0.6, 2.4, 4, 2)), lineMat);
  peak.position.y = 1.6;
  jibPivot.add(peak);
  const trolleyX = -9;
  const cableGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(trolleyX, 0, 0), new THREE.Vector3(trolleyX, -6, 0)]);
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: '#8b8d92' }));
  jibPivot.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1), M.eps);
  load.castShadow = true;
  jibPivot.add(load);
  crane.position.set(11, 0, -8);
  scene.add(crane);

  /* ---------- poeira no ar ---------- */
  const N = mobile ? 160 : 380;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 50;
    pos[i * 3 + 1] = Math.random() * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffd9b0', size: 0.07, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  /* ---------- câmera / resize ---------- */
  let w = 0, h = 0;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    frame(0);
  };
  // desloca o enquadramento: prédio à direita no desktop, acima no mobile; centraliza na entrega
  const frame = (k) => {
    if (w >= 900) camera.setViewOffset(w, h, -w * 0.17 * (1 - k), 0, w, h);
    else camera.setViewOffset(w, h, w * 0.04 * (1 - k), h * (0.24 - 0.2 * k), w, h);
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  const target = new THREE.Vector3(0, 4.2, 1);
  let mx = 0, my = 0;
  let lastBuild = -1;
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const b = clamp(FC.build || 0);

    if (Math.abs(b - lastBuild) > 0.0002) {
      Object.values(B).forEach((batch) => batch.update(b));
      lastBuild = b;
    }
    // luzes internas acendem na entrega
    M.light.emissiveIntensity = clamp((b - 0.9) / 0.08) * 2.4;
    rim.intensity = 60 * (1 - clamp((b - 0.85) / 0.15) * 0.6);

    // guindaste gira e desce ao final (obra entregue)
    jibPivot.rotation.y = -0.6 + Math.sin(t * 0.18) * 0.5 + b * 2.2;
    const bob = Math.sin(t * 1.3) * 0.25;
    const drop = 5 + Math.sin(t * 0.4) * 1.5;
    cable.geometry.attributes.position.setY(1, -drop);
    cable.geometry.attributes.position.needsUpdate = true;
    load.position.set(trolleyX, -drop - 0.3 + bob * 0.2, 0);
    load.rotation.y = Math.sin(t * 0.7) * 0.3;
    const out = easeOut(clamp((b - 0.9) / 0.1));
    crane.position.y = -out * (MH + 3);

    // poeira
    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.2) * 0.3;

    // câmera orbita conforme o progresso + mouse
    mx += (FC.mouseX - mx) * 0.04;
    my += (FC.mouseY - my) * 0.04;
    const theta = -0.95 + b * 1.25 + mx * 0.18 + (reduce ? 0 : Math.sin(t * 0.08) * 0.04);
    const phi = 0.42 - b * 0.12 + my * 0.06;
    const radius = (w < 900 ? 40 + 26 / Math.max(0.5, w / h) : 44) - b * 3;
    camera.position.set(
      target.x + radius * Math.sin(theta) * Math.cos(phi),
      target.y + radius * Math.sin(phi),
      target.z + radius * Math.cos(theta) * Math.cos(phi)
    );
    camera.lookAt(target);
    frame(easeOut(clamp((FC.scroll - 0.62) / 0.3)));
    renderer.render(scene, camera);
  };
  tick();
}
