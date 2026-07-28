/**
 * Speech to Text — canvas waveform + Web Speech API
 */
(function () {
  'use strict';

  var MOTION_SPEED = 1.45;
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?@#$%&*{}[]<>/+=~';
  var THEMES = {
    original: {
      background: '#020303',
      wave: '230, 235, 239',
      ambient: '226, 232, 233',
      spoken: '240, 244, 245',
      glow: '139, 166, 169',
      divider: '148, 166, 168',
      accent: '229, 251, 252',
    },
    nebula: {
      background: '#080314',
      wave: '213, 174, 255',
      ambient: '177, 116, 255',
      spoken: '244, 226, 255',
      glow: '157, 73, 255',
      divider: '207, 148, 255',
      accent: '216, 166, 255',
    },
    cobalt: {
      background: '#020b18',
      wave: '97, 204, 255',
      ambient: '55, 143, 255',
      spoken: '211, 240, 255',
      glow: '35, 145, 255',
      divider: '104, 205, 255',
      accent: '92, 211, 255',
    },
    signal: {
      background: '#07110d',
      wave: '132, 255, 185',
      ambient: '80, 208, 139',
      spoken: '218, 255, 232',
      glow: '54, 229, 132',
      divider: '129, 255, 184',
      accent: '122, 255, 181',
    },
  };

  function mountVoiceToText(container, options) {
    options = options || {};
    var mode = options.mode === 'sheet' ? 'sheet' : 'card';
    var hostCard = options.hostCard || container.closest('.work-card');
    var themeTabs = mode === 'sheet'
      ? '<div class="voice-text__themes" role="tablist" aria-label="Visual style">' +
          '<button class="voice-text__theme is-active" type="button" role="tab" aria-selected="true" data-voice-theme="original">Original</button>' +
          '<button class="voice-text__theme" type="button" role="tab" aria-selected="false" data-voice-theme="nebula">Nebula</button>' +
          '<button class="voice-text__theme" type="button" role="tab" aria-selected="false" data-voice-theme="cobalt">Cobalt</button>' +
          '<button class="voice-text__theme" type="button" role="tab" aria-selected="false" data-voice-theme="signal">Signal</button>' +
        '</div>'
      : '';

    container.innerHTML =
      '<div class="voice-text interaction-demo interaction-demo--voicetext voice-text--' + mode + '">' +
        '<div class="voice-text__visualizer" aria-label="Animated speech waveform becoming text">' +
          '<canvas class="voice-text__canvas" aria-hidden="true"></canvas>' +
          themeTabs +
          '<button class="voice-text__listen" type="button" aria-pressed="false">' +
            '<span class="voice-text__dot" aria-hidden="true"></span>' +
            '<span class="voice-text__label">Tap to speak</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    var visualizer = container.querySelector('.voice-text__visualizer');
    var canvas = container.querySelector('.voice-text__canvas');
    var listenControl = container.querySelector('.voice-text__listen');
    var controlLabel = container.querySelector('.voice-text__label');
    var themeButtons = Array.prototype.slice.call(container.querySelectorAll('[data-voice-theme]'));
    if (!visualizer || !canvas || !listenControl || !controlLabel) {
      return function () {};
    }

    var ctx = canvas.getContext('2d');
    var particles = [];
    var words = [];
    var dpr = 1;
    var designW = 363;
    var designH = 284;
    var splitX = designW / 2;
    var renderScale = 1;
    var previousTime = performance.now();
    var listening = false;
    var micLevel = 0;
    var analyser;
    var audioContext;
    var microphoneStream;
    var audioData;
    var recognition;
    var interimWord = '';
    var rafId = null;
    var resizeObserver = null;
    var destroyed = false;
    var restartTimer = null;
    var activeThemeName = 'original';
    var activeTheme = THEMES.original;

    function markCardEngaged() {
      if (hostCard) hostCard.setAttribute('data-interaction-dragged', 'true');
    }

    function color(rgb, alpha) {
      return 'rgba(' + rgb + ', ' + alpha + ')';
    }

    function setTheme(themeName) {
      if (!THEMES[themeName]) return;
      activeThemeName = themeName;
      activeTheme = THEMES[themeName];
      visualizer.style.setProperty('--voice-accent', 'rgb(' + activeTheme.accent + ')');
      themeButtons.forEach(function (button) {
        var selected = button.getAttribute('data-voice-theme') === themeName;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    }

    function onThemeClick(event) {
      event.preventDefault();
      event.stopPropagation();
      markCardEngaged();
      setTheme(event.currentTarget.getAttribute('data-voice-theme'));
    }

    function updateSize() {
      var rect = visualizer.getBoundingClientRect();
      designW = Math.max(1, rect.width);
      designH = Math.max(1, rect.height);
      splitX = designW / 2;
      renderScale = Math.max(1, Math.min(2.5, Math.min(designW / 363, designH / 284)));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(designW * dpr);
      canvas.height = Math.round(designH * dpr);
    }

    function readMicLevel() {
      if (!analyser || !audioData) {
        micLevel += (0.14 - micLevel) * 0.08;
        return;
      }

      analyser.getByteTimeDomainData(audioData);
      var sum = 0;
      for (var i = 0; i < audioData.length; i++) {
        var normalized = (audioData[i] - 128) / 128;
        sum += normalized * normalized;
      }
      var target = Math.min(1, Math.sqrt(sum / audioData.length) * 6.5);
      micLevel += (target - micLevel) * (target > micLevel ? 0.42 : 0.13);
    }

    function waveform(x, time) {
      var progress = x / splitX;
      var intensity = 0.18 + micLevel * 1.18;
      var envelope = 0.5 + Math.sin(progress * Math.PI) * 0.36 +
        Math.sin(progress * Math.PI * 2.7 - time * 0.72) * 0.14;
      var broadCurve = Math.sin(progress * Math.PI * 4.35 - time * 2.08);
      var unevenCurve = Math.sin(progress * Math.PI * 7.6 + time * 1.31) * 0.34;
      var slowBend = Math.sin(progress * Math.PI * 2.15 - time * 0.83) * 0.26;
      var amplitude = Math.min(designH * 0.34, (25 + 54 * intensity) * renderScale);
      return designH / 2 + (broadCurve + unevenCurve + slowBend) * amplitude * envelope;
    }

    function drawWave(time) {
      var trails = [
        { delay: 0.32, alpha: 0.08, width: 0.8 },
        { delay: 0.25, alpha: 0.11, width: 0.85 },
        { delay: 0.19, alpha: 0.15, width: 0.9 },
        { delay: 0.13, alpha: 0.2, width: 0.95 },
        { delay: 0.065, alpha: 0.29, width: 1 },
        { delay: 0, alpha: 0.95, width: 1.45 },
      ];

      trails.forEach(function (trail) {
        ctx.beginPath();
        for (var x = 0; x <= splitX + 1; x += 1.5) {
          var progress = Math.min(1, x / splitX);
          var convergence = Math.pow(Math.sin(progress * Math.PI), 0.7);
          var current = waveform(x, time);
          var delayed = waveform(x, time - trail.delay);
          var y = current + (delayed - current) * convergence;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color(activeTheme.wave, trail.alpha);
        ctx.lineWidth = trail.width * renderScale;
        ctx.stroke();
      });
    }

    function createAmbientParticle() {
      particles.push({
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        x: splitX + 8 + Math.random() * Math.max(1, designW - splitX - 16),
        y: 8 + Math.random() * Math.max(1, designH - 16),
        vx: (Math.random() - 0.5) * (34 + renderScale * 8),
        vy: (Math.random() - 0.5) * (29 + renderScale * 7),
        spin: (Math.random() - 0.5) * 2.1,
        rotation: (Math.random() - 0.5) * 1.8,
        size: 6 + Math.random() * 5,
        age: Math.random() * 10,
        life: Infinity,
        seed: Math.random() * 100,
        strength: 0.16 + Math.random() * 0.18,
        ambient: true,
      });
    }

    function ensureAmbientParticles() {
      var target = Math.max(58, Math.min(220, Math.round(((designW - splitX) * designH) / 680)));
      var count = 0;
      particles.forEach(function (particle) {
        if (particle.ambient) count += 1;
      });
      while (count < target) {
        createAmbientParticle();
        count += 1;
      }
    }

    function emitWord(text, delay) {
      window.setTimeout(function () {
        var clean = text.trim().replace(/[^\p{L}\p{N}'-]/gu, '');
        if (!clean) return;
        var energy = Math.max(0.25, micLevel);
        var letters = clean.split('');
        var spacing = Math.min(8, 58 / Math.max(1, letters.length)) * renderScale;
        var center = (letters.length - 1) / 2;
        words.push({
          x: splitX + 9 * renderScale + center * spacing,
          y: waveform(splitX, performance.now() / 1000 * MOTION_SPEED),
          vx: (31 + energy * 31) * renderScale,
          vy: (Math.random() < 0.5 ? -1 : 1) * (14 + energy * 44) * renderScale,
          age: 0,
          energy: energy,
          letters: letters.map(function (char, index) {
            return {
              char: char,
              x: (index - center) * spacing + (Math.random() - 0.5) * 2.8 * renderScale,
              y: (Math.random() - 0.5) * 8 * renderScale,
              rotation: (Math.random() - 0.5) * 0.42,
              releaseAt: 0.26 + index * 0.025 + Math.random() * 0.16,
              released: false,
            };
          }),
        });
      }, delay || 0);
    }

    function releaseLetter(word, letter, index) {
      var center = (word.letters.length - 1) / 2;
      var spread = index - center;
      particles.push({
        char: letter.char,
        x: word.x + letter.x,
        y: word.y + letter.y,
        vx: (43 + Math.random() * 48 + word.energy * 30) * renderScale,
        vy: word.vy * 0.5 + spread * 7 * renderScale +
          (Math.random() - 0.5) * (38 + word.energy * 68) * renderScale,
        spin: (Math.random() - 0.5) * (5 + word.energy * 4),
        rotation: letter.rotation,
        size: 8 + Math.random() * 3.5,
        age: 0,
        life: 1.45 + Math.random() * 1.5,
        seed: Math.random() * 100,
        strength: 1,
        ambient: false,
      });
      letter.released = true;
    }

    function updateScene(dt, time) {
      ensureAmbientParticles();

      for (var i = words.length - 1; i >= 0; i--) {
        var word = words[i];
        word.age += dt;
        word.x += word.vx * dt;
        word.y += word.vy * dt;
        word.vy *= Math.pow(0.64, dt);
        var remaining = 0;
        word.letters.forEach(function (letter, index) {
          if (letter.released) return;
          letter.x += Math.sin(time * 4 + index * 1.7) * dt * 2;
          letter.y += Math.cos(time * 3.2 + index * 1.3) * dt * 2.6;
          letter.rotation += Math.sin(time * 2.8 + index) * dt * 0.18;
          if (word.age >= letter.releaseAt) releaseLetter(word, letter, index);
          else remaining += 1;
        });
        if (remaining === 0) {
          words.splice(i, 1);
        }
      }

      for (var j = particles.length - 1; j >= 0; j--) {
        var p = particles[j];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.ambient) {
          p.vx += Math.sin(time * 1.8 + p.seed) * dt * 8;
          p.vy += Math.cos(time * 2.05 + p.seed) * dt * 9;
          p.vx *= Math.pow(0.9, dt);
          p.vy *= Math.pow(0.9, dt);
          p.rotation += p.spin * dt;
          if (p.x < splitX + 6) {
            p.x = splitX + 6;
            p.vx = Math.abs(p.vx);
          } else if (p.x > designW - 6) {
            p.x = designW - 6;
            p.vx = -Math.abs(p.vx);
          }
          if (p.y < 7) {
            p.y = 7;
            p.vy = Math.abs(p.vy);
          } else if (p.y > designH - 7) {
            p.y = designH - 7;
            p.vy = -Math.abs(p.vy);
          }
          continue;
        }
        p.vx += 10 * dt;
        p.vy += Math.sin(time * 3 + p.seed + p.x * 0.04) * 45 * dt;
        p.vy *= Math.pow(0.66, dt);
        p.rotation += p.spin * dt;
        if (p.y < 9 || p.y > designH - 9) p.vy *= -0.72;
        if (p.age > p.life || p.x > designW + 14) particles.splice(j, 1);
      }
    }

    function drawWords() {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      words.forEach(function (word) {
        word.letters.forEach(function (letter) {
          if (letter.released) return;
          ctx.save();
          ctx.translate(word.x + letter.x, word.y + letter.y);
          ctx.rotate(letter.rotation);
          ctx.font = 10 * renderScale + 'px Arial, Helvetica, sans-serif';
          ctx.fillStyle = color(activeTheme.spoken, Math.min(1, word.age * 12));
          ctx.fillText(letter.char, 0, 0);
          ctx.restore();
        });
      });

      if (listening && interimWord) {
        ctx.font = 9 * renderScale + 'px Arial, Helvetica, sans-serif';
        ctx.fillStyle = color(activeTheme.spoken, 0.38);
        var previewLetters = interimWord.split('');
        var previewSpacing = Math.min(7, 48 / Math.max(1, previewLetters.length)) * renderScale;
        var previewY = waveform(splitX, performance.now() / 1000 * MOTION_SPEED);
        previewLetters.forEach(function (char, index) {
          var jitterX = Math.sin(index * 9.3) * 1.5 * renderScale;
          var jitterY = Math.sin(index * 4.7 + interimWord.length) * 3.5 * renderScale;
          ctx.fillText(char, splitX + 10 * renderScale + index * previewSpacing + jitterX, previewY + jitterY);
        });
      }
    }

    function drawParticles() {
      particles.forEach(function (p) {
        var alpha;
        if (p.ambient) {
          alpha = p.strength * (0.78 + Math.sin(p.age * 0.8 + p.seed) * 0.22);
        } else {
          var fadeIn = Math.min(1, p.age * 7);
          var fadeOut = Math.max(0, 1 - p.age / p.life);
          var distanceFade = Math.max(0.12, 1 - (p.x - splitX) / (splitX * 1.08));
          alpha = fadeIn * fadeOut * distanceFade * 0.86 * p.strength;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = p.size * renderScale + 'px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color(p.ambient ? activeTheme.ambient : activeTheme.spoken, alpha);
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      });
    }

    function drawRightGlow() {
      var glow = ctx.createLinearGradient(splitX, 0, splitX + 82, 0);
      glow.addColorStop(0, color(activeTheme.glow, 0.15));
      glow.addColorStop(0.35, color(activeTheme.glow, 0.065));
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(splitX, 0, 82, designH);
    }

    function drawDivider() {
      var line = ctx.createLinearGradient(splitX, 0, splitX, designH);
      line.addColorStop(0, color(activeTheme.divider, 0.1));
      line.addColorStop(0.5, color(activeTheme.divider, 0.43));
      line.addColorStop(1, color(activeTheme.divider, 0.1));
      ctx.save();
      ctx.shadowColor = color(activeTheme.glow, 0.28);
      ctx.shadowBlur = 7;
      ctx.fillStyle = line;
      ctx.fillRect(splitX - 0.5, 0, 1, designH);
      ctx.restore();
    }

    function drawThemeBackground(time) {
      ctx.fillStyle = activeTheme.background;
      ctx.fillRect(0, 0, designW, designH);
      if (activeThemeName === 'original') return;

      if (activeThemeName === 'nebula') {
        var nebula = ctx.createRadialGradient(
          designW * 0.72,
          designH * (0.45 + Math.sin(time * 0.35) * 0.08),
          0,
          designW * 0.72,
          designH * 0.5,
          designW * 0.58
        );
        nebula.addColorStop(0, color(activeTheme.glow, 0.2));
        nebula.addColorStop(0.45, color(activeTheme.ambient, 0.075));
        nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, designW, designH);
      } else if (activeThemeName === 'cobalt') {
        var cobalt = ctx.createLinearGradient(0, 0, 0, designH);
        cobalt.addColorStop(0, color(activeTheme.glow, 0.03));
        cobalt.addColorStop(0.55, color(activeTheme.glow, 0.12));
        cobalt.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cobalt;
        ctx.fillRect(0, 0, designW, designH);
        ctx.fillStyle = color(activeTheme.wave, 0.025);
        for (var y = 2; y < designH; y += 5 * renderScale) {
          ctx.fillRect(0, y, designW, Math.max(0.5, renderScale * 0.35));
        }
      } else if (activeThemeName === 'signal') {
        var signal = ctx.createRadialGradient(
          splitX,
          waveform(splitX, time),
          0,
          splitX,
          designH / 2,
          designW * 0.52
        );
        signal.addColorStop(0, color(activeTheme.glow, 0.13));
        signal.addColorStop(0.55, color(activeTheme.ambient, 0.035));
        signal.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = signal;
        ctx.fillRect(0, 0, designW, designH);
      }
    }

    function frame(now) {
      if (destroyed) return;
      var time = now / 1000 * MOTION_SPEED;
      var dt = Math.min((now - previousTime) / 1000, 0.033) * MOTION_SPEED;
      previousTime = now;
      readMicLevel();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, designW, designH);
      drawThemeBackground(time);
      drawRightGlow();
      drawWave(time);
      updateScene(dt, time);
      drawWords();
      drawParticles();
      drawDivider();
      rafId = requestAnimationFrame(frame);
    }

    function setupRecognition() {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return false;

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = document.documentElement.lang || 'en-US';

      recognition.onresult = function (event) {
        var liveText = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var transcript = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            transcript.split(/\s+/).forEach(function (word, index) {
              emitWord(word, index * 115);
            });
          } else {
            liveText += ' ' + transcript;
          }
        }
        var parts = liveText.trim().split(/\s+/);
        interimWord = parts[parts.length - 1] || '';
      };

      recognition.onerror = function (event) {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          controlLabel.textContent = 'Speech unavailable';
        }
      };

      recognition.onend = function () {
        if (!listening || destroyed) return;
        clearTimeout(restartTimer);
        restartTimer = window.setTimeout(function () {
          if (!listening || destroyed || !recognition) return;
          try { recognition.start(); } catch (e) {}
        }, 180);
      };

      return true;
    }

    function stopListening() {
      listening = false;
      interimWord = '';
      listenControl.classList.remove('is-listening');
      listenControl.setAttribute('aria-pressed', 'false');
      controlLabel.textContent = 'Tap to speak';
      clearTimeout(restartTimer);
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(function (track) { track.stop(); });
        microphoneStream = null;
      }
      if (audioContext) {
        audioContext.close().catch(function () {});
        audioContext = null;
      }
      analyser = undefined;
      audioData = undefined;
    }

    function startListening() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        controlLabel.textContent = 'Microphone unavailable';
        return;
      }

      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }).then(function (stream) {
        if (destroyed) {
          stream.getTracks().forEach(function (track) { track.stop(); });
          return;
        }

        microphoneStream = stream;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return audioContext.resume().then(function () {
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.58;
          audioData = new Uint8Array(analyser.fftSize);
          audioContext.createMediaStreamSource(microphoneStream).connect(analyser);

          listening = true;
          listenControl.classList.add('is-listening');
          listenControl.setAttribute('aria-pressed', 'true');
          controlLabel.textContent = 'Listening…';

          if (!recognition && !setupRecognition()) {
            controlLabel.textContent = 'Listening · no transcription';
          } else if (recognition) {
            try { recognition.start(); } catch (e) {}
          }
        });
      }).catch(function () {
        controlLabel.textContent = 'Allow microphone access';
      });
    }

    function onListenClick(event) {
      event.preventDefault();
      event.stopPropagation();
      markCardEngaged();
      if (listening) stopListening();
      else startListening();
    }

    function seedParticles() {
      ensureAmbientParticles();
    }

    function onResize() {
      updateSize();
    }

    listenControl.addEventListener('click', onListenClick);
    themeButtons.forEach(function (button) {
      button.addEventListener('click', onThemeClick);
    });

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(visualizer);
    } else {
      window.addEventListener('resize', onResize);
    }

    updateSize();
    setTheme('original');
    seedParticles();
    rafId = requestAnimationFrame(frame);

    return function teardown() {
      destroyed = true;
      stopListening();
      if (rafId) cancelAnimationFrame(rafId);
      listenControl.removeEventListener('click', onListenClick);
      themeButtons.forEach(function (button) {
        button.removeEventListener('click', onThemeClick);
      });
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', onResize);
      container.innerHTML = '';
    };
  }

  window.ShelterVoiceToText = {
    mount: mountVoiceToText,
  };
})();
