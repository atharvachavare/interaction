/**
 * Calendar booking — from CalendarInteraction/preview.html
 */
(function () {
  'use strict';

  var HTML =
    '<div class="interaction-demo interaction-demo--calendar">' +
      '<div class="calendar-booking">' +
        '<div class="outer-inset-shadow" aria-hidden="true"></div>' +
        '<div class="white-card">' +
          '<div class="card-content">' +
            '<div class="date-picker" data-cal-date-picker></div>' +
            '<div class="duration-section" data-cal-duration-section>' +
              '<div class="slider-track-wrap" data-cal-slider-track>' +
                '<div class="slider-track">' +
                  '<div class="slider-track-white"></div>' +
                  '<div class="slider-dots"></div>' +
                  '<div class="slider-track-inset"></div>' +
                '</div>' +
                '<div class="slider-fill" data-cal-slider-fill>' +
                  '<div class="slider-fill-bg"></div>' +
                  '<div class="slider-fill-inset"></div>' +
                '</div>' +
                '<div class="slider-knob" data-cal-slider-knob>' +
                  '<div class="slider-knob-bg"></div>' +
                  '<div class="slider-knob-inset"></div>' +
                '</div>' +
              '</div>' +
              '<div class="slider-labels">' +
                '<div class="slider-labels-row">' +
                  '<span class="slider-label-muted">15m</span>' +
                  '<span class="slider-label-muted">2h</span>' +
                '</div>' +
                '<span class="slider-label-active" data-cal-duration-label></span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="time-slots">' +
            '<div class="time-slots-viewport">' +
              '<div class="time-slots-scroll-wrap">' +
                '<div class="time-slots-scroll">' +
                  '<div class="time-slots-row" data-cal-time-slots-row></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="book-now-footer">' +
            '<button type="button" class="book-now" data-cal-book-now>' +
              '<div class="book-now-bg"></div>' +
              '<span class="book-now-text">Book Now</span>' +
              '<div class="book-now-spinner" aria-hidden="true"></div>' +
              '<div class="book-now-inset"></div>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="confirm-chip">' +
          '<button type="button" class="confirm-done" data-cal-confirm-done aria-label="Done">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>' +
          '</button>' +
          '<div class="confirm-check">' +
            '<svg viewBox="0 0 36 36" aria-hidden="true">' +
              '<path class="confirm-check-path" d="M9 18.5 L15.5 25 L27 12" />' +
            '</svg>' +
          '</div>' +
          '<div class="confirm-text">' +
            '<div class="confirm-title">Booking Confirmed</div>' +
            '<div class="confirm-slot" data-cal-confirm-slot><strong>11:00AM</strong> · Mon, Jun 14 · 30m</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  function mountCalendarBooking(container) {
    container.innerHTML = HTML;

    var root = container.querySelector('.calendar-booking');
    var picker = root.querySelector('[data-cal-date-picker]');
    var durationSection = root.querySelector('[data-cal-duration-section]');
    var track = root.querySelector('[data-cal-slider-track]');
    var sliderFill = root.querySelector('[data-cal-slider-fill]');
    var sliderKnob = root.querySelector('[data-cal-slider-knob]');
    var durationLabel = root.querySelector('[data-cal-duration-label]');
    var timeSlotsRow = root.querySelector('[data-cal-time-slots-row]');
    var bookNowBtn = root.querySelector('[data-cal-book-now]');
    var confirmDone = root.querySelector('[data-cal-confirm-done]');
    var confirmSlot = root.querySelector('[data-cal-confirm-slot]');

    var SNAP_DURATIONS = [15, 30, 60, 90, 120];
    var AVAILABILITY_END = 15 * 60;
    var FORCED_INVALID = {
      60: ['1:00PM'],
      90: ['1:00PM', '1:30PM'],
      120: ['1:00PM', '1:30PM', '2:00PM'],
    };
    var ALL_TIME_SLOTS = [
      '9:00AM', '9:30AM', '10:00AM', '10:30AM', '11:00AM', '11:30AM',
      '12:00PM', '12:30PM', '1:00PM', '1:30PM', '2:00PM',
    ];
    var dates = [
      { day: 'Thu', date: 12 },
      { day: 'Fri', date: 13 },
      { day: 'Mon', date: 14 },
      { day: 'Tue', date: 15 },
      { day: 'Wed', date: 16 },
    ];
    var SEGMENT_ORDER = ['n', 'u', 'sp', 'mn', 'mu'];
    var DIAL_LINE = 29.912;
    var PROCESSING_MS = 1100;

    var selectedDate = null;
    var durationMinutes = 30;
    var durationPercent = 0.25;
    var selectedTime = null;
    var dragging = false;
    var bookingState = 'idle';
    var processingTimer = null;

    function clampPercent(p) {
      return Math.max(0, Math.min(1, p));
    }

    function percentToContinuousIndex(p) {
      return clampPercent(p) * (SNAP_DURATIONS.length - 1);
    }

    function percentToSnappedMinutes(p) {
      return SNAP_DURATIONS[Math.round(percentToContinuousIndex(p))];
    }

    function getDialTransition(p) {
      var index = percentToContinuousIndex(p);
      var fromIndex = Math.floor(index);
      var toIndex = Math.min(SNAP_DURATIONS.length - 1, Math.ceil(index));
      var progress = toIndex === fromIndex ? 0 : index - fromIndex;
      return {
        fromMinutes: SNAP_DURATIONS[fromIndex],
        toMinutes: SNAP_DURATIONS[toIndex],
        progress: progress,
      };
    }

    function parseTimeToMinutes(time) {
      var match = time.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
      if (!match) return 0;
      var hours = Number(match[1]);
      var minutes = Number(match[2]);
      var period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    function isSlotValid(time, duration) {
      if (FORCED_INVALID[duration] && FORCED_INVALID[duration].indexOf(time) !== -1) return false;
      return parseTimeToMinutes(time) + duration <= AVAILABILITY_END;
    }

    function snapDuration(m) {
      return SNAP_DURATIONS.reduce(function (closest, value) {
        return Math.abs(value - m) < Math.abs(closest - m) ? value : closest;
      });
    }

    function minutesToPercent(m) {
      return SNAP_DURATIONS.indexOf(snapDuration(m)) / (SNAP_DURATIONS.length - 1);
    }

    function formatDuration(m) {
      m = snapDuration(m);
      if (m === 120) return '2h';
      if (m === 90) return '1h 30m';
      if (m === 60) return '1h';
      if (m === 30) return '30m';
      return '15m';
    }

    function getDurationSegments(m) {
      m = snapDuration(m);
      if (m === 120) return [{ id: 'n', text: '2' }, { id: 'u', text: 'h' }];
      if (m === 90) {
        return [
          { id: 'n', text: '1' },
          { id: 'u', text: 'h' },
          { id: 'sp', text: ' ', dial: false },
          { id: 'mn', text: '30' },
          { id: 'mu', text: 'm' },
        ];
      }
      if (m === 60) return [{ id: 'n', text: '1' }, { id: 'u', text: 'h' }];
      if (m === 30) return [{ id: 'n', text: '30' }, { id: 'u', text: 'm' }];
      return [{ id: 'n', text: '15' }, { id: 'u', text: 'm' }];
    }

    function getOrderedDialSegmentIds(fromM, toM) {
      var fromIds = {};
      var toIds = {};
      getDurationSegments(fromM).forEach(function (s) { fromIds[s.id] = true; });
      getDurationSegments(toM).forEach(function (s) { toIds[s.id] = true; });
      return SEGMENT_ORDER.filter(function (id) { return fromIds[id] || toIds[id]; });
    }

    function renderDialColumn(fromSeg, toSeg, progress) {
      var id = (toSeg || fromSeg).id;

      if ((fromSeg && fromSeg.dial === false) || (toSeg && toSeg.dial === false)) {
        var seg = toSeg || fromSeg;
        var opacity = !fromSeg ? progress : !toSeg ? 1 - progress : 1;
        if (opacity <= 0.01) return '';
        return '<span class="dial-space" style="opacity:' + opacity + '">' + seg.text + '</span>';
      }

      var fromText = fromSeg && fromSeg.text;
      var toText = toSeg && toSeg.text;

      if (fromText && toText && fromText !== toText) {
        return '<span class="dial-col" data-id="' + id + '">' +
          '<span class="dial-track" style="transform:translateY(' + (-DIAL_LINE * (1 - progress)) + 'px)">' +
            '<span class="dial-cell">' + toText + '</span>' +
            '<span class="dial-cell">' + fromText + '</span>' +
          '</span></span>';
      }

      if (fromText && toText) {
        return '<span class="dial-col" data-id="' + id + '"><span class="dial-track"><span class="dial-cell">' + toText + '</span></span></span>';
      }

      if (!fromText && toSeg) {
        return '<span class="dial-col" data-id="' + id + '" style="opacity:' + progress + ';transform:translateY(' + (8 * (1 - progress)) + 'px)">' +
          '<span class="dial-track"><span class="dial-cell">' + toSeg.text + '</span></span></span>';
      }

      if (fromSeg && !toText) {
        return '<span class="dial-col" data-id="' + id + '" style="opacity:' + (1 - progress) + ';transform:translateY(' + (-8 * progress) + 'px)">' +
          '<span class="dial-track"><span class="dial-cell">' + fromSeg.text + '</span></span></span>';
      }

      return '';
    }

    function updateDurationLabel() {
      var dial = getDialTransition(durationPercent);
      var fromSegs = getDurationSegments(dial.fromMinutes);
      var toSegs = getDurationSegments(dial.toMinutes);
      var fromById = {};
      var toById = {};
      fromSegs.forEach(function (s) { fromById[s.id] = s; });
      toSegs.forEach(function (s) { toById[s.id] = s; });
      var ids = getOrderedDialSegmentIds(dial.fromMinutes, dial.toMinutes);
      durationLabel.innerHTML = ids.map(function (id) {
        return renderDialColumn(fromById[id], toById[id], dial.progress);
      }).join('');
    }

    function updateExpandedState() {
      root.classList.toggle('is-expanded', selectedDate !== null);
    }

    function updateDateSelection() {
      root.querySelectorAll('.date-btn').forEach(function (btn) {
        btn.classList.toggle('is-selected', Number(btn.dataset.date) === selectedDate);
      });
    }

    function updateTimeSlotSelection() {
      timeSlotsRow.classList.toggle('has-selection', selectedTime !== null);
      root.querySelectorAll('.time-slot').forEach(function (btn) {
        var active = selectedTime === null || btn.dataset.time === selectedTime;
        btn.classList.toggle('is-active', active);
      });
    }

    function updateTimeSlotValidity() {
      if (selectedDate === null) return;
      if (!timeSlotsRow || timeSlotsRow.dataset.mounted !== 'true') {
        renderTimeSlots();
        return;
      }
      if (selectedTime && !isSlotValid(selectedTime, durationMinutes)) selectedTime = null;
      root.querySelectorAll('.time-slot-shell').forEach(function (shell) {
        shell.classList.toggle('is-invalid', !isSlotValid(shell.dataset.time, durationMinutes));
      });
      updateTimeSlotSelection();
    }

    function renderTimeSlots() {
      if (!timeSlotsRow || selectedDate === null) return;
      if (selectedTime && !isSlotValid(selectedTime, durationMinutes)) selectedTime = null;
      if (timeSlotsRow.dataset.mounted === 'true') {
        updateTimeSlotValidity();
        return;
      }
      timeSlotsRow.innerHTML = ALL_TIME_SLOTS.map(function (time) {
        return '<div class="time-slot-shell" data-time="' + time + '">' +
          '<div class="time-slot-inner-wrap">' +
            '<button type="button" class="time-slot is-active" data-time="' + time + '">' +
              '<div class="time-slot-bg time-slot-bg-dark"></div>' +
              '<div class="time-slot-bg time-slot-bg-light"></div>' +
              '<div class="time-slot-inner"><span class="time-slot-text">' + time + '</span></div>' +
              '<div class="time-slot-inset"></div>' +
            '</button>' +
          '</div></div>';
      }).join('');
      timeSlotsRow.dataset.mounted = 'true';
      updateTimeSlotValidity();
    }

    function updateSlider() {
      var pctStr = (durationPercent * 100) + '%';
      sliderFill.style.width = 'calc(' + pctStr + ' + 0.41px)';
      sliderKnob.style.left = pctStr;
      durationLabel.style.left = pctStr;
      updateDurationLabel();
    }

    function setFromEvent(e, snapOnEnd) {
      var rect = track.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      durationPercent = clampPercent(x / rect.width);
      updateSlider();
      if (snapOnEnd) {
        durationMinutes = percentToSnappedMinutes(durationPercent);
        durationPercent = minutesToPercent(durationMinutes);
        updateSlider();
        updateTimeSlotValidity();
      }
    }

    function onPickerClick(e) {
      var btn = e.target.closest('.date-btn');
      if (!btn) return;
      selectedDate = Number(btn.dataset.date);
      selectedTime = null;
      updateDateSelection();
      timeSlotsRow.innerHTML = '';
      delete timeSlotsRow.dataset.mounted;
      renderTimeSlots();
      updateExpandedState();
    }

    function onTimeSlotClick(e) {
      var btn = e.target.closest('.time-slot');
      if (!btn) return;
      var time = btn.dataset.time;
      if (!isSlotValid(time, durationMinutes)) return;
      selectedTime = time;
      updateTimeSlotSelection();
    }

    function onTrackDown(e) {
      dragging = true;
      durationSection.classList.add('is-dragging');
      if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
      setFromEvent(e, false);
    }

    function onTrackMove(e) {
      if (!dragging) return;
      setFromEvent(e, false);
    }

    function onTrackUp(e) {
      dragging = false;
      durationSection.classList.remove('is-dragging');
      if (track.releasePointerCapture) track.releasePointerCapture(e.pointerId);
      setFromEvent(e, true);
    }

    function populateChip() {
      var dateObj = dates.find(function (d) { return d.date === selectedDate; });
      var dateLabel = dateObj ? dateObj.day + ', Jun ' + dateObj.date : 'Mon, Jun 14';
      var time = selectedTime || '11:00AM';
      confirmSlot.innerHTML = '<strong>' + time + '</strong> · ' + dateLabel + ' · ' + formatDuration(durationMinutes);
    }

    function confirmBooking() {
      bookingState = 'confirmed';
      populateChip();
      root.classList.remove('is-expanded');
      root.classList.add('is-confirmed');
      setTimeout(function () { bookNowBtn.classList.remove('is-processing'); }, 320);
    }

    function startBooking() {
      if (bookingState !== 'idle' || selectedDate === null) return;
      bookingState = 'processing';
      bookNowBtn.classList.add('is-processing');
      processingTimer = setTimeout(confirmBooking, PROCESSING_MS);
    }

    function resetBooking() {
      root.classList.remove('is-confirmed');
      if (selectedDate !== null) root.classList.add('is-expanded');
      bookingState = 'idle';
    }

    picker.innerHTML = dates.map(function (d) {
      return '<button type="button" class="date-btn" data-date="' + d.date + '">' +
        '<div class="date-btn-bg selected"></div>' +
        '<div class="date-btn-bg unselected"></div>' +
        '<div class="date-btn-inner">' +
          '<span class="date-day">' + d.day + '</span>' +
          '<div class="date-circle">' +
            '<div class="date-circle-bg selected"></div>' +
            '<div class="date-circle-bg unselected"></div>' +
            '<span class="date-number">' + d.date + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="date-btn-inset"></div>' +
      '</button>';
    }).join('');

    picker.addEventListener('click', onPickerClick);
    timeSlotsRow.addEventListener('click', onTimeSlotClick);
    track.addEventListener('pointerdown', onTrackDown);
    track.addEventListener('pointermove', onTrackMove);
    track.addEventListener('pointerup', onTrackUp);
    track.addEventListener('pointercancel', onTrackUp);
    bookNowBtn.addEventListener('click', startBooking);
    confirmDone.addEventListener('click', resetBooking);

    updateSlider();
    updateExpandedState();

    return function teardown() {
      if (processingTimer) clearTimeout(processingTimer);
      picker.removeEventListener('click', onPickerClick);
      timeSlotsRow.removeEventListener('click', onTimeSlotClick);
      track.removeEventListener('pointerdown', onTrackDown);
      track.removeEventListener('pointermove', onTrackMove);
      track.removeEventListener('pointerup', onTrackUp);
      track.removeEventListener('pointercancel', onTrackUp);
      bookNowBtn.removeEventListener('click', startBooking);
      confirmDone.removeEventListener('click', resetBooking);
      container.innerHTML = '';
    };
  }

  window.ShelterCalendarBooking = { mount: mountCalendarBooking };
})();
