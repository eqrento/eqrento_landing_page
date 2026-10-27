/* EQrento landing page – interactions & motion (no dependencies) */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- placeholder links (href="#") do nothing for now ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  /* ---------- page loaded → header slides in ---------- */
  const markLoaded = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))]).then(markLoaded);
  } else markLoaded();

  /* ---------- header: scrolled state, mobile menu, scrollspy ---------- */
  const header = $('#header');
  const burger = $('.burger');
  const menu = $('#mobile-menu');

  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.hidden = false;
    document.body.classList.toggle('menu-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1200) setMenu(false); });

  const navLinks = $$('.nav__link');
  const spyTargets = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    const probe = window.innerHeight * 0.35;
    let current = spyTargets[0], best = -Infinity;
    for (const sec of spyTargets) {
      const top = sec.getBoundingClientRect().top;
      if (top <= probe && top > best) { best = top; current = sec; }
    }
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id));
  };

  /* ---------- reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- parallax (images move at different speeds) ---------- */
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  const updateParallax = () => {
    const vh = window.innerHeight;
    // gentler parallax on tablets and phones
    const w = window.innerWidth;
    const factor = w < 640 ? 0.3 : w <= 1200 ? 0.4 : 1;
    for (const el of parallaxEls) {
      const speed = parseFloat(el.dataset.parallax) || 0;
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const delta = (r.top + r.height / 2) - vh / 2;
      el.style.translate = `0 ${(-delta * speed * factor).toFixed(1)}px`;
    }
  };

  /* ---------- steps: pinned horizontal scroll + sequential highlight ---------- */
  const steps = $('#steps');
  const pin = $('.steps__pin', steps);
  const track = $('.steps__track', steps);
  const cards = $$('.step', steps);
  const bar = $('.steps__bar i', steps);
  const count = $('.steps__count b', steps);
  let stepsLen = 0, stepsOverflow = 0, pinned = false, lastActive = -1, pinTop = 0;

  const layoutSteps = () => {
    pinned = !reduceMotion && 'CSS' in window && CSS.supports('position', 'sticky');
    if (!pinned) {
      steps.style.height = '';
      track.parentElement.style.overflowX = 'auto';
      return;
    }
    const vh = window.innerHeight;
    stepsOverflow = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    // enough scroll distance so every one of the 6 stages gets its moment
    stepsLen = Math.max(stepsOverflow * 1.15, vh * 0.42 * cards.length);
    // let CSS pin the section low enough for the cards + progress bar to fit (see .steps__pin)
    pin.style.setProperty('--pin-h', `${pin.offsetHeight}px`);
    pin.style.setProperty('--pin-head', `${track.parentElement.offsetTop - 8}px`);
    pinTop = parseFloat(getComputedStyle(pin).top) || 0;
    steps.style.height = `${pin.offsetHeight + stepsLen}px`;
  };

  const updateSteps = () => {
    if (!pinned) return;
    const p = clamp((pinTop - steps.getBoundingClientRect().top) / stepsLen, 0, 1);
    // each card owns an equal slice of the scroll; the track glides so the
    // active card sits in the middle of the screen (clamped to the track ends)
    const n = cards.length;
    const f = clamp(p * n - 0.5, 0, n - 1);
    const i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), t = f - i0;
    const centre = (c) => c.offsetLeft + c.offsetWidth / 2;
    const target = centre(cards[i0]) + (centre(cards[i1]) - centre(cards[i0])) * t - document.documentElement.clientWidth / 2;
    track.style.transform = `translate3d(${(-clamp(target, 0, stepsOverflow)).toFixed(1)}px,0,0)`;
    const active = Math.round(f);
    if (active !== lastActive) {
      cards.forEach((c, i) => {
        c.classList.toggle('is-active', i === active);
      });
      count.textContent = String(active + 1).padStart(2, '0');
      lastActive = active;
    }
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  };

  /* ---------- key features: tabs / accordion ---------- */
  const feats = $$('.feat');
  // preload tab photos so switching is instant
  feats.forEach(f => [f.dataset.photo, f.dataset.screen].forEach(src => { if (src) { const i = new Image(); i.src = src; } }));
  const visual = $('.features__visual');
  const featGrid = $('.features__grid');
  const stacked = window.matchMedia('(max-width: 1200px)');
  // stacked layout: the visual sits right under the open item; side by side: back in the grid
  const placeVisual = () => {
    const open = feats.find(f => f.classList.contains('is-open')) || feats[0];
    if (stacked.matches) {
      if (open.nextElementSibling !== visual) open.after(visual);
      visual.classList.add('is-in');
    } else if (visual.parentElement !== featGrid) {
      featGrid.appendChild(visual);
    }
  };
  feats.forEach(feat => {
    $('.feat__head', feat).addEventListener('click', () => {
      if (feat.classList.contains('is-open')) return;
      feats.forEach(f => {
        const on = f === feat;
        f.classList.toggle('is-open', on);
        $('.feat__head', f).setAttribute('aria-selected', String(on));
      });
      // swap the photo (and, later, the screenshot) for the selected tab
      const photo = $('.js-feat-photo', visual);
      const screen = $('.js-feat-screen', visual);
      const next = feat.dataset.photo, nextScreen = feat.dataset.screen;
      const name = $('.feat__name', feat).textContent.trim();
      const swap = () => {
        if (next && photo.getAttribute('src') !== next) photo.src = next;
        if (nextScreen && screen.getAttribute('src') !== nextScreen) { screen.src = nextScreen; screen.alt = `EQrento app – ${name}`; }
      };
      if (reduceMotion) { swap(); placeVisual(); return; }
      visual.classList.add('is-swapping');
      setTimeout(() => { swap(); placeVisual(); visual.classList.remove('is-swapping'); }, 320);
    });
  });

  /* ---------- FAQ accordion ---------- */
  const qas = $$('.qa');
  qas.forEach(qa => {
    const btn = $('.qa__q', qa);
    btn.addEventListener('click', () => {
      const open = !qa.classList.contains('is-open');
      qas.forEach(o => {
        const on = o === qa ? open : false;
        o.classList.toggle('is-open', on);
        $('.qa__q', o).setAttribute('aria-expanded', String(on));
      });
    });
  });

  /* ---------- pricing: yearly / monthly prices + full comparison ---------- */
  const billingOpts = $$('.billing__opt');
  billingOpts.forEach(opt => opt.addEventListener('click', () => {
    const mode = opt.dataset.billing;   // "yearly" | "monthly": every price carries both texts
    billingOpts.forEach(o => o.setAttribute('aria-pressed', String(o === opt)));
    $$('[data-yearly][data-monthly]').forEach(el => { el.textContent = el.dataset[mode]; });
  }));
  const cmp = $('.cmp');
  if (cmp) {
    const cmpBtn = $('.cmp__toggle', cmp);
    cmpBtn.addEventListener('click', () => {
      const open = !cmp.classList.contains('is-open');
      cmp.classList.toggle('is-open', open);
      cmpBtn.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- platform diagram: scale + connector lines ---------- */
  const diagram = $('.platform__diagram');
  const svg = $('.platform__lines');
  const core = $('.platform__core');
  const DIAGRAM_W = 1640;

  const box = (el) => {
    const w = el.offsetWidth, h = el.offsetHeight, cx = el.offsetLeft, cy = el.offsetTop;
    return { cx, cy, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
  };

  const drawLines = () => {
    if (window.innerWidth <= 900) { diagram.style.removeProperty('--k'); return; }
    // scale so the outermost chips (incl. their full text) keep a 48px gap to the screen edge
    const half = DIAGRAM_W / 2;
    let reach = half;
    $$('.node', diagram).forEach(n => {
      const b = box(n);
      reach = Math.max(reach, half - b.l, b.r - half);
    });
    const avail = diagram.parentElement.clientWidth / 2 - 48;
    diagram.style.setProperty('--k', Math.min(1, avail / reach).toFixed(4));

    const C = box(core);
    const routes = {
      tl: n => `M${n.r},${n.cy} H${C.l + 86} V${C.t}`,
      tr: n => `M${n.l},${n.cy} H${C.r - 83} V${C.t}`,
      l1: n => `M${n.r},${n.cy} H${C.l - 180} V${C.t + 46} H${C.l}`,
      l2: n => `M${n.r},${n.cy} H${C.l - 180} V${C.t + 90} H${C.l}`,
      r1: n => `M${n.l},${n.cy} H${C.r + 180} V${C.t + 46} H${C.r}`,
      r2: n => `M${n.l},${n.cy} H${C.r + 180} V${C.t + 90} H${C.r}`,
      bl: n => `M${n.r},${n.cy} H${n.r + 70} V${C.b + 82} H${C.l + 86} V${C.b}`,
      br: n => `M${n.l},${n.cy} H${n.l - 70} V${C.b + 82} H${C.r - 83} V${C.b}`,
      b1: n => `M${n.cx},${n.t} V${C.b + 136} H${C.l + 179} V${C.b}`,
      b2: n => `M${n.cx},${n.t} V${C.b + 136} H${C.r - 187} V${C.b}`,
    };
    svg.setAttribute('viewBox', `0 0 ${diagram.offsetWidth} ${diagram.offsetHeight}`);
    svg.innerHTML = $$('.node', diagram).map((node, i) => {
      const fn = routes[node.dataset.node];
      return fn ? `<path d="${fn(box(node))}" style="transition-delay:${200 + i * 70}ms"/>` : '';
    }).join('');
  };

  if ('IntersectionObserver' in window) {
    const dio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => diagram.classList.add('is-drawn'), reduceMotion ? 0 : 600);
          dio.disconnect();
        }
      });
    }, { threshold: 0.25 });
    dio.observe(diagram);
  } else diagram.classList.add('is-drawn');

  /* ---------- logos: marquee when they don't fit in one row ---------- */
  const logos = $('.logos');
  const logoList = $('.logos__list', logos);
  const logoItems = $$('li', logoList);
  const layoutLogos = () => {
    if (reduceMotion) return;
    const wrap = logoList.parentElement;
    logos.classList.remove('is-marquee');
    // logos have different widths now (optical balancing): add them up with the gaps between them
    const gap = parseFloat(getComputedStyle(logoList).columnGap) || 0;
    const need = logoItems.reduce((sum, li) => sum + li.offsetWidth, 0) + gap * (logoItems.length - 1);
    const fits = wrap.clientWidth >= need;
    $$('li[data-clone]', logoList).forEach(li => li.remove());
    if (fits) return;
    logoItems.forEach(li => {
      const c = li.cloneNode(true);
      c.dataset.clone = '';
      c.setAttribute('aria-hidden', 'true');
      c.classList.add('is-in');
      logoList.appendChild(c);
    });
    logoItems.forEach(li => li.classList.add('is-in'));
    logos.classList.add('is-marquee');
    // constant speed whatever the logo size: 80px per second, a bit quicker on phones where only ~2 logos are in view
    const speed = window.innerWidth <= 640 ? 95 : 80;
    logos.style.setProperty('--marquee-dur', `${(logoList.scrollWidth / 2 / speed).toFixed(1)}s`);
  };

  // touch: a tap on a logo highlights it and pauses the marquee; scrolling the page
  // (or tapping anywhere else) lets it run again
  let pointerType = 'mouse', touchedLogo = null, pausedAtY = 0;
  const resumeLogos = () => {
    if (!touchedLogo) return;
    touchedLogo.classList.remove('is-touched');
    logos.classList.remove('is-paused');
    touchedLogo = null;
  };
  document.addEventListener('pointerdown', e => { pointerType = e.pointerType; }, { passive: true });
  document.addEventListener('click', e => {
    if (pointerType === 'mouse') return;
    const li = e.target.closest ? e.target.closest('.logos__list li') : null;
    if (li && li === touchedLogo) return;
    resumeLogos();
    if (!li) return;
    touchedLogo = li;
    pausedAtY = window.scrollY;
    li.classList.add('is-touched');
    logos.classList.add('is-paused');
  });
  window.addEventListener('scroll', () => {
    if (touchedLogo && Math.abs(window.scrollY - pausedAtY) > 8) resumeLogos();   // ignore tiny jitters
  }, { passive: true });

  /* ---------- scroll / resize loop ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateHeader();
      updateSteps();
      updateParallax();
      ticking = false;
    });
  };
  let lastW = 0;
  const onResize = () => {
    placeVisual();
    if (window.innerWidth !== lastW) { lastW = window.innerWidth; layoutLogos(); }
    layoutSteps();
    drawLines();
    onScroll();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  onResize();
})();
/* ---------- testimonial video: big play button until the first play ---------- */
(() => {
  const video = document.querySelector('.testimonial__video');
  const play = document.querySelector('.testimonial__play');
  if (!video || !play) return;
  const showButton = () => { video.controls = false; play.hidden = false; };
  const hideButton = () => { play.hidden = true; video.controls = true; };
  showButton();
  play.addEventListener('click', () => {
    hideButton();
    const p = video.play();
    if (p && p.catch) p.catch(() => {});   // leave the native controls visible if playback is refused
  });
  video.addEventListener('play', hideButton);
  video.addEventListener('ended', () => { video.load(); showButton(); });   // back to the poster
})();

