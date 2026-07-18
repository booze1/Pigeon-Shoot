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


// The Farmhouse Lawn: mown stripes, wicker chair and a pint, valley view.
function buildFarmhouseLawn(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const HORIZON = 132;
  const WALL_Y = 168;

  skyBands(g, W, [
    "#7aa3d4", "#8aaed8", "#9bbadc", "#aec6e0",
    "#c3d2e3", "#d8dde2", "#e8e2d6", "#f0e4cd",
  ], HORIZON);
  cloudStreaks(g, [[60, 24, 100], [260, 38, 140], [400, 18, 70],
    [150, 60, 80], [330, 72, 100]], "#f4f8fc");

  // Valley beyond the garden wall
  g.fillStyle = "#8aa183";
  g.fillRect(0, 116, W, WALL_Y - 116);
  ridgeLine(g, W, 104, 3.5, "#aab8c2", 14, 120);
  ridgeLine(g, W, 118, 3.5, "#93a5a4", 11, 134);
  g.globalAlpha = 0.55;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = pick(["#9db08a", "#b3b98d", "#8aa17e", "#c0bb93"]);
    g.fillRect(randInt(-10, W - 24), randInt(116, 132), randInt(18, 44), randInt(3, 6));
  }
  g.globalAlpha = 1;
  treeClumps(g, W, HORIZON + 4, ["#4c5c3a", "#41512f", "#576642"], 4, 10);

  // Garden wall with coping
  g.fillStyle = "#6d706b";
  g.fillRect(0, WALL_Y - 14, W, 14);
  let wx = 0;
  for (let row = 0; row < 2; row++) {
    wx = -randInt(0, 5);
    while (wx < W) {
      const sw = randInt(6, 12);
      g.fillStyle = pick(["#7f827c", "#75786f", "#8a8d86", "#666962"]);
      g.fillRect(wx + 1, WALL_Y - 13 + row * 6, sw - 1, 5);
      wx += sw;
    }
  }
  g.fillStyle = "#94978f";
  for (let x = 0; x < W; x += randInt(6, 9)) g.fillRect(x, WALL_Y - 16, randInt(4, 6), 3);

  // The lawn: mown stripes with perspective
  const stripes = ["#5f8f46", "#6da052", "#5a8a42", "#74a85a"];
  let sy = WALL_Y;
  let sh = 7;
  let si = 0;
  while (sy < H) {
    g.fillStyle = stripes[si % stripes.length];
    g.fillRect(0, Math.round(sy), W, Math.ceil(sh));
    sy += sh;
    sh *= 1.35;
    si++;
  }
  // Lawn texture
  for (let i = 0; i < 200; i++) {
    const y = WALL_Y + Math.pow(Math.random(), 0.7) * (H - WALL_Y - 2);
    g.fillStyle = Math.random() < 0.5 ? "#527e3c" : "#7fae63";
    g.fillRect(randInt(0, W), Math.round(y), 1, y > 220 ? 2 : 1);
  }
  // A few daisies
  for (let i = 0; i < 12; i++) {
    const x = randInt(6, W - 6), y = randInt(WALL_Y + 10, H - 8);
    g.fillStyle = "#eef0e6";
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y - 1, 1, 3);
    g.fillStyle = "#e0c34e";
    g.fillRect(x, y, 1, 1);
  }

  // Wicker chair + table with a pint, right-hand side
  const chx = 396, chy = 208;
  g.fillStyle = "#a8854e";                       // chair back
  g.fillRect(chx, chy - 26, 30, 30);
  g.fillStyle = "#8d6d3c";
  for (let r = 0; r < 6; r++) g.fillRect(chx, chy - 26 + r * 5, 30, 1);
  for (let cq = 0; cq < 5; cq++) g.fillRect(chx + 3 + cq * 6, chy - 26, 1, 30);
  g.fillStyle = "#b5924f";                       // armrests
  g.fillRect(chx - 4, chy - 6, 6, 14);
  g.fillRect(chx + 28, chy - 6, 6, 14);
  g.fillStyle = "#c7a45e";                       // seat cushion
  g.fillRect(chx + 2, chy + 2, 26, 7);
  g.fillStyle = "#7c5c30";                       // legs
  g.fillRect(chx + 2, chy + 9, 3, 8);
  g.fillRect(chx + 25, chy + 9, 3, 8);
  // Side table
  const tx2 = 362, ty2 = 216;
  g.fillStyle = "#8d6d3c";
  g.fillRect(tx2, ty2, 24, 3);
  g.fillRect(tx2 + 3, ty2 + 3, 2, 12);
  g.fillRect(tx2 + 19, ty2 + 3, 2, 12);
  // The pint
  g.fillStyle = "#e8b02c";
  g.fillRect(tx2 + 10, ty2 - 9, 5, 9);
  g.fillStyle = "#f7f3e6";
  g.fillRect(tx2 + 10, ty2 - 11, 5, 2);
  g.fillStyle = "#ffffff33";
  g.fillRect(tx2 + 10, ty2 - 9, 1, 9);

  return c;
}

