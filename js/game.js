"use strict";

const W = 480;
const H = 270;
const GROUND_Y = 246;
const SAVE_KEY = "pigeon-slash-save-v1";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById("overlay");

const IS_TOUCH = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
if (IS_TOUCH) document.body.classList.add("touch");

// ---------------------------------------------------------------- state
const state = {
  started: false,
  // progression
  money: 0,
  xp: 0,
  level: 1,
  combo: 0,
  gunsOwned: ["sbs"],
  gunId: "sbs",
  sitesOwned: ["home"],
  siteId: "home",
  // stats
  birdsShot: 0,
  shotsFired: 0,
  bestBrace: 0,
  fetched: 0,
  // moment to moment
  shells: 2,
  reloading: 0,
  shotCooldown: 0,
  aim: { x: W / 2, y: H / 2 },
  shake: 0,
  time: 0,
  spawnTimer: 1,
  birds: [],
  corpses: [],       // downed birds on the ground, waiting for the dog
  feathers: [],
  popups: [],
  tracers: [],
  banner: null,      // {text, sub, t} big center announcement
  wind: 0,
  windTarget: 0,
  windTimer: 0,
  flash: 0,
  tapMarker: 0,
  emptyTimer: 0,
  saveTimer: 0,
  dirty: false,
  // business layer (timestamp-based; survives the game being closed)
  larder: {},          // speciesId -> carcass count
  contractOwned: false,
  contractNextAt: 0,
  taxidermyOwned: false,
  mounting: null,
  mountDoneAt: 0,
  mountReady: null,
  trophies: [],
  order: null,
  nextOrderAt: 0,
  awayReport: null,    // lines shown on return after time away
  // milestone 4
  perkPoints: 0,
  perks: { marksman: 0, poacher: 0, estate: 0 },
  killsBySpecies: {},
  goldenTimer: 0,      // seconds at Curlew Barn until the legend appears
  goldenFx: 0,         // golden light sweep timer
  timeScale: 1,        // slow-mo during the legend's entrance
};

const GUN = () => GUNS[state.gunId];
const SITE = () => SITES[state.siteId];
const spreadRadius = () =>
  GUN().spread * (1 - 0.04 * state.perks.marksman) + (IS_TOUCH ? 3 : 0);
// A curlew is fair game only at Curlew Barn — the licensed exception
const isProtected = (id) =>
  SPECIES[id].rarity === "protected" && !(id === "curlew" && SITE().curlewLegal);
// Levels are meant to be earned: level 2 takes a proper session's
// shooting, and each level costs ~35% more than the last.
const xpNeeded = (level) => Math.round(80 * Math.pow(1.35, level - 1));
const comboMult = () => Math.min(1 + state.combo * 0.15, 3);

