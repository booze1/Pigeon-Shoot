"use strict";

// ---------------------------------------------------------------- body shapes
// Sprites are small pixel grids drawn facing right; three flap frames each
// (wing up / level / down). Legend chars map into each species' palette.

const SHAPE_PIGEON = {
  w: 14, h: 10,
  frames: [
    [
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
    [
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
    [
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
  ],
};

const SHAPE_DUCK = {
  w: 16, h: 10,
  frames: [
    [
      "....lll.........",
      "...lllll........",
      "....lll.........",
      "..........heh...",
      "dd.bbbbbbwhhhoo.",
      "ddbbbbbbbwhh....",
      ".bbbbbbbbbb.....",
      "..bbbbbbbb......",
      "...bbbbb........",
      "................",
    ],
    [
      "................",
      "................",
      "....lllll.......",
      "...llllll.heh...",
      "dd.blllllwhhhoo.",
      "ddbbbbbbbwhh....",
      ".bbbbbbbbbb.....",
      "..bbbbbbbb......",
      "...bbbbb........",
      "................",
    ],
    [
      "................",
      "................",
      "................",
      "..........heh...",
      "dd.bbbbbbwhhhoo.",
      "ddbbbbbbbwhh....",
      ".bblllllbb......",
      "..blllll........",
      "...lllll........",
      ".....ll.........",
    ],
  ],
};

const SHAPE_GAMEBIRD = {
  w: 15, h: 11,
  frames: [
    [
      ".....lll.......",
      "....lllll......",
      "....llll.......",
      "...gggg...gg...",
      "dd.ggggggggeo..",
      "ddgggggggggg...",
      ".dggpppppggg...",
      "..ggpppppg.....",
      "...gpppp.......",
      "....ppp........",
      "...............",
    ],
    [
      "...............",
      "...............",
      "....lllll......",
      "...glllllg.....",
      "dd.gglllgggeo..",
      "ddgggggggggg...",
      ".dggpppppggg...",
      "..ggpppppg.....",
      "...gpppp.......",
      "....ppp........",
      "...............",
    ],
    [
      "...............",
      "...............",
      "...............",
      "...gggg....g...",
      "dd.ggggggggeo..",
      "ddgggggggggg...",
      ".dgglllllggg...",
      "..glllllgg.....",
      "...lllll.......",
      "....lll........",
      "...............",
    ],
  ],
};

const SHAPE_PHEASANT = {
  w: 18, h: 11,
  frames: [
    [
      "......lll.........",
      ".....lllll........",
      ".....llll.........",
      "......ggg....hh...",
      "tttt.gggggggwheo..",
      "ddttggggggggwhh...",
      ".dggrrrrrrggg.....",
      "..ggrrrrrrg.......",
      "...grrrrr.........",
      "....rrr...........",
      "..................",
    ],
    [
      "..................",
      "..................",
      ".....llllll.......",
      "....gllllllg.hh...",
      "tttt.ggllllgwheo..",
      "ddttggggggggwhh...",
      ".dggrrrrrrggg.....",
      "..ggrrrrrrg.......",
      "...grrrrr.........",
      "....rrr...........",
      "..................",
    ],
    [
      "..................",
      "..................",
      "..................",
      "......ggg....hh...",
      "tttt.gggggggwheo..",
      "ddttggggggggwhh...",
      ".dggllllllggg.....",
      "..ggllllllg.......",
      "....lllll.........",
      ".....lll..........",
      "..................",
    ],
  ],
};

// ---------------------------------------------------------------- species
// rarity: common / uncommon / rare / protected. Protected birds cost a fine.
const RARITY_COLORS = {
  common: "#ffd45e",
  uncommon: "#9fe08a",
  rare: "#7db6ff",
  protected: "#e0574a",
};

const SPECIES = {
  feral: {
    name: "Feral Pigeon", shape: SHAPE_PIGEON, rarity: "common",
    value: 4, xp: 3, speed: [45, 95], band: [25, 170], scales: [1.5, 2],
    palette: {
      d: "#454a54", g: "#7e8591", l: "#b4bac3", w: "#eef0f3",
      o: "#d79a3f", e: "#15171c", p: "#8f7f88",
    },
  },
  wood: {
    name: "Wood Pigeon", shape: SHAPE_PIGEON, rarity: "common",
    value: 6, xp: 4, speed: [45, 90], band: [25, 170], scales: [1.5, 2],
    palette: {
      d: "#4b5261", g: "#8b93a4", l: "#c3c9d4", w: "#f4f6f8",
      o: "#e0a94b", e: "#15171c", p: "#b58d97",
    },
  },
  jackdaw: {
    name: "Jackdaw", shape: SHAPE_PIGEON, rarity: "uncommon",
    value: 8, xp: 6, speed: [55, 105], band: [25, 160], scales: [1.5, 1.8],
    palette: {
      d: "#1d2025", g: "#2f3239", l: "#5a5f68", w: "#5a5f68",
      o: "#2b2e34", e: "#090a0c", p: "#282b31",
    },
  },
  crow: {
    name: "Carrion Crow", shape: SHAPE_PIGEON, rarity: "uncommon",
    value: 10, xp: 7, speed: [40, 78], band: [25, 150], scales: [2, 2.4],
    palette: {
      d: "#17191d", g: "#25282e", l: "#343841", w: "#25282e",
      o: "#3a3e46", e: "#07080a", p: "#1f2227",
    },
  },
  duck: {
    name: "Mallard", shape: SHAPE_DUCK, rarity: "uncommon",
    value: 12, xp: 9, speed: [85, 130], band: [40, 150], scales: [1.6, 2],
    palette: {
      b: "#6f5942", l: "#bcac90", h: "#2c6b46", e: "#101008",
      o: "#d8a13c", w: "#eef0f3", d: "#3e332a",
    },
  },
  partridge: {
    name: "Grey Partridge", shape: SHAPE_GAMEBIRD, rarity: "rare",
    value: 16, xp: 12, speed: [85, 135], band: [100, 190], scales: [1.6, 2],
    palette: {
      g: "#8d7c60", l: "#bcab86", p: "#c9803f", d: "#5d5140",
      o: "#8a795c", e: "#151209",
    },
  },
  pheasant: {
    name: "Pheasant", shape: SHAPE_PHEASANT, rarity: "rare",
    value: 20, xp: 15, speed: [95, 150], band: [95, 190], scales: [1.8, 2.2],
    palette: {
      t: "#7c5c36", g: "#95582f", r: "#aa6733", h: "#1e4f3b",
      e: "#c23b2e", o: "#cdb489", l: "#c09058", d: "#513a24", w: "#f2f3f5",
    },
  },
  grouse: {
    name: "Red Grouse", shape: SHAPE_GAMEBIRD, rarity: "rare",
    value: 24, xp: 18, speed: [90, 145], band: [95, 185], scales: [1.6, 2],
    palette: {
      g: "#5f4732", l: "#82644a", p: "#503728", d: "#3d2d20",
      o: "#54402e", e: "#120e08",
    },
  },
  lapwing: {
    name: "Lapwing", shape: SHAPE_GAMEBIRD, rarity: "protected",
    value: 0, xp: 0, fine: 25, speed: [55, 95], band: [55, 160], scales: [1.6, 1.9],
    palette: {
      g: "#31514a", l: "#48695f", p: "#f1eee5", d: "#22362f",
      o: "#3a3a33", e: "#0f0f0b",
    },
  },
  owl: {
    name: "Barn Owl", shape: SHAPE_GAMEBIRD, rarity: "protected",
    value: 0, xp: 0, fine: 25, speed: [40, 70], band: [50, 150], scales: [1.8, 2.2],
    palette: {
      g: "#e6dabd", l: "#f5efdd", p: "#fbf8ef", d: "#cdb996",
      o: "#b7a175", e: "#1a150e",
    },
  },
};

// ---------------------------------------------------------------- the dog
// A grey schnauzer (from the farmhouse lawn photo). Two walk frames.
const DOG_FRAMES = [
  [
    "tt................",
    "tt.............ee.",
    ".b............hhhh",
    ".bbbbbbbbbbbbbhhhh",
    "bbbbbbbbbbbbbbhhh.",
    "bbbbbbbbbbbbbbhml.",
    "bbbbbbbbbbbbbb.ll.",
    ".bbbbbbbbbbbbb....",
    ".ll...ll...ll..ll.",
    ".ll...ll...ll..ll.",
    "..................",
  ],
  [
    "tt................",
    "tt.............ee.",
    ".b............hhhh",
    ".bbbbbbbbbbbbbhhhh",
    "bbbbbbbbbbbbbbhhh.",
    "bbbbbbbbbbbbbbhml.",
    "bbbbbbbbbbbbbb.ll.",
    ".bbbbbbbbbbbbb....",
    "..ll..ll..ll..ll..",
    "..ll..ll..ll..ll..",
    "..................",
  ],
];

const DOG_PALETTE = {
  b: "#6f7277", h: "#7d8085", l: "#b7bac0", m: "#2c2e33",
  e: "#4a4d52", t: "#63666b",
};
const DOG_W = 18;
const DOG_H = 11;

// ---------------------------------------------------------------- builders
function buildSpriteCanvas(rows, palette, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
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

// SPRITES[speciesId] = [frame0, frame1, frame2]
const SPRITES = {};
const FEATHER_COLORS = {};
for (const id of Object.keys(SPECIES)) {
  const sp = SPECIES[id];
  SPRITES[id] = sp.shape.frames.map((f) =>
    buildSpriteCanvas(f, sp.palette, sp.shape.w, sp.shape.h)
  );
  const pal = sp.palette;
  FEATHER_COLORS[id] = [pal.g || pal.b, pal.l, pal.p || pal.w || pal.l]
    .filter(Boolean);
}

const DOG_SPRITES = DOG_FRAMES.map((f) =>
  buildSpriteCanvas(f, DOG_PALETTE, DOG_W, DOG_H)
);
