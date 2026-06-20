/**
 * ThemeSlider — faithful port of Drag Orb / theme-slider.tsx (SCALE 0.78)
 */
(function () {
  'use strict';

  var CARD_W = 440;
  var CARD_H = 520;
  var CARD_RADIUS = 48;
  var GAP = 48;
  var TRACK_THICKNESS = 30;
  var R = CARD_RADIUS + GAP;
  var STRAIGHT = 70;
  var SCALE = 0.78;
  var PIVOT_X = CARD_W - CARD_RADIUS;
  var PIVOT_Y = CARD_RADIUS;
  var TRACK_PATH =
    'M ' + (PIVOT_X - STRAIGHT) + ' ' + (-GAP) +
    ' L ' + PIVOT_X + ' ' + (-GAP) +
    ' A ' + R + ' ' + R + ' 0 0 1 ' + (CARD_W + GAP) + ' ' + PIVOT_Y +
    ' L ' + (CARD_W + GAP) + ' ' + (PIVOT_Y + STRAIGHT);

  var SUN_SVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(60,40,20,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>' +
    '</svg>';

  var MOON_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' +
    '</svg>';

  function pointOnPath(t) {
    var clamped = Math.min(1, Math.max(0, t));
    var seg1End = STRAIGHT / (STRAIGHT * 2 + (Math.PI * R) / 2);
    var seg2End = (STRAIGHT + (Math.PI * R) / 2) / (STRAIGHT * 2 + (Math.PI * R) / 2);

    if (clamped <= seg1End) {
      var localT1 = clamped / seg1End;
      return { x: PIVOT_X - STRAIGHT + STRAIGHT * localT1, y: -GAP, angle: 0 };
    }
    if (clamped <= seg2End) {
      var localT2 = (clamped - seg1End) / (seg2End - seg1End);
      var angle = -Math.PI / 2 + (Math.PI / 2) * localT2;
      return {
        x: PIVOT_X + R * Math.cos(angle),
        y: PIVOT_Y + R * Math.sin(angle),
        angle: angle,
      };
    }
    var localT3 = (clamped - seg2End) / (1 - seg2End);
    return { x: CARD_W + GAP, y: PIVOT_Y + STRAIGHT * localT3, angle: 0 };
  }

  function nearestTOnPath(px, py) {
    var bestT = 0;
    var bestDist = Infinity;
    for (var i = 0; i <= 200; i++) {
      var t = i / 200;
      var p = pointOnPath(t);
      var d = Math.pow(p.x - px, 2) + Math.pow(p.y - py, 2);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
      }
    }
    return bestT;
  }

  function mountDragOrb(container) {
    var uid = 'do' + Math.random().toString(36).slice(2, 9);

    container.innerHTML =
      '<div class="interaction-demo interaction-demo--dragorb">' +
        '<div class="drag-orb-stage">' +
          '<div class="drag-orb-blob drag-orb-blob--a"></div>' +
          '<div class="drag-orb-blob drag-orb-blob--b"></div>' +
          '<div class="drag-orb-card">' +
            '<div class="drag-orb-glass"></div>' +
            '<div class="drag-orb-content">' +
              '<span class="drag-orb-eyebrow">Drag the orb</span>' +
              '<h2 class="drag-orb-title">Day Mode</h2>' +
              '<p class="drag-orb-copy">Slide the orb along the corner to switch the ambience.</p>' +
            '</div>' +
            '<svg class="drag-orb-svg" viewBox="0 0 ' + CARD_W + ' ' + CARD_H + '" aria-hidden="true">' +
              '<defs>' +
                '<filter id="' + uid + '-blur" x="-50%" y="-50%" width="200%" height="200%">' +
                  '<feGaussianBlur stdDeviation="6"/>' +
                '</filter>' +
                '<linearGradient id="' + uid + '-fill" x1="0%" y1="0%" x2="100%" y2="100%">' +
                  '<stop offset="0%" class="drag-orb-grad-fill-a"/>' +
                  '<stop offset="50%" class="drag-orb-grad-fill-b"/>' +
                  '<stop offset="100%" class="drag-orb-grad-fill-c"/>' +
                '</linearGradient>' +
                '<linearGradient id="' + uid + '-border" x1="0%" y1="0%" x2="100%" y2="100%">' +
                  '<stop offset="0%" class="drag-orb-grad-border-a"/>' +
                  '<stop offset="100%" class="drag-orb-grad-border-b"/>' +
                '</linearGradient>' +
              '</defs>' +
              '<path class="drag-orb-track-shadow" d="' + TRACK_PATH + '" fill="none" stroke-width="' + (TRACK_THICKNESS + 6) + '" stroke-linecap="round" filter="url(#' + uid + '-blur)"/>' +
              '<path class="drag-orb-track-fill" d="' + TRACK_PATH + '" fill="none" stroke="url(#' + uid + '-fill)" stroke-width="' + TRACK_THICKNESS + '" stroke-linecap="round"/>' +
              '<path class="drag-orb-track-highlight" d="' + TRACK_PATH + '" fill="none" stroke="url(#' + uid + '-border)" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>' +
              '<path class="drag-orb-track-inner" d="' + TRACK_PATH + '" fill="none" stroke-width="' + (TRACK_THICKNESS - 4) + '" stroke-linecap="round" opacity="0.25"/>' +
              '<g class="drag-orb-trail" filter="url(#' + uid + '-blur)"></g>' +
            '</svg>' +
            '<div class="drag-orb-knob" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Theme orb">' +
              '<div class="drag-orb-knob-icons">' + SUN_SVG + MOON_SVG + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var stage = container.querySelector('.drag-orb-stage');
    var card = container.querySelector('.drag-orb-card');
    var glass = container.querySelector('.drag-orb-glass');
    var blobA = container.querySelector('.drag-orb-blob--a');
    var blobB = container.querySelector('.drag-orb-blob--b');
    var eyebrow = container.querySelector('.drag-orb-eyebrow');
    var title = container.querySelector('.drag-orb-title');
    var copy = container.querySelector('.drag-orb-copy');
    var trailGroup = container.querySelector('.drag-orb-trail');
    var trackShadow = container.querySelector('.drag-orb-track-shadow');
    var trackInner = container.querySelector('.drag-orb-track-inner');
    var gradFill = [
      container.querySelector('.drag-orb-grad-fill-a'),
      container.querySelector('.drag-orb-grad-fill-b'),
      container.querySelector('.drag-orb-grad-fill-c'),
    ];
    var gradBorder = [
      container.querySelector('.drag-orb-grad-border-a'),
      container.querySelector('.drag-orb-grad-border-b'),
    ];
    var knob = container.querySelector('.drag-orb-knob');
    var sunIcon = knob.querySelector('svg:first-child');
    var moonIcon = knob.querySelector('svg:last-child');

    var t = 0;
    var dragging = false;

    function setStop(el, color) {
      if (el) el.setAttribute('stop-color', color);
    }

    function render() {
      var isDark = t > 0.5;
      var knobPos = pointOnPath(t);
      var bgTone = Math.round(255 - t * 240);
      var glowColor = isDark ? 'rgba(214, 120, 255, 0.9)' : 'rgba(180, 230, 220, 0.9)';

      stage.style.background = 'rgb(' + bgTone + ', ' + bgTone + ', ' + Math.round(255 - t * 235) + ')';

      blobA.style.background = isDark
        ? 'radial-gradient(circle, rgba(120, 60, 180, 0.55), transparent 70%)'
        : 'radial-gradient(circle, rgba(255, 200, 180, 0.55), rgba(255, 255, 255, 0) 70%)';
      blobA.style.filter = isDark ? 'blur(185px)' : 'blur(40px)';

      blobB.style.background = isDark
        ? 'radial-gradient(circle, rgba(60, 80, 180, 0.45), transparent 70%)'
        : 'radial-gradient(circle, rgba(200, 220, 255, 0.6), rgba(255, 255, 255, 0) 70%)';
      blobB.style.filter = isDark ? 'blur(185px)' : 'blur(50px)';

      glass.style.background = isDark ? 'rgba(40, 38, 55, 0.55)' : 'rgba(255, 255, 255, 0.55)';
      glass.style.border = '1px solid ' + (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)');
      glass.style.boxShadow = isDark
        ? '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
        : '0 30px 80px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)';

      eyebrow.style.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
      title.textContent = isDark ? 'Night Mode' : 'Day Mode';
      title.style.color = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(20,20,30,0.9)';
      copy.style.color = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(20,20,30,0.55)';

      setStop(gradFill[0], isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.75)');
      setStop(gradFill[1], isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)');
      setStop(gradFill[2], isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.65)');
      setStop(gradBorder[0], isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,1)');
      setStop(gradBorder[1], isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)');

      trackShadow.setAttribute('stroke', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)');
      trackInner.setAttribute('stroke', isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)');

      var trailHtml = '';
      for (var i = 1; i <= 14; i++) {
        var offset = i * 0.018;
        var trailT = isDark ? Math.max(0, t - offset) : Math.min(1, t + offset);
        if (Math.abs(trailT - t) < 0.001) break;
        var p = pointOnPath(trailT);
        trailHtml +=
          '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (14 - i * 0.6) + '" fill="' + glowColor + '" opacity="' + ((1 - i / 14) * 0.55) + '"/>';
      }
      trailGroup.innerHTML = trailHtml;

      knob.style.left = knobPos.x + 'px';
      knob.style.top = knobPos.y + 'px';
      knob.classList.toggle('is-dragging', dragging);
      knob.setAttribute('aria-valuenow', String(Math.round(t * 100)));

      knob.style.background = isDark
        ? 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.02))'
        : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.6) 60%, rgba(255,255,255,0.35))';
      knob.style.border = '1px solid ' + (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)');
      knob.style.boxShadow = isDark
        ? '0 0 28px ' + glowColor + ', 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -6px 12px rgba(214,120,255,0.35)'
        : '0 0 28px ' + glowColor + ', 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1), inset 0 -6px 12px rgba(255,200,170,0.45)';

      sunIcon.style.opacity = String(1 - t);
      sunIcon.style.transform = 'scale(' + (1 - t * 0.4) + ') rotate(' + (t * 90) + 'deg)';
      moonIcon.style.opacity = String(t);
      moonIcon.style.transform = 'scale(' + (0.6 + t * 0.4) + ') rotate(' + ((1 - t) * -90) + 'deg)';
    }

    function handlePointerMove(clientX, clientY) {
      var rect = card.getBoundingClientRect();
      var px = (clientX - (rect.left + rect.width / 2)) / SCALE + CARD_W / 2;
      var py = (clientY - (rect.top + rect.height / 2)) / SCALE + CARD_H / 2;
      t = nearestTOnPath(px, py);
      render();
    }

    function onPointerDown(e) {
      dragging = true;
      if (knob.setPointerCapture && e.pointerId != null) {
        try { knob.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (e.cancelable) e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      handlePointerMove(e.clientX, e.clientY);
      if (e.cancelable) e.preventDefault();
    }

    function onPointerUp() {
      dragging = false;
      render();
    }

    knob.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    render();

    return function teardown() {
      knob.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      container.innerHTML = '';
    };
  }

  window.ShelterDragOrb = { mount: mountDragOrb };
})();
