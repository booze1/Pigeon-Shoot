"use strict";

// Shared helpers for the site painters ------------------------------------

function skyBands(g, W, bands, height) {
  const bandH = Math.ceil(height / bands.length);
  for (let i = 0; i < bands.length; i++) {
    g.fillStyle = bands[i];
    g.fillRect(0, i * bandH, W, bandH);
    if (i > 0) {
      g.fillStyle = bands[i - 1];
      const y = i * bandH;
      for (let x = 0; x < W; x += 2) g.fillRect(x + (y % 2), y, 1, 1);
    }
  }
}

function cloudStreaks(g, clouds, color) {
  g.fillStyle = color;
  for (const [cx, cy, len] of clouds) {
    for (let s = 0; s < 3; s++) {
      const inset = s * randInt(6, 14);
      g.globalAlpha = 0.5 - s * 0.13;
      g.fillRect(cx + inset, cy + s, len - inset * 2, 1);
    }
  }
  g.globalAlpha = 1;
}

function ridgeLine(g, W, baseY, amp, color, step, bottom) {
  g.fillStyle = color;
  let y = baseY + rand(-amp, amp);
  for (let x = 0; x < W; x += step) {
    y = clamp(y + rand(-amp, amp), baseY - amp * 2, baseY + amp * 2);
    g.fillRect(x, Math.round(y), step, bottom - Math.round(y) + 2);
  }
}

function treeClumps(g, W, baseY, greens, minH, maxH) {
  let tx = -6;
  while (tx < W) {
    const tw = randInt(10, 26);
    const th = randInt(minH, maxH);
    g.fillStyle = pick(greens);
    for (let r = 0; r < th; r++) {
      const shrink = Math.floor((r / th) * (tw / 2));
      g.fillRect(tx + shrink, baseY - r, tw - shrink * 2, 1);
    }
    tx += tw - randInt(2, 6);
  }
}

