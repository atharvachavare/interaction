/**
 * Shelter for Design & Interactions — scroll morph.
 * Hero: phone rises between two clouds, screen = living lockscreen + Dynamic Island.
 * Scroll: clouds part, phone descends into the bento grid, screen crossfades to the
 *         wallet (credit-card) animation, the six cards fade in around it.
 */
(function () {
  const mq = window.matchMedia('(max-width: 820px)');
  const track = document.getElementById('track');
  const phone = document.getElementById('phone');
  const headline = document.getElementById('headline');
  const cloudL = document.getElementById('cloudL');
  const cloudR = document.getElementById('cloudR');
  const cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  const scrLock = document.getElementById('scrLock');
  const scrWallet = document.getElementById('scrWallet');
  const scrollcue = document.getElementById('scrollcue');
  const clockDate = document.getElementById('clockDate');

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  try { clockDate.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) {}

  /* ---------- Dynamic Island ---------- */
  const wave = '<div class="wave"><i></i><i></i><i></i><i></i><i></i></div>';
  const compact = {
    idle:  { w: 74,  h: 22, r: 12, html: '' },
    music: { w: 152, h: 26, r: 13, html: '<div class="di-row"><div class="di-leadicon di-cover">♪</div><div><div class="di-title">Ólafur</div><div class="di-meta">re:member</div></div><div class="di-spacer"></div>' + wave + '</div>' },
    timer: { w: 124, h: 26, r: 13, html: '<div class="di-row"><div class="ring" style="--p:62%"></div><div><div class="di-title">Focus</div><div class="di-meta">14:32</div></div></div>' },
    call:  { w: 150, h: 26, r: 13, html: '<div class="di-row"><div class="di-leadicon" style="background:#34c759">✳</div><div><div class="di-title">Claude</div><div class="di-meta">mobile…</div></div><div class="di-spacer"></div><div class="pdot"></div></div>' },
  };
  const di = document.getElementById('di');
  const diInner = document.getElementById('diInner');
  let cur = 'idle', hovering = false, swapT = null;
  function paint(s) {
    di.style.width = s.w + 'px'; di.style.height = s.h + 'px'; di.style.borderRadius = s.r + 'px';
    diInner.classList.add('swap'); clearTimeout(swapT);
    swapT = setTimeout(() => { diInner.innerHTML = s.html; diInner.classList.remove('swap'); }, 150);
  }
  function renderDI() { paint(compact[hovering && cur === 'idle' ? 'music' : cur] || compact.idle); }
  const tl = [['music', 4200], ['idle', 1400], ['timer', 4000], ['idle', 1400], ['call', 3400], ['idle', 1600]];
  let ti = 0;
  (function tick() { cur = tl[ti][0]; if (!hovering) renderDI(); const d = tl[ti][1]; ti = (ti + 1) % tl.length; setTimeout(tick, d); })();
  di.addEventListener('mouseenter', () => { hovering = true; renderDI(); });
  di.addEventListener('mouseleave', () => { hovering = false; renderDI(); });

  /* ---------- Scroll morph ---------- */
  let ready = false, tries = 0, ticking = false, phoneRest = null, headRest = null;

  function measure() {
    phone.style.transform = ''; headline.style.transform = '';
    void track.offsetHeight;
    const pr = phone.getBoundingClientRect();
    phoneRest = { left: pr.left, top: pr.top, width: pr.width };
    const hr = headline.getBoundingClientRect();
    headRest = { top: hr.top };
  }

  function apply(p) {
    if (!ready) return;
    const vw = window.innerWidth, vh = window.innerHeight;

    const heroW = clamp(vw * 0.20, 250, 320);
    const heroLeft = vw / 2 - heroW / 2;
    const heroTop = vh * 0.10;
    const sc = clamp(heroW / phoneRest.width, 0.5, 2.6);
    const tx = (heroLeft - phoneRest.left) * (1 - p);
    const ty = (heroTop - phoneRest.top) * (1 - p);
    const s = 1 + (sc - 1) * (1 - p);
    phone.style.transform = (p >= 0.999) ? '' : 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    phone.style.zIndex = (p < 0.6) ? 7 : '';

    scrLock.style.opacity = String(1 - clamp((p - 0.52) / 0.30, 0, 1));
    scrWallet.style.opacity = String(clamp((p - 0.58) / 0.30, 0, 1));

    const off = p * vw * 0.30;
    cloudL.style.transform = 'translate(calc(-50% + ' + (-66 - off) + 'px), calc(-50% + ' + (84 + p * 110) + 'px)) rotate(-11deg)';
    cloudR.style.transform = 'translate(calc(-50% + ' + (66 + off) + 'px), calc(-50% + ' + (92 + p * 110) + 'px)) rotate(8deg)';
    const cop = 1 - clamp(p / 0.5, 0, 1);
    cloudL.style.opacity = cop; cloudR.style.opacity = cop;

    const hHeroTop = vh * 0.60, hHeroScale = 1.55;
    if (p >= 0.999) { headline.style.transform = ''; }
    else {
      const hty = (hHeroTop - headRest.top) * (1 - p);
      const hs = 1 + (hHeroScale - 1) * (1 - p);
      headline.style.transform = 'translateY(' + hty + 'px) scale(' + hs + ')';
    }

    cards.forEach(function (c, i) {
      const rv = clamp((p - 0.42 - i * 0.03) / 0.4, 0, 1);
      c.style.opacity = rv;
      c.style.transform = (p >= 0.999) ? '' : 'translateY(' + ((1 - rv) * 16) + 'px) scale(' + (0.97 + 0.03 * rv) + ')';
    });

    if (scrollcue) scrollcue.style.opacity = String(1 - clamp(p / 0.16, 0, 1));
  }

  function progress() {
    const denom = track.offsetHeight - window.innerHeight;
    return denom <= 0 ? 0 : clamp(-track.getBoundingClientRect().top / denom, 0, 1);
  }
  function clearInline() {
    [phone, headline, cloudL, cloudR, scrLock, scrWallet, scrollcue].forEach(function (e) { if (e) { e.style.transform = ''; e.style.opacity = ''; } });
    cards.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; });
  }
  function valid() { return phoneRest && phoneRest.width > 100 && headRest; }
  function start() {
    if (mq.matches) { ready = false; clearInline(); return; }
    measure();
    if (!valid() && tries < 30) { tries++; requestAnimationFrame(start); return; }
    ready = true; apply(progress());
  }
  function boot() {
    tries = 0; ready = false;
    const f = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    f.then(function () { requestAnimationFrame(start); });
  }
  function onScroll() { if (mq.matches || !ready) return; if (!ticking) { requestAnimationFrame(function () { apply(progress()); ticking = false; }); ticking = true; } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { ready = false; clearInline(); boot(); });
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
