/* ================================================================
   script.js — Dinner Invitation
   Vanilla JS · No frameworks · Clean state machine
   ================================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────────
   1. Application State
──────────────────────────────────────────────────────────────────── */
const state = {
  currentScreen: 1,   // 1-7
  transitioning: false,
  choices: {
    food:    null,   // 'sushi' | 'italian' | 'bbq' | 'burgers' | 'surprise'
    vibe:    null,   // 'fancy' | 'cozy' | 'city' | 'quiet'
    dessert: null,   // 'absolutely' | 'of_course' | 'later'
  },
};

/* Map: screenNumber → which progress dot (1-4) should be active.
   Screens 5 & 6 both point to dot 4 (loading + reveal = same step). */
const SCREEN_TO_DOT = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 4 };

/* Detect user preference for reduced motion once on load */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ──────────────────────────────────────────────────────────────────
   2. Stars background (canvas, twinkling dots)
──────────────────────────────────────────────────────────────────── */
function initStars() {
  const canvas = document.getElementById('stars');
  const ctx    = canvas.getContext('2d');
  let stars    = [];
  let rafId;

  /** Resize canvas to full viewport and regenerate stars. */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    createStars();
  }

  /** Generate star objects proportional to screen area. */
  function createStars() {
    const count = Math.max(60, Math.floor((canvas.width * canvas.height) / 5500));
    stars = Array.from({ length: count }, () => ({
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height,
      r:      Math.random() * 1.3 + 0.2,
      alpha:  Math.random() * 0.55 + 0.1,
      speed:  Math.random() * 0.0025 + 0.0008,
      phase:  Math.random() * Math.PI * 2,
    }));
  }

  /** Animate frame — uses requestAnimationFrame timestamp for sine twinkle. */
  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);

  if (REDUCED_MOTION) {
    /* Draw one static frame — no animation loop */
    stars.forEach(s => {
      ctx.globalAlpha = s.alpha * 0.45;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  } else {
    rafId = requestAnimationFrame(draw);
  }
}

/* ──────────────────────────────────────────────────────────────────
   3. Progress indicator
──────────────────────────────────────────────────────────────────── */
function updateProgress(screenNumber) {
  const nav  = document.getElementById('progress');
  const dots = document.querySelectorAll('.dot');

  /* Hide on intro (1) and acceptance (7) */
  if (screenNumber <= 1 || screenNumber >= 7) {
    nav.classList.remove('visible');
    return;
  }
  nav.classList.add('visible');

  const activeDot = SCREEN_TO_DOT[screenNumber] ?? 1;

  dots.forEach((dot, i) => {
    const n = i + 1; // 1-indexed
    dot.classList.remove('active', 'completed');
    if (n < activeDot)      dot.classList.add('completed');
    else if (n === activeDot) dot.classList.add('active');
  });
}

/* ──────────────────────────────────────────────────────────────────
   4. Screen navigation (smooth fade + slide)
──────────────────────────────────────────────────────────────────── */
/**
 * Transition from the current screen to `nextNum`.
 * Guard against double-clicks with `state.transitioning`.
 */
function goToScreen(nextNum) {
  if (state.transitioning) return;
  const currentEl = document.getElementById(`screen-${state.currentScreen}`);
  const nextEl    = document.getElementById(`screen-${nextNum}`);
  if (!currentEl || !nextEl) return;

  state.transitioning = true;

  /* 1. Start exit animation on current */
  currentEl.classList.add('exiting');

  /* 2. After exit animation (~360 ms), swap screens */
  const DURATION = REDUCED_MOTION ? 20 : 380;

  setTimeout(() => {
    currentEl.classList.remove('active', 'exiting');
    nextEl.classList.add('active');
    state.currentScreen = nextNum;
    state.transitioning = false;

    updateProgress(nextNum);

    /* Trigger special logic for certain screens */
    if (nextNum === 5) startLoading();
    if (nextNum === 6) buildSummary();
  }, DURATION);
}

/* ──────────────────────────────────────────────────────────────────
   5. Choice selection
──────────────────────────────────────────────────────────────────── */
/**
 * Called when the user taps an option button.
 * Saves the choice, shows selected style, then advances.
 *
 * @param {string} category  - 'food' | 'vibe' | 'dessert'
 * @param {string} value     - the chosen key
 * @param {HTMLElement} btn  - the clicked button element
 */
function selectChoice(category, value, btn) {
  state.choices[category] = value;

  /* Visual feedback: mark selected */
  const group = btn.closest('.options');
  group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  /* Short delay so the user sees the selection before transitioning */
  const delay = REDUCED_MOTION ? 50 : 420;
  setTimeout(() => goToScreen(state.currentScreen + 1), delay);
}

/* ──────────────────────────────────────────────────────────────────
   6. Loading animation (screen 5)
──────────────────────────────────────────────────────────────────── */
function startLoading() {
  const fill  = document.getElementById('loader-fill');
  const label = document.getElementById('loader-label');
  const track = document.getElementById('loader-track');

  /* Immediately jump to 100% for reduced-motion users */
  if (REDUCED_MOTION) {
    fill.style.width = '100%';
    label.textContent = '100%';
    track.setAttribute('aria-valuenow', '100');
    setTimeout(() => goToScreen(6), 400);
    return;
  }

  const DURATION = 2700; // ms to fill the bar
  const start    = performance.now();

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(1, elapsed / DURATION);

    /* Cubic ease-out: starts fast, slows near 100% */
    const eased = 1 - Math.pow(1 - progress, 3);
    const pct   = Math.round(eased * 100);

    fill.style.width      = pct + '%';
    label.textContent     = pct + '%';
    track.setAttribute('aria-valuenow', String(pct));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      /* Brief pause at 100%, then reveal the final screen */
      setTimeout(() => goToScreen(6), 420);
    }
  }

  requestAnimationFrame(step);
}