// Stonebeck Hamlet: dusk over stone barns, lit windows, chimney smoke.
function buildStonebeckHamlet(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const ROOF_Y = 190;

  skyBands(g, W, [
    "#3f5a86", "#4d688f", "#5f7797", "#75879e",
    "#8f96a2", "#ab9f9c", "#c7a48c", "#dba87a", "#e9ad74",
  ], ROOF_Y);
  cloudStreaks(g, [[70, 30, 120], [280, 50, 150], [160, 80, 90],
    [360, 100, 110]], "#e8b58a");

  // Distant moor silhouette
  ridgeLine(g, W, 128, 4, "#5a6478", 13, 150);
  ridgeLine(g, W, 144, 4, "#4a5468", 11, 168);

  // Rooftop silhouettes: a run of stone barns and houses
  const buildings = [
    { x: -10, w: 90, h: 52, roof: 16 },
    { x: 72, w: 70, h: 66, roof: 20 },
    { x: 136, w: 100, h: 48, roof: 14 },
    { x: 230, w: 84, h: 72, roof: 22 },
    { x: 308, w: 76, h: 56, roof: 16 },
    { x: 378, w: 110, h: 64, roof: 18 },
  ];
  for (const b of buildings) {
    const baseY = ROOF_Y;
    const topY = baseY - b.h;
    // gable roof: point at the ridge, wide at the eaves
    g.fillStyle = "#2b3040";
    for (let r = 0; r < b.roof; r++) {
      const inset = Math.floor(((b.roof - 1 - r) / b.roof) * (b.w / 2));
      g.fillRect(b.x + inset, topY - b.roof + r, b.w - inset * 2, 1);
    }
    // walls in coursed stone
    g.fillStyle = "#3a3f50";
    g.fillRect(b.x, topY, b.w, b.h);
    g.fillStyle = "#434960";
    for (let yy = topY + 3; yy < baseY - 2; yy += 5) {
      for (let xx = b.x + 2; xx < b.x + b.w - 4; xx += randInt(7, 12)) {
        g.fillRect(xx, yy, randInt(4, 8), 1);
      }
    }
    // chimney
    g.fillStyle = "#2b3040";
    g.fillRect(b.x + b.w - 14, topY - b.roof - 8, 6, 10);
    // lit windows
    const winN = randInt(1, 3);
    for (let wI = 0; wI < winN; wI++) {
      g.fillStyle = pick(["#f5d78a", "#f0c86e", "#e8ba55"]);
      g.fillRect(b.x + 10 + wI * randInt(18, 26), topY + randInt(10, b.h - 20), 5, 7);
    }
  }
  // Chimney smoke wisps
  g.globalAlpha = 0.3;
  g.fillStyle = "#c9c4bd";
  for (const sx of [148, 306, 452]) {
    for (let s = 0; s < 8; s++) {
      g.fillRect(sx + Math.round(Math.sin(s * 1.2) * 3), 108 - s * 5, 3 + (s % 2), 2);
    }
  }
  g.globalAlpha = 1;

  // Lane below the rooftops: wall, gate, cobbles
  g.fillStyle = "#494a45";
  g.fillRect(0, ROOF_Y, W, H - ROOF_Y);
  let wy2 = ROOF_Y + 2;
  while (wy2 < ROOF_Y + 26) {
    let wx2 = -randInt(0, 6);
    while (wx2 < W) {
      const sw = randInt(6, 12);
      g.fillStyle = pick(["#5c5e58", "#525450", "#666860"]);
      g.fillRect(wx2 + 1, wy2, sw - 1, 5);
      wx2 += sw;
    }
    wy2 += 6;
  }
  // Wooden field gate
  g.fillStyle = "#3a2f22";
  g.fillRect(196, ROOF_Y + 4, 3, 22);
  g.fillRect(258, ROOF_Y + 4, 3, 22);
  for (let bar = 0; bar < 4; bar++) g.fillRect(199, ROOF_Y + 6 + bar * 6, 59, 2);
  g.fillRect(199, ROOF_Y + 6, 59, 2);
  // Cobbled foreground
  g.fillStyle = "#3f403c";
  g.fillRect(0, ROOF_Y + 28, W, H - ROOF_Y - 28);
  for (let i = 0; i < 260; i++) {
    const y = ROOF_Y + 30 + Math.pow(Math.random(), 0.8) * (H - ROOF_Y - 32);
    g.fillStyle = pick(["#4c4d48", "#565752", "#44453f"]);
    g.fillRect(randInt(0, W), Math.round(y), randInt(2, 4), 2);
  }

  return c;
}