// ---------------------------------------------------------------- saves
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    state.money = s.money || 0;
    state.xp = s.xp || 0;
    state.level = s.level || 1;
    state.birdsShot = s.birdsShot || 0;
    state.shotsFired = s.shotsFired || 0;
    state.bestBrace = s.bestBrace || 0;
    state.fetched = s.fetched || 0;
    state.gunsOwned = Array.isArray(s.gunsOwned) && s.gunsOwned.length ? s.gunsOwned : ["sbs"];
    state.gunId = GUNS[s.gunId] ? s.gunId : "sbs";
    state.sitesOwned = Array.isArray(s.sitesOwned) && s.sitesOwned.length ? s.sitesOwned : ["home"];
    state.siteId = SITES[s.siteId] ? s.siteId : "home";
    Sfx.muted = !!s.muted;
    // business layer
    state.larder = s.larder && typeof s.larder === "object" ? s.larder : {};
    for (const id in state.larder) if (!SPECIES[id]) delete state.larder[id];
    state.contractOwned = !!s.contractOwned;
    state.contractNextAt = s.contractNextAt || 0;
    state.taxidermyOwned = !!s.taxidermyOwned;
    state.mounting = SPECIES[s.mounting] ? s.mounting : null;
    state.mountDoneAt = s.mountDoneAt || 0;
    state.mountReady = SPECIES[s.mountReady] ? s.mountReady : null;
    state.trophies = Array.isArray(s.trophies) ? s.trophies.filter((t) => SPECIES[t]) : [];
    state.order = s.order && Array.isArray(s.order.items) ? s.order : null;
    state.nextOrderAt = s.nextOrderAt || 0;
    state.perkPoints = s.perkPoints || 0;
    if (s.perks && typeof s.perks === "object") {
      for (const k of ["marksman", "poacher", "estate"]) {
        state.perks[k] = clamp(s.perks[k] || 0, 0, 5);
      }
    }
    state.killsBySpecies =
      s.killsBySpecies && typeof s.killsBySpecies === "object" ? s.killsBySpecies : {};
    // Catch up on everything that happened while the game was closed
    const lastSeen = s.lastSeen || Date.now();
    const away = Math.min(Date.now() - lastSeen, Biz.MAX_OFFLINE);
    const moneyBefore = state.money;
    const events = Biz.process(lastSeen + away);
    if (away > 90e3) {
      const lines = events.filter((ev) => ev.kind !== "orderNew").map((ev) => ev.text);
      const gained = state.money - moneyBefore;
      if (lines.length || gained > 0) {
        state.awayReport = {
          minutes: Math.round(away / 60e3),
          gained,
          lines,
        };
      }
    }
  } catch (e) { /* corrupt save — start fresh */ }
  if (!state.gunsOwned.includes(state.gunId)) state.gunId = state.gunsOwned[0];
  if (!state.sitesOwned.includes(state.siteId)) state.siteId = state.sitesOwned[0];
  state.shells = GUN().shells;
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money,
      xp: state.xp,
      level: state.level,
      birdsShot: state.birdsShot,
      shotsFired: state.shotsFired,
      bestBrace: state.bestBrace,
      fetched: state.fetched,
      gunsOwned: state.gunsOwned,
      gunId: state.gunId,
      sitesOwned: state.sitesOwned,
      siteId: state.siteId,
      muted: Sfx.muted,
      larder: state.larder,
      contractOwned: state.contractOwned,
      contractNextAt: state.contractNextAt,
      taxidermyOwned: state.taxidermyOwned,
      mounting: state.mounting,
      mountDoneAt: state.mountDoneAt,
      mountReady: state.mountReady,
      trophies: state.trophies,
      order: state.order,
      nextOrderAt: state.nextOrderAt,
      perkPoints: state.perkPoints,
      perks: state.perks,
      killsBySpecies: state.killsBySpecies,
      lastSeen: Date.now(),
    }));
  } catch (e) { /* storage unavailable */ }
  state.dirty = false;
}

// ---------------------------------------------------------------- equip / travel
function equipGun(id) {
  state.gunId = id;
  state.reloading = 0;
  state.shells = GUN().shells;
  state.dirty = true;
  state.saveTimer = 0;
}

function travelTo(id) {
  state.siteId = id;
  state.birds = [];
  state.corpses = [];
  state.feathers = [];
  state.tracers = [];
  state.spawnTimer = 0.6;
  state.wind = 0;
  state.windTarget = SITE().wind ? rand(-8, 8) : 0;
  Dog.reset();
  Game.bg = BG_BUILDERS[SITE().bg](W, H);
  state.banner = { text: SITE().name.toUpperCase(), sub: SITE().desc, t: 2.2 };
  state.goldenTimer = id === "barn" ? rand(50, 100) : 0;
  state.timeScale = 1;
  state.goldenFx = 0;
  state.dirty = true;
  state.saveTimer = 0;
}

// ---------------------------------------------------------------- birds
function spawnBird(forceSpecies, forceY, forceDir) {
  const speciesId = forceSpecies || pickSpecies();
  const sp = SPECIES[speciesId];
  const dir = forceDir !== undefined ? forceDir : (Math.random() < 0.5 ? 1 : -1);
  const scale = rand(sp.scales[0], sp.scales[1]);
  const shapeW = sp.shape.w;
  state.birds.push({
    species: speciesId,
    dir,
    scale,
    x: dir === 1 ? -shapeW * scale : W + shapeW * scale,
    baseY: forceY !== undefined ? forceY : rand(sp.band[0], sp.band[1]),
    y: 0,
    speed: rand(sp.speed[0], sp.speed[1]),
    bobAmp: sp.rarity === "protected" ? rand(5, 10) : rand(2, 7),
    bobFreq: rand(1.5, 3),
    phase: rand(0, Math.PI * 2),
    frameTimer: rand(0, 0.2),
    frame: 0,
    state: "fly",
    vy: 0,
    rot: 0,
    vr: 0,
    jinkT: rand(0.2, 0.7),
    jinkV: 0,
  });
}

