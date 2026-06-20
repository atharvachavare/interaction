/**
 * RechargeCard — vanilla port of Recharge / RechargeCard.tsx
 * Hover (or press on touch) the bar to spring-fill from red to green.
 */
(function () {
  'use strict';

  var SPRING_STIFFNESS = 60;
  var SPRING_DAMPING = 15;
  var IDLE_WIDTH = 25;
  var HOVER_WIDTH = 100;

  function mountRechargeCard(container) {
    container.innerHTML =
      '<div class="interaction-demo interaction-demo--recharge">' +
        '<div class="recharge-card-wrap">' +
          '<div class="recharge-card">' +
            '<h2 class="recharge-card__title">Recharge.</h2>' +
            '<div class="recharge-card__labels">' +
              '<span>0</span><span>50</span><span>100</span>' +
            '</div>' +
            '<div class="recharge-card__track" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="25" aria-label="Recharge progress">' +
              '<div class="recharge-card__grid"></div>' +
              '<div class="recharge-card__fill"></div>' +
              '<div class="recharge-card__glow"></div>' +
              '<div class="recharge-card__glass"><div class="recharge-card__glass-highlight"></div></div>' +
            '</div>' +
            '<div class="recharge-card__ambient"></div>' +
          '</div>' +
          '<p class="recharge-card__hint">Hover to recharge</p>' +
        '</div>' +
      '</div>';

    var card = container.querySelector('.recharge-card');
    var track = container.querySelector('.recharge-card__track');
    var fill = container.querySelector('.recharge-card__fill');
    var glow = container.querySelector('.recharge-card__glow');
    var ambient = container.querySelector('.recharge-card__ambient');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var active = false;
    var animFrame = null;
    var widthPos = IDLE_WIDTH;
    var widthVel = 0;
    var colorMix = 0;
    var colorVel = 0;

    function setAria(val) {
      track.setAttribute('aria-valuenow', String(Math.round(val)));
    }

    function lerpColor(mix) {
      var t = Math.max(0, Math.min(1, mix));
      var r = Math.round(255 + (50 - 255) * t);
      var g = Math.round(59 + (215 - 59) * t);
      var b = Math.round(48 + (75 - 48) * t);
      return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }

    function applyVisuals(width, mix) {
      widthPos = width;
      colorMix = mix;
      var color = lerpColor(mix);
      fill.style.width = width + '%';
      fill.style.backgroundColor = color;
      glow.style.width = width + '%';
      glow.style.opacity = String(0.6 + mix * 0.2);
      glow.style.boxShadow = mix < 0.5
        ? '0 0 40px 10px #ff3b30'
        : '0 0 60px 20px #32d74b';
      ambient.style.background = mix < 0.5
        ? 'radial-gradient(circle at 20% 80%, rgba(255, 59, 48, 0.15), transparent 50%)'
        : 'radial-gradient(circle at 50% 80%, rgba(50, 215, 75, 0.15), transparent 60%)';
      setAria(width);
    }

    function springStep(from, to, velocity, stiffness, damping, dt) {
      var spring = -stiffness * (from - to);
      var damper = -damping * velocity;
      var accel = spring + damper;
      var nextVel = velocity + accel * dt;
      var nextPos = from + nextVel * dt;
      return { pos: nextPos, vel: nextVel };
    }

    function animateTo(targetActive) {
      if (animFrame) cancelAnimationFrame(animFrame);
      var targetWidth = targetActive ? HOVER_WIDTH : IDLE_WIDTH;
      var targetMix = targetActive ? 1 : 0;
      var lastTime = performance.now();

      if (reducedMotion) {
        applyVisuals(targetWidth, targetMix);
        return;
      }

      function step(now) {
        var dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        var w = springStep(widthPos, targetWidth, widthVel, SPRING_STIFFNESS, SPRING_DAMPING, dt);
        widthPos = w.pos;
        widthVel = w.vel;

        var c = springStep(colorMix, targetMix, colorVel, SPRING_STIFFNESS, SPRING_DAMPING, dt);
        colorMix = c.pos;
        colorVel = c.vel;

        applyVisuals(widthPos, colorMix);

        var done =
          Math.abs(widthPos - targetWidth) < 0.25 &&
          Math.abs(widthVel) < 0.25 &&
          Math.abs(colorMix - targetMix) < 0.01 &&
          Math.abs(colorVel) < 0.05;

        if (done) {
          applyVisuals(targetWidth, targetMix);
          widthVel = 0;
          colorVel = 0;
          animFrame = null;
          return;
        }

        animFrame = requestAnimationFrame(step);
      }

      animFrame = requestAnimationFrame(step);
    }

    function setActive(next) {
      if (active === next) return;
      active = next;
      card.classList.toggle('is-active', active);
      track.classList.toggle('is-active', active);
      animateTo(active);
    }

    function onEnter() { setActive(true); }
    function onLeave() { setActive(false); }

    track.addEventListener('mouseenter', onEnter);
    track.addEventListener('mouseleave', onLeave);
    track.addEventListener('focus', onEnter);
    track.addEventListener('blur', onLeave);
    track.addEventListener('touchstart', function (e) {
      setActive(true);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    track.addEventListener('touchend', onLeave);
    track.addEventListener('touchcancel', onLeave);

    applyVisuals(IDLE_WIDTH, 0);

    return function teardown() {
      if (animFrame) cancelAnimationFrame(animFrame);
      track.removeEventListener('mouseenter', onEnter);
      track.removeEventListener('mouseleave', onLeave);
      track.removeEventListener('focus', onEnter);
      track.removeEventListener('blur', onLeave);
      container.innerHTML = '';
    };
  }

  window.ShelterRechargeCard = { mount: mountRechargeCard };
})();
