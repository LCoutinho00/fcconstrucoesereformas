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
  // data-version muda sempre que os quadros forem trocados (mesmos nomes de arquivo): evita misturar com quadros antigos do cache
  const ver = section.dataset.version ? `?v=${section.dataset.version}` : '';
  const src = (i) => `assets/timelapse/${dir}/f${String(i + 1).padStart(3, '0')}.jpg${ver}`;
  const pct = document.getElementById('buildPct');
  const stages = [...section.querySelectorAll('.build__stages li')];
  const done = section.querySelector('.build__done');
  const intro = section.querySelector('.build__intro');

  // no celular usa um quadro sim, outro não (metade da memória e dos downloads); a fusão entre eles mantém a suavidade
  const stride = dir === 'sm' ? 2 : 1;
  const keys = [];
  for (let i = 0; i < count; i += stride) keys.push(i);
  if (keys[keys.length - 1] !== count - 1) keys.push(count - 1);

  const frames = new Array(count);
  const load = (i) => new Promise((res) => {
    if (frames[i]) return res(frames[i]);
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { frames[i] = im; res(im); };
    im.onerror = () => res(null);
    im.src = src(i);
  });
  // ordem de carga espaçada: primeiro e último, depois um a cada 16, 8, 4… (a obra inteira aparece cedo, em baixa cadência)
  const order = [0, count - 1];
  for (let step = 16; step >= 1; step = Math.floor(step / 2)) {
    for (let k = 0; k < keys.length; k += step) if (!order.includes(keys[k])) order.push(keys[k]);
    if (step === 1) break;
  }

  const nearest = (i) => {
    for (let d = 0; d < count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  };
  // vizinhos carregados em volta da posição contínua pos
  const around = (pos) => {
    let a = -1, b = -1;
    for (let i = Math.floor(pos); i >= 0; i--) if (frames[i]) { a = i; break; }
    for (let i = Math.floor(pos) + 1; i < count; i++) if (frames[i]) { b = i; break; }
    return [a, b];
  };

  const dpr = Math.min(devicePixelRatio, 2);
  let last = -1;
  const resize = () => {
    const cw = Math.round(canvas.clientWidth * dpr), ch = Math.round(canvas.clientHeight * dpr);
    if (cw === canvas.width && ch === canvas.height) return; // ex.: barra de endereço do iOS só muda a altura visível
    canvas.width = cw;
    canvas.height = ch;
    last = -1;
  };
  let resizeQueued = false;
  addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; resize(); });
  });

  // desenha "cover" com um leve empurrão de câmera ao longo da obra
  // overlay = true desenha só o quadro (sem o fundo), usado para fundir com o quadro seguinte
  const draw = (im, p, overlay) => {
    const cw = canvas.width, ch = canvas.height, iw = im.naturalWidth, ih = im.naturalHeight;
    if (cw / ch < 1) {
      // tela em pé: fundo escuro com o próprio quadro ampliado e apagado + quadro inteiro na parte de cima
      if (!overlay) {
        ctx.fillStyle = '#0d0e10';
        ctx.fillRect(0, 0, cw, ch);
        const sb = Math.max(cw / iw, ch / ih);
        ctx.globalAlpha = 0.3;
        ctx.drawImage(im, (cw - iw * sb) / 2, (ch - ih * sb) / 2, iw * sb, ih * sb);
        ctx.globalAlpha = 1;
      }
      const s = (cw / iw) * (1.5 + p * 0.05);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(im, (cw - dw) / 2, ch * 0.14, dw, dh);
      return;
    }
    const s = Math.max(cw / iw, ch / ih) * (1.0 + p * 0.06);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(im, (cw - dw) / 2, (ch - dh) * 0.55, dw, dh);
  };

  let shown = 0, lastStage = -1, lastPct = -1, on = false, raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    // a obra acontece entre 8% e 88% da seção; antes e depois o quadro fica parado
    const target = Math.min(1, Math.max(0, (p - 0.08) / 0.8));
    shown += (target - shown) * (reduce ? 1 : 0.18);
    // posição contínua: desenha o quadro atual e funde o seguinte pela fração (rolagem sem trancos)
    const pos = shown * (count - 1);
    if (Math.abs(pos - last) > 0.01) {
      const [i0, i1] = around(pos);
      const a = i0 >= 0 ? frames[i0] : nearest(Math.round(pos));
      if (a) {
        draw(a, shown, false);
        if (i0 >= 0 && i1 > i0) {
          const f = (pos - i0) / (i1 - i0);
          if (f > 0.03 && i1 - i0 <= stride) { ctx.globalAlpha = f; draw(frames[i1], shown, true); ctx.globalAlpha = 1; }
        }
        last = pos;
      }
    }
    const pc = Math.round(shown * 100);
    if (pct && pc !== lastPct) { pct.textContent = pc; lastPct = pc; }
    const si = Math.min(stages.length - 1, Math.floor(shown * stages.length * 0.999));
    if (si !== lastStage) { stages.forEach((li, k) => li.classList.toggle('is-active', k === si)); lastStage = si; }
    if (intro) intro.style.opacity = String(1 - Math.min(1, p / 0.12));
    if (done) {
      const d = Math.min(1, Math.max(0, (p - 0.86) / 0.08));
      done.style.opacity = String(d);
      done.style.transform = `translateY(${(1 - d) * 30}px)`;
    }
  };

  (async () => {
    await load(0);
    section.classList.add('is-ready');
    resize();
    window.dispatchEvent(new Event('resize')); // a seção passou a ocupar espaço: recalcula os ScrollTriggers
    // o laço só roda com a seção na tela
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; last = -1; raf = requestAnimationFrame(tick); }
      else if (!e.isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
    }).observe(section);
    // os demais quadros só começam a baixar depois da abertura, para não atrasar o carregamento inicial
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      let k = 0;
      const worker = async () => { while (k < order.length) await load(order[k++]); };
      Promise.all(Array.from({ length: 4 }, worker));
    };
    if (window.FC && window.FC.started) start();
    else addEventListener('fc:start', start, { once: true });
    setTimeout(start, 6000); // garantia caso a abertura não dispare
  })();
})();
