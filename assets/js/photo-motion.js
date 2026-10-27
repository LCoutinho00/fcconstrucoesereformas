/* FC Construção & Reforma — movimento cinematográfico sobre a foto real da obra (SHIS QL 6)
   Parallax de profundidade, água da piscina, nuvens e folhas animadas em WebGL. */
(() => {
  'use strict';
  const canvas = document.getElementById('photo');
  const img = document.querySelector('.hero__img');
  const hero = document.getElementById('hero');
  if (!canvas || !img) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FC = (window.FC = window.FC || { scroll: 0, mouseX: 0, mouseY: 0 });

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return; // a <img> continua visível como fallback

  const VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  // Mapa de profundidade aproximado da foto: base (piscina/deck) perto, céu longe.
  const FS = `precision highp float;
  varying vec2 vUv;
  uniform sampler2D tex;
  uniform vec2 res, imgSize, mouse;
  uniform float time, scroll, intro;

  float depth(vec2 uv){
    float d = 1. - smoothstep(0.02, 0.78, uv.y);          // de baixo (perto) para cima (longe)
    d = mix(d, 0.55, smoothstep(0.42, 0.5, uv.y) * (1. - smoothstep(0.62, 0.7, uv.y)) * 0.35); // fachada
    return d;
  }
  vec2 cover(vec2 uv){
    float ra = res.x / res.y, ia = imgSize.x / imgSize.y;
    vec2 s = ra > ia ? vec2(1., ia / ra) : vec2(ra / ia, 1.);
    vec2 focus = vec2(0.56, 0.45);                          // centro da escada/piscina
    return (uv - .5) * s + mix(vec2(.5), focus, 1. - min(s.x, s.y));
  }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main(){
    vec2 uv = cover(vUv);
    // dolly: aproxima mais o que está perto (sensação de câmera entrando)
    float zoom = 0.06 + scroll * 0.22 + (1. - intro) * 0.12;
    vec2 c = vec2(0.56, 0.42);
    float d0 = depth(uv);
    uv = c + (uv - c) / (1. + zoom * (0.55 + d0 * 0.9));
    // órbita lenta + mouse com parallax por profundidade
    vec2 drift = vec2(sin(time * 0.13), cos(time * 0.11) * 0.6) * 0.012 + mouse * vec2(0.022, -0.014);
    float d = depth(uv);
    uv += drift * (d - 0.45);

    vec3 base = texture2D(tex, uv).rgb;
    // máscaras por região/cor
    float pool = step(base.b, 1.) * smoothstep(0.08, 0.2, base.b - base.r) * (1. - smoothstep(0.2, 0.26, uv.y));
    float sky = smoothstep(0.66, 0.74, uv.y) * smoothstep(0.55, 0.75, base.b + base.g * .2) * step(base.r, base.b + 0.05);
    float leaf = smoothstep(0.02, 0.08, base.g - max(base.r, base.b)) * step(0.22, uv.y);
    // preserva a marca FC no canto superior direito da foto
    float mark = smoothstep(0.80, 0.83, uv.x) * smoothstep(0.74, 0.77, uv.y);
    sky *= 1. - mark;
    leaf *= 1. - mark;

    vec2 o = vec2(0.);
    // água: refração ondulando
    o += pool * vec2(sin(uv.y * 160. + time * 2.1) + sin(uv.x * 90. - time * 1.3), cos(uv.x * 140. + time * 1.7)) * 0.0016;
    // nuvens: deslizam devagar
    o += sky * vec2(sin(time * 0.05) * 0.018 + time * 0.0, 0.);
    // folhas: balanço do vento
    o += leaf * vec2(sin(time * 1.6 + uv.y * 30. + uv.x * 12.), cos(time * 1.3 + uv.x * 25.)) * 0.0016;

    vec3 col = texture2D(tex, uv + o).rgb;
    // reflexos de luz (cáusticas) na piscina
    float ca = sin(uv.x * 210. + sin(uv.y * 120. + time * 1.8) * 2. + time * 1.4) * sin(uv.y * 190. - time * 1.2 + sin(uv.x * 80.));
    col += pool * smoothstep(0.55, 1., ca) * 0.22;
    // gradação de cor quente e contraste suave
    col = pow(col, vec3(1.04));
    col *= vec3(1.04, 1.0, 0.95);
    col = mix(col, col * vec3(1.08, 0.98, 0.9), 0.35);
    // feixe de luz que varre a cena devagar
    float sweep = smoothstep(0.35, 0., abs(vUv.x - fract(time * 0.035) * 1.6 + 0.3 - vUv.y * 0.4));
    col += vec3(1., .85, .65) * sweep * 0.06;
    // granulação de filme
    col += (hash(vUv * res + time) - .5) * 0.035;
    // revelação inicial
    col *= intro;
    gl_FragColor = vec4(col, 1.);
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
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['tex', 'res', 'imgSize', 'mouse', 'time', 'scroll', 'intro'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  const start = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.tex, 0);
    gl.uniform2f(U.imgSize, img.naturalWidth, img.naturalHeight);

    const dpr = Math.min(devicePixelRatio, 1.5);
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.res, canvas.width, canvas.height);
    };
    addEventListener('resize', resize);
    resize();

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    let mx = 0, my = 0, sc = 0, intro = 0, started = false;
    const t0 = performance.now();
    window.addEventListener('fc:start', () => { started = true; });
    if (!document.getElementById('loader')) started = true;

    canvas.classList.add('is-on');
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!visible) return;
      const t = reduce ? 4 : (now - t0) / 1000;
      mx += ((FC.mouseX || 0) - mx) * 0.05;
      my += ((FC.mouseY || 0) - my) * 0.05;
      sc += ((FC.scroll || 0) - sc) * 0.1;
      if (started) intro += (1 - intro) * (reduce ? 1 : 0.025);
      gl.uniform1f(U.time, t);
      gl.uniform1f(U.scroll, sc);
      gl.uniform1f(U.intro, Math.max(0.0, intro));
      gl.uniform2f(U.mouse, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    requestAnimationFrame(loop);
  };
  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start, { once: true });
})();
