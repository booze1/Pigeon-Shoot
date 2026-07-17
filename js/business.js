"use strict";

// The estate's business layer. Everything here runs on wall-clock
// timestamps, so contracts keep selling and mounts keep curing while the
// game is closed — progress is computed on return.
const Biz = {
  CONTRACT_PRICE: 120,
  CONTRACT_LVL: 3,
  CONTRACT_INTERVAL: 20e3,      // one bird every 20s
  CONTRACT_MULT: 1.5,           // 150% of base meat price
  TAXI_PRICE: 350,
  TAXI_LVL: 5,
  TAXI_TIME: 4 * 60e3,          // 4 minutes per mount
  TAXI_SELL_MULT: 8,
  TROPHY_BUFF: 0.06,            // +6% all income per displayed trophy
  ORDER_GAP: 60e3,              // pause between orders
  MAX_OFFLINE: 8 * 3600e3,      // idle progress caps at 8 hours

  buffMult() {
    return 1 + state.trophies.length * this.TROPHY_BUFF;
  },

  // ---------------------------------------------------------------- larder
  addToLarder(id) {
    state.larder[id] = (state.larder[id] || 0) + 1;
  },

  larderCount() {
    let n = 0;
    for (const id in state.larder) n += state.larder[id];
    return n;
  },

  larderValue() {
    let v = 0;
    for (const id in state.larder) v += state.larder[id] * SPECIES[id].value;
    return Math.round(v * this.buffMult());
  },

  larderIds() {
    return Object.keys(state.larder).sort(
      (a, b) => state.larder[b] - state.larder[a]);
  },

  takeFromLarder(id, n = 1) {
    if (!state.larder[id]) return false;
    state.larder[id] -= n;
    if (state.larder[id] <= 0) delete state.larder[id];
    return true;
  },

  sellSpecies(id) {
    const n = state.larder[id] || 0;
    if (!n) return 0;
    const cash = Math.round(n * SPECIES[id].value * this.buffMult());
    delete state.larder[id];
    state.money += cash;
    state.dirty = true;
    return cash;
  },

  sellAll() {
    const cash = this.larderValue();
    state.larder = {};
    state.money += cash;
    state.dirty = true;
    return cash;
  },

  // ---------------------------------------------------------------- taxidermy
  canMount(id) {
    return state.taxidermyOwned && !state.mounting && !state.mountReady &&
      SPECIES[id].rarity === "rare" && state.larder[id] > 0;
  },

  startMount(id) {
    if (!this.canMount(id)) return false;
    this.takeFromLarder(id);
    state.mounting = id;
    state.mountDoneAt = Date.now() + this.TAXI_TIME;
    state.dirty = true;
    return true;
  },

  mountSellValue(id) {
    return Math.round(SPECIES[id].value * this.TAXI_SELL_MULT * this.buffMult());
  },

  collectSell() {
    if (!state.mountReady) return 0;
    const cash = this.mountSellValue(state.mountReady);
    state.money += cash;
    state.mountReady = null;
    state.dirty = true;
    return cash;
  },

  collectDisplay() {
    if (!state.mountReady) return false;
    if (!state.trophies.includes(state.mountReady)) {
      state.trophies.push(state.mountReady);
    }
    state.mountReady = null;
    state.dirty = true;
    return true;
  },

  // ---------------------------------------------------------------- orders
  orderableSpecies() {
    const set = new Set();
    for (const siteId of state.sitesOwned) {
      for (const [id] of SITES[siteId].spawn) {
        if (SPECIES[id].rarity !== "protected") set.add(id);
      }
    }
    return [...set];
  },

  genOrder(now) {
    const pool = this.orderableSpecies();
    const items = [];
    const first = pick(pool);
    items.push([first, randInt(4, 7)]);
    if (pool.length > 1 && Math.random() < 0.7) {
      let second = pick(pool);
      while (second === first) second = pick(pool);
      items.push([second, randInt(2, 4)]);
    }
    let value = 0;
    for (const [id, n] of items) value += SPECIES[id].value * n;
    const buyers = ["The Fleece Inn", "The village butcher", "Ma Thistlewood",
                    "The shooting lodge", "Farmer Metcalfe"];
    state.order = {
      buyer: pick(buyers),
      items,
      pay: Math.round(value * 2.2),
      expiresAt: now + randInt(6, 10) * 60e3,
    };
  },

  canFulfil() {
    if (!state.order) return false;
    for (const [id, n] of state.order.items) {
      if ((state.larder[id] || 0) < n) return false;
    }
    return true;
  },

  fulfil() {
    if (!this.canFulfil()) return 0;
    for (const [id, n] of state.order.items) this.takeFromLarder(id, n);
    const cash = Math.round(state.order.pay * this.buffMult());
    state.money += cash;
    state.order = null;
    state.nextOrderAt = Date.now() + this.ORDER_GAP;
    state.dirty = true;
    return cash;
  },

  // ---------------------------------------------------------------- clock
  // Advances every timed system to `now`. Returns human-readable events —
  // used live for popups and on load for the "while you were away" report.
  process(now) {
    const events = [];

    // Butcher's contract sells one larder bird per interval
    if (state.contractOwned) {
      if (!state.contractNextAt || state.contractNextAt > now + this.CONTRACT_INTERVAL) {
        state.contractNextAt = now + this.CONTRACT_INTERVAL;
      }
      let sold = 0, gain = 0, guard = 0;
      while (now >= state.contractNextAt && guard++ < 3000) {
        const ids = this.larderIds();
        if (!ids.length) {
          state.contractNextAt = now + this.CONTRACT_INTERVAL;
          break;
        }
        const id = ids[0];
        this.takeFromLarder(id);
        const cash = Math.round(SPECIES[id].value * this.CONTRACT_MULT * this.buffMult());
        state.money += cash;
        sold++;
        gain += cash;
        state.contractNextAt += this.CONTRACT_INTERVAL;
      }
      if (sold > 0) {
        state.dirty = true;
        events.push({ kind: "contract", sold, gain,
          text: "Butcher collected " + sold + " bird" + (sold > 1 ? "s" : "") +
                "  +\u00a3" + gain });
      }
    }

    // Taxidermy finishes
    if (state.mounting && now >= state.mountDoneAt) {
      state.mountReady = state.mounting;
      state.mounting = null;
      state.dirty = true;
      events.push({ kind: "mount",
        text: SPECIES[state.mountReady].name + " mount is ready" });
    }

    // Orders expire and regenerate
    if (state.order && now > state.order.expiresAt) {
      events.push({ kind: "orderExpired",
        text: "Order from " + state.order.buyer + " expired" });
      state.order = null;
      state.nextOrderAt = now + this.ORDER_GAP;
      state.dirty = true;
    }
    if (!state.order && state.level >= 2 && now >= (state.nextOrderAt || 0)) {
      this.genOrder(now);
      state.dirty = true;
      events.push({ kind: "orderNew",
        text: "New order: " + state.order.buyer + " pays \u00a3" + state.order.pay });
    }

    return events;
  },
};
