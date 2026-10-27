/* FC Construção & Reforma — timelapse da obra controlado pelo scroll.
   Os quadros do vídeo ficam em assets/timelapse/{lg,sm}/f001.jpg … e são desenhados num canvas
   conforme a rolagem: descer constrói a casa, subir "desconstrói". O último quadro é a foto real. */
(() => {
  'use strict';
  const section = document.getElementById('build');
  const canvas = document.getElementById('buildCanvas');
  if (!section || !canvas) return;
  const ctx = canvas.getContext('2d');
  const count = +section.dataset.frames || 0;
  if (!count) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dir = innerWidth * Math.min(devicePixelRatio, 2) > 1100 ? 'lg' : 'sm';
  const src = (i) => `assets/timelapse/${dir}/f${String(i + 1).padStart(3, '0')}.jpg`;
  const pct = document.getElementById('buildPct');
  const stages = [...section.querySelectorAll('.build__stages li')];
  const done = section.querySelector('.build__done');
  const intro = section.querySelector('.build__intro');

  // carrega o primeiro e o último quadro primeiro; o resto em seguida, em ordem espaçada
  const frames = new Array(count);
  const load = (i) => new Promise((res) => {
    if (frames[i]) return res(frames[i]);
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { frames[i] = im; res(im); };
    im.onerror = () => res(null);
    im.src = src(i);
  });
  const order = [];
  for (let step = 16; step >= 1; step = Math.floor(step / 2)) {
    for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i);
    if (step === 1) break;
  }
  if (!order.includes(count - 1)) order.splice(1, 0, count - 1);

  const nearest = (i) => {
    for (let d = 0; d < count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  };

  let w = 0, h = 0;
  const dpr = Math.min(devicePixelRatio, 2);
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    last = -1;
  };
  addEventListener('resize', resize);

  // desenha "cover" com um leve empurrão de câmera ao longo da obra
  const draw = (im, p) => {
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight) * (1.0 + p * 0.06);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    ctx.drawImage(im, (cw - dw) / 2, (ch - dh) * 0.55, dw, dh);
  };

  let last = -1, shown = 0;
  const tick = () => {
    requestAnimationFrame(tick);
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const total = r.height - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    // a obra acontece entre 8% e 88% da seção; antes e depois o quadro fica parado
    const target = Math.min(1, Math.max(0, (p - 0.08) / 0.8));
    shown += (target - shown) * (reduce ? 1 : 0.18);
    const idx = Math.round(shown * (count - 1));
    if (idx !== last || !frames[idx]) {
      const im = frames[idx] || nearest(idx);
      if (im) { draw(im, shown); last = frames[idx] ? idx : -1; }
    }
    if (pct) pct.textContent = Math.round(shown * 100);
    const si = Math.min(stages.length - 1, Math.floor(shown * stages.length * 0.999));
    stages.forEach((li, k) => li.classList.toggle('is-active', k === si));
    if (intro) intro.style.opacity = String(1 - Math.min(1, p / 0.12));
    if (done) {
      const d = Math.min(1, Math.max(0, (p - 0.86) / 0.08));
      done.style.opacity = String(d);
      done.style.transform = `translateY(${(1 - d) * 30}px)`;
    }
  };

  resize();
  (async () => {
    await load(0);
    section.classList.add('is-ready');
    resize();
    window.dispatchEvent(new Event('resize')); // a seção passou a ocupar espaço: recalcula os ScrollTriggers
    requestAnimationFrame(tick);
    // carrega em paralelo, 6 por vez
    let k = 0;
    const worker = async () => { while (k < order.length) await load(order[k++]); };
    await Promise.all(Array.from({ length: 6 }, worker));
  })();
})();
