/* FC Construção & Reforma — interações e motion */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => innerWidth < 900;

  // estado compartilhado com a cena 3D (hero3d.js)
  const FC = (window.FC = window.FC || { scroll: 0, mouseX: 0, mouseY: 0 });

  const img = (p) => `assets/img/${p}.jpg`;
  const sm = (p) => `assets/img/${p}-sm.jpg`;
  const seq = (dir, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${dir}/${dir}_${String(from + i).padStart(2, '0')}`);

  const GALLERIES = {
    qi15: { title: 'SHIS QI 15 · Lago Sul', items: seq('shis-qi-15', 1, 9) },
    ql6: { title: 'SHIS QL 6 · Lago Sul', items: seq('shis-ql-6', 1, 9) },
    unique: { title: 'Unique Duplex · Sudoeste', items: seq('unique', 1, 9) },
    w3: {
      title: 'SHIGS 707 · Via W3',
      items: [20, 4, 8, 2, 3, 6, 18, 19, 1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 5, 7].map((n) => `copia-unique/copia-unique_${String(n).padStart(2, '0')}`),
    },
    ring: {
      title: 'Obras FC',
      items: [
        'extra/extra_03', 'shis-qi-15/shis-qi-15_03', 'unique/unique_07', 'obras/obras_01', 'copia-unique/copia-unique_12',
        'shis-ql-6/shis-ql-6_01', 'extra/extra_01', 'shis-qi-15/shis-qi-15_09', 'unique/unique_03', 'extra/extra_02',
        'obras/obras_03', 'shis-qi-15/shis-qi-15_05', 'extra/extra_04', 'shis-ql-6/shis-ql-6_04', 'copia-unique/copia-unique_05',
        'unique/unique_02',
      ],
    },
  };

  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else (typeof target === 'string' ? $(target) : target)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    document.body.classList.remove('nav-open');
    $('#burger').setAttribute('aria-expanded', 'false');
    scrollTo(id === '#topo' ? 0 : id);
  }));

  /* ---------------- split text ---------------- */
  $$('.split').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
  });

  /* ---------------- loader ---------------- */
  const loader = $('#loader');
  document.body.classList.add('is-loading');
  const finishLoader = () => {
    document.body.classList.remove('is-loading');
    if (!hasGsap || reduce) {
      loader.remove();
      startHero();
      return;
    }
    const tl = gsap.timeline({ onComplete: () => loader.remove() });
    tl.to('.loader__panel', { yPercent: -100, duration: 0.8, ease: 'expo.inOut' })
      .to(loader, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.35')
      .add(startHero, '-=0.55');
  };
  (() => {
    const count = $('#loaderCount');
    const bar = $('#loaderBar');
    const tri = $('.loader__tri');
    const fc = $('.loader__fc');
    let shown = 0;
    let target = 30;
    const t0 = performance.now();
    const ready = Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))),
    ]);
    ready.then(() => (target = 100));
    setTimeout(() => (target = 100), 4500);
    let last = t0;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - t0;
      const cap = Math.min(target, elapsed / 14); // mínimo ~1.4s de animação
      shown += (cap - shown) * (1 - Math.exp(-(now - last) / 110));
      last = now;
      if (cap === 100 && shown > 99.4) shown = 100;
      const p = shown / 100;
      count.textContent = Math.round(shown);
      bar.style.transform = `scaleX(${p})`;
      tri.style.strokeDashoffset = 640 * (1 - clamp(p * 1.25));
      fc.style.opacity = clamp((p - 0.55) * 3);
      if (shown < 100) requestAnimationFrame(tick);
      else setTimeout(finishLoader, 250);
    };
    requestAnimationFrame(tick);
  })();

  /* ---------------- hero ---------------- */
  function startHero() {
    if (hasGsap && !reduce) {
      gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.1, delay: 0.15 });
      gsap.from(['.hero__eyebrow', '.hero__lead', '.hero__actions', '.hero__top span'], { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.4 });
      gsap.fromTo('.hero__media', { clipPath: 'inset(18% 22% 18% 22% round 24px)', scale: 1.08 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.8, ease: 'expo.inOut' });
    }
    window.dispatchEvent(new Event('fc:start'));
  }

  // palavra rotativa
  (() => {
    const words = $$('#rotator span');
    let i = 0;
    if (words.length < 2 || reduce) return;
    setInterval(() => {
      const cur = words[i];
      i = (i + 1) % words.length;
      const next = words[i];
      cur.classList.remove('is-on');
      cur.classList.add('is-out');
      next.classList.remove('is-out');
      next.classList.add('is-on');
      setTimeout(() => cur.classList.remove('is-out'), 900);
    }, 2400);
  })();

  // scroll do hero: a câmera entra na foto e o conteúdo sai
  const hero = $('#hero');
  const heroContent = $('.hero__content');
  const heroCard = $('.hero__card');
  const updateHero = () => {
    const r = hero.getBoundingClientRect();
    const total = r.height - innerHeight;
    FC.scroll = total > 0 ? clamp(-r.top / total) : 0;
    const fade = clamp((FC.scroll - 0.15) / 0.6);
    heroContent.style.opacity = 1 - fade;
    heroContent.style.transform = `translateY(${-fade * 80}px)`;
    heroContent.style.visibility = fade > 0.99 ? 'hidden' : '';
    heroCard.style.opacity = 1 - clamp(FC.scroll / 0.4);
    requestAnimationFrame(updateHero);
  };
  requestAnimationFrame(updateHero);

  if (finePointer) {
    addEventListener('pointermove', (e) => {
      FC.mouseX = (e.clientX / innerWidth) * 2 - 1;
      FC.mouseY = (e.clientY / innerHeight) * 2 - 1;
    });
  }

  /* ---------------- header / progress / whatsapp ---------------- */
  const header = $('#header');
  const bar = $('.progress i');
  const wa = $('.wa-float');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.8 && !document.body.classList.contains('nav-open'));
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    wa.classList.toggle('is-on', y > hero.offsetHeight - innerHeight * 0.5);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $('#burger').addEventListener('click', (e) => {
    const open = document.body.classList.toggle('nav-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  // link ativo
  const sections = ['historia', 'obras', 'qualidade', 'servicos', 'contato'].map((id) => document.getElementById(id));
  const navLinks = $$('.nav a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => s && io.observe(s));

  /* ---------------- cursor + magnetic ---------------- */
  if (finePointer) {
    const cursor = $('.cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    const loop = () => {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .ring__item, summary, input, select, textarea, .compare'));
    });

    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(10px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- scroll animations ---------------- */
  if (hasGsap && !reduce) {
    // textos divididos em palavras
    $$('.split').forEach((el) => {
      gsap.from($$('.w > span', el), {
        yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.035,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });

    // títulos genéricos
    $$('.h2:not(.split), .eyebrow:not(.hero__eyebrow)').forEach((el) => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    // marquee com velocidade influenciada pelo scroll
    const track = $('.marquee__track');
    let mx = 0, vel = 0;
    ScrollTrigger.create({ onUpdate: (self) => { vel = clamp(self.getVelocity() / 300, -12, 12); } });
    gsap.ticker.add(() => {
      const half = track.scrollWidth / 2;
      mx -= 1 + Math.abs(vel);
      vel *= 0.92;
      if (-mx >= half) mx += half;
      track.style.transform = `translate3d(${mx}px,0,0) skewX(${-vel * 0.8}deg)`;
    });

    // contadores
    $$('.count').forEach((el) => {
      const to = +el.dataset.to;
      const from = to > 1000 ? to - 60 : 0;
      const o = { v: from };
      el.textContent = from;
      gsap.to(o, {
        v: to, duration: 2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => { el.textContent = Math.round(o.v); },
      });
    });
    gsap.from('.stat', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

    // história horizontal
    const hTrack = $('.history__track');
    const hDist = () => Math.max(0, hTrack.scrollWidth - innerWidth);
    const hTween = gsap.to(hTrack, {
      x: () => -hDist(), ease: 'none',
      scrollTrigger: { trigger: '.history', start: 'top top', end: () => `+=${hDist()}`, pin: '.history__pin', scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    $$('.chapter').forEach((ch) => {
      gsap.from(ch, {
        y: 80, rotate: 3, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: ch, containerAnimation: hTween, start: 'left 100%', end: 'left 70%', scrub: true },
      });
    });

    // statement: imagem expande
    const rv = gsap.timeline({ scrollTrigger: { trigger: '.reveal', start: 'top top', end: 'bottom bottom', scrub: 1 } });
    rv.to('.reveal__media', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
      .to('.reveal__media img', { scale: 1, ease: 'none' }, 0)
      .to('.reveal__title span:first-child', { xPercent: -18, ease: 'none' }, 0)
      .to('.reveal__title span:last-child', { xPercent: 18, ease: 'none' }, 0)
      .to('.reveal__title', { opacity: 0, ease: 'none', duration: 0.25 }, 0.75)
      .to('.reveal__caption', { opacity: 1, duration: 0.2 }, 0.8);

    // obras empilhadas
    const works = $$('.work');
    works.forEach((w, i) => {
      const shade = document.createElement('div');
      shade.className = 'work__shade';
      w.appendChild(shade);
      gsap.fromTo($('.work__bg img', w), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'top top', scrub: true } });
      gsap.from($$('.work__num, .work__title, .work__meta, .work__text, .work .btn', w).filter((el) => w.contains(el)), {
        y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: w, start: 'top 40%' },
      });
      const next = works[i + 1];
      if (next) {
        gsap.to(w, { scale: 0.9, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } });
        gsap.to(shade, { opacity: 0.6, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } });
      }
    });

    // pilares, processo, cards
    gsap.from('.pillar', { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.pillars', start: 'top 80%' } });
    gsap.from('.compare', { clipPath: 'inset(20% 20% 20% 20% round 22px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.compare', start: 'top 80%' } });
    const proc = $('.process');
    const fill = document.createElement('i');
    fill.className = 'line-fill';
    proc.prepend(fill);
    const steps = $$('.process li');
    gsap.to(fill, {
      scaleY: 1, ease: 'none',
      scrollTrigger: {
        trigger: proc, start: 'top 70%', end: 'bottom 55%', scrub: true,
        onUpdate: (self) => steps.forEach((li, k) => li.classList.toggle('is-on', self.progress >= k / (steps.length - 1) - 0.02)),
      },
    });
    gsap.from('.device--wide', { y: 80, rotateX: 12, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.delivery__media', start: 'top 80%' } });
    gsap.from('.device--phone', { y: 160, rotate: 6, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.15, scrollTrigger: { trigger: '.delivery__media', start: 'top 80%' } });
    gsap.from('.card', { y: 80, opacity: 0, rotateX: -10, duration: 1.1, ease: 'expo.out', stagger: { each: 0.07, grid: 'auto' }, scrollTrigger: { trigger: '.cards', start: 'top 82%' } });
    gsap.from('.faq__list details', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.faq__list', start: 'top 85%' } });

    // contato + rodapé
    gsap.fromTo('.contact__bg img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.contact__title', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 70%' } });
    gsap.from('.form', { y: 80, opacity: 0, rotate: 2, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 60%' } });
    gsap.from('.footer__giant', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'top 30%', scrub: true } });

    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------------- galeria 3D (anel) ---------------- */
  (() => {
    const ring = $('#ring');
    const stage = $('#ringStage');
    const items = GALLERIES.ring.items;
    const n = items.length;
    let cw = 260;
    const layout = () => {
      cw = innerWidth < 600 ? 150 : innerWidth < 1000 ? 200 : 250;
      ring.style.setProperty('--cw', `${cw}px`);
      const radius = Math.round((cw / 2) / Math.tan(Math.PI / n) * 1.12);
      $$('.ring__item', ring).forEach((el, i) => {
        el.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`;
      });
      ring.dataset.r = radius;
    };
    ring.innerHTML = items.map((p, i) => `<button class="ring__item" data-i="${i}" aria-label="Ampliar foto ${i + 1}"><img src="${sm(p)}" alt="" loading="lazy" draggable="false"></button>`).join('');
    layout();
    addEventListener('resize', layout);

    let drag = 0, vel = 0, down = false, lastX = 0, moved = 0;
    stage.addEventListener('pointerdown', (e) => { down = true; lastX = e.clientX; moved = 0; });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      vel = dx * 0.25;
      drag += vel;
    });
    addEventListener('pointerup', () => { down = false; });
    ring.addEventListener('click', (e) => {
      const b = e.target.closest('.ring__item');
      if (b && moved < 6) openLightbox('ring', +b.dataset.i);
    });

    const sec = $('.ring');
    let auto = 0;
    const loop = () => {
      const r = sec.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < innerHeight;
      if (visible) {
        const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
        if (!down) { drag += vel; vel *= 0.94; }
        if (!reduce) auto += 0.04;
        const tilt = -8 + Math.sin(p * Math.PI) * 4;
        ring.style.transform = `translateZ(-${ring.dataset.r * 0.9}px) rotateX(${tilt}deg) rotateY(${-p * 220 + drag + auto}deg)`;
      }
      requestAnimationFrame(loop);
    };
    loop();
  })();

  /* ---------------- antes / depois ---------------- */
  (() => {
    const c = $('#compare');
    const range = $('.compare__range', c);
    const set = (v) => c.style.setProperty('--pos', `${v}%`);
    range.addEventListener('input', () => set(range.value));
    if (hasGsap && !reduce) {
      // pequena demonstração automática quando aparece
      const o = { v: 50 };
      gsap.timeline({ scrollTrigger: { trigger: c, start: 'top 60%' } })
        .to(o, { v: 82, duration: 0.9, ease: 'power2.inOut', onUpdate: () => set(o.v) })
        .to(o, { v: 22, duration: 1.1, ease: 'power2.inOut', onUpdate: () => set(o.v) })
        .to(o, { v: 50, duration: 0.8, ease: 'power2.inOut', onUpdate: () => { set(o.v); range.value = o.v; } });
    }
  })();

  /* ---------------- vídeos: tocar só quando visíveis ---------------- */
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) {
        if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.25 });
  $$('video[data-autoplay]').forEach((v) => vio.observe(v));

  /* ---------------- lightbox ---------------- */
  const lb = $('#lightbox');
  const lbImg = $('img', lb.querySelector('figure'));
  const lbCap = $('figcaption', lb);
  const lbThumbs = $('.lightbox__thumbs', lb);
  let lbSet = null, lbIdx = 0, lastFocus = null;
  function showLb(i) {
    lbIdx = (i + lbSet.items.length) % lbSet.items.length;
    const p = lbSet.items[lbIdx];
    lbImg.src = img(p);
    lbImg.alt = `${lbSet.title} — foto ${lbIdx + 1}`;
    lbCap.textContent = `${lbSet.title} — ${lbIdx + 1} / ${lbSet.items.length}`;
    $$('button', lbThumbs).forEach((b, k) => b.classList.toggle('is-on', k === lbIdx));
    $$('button', lbThumbs)[lbIdx]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (hasGsap && !reduce) gsap.fromTo(lbImg, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
  }
  function openLightbox(key, i = 0) {
    lbSet = GALLERIES[key];
    lastFocus = document.activeElement;
    lbThumbs.innerHTML = lbSet.items.map((p, k) => `<button aria-label="Foto ${k + 1}"><img src="${sm(p)}" alt="" loading="lazy"></button>`).join('');
    $$('button', lbThumbs).forEach((b, k) => b.addEventListener('click', () => showLb(k)));
    lb.hidden = false;
    lenis?.stop();
    showLb(i);
    $('.lightbox__close', lb).focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    lenis?.start();
    lastFocus?.focus();
  }
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => openLightbox(b.dataset.open)));
  $('.lightbox__close', lb).addEventListener('click', closeLightbox);
  $('.lightbox__prev', lb).addEventListener('click', () => showLb(lbIdx - 1));
  $('.lightbox__next', lb).addEventListener('click', () => showLb(lbIdx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showLb(lbIdx + 1);
    if (e.key === 'ArrowLeft') showLb(lbIdx - 1);
  });
  let sx = 0;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) showLb(lbIdx + (dx < 0 ? 1 : -1));
  });

  /* ---------------- formulário → WhatsApp ---------------- */
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nome = f.nome.value.trim();
    f.nome.classList.toggle('is-invalid', !nome);
    if (!nome) { f.nome.focus(); return; }
    const linhas = [
      `Olá! Meu nome é ${nome}.`,
      `Tenho interesse em: ${f.tipo.value}.`,
      f.local.value.trim() && `Local: ${f.local.value.trim()}.`,
      f.msg.value.trim() && `Sobre a obra: ${f.msg.value.trim()}`,
      '(Mensagem enviada pelo site)',
    ].filter(Boolean);
    window.open(`https://wa.me/5561992531753?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank', 'noopener');
  });

  $('#year').textContent = new Date().getFullYear();
})();
