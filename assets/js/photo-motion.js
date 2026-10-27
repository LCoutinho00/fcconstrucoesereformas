/* FC Construção & Reforma — movimento cinematográfico sobre fotos reais das obras.
   Cada foto ganha parallax de profundidade, empurrão lento de câmera, nuvens, folhas,
   água e um feixe de luz; entre as fotos, uma transição com borda de luz. */
(() => {
  'use strict';
  const canvas = document.getElementById('photo');
  const hero = document.getElementById('hero');
  const fallback = document.querySelector('.hero__img');
  if (!canvas || !fallback) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FC = (window.FC = window.FC || { scroll: 0, mouseX: 0, mouseY: 0 });

  // mark = área da marca FC na foto (x0, y0, x1, y1 em coordenadas da imagem, y para cima), preservada dos efeitos
  const SLIDES = [
    { src: 'obras/obras_01', mark: [0, 0.74, 0.17, 1], focus: [0.5, 0.52], water: 0, num: '[01]', name: 'SHIS QI 15', place: 'Residência · Lago Sul', gallery: 'qi15' },
    { src: 'shis-ql-6/shis-ql-6_06', mark: [0.8, 0.74, 1, 1], focus: [0.56, 0.45], water: 1, num: '[02]', name: 'SHIS QL 6', place: 'Residência · Lago Sul', gallery: 'ql6' },
    { src: 'unique/unique_07', mark: [0, 0.76, 0.22, 1], focus: [0.6, 0.5], water: 0, num: '[03]', name: 'Unique Duplex', place: 'Apartamento · Sudoeste', gallery: 'unique' },
  ];
  const HOLD = 8, FADE = 1.8; // segundos por foto e duração da transição

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return; // a <img> continua como fallback

  const VS = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
  const FS = `precision highp float;
  varying vec2 vUv;
  uniform sampler2D t0, t1;
  uniform vec2 s0, s1, f0, f1, res, mouse;
  uniform vec4 m0, m1;
  uniform float w0, w1, a0, a1, prog, time, scroll, intro;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float depth(vec2 uv){ return 1. - smoothstep(0.0, 0.8, uv.y); }   // base perto, céu longe
  float inRect(vec2 uv, vec4 r){ return step(r.x, uv.x) * step(uv.x, r.z) * step(r.y, uv.y) * step(uv.y, r.w); }

  vec3 scene(sampler2D tex, vec2 size, vec2 focus, vec4 mark, float water, float age, vec2 q, float push){
    float ra = res.x / res.y, ia = size.x / size.y;
    vec2 s = ra > ia ? vec2(1., ia / ra) : vec2(ra / ia, 1.);
    vec2 uv = (q - .5) * s + mix(vec2(.5), focus, 1. - min(s.x, s.y));
    // empurrão de câmera uniforme (Ken Burns): a foto inteira aproxima e desliza junto, sem deformar a arquitetura
    float zoom = 0.03 + min(age, 12.) * 0.006 + scroll * 0.14 + push + (1. - intro) * 0.1;
    uv = focus + (uv - focus) / (1. + zoom);
    vec2 drift = vec2(sin(time * 0.13), cos(time * 0.11) * 0.6) * 0.004 + mouse * vec2(0.008, -0.005);
    uv += drift;

    vec3 base = texture2D(tex, uv).rgb;
    float keep = 1. - inRect(uv, mark);
    // só a água da piscina ondula (azul forte na faixa de baixo da foto)
    float pool = water * smoothstep(0.12, 0.24, base.b - base.r) * (1. - smoothstep(0.18, 0.24, uv.y));

    vec2 o = pool * vec2(sin(uv.y * 160. + time * 2.1) + sin(uv.x * 90. - time * 1.3), cos(uv.x * 140. + time * 1.7)) * 0.0012;
    vec3 col = texture2D(tex, uv + o).rgb;
    float ca = sin(uv.x * 210. + sin(uv.y * 120. + time * 1.8) * 2. + time * 1.4) * sin(uv.y * 190. - time * 1.2 + sin(uv.x * 80.));
    col += pool * smoothstep(0.55, 1., ca) * 0.22;
    // feixe de sol que atravessa a fachada
    float beam = smoothstep(0.22, 0., abs(uv.x - fract(time * 0.045 + age * 0.0) * 1.8 + 0.4 - uv.y * 0.55));
    float lum = dot(col, vec3(.299, .587, .114));
    col += vec3(1., .86, .66) * beam * 0.13 * smoothstep(0.45, 0.9, lum) * keep;
    return col;
  }

  void main(){
    // transição: borda orgânica que varre da esquerda para a direita
    float w = vUv.x * 0.78 + (1. - vUv.y) * 0.22 + (noise(vUv * 5. + time * .2) - .5) * 0.18;
    float T = prog * 1.45 - 0.2;
    float k = 1. - smoothstep(T - 0.07, T + 0.07, w);
    float band = k * (1. - k) * 4.;
    vec2 off = vec2(band * 0.035, band * 0.01);
    vec3 a = scene(t0, s0, f0, m0, w0, a0, vUv + off, prog * 0.1);
    vec3 b = prog > 0. ? scene(t1, s1, f1, m1, w1, a1, vUv - off, (1. - prog) * 0.12) : a;
    vec3 col = mix(a, b, k);
    col += band * vec3(1., .78, .55) * 0.22;

    // gradação quente, vinheta suave, vazamento de luz e granulação
    col = pow(col, vec3(1.04)) * vec3(1.04, 1., .95);
    col = mix(col, col * vec3(1.08, .98, .9), .3);
    float leak = smoothstep(1.1, 0., distance(vUv, vec2(1.05, 1.05 + sin(time * .2) * .05)));
    col += vec3(1., .55, .25) * leak * 0.12;
    col *= mix(1., 0.82, smoothstep(0.45, 1.05, distance(vUv, vec2(.5))));
    // partículas de poeira dourada flutuando
    vec2 g = vUv * vec2(res.x / res.y, 1.) * 26. + vec2(time * .35, -time * .5);
    float sp = step(0.985, hash(floor(g))) * smoothstep(.35, 0., length(fract(g) - .5));
    col += vec3(1., .85, .6) * sp * 0.35 * (0.5 + 0.5 * sin(time * 2. + hash(floor(g)) * 6.28));
    col += (hash(vUv * res + time) - .5) * 0.03;
    gl_FragColor = vec4(col * intro, 1.);
  }`;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('photo-motion:', e);
    return;
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['t0', 't1', 's0', 's1', 'f0', 'f1', 'm0', 'm1', 'w0', 'w1', 'a0', 'a1', 'prog', 'time', 'scroll', 'intro', 'res', 'mouse']
    .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  gl.uniform1i(U.t0, 0);
  gl.uniform1i(U.t1, 1);

  // carrega a versão média no celular e a grande no desktop
  const big = innerWidth * Math.min(devicePixelRatio, 2) > 1400;
  const textures = [];
  const load = (i) => new Promise((resolve) => {
    if (textures[i]) return resolve(textures[i]);
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2); // unidade reservada para upload, sem mexer nas fotos em uso
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures[i] = { tex, w: img.naturalWidth, h: img.naturalHeight };
      resolve(textures[i]);
    };
    img.src = `assets/img/${SLIDES[i].src}${big ? '' : '-md'}.jpg?v=2`;
  });

  const bind = (unit, i) => {
    const t = textures[i], s = SLIDES[i], n = unit;
    gl.activeTexture(n ? gl.TEXTURE1 : gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform2f(n ? U.s1 : U.s0, t.w, t.h);
    gl.uniform2f(n ? U.f1 : U.f0, s.focus[0], s.focus[1]);
    gl.uniform4f(n ? U.m1 : U.m0, ...s.mark);
    gl.uniform1f(n ? U.w1 : U.w0, s.water);
  };

  // cartão e indicadores
  const card = document.querySelector('.hero__card');
  const dots = [...document.querySelectorAll('.hero__dots i')];
  const setCard = (i) => {
    const s = SLIDES[i];
    if (!card) return;
    card.querySelector('.hero__card-num').textContent = s.num;
    card.querySelector('b').textContent = s.name;
    card.querySelector('.hero__card-place').textContent = s.place;
    card.querySelector('[data-open]').dataset.open = s.gallery;
    card.classList.remove('is-swap');
    void card.offsetWidth;
    card.classList.add('is-swap');
  };

  const dpr = Math.min(devicePixelRatio, 1.5);
  const resize = () => {
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
  };
  addEventListener('resize', resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  let started = !document.getElementById('loader');
  addEventListener('fc:start', () => { started = true; });

  load(0).then(() => {
    bind(0, 0);
    canvas.classList.add('is-on');
    SLIDES.forEach((_, i) => i && load(i));
    let cur = 0, next = -1, tShown = 0, tTrans = -1, last = performance.now();
    let mx = 0, my = 0, sc = 0, intro = 0, clock = 0;
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      clock += dt;
      if (started) { intro += (1 - intro) * (reduce ? 1 : 0.025); tShown += dt; }
      mx += ((FC.mouseX || 0) - mx) * 0.05;
      my += ((FC.mouseY || 0) - my) * 0.05;
      sc += ((FC.scroll || 0) - sc) * 0.1;

      // troca de foto
      if (!reduce && next < 0 && tShown > HOLD && textures[(cur + 1) % SLIDES.length]) {
        next = (cur + 1) % SLIDES.length;
        bind(1, next);
        tTrans = 0;
        setTimeout(() => setCard(next), FADE * 450);
      }
      let p = 0;
      if (next >= 0) {
        tTrans += dt;
        p = Math.min(1, tTrans / FADE);
        if (p >= 1) { cur = next; next = -1; bind(0, cur); tShown = FADE; p = 0; }
      }
      dots.forEach((d, i) => {
        const active = i === (next >= 0 ? next : cur);
        d.classList.toggle('is-on', active);
        d.style.setProperty('--fill', active ? Math.min(1, tShown / HOLD) : 0);
      });

      const pe = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      gl.uniform1f(U.prog, pe);
      gl.uniform1f(U.a0, tShown);
      gl.uniform1f(U.a1, Math.max(0, tTrans));
      gl.uniform1f(U.time, reduce ? 4 : clock);
      gl.uniform1f(U.scroll, sc);
      gl.uniform1f(U.intro, intro);
      gl.uniform2f(U.mouse, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    requestAnimationFrame(loop);
  });
})();