// Poacher's Eye boosts the odds of rare and epic birds turning up
function pickSpecies() {
  const boost = 1 + 0.08 * state.perks.poacher;
  const pairs = SITE().spawn.map(([id, w]) => {
    const r = SPECIES[id].rarity;
    return [id, r === "rare" || r === "epic" ? w * boost : w];
  });
  return weightedPick(pairs);
}

function spawnWave() {
  const id = pickSpecies();
  const sp = SPECIES[id];
  spawnBird(id);
  // Ducks fly in lines; pigeons sometimes come in pairs
  if (sp.shape === SHAPE_DUCK && Math.random() < 0.45) {
    const lead = state.birds[state.birds.length - 1];
    for (let i = 1; i <= randInt(1, 2); i++) {
      spawnBird(id, clamp(lead.baseY + i * 11, 25, 190), lead.dir);
      const b = state.birds[state.birds.length - 1];
      b.x -= lead.dir * i * 22;
      b.speed = lead.speed;
    }
  } else if (sp.shape === SHAPE_PIGEON && Math.random() < 0.16) {
    spawnBird(id);
  }
}

const FLAP_SEQ = [0, 1, 2, 1];

function updateBird(b, dt) {
  if (b.state === "fly") {
    b.x += b.speed * b.dir * dt;
    // Epics jink: their flight line lurches unpredictably
    if (SPECIES[b.species].jink) {
      b.jinkT -= dt;
      if (b.jinkT <= 0) {
        b.jinkT = rand(0.25, 0.7);
        b.jinkV = rand(-55, 55);
      }
      b.baseY = clamp(b.baseY + b.jinkV * dt, 30, 200);
    }
    b.y = b.baseY + Math.sin(state.time * b.bobFreq + b.phase) * b.bobAmp;
    b.frameTimer += dt;
    const frameDur = 1 / 11;
    b.frame = FLAP_SEQ[Math.floor(b.frameTimer / frameDur) % FLAP_SEQ.length];
    if (b.x <= -40 * b.scale || b.x >= W + 40 * b.scale) {
      if (b.species === "goldcurlew") {
        addPopup(W / 2, 60, "The Golden Curlew escapes...", "#c9b98a");
      }
      return false;
    }
    return true;
  }
  // dead: tumble and fall
  b.vy += 240 * dt;
  b.y += b.vy * dt;
  b.x += b.speed * b.dir * 0.25 * dt;
  b.rot += b.vr * dt;
  if (b.y >= GROUND_Y) {
    Sfx.thud();
    groundPuff(b.x, GROUND_Y);
    if (!isProtected(b.species)) {
      state.corpses.push({ x: clamp(b.x, 10, W - 10), species: b.species, scale: b.scale, t: 25 });
    }
    return false;
  }
  return true;
}

function drawBird(b) {
  const sp = SPECIES[b.species];
  const spr = SPRITES[b.species][b.state === "fly" ? b.frame : 1];
  // The legend glows
  if (b.species === "goldcurlew") {
    const grad = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 26);
    grad.addColorStop(0, "rgba(255,220,110,0.55)");
    grad.addColorStop(1, "rgba(255,220,110,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(b.x - 26, b.y - 26, 52, 52);
    // drifting glints
    for (let i = 0; i < 3; i++) {
      const gx = b.x - b.dir * (10 + i * 9) + Math.sin(state.time * 7 + i * 2) * 4;
      const gy = b.y + Math.cos(state.time * 5 + i * 3) * 6;
      ctx.fillStyle = i % 2 ? "#ffe9a0" : "#fff6d8";
      ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1);
    }
  }
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  if (b.state === "dead") ctx.rotate(b.rot);
  ctx.scale(b.dir === 1 ? b.scale : -b.scale, b.scale);
  ctx.drawImage(spr, -sp.shape.w / 2, -sp.shape.h / 2);
  ctx.restore();
  // Protected birds carry a blinking warning so you learn to hold fire
  if (b.state === "fly" && isProtected(b.species) &&
      Math.floor(state.time * 3) % 2 === 0) {
    outlineText("!", Math.round(b.x), Math.round(b.y - sp.shape.h * b.scale / 2 - 10),
      "#e0574a", "bold 9px 'Courier New', monospace", "center");
  }
}

