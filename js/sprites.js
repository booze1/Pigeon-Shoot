"use strict";

// Pigeon sprites are 14x10 pixel grids, drawn facing right.
// Legend: . transparent, d dark, g mid grey, l light, w white, o beak, e eye, p breast
const PIGEON_FRAMES = [
  [ // wing up
    "....lll.......",
    "...lllll......",
    "...glll...ggg.",
    "..ggll....gego",
    "ddgggggggwggg.",
    "ddgggggggggg..",
    ".dggpppppgg...",
    "..gglpppg.....",
    "...gllll......",
    "..............",
  ],
  [ // wing level
    "..............",
    "..............",
    "..........ggg.",
    "..llllll..gego",
    "ddlllllllwggg.",
    "ddglllllggg...",
    ".dggpppppgg...",
    "..gglpppg.....",
    "...gllll......",
    "..............",
  ],
  [ // wing down
    "..............",
    "..............",
    "..........ggg.",
    "..........gego",
    "ddgggggggwggg.",
    "ddgggggggggg..",
    ".dgglllllgg...",
    "..glllllgg....",
    "....lllll.....",
    "......lll.....",
  ],
];

const PIGEON_W = 14;
const PIGEON_H = 10;

const SPECIES = {
  feral: {
    name: "Feral Pigeon",
    value: 4,
    palette: {
      d: "#454a54", g: "#7e8591", l: "#b4bac3", w: "#eef0f3",
      o: "#d79a3f", e: "#15171c", p: "#8f7f88",
    },
  },
  wood: {
    name: "Wood Pigeon",
    value: 6,
    palette: {
      d: "#4b5261", g: "#8b93a4", l: "#c3c9d4", w: "#f4f6f8",
      o: "#e0a94b", e: "#15171c", p: "#b58d97",
    },
  },
};

function buildSpriteCanvas(rows, palette) {
  const c = document.createElement("canvas");
  c.width = PIGEON_W;
  c.height = PIGEON_H;
  const ctx = c.getContext("2d");
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// SPRITES[species] = [frame0, frame1, frame2]
const SPRITES = {};
for (const key of Object.keys(SPECIES)) {
  SPRITES[key] = PIGEON_FRAMES.map((f) =>
    buildSpriteCanvas(f, SPECIES[key].palette)
  );
}

// Feather colours per species, used by the particle system.
const FEATHER_COLORS = {};
for (const key of Object.keys(SPECIES)) {
  const p = SPECIES[key].palette;
  FEATHER_COLORS[key] = [p.g, p.l, p.w, p.p];
}
