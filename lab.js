/**
 * INTERFACE?LAB hero — crafted micro-interactions.
 *  - A living Dynamic Island: cycles activities on its own, expands on hover.
 *  - Subtle cursor-driven 3D tilt on the phone.
 *  - Hover-after-delay hint. Live date. Caption reveal.
 */
(function () {
  const di = document.getElementById('di');
  const diInner = document.getElementById('diInner');
  const phone = document.getElementById('phone');
  const hero = document.querySelector('.hero');
  const hint = document.getElementById('hint');
  const caption = document.getElementById('caption');
  const clockDate = document.getElementById('clockDate');

  /* ---------- Live date ---------- */
  try {
    const now = new Date();
    clockDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (e) { /* keep fallback text */ }

  /* ---------- Dynamic Island ---------- */
  const wave = '<div class="wave"><i></i><i></i><i></i><i></i><i></i></div>';

  const compact = {
    idle:  { w: 122, h: 36, r: 20, html: '' },
    music: { w: 236, h: 44, r: 22, html:
      '<div class="di-row"><div class="di-leadicon di-cover">♪</div><div><div class="di-title">Ólafur Arnalds</div><div class="di-meta">re:member</div></div><div class="di-spacer"></div>' + wave + '</div>' },
    timer: { w: 200, h: 44, r: 22, html:
      '<div class="di-row"><div class="ring" style="--p:62%"></div><div><div class="di-title">Focus</div><div class="di-meta">14:32 left</div></div></div>' },
    call:  { w: 246, h: 44, r: 22, html:
      '<div class="di-row"><div class="di-leadicon" style="background:#34c759">✳</div><div><div class="di-title">Claude</div><div class="di-meta">mobile…</div></div><div class="di-spacer"></div><div class="pdot"></div></div>' },
  };

  const expanded = {
    music: { w: 280, h: 110, r: 34, html:
      '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:11px;height:100%">' +
      '<div style="display:flex;gap:12px;align-items:center"><div class="di-leadicon di-cover" style="width:46px;height:46px;border-radius:13px;font-size:20px">♪</div>' +
      '<div style="flex:1;text-align:left"><div class="di-title" style="font-size:14px">Ólafur Arnalds</div><div class="di-meta">re:member · now playing</div></div>' + wave + '</div>' +
      '<div style="height:4px;background:rgba(255,255,255,.18);border-radius:2px"><div style="width:42%;height:100%;background:#fff;border-radius:2px"></div></div></div>' },
    timer: { w: 262, h: 104, r: 34, html:
      '<div style="padding:16px;display:flex;align-items:center;gap:14px;height:100%">' +
      '<div class="ring" style="--p:62%;width:52px;height:52px"></div>' +
      '<div style="text-align:left"><div class="di-title" style="font-size:15px">Focus session</div><div class="di-meta" style="font-size:12px">14:32 remaining</div></div></div>' },
    call: { w: 268, h: 110, r: 34, html:
      '<div style="padding:16px;display:flex;flex-direction:column;gap:12px;height:100%">' +
      '<div style="display:flex;gap:12px;align-items:center"><div class="di-leadicon" style="background:#34c759;width:42px;height:42px;border-radius:999px;font-size:18px">✳</div>' +
      '<div style="flex:1;text-align:left"><div class="di-title" style="font-size:14px">Claude</div><div class="di-meta">incoming…</div></div><div class="pdot"></div></div></div>' },
  };

  let current = 'idle';
  let hovering = false;
  let swapTimer = null;
  let cycleTimer = null;

  function paint(spec) {
    di.style.width = spec.w + 'px';
    di.style.height = spec.h + 'px';
    di.style.borderRadius = spec.r + 'px';
    diInner.classList.add('swap');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      diInner.innerHTML = spec.html;
      diInner.classList.remove('swap');
    }, 150);
  }

  function render() {
    if (hovering) {
      const key = current === 'idle' ? 'music' : current;
      paint(expanded[key] || compact[key] || compact.idle);
    } else {
      paint(compact[current] || compact.idle);
    }
  }

  const timeline = [['music', 4400], ['idle', 1500], ['timer', 4200], ['idle', 1500], ['call', 3600], ['idle', 1700]];
  let ti = 0;
  function tick() {
    current = timeline[ti][0];
    if (!hovering) render();
    const dur = timeline[ti][1];
    ti = (ti + 1) % timeline.length;
    cycleTimer = setTimeout(tick, dur);
  }

  di.addEventListener('mouseenter', function () { hovering = true; render(); });
  di.addEventListener('mouseleave', function () { hovering = false; render(); });
  tick();

  /* ---------- Cursor-driven 3D tilt ---------- */
  let rafTilt = false;
  hero.addEventListener('mousemove', function (e) {
    if (rafTilt) return;
    rafTilt = true;
    requestAnimationFrame(function () {
      const r = phone.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      phone.style.transform = 'rotateY(' + (dx * 7) + 'deg) rotateX(' + (-dy * 6) + 'deg)';
      rafTilt = false;
    });
  });
  hero.addEventListener('mouseleave', function () { phone.style.transform = ''; });

  /* ---------- Hover-after-delay hint ---------- */
  let hintTimer = null;
  phone.addEventListener('mouseenter', function () {
    hintTimer = setTimeout(function () { hint.classList.add('show'); }, 850);
  });
  phone.addEventListener('mouseleave', function () {
    clearTimeout(hintTimer);
    hint.classList.remove('show');
  });

  /* ---------- Caption reveal ---------- */
  setTimeout(function () { if (caption) caption.classList.add('show'); }, 700);
})();