function birdHitbox(b) {
  const sp = SPECIES[b.species];
  const w = sp.shape.w * b.scale;
  const h = sp.shape.h * b.scale;
  return { x: b.x - w / 2 - 1, y: b.y - h / 2 - 1, w: w + 2, h: h + 2 };
}

function drawCorpse(cp) {
  const sp = SPECIES[cp.species];
  if (cp.t < 3 && Math.floor(cp.t * 6) % 2 === 0) return; // blink before fading
  ctx.save();
  ctx.translate(Math.round(cp.x), GROUND_Y + 4);
  ctx.rotate(1.9);
  ctx.scale(cp.scale * 0.9, cp.scale * 0.9);
  ctx.drawImage(SPRITES[cp.species][1], -sp.shape.w / 2, -sp.shape.h / 2);
  ctx.restore();
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
  f.vy = Math.min(f.vy + 100 * dt, 26);
  f.x += (f.vx + Math.sin(state.time * 6 + f.phase) * 10) * dt;
  f.y += f.vy * dt;
  f.vx *= 1 - 1.4 * dt;
  return f.y < H + 4;
}

function addPopup(x, y, text, color) {
  state.popups.push({ x: clamp(x, 24, W - 24), y, text, color, t: 0.95 });
}

// ---------------------------------------------------------------- XP
function grantXp(amount) {
  state.xp += amount;
  let leveled = false;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level++;
    leveled = true;
  }
  if (leveled) {
    state.perkPoints++;
    const unlocks = [];
    for (const id of GUN_ORDER) {
      if (GUNS[id].lvl === state.level) unlocks.push(GUNS[id].name);
    }
    for (const id of SITE_ORDER) {
      if (SITES[id].lvl === state.level) unlocks.push(SITES[id].name);
    }
    state.banner = {
      text: "LEVEL " + state.level + "!",
      sub: (unlocks.length ? "Now available: " + unlocks.join(", ") + "  ·  " : "") +
        "+1 perk point (ESTATE > PERKS)",
      t: 2.6,
    };
    Sfx.fanfare();
    Haptics.brace();
    // A level-up tops the gun off as a little treat
    state.shells = GUN().shells;
    state.reloading = 0;
  }
}

// ---------------------------------------------------------------- shooting
function shoot() {
  if (!state.started || state.reloading > 0 || state.shotCooldown > 0) return;
  if (state.shells <= 0) {
    Sfx.emptyClick();
    startReload();
    return;
  }
  const gun = GUN();
  state.shells--;
  state.shotsFired++;
  state.shotCooldown = gun.cooldown;
  state.shake = 3.2;
  state.flash = 0.08;
  state.tapMarker = 0.3;
  state.dirty = true;
  Sfx.shot();
  Haptics.shot();

  // Pellet cloud, drifted by wind
  const pts = [];
  const radius = spreadRadius();
  for (let i = 0; i < gun.pellets; i++) {
    const r = Math.abs(randNorm()) * radius;
    const a = rand(0, Math.PI * 2);
    pts.push({
      x: state.aim.x + Math.cos(a) * r + state.wind,
      y: state.aim.y + Math.sin(a) * r,
    });
  }
  pts.push({ x: state.aim.x + state.wind, y: state.aim.y });
  state.tracers.push({ points: pts, t: 0.09 });

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

  let paidKills = 0;
  for (const b of killed) {
    b.state = "dead";
    b.vy = rand(-30, 10);
    b.vr = rand(-7, 7);
    burstFeathers(b);
    const sp = SPECIES[b.species];
    if (isProtected(b.species)) {
      const fine = sp.fine;
      state.money = Math.max(0, state.money - fine);
      state.combo = 0;
      addPopup(b.x, b.y - 10, sp.name.toUpperCase() + "! -\u00a3" + fine, "#e0574a");
      Sfx.penalty();
      Haptics.brace();
      continue;
    }
    paidKills++;
    state.combo++;
    state.birdsShot++;
    state.killsBySpecies[b.species] = (state.killsBySpecies[b.species] || 0) + 1;
    if (b.species === "goldcurlew") {
      state.banner = {
        text: "THE GOLDEN CURLEW!",
        sub: "The legend is yours — guard it in the larder",
        t: 3,
      };
      state.timeScale = 1;
      Sfx.fanfare();
      Haptics.brace();
    }
    const mult = comboMult();
    // A tip in the field; the carcass goes to the larder where the real
    // money is (sell, contract, orders, taxidermy).
    const cash = Math.max(1, Math.round(sp.value * 0.4 * mult * Biz.buffMult()));
    state.money += cash;
    Biz.addToLarder(b.species);
    addPopup(b.x, b.y - 10, "+\u00a3" + cash, RARITY_COLORS[sp.rarity]);
    grantXp(Math.round(sp.xp * mult));
  }

  if (paidKills >= 1) Sfx.coin();
  if (paidKills >= 1) Haptics.kill();
  if (paidKills >= 2) {
    const bonus = 10 * (paidKills - 1);
    state.money += bonus;
    state.bestBrace = Math.max(state.bestBrace, paidKills);
    addPopup(state.aim.x, state.aim.y - 24, "BRACE! +\u00a3" + bonus, "#ffef9e");
    Sfx.brace();
    Haptics.brace();
    grantXp(6 * (paidKills - 1));
  }
  if (killed.length === 0) {
    state.combo = Math.max(0, state.combo - 2); // misses bleed the combo
  }

  if (state.shells === 0) state.saveTimer = 0;
}

