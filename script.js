/* ================================================================
   script.js — Dinner Invitation (v2)
   Flow: 1 intro → 2 food → 3 place → 4 loading → 5 reveal → 6 confetti
   ================================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────────
   1. State
──────────────────────────────────────────────────────────────────── */
const state = {
  currentScreen: 1,
  transitioning: false,
  choices: {
    food:  null,   // 'Burger' | 'Gà rán' | 'Mì Ý' | 'Udon' | 'Gì cũng được'
    place: null,   // clean Vietnamese string set by selectChoice()
  },
};

/*
  Progress dot mapping (3 dots total):
  Screen 2 (food)    → dot 1
  Screen 3 (place)   → dot 2
  Screen 4 (loading) → dot 3  (same step as reveal)
  Screen 5 (reveal)  → dot 3
  Screens 1 & 6      → dots hidden
*/
const SCREEN_TO_DOT = { 2: 1, 3: 2, 4: 3, 5: 3 };

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ──────────────────────────────────────────────────────────────────
   2. Stars background
──────────────────────────────────────────────────────────────────── */
function initStars() {
  const canvas = document.getElementById('stars');
  const ctx    = canvas.getContext('2d');
  let stars    = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.max(60, Math.floor((canvas.width * canvas.height) / 5500));
    stars = Array.from({ length: count }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.3 + 0.2,
      alpha: Math.random() * 0.55 + 0.1,
      speed: Math.random() * 0.0025 + 0.0008,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);

  if (REDUCED_MOTION) {
    /* One static frame */
    stars.forEach(s => {
      ctx.globalAlpha = s.alpha * 0.45;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  } else {
    requestAnimationFrame(draw);
  }
}

/* ──────────────────────────────────────────────────────────────────
   3. Progress dots
──────────────────────────────────────────────────────────────────── */
function updateProgress(screenNumber) {
  const nav  = document.getElementById('progress');
  const dots = document.querySelectorAll('.dot');

  /* Hide on intro (1) and acceptance (6) */
  if (screenNumber <= 1 || screenNumber >= 6) {
    nav.classList.remove('visible');
    return;
  }
  nav.classList.add('visible');

  const activeDot = SCREEN_TO_DOT[screenNumber] ?? 1;
  dots.forEach((dot, i) => {
    const n = i + 1;
    dot.classList.remove('active', 'completed');
    if (n < activeDot)       dot.classList.add('completed');
    else if (n === activeDot) dot.classList.add('active');
  });
}

/* ──────────────────────────────────────────────────────────────────
   4. Screen transitions
──────────────────────────────────────────────────────────────────── */
function goToScreen(nextNum) {
  if (state.transitioning) return;
  const currentEl = document.getElementById(`screen-${state.currentScreen}`);
  const nextEl    = document.getElementById(`screen-${nextNum}`);
  if (!currentEl || !nextEl) return;

  state.transitioning = true;
  currentEl.classList.add('exiting');

  const DURATION = REDUCED_MOTION ? 20 : 380;

  setTimeout(() => {
    currentEl.classList.remove('active', 'exiting');
    nextEl.classList.add('active');
    state.currentScreen = nextNum;
    state.transitioning = false;
    updateProgress(nextNum);

    if (nextNum === 4) startLoading();
    if (nextNum === 5) buildSummary();
  }, DURATION);
}

/* ──────────────────────────────────────────────────────────────────
   5. Choice selection
──────────────────────────────────────────────────────────────────── */
function selectChoice(category, value, btn) {
  state.choices[category] = value;

  const group = btn.closest('.options');
  group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const delay = REDUCED_MOTION ? 50 : 420;
  setTimeout(() => goToScreen(state.currentScreen + 1), delay);
}

/* ──────────────────────────────────────────────────────────────────
   6. Loading animation (screen 4 → screen 5)
──────────────────────────────────────────────────────────────────── */
function startLoading() {
  const fill  = document.getElementById('loader-fill');
  const label = document.getElementById('loader-label');
  const track = document.getElementById('loader-track');

  if (REDUCED_MOTION) {
    fill.style.width = '100%';
    label.textContent = '100%';
    track.setAttribute('aria-valuenow', '100');
    setTimeout(() => goToScreen(5), 400);
    return;
  }

  const DURATION = 2700;
  const start    = performance.now();

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(1, elapsed / DURATION);
    const eased    = 1 - Math.pow(1 - progress, 3);   /* cubic ease-out */
    const pct      = Math.round(eased * 100);

    fill.style.width = pct + '%';
    label.textContent = pct + '%';
    track.setAttribute('aria-valuenow', String(pct));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      setTimeout(() => goToScreen(5), 420);
    }
  }

  requestAnimationFrame(step);
}