// Home Field: golden stubble at dusk, hazy hills, farmhouse silhouette.
// Painted once into an offscreen canvas at boot.
function buildHomeField(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const HORIZON = 152;
  const FIELD_END = 238;

  // --- Sky: banded dusk gradient with dithered boundaries ---
  const skyBands = [
    "#6f9bd1", "#7ea7d6", "#8fb2dc", "#a3c0e2",
    "#b8cde6", "#cdd8e6", "#dfdcd9", "#eedfca", "#f4e3c8",
  ];
  const bandH = Math.ceil(HORIZON / skyBands.length);
  for (let i = 0; i < skyBands.length; i++) {
    g.fillStyle = skyBands[i];
    g.fillRect(0, i * bandH, W, bandH);
    // Checker dither on the seam with the previous band
    if (i > 0) {
      g.fillStyle = skyBands[i - 1];
      const y = i * bandH;
      for (let x = 0; x < W; x += 2) g.fillRect(x + (y % 2), y, 1, 1);
    }
  }

  // --- Cloud streaks ---
  g.fillStyle = "#f0f4f9";
  const clouds = [
    [30, 22, 90], [190, 34, 130], [350, 18, 100],
    [90, 52, 70], [280, 62, 110], [10, 78, 60], [400, 84, 70],
  ];
  for (const [cx, cy, len] of clouds) {
    for (let s = 0; s < 3; s++) {
      const inset = s * randInt(6, 14);
      g.globalAlpha = 0.5 - s * 0.13;
      g.fillRect(cx + inset, cy + s, len - inset * 2, 1);
    }
  }
  g.globalAlpha = 1;

  // --- Distant hills, two haze layers ---
  const ridge = (baseY, amp, color, step) => {
    g.fillStyle = color;
    let y = baseY + rand(-amp, amp);
    for (let x = 0; x < W; x += step) {
      y = clamp(y + rand(-amp, amp), baseY - amp * 2, baseY + amp * 2);
      g.fillRect(x, Math.round(y), step, HORIZON - Math.round(y) + 2);
    }
  };
  ridge(118, 2.5, "#b3bdcb", 14);
  ridge(132, 3, "#99a5b1", 10);

  // Haze where hills meet the field
  g.globalAlpha = 0.45;
  g.fillStyle = "#ecdfc8";
  g.fillRect(0, HORIZON - 8, W, 8);
  g.globalAlpha = 1;

  // --- Treeline silhouette on the horizon ---
  const treeGreens = ["#55603f", "#4a5537", "#5d6844"];
  let tx = -6;
  while (tx < W) {
    const tw = randInt(10, 26);
    const th = randInt(4, 9);
    g.fillStyle = pick(treeGreens);
    // rounded clump: stacked shrinking rows
    for (let r = 0; r < th; r++) {
      const shrink = Math.floor((r / th) * (tw / 2));
      g.fillRect(tx + shrink, HORIZON - r, tw - shrink * 2, 1);
    }
    tx += tw - randInt(2, 6);
  }
  // A couple of taller lone trees
  for (const lx of [118, 384]) {
    g.fillStyle = "#46512f";
    for (let r = 0; r < 14; r++) {
      const w2 = Math.max(2, 12 - Math.abs(r - 8) * 1.6);
      g.fillRect(lx - w2 / 2, HORIZON - r, w2, 1);
    }
    g.fillStyle = "#3c4227";
    g.fillRect(lx - 1, HORIZON - 3, 2, 4);
  }

  // --- Farmhouse silhouette (from the photo, sat on the horizon) ---
  const fx = 292, fy = HORIZON;
  g.fillStyle = "#8f8a80";                    // walls
  g.fillRect(fx, fy - 10, 22, 10);
  g.fillStyle = "#565049";                    // roof
  for (let r = 0; r < 5; r++) g.fillRect(fx - 1 + r, fy - 10 - (5 - r), 24 - r * 2, 1);
  g.fillRect(fx + 3, fy - 18, 2, 4);          // chimney
  g.fillStyle = "#3d3a35";                    // barn to the left
  g.fillRect(fx - 14, fy - 6, 12, 6);
  for (let r = 0; r < 3; r++) g.fillRect(fx - 14 + r, fy - 6 - (3 - r), 12 - r * 2, 1);
  g.fillStyle = "#efe6cf";                    // lit window
  g.fillRect(fx + 15, fy - 6, 2, 2);

  // --- Stubble field with perspective mow lines ---
  g.fillStyle = "#c79f55";
  g.fillRect(0, HORIZON, W, FIELD_END - HORIZON);
  let ly = HORIZON + 3;
  let gap = 3;
  while (ly < FIELD_END) {
    g.fillStyle = "#ab8746";
    g.fillRect(0, Math.round(ly), W, 1);
    g.fillStyle = "#d9b566";
    g.fillRect(0, Math.round(ly) + 1, W, 1);
    ly += gap;
    gap *= 1.22;
  }
  // Stubble ticks, denser near the bottom
  for (let i = 0; i < 420; i++) {
    const y = HORIZON + Math.pow(Math.random(), 0.6) * (FIELD_END - HORIZON - 2);
    const x = rand(0, W);
    g.fillStyle = Math.random() < 0.5 ? "#9c7c40" : "#e2c078";
    g.fillRect(Math.round(x), Math.round(y), 1, y > 200 ? 2 : 1);
  }

  // --- Long evening shadows sweeping from the right (like the photo) ---
  g.globalAlpha = 0.16;
  g.fillStyle = "#2c2c1e";
  const shadow = (topX, topW) => {
    g.beginPath();
    g.moveTo(topX, HORIZON);
    g.lineTo(topX + topW, HORIZON);
    g.lineTo(topX + topW - 150, FIELD_END);
    g.lineTo(topX - 150 - topW * 1.5, FIELD_END);
    g.closePath();
    g.fill();
  };
  shadow(150, 10);
  shadow(255, 16);
  shadow(365, 12);
  shadow(455, 20);
  g.globalAlpha = 1;

  // --- Wire fence across the field ---
  const fenceY = 196;
  g.fillStyle = "#6a5844";
  for (let x = 14; x < W; x += 52) g.fillRect(x, fenceY - 7, 2, 8);
  g.globalAlpha = 0.25;
  g.fillStyle = "#1c1a14";
  g.fillRect(0, fenceY - 6, W, 1);
  g.fillRect(0, fenceY - 3, W, 1);
  g.globalAlpha = 1;

  // --- Foreground rough grass ---
  g.fillStyle = "#5f6238";
  g.fillRect(0, FIELD_END, W, H - FIELD_END);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = Math.random() < 0.5 ? "#6d7040" : "#4e5230";
    g.fillRect(randInt(0, W), randInt(FIELD_END + 1, H - 3), randInt(5, 16), randInt(2, 4));
  }
  // Grass tufts
  for (let i = 0; i < 70; i++) {
    const x = randInt(0, W);
    const y = randInt(FIELD_END + 2, H - 2);
    g.fillStyle = Math.random() < 0.6 ? "#7c8148" : "#8d8a55";
    g.fillRect(x, y - 3, 1, 3);
    g.fillRect(x - 1, y - 2, 1, 2);
    g.fillRect(x + 1, y - 2, 1, 2);
  }
  // Seed heads catching the light
  for (let i = 0; i < 14; i++) {
    const x = randInt(0, W);
    const y = randInt(FIELD_END + 4, H - 4);
    g.fillStyle = "#8d8a55";
    g.fillRect(x, y - 5, 1, 5);
    g.fillStyle = "#c4ac66";
    g.fillRect(x - 1, y - 6, 3, 2);
  }

  return c;
}