function startReload() {
  if (state.reloading > 0 || state.shells === GUN().shells) return;
  state.reloading = GUN().reload;
  Sfx.reloadStart();
}

// ---------------------------------------------------------------- the legend
function launchGoldenCurlew() {
  spawnBird("goldcurlew");
  state.goldenFx = 1.8;
  state.timeScale = 0.35;        // the world holds its breath
  Sfx.curlew();
  Haptics.kill();
  state.banner = { text: "", sub: "...a golden call on the wind...", t: 1.6 };
}

// ---------------------------------------------------------------- update
function update(dt) {
  UI.update(dt);
  if (state.banner && (state.banner.t -= dt) <= 0) state.banner = null;

  // The business clock never pauses
  for (const ev of Biz.process(Date.now())) {
    if (ev.kind === "contract") {
      addPopup(208, 34, ev.text, "#9fe08a");
    } else if (ev.kind === "mount") {
      state.banner = { text: "MOUNT READY", sub: ev.text + " — see ESTATE", t: 2.4 };
      Sfx.fanfare();
    } else if (ev.kind === "orderNew") {
      state.banner = { text: "NEW ORDER", sub: ev.text, t: 2.4 };
      Sfx.click();
    } else if (ev.kind === "orderExpired") {
      addPopup(208, 34, ev.text, "#e0574a");
    }
  }

  if (UI.open) return; // world pauses while a menu is open

  state.time += dt;
  state.shotCooldown = Math.max(0, state.shotCooldown - dt);
  state.flash = Math.max(0, state.flash - dt);
  state.tapMarker = Math.max(0, state.tapMarker - dt);
  state.shake = Math.max(0, state.shake - dt * 14);
  state.goldenFx = Math.max(0, state.goldenFx - dt);
  // Slow-mo eases back to full speed
  if (state.timeScale < 1) {
    state.timeScale = Math.min(1, state.timeScale + dt * 0.45);
  }

  // The Golden Curlew only ever visits Curlew Barn
  if (state.siteId === "barn") {
    state.goldenTimer -= dt;
    if (state.goldenTimer <= 0) {
      state.goldenTimer = rand(75, 150);
      launchGoldenCurlew();
    }
  }

  // Wind drifts slowly toward a wandering target
  if (SITE().wind) {
    state.windTimer -= dt;
    if (state.windTimer <= 0) {
      state.windTimer = rand(4, 8);
      state.windTarget = rand(-9, 9);
    }
    state.wind += (state.windTarget - state.wind) * dt * 0.6;
  } else {
    state.wind = 0;
  }

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
      state.shells = GUN().shells;
      Sfx.reloadEnd();
    }
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnWave();
    const [a, b] = SITE().interval;
    state.spawnTimer = rand(a, b);
  }

  state.birds = state.birds.filter((b) => updateBird(b, dt));
  state.corpses = state.corpses.filter((cp) => (cp.t -= dt) > 0);
  state.feathers = state.feathers.filter((f) => updateFeather(f, dt));
  state.popups = state.popups.filter((p) => (p.t -= dt) > 0);
  state.tracers = state.tracers.filter((t) => (t.t -= dt) > 0);

  Dog.update(dt, state.corpses, (x) => {
    state.money += 1;
    state.fetched++;
    state.dirty = true;
    addPopup(x, GROUND_Y - 12, "Fetched +\u00a31", "#cfc9b4");
    Sfx.bark();
  });

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

  for (const cp of state.corpses) drawCorpse(cp);
  Dog.draw(ctx);
  for (const b of state.birds) drawBird(b);

  for (const f of state.feathers) {
    ctx.globalAlpha = clamp(f.life * 2, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 1);
  }
  ctx.globalAlpha = 1;

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

  if (state.flash > 0) {
    const fx = W / 2 + (state.aim.x - W / 2) * 0.35;
    const r = 10 + (0.08 - state.flash) * 220;
    const grad = ctx.createRadialGradient(fx, H, 2, fx, H, r);
    grad.addColorStop(0, "rgba(255,240,180,0.9)");
    grad.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(fx - r, H - r, r * 2, r);
  }

  for (const p of state.popups) {
    ctx.globalAlpha = clamp(p.t * 2, 0, 1);
    const rise = (0.95 - p.t) * 20;
    outlineText(p.text, Math.round(p.x), Math.round(p.y - rise), p.color,
      "bold 9px 'Courier New', monospace", "center");
    ctx.globalAlpha = 1;
  }

  // Golden light sweep announcing the legend
  if (state.goldenFx > 0) {
    const a = clamp(state.goldenFx / 1.8, 0, 1);
    ctx.fillStyle = "rgba(255,200,90," + (0.18 * a).toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);
    const sweepX = (1 - state.goldenFx / 1.8) * (W + 240) - 120;
    const grad = ctx.createLinearGradient(sweepX - 60, 0, sweepX + 60, 0);
    grad.addColorStop(0, "rgba(255,236,170,0)");
    grad.addColorStop(0.5, "rgba(255,236,170," + (0.28 * a).toFixed(3) + ")");
    grad.addColorStop(1, "rgba(255,236,170,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(sweepX - 60, 0, 120, H);
  }

  ctx.restore(); // end screen shake

  renderHUD();
  if (state.banner) renderBanner();
  UI.drawChips(ctx);
  if (state.awayReport) renderAwayReport();
  renderCrosshair();
}