/* ---------- cookie consent ----------
   The choice is kept in localStorage (strictly necessary, so it needs no consent itself).
   To load a tool only after consent:  window.eqOnConsent('analytics', () => { …load the analytics script… });
   Bump VERSION when the Cookie Policy changes – everybody is asked again. */
(() => {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  const KEY = 'eq-cookie-consent', VERSION = 1;
  const prefs = banner.querySelector('.cookie__prefs');
  const boxes = [...banner.querySelectorAll('input[data-category]')];
  const btn = name => banner.querySelector(`[data-cookie="${name}"]`);
  const listeners = [];
  let hideTimer;

  const read = () => {
    try { const c = JSON.parse(localStorage.getItem(KEY)); return c && c.version === VERSION ? c : null; }
    catch (e) { return null; }
  };
  const apply = consent => {
    window.eqConsent = consent;
    document.dispatchEvent(new CustomEvent('eq:consent', { detail: consent }));
    listeners.forEach(l => { if (consent[l.category] && !l.done) { l.done = true; l.fn(); } });
  };
  window.eqOnConsent = (category, fn) => {
    const l = { category, fn, done: false };
    listeners.push(l);
    if (window.eqConsent && window.eqConsent[category]) { l.done = true; fn(); }
  };

  const setCustomize = on => {
    prefs.hidden = !on;
    banner.classList.toggle('is-custom', on);
    btn('customize').hidden = on;
    btn('save').hidden = !on;
  };
  const show = customize => {
    clearTimeout(hideTimer);
    const current = read() || {};
    boxes.forEach(b => { b.checked = !!current[b.dataset.category]; });
    setCustomize(customize);
    banner.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
  };
  const hide = () => {
    banner.classList.remove('is-visible');
    hideTimer = setTimeout(() => { banner.hidden = true; }, 450);
  };
  const save = choice => {
    const consent = {
      version: VERSION, date: new Date().toISOString(),
      necessary: true, analytics: !!choice.analytics, marketing: !!choice.marketing
    };
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch (e) {}
    apply(consent);
    hide();
  };

  btn('accept').addEventListener('click', () => save({ analytics: true, marketing: true }));
  btn('reject').addEventListener('click', () => save({}));
  btn('customize').addEventListener('click', () => { setCustomize(true); boxes[0] && boxes[0].focus(); });
  btn('save').addEventListener('click', () =>
    save(Object.fromEntries(boxes.map(b => [b.dataset.category, b.checked]))));
  document.querySelectorAll('[data-cookie-open]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); show(true); }));

  const stored = read();
  if (stored) apply(stored);
  else setTimeout(() => show(false), 600);
})();
