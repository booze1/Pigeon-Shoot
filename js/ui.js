"use strict";

// In-canvas menus. GUNS / SITES are simple lists; ESTATE is a tabbed
// panel for the business layer. The world pauses while a panel is open
// (the business clock keeps running — it's timestamp-based).
const UI = {
  open: null,          // null | "guns" | "sites" | "estate"
  tab: "larder",       // estate tab: larder | orders | trophies
  hits: [],
  note: null,

  chipRects: [
    { id: "guns", label: "GUNS", x: 96, y: 6, w: 38, h: 13 },
    { id: "sites", label: "SITES", x: 138, y: 6, w: 42, h: 13 },
    { id: "estate", label: "ESTATE", x: 184, y: 6, w: 48, h: 13 },
  ],

  PX: 40, PY: 26, PW: 400, PH: 218,

  toggle(id) {
    this.open = this.open === id ? null : id;
    this.note = null;
    Sfx.click();
  },

  close() {
    this.open = null;
    this.note = null;
  },

  pointer(x, y) {
    for (const h of this.hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        h.cb();
        return true;
      }
    }
    if (this.open) {
      this.close();
      Sfx.click();
      return true;
    }
    return false;
  },

  say(text) {
    this.note = { text, t: 2.2 };
  },

  update(dt) {
    if (this.note && (this.note.t -= dt) <= 0) this.note = null;
  },

  // ------------------------------------------------------------ helpers
  button(ctx, x, y, w, h, label, enabled, color, cb) {
    ctx.fillStyle = enabled ? "#2e2a18" : "#20222a";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = enabled ? color : "#4a4e58";
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    outlineText(label, x + w / 2, y + 2, enabled ? color : "#6b7080",
      "bold 8px 'Courier New', monospace", "center");
    if (enabled) this.hits.push({ x, y, w, h, cb });
  },

  panelFrame(ctx, title) {
    ctx.fillStyle = "rgba(8,10,14,0.6)";
    ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = "#191c24";
    ctx.fillRect(this.PX, this.PY, this.PW, this.PH);
    ctx.strokeStyle = "#ffd45e";
    ctx.strokeRect(this.PX + 0.5, this.PY + 0.5, this.PW - 1, this.PH - 1);
    outlineText(title, this.PX + this.PW / 2, this.PY + 6, "#ffd45e",
      "bold 11px 'Courier New', monospace", "center");
    const cx = this.PX + this.PW - 18, cy = this.PY + 4, cs = 14;
    ctx.fillStyle = "#2a2118";
    ctx.fillRect(cx, cy, cs, cs);
    outlineText("X", cx + cs / 2, cy + 3, "#e0574a",
      "bold 9px 'Courier New', monospace", "center");
    this.hits.push({ x: cx, y: cy, w: cs, h: cs, cb: () => { this.close(); Sfx.click(); } });
  },

  // ------------------------------------------------------------ chips + badge
  drawChips(ctx) {
    this.hits = [];
    for (const chip of this.chipRects) {
      const active = this.open === chip.id;
      ctx.fillStyle = active ? "#3a2f14" : "#15140e";
      ctx.fillRect(chip.x, chip.y, chip.w, chip.h);
      ctx.strokeStyle = active ? "#ffd45e" : "#6b6248";
      ctx.lineWidth = 1;
      ctx.strokeRect(chip.x + 0.5, chip.y + 0.5, chip.w - 1, chip.h - 1);
      outlineText(chip.label, chip.x + chip.w / 2, chip.y + 3,
        active ? "#ffd45e" : "#cfc9b4", "bold 8px 'Courier New', monospace", "center");
      this.hits.push({ ...chip, cb: () => this.toggle(chip.id) });

      if (chip.id === "estate") {
        const n = Biz.larderCount();
        if (n > 0) {
          outlineText(String(n), chip.x + chip.w + 3, chip.y + 3, "#ffd45e",
            "bold 8px 'Courier New', monospace");
        }
        // Alert dot: an order you can fulfil, or a finished mount
        if ((Biz.canFulfil() || state.mountReady) &&
            Math.floor(state.time * 2) % 2 === 0) {
          ctx.fillStyle = "#e0574a";
          ctx.fillRect(chip.x + chip.w - 3, chip.y - 2, 4, 4);
        }
      }
    }
    if (this.open === "guns" || this.open === "sites") this.drawShop(ctx);
    if (this.open === "estate") this.drawEstate(ctx);
  },

  // ------------------------------------------------------------ guns/sites
  drawShop(ctx) {
    this.panelFrame(ctx, this.open === "guns" ? "GUN CABINET" : "SHOOTING SITES");
    const px = this.PX, pw = this.PW;

    const ids = this.open === "guns" ? GUN_ORDER : SITE_ORDER;
    const defs = this.open === "guns" ? GUNS : SITES;
    const owned = this.open === "guns" ? state.gunsOwned : state.sitesOwned;
    const equipped = this.open === "guns" ? state.gunId : state.siteId;

    const rowH = this.open === "guns" ? 42 : 52;
    let ry = this.PY + 24;
    for (const id of ids) {
      const def = defs[id];
      const isOwned = owned.includes(id);
      const isEquipped = id === equipped;
      const affordable = state.money >= def.price;
      const levelOk = state.level >= def.lvl;

      ctx.fillStyle = isEquipped ? "#242c1c" : "#20242e";
      ctx.fillRect(px + 8, ry, pw - 16, rowH - 6);
      ctx.strokeStyle = isEquipped ? "#9fe08a" : "#3a3f4c";
      ctx.strokeRect(px + 8.5, ry + 0.5, pw - 17, rowH - 7);

      outlineText(def.name, px + 16, ry + 5,
        isEquipped ? "#9fe08a" : "#f0ead2", "bold 9px 'Courier New', monospace");
      ctx.globalAlpha = 0.85;
      outlineText(def.desc, px + 16, ry + 17, "#b9bfae", "8px 'Courier New', monospace");
      ctx.globalAlpha = 1;
      if (this.open === "guns") {
        outlineText(
          `${def.shells} shells  spread ${def.spread}  reload ${def.reload}s`,
          px + 16, ry + 27, "#8d94a5", "8px 'Courier New', monospace");
      } else {
        const rare = def.spawn.filter(([s]) => SPECIES[s].rarity === "rare").length;
        outlineText(rare ? "Game birds fly here" : "Everyday birds",
          px + 16, ry + 27, "#8d94a5", "8px 'Courier New', monospace");
        if (def.wind) outlineText("Windy", px + 16, ry + 37, "#7db6ff",
          "8px 'Courier New', monospace");
      }

      let action, color;
      if (isEquipped) {
        action = this.open === "guns" ? "IN HAND" : "HERE";
        color = "#9fe08a";
      } else if (isOwned) {
        action = this.open === "guns" ? "EQUIP" : "TRAVEL";
        color = "#ffd45e";
      } else if (!levelOk) {
        action = "LVL " + def.lvl;
        color = "#e0574a";
      } else {
        action = "\u00a3" + def.price;
        color = affordable ? "#ffd45e" : "#77705a";
      }
      outlineText(action, px + pw - 20, ry + 14, color,
        "bold 9px 'Courier New', monospace", "right");

      this.hits.push({
        x: px + 8, y: ry, w: pw - 16, h: rowH - 6,
        cb: () => this.shopAction(id, def, isOwned, isEquipped, levelOk, affordable),
      });
      ry += rowH;
    }
    this.drawNote(ctx);
  },

  shopAction(id, def, isOwned, isEquipped, levelOk, affordable) {
    if (isEquipped) return;
    if (isOwned) {
      if (this.open === "guns") equipGun(id);
      else travelTo(id);
      Sfx.click();
      this.close();
      return;
    }
    if (!levelOk) {
      Sfx.deny();
      this.say("Reach level " + def.lvl + " first");
      return;
    }
    if (!affordable) {
      Sfx.deny();
      this.say("Need \u00a3" + (def.price - state.money) + " more");
      return;
    }
    state.money -= def.price;
    if (this.open === "guns") {
      state.gunsOwned.push(id);
      equipGun(id);
    } else {
      state.sitesOwned.push(id);
      travelTo(id);
    }
    Sfx.buy();
    Haptics.kill();
    state.dirty = true;
    state.saveTimer = 0;
    this.close();
  },

  // ------------------------------------------------------------ estate
  drawEstate(ctx) {
    this.panelFrame(ctx, "THE ESTATE");
    const px = this.PX, py = this.PY, pw = this.PW;

    // Tabs
    const tabs = [
      ["larder", "LARDER"],
      ["orders", "ORDERS"],
      ["trophies", "TROPHY"],
      ["perks", "PERKS"],
      ["almanac", "BIRDS"],
    ];
    let tx = px + 8;
    for (const [id, label] of tabs) {
      const active = this.tab === id;
      const tw = 73;
      ctx.fillStyle = active ? "#3a2f14" : "#20242e";
      ctx.fillRect(tx, py + 22, tw, 15);
      ctx.strokeStyle = active ? "#ffd45e" : "#3a3f4c";
      ctx.strokeRect(tx + 0.5, py + 22.5, tw - 1, 14);
      let tag = label;
      if (id === "perks" && state.perkPoints > 0) tag = label + "+" + state.perkPoints;
      outlineText(tag, tx + tw / 2, py + 25,
        active ? "#ffd45e" : "#cfc9b4", "bold 8px 'Courier New', monospace", "center");
      const tid = id;
      this.hits.push({ x: tx, y: py + 22, w: tw, h: 15,
        cb: () => { this.tab = tid; Sfx.click(); } });
      tx += tw + 4;
    }

    const cy = py + 44;
    if (this.tab === "larder") this.drawLarder(ctx, cy);
    else if (this.tab === "orders") this.drawOrders(ctx, cy);
    else if (this.tab === "perks") this.drawPerks(ctx, cy);
    else if (this.tab === "almanac") this.drawAlmanac(ctx, cy);
    else this.drawTrophies(ctx, cy);
    this.drawNote(ctx);
  },

  // ------------------------------------------------------------ perks
  drawPerks(ctx, cy) {
    const px = this.PX, pw = this.PW;
    outlineText("Points to spend: " + state.perkPoints, px + 16, cy,
      state.perkPoints > 0 ? "#ffd45e" : "#8d94a5",
      "bold 9px 'Courier New', monospace");
    const perks = [
      ["marksman", "Marksman", "Tighter pellet spread (-4% per rank)"],
      ["poacher", "Poacher's Eye", "Rare & epic birds turn up more (+8% per rank)"],
      ["estate", "Estate Manager", "All income up (+5% per rank)"],
    ];
    let y = cy + 18;
    for (const [id, name, desc] of perks) {
      const rank = state.perks[id];
      outlineText(name, px + 16, y, "#f0ead2", "bold 9px 'Courier New', monospace");
      outlineText(desc, px + 16, y + 12, "#8d94a5", "8px 'Courier New', monospace");
      // rank pips
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < rank ? "#ffd45e" : "#2c3040";
        ctx.fillRect(px + 232 + i * 12, y + 3, 8, 8);
        ctx.strokeStyle = "#565c6a";
        ctx.strokeRect(px + 232.5 + i * 12, y + 3.5, 7, 7);
      }
      const can = state.perkPoints > 0 && rank < 5;
      this.button(ctx, px + pw - 62, y + 1, 46, 14, "TRAIN", can, "#9fe08a", () => {
        state.perks[id]++;
        state.perkPoints--;
        state.dirty = true;
        state.saveTimer = 0;
        Sfx.buy();
        this.say(name + " rank " + state.perks[id]);
      });
      y += 34;
    }
    outlineText("Earn a point at every level.", px + 16, y + 4,
      "#8d94a5", "8px 'Courier New', monospace");
  },

  // ------------------------------------------------------------ almanac
  drawAlmanac(ctx, cy) {
    const px = this.PX;
    const ids = Object.keys(SPECIES);
    const col2 = Math.ceil(ids.length / 2);
    let seen = 0;
    ids.forEach((id, i) => {
      const sp = SPECIES[id];
      const kills = state.killsBySpecies[id] || 0;
      if (kills > 0) seen++;
      const cx2 = px + 16 + (i >= col2 ? 196 : 0);
      const y = cy + 12 + (i % col2) * 17;
      // sprite thumbnail (silhouette until first kill)
      ctx.save();
      if (kills === 0 && sp.rarity !== "protected") ctx.globalAlpha = 0.3;
      ctx.drawImage(SPRITES[id][1], cx2, y - 2, 16, Math.round(16 * sp.shape.h / sp.shape.w));
      ctx.restore();
      const label = sp.rarity === "protected"
        ? sp.name + "  — protected"
        : kills === 0 ? "???" : sp.name;
      outlineText(label, cx2 + 22, y, RARITY_COLORS[sp.rarity],
        "8px 'Courier New', monospace");
      if (kills > 0) {
        outlineText("×" + kills, cx2 + 156, y, "#8d94a5",
          "8px 'Courier New', monospace", "right");
      }
    });
    outlineText("THE ALMANAC — " + seen + "/" +
      ids.filter((i2) => SPECIES[i2].rarity !== "protected").length + " bagged",
      px + 16, cy - 4, "#f0ead2", "bold 9px 'Courier New', monospace");
  },

  drawLarder(ctx, cy) {
    const px = this.PX, pw = this.PW;
    const ids = Biz.larderIds();

    if (!ids.length) {
      outlineText("The larder is empty — go shoot something.", px + pw / 2, cy + 10,
        "#8d94a5", "8px 'Courier New', monospace", "center");
    }
    let y = cy;
    for (const id of ids.slice(0, 8)) {
      const sp = SPECIES[id];
      const n = state.larder[id];
      outlineText(n + "× " + sp.name, px + 16, y + 2, RARITY_COLORS[sp.rarity],
        "bold 8px 'Courier New', monospace");
      outlineText("\u00a3" + sp.value + " ea", px + 190, y + 2, "#8d94a5",
        "8px 'Courier New', monospace");
      this.button(ctx, px + pw - 60, y, 44, 12, "SELL", true, "#ffd45e", () => {
        const cash = Biz.sellSpecies(id);
        this.say("Sold for \u00a3" + cash);
        Sfx.buy();
      });
      if (Biz.canMount(id)) {
        this.button(ctx, px + pw - 112, y, 46, 12, "MOUNT", true, "#7db6ff", () => {
          Biz.startMount(id);
          this.say(SPECIES[id].name + " is at the taxidermist (4 min)");
          Sfx.click();
        });
      }
      y += 15;
    }

    // Footer: sell everything + contract status
    const fy = this.PY + this.PH - 44;
    if (ids.length) {
      this.button(ctx, px + 12, fy, 150, 14, "SELL EVERYTHING \u00a3" + Biz.larderValue(),
        true, "#ffd45e", () => {
          const cash = Biz.sellAll();
          this.say("Cleared the larder for \u00a3" + cash);
          Sfx.buy();
        });
    }
    if (state.contractOwned) {
      outlineText("Butcher's contract: collects 1 bird / 20s at 150%",
        px + 12, fy + 20, "#9fe08a", "8px 'Courier New', monospace");
    } else {
      const ok = state.level >= Biz.CONTRACT_LVL && state.money >= Biz.CONTRACT_PRICE;
      this.button(ctx, px + 12, fy + 18, 210, 14,
        "BUY BUTCHER'S CONTRACT \u00a3" + Biz.CONTRACT_PRICE + " (LVL " + Biz.CONTRACT_LVL + ")",
        ok, "#9fe08a", () => {
          state.money -= Biz.CONTRACT_PRICE;
          state.contractOwned = true;
          state.contractNextAt = Date.now() + Biz.CONTRACT_INTERVAL;
          state.dirty = true;
          Sfx.buy();
          this.say("The butcher now collects while you shoot — even offline");
        });
      outlineText("Auto-sells meat at 150% — even while the game is closed",
        px + 230, fy + 21, "#8d94a5", "8px 'Courier New', monospace");
    }
  },

  drawOrders(ctx, cy) {
    const px = this.PX, pw = this.PW;
    if (!state.order) {
      outlineText("No order on the board just now.", px + pw / 2, cy + 12,
        "#8d94a5", "8px 'Courier New', monospace", "center");
      outlineText("A buyer will come knocking soon...", px + pw / 2, cy + 26,
        "#8d94a5", "8px 'Courier New', monospace", "center");
      return;
    }
    const o = state.order;
    outlineText(o.buyer + " wants:", px + 16, cy, "#f0ead2",
      "bold 9px 'Courier New', monospace");
    let y = cy + 16;
    for (const [id, n] of o.items) {
      const have = state.larder[id] || 0;
      const done = have >= n;
      outlineText(
        Math.min(have, n) + "/" + n + "  " + SPECIES[id].name,
        px + 24, y, done ? "#9fe08a" : "#e0574a",
        "bold 8px 'Courier New', monospace");
      y += 14;
    }
    outlineText("Pays \u00a3" + Math.round(o.pay * Biz.buffMult()), px + 16, y + 4,
      "#ffd45e", "bold 10px 'Courier New', monospace");

    // Time remaining bar
    const remaining = Math.max(0, o.expiresAt - Date.now());
    const total = 10 * 60e3;
    ctx.fillStyle = "#15140e";
    ctx.fillRect(px + 16, y + 22, 180, 6);
    ctx.fillStyle = remaining < 60e3 ? "#e0574a" : "#9fe08a";
    ctx.fillRect(px + 17, y + 23, Math.round(178 * clamp(remaining / total, 0, 1)), 4);
    const mins = Math.floor(remaining / 60e3);
    const secs = Math.floor((remaining % 60e3) / 1000);
    outlineText(mins + ":" + String(secs).padStart(2, "0") + " left",
      px + 204, y + 20, "#8d94a5", "8px 'Courier New', monospace");

    this.button(ctx, px + pw - 100, y + 14, 84, 16, "FULFIL",
      Biz.canFulfil(), "#9fe08a", () => {
        const cash = Biz.fulfil();
        this.say("Order delivered! +\u00a3" + cash);
        Sfx.buy();
        Haptics.brace();
      });
  },

  drawTrophies(ctx, cy) {
    const px = this.PX, pw = this.PW;
    if (!state.taxidermyOwned) {
      outlineText("The old taxidermy workshop stands empty.", px + 16, cy,
        "#b9bfae", "8px 'Courier New', monospace");
      outlineText("Mount rare birds: sell mounts for 8× meat price,", px + 16, cy + 14,
        "#8d94a5", "8px 'Courier New', monospace");
      outlineText("or display them for a permanent +6% to ALL income.", px + 16, cy + 26,
        "#8d94a5", "8px 'Courier New', monospace");
      const ok = state.level >= Biz.TAXI_LVL && state.money >= Biz.TAXI_PRICE;
      this.button(ctx, px + 16, cy + 46, 220, 16,
        "OPEN THE WORKSHOP \u00a3" + Biz.TAXI_PRICE + " (LVL " + Biz.TAXI_LVL + ")",
        ok, "#7db6ff", () => {
          state.money -= Biz.TAXI_PRICE;
          state.taxidermyOwned = true;
          state.dirty = true;
          Sfx.buy();
          this.say("Workshop open — MOUNT rare birds from the larder");
        });
      return;
    }

    if (state.mounting) {
      const left = Math.max(0, state.mountDoneAt - Date.now());
      const mins = Math.floor(left / 60e3);
      const secs = Math.floor((left % 60e3) / 1000);
      outlineText("Mounting: " + SPECIES[state.mounting].name + "  (" +
        mins + ":" + String(secs).padStart(2, "0") + " left)",
        px + 16, cy, "#7db6ff", "bold 8px 'Courier New', monospace");
    } else if (state.mountReady) {
      const id = state.mountReady;
      outlineText("READY: " + SPECIES[id].name + " mount", px + 16, cy,
        "#ffd45e", "bold 9px 'Courier New', monospace");
      this.button(ctx, px + 16, cy + 14, 110, 14,
        "SELL \u00a3" + Biz.mountSellValue(id), true, "#ffd45e", () => {
          const cash = Biz.collectSell();
          this.say("Mount sold for \u00a3" + cash);
          Sfx.buy();
        });
      const already = state.trophies.includes(id);
      const buffPct = Math.round(Biz.trophyBuff(id) * 100);
      this.button(ctx, px + 134, cy + 14, 110, 14,
        already ? "DISPLAYED" : "DISPLAY +" + buffPct + "%", !already, "#9fe08a", () => {
          Biz.collectDisplay();
          this.say("On the trophy wall — +" + buffPct + "% to everything, forever");
          Sfx.fanfare();
        });
    } else {
      outlineText("Workshop idle — MOUNT a rare bird from the larder",
        px + 16, cy, "#8d94a5", "8px 'Courier New', monospace");
    }

    // Trophy wall
    let y = cy + 40;
    outlineText("TROPHY WALL", px + 16, y, "#f0ead2",
      "bold 9px 'Courier New', monospace");
    y += 14;
    if (!state.trophies.length) {
      outlineText("(bare — display a mount to start the collection)",
        px + 16, y, "#8d94a5", "8px 'Courier New', monospace");
    }
    for (const id of state.trophies) {
      // little plaque
      ctx.fillStyle = "#4a3a22";
      ctx.fillRect(px + 16, y, 12, 10);
      ctx.strokeStyle = "#8a6c3c";
      ctx.strokeRect(px + 16.5, y + 0.5, 11, 9);
      const spr = SPRITES[id][1];
      ctx.drawImage(spr, px + 17, y + 2, 10, 7);
      outlineText(SPECIES[id].name + " mount   +" +
        Math.round(Biz.trophyBuff(id) * 100) + "% income", px + 34, y + 1,
        RARITY_COLORS[SPECIES[id].rarity], "8px 'Courier New', monospace");
      y += 14;
    }
    if (state.trophies.length) {
      outlineText("Total: +" + Math.round((Biz.buffMult() - 1) * 100) + "% all income",
        px + 16, y + 4, "#9fe08a", "bold 8px 'Courier New', monospace");
    }
  },

  drawNote(ctx) {
    if (this.note) {
      outlineText(this.note.text, this.PX + this.PW / 2, this.PY + this.PH - 14,
        "#ffef9e", "bold 8px 'Courier New', monospace", "center");
    }
  },
};