function renderAwayReport() {
  const r = state.awayReport;
  const pw = 320, ph = 90 + r.lines.length * 14;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  ctx.fillStyle = "rgba(8,10,14,0.7)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#191c24";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "#ffd45e";
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  outlineText("WHILE YOU WERE AWAY", W / 2, py + 10, "#ffd45e",
    "bold 11px 'Courier New', monospace", "center");
  outlineText(r.minutes >= 60
    ? Math.floor(r.minutes / 60) + "h " + (r.minutes % 60) + "m on the estate"
    : r.minutes + " minutes on the estate",
    W / 2, py + 26, "#8d94a5", "8px 'Courier New', monospace", "center");
  let y = py + 44;
  for (const line of r.lines) {
    outlineText(line, W / 2, y, "#e8e2cd", "8px 'Courier New', monospace", "center");
    y += 14;
  }
  if (r.gained > 0) {
    outlineText("+\u00a3" + r.gained, W / 2, y + 4, "#9fe08a",
      "bold 12px 'Courier New', monospace", "center");
  }
  outlineText("— tap to continue —", W / 2, py + ph - 14, "#ffd45e",
    "bold 8px 'Courier New', monospace", "center");
}

function renderBanner() {
  const t = state.banner.t;
  ctx.globalAlpha = clamp(t * 1.5, 0, 1);
  outlineText(state.banner.text, W / 2, 78, "#ffd45e",
    "bold 18px 'Courier New', monospace", "center");
  if (state.banner.sub) {
    outlineText(state.banner.sub, W / 2, 100, "#f0ead2",
      "bold 9px 'Courier New', monospace", "center");
  }
  ctx.globalAlpha = 1;
}