/* ──────────────────────────────────────────────────────────────────
   7. Summary sentence (screen 5)
──────────────────────────────────────────────────────────────────── */
function buildSummary() {
  const food  = state.choices.food  ?? 'gì đó ngon';
  const place = state.choices.place ?? 'đi đâu đó vui';

  /* Special case: if the user let the guy decide everything */
  let sentence;
  if (food === 'Gì cũng được' && place === 'để anh lo phần còn lại') {
    sentence = 'Em giao hết cho anh rồi — anh sẽ lo chu đáo, em không cần lo gì nha!';
  } else if (food === 'Gì cũng được') {
    sentence = `Anh sẽ chọn món cho em, rồi hai đứa mình ${place}.`;
  } else if (place === 'để anh lo phần còn lại') {
    sentence = `Ăn ${food} rồi anh sẽ lo phần sau, em cứ thoải mái nha!`;
  } else {
    sentence = `Ăn ${food} rồi ${place} — nghe ổn phết đó em ơi!`;
  }

  document.getElementById('summary-text').textContent = sentence;
}

/* ──────────────────────────────────────────────────────────────────
   8. Acceptance — go to screen 6 + trigger effects
──────────────────────────────────────────────────────────────────── */
function accept() {
  goToScreen(6);

  if (!REDUCED_MOTION) {
    setTimeout(() => {
      launchConfetti();
      startSparkles();
    }, 480);
  }
}

/* ──────────────────────────────────────────────────────────────────
   9. Confetti burst
──────────────────────────────────────────────────────────────────── */
function launchConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = [
    '#F472B6', '#EC4899', '#C084FC', '#A78BFA',
    '#FCD34D', '#FB923C', '#ffffff', '#34D399',
  ];

  const particles = Array.from({ length: 140 }, () => ({
    x:             Math.random() * canvas.width,
    y:             -20 - Math.random() * 120,
    vx:            (Math.random() - 0.5) * 5.5,
    vy:            1.8 + Math.random() * 4.5,
    size:          4 + Math.random() * 9,
    color:         COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation:      Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    gravity:       0.07 + Math.random() * 0.05,
    drag:          0.982,
    shape:         Math.random() > 0.45 ? 'rect' : 'circle',
  }));

  let frame = 0;

  function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;

    particles.forEach(p => {
      if (p.y > canvas.height + 30) return;
      anyAlive = true;

      p.x        += p.vx;
      p.y        += p.vy;
      p.vy       += p.gravity;
      p.vx       *= p.drag;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle   = p.color;
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
    if (anyAlive || frame < 60) {
      requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(animateConfetti);
}

/* ──────────────────────────────────────────────────────────────────
   10. Sparkle floaters
──────────────────────────────────────────────────────────────────── */
function startSparkles() {
  const container = document.getElementById('sparkles');
  const SYMBOLS   = ['✨', '⭐', '💫', '🌟', '✦', '✧', '★', '❤️'];
  let   emitted   = 0;
  const MAX       = 26;

  function addSparkle() {
    if (emitted >= MAX) return;
    emitted++;

    const el = document.createElement('span');
    el.className            = 'sparkle';
    el.setAttribute('aria-hidden', 'true');
    el.textContent          = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    el.style.left           = (6 + Math.random() * 88) + 'vw';
    el.style.top            = (30 + Math.random() * 60) + 'vh';
    el.style.fontSize       = (0.75 + Math.random() * 1.4) + 'rem';
    el.style.animationDuration = (1.4 + Math.random() * 1) + 's';
    el.style.animationDelay    = (Math.random() * 0.5) + 's';

    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  const interval = setInterval(() => {
    addSparkle();
    addSparkle();
  }, 170);

  setTimeout(() => clearInterval(interval), 2500);
}

/* ──────────────────────────────────────────────────────────────────
   11. Init
──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initStars();
  updateProgress(1);
});
