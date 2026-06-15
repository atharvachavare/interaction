/**
 * WILD-4 Flow — one morphing scene, no duplicated elements.
 * Scroll 0 → 1 morphs Flow 1 (hero) into Flow 2 (grid + headline at bottom):
 *  - Wallet / Pull / Sticker FLIP from their grid slots to hero poses (and back).
 *  - The headline rests at the bottom and morphs up to the hero position.
 *  - The other four cards fade in as the grid resolves.
 */
(function () {
  const mq = window.matchMedia('(max-width: 1180px)');
  const track = document.getElementById('track');
  const headline = document.getElementById('headline');
  const scrollcue = document.getElementById('scrollcue');

  const heroCards = {};
  document.querySelectorAll('[data-hero]').forEach(function (el) { heroCards[el.getAttribute('data-hero')] = el; });
  const revealCards = Array.prototype.slice.call(document.querySelectorAll('.card--reveal'));

  let finals = {};          // resting (Flow 2) rects, in viewport px
  let headFinal = null;
  let ticking = false;
  let ready = false;        // morph only runs once the grid is reliably measured
  let tries = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad() { return clamp(window.innerWidth * 0.045, 28, 64); }

  /* Hero poses (Flow 1), in viewport px. Card resting width is a fixed 240px. */
  function targets() {
    const vw = window.innerWidth, vh = window.innerHeight, p = pad();
    const wW = clamp(vw * 0.32, 360, 460);
    return {
      wallet:  { left: vw - wW - vw * 0.05, top: vh * 0.16, width: wW,  rot: 0 },
      pull:    { left: p,                    top: vh * 0.52, width: 200, rot: -3 },
      sticker: { left: p + 200 + 26,         top: vh * 0.60, width: 210, rot: 2 },
      headline:{ left: p,                    top: vh * 0.15, scale: 1.08 },
    };
  }

  /* Measure resting rects with all transforms cleared */
  function measure() {
    for (const k in heroCards) heroCards[k].style.transform = '';
    headline.style.transform = '';
    revealCards.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; });
    void track.offsetHeight; // reflow
    finals = {};
    for (const k in heroCards) {
      const r = heroCards[k].getBoundingClientRect();
      finals[k] = { left: r.left, top: r.top, width: r.width };
    }
    const h = headline.getBoundingClientRect();
    headFinal = { left: h.left, top: h.top };
  }

  function apply(p) {
    if (!ready) return;
    const tg = targets();

    for (const k in heroCards) {
      const f = finals[k], t = tg[k], el = heroCards[k];
      if (!f || !f.width) continue;
      if (p >= 0.999) { el.style.transform = ''; el.style.zIndex = ''; continue; }
      const s = clamp(t.width / f.width, 0.25, 2.4);
      const tx = (t.left - f.left) * (1 - p);
      const ty = (t.top - f.top) * (1 - p);
      const sc = 1 + (s - 1) * (1 - p);
      const rot = t.rot * (1 - p);
      el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ') rotate(' + rot + 'deg)';
      el.style.zIndex = (k === 'wallet') ? 5 : 6;
    }

    // Headline morphs between bottom (rest) and hero (top)
    const th = tg.headline;
    if (p >= 0.999) {
      headline.style.transform = '';
    } else {
      const tx = (th.left - headFinal.left) * (1 - p);
      const ty = (th.top - headFinal.top) * (1 - p);
      const sc = 1 + (th.scale - 1) * (1 - p);
      headline.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
    }

    // Remaining cards fade/scale in as the grid resolves
    const rev = clamp((p - 0.30) / 0.5, 0, 1);
    revealCards.forEach(function (c) {
      c.style.opacity = rev;
      c.style.transform = (p >= 0.999) ? '' : 'scale(' + (0.96 + 0.04 * rev) + ')';
      c.style.pointerEvents = rev > 0.5 ? 'auto' : 'none';
    });

    if (scrollcue) scrollcue.style.opacity = clamp(1 - p / 0.25, 0, 1);
  }

  function progress() {
    const denom = track.offsetHeight - window.innerHeight;
    if (denom <= 0) return 0;
    return clamp(-track.getBoundingClientRect().top / denom, 0, 1);
  }

  function clearInline() {
    headline.style.transform = '';
    if (scrollcue) scrollcue.style.opacity = '';
    for (const k in heroCards) { heroCards[k].style.transform = ''; heroCards[k].style.zIndex = ''; }
    revealCards.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; c.style.pointerEvents = ''; });
  }

  function validFinals() {
    if (!headFinal) return false;
    for (const k in heroCards) { if (!finals[k] || finals[k].width < 100) return false; }
    return true;
  }

  function onScroll() {
    if (mq.matches || !ready) return;
    if (!ticking) { window.requestAnimationFrame(function () { apply(progress()); ticking = false; }); ticking = true; }
  }

  // Measure only once the grid is reliably laid out; retry until it is.
  function start() {
    if (mq.matches) { ready = false; clearInline(); return; }
    measure();
    if (!validFinals() && tries < 30) { tries++; window.requestAnimationFrame(start); return; }
    ready = true;
    apply(progress());
  }

  function boot() {
    tries = 0; ready = false;
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { window.requestAnimationFrame(start); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { ready = false; clearInline(); boot(); });
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  /* ---------- Drawer ---------- */
  const DATA = {
    pull:    { title: 'Pull To Reload',   src: 'assets/pull-to-reload.gif',  desc: 'Click and drag the knob/handle down to see the loading animation.', tags: ['React', 'Framer Motion', 'TailwindCSS', 'Shadcn'] },
    stacked: { title: 'Stacked Cards v2',  src: 'assets/stacked-cards-v2.gif', desc: 'Drag the top card to cycle through the stack with spring physics.',  tags: ['React', 'Framer Motion', 'TailwindCSS'] },
    sticker: { title: 'Sticker',           src: 'assets/sticker.png',          desc: 'A draggable sticker that responds with playful spring motion.',      tags: ['React', 'Framer Motion'] },
    folded:  { title: 'Folded Email',      src: 'assets/folded-email.gif',     desc: 'Tap to unfold the message and reveal its content.',                  tags: ['React', 'Framer Motion', 'TailwindCSS', 'Shadcn'] },
    search:  { title: 'Search Input',      src: 'assets/search-input.gif',     desc: 'An animated search field with focus and command-key states.',        tags: ['React', 'TailwindCSS', 'Shadcn'] },
    switch:  { title: 'Animated Switch',   src: 'assets/animated-switch.gif',  desc: 'Toggle the switch to see the morphing knob animation.',              tags: ['React', 'Framer Motion', 'TailwindCSS'] },
    wallet:  { title: 'Wallet',            src: 'assets/wallet.gif',           desc: 'Swipe through cards in an interactive wallet view.',                 tags: ['React', 'Framer Motion', 'TailwindCSS', 'Shadcn'] },
  };

  const drawer = document.getElementById('drawer');
  const sheet = drawer.querySelector('.drawer__sheet');
  const titleEl = document.getElementById('drawer-title');
  const descEl = document.getElementById('drawer-desc');
  const tagsEl = document.getElementById('drawer-tags');
  const mediaEl = document.getElementById('drawer-media');
  let lastFocused = null;

  function openDrawer(key) {
    const d = DATA[key];
    if (!d) return;
    lastFocused = document.activeElement;
    titleEl.textContent = d.title;
    descEl.textContent = d.desc;
    mediaEl.src = d.src;
    mediaEl.alt = d.title;
    tagsEl.innerHTML = '';
    d.tags.forEach(function (t) { const c = document.createElement('span'); c.className = 'drawer__tag'; c.textContent = t; tagsEl.appendChild(c); });
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    sheet.focus();
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    sheet.style.transform = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('click', function () { openDrawer(card.getAttribute('data-key')); });
  });
  drawer.querySelectorAll('[data-drawer-close]').forEach(function (el) { el.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer(); });

  const CLOSE_THRESHOLD = 130;
  let dragging = false, startY = 0, currentY = 0;
  sheet.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.drawer__close')) return;
    dragging = true; startY = e.clientY; currentY = 0;
    sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const delta = e.clientY - startY;
    if (delta < 0) return;
    currentY = delta;
    sheet.style.transform = 'translate(-50%, ' + delta + 'px)';
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false; sheet.style.transition = '';
    if (currentY > CLOSE_THRESHOLD) closeDrawer(); else sheet.style.transform = '';
  }
  sheet.addEventListener('pointerup', endDrag);
  sheet.addEventListener('pointercancel', endDrag);
})();