// The Walled Pasture: cut hay rows, drystone wall, green valley beyond.
function buildWalledPasture(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const HORIZON = 140;
  const WALL_Y = 226;

  skyBands(g, W, [
    "#6d9ed6", "#7da9da", "#90b5de", "#a5c2e2",
    "#bccfe6", "#d2dce8", "#e4e6e7", "#eeeadf",
  ], HORIZON);
  cloudStreaks(g, [
    [40, 26, 110], [230, 40, 150], [370, 20, 90],
    [120, 60, 80], [300, 74, 120], [20, 90, 70],
  ], "#f4f8fc");

  // Far green valley sides, hazy
  ridgeLine(g, W, 108, 3, "#a8b6ab", 13, HORIZON);
  ridgeLine(g, W, 122, 3.5, "#8fa192", 10, HORIZON);
  // Far field patchwork hints on the slope
  g.globalAlpha = 0.5;
  for (let i = 0; i < 12; i++) {
    g.fillStyle = pick(["#9db08a", "#b3b98d", "#8aa17e", "#c0bb93"]);
    g.fillRect(randInt(0, W - 30), randInt(118, 136), randInt(14, 34), randInt(3, 7));
  }
  g.globalAlpha = 1;

  // Treeline
  treeClumps(g, W, HORIZON + 6, ["#4c5c3a", "#41512f", "#576642"], 5, 12);
  // Lone ash trees
  for (const lx of [70, 330]) {
    g.fillStyle = "#3f4e2d";
    for (let r = 0; r < 16; r++) {
      const w2 = Math.max(2, 14 - Math.abs(r - 9) * 1.7);
      g.fillRect(lx - w2 / 2, HORIZON + 4 - r, w2, 1);
    }
    g.fillStyle = "#35402a";
    g.fillRect(lx - 1, HORIZON + 2, 2, 5);
  }

  // Pasture with hay windrows
  g.fillStyle = "#8faa5e";
  g.fillRect(0, HORIZON + 6, W, WALL_Y - HORIZON - 6);
  let ry = HORIZON + 12;
  let gap = 5;
  while (ry < WALL_Y - 4) {
    // pale dried hay row with a shadow line beneath
    g.fillStyle = "#c9c07c";
    g.fillRect(0, Math.round(ry), W, Math.max(1, Math.round(gap * 0.32)));
    g.fillStyle = "#79934e";
    g.fillRect(0, Math.round(ry) + Math.max(1, Math.round(gap * 0.32)), W, 1);
    ry += gap;
    gap *= 1.35;
  }
  // Grass texture ticks
  for (let i = 0; i < 240; i++) {
    const y = HORIZON + 8 + Math.pow(Math.random(), 0.7) * (WALL_Y - HORIZON - 12);
    g.fillStyle = Math.random() < 0.5 ? "#7d9852" : "#a0b86c";
    g.fillRect(randInt(0, W), Math.round(y), 1, y > 180 ? 2 : 1);
  }
  // Two round bales
  for (const [bx, by] of [[150, 172], [390, 186]]) {
    const r = by > 180 ? 8 : 6;
    g.fillStyle = "#b89c58";
    g.fillRect(bx - r, by - r, r * 2, r * 2);
    g.fillStyle = "#96793f";
    g.fillRect(bx - r, by - r, r * 2, 2);
    for (let i = 1; i < 4; i++) g.fillRect(bx - r, by - r + i * (r / 2), r * 2, 1);
    g.fillStyle = "#6d5830";
    g.fillRect(bx - r, by + r - 1, r * 2, 1);
  }

  // Drystone wall across the foreground
  g.fillStyle = "#4e4f4c";
  g.fillRect(0, WALL_Y, W, H - WALL_Y);
  let wx = 0;
  let wy = WALL_Y;
  while (wy < H) {
    wx = -randInt(0, 6);
    while (wx < W) {
      const sw = randInt(5, 12);
      const sh = randInt(3, 6);
      g.fillStyle = pick(["#75787340", "#8a8d86", "#6d706b", "#7f827c", "#5f625d"]);
      if (g.fillStyle === "#75787340") g.fillStyle = "#757873";
      g.fillRect(wx + 1, wy + 1, sw - 1, sh - 1);
      wx += sw;
    }
    wy += randInt(5, 7);
  }
  // Coping stones on top
  g.fillStyle = "#9a9d96";
  for (let x = 0; x < W; x += randInt(6, 10)) {
    g.fillRect(x, WALL_Y - 3, randInt(4, 7), 4);
  }
  // Moss and lichen flecks
  for (let i = 0; i < 60; i++) {
    g.fillStyle = pick(["#7c8a5a", "#a9a06b", "#c2c0b2"]);
    g.fillRect(randInt(0, W), randInt(WALL_Y, H - 2), 1, 1);
  }

  return c;
}

