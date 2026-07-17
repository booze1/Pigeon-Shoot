"use strict";

const W = 480;
const H = 270;
const GROUND_Y = 246;
const SAVE_KEY = "pigeon-slash-save-v1";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById("overlay");
const wrap = document.getElementById("wrap");

const IS_TOUCH = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
if (IS_TOUCH) document.body.classList.add("touch");

// ---------------------------------------------------------------- state
const state = {
  started: false,
  money: 0,
  birdsShot: 0,
  shotsFired: 0,
  bestBrace: 0,
  shells: 2,
  maxShells: 2,
  reloading: 0,        // seconds remaining, 0 = not reloading
  shotCooldown: 0,
  aim: { x: W / 2, y: H / 2 },
  shake: 0,
  time: 0,
  spawnTimer: 1,
  birds: [],
  feathers: [],
  popups: [],
  tracers: [],         // {points:[{x,y}], t}
  flash: 0,            // muzzle flash timer
  tapMarker: 0,        // touch: brief crosshair after each tap
  emptyTimer: 0,       // touch: auto-reload countdown when out of shells
  saveTimer: 0,
  dirty: false,
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    state.money = s.money || 0;
    state.birdsShot = s.birdsShot || 0;
    state.shotsFired = s.shotsFired || 0;
    state.bestBrace = s.bestBrace || 0;
    Sfx.muted = !!s.muted;
  } catch (e) { /* corrupt save — start fresh */ }
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money,
      birdsShot: state.birdsShot,
      shotsFired: state.shotsFired,
      bestBrace: state.bestBrace,
      muted: Sfx.muted,
    }));
  } catch (e) { /* storage unavailable */ }
  state.dirty = false;
}

// ---------------------------------------------------------------- birds
function spawnBird() {
  const species = Math.random() < 0.28 ? "wood" : "feral";
  const dir = Math.random() < 0.5 ? 1 : -1;
  const scale = Math.random() < 0.5 ? 2 : 1.5;
  const speed = rand(45, 95) * (scale === 2 ? 1.15 : 1);
  state.birds.push({
    species,
    dir,
    scale,
    x: dir === 1 ? -PIGEON_W * scale : W + PIGEON_W * scale,
    baseY: rand(25, 170),
    y: 0,
    speed,
    bobAmp: rand(2, 7),
    bobFreq: rand(1.5, 3),
    phase: rand(0, Math.PI * 2),
    frameTimer: rand(0, 0.2),
    frame: 0,
    state: "fly",
    vy: 0,
    rot: 0,
    vr: 0,
  });
}

const FLAP_SEQ = [0, 1, 2, 1];

function updateBird(b, dt) {
  if (b.state === "fly") {
    b.x += b.speed * b.dir * dt;
    b.y = b.baseY + Math.sin(state.time * b.bobFreq + b.phase) * b.bobAmp;
    b.frameTimer += dt;
    const frameDur = 1 / 11;
    b.frame = FLAP_SEQ[Math.floor(b.frameTimer / frameDur) % FLAP_SEQ.length];
    return b.x > -30 * b.scale && b.x < W + 30 * b.scale;
  }
  // dead: tumble and fall
  b.vy += 240 * dt;
  b.y += b.vy * dt;
  b.x += b.speed * b.dir * 0.25 * dt;
  b.rot += b.vr * dt;
  if (b.y >= GROUND_Y) {
    Sfx.thud();
    groundPuff(b.x, GROUND_Y);
    return false;
  }
  return true;
}

function drawBird(b) {
  const spr = SPRITES[b.species][b.state === "fly" ? b.frame : 1];
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  if (b.state === "dead") ctx.rotate(b.rot);
  ctx.scale(b.dir === 1 ? b.scale : -b.scale, b.scale);
  ctx.drawImage(spr, -PIGEON_W / 2, -PIGEON_H / 2);
  ctx.restore();
}

function birdHitbox(b) {
  const w = PIGEON_W * b.scale;
  const h = PIGEON_H * b.scale;
  return { x: b.x - w / 2 - 1, y: b.y - h / 2 - 1, w: w + 2, h: h + 2 };
}

// ---------------------------------------------------------------- particles
function burstFeathers(b) {
  const colors = FEATHER_COLORS[b.species];
  const n = randInt(7, 11);
  for (let i = 0; i < n; i++) {
    state.feathers.push({
      x: b.x + rand(-4, 4),
      y: b.y + rand(-4, 4),
      vx: rand(-30, 30),
      vy: rand(-45, 10),
      color: pick(colors),
      life: rand(0.7, 1.6),
      phase: rand(0, Math.PI * 2),
    });
  }
}