/* ──────────────────────────────────────────────────────────────────
   7. Summary sentence (screen 6)
──────────────────────────────────────────────────────────────────── */

/* Human-readable labels for each choice value */
const FOOD_LABELS = {
  sushi:    'sushi',
  italian:  'Italian',
  bbq:      'BBQ',
  burgers:  'burgers',
  surprise: 'something delightfully surprising',
};

const VIBE_LABELS = {
  fancy:  'fancy',
  cozy:   'cozy',
  city:   'city-lights',
  quiet:  'quiet and serene',
};

const DESSERT_LABELS = {
  absolutely: 'dessert included, obviously',
  of_course:  'and definitely dessert',
  later:      'and we\'ll decide on dessert when the moment feels right',
};

function buildSummary() {
  const food    = FOOD_LABELS[state.choices.food]    ?? 'something delicious';
  const vibe    = VIBE_LABELS[state.choices.vibe]    ?? 'perfect';
  const dessert = DESSERT_LABELS[state.choices.dessert] ?? 'with a sweet ending';

  const sentence = `Looks like a ${vibe} ${food} dinner, ${dessert}.`;
  document.getElementById('summary-text').textContent = sentence;
}

/* ──────────────────────────────────────────────────────────────────
   8. Acceptance (screen 7 + effects)
──────────────────────────────────────────────────────────────────── */
function accept() {
  goToScreen(7);

  /* Launch visual celebration after the screen enters */
  if (!REDUCED_MOTION) {
    setTimeout(() => {
      launchConfetti();
      startSparkles();
    }, 480);
  }
}

/* ──────────────────────────────────────────────────────────────────
   9. Confetti burst (canvas particles)
──────────────────────────────────────────────────────────────────── */
function launchConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx    = canvas.getContext('2d');

  /* Match viewport */
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  /* Colour palette: rose, violet, gold, white, mint */
  const COLORS = [
    '#F472B6', '#EC4899', '#C084FC', '#A78BFA',
    '#FCD34D', '#FB923C', '#ffffff', '#34D399',
  ];

  /* Generate particles starting just above the viewport */
  const particles = Array.from({ length: 130 }, () => ({
    x:             Math.random() * canvas.width,
    y:             -20 - Math.random() * 100,
    vx:            (Math.random() - 0.5) * 5,
    vy:            1.8 + Math.random() * 4.5,
    size:          4 + Math.random() * 8,
    color:         COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation:      Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 9,
    gravity:       0.07 + Math.random() * 0.05,
    drag:          0.982,
    shape:         Math.random() > 0.45 ? 'rect' : 'circle',
  }));

  let frame = 0;

  function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;

    particles.forEach(p => {
      if (p.y > canvas.height + 30) return; /* off-screen, skip */
      anyAlive = true;

      /* Physics */
      p.x        += p.vx;
      p.y        += p.vy;
      p.vy       += p.gravity;
      p.vx       *= p.drag;
      p.rotation += p.rotationSpeed;

      /* Draw */
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle  = p.color;
      ctx.globalAlpha = Math.max(0, 1 - (p.y / canvas.height) * 0.6);

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    frame++;

    /* Keep going for at least 60 frames, then stop when all off-screen */
    if (anyAlive || frame < 60) {
      requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(animateConfetti);
}

/* ──────────────────────────────────────────────────────────────────
   10. Sparkle emoji floaters
──────────────────────────────────────────────────────────────────── */
function startSparkles() {
  const container = document.getElementById('sparkles');
  const SYMBOLS   = ['✨', '⭐', '💫', '🌟', '✦', '✧', '★'];
  let   emitted   = 0;
  const MAX       = 22;

  function addSparkle() {
    if (emitted >= MAX) return;
    emitted++;

    const el = document.createElement('span');
    el.className       = 'sparkle';
    el.setAttribute('aria-hidden', 'true');
    el.textContent     = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    el.style.left      = (8 + Math.random() * 84) + 'vw';
    el.style.top       = (35 + Math.random() * 55) + 'vh';
    el.style.fontSize  = (0.75 + Math.random() * 1.3) + 'rem';
    el.style.animationDuration = (1.4 + Math.random() * 0.9) + 's';
    el.style.animationDelay   = (Math.random() * 0.4) + 's';

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  /* Emit two sparkles every 180ms for ~2 seconds */
  const interval = setInterval(() => {
    addSparkle();
    addSparkle();
  }, 180);

  setTimeout(() => clearInterval(interval), 2200);
}

/* ──────────────────────────────────────────────────────────────────
   11. Calendar placeholder
──────────────────────────────────────────────────────────────────── */
function addToCalendar() {
  /* In a real app this would generate a .ics file or open a Google Calendar URL.
     For now, show a friendly message. */
  alert('Details coming soon! Check back for the official date. 📅');
}

/* ──────────────────────────────────────────────────────────────────
   12. Init on DOM ready
──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initStars();
  updateProgress(1); /* Hides dots on screen 1 */
});