function renderHUD() {
  // Money
  ctx.fillStyle = "#15140e";
  ctx.fillRect(6, 6, 84, 14);
  ctx.fillStyle = "#d9a441";
  ctx.fillRect(9, 9, 8, 8);
  ctx.fillStyle = "#f4d47c";
  ctx.fillRect(10, 10, 6, 6);
  ctx.fillStyle = "#a87f2c";
  ctx.fillRect(12, 11, 2, 4);
  outlineText("\u00a3" + state.money, 21, 9, "#ffd45e", "bold 10px 'Courier New', monospace");

  // Combo, under the money
  if (state.combo > 1) {
    outlineText("COMBO ×" + comboMult().toFixed(1), 6, 24, "#ffef9e",
      "bold 8px 'Courier New', monospace");
  }

  // Wind, top bar right of the chips
  if (SITE().wind && Math.abs(state.wind) > 0.8) {
    const wx = 300, wy = 8;
    outlineText("WIND", wx, wy, "#cfd8e8", "bold 8px 'Courier New', monospace", "center");
    const len = clamp(Math.abs(state.wind) * 2.4, 4, 24);
    const dir = Math.sign(state.wind);
    ctx.strokeStyle = "#15140e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx - dir * len / 2, wy + 14);
    ctx.lineTo(wx + dir * len / 2, wy + 14);
    ctx.stroke();
    ctx.strokeStyle = "#dfe8f5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx - dir * len / 2, wy + 14);
    ctx.lineTo(wx + dir * len / 2, wy + 14);
    ctx.moveTo(wx + dir * (len / 2 - 3), wy + 11);
    ctx.lineTo(wx + dir * len / 2, wy + 14);
    ctx.lineTo(wx + dir * (len / 2 - 3), wy + 17);
    ctx.stroke();
  }

  // Shells
  const gun = GUN();
  for (let i = 0; i < gun.shells; i++) {
    const x = W - 14 - i * 9;
    const spent = i >= state.shells;
    ctx.fillStyle = "#15140e";
    ctx.fillRect(x - 1, 5, 8, 17);
    ctx.fillStyle = spent ? "#555a63" : "#c23b2e";
    ctx.fillRect(x, 6, 6, 11);
    ctx.fillStyle = spent ? "#4a4e56" : "#d9a441";
    ctx.fillRect(x, 17, 6, 4);
  }
  if (state.reloading > 0) {
    const frac = 1 - state.reloading / gun.reload;
    ctx.fillStyle = "#15140e";
    ctx.fillRect(W - 34, 24, 28, 5);
    ctx.fillStyle = "#ffd45e";
    ctx.fillRect(W - 33, 25, Math.round(26 * frac), 3);
  }

  // XP bar along the bottom
  ctx.fillStyle = "#15140e";
  ctx.fillRect(6, H - 8, W - 12, 5);
  ctx.fillStyle = "#8a63c9";
  ctx.fillRect(7, H - 7, Math.round((W - 14) * clamp(state.xp / xpNeeded(state.level), 0, 1)), 3);
  outlineText("LVL " + state.level, 6, H - 19, "#c9aef5",
    "bold 8px 'Courier New', monospace");

  ctx.globalAlpha = 0.75;
  outlineText("BIRDS " + state.birdsShot, W - 6, H - 19, "#e8e2cd",
    "8px 'Courier New', monospace", "right");
  ctx.globalAlpha = 1;

  if (Sfx.muted) {
    ctx.globalAlpha = 0.75;
    outlineText("MUTED", 188, 8, "#e8e2cd", "8px 'Courier New', monospace");
    ctx.globalAlpha = 1;
  }
}

function renderCrosshair() {
  if (UI.open) return;
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
  state.banner = { text: SITE().name.toUpperCase(), sub: SITE().desc, t: 2.2 };
}

function pointerDown(x, y) {
  if (state.awayReport) {
    state.awayReport = null;
    Sfx.click();
    return;
  }
  if (UI.pointer(x, y)) { return; }
  shoot();
}

