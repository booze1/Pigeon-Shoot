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
  longfowler: {
    name: "The Longfowler", desc: "One colossal cloud. Brace-hunter's gun.",
    price: 2500, lvl: 9, shells: 1, pellets: 18, spread: 26, reload: 1.7, cooldown: 0.2,
  },
  curlewgun: {
    name: "The Curlew Gun", desc: "Gilded, tight and true. Fit for a legend.",
    price: 6000, lvl: 12, shells: 3, pellets: 12, spread: 8, reload: 0.55, cooldown: 0.11,
  },
};
const GUN_ORDER = ["sbs", "ou", "pump", "semi", "longfowler", "curlewgun"];

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
  lawn: {
    name: "The Farmhouse Lawn", desc: "Shoot from the deckchair, pint in hand.",
    price: 1500, lvl: 8, bg: "lawn", wind: false,
    interval: [0.8, 1.8],
    spawn: [["wood", 16], ["feral", 12], ["jackdaw", 10], ["duck", 14],
            ["snipe", 14], ["woodcock", 11], ["kingfisher", 7],
            ["owl", 4], ["lapwing", 3]],
  },
  hamlet: {
    name: "Stonebeck Hamlet", desc: "Over the rooftops at dusk. Busy skies.",
    price: 3200, lvl: 10, bg: "hamlet", wind: false,
    interval: [0.55, 1.4],
    spawn: [["wood", 15], ["feral", 12], ["jackdaw", 12], ["crow", 12],
            ["duck", 12], ["pheasant", 10], ["partridge", 8],
            ["snipe", 6], ["woodcock", 5],
            ["owl", 5], ["lapwing", 4], ["curlew", 4]],
  },
  barn: {
    name: "Curlew Barn", desc: "Golden hour, forever. Home of the legend.",
    price: 8000, lvl: 12, bg: "barn", wind: true, curlewLegal: true,
    interval: [0.9, 2.0],
    spawn: [["wood", 14], ["crow", 12], ["grouse", 16], ["partridge", 14],
            ["pheasant", 12], ["snipe", 8], ["curlew", 12], ["owl", 4]],
  },
};
const SITE_ORDER = ["home", "pasture", "brow", "lawn", "hamlet", "barn"];

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
