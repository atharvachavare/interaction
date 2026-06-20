/**
 * ValueScroller — vanilla port of Scroller Design with Interaction / ValueScroller.tsx
 * Drag the ruler vertically to pick a value (0–100) with spring snap.
 */
(function () {
  'use strict';

  var PIXELS_PER_UNIT = 10;
  var MAJOR_TICK_INTERVAL = 5;
  var MIN_VALUE = 0;
  var MAX_VALUE = 100;
  var CONTAINER_HEIGHT = 400;
  var CENTER_OFFSET = CONTAINER_HEIGHT / 2;
  var OFFSET_CONSTANT = CENTER_OFFSET - PIXELS_PER_UNIT / 2 - MAX_VALUE * PIXELS_PER_UNIT;

  var CHEVRON_UP =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';
  var CHEVRON_DOWN =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  function valueToY(val) {
    return val * PIXELS_PER_UNIT + OFFSET_CONSTANT;
  }

  function yToValue(yPos) {
    return Math.round((yPos - OFFSET_CONSTANT) / PIXELS_PER_UNIT);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function buildSvg() {
    return (
      '<svg width="100%" height="100%" viewBox="0 0 360 ' + CONTAINER_HEIGHT + '" aria-hidden="true">' +
        '<defs>' +
          '<filter id="vs-blue-glow" x="-100%" y="-50%" width="300%" height="200%">' +
            '<feGaussianBlur stdDeviation="8" result="coloredBlur"/>' +
            '<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
          '</filter>' +
          '<linearGradient id="vs-line-fade-light" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="rgba(168, 162, 158, 0)"/>' +
            '<stop offset="15%" stop-color="rgba(168, 162, 158, 0.3)"/>' +
            '<stop offset="85%" stop-color="rgba(168, 162, 158, 0.3)"/>' +
            '<stop offset="100%" stop-color="rgba(168, 162, 158, 0)"/>' +
          '</linearGradient>' +
          '<linearGradient id="vs-line-fade-dark" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="rgba(255,255,255,0)"/>' +
            '<stop offset="15%" stop-color="rgba(255,255,255,0.2)"/>' +
            '<stop offset="85%" stop-color="rgba(255,255,255,0.2)"/>' +
            '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<path d="M 120 ' + (CENTER_OFFSET - 50) +
          ' L 120 ' + (CENTER_OFFSET - 40) +
          ' C 120 ' + (CENTER_OFFSET - 20) + ', 144 ' + (CENTER_OFFSET - 20) + ', 152 ' + (CENTER_OFFSET - 10) +
          ' Q 164 ' + CENTER_OFFSET + ' 152 ' + (CENTER_OFFSET + 10) +
          ' C 144 ' + (CENTER_OFFSET + 20) + ', 120 ' + (CENTER_OFFSET + 20) + ', 120 ' + (CENTER_OFFSET + 40) +
          ' L 120 ' + (CENTER_OFFSET + 50) + '"' +
          ' fill="none" stroke="#3b82f6" stroke-width="3" stroke-opacity="0.8" filter="url(#vs-blue-glow)" stroke-linecap="round"/>' +
        '<path class="value-scroller__curve-line" d="M 120 0 L 120 ' + (CENTER_OFFSET - 40) +
          ' C 120 ' + (CENTER_OFFSET - 20) + ', 144 ' + (CENTER_OFFSET - 20) + ', 152 ' + (CENTER_OFFSET - 10) +
          ' Q 164 ' + CENTER_OFFSET + ' 152 ' + (CENTER_OFFSET + 10) +
          ' C 144 ' + (CENTER_OFFSET + 20) + ', 120 ' + (CENTER_OFFSET + 20) + ', 120 ' + (CENTER_OFFSET + 40) +
          ' L 120 ' + CONTAINER_HEIGHT + '"' +
          ' fill="none" stroke="url(#vs-line-fade-light)" stroke-width="1.5"/>' +
      '</svg>'
    );
  }

  function buildTicksHtml() {
    var html = '';
    for (var i = 0; i <= MAX_VALUE - MIN_VALUE; i++) {
      var value = MAX_VALUE - i;
      var isMajor = value % MAJOR_TICK_INTERVAL === 0;
      html +=
        '<div class="value-scroller__tick">' +
          '<span class="value-scroller__tick-label' + (isMajor ? ' is-major' : '') + '">' + value + '</span>' +
          '<div class="value-scroller__tick-mark' + (isMajor ? ' is-major' : '') + '"></div>' +
        '</div>';
    }
    return html;
  }

  function mountValueScroller(container, options) {
    options = options || {};
    var initialValue = options.initialValue != null ? options.initialValue : 30;
    /* Matches App.tsx: light page → dark scroller; dark page → light scroller */
    var isDarkMode = options.darkMode === true;
    var scrollerVariant = isDarkMode ? 'light' : 'dark';
    var onChange = typeof options.onChange === 'function' ? options.onChange : null;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var dragMinY = valueToY(MIN_VALUE);
    var dragMaxY = valueToY(MAX_VALUE);

    container.innerHTML =
      '<div class="interaction-demo interaction-demo--scroller">' +
        '<div class="value-scroller-stage' + (isDarkMode ? ' value-scroller-stage--dark' : '') + '">' +
          '<div class="value-scroller-stage__toolbar">' +
            '<button type="button" class="value-scroller-toggle" role="switch" aria-checked="' + (isDarkMode ? 'true' : 'false') + '" aria-label="Toggle dark mode">' +
              '<span class="value-scroller-toggle__thumb"></span>' +
            '</button>' +
          '</div>' +
          '<div class="value-scroller value-scroller--' + scrollerVariant + '" role="slider" aria-valuemin="' + MIN_VALUE + '" aria-valuemax="' + MAX_VALUE + '" aria-valuenow="' + initialValue + '" aria-label="Value scroller">' +
            '<div class="value-scroller__gradient"></div>' +
            '<div class="value-scroller__track">' +
              '<div class="value-scroller__ticks">' + buildTicksHtml() + '</div>' +
            '</div>' +
            '<div class="value-scroller__overlay">' + buildSvg() + '</div>' +
            '<div class="value-scroller__knob">' +
              '<div class="value-scroller__knob-inner">' +
                '<div class="value-scroller__knob-arrows">' + CHEVRON_UP + CHEVRON_DOWN + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="value-scroller__value">' + initialValue + '</div>' +
            '<div class="value-scroller__mask value-scroller__mask--top"></div>' +
            '<div class="value-scroller__mask value-scroller__mask--bottom"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var stage = container.querySelector('.value-scroller-stage');
    var toggle = container.querySelector('.value-scroller-toggle');
    var root = container.querySelector('.value-scroller');
    var track = container.querySelector('.value-scroller__track');
    var valueEl = container.querySelector('.value-scroller__value');
    var curveLine = container.querySelector('.value-scroller__curve-line');

    function applyVariant(darkMode) {
      isDarkMode = darkMode;
      scrollerVariant = isDarkMode ? 'light' : 'dark';
      stage.classList.toggle('value-scroller-stage--dark', isDarkMode);
      root.classList.remove('value-scroller--light', 'value-scroller--dark');
      root.classList.add('value-scroller--' + scrollerVariant);
      if (curveLine) {
        curveLine.setAttribute(
          'stroke',
          scrollerVariant === 'dark' ? 'url(#vs-line-fade-dark)' : 'url(#vs-line-fade-light)'
        );
      }
      toggle.setAttribute('aria-checked', isDarkMode ? 'true' : 'false');
    }

    if (scrollerVariant === 'dark' && curveLine) {
      curveLine.setAttribute('stroke', 'url(#vs-line-fade-dark)');
    }

    function onToggleClick() {
      applyVariant(!isDarkMode);
    }

    toggle.addEventListener('click', onToggleClick);

    var currentY = valueToY(initialValue);
    var currentValue = initialValue;
    var dragging = false;
    var dragStartY = 0;
    var dragStartTrackY = 0;
    var lastMoveY = 0;
    var lastMoveTime = 0;
    var velocityY = 0;
    var animFrame = null;

    function setTrackY(y) {
      currentY = clamp(y, dragMinY, dragMaxY);
      track.style.transform = 'translateY(' + currentY + 'px)';
      updateValueFromY(currentY);
    }

    function updateValueFromY(yPos) {
      var val = clamp(yToValue(yPos), MIN_VALUE, MAX_VALUE);
      if (val !== currentValue) {
        currentValue = val;
        valueEl.textContent = String(val);
        root.setAttribute('aria-valuenow', String(val));
        if (onChange) onChange(val);
      }
    }

    function springTo(from, to, onUpdate, onDone) {
      if (animFrame) cancelAnimationFrame(animFrame);
      var stiffness = 400;
      var damping = 40;
      var position = from;
      var velocity = velocityY * 0.001;
      var target = to;
      var lastTime = performance.now();

      function step(now) {
        var dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;
        var spring = -stiffness * (position - target);
        var damper = -damping * velocity;
        var acceleration = spring + damper;
        velocity += acceleration * dt;
        position += velocity * dt;
        onUpdate(position);
        currentY = position;

        if (Math.abs(position - target) < 0.4 && Math.abs(velocity) < 4) {
          onUpdate(target);
          currentY = target;
          updateValueFromY(target);
          animFrame = null;
          if (onDone) onDone();
          return;
        }
        animFrame = requestAnimationFrame(step);
      }

      animFrame = requestAnimationFrame(step);
    }

    function onPointerDown(e) {
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      dragging = true;
      track.classList.add('is-dragging');
      var point = e.touches ? e.touches[0] : e;
      dragStartY = point.clientY;
      dragStartTrackY = currentY;
      lastMoveY = point.clientY;
      lastMoveTime = performance.now();
      velocityY = 0;
      if (e.cancelable) e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var point = e.touches ? e.touches[0] : e;
      var now = performance.now();
      var dt = now - lastMoveTime;
      if (dt > 0) {
        velocityY = (point.clientY - lastMoveY) / dt;
      }
      lastMoveY = point.clientY;
      lastMoveTime = now;
      var delta = point.clientY - dragStartY;
      setTrackY(dragStartTrackY + delta);
      if (e.cancelable) e.preventDefault();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');

      var predictedY = currentY + velocityY * 200;
      var targetVal = clamp(yToValue(predictedY), MIN_VALUE, MAX_VALUE);
      var targetY = valueToY(targetVal);

      if (reducedMotion) {
        setTrackY(targetY);
        return;
      }

      springTo(currentY, targetY, function (yPos) {
        track.style.transform = 'translateY(' + yPos + 'px)';
        updateValueFromY(yPos);
      });
    }

    setTrackY(currentY);

    track.addEventListener('mousedown', onPointerDown);
    track.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);

    return function teardown() {
      if (animFrame) cancelAnimationFrame(animFrame);
      toggle.removeEventListener('click', onToggleClick);
      track.removeEventListener('mousedown', onPointerDown);
      track.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);
      container.innerHTML = '';
    };
  }

  window.ShelterValueScroller = { mount: mountValueScroller };
})();