// Foxglove Brow: high moor edge, hazy patchwork valley, foxglove spikes.
function buildFoxgloveBrow(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const HORIZON = 128;
  const HEDGE_Y = 178;

  skyBands(g, W, [
    "#87abd8", "#93b4dc", "#a3bfdf", "#b5cbe2",
    "#c9d6e3", "#dcdfe0", "#e9e4d8", "#efe6d2",
  ], HORIZON);
  cloudStreaks(g, [[80, 18, 90], [300, 30, 110], [180, 48, 70]], "#f2f6fa");

  // Very hazy far moor
  ridgeLine(g, W, 100, 4, "#b7c2cf", 14, 118);
  ridgeLine(g, W, 112, 4, "#a3b0bd", 11, 130);

  // Patchwork valley floor: overlapping muted field strips + hedge seams
  g.fillStyle = "#9caf87";
  g.fillRect(0, 118, W, HEDGE_Y - 118);
  for (let i = 0; i < 46; i++) {
    const y = 118 + Math.pow(Math.random(), 0.8) * (HEDGE_Y - 124);
    const h = clamp(2 + (y - 118) * 0.14, 2, 9);
    g.fillStyle = pick(["#a6b48a", "#c2b98a", "#94a878", "#b7a76f",
                        "#9db393", "#c9bd8f", "#88a072"]);
    g.fillRect(randInt(-10, W - 20), Math.round(y), randInt(26, 70), Math.round(h));
  }
  // Hedge seams between fields
  g.globalAlpha = 0.55;
  g.fillStyle = "#66754f";
  for (let i = 0; i < 22; i++) {
    const y = 122 + Math.pow(Math.random(), 0.85) * (HEDGE_Y - 130);
    g.fillRect(randInt(-10, W - 20), Math.round(y), randInt(24, 60), 1);
  }
  g.globalAlpha = 1;
  // Haze wash over the whole valley — it fades with distance
  const haze = g.createLinearGradient(0, 118, 0, HEDGE_Y);
  haze.addColorStop(0, "rgba(222,224,224,0.55)");
  haze.addColorStop(1, "rgba(222,224,224,0.03)");
  g.fillStyle = haze;
  g.fillRect(0, 118, W, HEDGE_Y - 118);

  // Dark hedge band with trees at the field edge
  treeClumps(g, W, HEDGE_Y + 4, ["#43522f", "#374527", "#4d5c37"], 4, 11);
  g.fillStyle = "#3c4a2b";
  g.fillRect(0, HEDGE_Y + 2, W, 4);

  // Tawny moor-edge grass
  g.fillStyle = "#b3a06b";
  g.fillRect(0, HEDGE_Y + 6, W, H - HEDGE_Y - 6);
  for (let i = 0; i < 420; i++) {
    const y = HEDGE_Y + 8 + Math.pow(Math.random(), 0.6) * (H - HEDGE_Y - 12);
    g.fillStyle = pick(["#a08a55", "#c4b178", "#8f7c4e", "#d0bd85"]);
    g.fillRect(randInt(0, W), Math.round(y), 1, y > 230 ? 3 : 2);
  }
  // Wind-combed pale sweeps
  g.globalAlpha = 0.25;
  g.fillStyle = "#e0d3a0";
  for (let i = 0; i < 14; i++) {
    g.fillRect(randInt(0, W - 40), randInt(HEDGE_Y + 12, H - 8), randInt(20, 50), 1);
  }
  g.globalAlpha = 1;

  // Foxglove spikes in the foreground
  for (let i = 0; i < 22; i++) {
    const x = randInt(4, W - 4);
    const base = randInt(H - 46, H - 6);
    const height = randInt(12, 22) + Math.round((base - (H - 46)) * 0.2);
    g.fillStyle = "#5c6e3d";
    g.fillRect(x, base - height, 1, height);
    // leaves at the base
    g.fillRect(x - 2, base - 3, 2, 1);
    g.fillRect(x + 1, base - 2, 2, 1);
    // bells: paired magenta pixels climbing the stem, smaller near the tip
    const bells = Math.floor(height * 0.6);
    for (let b2 = 0; b2 < bells; b2++) {
      const by = base - height + Math.round(height * 0.25) + b2;
      if (by > base - 2) break;
      const side = b2 % 2 === 0 ? -1 : 1;
      const bw = by > base - height * 0.55 ? 2 : 1;
      g.fillStyle = pick(["#b05ec2", "#a34fb0", "#c273d1"]);
      g.fillRect(x + (side === -1 ? -bw : 1), by, bw, 1);
    }
  }

  return c;
}

// Registry used when switching sites.
const BG_BUILDERS = {
  home: buildHomeField,
  pasture: buildWalledPasture,
  brow: buildFoxgloveBrow,
};
