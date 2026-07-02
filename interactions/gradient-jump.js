/**
 * Gradient Jump — Matter.js sphere physics (card + sheet modes)
 */
(function () {
  'use strict';

  var SPHERE_COUNT = 12;
  var WALL_THICKNESS = 60;
  var ASSET_BASE = 'assets/gradient-jump/';

  function padSphere(index) {
    return ASSET_BASE + 'sphere-' + String(index + 1).padStart(2, '0') + '.png';
  }

  function mountGradientJump(container, options) {
    options = options || {};
    var mode = options.mode === 'sheet' ? 'sheet' : 'card';
    var showHint = options.showHint !== false;
    var hostCard = options.hostCard || container.closest('.work-card');

    if (!window.Matter) {
      container.innerHTML =
        '<div class="interaction-demo interaction-demo--gradientjump">' +
          '<p class="interaction-demo__placeholder">Physics engine failed to load.</p>' +
        '</div>';
      return function () {};
    }

    var Matter = window.Matter;
    var Engine = Matter.Engine;
    var World = Matter.World;
    var Bodies = Matter.Bodies;
    var Body = Matter.Body;
    var Runner = Matter.Runner;
    var Events = Matter.Events;
    var Mouse = Matter.Mouse;
    var MouseConstraint = Matter.MouseConstraint;
    var Vector = Matter.Vector;

    container.innerHTML =
      '<div class="gradient-jump interaction-demo interaction-demo--gradientjump gradient-jump--' + mode + '">' +
        (showHint
          ? '<p class="gradient-jump__hint">Drag and throw the spheres</p>'
          : '') +
        '<div class="gradient-jump__arena" aria-hidden="true"></div>' +
      '</div>';

    var root = container.querySelector('.gradient-jump');
    var arena = container.querySelector('.gradient-jump__arena');
    if (!root || !arena) return function () {};

    var engine;
    var runner;
    var spheres = [];
    var arenaWidth = 0;
    var arenaHeight = 0;
    var sphereRadius = 0;
    var activeDrag = null;
    var dragMoved = false;
    var pointerHistory = [];
    var trackingDrag = false;
    var mouse = null;
    var mouseConstraint = null;
    var resizeObserver = null;
    var resizeTimer = null;
    var destroyed = false;

    function getArenaSize() {
      var rect = arena.getBoundingClientRect();
      arenaWidth = Math.max(1, rect.width);
      arenaHeight = Math.max(1, rect.height);
      var scale = Math.min(arenaWidth / 936, arenaHeight / 700);
      sphereRadius = Math.max(18, Math.min(58, 114 * scale * 0.72));
      if (mode === 'card') {
        sphereRadius = Math.max(14, Math.min(42, sphereRadius * 0.82));
      }
    }

    function createWalls() {
      var half = WALL_THICKNESS / 2;
      var wallOptions = {
        isStatic: true,
        restitution: 0.58,
        friction: 0.22,
        frictionStatic: 0.3,
      };

      return [
        Bodies.rectangle(arenaWidth / 2, arenaHeight + half, arenaWidth + WALL_THICKNESS * 2, WALL_THICKNESS, Object.assign({ label: 'floor' }, wallOptions)),
        Bodies.rectangle(-half, arenaHeight / 2, WALL_THICKNESS, arenaHeight + WALL_THICKNESS * 2, Object.assign({ label: 'left-wall' }, wallOptions)),
        Bodies.rectangle(arenaWidth + half, arenaHeight / 2, WALL_THICKNESS, arenaHeight + WALL_THICKNESS * 2, Object.assign({ label: 'right-wall' }, wallOptions)),
        Bodies.rectangle(arenaWidth / 2, -half, arenaWidth + WALL_THICKNESS * 2, WALL_THICKNESS, Object.assign({ label: 'ceiling' }, wallOptions)),
      ];
    }

    function isWall(body) {
      return body.isStatic && /wall|floor|ceiling/.test(body.label);
    }

    function getWallBallPair(bodyA, bodyB) {
      if (isWall(bodyA)) return { wall: bodyA, ball: bodyB };
      if (isWall(bodyB)) return { wall: bodyB, ball: bodyA };
      return null;
    }

    function getWallImpactSpeed(ball, wallLabel) {
      if (wallLabel === 'left-wall' || wallLabel === 'right-wall') {
        return Math.abs(ball.velocity.x);
      }
      return Math.abs(ball.velocity.y);
    }

    function getWallRestitution(impactSpeed) {
      var minBounce = 0.5;
      var maxBounce = 0.74;
      var t = Math.min(1, impactSpeed / 14);
      return minBounce + (maxBounce - minBounce) * Math.sqrt(t);
    }

    function getSphereRestitution(relSpeed) {
      var minBounce = 0.42;
      var maxBounce = 0.62;
      var t = Math.min(1, relSpeed / 18);
      return minBounce + (maxBounce - minBounce) * Math.sqrt(t);
    }

    function bindCollisions() {
      Events.on(engine, 'collisionStart', function (event) {
        event.pairs.forEach(function (pair) {
          var wallPair = getWallBallPair(pair.bodyA, pair.bodyB);
          if (wallPair) {
            var impactSpeed = getWallImpactSpeed(wallPair.ball, wallPair.wall.label);
            pair.restitution = getWallRestitution(impactSpeed);
            pair.friction = 0.08;
            return;
          }

          if (!isWall(pair.bodyA) && !isWall(pair.bodyB)) {
            var relVel = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
            pair.restitution = getSphereRestitution(Vector.magnitude(relVel));
            pair.friction = 0.04;
          }
        });
      });
    }

    function createSpheres() {
      var diameter = sphereRadius * 2;
      var cols = mode === 'card' ? 4 : 4;
      var gap = 8 * (arenaWidth / 936);
      var gridWidth = cols * diameter + (cols - 1) * gap;
      var startX = (arenaWidth - gridWidth) / 2 + sphereRadius;
      var dropHeight = sphereRadius + (mode === 'card' ? 36 : 56);

      return Array.from({ length: SPHERE_COUNT }, function (_, index) {
        var col = index % cols;
        var row = Math.floor(index / cols);
        var x = startX + col * (diameter + gap) + (Math.random() - 0.5) * 6;
        var y = dropHeight + row * (diameter * 0.35);

        var element = document.createElement('div');
        element.className = 'gradient-jump__sphere';

        var image = document.createElement('img');
        image.className = 'gradient-jump__sphere-image';
        image.src = padSphere(index);
        image.alt = '';
        image.draggable = false;
        element.appendChild(image);

        arena.appendChild(element);

        var body = Bodies.circle(x, y, sphereRadius, {
          restitution: 0.56,
          friction: 0.05,
          frictionAir: 0.008,
          frictionStatic: 0.1,
          density: 0.00135,
          label: 'sphere-' + (index + 1),
        });

        return { element: element, body: body };
      });
    }

    function syncDomPositions() {
      var size = sphereRadius * 2;
      spheres.forEach(function (sphere) {
        var x = sphere.body.position.x - sphereRadius;
        var y = sphere.body.position.y - sphereRadius;
        var angle = sphere.body.angle;
        sphere.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0) rotate(' + angle + 'rad)';
        sphere.element.style.width = size + 'px';
        sphere.element.style.height = size + 'px';
      });
    }

    function getPointerPosition(event) {
      var rect = arena.getBoundingClientRect();
      var clientX = event.touches ? event.touches[0].clientX : event.clientX;
      var clientY = event.touches ? event.touches[0].clientY : event.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function findSphereAtPoint(x, y) {
      for (var i = spheres.length - 1; i >= 0; i--) {
        var body = spheres[i].body;
        var dx = x - body.position.x;
        var dy = y - body.position.y;
        if (Math.hypot(dx, dy) <= sphereRadius + 4) return spheres[i];
      }
      return null;
    }

    function sphereForBody(body) {
      for (var i = 0; i < spheres.length; i++) {
        if (spheres[i].body === body) return spheres[i];
      }
      return null;
    }

    function clampBodySpeed(body, maxSpeed) {
      var velocity = body.velocity;
      var speed = Math.hypot(velocity.x, velocity.y);
      if (speed <= maxSpeed) return;
      var scale = maxSpeed / speed;
      Body.setVelocity(body, { x: velocity.x * scale, y: velocity.y * scale });
    }

    function recordPointerSample(position) {
      pointerHistory.push({
        x: position.x,
        y: position.y,
        time: performance.now(),
      });
      if (pointerHistory.length > 12) pointerHistory.shift();
    }

    function getThrowVelocityFromDrag() {
      if (pointerHistory.length < 2) return { x: 0, y: 0 };

      var now = performance.now();
      var recent = pointerHistory.filter(function (sample) {
        return now - sample.time <= 140;
      });
      if (recent.length < 2) recent = pointerHistory.slice(-3);
      if (recent.length < 2) return { x: 0, y: 0 };

      var earliest = recent[0];
      var latest = recent[recent.length - 1];
      var dt = Math.max(10, latest.time - earliest.time);
      var dragScale = mode === 'card' ? 16 : 20;

      var vx = ((latest.x - earliest.x) / dt) * dragScale;
      var vy = ((latest.y - earliest.y) / dt) * dragScale;

      if (recent.length >= 2) {
        var prev = recent[recent.length - 2];
        var instantDt = Math.max(8, latest.time - prev.time);
        var instantVx = ((latest.x - prev.x) / instantDt) * dragScale;
        var instantVy = ((latest.y - prev.y) / instantDt) * dragScale;
        vx = vx * 0.3 + instantVx * 0.7;
        vy = vy * 0.3 + instantVy * 0.7;
      }

      return { x: vx, y: vy };
    }

    function onDragPointerMove(event) {
      if (!trackingDrag) return;
      recordPointerSample(getPointerPosition(event));
    }

    function startDragTracking() {
      trackingDrag = true;
      window.addEventListener('mousemove', onDragPointerMove);
      window.addEventListener('touchmove', onDragPointerMove, { passive: true });
    }

    function stopDragTracking() {
      trackingDrag = false;
      window.removeEventListener('mousemove', onDragPointerMove);
      window.removeEventListener('touchmove', onDragPointerMove);
    }

    function markCardDragged() {
      if (hostCard) hostCard.setAttribute('data-interaction-dragged', 'true');
    }

    function bindMouseConstraint() {
      mouse = Mouse.create(arena);
      mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: 0.12,
          damping: 0.05,
          angularStiffness: 0.12,
          length: 0.01,
          render: { visible: false },
        },
      });

      World.add(engine.world, mouseConstraint);

      Events.on(mouseConstraint, 'startdrag', function (event) {
        dragMoved = false;
        pointerHistory = [];
        activeDrag = sphereForBody(event.body);
        arena.classList.add('is-dragging');
        if (activeDrag) activeDrag.element.style.zIndex = '10';
        if (event.body) {
          Body.setVelocity(event.body, { x: 0, y: 0 });
          Body.setAngularVelocity(event.body, 0);
          recordPointerSample({
            x: event.body.position.x,
            y: event.body.position.y,
          });
        }
        if (mouse) {
          recordPointerSample({ x: mouse.position.x, y: mouse.position.y });
        }
        startDragTracking();
      });

      Events.on(mouseConstraint, 'drag', function () {
        dragMoved = true;
        if (mouse) {
          recordPointerSample({ x: mouse.position.x, y: mouse.position.y });
        }
      });

      Events.on(mouseConstraint, 'enddrag', function (event) {
        arena.classList.remove('is-dragging');
        stopDragTracking();

        if (event.body) {
          if (dragMoved) {
            var throwVelocity = getThrowVelocityFromDrag();
            Body.setVelocity(event.body, throwVelocity);
            var throwSpeed = Math.hypot(throwVelocity.x, throwVelocity.y);
            Body.setAngularVelocity(
              event.body,
              (Math.random() - 0.5) * 0.14 * Math.min(1, throwSpeed / 10)
            );
          }
          clampBodySpeed(event.body, mode === 'card' ? 26 : 34);
        }

        pointerHistory = [];
        if (activeDrag) activeDrag.element.style.zIndex = '';
        activeDrag = null;
        if (dragMoved) markCardDragged();
        dragMoved = false;
      });

      Events.on(engine, 'beforeUpdate', function () {
        MouseConstraint.update(mouseConstraint);
      });

      Events.on(engine, 'afterUpdate', function () {
        if (mouseConstraint.body) {
          mouseConstraint.body.isSleeping = false;
        }
      });
    }

    function unbindMouseConstraint() {
      if (!mouseConstraint) return;
      stopDragTracking();
      Events.off(mouseConstraint);
      if (engine) World.remove(engine.world, mouseConstraint);
      mouseConstraint = null;
      mouse = null;
    }

    function onArenaPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      var position = getPointerPosition(event);
      if (!findSphereAtPoint(position.x, position.y)) return;
      event.stopPropagation();
    }

    function buildWorld() {
      if (destroyed) return;

      if (engine) {
        unbindMouseConstraint();
        Runner.stop(runner);
        World.clear(engine.world, false);
        Engine.clear(engine);
        engine = null;
      }

      arena.innerHTML = '';
      spheres = [];
      getArenaSize();

      engine = Engine.create({
        gravity: { x: 0, y: 0.58 },
        positionIterations: 10,
        velocityIterations: 8,
      });
      spheres = createSpheres();
      World.add(engine.world, createWalls().concat(spheres.map(function (s) { return s.body; })));

      bindMouseConstraint();
      bindCollisions();
      Events.on(engine, 'afterUpdate', syncDomPositions);

      runner = Runner.create();
      Runner.run(runner, engine);
      syncDomPositions();
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildWorld, 150);
    }

    function bindPointerEvents() {
      arena.addEventListener('mousedown', onArenaPointerDown);
      arena.addEventListener('touchstart', onArenaPointerDown, { passive: true });
    }

    function unbindPointerEvents() {
      arena.removeEventListener('mousedown', onArenaPointerDown);
      arena.removeEventListener('touchstart', onArenaPointerDown);
    }

    bindPointerEvents();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(arena);
    } else {
      window.addEventListener('resize', onResize);
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(buildWorld);
    });

    return function teardown() {
      destroyed = true;
      clearTimeout(resizeTimer);
      unbindPointerEvents();
      stopDragTracking();
      unbindMouseConstraint();
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', onResize);
      if (engine) {
        Runner.stop(runner);
        World.clear(engine.world, false);
        Engine.clear(engine);
      }
      container.innerHTML = '';
    };
  }

  window.ShelterGradientJump = {
    mount: mountGradientJump,
  };
})();