function groundPuff(x, y) {
  for (let i = 0; i < 5; i++) {
    state.feathers.push({
      x: x + rand(-5, 5),
      y: y - rand(0, 3),
      vx: rand(-12, 12),
      vy: rand(-24, -8),
      color: pick(["#9c7c40", "#b3924e", "#8d8a55"]),
      life: rand(0.3, 0.6),
      phase: rand(0, Math.PI * 2),
    });
  }
}

function updateFeather(f, dt) {
  f.life -= dt;
  if (f.life <= 0) return false;
  f.vy = Math.min(f.vy + 100 * dt, 26);          // flutter down, not plummet
  f.x += (f.vx + Math.sin(state.time * 6 + f.phase) * 10) * dt;
  f.y += f.vy * dt;
  f.vx *= 1 - 1.4 * dt;
  return f.y < H + 4;
}

function addPopup(x, y, text, color) {
  state.popups.push({ x, y, text, color, t: 0.95 });
}

// ---------------------------------------------------------------- shooting
const PELLET_COUNT = 9;
// Fingers are less precise than a mouse — the cone is a touch wider on phones
const SPREAD_RADIUS = IS_TOUCH ? 16 : 13;

function shoot() {
  if (!state.started || state.reloading > 0 || state.shotCooldown > 0) return;
  if (state.shells <= 0) {
    Sfx.emptyClick();
    startReload();
    return;
  }
  state.shells--;
  state.shotsFired++;
  state.shotCooldown = 0.14;
  state.shake = 3.2;
  state.flash = 0.08;
  state.tapMarker = 0.3;
  state.dirty = true;
  Sfx.shot();
  Haptics.shot();

  // Pellet cloud around the aim point
  const pts = [];
  for (let i = 0; i < PELLET_COUNT; i++) {
    const r = Math.abs(randNorm()) * SPREAD_RADIUS;
    const a = rand(0, Math.PI * 2);
    pts.push({ x: state.aim.x + Math.cos(a) * r, y: state.aim.y + Math.sin(a) * r });
  }
  pts.push({ x: state.aim.x, y: state.aim.y }); // one true pellet
  state.tracers.push({ points: pts, t: 0.09 });

  // Hit detection
  const killed = [];
  for (const b of state.birds) {
    if (b.state !== "fly") continue;
    const hb = birdHitbox(b);
    for (const p of pts) {
      if (p.x >= hb.x && p.x <= hb.x + hb.w && p.y >= hb.y && p.y <= hb.y + hb.h) {
        killed.push(b);
        break;
      }
    }
  }

  for (const b of killed) {
    b.state = "dead";
    b.vy = rand(-30, 10);
    b.vr = rand(-7, 7);
    const value = SPECIES[b.species].value;
    state.money += value;
    state.birdsShot++;
    burstFeathers(b);
    addPopup(b.x, b.y - 10, "+\u00a3" + value, "#ffd45e");
  }

  if (killed.length >= 1) {
    Sfx.coin();
    Haptics.kill();
  }
  if (killed.length >= 2) {
    const bonus = 10 * (killed.length - 1);
    state.money += bonus;
    state.bestBrace = Math.max(state.bestBrace, killed.length);
    addPopup(state.aim.x, state.aim.y - 24, "BRACE! +\u00a3" + bonus, "#ffef9e");
    Sfx.brace();
    Haptics.brace();
  }

  if (state.shells === 0) state.saveTimer = 0; // save soon after emptying the gun
}

function startReload() {
  if (state.reloading > 0 || state.shells === state.maxShells) return;
  state.reloading = 0.9;
  Sfx.reloadStart();
}

