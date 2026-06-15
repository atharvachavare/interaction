/**
 * Vanilla bottom-sheet drawer (vaul-style).
 * - Opens when a gallery card is clicked, showing that component enlarged.
 * - Drag the sheet (or its handle) downward to dismiss; release past a
 *   threshold to close, otherwise it snaps back.
 * - Closes on overlay click, the X button, the handle, or Escape.
 */
(function () {
  const drawer = document.getElementById('drawer');
  const sheet = drawer.querySelector('.drawer__sheet');
  const titleEl = document.getElementById('drawer-title');
  const descEl = document.getElementById('drawer-desc');
  const tagsEl = document.getElementById('drawer-tags');
  const mediaEl = document.getElementById('drawer-media');
  const cards = document.querySelectorAll('.gallery .card');

  let lastFocused = null;

  function openDrawer(name, src, desc, tags) {
    lastFocused = document.activeElement;
    titleEl.textContent = name;
    descEl.textContent = desc || '';
    tagsEl.innerHTML = '';
    (tags || []).forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'drawer__tag';
      chip.textContent = tag;
      tagsEl.appendChild(chip);
    });
    mediaEl.src = src;
    mediaEl.alt = name;
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

  // --- Triggers: make each card open the drawer ---
  cards.forEach((card) => {
    const name = card.getAttribute('data-name') || 'Component';
    const desc = card.getAttribute('data-desc') || '';
    const tags = (card.getAttribute('data-tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const img = card.querySelector('img');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.style.cursor = 'pointer';

    const trigger = () => openDrawer(name, img ? img.src : '', desc, tags);
    card.addEventListener('click', trigger);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger();
      }
    });
  });

  // --- Close affordances ---
  drawer.querySelectorAll('[data-drawer-close]').forEach((el) => {
    el.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  // --- Drag-to-dismiss ---
  const CLOSE_THRESHOLD = 120; // px dragged before it dismisses
  let dragging = false;
  let startY = 0;
  let currentY = 0;

  function onPointerDown(e) {
    // Ignore drags starting on interactive controls (X button).
    if (e.target.closest('.drawer__close')) return;
    dragging = true;
    startY = e.clientY;
    currentY = 0;
    sheet.style.transition = 'none';
    sheet.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const delta = e.clientY - startY;
    if (delta < 0) return; // only allow dragging downward
    currentY = delta;
    sheet.style.transform = `translate(-50%, ${delta}px)`;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    if (currentY > CLOSE_THRESHOLD) {
      closeDrawer();
    } else {
      sheet.style.transform = '';
    }
  }

  sheet.addEventListener('pointerdown', onPointerDown);
  sheet.addEventListener('pointermove', onPointerMove);
  sheet.addEventListener('pointerup', onPointerUp);
  sheet.addEventListener('pointercancel', onPointerUp);
})();
