"use strict";

// In-canvas menus: HUD chips open the gun shop / site select. The world
// pauses while a panel is open. Works identically for mouse and touch.
const UI = {
  open: null,          // null | "guns" | "sites"
  hits: [],            // {x, y, w, h, cb} rebuilt every rendered frame
  note: null,          // {text, t} small feedback line inside the panel

  chipRects: [
    { id: "guns", label: "GUNS", x: 96, y: 6, w: 38, h: 13 },
    { id: "sites", label: "SITES", x: 138, y: 6, w: 42, h: 13 },
  ],

  toggle(id) {
    this.open = this.open === id ? null : id;
    this.note = null;
    Sfx.click();
  },

  close() {
    this.open = null;
    this.note = null;
  },

  // Returns true if the pointer event was consumed by UI.
  pointer(x, y) {
    for (const h of this.hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        h.cb();
        return true;
      }
    }
    if (this.open) {   // tap outside the panel closes it
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

  // ------------------------------------------------------------ drawing
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
    }
    if (this.open) this.drawPanel(ctx);
  },

  drawPanel(ctx) {
    const px = 40, py = 26, pw = 400, ph = 218;
    ctx.fillStyle = "rgba(8,10,14,0.6)";
    ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = "#191c24";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#ffd45e";
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

    const title = this.open === "guns" ? "GUN CABINET" : "SHOOTING SITES";
    outlineText(title, px + pw / 2, py + 6, "#ffd45e",
      "bold 11px 'Courier New', monospace", "center");

    // Close button
    const cx = px + pw - 18, cy = py + 4, cs = 14;
    ctx.fillStyle = "#2a2118";
    ctx.fillRect(cx, cy, cs, cs);
    outlineText("X", cx + cs / 2, cy + 3, "#e0574a",
      "bold 9px 'Courier New', monospace", "center");
    this.hits.push({ x: cx, y: cy, w: cs, h: cs, cb: () => { this.close(); Sfx.click(); } });

    const ids = this.open === "guns" ? GUN_ORDER : SITE_ORDER;
    const defs = this.open === "guns" ? GUNS : SITES;
    const owned = this.open === "guns" ? state.gunsOwned : state.sitesOwned;
    const equipped = this.open === "guns" ? state.gunId : state.siteId;

    const rowH = this.open === "guns" ? 42 : 52;
    let ry = py + 24;
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
      outlineText(def.desc, px + 16, ry + 17, "#b9bfae",
        "8px 'Courier New', monospace");
      ctx.globalAlpha = 1;
      if (this.open === "guns") {
        outlineText(
          `${def.shells} shells  spread ${def.spread}  reload ${def.reload}s`,
          px + 16, ry + 27, "#8d94a5", "8px 'Courier New', monospace");
      } else if (def.spawn) {
        const rare = def.spawn.filter(([s]) => SPECIES[s].rarity === "rare").length;
        outlineText(
          rare ? "Game birds fly here" : "Everyday birds",
          px + 16, ry + 27, "#8d94a5", "8px 'Courier New', monospace");
        if (def.wind) outlineText("Windy", px + 16, ry + 37, "#7db6ff",
          "8px 'Courier New', monospace");
      }

      // Right-hand action
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

      const row = { x: px + 8, y: ry, w: pw - 16, h: rowH - 6 };
      this.hits.push({
        ...row,
        cb: () => this.rowAction(id, def, isOwned, isEquipped, levelOk, affordable),
      });
      ry += rowH;
    }

    if (this.note) {
      outlineText(this.note.text, px + pw / 2, py + ph - 14, "#ffef9e",
        "bold 8px 'Courier New', monospace", "center");
    }
  },

  rowAction(id, def, isOwned, isEquipped, levelOk, affordable) {
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
};
