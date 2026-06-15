/**
 * Shelter hero — staged arrival animation + interactive easing curve.
 */
(function () {
  const CLOUD_MS = 700;
  const DRAW_MS = 1800;
  const LETTER_MS = 40;
  const OUTER_DASH = '1.41 1.41';

  const composition = document.getElementById('composition');
  const phone = document.getElementById('phone');
  const strokeOuter = document.getElementById('strokeOuter');
  const strokeRingOuter = document.getElementById('strokeRingOuter');
  const strokeRingInner = document.getElementById('strokeRingInner');
  const headline = document.getElementById('headline');

  if (!composition) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let playStackArrival = function () {};


  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /** Rounded-rect path starting bottom-left → up → right → down */
  function roundedRectPath(x, y, w, h, r) {
    return [
      'M', x, y + h - r,
      'L', x, y + r,
      'Q', x, y, x + r, y,
      'L', x + w - r, y,
      'Q', x + w, y, x + w, y + r,
      'L', x + w, y + h - r,
      'Q', x + w, y + h, x + w - r, y + h,
      'L', x + r, y + h,
      'Q', x, y + h, x, y + h - r,
    ].join(' ');
  }

  function initStrokePaths() {
    if (!strokeOuter || !strokeRingOuter || !strokeRingInner) return;

    strokeOuter.setAttribute('d', roundedRectPath(2.82, 2.82, 388.668, 822.671, 73));
    strokeRingOuter.setAttribute('d', roundedRectPath(11.27, 11.27, 371.871, 822.624, 65));
    strokeRingInner.setAttribute('d', roundedRectPath(19.72, 19.72, 353.559, 822.624, 57.746));

    [strokeOuter, strokeRingOuter, strokeRingInner].forEach(function (path) {
      var len = path.getTotalLength();
      path.style.setProperty('--path-len', len);
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
    });
  }

  function splitHeadline() {
    if (!headline) return [];
    var lines = headline.querySelectorAll('.headline__line');
    var chars = [];
    lines.forEach(function (line) {
      var text = line.textContent;
      line.textContent = '';
      Array.from(text).forEach(function (ch) {
        var span = document.createElement('span');
        span.className = 'headline__char';
        span.textContent = ch === ' ' ? '\u00a0' : ch;
        line.appendChild(span);
        chars.push(span);
      });
    });
    return chars;
  }

  function showFinalState(chars) {
    composition.classList.add('is-ready', 'stage-clouds', 'stage-draw', 'stage-cards');
    [strokeOuter, strokeRingOuter, strokeRingInner].forEach(function (p) {
      if (p) p.style.strokeDashoffset = '0';
    });
    if (strokeOuter) strokeOuter.style.strokeDasharray = OUTER_DASH;
    chars.forEach(function (c) { c.classList.add('is-visible'); });
  }

  async function revealHeadline(chars) {
    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.add('is-visible');
      await wait(LETTER_MS);
    }
  }

  async function runIntro() {
    var chars = splitHeadline();

    if (reducedMotion) {
      showFinalState(chars);
      playStackArrival();
      return;
    }

    composition.classList.add('stage-clouds');
    await wait(CLOUD_MS);

    composition.classList.add('stage-draw');
    // Stack items slide up one-by-one as the card reveals (~half-way through the draw).
    setTimeout(playStackArrival, DRAW_MS * 0.5 + 200);
    await wait(DRAW_MS);

    if (strokeOuter) strokeOuter.style.strokeDasharray = OUTER_DASH;

    await revealHeadline(chars);
    composition.classList.add('is-ready');
  }

  function initCurveEditor() {
    var svg = document.getElementById('curveEditor');
    if (!svg) return;

    var curvePath = document.getElementById('curvePath');
    var handle1 = document.getElementById('handleLine1');
    var handle2 = document.getElementById('handleLine2');
    var ctrl1 = document.getElementById('ctrl1');
    var ctrl2 = document.getElementById('ctrl2');
    var anchor0 = document.getElementById('anchor0');
    var anchor3 = document.getElementById('anchor3');
    var frameTop = document.getElementById('frameTop');
    var frameBottom = document.getElementById('frameBottom');
    var frameDiag = document.getElementById('frameDiag');

    // Plot bounds inside the 146×162 card
    var X0 = 26, X1 = 120, YTOP = 30, YBOT = 132;
    var W = X1 - X0, H = YBOT - YTOP;

    // Control points in normalized bezier space [0..1]; default cubic-bezier(0,1,1,0)
    var state = { p1: { x: 0, y: 1 }, p2: { x: 1, y: 0 } };

    function bx(v) { return X0 + v * W; }
    function by(v) { return YBOT - v * H; }

    var P0 = { x: bx(0), y: by(0) };
    var P3 = { x: bx(1), y: by(1) };

    function line(a, b) { return 'M ' + a.x + ' ' + a.y + ' L ' + b.x + ' ' + b.y; }

    frameTop.setAttribute('d', line({ x: X0, y: YTOP }, { x: X1, y: YTOP }));
    frameBottom.setAttribute('d', line({ x: X0, y: YBOT }, { x: X1, y: YBOT }));
    frameDiag.setAttribute('d', line(P0, P3));
    anchor0.setAttribute('cx', P0.x); anchor0.setAttribute('cy', P0.y);
    anchor3.setAttribute('cx', P3.x); anchor3.setAttribute('cy', P3.y);

    function render() {
      var c1 = { x: bx(state.p1.x), y: by(state.p1.y) };
      var c2 = { x: bx(state.p2.x), y: by(state.p2.y) };
      curvePath.setAttribute('d',
        'M ' + P0.x + ' ' + P0.y +
        ' C ' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + P3.x + ' ' + P3.y);
      handle1.setAttribute('d', line(P0, c1));
      handle2.setAttribute('d', line(P3, c2));
      ctrl1.setAttribute('cx', c1.x); ctrl1.setAttribute('cy', c1.y);
      ctrl2.setAttribute('cx', c2.x); ctrl2.setAttribute('cy', c2.y);
    }

    function clamp01(v) { return Math.min(1, Math.max(0, v)); }

    function pointToBezier(e) {
      var rect = svg.getBoundingClientRect();
      var sx = (e.clientX - rect.left) / rect.width * 146;
      var sy = (e.clientY - rect.top) / rect.height * 162;
      return { x: clamp01((sx - X0) / W), y: clamp01((YBOT - sy) / H) };
    }

    var dragging = null;

    function startDrag(key) {
      return function (e) {
        dragging = key;
        try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      };
    }

    function onMove(e) {
      if (!dragging) return;
      state[dragging] = pointToBezier(e);
      render();
      e.preventDefault();
    }

    function endDrag() {
      if (!dragging) return;
      dragging = null;
      playStackArrival();
    }

    ctrl1.addEventListener('pointerdown', startDrag('p1'));
    ctrl2.addEventListener('pointerdown', startDrag('p2'));
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    render();

    // ── Curve-driven stack arrival ──
    // The right "Tool stack" items slide up one-by-one, eased by the bezier
    // above. It plays once as the card reveals during the intro, and replays
    // each time a handle is released so you can feel the easing you dialed in.

    /** Cubic-bezier easing solver (P0=0,0 / P3=1,1) — WebKit UnitBezier style. */
    function makeEase(x1, y1, x2, y2) {
      function sampleX(u) {
        var v = 1 - u;
        return 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u;
      }
      function sampleY(u) {
        var v = 1 - u;
        return 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u;
      }
      function sampleDX(u) {
        var v = 1 - u;
        return 3 * v * v * x1 + 6 * v * u * (x2 - x1) + 3 * u * u * (1 - x2);
      }
      return function (t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        var u = t;
        for (var i = 0; i < 6; i++) {
          var x = sampleX(u) - t;
          if (Math.abs(x) < 1e-4) break;
          var d = sampleDX(u);
          if (Math.abs(d) < 1e-6) break;
          u -= x / d;
          if (u < 0) u = 0; else if (u > 1) u = 1;
        }
        return sampleY(u);
      };
    }

    var stackItems = Array.prototype.slice.call(
      document.querySelectorAll('.mock-card--stack .stack__list li')
    );

    if (!stackItems.length) return;

    var N = stackItems.length;
    var DIST = 34;      // px slide distance — big enough to read the easing
    var STAGGER = 170;  // ms between items
    var DUR = 760;      // ms per item — slow enough to perceive the curve
    var TOTAL = (N - 1) * STAGGER + DUR;

    function setItem(el, e) {
      el.style.opacity = e.toFixed(3);
      el.style.transform = 'translateY(' + ((1 - e) * DIST).toFixed(2) + 'px)';
    }

    if (reducedMotion) {
      stackItems.forEach(function (el) { setItem(el, 1); });
      return;
    }

    // Start hidden. The card itself is still invisible during the intro, so no flash.
    stackItems.forEach(function (el) { setItem(el, 0); });

    var raf = null;
    var startTs = 0;

    function frame(ts) {
      if (!startTs) startTs = ts;
      var t = ts - startTs;
      var ease = makeEase(state.p1.x, state.p1.y, state.p2.x, state.p2.y);
      for (var i = 0; i < N; i++) {
        setItem(stackItems[i], ease(clamp01((t - i * STAGGER) / DUR)));
      }
      if (t < TOTAL) {
        raf = requestAnimationFrame(frame);
      } else {
        stackItems.forEach(function (el) { setItem(el, 1); });
        raf = null;
      }
    }

    function play() {
      if (raf) cancelAnimationFrame(raf);
      startTs = 0;
      raf = requestAnimationFrame(frame);
    }

    playStackArrival = play;
  }

  /* ── Interactions showcase ── */
  function initShowcase() {
    var section = document.getElementById('showcase');
    if (!section) return;
    revealCardsOnScroll(section);
  }

  function revealCardsOnScroll(section) {
    var cards = section.querySelectorAll('[data-reveal-card]');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        var i = Array.prototype.indexOf.call(cards, card);
        var delay = i * 110;
        card.style.transitionDelay = delay + 'ms';
        card.classList.add('is-in');
        obs.unobserve(card);
        // Clear the stagger delay after the reveal so hover stays snappy.
        setTimeout(function () { card.style.transitionDelay = '0ms'; }, delay + 1200);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -12% 0px' });
    cards.forEach(function (c) { io.observe(c); });
  }

  function boot() {
    initStrokePaths();
    initCurveEditor();
    initShowcase();
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fonts.then(function () {
      requestAnimationFrame(function () { runIntro(); });
    });
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