// ---------------------------------------------------------------- update
function update(dt) {
  state.time += dt;
  state.shotCooldown = Math.max(0, state.shotCooldown - dt);
  state.flash = Math.max(0, state.flash - dt);
  state.tapMarker = Math.max(0, state.tapMarker - dt);
  state.shake = Math.max(0, state.shake - dt * 14);

  // On touch there's no R key: reload starts by itself shortly after emptying
  if (IS_TOUCH && state.shells === 0 && state.reloading === 0) {
    state.emptyTimer += dt;
    if (state.emptyTimer > 0.55) startReload();
  } else {
    state.emptyTimer = 0;
  }

  if (state.reloading > 0) {
    state.reloading -= dt;
    if (state.reloading <= 0) {
      state.reloading = 0;
      state.shells = state.maxShells;
      Sfx.reloadEnd();
    }
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnBird();
    state.spawnTimer = rand(0.9, 2.2);
    // occasional small flock
    if (Math.random() < 0.18) {
      spawnBird();
      spawnBird();
    }
  }

  state.birds = state.birds.filter((b) => updateBird(b, dt));
  state.feathers = state.feathers.filter((f) => updateFeather(f, dt));
  state.popups = state.popups.filter((p) => (p.t -= dt) > 0);
  state.tracers = state.tracers.filter((t) => (t.t -= dt) > 0);

  // Throttled autosave
  if (state.dirty) {
    state.saveTimer -= dt;
    if (state.saveTimer <= 0) {
      writeSave();
      state.saveTimer = 1.2;
    }
  }
}

// ---------------------------------------------------------------- render
function outlineText(text, x, y, color, font, align = "left") {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#15140e";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function render() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
  }

  ctx.drawImage(Game.bg, 0, 0);

  for (const b of state.birds) drawBird(b);

  // feathers
  for (const f of state.feathers) {
    ctx.globalAlpha = clamp(f.life * 2, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 1);
  }
  ctx.globalAlpha = 1;

  // pellet tracers
  for (const t of state.tracers) {
    ctx.globalAlpha = t.t / 0.09 * 0.55;
    ctx.strokeStyle = "#fff3c8";
    ctx.lineWidth = 1;
    const ox = W / 2 + (state.aim.x - W / 2) * 0.35;
    for (const p of t.points) {
      ctx.beginPath();
      ctx.moveTo(ox, H + 6);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // muzzle flash
  if (state.flash > 0) {
    const fx = W / 2 + (state.aim.x - W / 2) * 0.35;
    const r = 10 + (0.08 - state.flash) * 220;
    const grad = ctx.createRadialGradient(fx, H, 2, fx, H, r);
    grad.addColorStop(0, "rgba(255,240,180,0.9)");
    grad.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(fx - r, H - r, r * 2, r);
  }

  // popups
  for (const p of state.popups) {
    ctx.globalAlpha = clamp(p.t * 2, 0, 1);
    const rise = (0.95 - p.t) * 20;
    outlineText(p.text, Math.round(p.x), Math.round(p.y - rise), p.color,
      "bold 9px 'Courier New', monospace", "center");
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // end screen shake — HUD stays steady

  renderHUD();
  renderCrosshair();
}

function renderHUD() {
  // Money
  ctx.fillStyle = "#15140e";
  ctx.fillRect(6, 6, 74, 14);
  ctx.fillStyle = "#d9a441";
  ctx.fillRect(9, 9, 8, 8);
  ctx.fillStyle = "#f4d47c";
  ctx.fillRect(10, 10, 6, 6);
  ctx.fillStyle = "#a87f2c";
  ctx.fillRect(12, 11, 2, 4);
  outlineText("\u00a3" + state.money, 21, 9, "#ffd45e", "bold 10px 'Courier New', monospace");

  // Shells
  for (let i = 0; i < state.maxShells; i++) {
    const x = W - 14 - i * 9;
    const spent = i >= state.shells;
    ctx.fillStyle = "#15140e";
    ctx.fillRect(x - 1, 5, 8, 17);
    ctx.fillStyle = spent ? "#555a63" : "#c23b2e";
    ctx.fillRect(x, 6, 6, 11);
    ctx.fillStyle = spent ? "#4a4e56" : "#d9a441";
    ctx.fillRect(x, 17, 6, 4);
  }
  // Reload progress bar
  if (state.reloading > 0) {
    const frac = 1 - state.reloading / 0.9;
    ctx.fillStyle = "#15140e";
    ctx.fillRect(W - 34, 24, 28, 5);
    ctx.fillStyle = "#ffd45e";
    ctx.fillRect(W - 33, 25, Math.round(26 * frac), 3);
  }

  // Session stats, bottom-right
  ctx.globalAlpha = 0.75;
  outlineText("BIRDS " + state.birdsShot, W - 6, H - 12, "#e8e2cd",
    "8px 'Courier New', monospace", "right");
  ctx.globalAlpha = 1;

  if (Sfx.muted) {
    ctx.globalAlpha = 0.75;
    outlineText("MUTED", 6, H - 12, "#e8e2cd", "8px 'Courier New', monospace");
    ctx.globalAlpha = 1;
  }
}

function renderCrosshair() {
  // On touch screens the crosshair only flashes where you tapped
  if (IS_TOUCH && state.tapMarker <= 0 && state.shells > 0) return;
  const { x, y } = state.aim;
  ctx.strokeStyle = "#15140e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = state.shells > 0 ? "#f2f2ea" : "#e0574a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = state.shells > 0 ? "#f2f2ea" : "#e0574a";
  ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  // ticks
  ctx.fillRect(x - 9, y - 0.5, 3, 1);
  ctx.fillRect(x + 6, y - 0.5, 3, 1);
  ctx.fillRect(x - 0.5, y - 9, 1, 3);
  ctx.fillRect(x - 0.5, y + 6, 1, 3);

  if (state.shells === 0 && state.reloading === 0 && Math.floor(state.time * 2) % 2 === 0) {
    outlineText(IS_TOUCH ? "RELOADING..." : "RELOAD (R)", x, y + 12,
      "#e0574a", "bold 8px 'Courier New', monospace", "center");
  }
}

// ---------------------------------------------------------------- boot
const Game = { bg: null };

function resize() {
  // Integer scaling for crisp pixels where there's room; fractional
  // fill-the-screen scaling on small (phone) displays.
  let scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  scale = scale >= 2 ? Math.floor(scale) : Math.max(scale, 0.5);
  canvas.style.width = W * scale + "px";
  canvas.style.height = H * scale + "px";
  overlay.style.width = W * scale + "px";
  overlay.style.height = H * scale + "px";
  const fs = Math.max(10, 7 * scale);
  overlay.style.fontSize = fs + "px";
  overlay.querySelector("h1").style.fontSize = fs * 2.4 + "px";
}

function toCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((e.clientX - rect.left) / rect.width * W, 0, W),
    y: clamp((e.clientY - rect.top) / rect.height * H, 0, H),
  };
}

