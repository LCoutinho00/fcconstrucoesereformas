/* FC Construção & Reforma — abertura em 3D: a casa nasce como planta (linhas) e se dissolve na obra real.
   WebGL puro, sem biblioteca. A rolagem desenha a casa por etapas (terreno, fundação, estrutura, alvenaria,
   acabamento); no fim a câmera entra na planta e ela some sobre o timelapse (build-scrub.js).
   A casa é um esquema ilustrativo, não a planta de uma obra específica.
   Se o WebGL faltar, o aparelho for fraco ou o usuário pedir menos movimento, a seção fica como antes:
   só o timelapse (a classe .has-plan não é aplicada). */
(() => {
  'use strict';
  const section = document.getElementById('build');
  const wrap = document.getElementById('plan');
  const canvas = document.getElementById('planCanvas');
  if (!section || !wrap || !canvas || !(+section.dataset.frames)) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection;
  const weak = (navigator.deviceMemory && navigator.deviceMemory < 3) || (conn && conn.saveData);
  if (reduce || weak) return;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) return;

  const FC = (window.FC = window.FC || { scroll: 0, mouseX: 0, mouseY: 0 });
  // faixas da rolagem dentro da seção (lidas também pelo build-scrub.js)
  const PLAN_END = 0.36, DISSOLVE = 0.08;
  FC.plan = { end: PLAN_END, dissolve: DISSOLVE };

  /* ---------------- modelo: segmentos e faces por etapa ---------------- */
  const STAGES = [[0, 0.14], [0.14, 0.32], [0.32, 0.56], [0.56, 0.78], [0.78, 1]];
  const segs = STAGES.map(() => []);   // [ax,ay,az,bx,by,bz,kind]
  const faces = STAGES.map(() => []);  // quads: 12 números + índice do segmento que "termina" a peça
  const seg = (s, a, b, kind = 0) => segs[s].push([...a, ...b, kind]);
  const quad = (s, p0, p1, p2, p3) => faces[s].push([...p0, ...p1, ...p2, ...p3, segs[s].length]);
  const box = (s, x0, y0, z0, x1, y1, z1, fill) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 5], [2, 6], [3, 7], [4, 5], [5, 6], [6, 7], [7, 4]].forEach(([i, j]) => seg(s, c[i], c[j]));
    if (fill) [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]].forEach((f) => quad(s, c[f[0]], c[f[1]], c[f[2]], c[f[3]]));
  };
  const rectZ = (s, x0, y0, x1, y1, z) => { // retângulo num plano de frente/fundo
    seg(s, [x0, y0, z], [x1, y0, z]); seg(s, [x1, y0, z], [x1, y1, z]); seg(s, [x1, y1, z], [x0, y1, z]); seg(s, [x0, y1, z], [x0, y0, z]);
  };
  const rectX = (s, z0, y0, z1, y1, x) => { // retângulo num plano lateral
    seg(s, [x, y0, z0], [x, y0, z1]); seg(s, [x, y0, z1], [x, y1, z1]); seg(s, [x, y1, z1], [x, y1, z0]); seg(s, [x, y1, z0], [x, y0, z0]);
  };

  const XS = [-8, -4, 0, 4, 8], ZS = [-5, 0, 5];

  // 0 · terreno: malha do piso e contorno do lote
  for (let x = -14; x <= 14; x += 2) seg(0, [x, 0, -10], [x, 0, 12], 1);
  for (let z = -10; z <= 12; z += 2) seg(0, [-14, 0, z], [14, 0, z], 1);
  rectLot();
  function rectLot() {
    const y = 0.02;
    seg(0, [-13, y, -9], [13, y, -9]); seg(0, [13, y, -9], [13, y, 11]); seg(0, [13, y, 11], [-13, y, 11]); seg(0, [-13, y, 11], [-13, y, -9]);
    // eixos da obra (linhas de locação)
    XS.forEach((x) => seg(0, [x, y, -7], [x, y, 7], 2));
    ZS.forEach((z) => seg(0, [-10, y, z], [10, y, z], 2));
  }

  // 1 · fundação: sapatas, vigas baldrame e contrapiso
  ZS.forEach((z) => XS.forEach((x) => box(1, x - 0.6, -0.9, z - 0.6, x + 0.6, -0.3, z + 0.6)));
  ZS.forEach((z) => { seg(1, [-8, -0.3, z], [8, -0.3, z]); seg(1, [-8, 0, z], [8, 0, z]); });
  XS.forEach((x) => { seg(1, [x, -0.3, -5], [x, -0.3, 5]); seg(1, [x, 0, -5], [x, 0, 5]); });
  box(1, -8, -0.2, -5, 8, 0, 5, true);

  // 2 · estrutura: pilares, lajes e cobertura
  ZS.forEach((z) => XS.forEach((x) => box(2, x - 0.15, 0, z - 0.15, x + 0.15, 3, z + 0.15)));
  box(2, -9, 3, -6, 9.6, 3.25, 6.6, true);
  ZS.forEach((z) => XS.slice(0, 4).forEach((x) => box(2, x - 0.15, 3.25, z - 0.15, x + 0.15, 6.25, z + 0.15)));
  box(2, -9.3, 6.25, -6.2, 5.3, 6.5, 6.4, true);

  // 3 · alvenaria: paredes e vãos
  box(3, -8, 0, -5.08, 8, 3, -4.92, true);       // fundo térreo
  box(3, -8.08, 0, -5, -7.92, 3, 5, true);       // lateral esquerda
  box(3, 7.92, 0, -5, 8.08, 3, 5, true);         // lateral direita
  box(3, -8, 0, 4.92, 0, 3, 5.08, true);         // frente térreo (metade fechada)
  box(3, -8, 3.25, -5.08, 4, 6.25, -4.92, true); // fundo superior
  box(3, -8.08, 3.25, -5, -7.92, 6.25, 5, true); // lateral esquerda superior
  box(3, 3.92, 3.25, -5, 4.08, 6.25, 5, true);   // lateral direita superior
  box(3, -8, 3.25, 4.92, -4, 6.25, 5.08, true);  // frente superior (trecho fechado)
  rectZ(3, -6.4, 0, -5.2, 2.3, 5.1);             // porta de entrada
  rectZ(3, -4.2, 1, -1.2, 2.3, 5.1);             // janela térreo
  rectX(3, -3, 1, 1, 2.3, -8.1); rectX(3, -3, 4.2, 1, 5.6, -8.1);
  rectX(3, -3.5, 0.2, 3.5, 2.6, 8.1);

  // 4 · acabamento: esquadrias, brise, guarda-corpo, pergolado e piscina
  for (let x = 0; x <= 8; x += 1) seg(4, [x, 0, 5], [x, 3, 5]);
  seg(4, [0, 2.2, 5], [8, 2.2, 5]);
  for (let x = -4; x <= 4; x += 1) seg(4, [x, 3.25, 5], [x, 6.25, 5]);
  seg(4, [-4, 5.4, 5], [4, 5.4, 5]);
  for (let x = -7.9; x <= -4.05; x += 0.28) seg(4, [x, 3.4, 5.5], [x, 6.15, 5.5]); // brise
  seg(4, [-8, 3.4, 5.5], [-4, 3.4, 5.5]); seg(4, [-8, 6.15, 5.5], [-4, 6.15, 5.5]);
  // guarda-corpo do terraço
  [[4.2, 6.5, 9.5, 6.5], [9.5, 6.5, 9.5, -5.9], [9.5, -5.9, 4.2, -5.9]].forEach(([x0, z0, x1, z1]) => {
    seg(4, [x0, 4.3, z0], [x1, 4.3, z1]); seg(4, [x0, 3.75, z0], [x1, 3.75, z1]);
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.3);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; seg(4, [x, 3.25, z], [x, 4.3, z]); }
  });
  // pergolado
  [[9.2, 6.2], [9.2, -5.6]].forEach(([x, z]) => box(4, x - 0.1, 3.25, z - 0.1, x + 0.1, 6.1, z + 0.1));
  for (let z = -5.6; z <= 6.25; z += 0.74) seg(4, [4, 6.1, z], [9.4, 6.1, z]);
  // degraus da entrada
  [0, 1, 2].forEach((i) => box(4, -7 + i * 0.1, -0.2 + i * 0.07, 5.1, -4.6 - i * 0.1, -0.13 + i * 0.07, 6.3 - i * 0.35));
  // piscina
  box(4, 1.5, -1.3, 7.6, 10.5, 0.02, 10.6);
  for (let z = 8.1; z < 10.6; z += 0.5) seg(4, [1.5, -0.12, z], [10.5, -0.12, z], 2);

  /* ---------------- buffers ---------------- */
  const L = [];  // por vértice: a(3) b(3) lado(2) tempo(2) tipo(1) = 11
  const F = [];  // por vértice: pos(3) tempo(1) = 4
  STAGES.forEach(([t0, t1], s) => {
    const n = segs[s].length, span = t1 - t0;
    const when = (i) => { const a = t0 + span * 0.78 * (i / Math.max(1, n - 1)); return [a, a + span * 0.22]; };
    segs[s].forEach((g, i) => {
      const [ts, te] = when(i);
      [[0, -1], [0, 1], [1, 1], [0, -1], [1, 1], [1, -1]].forEach(([u, v]) => L.push(g[0], g[1], g[2], g[3], g[4], g[5], u, v, ts, te, g[6]));
    });
    faces[s].forEach((q) => {
      const te = when(Math.min(n - 1, q[12]))[1];
      [0, 1, 2, 0, 2, 3].forEach((k) => F.push(q[k * 3], q[k * 3 + 1], q[k * 3 + 2], te));
    });
  });
  const lineCount = L.length / 11, faceCount = F.length / 4;

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const program = (vs, fs) => {
    const a = compile(gl.VERTEX_SHADER, vs), b = compile(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    const p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  };

  const lineProg = program(`
    attribute vec3 aA, aB; attribute vec2 aSide, aTime; attribute float aKind;
    uniform mat4 uMVP; uniform vec2 uRes; uniform float uW;
    varying float vU, vV, vKind, vDepth; varying vec2 vTime;
    void main(){
      vec4 ca = uMVP * vec4(aA, 1.), cb = uMVP * vec4(aB, 1.);
      float n = .2;
      if (ca.w < n && cb.w > n) ca = mix(ca, cb, (n - ca.w) / (cb.w - ca.w));
      else if (cb.w < n && ca.w > n) cb = mix(cb, ca, (n - cb.w) / (ca.w - cb.w));
      vec2 sa = ca.xy / max(ca.w, .001) * uRes * .5, sb = cb.xy / max(cb.w, .001) * uRes * .5;
      vec2 d = sb - sa; float len = length(d);
      d = len > .0001 ? d / len : vec2(1., 0.);
      vec4 c = mix(ca, cb, aSide.x);
      float w = uW * (aKind > .5 ? .6 : 1.);
      c.xy += vec2(-d.y, d.x) * aSide.y * w / (uRes * .5) * c.w;
      if (ca.w < n && cb.w < n) c = vec4(2., 2., 2., 1.);
      gl_Position = c;
      vU = aSide.x; vV = aSide.y; vKind = aKind; vTime = aTime; vDepth = c.w;
    }`, `
    precision mediump float;
    uniform float uP, uFar; uniform vec3 uInk, uRed;
    varying float vU, vV, vKind, vDepth; varying vec2 vTime;
    void main(){
      float r = clamp((uP - vTime.x) / (vTime.y - vTime.x), 0., 1.);
      if (vU > r) discard;
      float settled = smoothstep(0., .1, uP - vTime.y);
      vec3 col = mix(uRed, uInk, settled);
      float a = mix(1., .62, settled);
      a += (1. - settled) * smoothstep(.12, 0., r - vU) * .6;         // ponta da linha acesa enquanto desenha
      if (vKind > 1.5) { col = uRed; a = .5; }                         // eixos de locação
      else if (vKind > .5) { col = uInk; a = .1; }                     // malha do piso
      a *= 1. - smoothstep(.45, 1., abs(vV));                          // borda suave
      a *= mix(1., .3, smoothstep(uFar * .45, uFar, vDepth));          // o fundo recua
      gl_FragColor = vec4(col, a);
    }`);
  const faceProg = program(`
    attribute vec3 aPos; attribute float aT; uniform mat4 uMVP; varying float vT;
    void main(){ gl_Position = uMVP * vec4(aPos, 1.); vT = aT; }`, `
    precision mediump float; uniform float uP; uniform vec3 uInk; varying float vT;
    void main(){ gl_FragColor = vec4(uInk, .035 * smoothstep(0., .08, uP - vT)); }`);
  if (!lineProg || !faceProg) return;

  const lineBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L), gl.STATIC_DRAW);
  const faceBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, faceBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(F), gl.STATIC_DRAW);
  const loc = (p, names) => Object.fromEntries(names.map((n) => [n, n[0] === 'a' ? gl.getAttribLocation(p, n) : gl.getUniformLocation(p, n)]));
  const LP = loc(lineProg, ['aA', 'aB', 'aSide', 'aTime', 'aKind', 'uMVP', 'uRes', 'uW', 'uP', 'uFar', 'uInk', 'uRed']);
  const FP = loc(faceProg, ['aPos', 'aT', 'uMVP', 'uP', 'uInk']);

  /* ---------------- câmera ---------------- */
  const perspective = (fovy, aspect, n, f) => { const t = 1 / Math.tan(fovy / 2); return [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const lookAt = (e, c) => {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    let xx = zz, xz = -zx; const xl = Math.hypot(xx, xz); xx /= xl; xz /= xl; // up = (0,1,0)
    const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    return [xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  };
  const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp = (v) => Math.min(1, Math.max(0, v));

  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const resize = () => {
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w === W && h === H) return false;
    W = canvas.width = w; H = canvas.height = h;
    gl.viewport(0, 0, W, H);
    return true;
  };

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; section.classList.remove('has-plan'); wrap.style.display = 'none'; dispatchEvent(new Event('resize')); });

  section.classList.add('has-plan');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0.051, 0.055, 0.063, 1);

  let started = performance.now(), go = !!FC.started;
  addEventListener('fc:start', () => { go = true; started = performance.now(); }, { once: true });
  setTimeout(() => { if (!go) { go = true; started = performance.now(); } }, 6000);

  let shownQ = 0, mx = 0, my = 0, lastKey = '';
  const draw = (now) => {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? clamp(-r.top / total) : 0;
    const q = clamp(p / PLAN_END);
    const d = clamp((p - PLAN_END) / DISSOLVE);
    // o terreno e a locação se desenham sozinhos ao abrir o site; o resto é a rolagem que constrói
    const auto = go ? 0.15 * ease(clamp((now - started) / 2200)) : 0;
    const targetQ = Math.max(q, auto);
    shownQ += (targetQ - shownQ) * 0.14;
    mx += ((FC.mouseX || 0) - mx) * 0.05; my += ((FC.mouseY || 0) - my) * 0.05;

    wrap.style.opacity = String(1 - ease(d));
    wrap.style.visibility = d >= 1 ? 'hidden' : '';
    if (d >= 1) return;
    const sized = resize();
    const key = `${shownQ.toFixed(4)}|${d.toFixed(4)}|${mx.toFixed(3)}|${my.toFixed(3)}`;
    if (key === lastKey && !sized) return;
    lastKey = key;

    const aspect = W / H, portrait = aspect < 1;
    const k = ease(shownQ), dd = ease(d);
    const az = lerp(-0.95, -0.34, k) + mx * 0.06 + Math.sin(now / 5000) * 0.015;
    const el = lerp(0.62, 0.2, k) - my * 0.03;
    const rad = lerp(50, 33, k) * (portrait ? Math.min(3, 1.42 / aspect) : Math.max(1, 1.5 / aspect)) * lerp(1, 0.42, dd);
    const tgt = [0.4, lerp(1, 3.1, k), 0.6];
    const eye = [tgt[0] + rad * Math.cos(el) * Math.sin(az), tgt[1] + rad * Math.sin(el), tgt[2] + rad * Math.cos(el) * Math.cos(az)];
    const proj = perspective(0.62, aspect, 0.2, 400);
    // no celular (tela em pé) a casa sobe para deixar o título embaixo
    if (portrait) { proj[9] = -0.2; }
    const mvp = mul(proj, lookAt(eye, tgt));

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(faceProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, faceBuf);
    gl.enableVertexAttribArray(FP.aPos); gl.vertexAttribPointer(FP.aPos, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(FP.aT); gl.vertexAttribPointer(FP.aT, 1, gl.FLOAT, false, 16, 12);
    gl.uniformMatrix4fv(FP.uMVP, false, mvp); gl.uniform1f(FP.uP, shownQ); gl.uniform3f(FP.uInk, 0.953, 0.941, 0.918);
    gl.drawArrays(gl.TRIANGLES, 0, faceCount);
    gl.disableVertexAttribArray(FP.aPos); gl.disableVertexAttribArray(FP.aT);

    gl.useProgram(lineProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    const st = 44;
    [[LP.aA, 3, 0], [LP.aB, 3, 12], [LP.aSide, 2, 24], [LP.aTime, 2, 32], [LP.aKind, 1, 40]].forEach(([a, n, o]) => { gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, n, gl.FLOAT, false, st, o); });
    gl.uniformMatrix4fv(LP.uMVP, false, mvp);
    gl.uniform2f(LP.uRes, W, H);
    gl.uniform1f(LP.uW, dpr * (portrait ? 1.05 : 1.2));
    gl.uniform1f(LP.uP, shownQ);
    gl.uniform1f(LP.uFar, rad * 1.9);
    gl.uniform3f(LP.uInk, 0.953, 0.941, 0.918);
    gl.uniform3f(LP.uRed, 1.0, 0.255, 0.212);
    gl.drawArrays(gl.TRIANGLES, 0, lineCount);
    [LP.aA, LP.aB, LP.aSide, LP.aTime, LP.aKind].forEach((a) => gl.disableVertexAttribArray(a));
  };

  let on = false, raf = 0;
  const loop = (now) => { raf = requestAnimationFrame(loop); if (!lost) draw(now); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; lastKey = ''; raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
  }).observe(section);
})();