canvas.addEventListener("mousemove", (e) => { state.aim = toCanvasCoords(e); });
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0 && !IS_TOUCH) {
    const p = toCanvasCoords(e);
    state.aim = p;
    pointerDown(p.x, p.y);
  }
});
// In menus, taps resolve on touch-end so a swipe can scroll the list
// without accidentally buying anything. In the field, shots stay instant.
let menuTouch = null;
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (!state.started) { start(); return; }
  if (Sfx.ctx && Sfx.ctx.state === "suspended") Sfx.ctx.resume();
  const p = toCanvasCoords(e.changedTouches[0]);
  if (state.awayReport) {
    state.awayReport = null;
    Sfx.click();
    return;
  }
  if (UI.open) {
    menuTouch = { x: p.x, y: p.y, lastY: p.y, moved: 0 };
    return;
  }
  state.aim = p;
  pointerDown(p.x, p.y);
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (UI.open && menuTouch) {
    const p = toCanvasCoords(e.changedTouches[0]);
    UI.scrollBy(menuTouch.lastY - p.y);
    menuTouch.moved += Math.abs(p.y - menuTouch.lastY);
    menuTouch.lastY = p.y;
  }
}, { passive: false });
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  if (UI.open && menuTouch) {
    if (menuTouch.moved < 8) UI.pointer(menuTouch.x, menuTouch.y);
    menuTouch = null;
  }
}, { passive: false });
canvas.addEventListener("wheel", (e) => {
  if (UI.open) {
    e.preventDefault();
    UI.scrollBy(e.deltaY * 0.4);
  }
}, { passive: false });
overlay.addEventListener("click", start);
overlay.addEventListener("touchend", (e) => { e.preventDefault(); start(); }, { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "r") startReload();
  if (k === "g" && state.started) UI.toggle("guns");
  if (k === "s" && state.started) UI.toggle("sites");
  if (k === "escape") UI.close();
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
Game.bg = BG_BUILDERS[SITE().bg](W, H);

let lastT = performance.now();
function frame(now) {
  const dt = clamp((now - lastT) / 1000, 0, 0.05);
  lastT = now;
  if (state.started) update(dt * state.timeScale);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- test hooks
// ?autostart=1 skips the title overlay (used for automated screenshots)
const urlParams = new URLSearchParams(location.search);
if (urlParams.has("autostart")) start();
// ?site=brow forces a site for screenshots (grants it temporarily)
if (urlParams.has("site") && SITES[urlParams.get("site")]) {
  if (!state.sitesOwned.includes(urlParams.get("site"))) {
    state.sitesOwned.push(urlParams.get("site"));
  }
  travelTo(urlParams.get("site"));
}
// ?sim=N synchronously fast-forwards N seconds (deterministic screenshots/tests)
if (urlParams.has("sim")) {
  start();
  const secs = parseFloat(urlParams.get("sim")) || 5;
  for (let i = 0; i < secs * 60; i++) update(1 / 60);
  // ?testshot=1 then aims at the first huntable flying bird and fires
  if (urlParams.has("testshot")) {
    const target = state.birds.find(
      (b) => b.state === "fly" && SPECIES[b.species].rarity !== "protected"
        && b.x > 30 && b.x < W - 30);
    if (target) {
      state.aim = { x: target.x, y: target.y };
      shoot();
      for (let i = 0; i < 12; i++) update(1 / 60);
    }
  }
  // ?menu=guns|sites|estate opens a panel for screenshots
  if (urlParams.has("menu")) UI.open = urlParams.get("menu");
  if (urlParams.has("tab")) UI.tab = urlParams.get("tab");
  if (urlParams.has("scroll")) UI.scroll = parseFloat(urlParams.get("scroll")) || 0;
}
// ?testbiz=1 seeds business state for screenshots/tests
if (urlParams.has("testbiz")) {
  state.contractOwned = true;
  state.taxidermyOwned = true;
  state.level = Math.max(state.level, 6);
  state.money += 500;
  state.larder = { wood: 7, feral: 4, duck: 3, pheasant: 2 };
  state.mountReady = "pheasant";
  Biz.genOrder(Date.now());
}
// ?golden=1 launches the Golden Curlew immediately (screenshots/tests)
if (urlParams.has("golden")) {
  start();
  launchGoldenCurlew();
  for (let i = 0; i < 30; i++) update(1 / 60);
}
// ?perkpts=N grants perk points for testing the perks tab
if (urlParams.has("perkpts")) {
  state.perkPoints = parseInt(urlParams.get("perkpts"), 10) || 3;
}
// ?debug=1 mirrors sim state into the tab title (used for automated checks)
if (urlParams.has("debug")) {
  setInterval(() => {
    document.title =
      `t=${state.time.toFixed(1)} birds=${state.birds.length} shot=${state.birdsShot}` +
      ` lvl=${state.level} money=${state.money}`;
  }, 250);
}
