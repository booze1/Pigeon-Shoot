"use strict";

// ---------------------------------------------------------------- guns
// spread is the pellet-cloud radius (touch devices add a little to it).
const GUNS = {
  sbs: {
    name: "Old Side-by-Side", desc: "Trusty farm gun. Wide, forgiving spread.",
    price: 0, lvl: 1, shells: 2, pellets: 9, spread: 13, reload: 0.9, cooldown: 0.14,
  },
  ou: {
    name: "Over-and-Under", desc: "Tighter choke, snappy reload.",
    price: 150, lvl: 3, shells: 2, pellets: 10, spread: 10, reload: 0.6, cooldown: 0.12,
  },
  pump: {
    name: "Pump Action", desc: "Five shells, steady pumping rhythm.",
    price: 450, lvl: 5, shells: 5, pellets: 8, spread: 14, reload: 1.5, cooldown: 0.3,
  },
  semi: {
    name: "Semi-Auto", desc: "Fast follow-ups, looser spread.",
    price: 1000, lvl: 8, shells: 6, pellets: 8, spread: 16, reload: 1.1, cooldown: 0.15,
  },
};
const GUN_ORDER = ["sbs", "ou", "pump", "semi"];

// ---------------------------------------------------------------- sites
// spawn: [speciesId, weight] pairs. interval: seconds between spawns.
const SITES = {
  home: {
    name: "Home Field", desc: "Golden stubble at dusk. Pigeon country.",
    price: 0, lvl: 1, bg: "home", wind: false,
    interval: [0.9, 2.2],
    spawn: [["feral", 62], ["wood", 28], ["jackdaw", 8], ["owl", 2]],
  },
  pasture: {
    name: "The Walled Pasture", desc: "Hay rows behind the drystone wall.",
    price: 250, lvl: 3, bg: "pasture", wind: false,
    interval: [0.85, 2.0],
    spawn: [["feral", 26], ["wood", 20], ["jackdaw", 14], ["crow", 14],
            ["duck", 18], ["lapwing", 5], ["owl", 3]],
  },
  brow: {
    name: "Foxglove Brow", desc: "High moor edge. Game birds and wind.",
    price: 700, lvl: 6, bg: "brow", wind: true,
    interval: [0.8, 1.9],
    spawn: [["wood", 16], ["jackdaw", 10], ["crow", 12], ["duck", 12],
            ["partridge", 17], ["pheasant", 15], ["grouse", 10],
            ["lapwing", 5], ["owl", 3]],
  },
};
const SITE_ORDER = ["home", "pasture", "brow"];

function weightedPick(pairs) {
  let total = 0;
  for (const [, w] of pairs) total += w;
  let r = Math.random() * total;
  for (const [id, w] of pairs) {
    r -= w;
    if (r <= 0) return id;
  }
  return pairs[pairs.length - 1][0];
}
