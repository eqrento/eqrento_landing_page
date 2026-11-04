/* EQrento landing page – interactions & motion (no dependencies) */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- one device pixel in CSS px (--dpx): the hero collage is rounded to whole device pixels, so it is shown
     1:1 instead of being resized; updated when the window moves to a screen with other scaling or the page is zoomed */
  const setDpx = () => {
    const dpr = window.devicePixelRatio || 1;
    root.style.setProperty('--dpx', `${1 / dpr}px`);
    window.matchMedia(`(resolution: ${dpr}dppx)`).addEventListener('change', setDpx, { once: true });
  };
  setDpx();

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
  const visual = $('.features__visual');
  // preload the other tabs' photo and screenshot (in the size this screen needs) once the section is near,
  // so switching is instant – but nobody who never scrolls that far downloads them
  const preloadTabs = () => feats.forEach(f => {
    if (f.dataset.photo) new Image().src = f.dataset.photo;
    if (f.dataset.screen) {
      const i = new Image();
      i.sizes = $('.js-feat-screen', visual).sizes;
      if (f.dataset.srcset) i.srcset = f.dataset.srcset;
      i.src = f.dataset.screen;
    }
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); preloadTabs(); }
    }, { rootMargin: '600px 0px' });
    io.observe(visual);
  } else preloadTabs();
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
  // after a tab opens, make sure its whole picture (the screenshot window plus the small photo that sticks out of it)
  // is on screen. Side by side: if part of it is hidden, scroll so it sits in the middle of the space under the fixed
  // header. Stacked (the picture follows the opened item): bring the item's head to the top of that space, or further
  // when that is needed for the picture to end on screen
  const showVisual = () => {
    let { top, bottom } = $('.features__screen', visual).getBoundingClientRect();
    if (!visual.classList.contains('is-nophoto')) {
      const p = $('.features__photo', visual).getBoundingClientRect();
      top = Math.min(top, p.top); bottom = Math.max(bottom, p.bottom);
    }
    const from = $('.header').getBoundingClientRect().bottom + 16, to = window.innerHeight - 16;
    if (top >= from && bottom <= to) return;
    const room = to - from, h = bottom - top;
    let shift;
    if (stacked.matches) {
      const open = feats.find(f => f.classList.contains('is-open'));
      shift = $('.feat__head', open).getBoundingClientRect().top - from;
      if (bottom - shift > to) shift = h <= room ? bottom - to : top - from;
    } else {
      shift = h <= room ? top - from - (room - h) / 2 : top - from;
    }
    window.scrollBy({ top: shift, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  feats.forEach(feat => {
    $('.feat__head', feat).addEventListener('click', () => {
      if (feat.classList.contains('is-open')) return;
      feats.forEach(f => {
        const on = f === feat;
        f.classList.toggle('is-open', on);
        $('.feat__head', f).setAttribute('aria-selected', String(on));
      });
      // swap the photo and the screenshot (srcset: the browser picks the size for this screen) for the selected tab
      const photo = $('.js-feat-photo', visual);
      const screen = $('.js-feat-screen', visual);
      const next = feat.dataset.photo, nextScreen = feat.dataset.screen;
      const name = $('.feat__name', feat).textContent.trim();
      const swap = () => {
        if (next && photo.getAttribute('src') !== next) photo.src = next;
        visual.classList.toggle('is-nophoto', !next);   // a tab without data-photo (AI Assistant) hides the small photo
        if (nextScreen && screen.getAttribute('src') !== nextScreen) {
          screen.srcset = feat.dataset.srcset || '';
          screen.src = nextScreen;
          screen.alt = `EQrento app – ${name}`;
        }
      };
      if (reduceMotion) { swap(); placeVisual(); setTimeout(showVisual, 50); return; }
      visual.classList.add('is-swapping');
      setTimeout(() => { swap(); placeVisual(); visual.classList.remove('is-swapping'); }, 320);
      setTimeout(showVisual, 560);   // the item has finished opening (0.5s): the picture is in its final place
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
      t:  n => `M${n.cx},${n.b} V${C.t}`,   // AI Assistant: straight down into the core
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
    // constant speed whatever the logo size (px per second): 110 on desktop / laptop (> 1200px), 80 on tablets,
    // 95 on phones where only ~2 logos are in view
    const vw = window.innerWidth;
    const speed = vw > 1200 ? 110 : vw <= 640 ? 95 : 80;
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

/* ---------- demo request dialog ----------
   Every link to #book-demo opens it; eqrento.com/#book-demo opens it on arrival (e-mails, ads).
   The form posts JSON to its data-endpoint: a Google Apps Script web app (README: “Demo request form”).
   The body goes as text/plain on purpose – that keeps it a “simple” cross-origin request with no CORS
   preflight, which Apps Script can’t answer. No endpoint yet, or sending failed → the visitor gets a
   pre-filled e-mail to contact@eqrento.com instead, so no request is lost. */
(() => {
  const dialog = document.getElementById('book-demo');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const HASH = '#book-demo', CONTACT = 'contact@eqrento.com', LABEL = 'Request my demo';
  const form = dialog.querySelector('.demo__form');
  const field = name => form.elements.namedItem(name);
  const views = { form: dialog.querySelector('[data-demo-view="form"]'), done: dialog.querySelector('[data-demo-view="done"]') };
  const status = dialog.querySelector('.demo__status');
  const submit = dialog.querySelector('.demo__submit');
  const other = form.querySelector('[data-demo-other]');
  let trigger = null, source = 'direct link', openedAt = 0, pushed = false, sending = false, downOnBackdrop = false, isOpen = false;

  /* where the visitor clicked (“pricing – Complete”, “hero”…) – it lands in the e-mail and the sheet */
  const AREAS = { header: 'header', 'mobile-menu': 'mobile menu', home: 'hero', why: 'why EQrento card', demo: 'closing call to action' };
  const sourceOf = el => {
    const plan = el.closest('.plan');
    if (plan) return 'pricing – ' + plan.querySelector('.plan__name').textContent.trim();
    const area = el.closest('[id]');
    return area ? AREAS[area.id] || area.id : 'page';
  };

  const showView = name => Object.entries(views).forEach(([key, view]) => { view.hidden = key !== name; });
  const open = el => {
    trigger = el;
    source = el ? sourceOf(el) : 'direct link';
    showView('form');
    if (!dialog.open) dialog.showModal();
    isOpen = true;
    document.body.classList.add('demo-open');
    openedAt = Date.now();
    dialog.scrollTop = 0;
    views.form.querySelector('.demo__title').focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('eq:demo-open', { detail: { source } }));
  };
  /* runs once per closing, whichever way it closes (button, backdrop, Esc, phone Back) – done here and not only
     in the dialog’s own "close" event, which browsers may deliver late */
  const cleanup = () => {
    if (!isOpen) return;
    isOpen = false;
    document.body.classList.remove('demo-open');
    if (pushed) { pushed = false; if (history.state && history.state.demo) history.back(); }
    else if (location.hash === HASH) history.replaceState(null, '', location.pathname + location.search);
    // focus goes back to the button that opened the form, once the dialog has actually closed
    setTimeout(() => { if (trigger && trigger.offsetParent && !dialog.open) trigger.focus({ preventScroll: true }); }, 0);
  };
  const close = () => { if (dialog.open) dialog.close(); cleanup(); };

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href="#book-demo"]');
    if (!link) return;
    e.preventDefault();
    // own history entry, so the phone’s Back button closes the form instead of leaving the page
    if (!dialog.open && location.hash !== HASH) { history.pushState({ demo: true }, '', HASH); pushed = true; }
    open(link);
  });
  if (location.hash === HASH) open(null);
  window.addEventListener('hashchange', () => { if (location.hash === HASH && !dialog.open) open(null); });
  window.addEventListener('popstate', () => { if (dialog.open && location.hash !== HASH) { pushed = false; close(); } });

  dialog.querySelectorAll('[data-demo-close]').forEach(b => b.addEventListener('click', close));
  // a click on the dimmed area closes it – not a drag that ends there, not the scrollbar
  dialog.addEventListener('pointerdown', e => { downOnBackdrop = e.target === dialog && e.clientX < dialog.clientWidth; });
  dialog.addEventListener('click', e => { if (downOnBackdrop && e.target === dialog) close(); });
  dialog.addEventListener('cancel', cleanup);   // Esc, or the Back gesture on Android
  dialog.addEventListener('close', cleanup);

  other.addEventListener('change', () => {
    field('rents_other').hidden = !other.checked;
    if (other.checked) field('rents_other').focus();
  });

  /* validation: only after the first “Request my demo”, then errors clear as the visitor fixes them */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const checks = [
    { box: form.querySelector('[data-demo-required="rents"]'), ok: () => !!form.querySelector('[name="rents"]:checked') },
    { box: form.querySelector('[data-demo-required="fleet_size"]'), ok: () => !!form.querySelector('[name="fleet_size"]:checked') },
    { input: field('company'), ok: () => field('company').value.trim() !== '' },
    { input: field('name'), ok: () => field('name').value.trim() !== '' },
    { input: field('email'), ok: () => EMAIL.test(field('email').value.trim()) }
  ];
  checks.forEach((c, i) => {
    c.holder = c.box || c.input.closest('.demo__field');
    c.error = c.holder.querySelector('.demo__error');
    c.error.id = 'demo-error-' + i;
  });
  const validate = () => {
    let first = null;
    checks.forEach(c => {
      const bad = !c.ok();
      c.error.hidden = !bad;
      const target = c.input || c.box;
      if (bad) target.setAttribute('aria-describedby', c.error.id); else target.removeAttribute('aria-describedby');
      if (c.input) c.input.setAttribute('aria-invalid', String(bad));
      if (bad && !first) first = c;
    });
    return first;
  };
  const revalidate = () => { if (form.dataset.tried) validate(); };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  const collect = () => {
    const utm = [...new URLSearchParams(location.search)]
      .filter(([k]) => /^(utm_|gclid|fbclid)/.test(k)).map(([k, v]) => k + '=' + v).join('&');
    let timezone = '';
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    return {
      rents: [...form.querySelectorAll('[name="rents"]:checked')].map(i => i.value),
      rents_other: other.checked ? field('rents_other').value.trim() : '',
      fleet_size: form.querySelector('[name="fleet_size"]:checked').value,
      company: field('company').value.trim(),
      name: field('name').value.trim(),
      email: field('email').value.trim(),
      phone: field('phone').value.trim(),
      message: field('message').value.trim(),
      website: field('website').value,   // spam trap
      source, page: location.origin + location.pathname, referrer: document.referrer, utm, timezone,
      language: navigator.language || '', seconds: Math.round((Date.now() - openedAt) / 1000)
    };
  };

  const setSending = on => {
    sending = on;
    submit.disabled = on;
    submit.querySelector('[data-demo-label]').textContent = on ? 'Sending…' : LABEL;
    form.setAttribute('aria-busy', String(on));
  };
  const done = data => {
    views.done.querySelector('[data-demo-done-title]').textContent = `Thank you, ${data.name.split(/\s+/)[0]} – request received!`;
    views.done.querySelector('[data-demo-done-email]').textContent = ` at ${data.email}`;
    form.reset();
    field('rents_other').hidden = true;
    form.querySelector('.demo__more').open = false;
    delete form.dataset.tried;
    showView('done');
    dialog.scrollTop = 0;
    views.done.querySelector('.demo__title').focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('eq:demo-request', { detail: { source: data.source, fleet_size: data.fleet_size } }));
  };
  const link = (text, href) => Object.assign(document.createElement('a'), { textContent: text, href });
  const fail = data => {
    const body = [
      'Hello EQrento team,', '', 'I’d like to book a 30-minute demo.', '',
      `Company: ${data.company}`, `Name: ${data.name}`, `Email: ${data.email}`, `Phone: ${data.phone || '–'}`,
      `Fleet size: ${data.fleet_size} units`,
      `We rent: ${data.rents.join(', ')}${data.rents_other ? ` (${data.rents_other})` : ''}`,
      '', data.message
    ].join('\n').trim();
    const mail = `mailto:${CONTACT}?subject=${encodeURIComponent('Demo request – ' + data.company)}&body=${encodeURIComponent(body)}`;
    status.replaceChildren('Your request couldn’t be sent just now. ', link('Send it by email instead', mail),
      ' – everything you entered is already filled in – or write to ', link(CONTACT, 'mailto:' + CONTACT), '.');
    status.hidden = false;
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    status.hidden = true;
    form.dataset.tried = '1';
    const bad = validate();
    if (bad) { (bad.input || bad.box.querySelector('input')).focus(); return; }
    const data = collect();
    if (data.website) { done(data); return; }   // a bot filled the trap: look successful, send nothing
    const endpoint = form.dataset.endpoint;
    if (!endpoint) { fail(data); return; }
    setSending(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify(data), signal: ctrl.signal });
      const reply = await res.json().catch(() => ({}));
      if (!res.ok || !reply.ok) throw new Error(reply.error || String(res.status));
      done(data);
    } catch (err) {
      fail(data);
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  });
})();