function start() {
  if (state.started) return;
  Sfx.init();
  Haptics.init();
  if (Sfx.ctx && Sfx.ctx.state === "suspended") Sfx.ctx.resume();
  state.started = true;
  overlay.style.display = "none";
}

canvas.addEventListener("mousemove", (e) => { state.aim = toCanvasCoords(e); });
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0 && !IS_TOUCH) shoot();
});
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (!state.started) { start(); return; }
  // iOS suspends audio when the tab is backgrounded — wake it on touch
  if (Sfx.ctx && Sfx.ctx.state === "suspended") Sfx.ctx.resume();
  state.aim = toCanvasCoords(e.changedTouches[0]);
  shoot();
}, { passive: false });
canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
overlay.addEventListener("click", start);
overlay.addEventListener("touchend", (e) => { e.preventDefault(); start(); }, { passive: false });
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "r") startReload();
  if (k === "m") {
    Sfx.muted = !Sfx.muted;
    state.dirty = true;
    state.saveTimer = 0;
  }
});
window.addEventListener("resize", resize);
window.addEventListener("beforeunload", writeSave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) writeSave();
});

loadSave();
resize();
Game.bg = buildHomeField(W, H);

let lastT = performance.now();
function frame(now) {
  const dt = clamp((now - lastT) / 1000, 0, 0.05);
  lastT = now;
  if (state.started) update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ?autostart=1 skips the title overlay (used for automated screenshots)
const urlParams = new URLSearchParams(location.search);
if (urlParams.has("autostart")) start();
// ?sim=N synchronously fast-forwards N seconds (deterministic screenshots/tests)
if (urlParams.has("sim")) {
  start();
  const secs = parseFloat(urlParams.get("sim")) || 5;
  for (let i = 0; i < secs * 60; i++) update(1 / 60);
  // ?testshot=1 then aims at the first flying bird and fires
  if (urlParams.has("testshot")) {
    const target = state.birds.find((b) => b.state === "fly");
    if (target) {
      state.aim = { x: target.x, y: target.y };
      shoot();
      for (let i = 0; i < 12; i++) update(1 / 60);
    }
  }
}
// ?debug=1 mirrors sim state into the tab title (used for automated checks)
if (urlParams.has("debug")) {
  setInterval(() => {
    document.title =
      `t=${state.time.toFixed(1)} birds=${state.birds.length} shot=${state.birdsShot}`;
  }, 250);
}
