"use strict";

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