// Curlew Barn: permanent golden hour on the high moor, one lone barn.
function buildCurlewBarn(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const HORIZON = 158;

  skyBands(g, W, [
    "#8a7fa8", "#a4849c", "#c08d89", "#d89a72",
    "#e8a95e", "#f2ba55", "#f8cc5e", "#fbdc74",
  ], HORIZON);

  // The low sun and its glow
  const sunX = 150, sunY = 128;
  const glow = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, "rgba(255,238,180,0.95)");
  glow.addColorStop(0.25, "rgba(255,215,120,0.45)");
  glow.addColorStop(1, "rgba(255,215,120,0)");
  g.fillStyle = glow;
  g.fillRect(sunX - 90, sunY - 90, 180, 180);
  g.fillStyle = "#fff3cf";
  g.fillRect(sunX - 6, sunY - 6, 12, 12);
  g.fillRect(sunX - 8, sunY - 4, 16, 8);

  // Long thin clouds catching the light
  g.globalAlpha = 0.6;
  g.fillStyle = "#f8d9a0";
  for (const [cx2, cy2, len] of [[40, 60, 150], [250, 44, 170], [330, 90, 130]]) {
    g.fillRect(cx2, cy2, len, 2);
    g.fillRect(cx2 + 14, cy2 + 3, len - 40, 1);
  }
  g.globalAlpha = 1;

  // Distant moor ridge, purple-dark against the light
  ridgeLine(g, W, 140, 4, "#7a5f63", 13, 154);
  ridgeLine(g, W, 150, 3, "#5d474e", 10, 162);

  // The barn itself: lone gritstone silhouette, right of centre
  const bx = 322, bw = 92, bh = 54, by = HORIZON + 8;
  g.fillStyle = "#3d3330";
  for (let r = 0; r < 20; r++) {
    const inset = Math.floor(((19 - r) / 20) * (bw / 2));
    g.fillRect(bx + inset, by - bh - 20 + r, bw - inset * 2, 1);
  }
  g.fillStyle = "#4a3d38";
  g.fillRect(bx, by - bh, bw, bh);
  g.fillStyle = "#554741";
  for (let yy = by - bh + 4; yy < by - 3; yy += 6) {
    for (let xx = bx + 3; xx < bx + bw - 5; xx += randInt(8, 13)) {
      g.fillRect(xx, yy, randInt(4, 9), 2);
    }
  }
  // Big arched cart door, glowing faintly from within
  g.fillStyle = "#2a211e";
  g.fillRect(bx + 34, by - 30, 24, 30);
  g.fillStyle = "#8a6236";
  g.fillRect(bx + 36, by - 28, 20, 28);
  g.fillStyle = "#6e4d29";
  for (let dxx = 0; dxx < 5; dxx++) g.fillRect(bx + 36 + dxx * 4, by - 28, 1, 28);
  // Small owl window in the gable
  g.fillStyle = "#1e1815";
  g.fillRect(bx + bw / 2 - 2, by - bh - 10, 5, 6);
  // Sunlit edge on the west face
  g.fillStyle = "#c8a06a";
  g.fillRect(bx, by - bh, 2, bh);

  // Moor grass, long light
  g.fillStyle = "#c9a557";
  g.fillRect(0, HORIZON, W, H - HORIZON);
  for (let i = 0; i < 480; i++) {
    const y = HORIZON + 2 + Math.pow(Math.random(), 0.6) * (H - HORIZON - 4);
    g.fillStyle = pick(["#b8924a", "#dbb968", "#a8823f", "#e8cb7d", "#8f6f3a"]);
    g.fillRect(randInt(0, W), Math.round(y), 1, y > 225 ? 3 : 2);
  }
  // Rushes and tussocks
  for (let i = 0; i < 40; i++) {
    const x = randInt(0, W), y = randInt(HORIZON + 12, H - 4);
    g.fillStyle = pick(["#7a6234", "#8f7a3f"]);
    g.fillRect(x, y - 5, 1, 5);
    g.fillRect(x - 1, y - 4, 1, 3);
    g.fillRect(x + 1, y - 4, 1, 3);
  }
  // Long shadow thrown by the barn, away from the sun
  g.globalAlpha = 0.2;
  g.fillStyle = "#4a3226";
  g.beginPath();
  g.moveTo(bx, by);
  g.lineTo(bx + bw, by);
  g.lineTo(bx + bw + 130, H);
  g.lineTo(bx + 60, H);
  g.closePath();
  g.fill();
  // Warm wash over everything
  g.fillStyle = "rgba(255,196,96,0.10)";
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;

  return c;
}
// Registry used when switching sites.
const BG_BUILDERS = {
  home: buildHomeField,
  pasture: buildWalledPasture,
  brow: buildFoxgloveBrow,
  lawn: buildFarmhouseLawn,
  hamlet: buildStonebeckHamlet,
  barn: buildCurlewBarn,
};
