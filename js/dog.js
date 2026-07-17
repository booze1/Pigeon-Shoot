"use strict";

// The schnauzer. Patrols the foreground and retrieves downed birds
// for a small bonus. Purely good boy.
const Dog = {
  x: 70,
  y: 250,          // top of sprite; feet sit near the bottom edge
  dir: 1,
  state: "idle",   // idle | fetch | carry
  target: null,    // corpse being fetched
  carryT: 0,
  wanderT: 2,
  wanderTo: 120,
  frame: 0,
  frameT: 0,

  reset() {
    this.x = 70;
    this.dir = 1;
    this.state = "idle";
    this.target = null;
  },

  update(dt, corpses, onFetch) {
    // Claim the nearest corpse if free
    if (this.state === "idle" && corpses.length) {
      let best = null, bestD = 1e9;
      for (const cp of corpses) {
        const d = Math.abs(cp.x - this.x);
        if (d < bestD) { bestD = d; best = cp; }
      }
      this.target = best;
      this.state = "fetch";
    }

    let moving = false;
    if (this.state === "fetch") {
      if (!this.target || corpses.indexOf(this.target) === -1) {
        this.state = "idle";
        this.target = null;
      } else {
        const dx = this.target.x - this.x;
        this.dir = dx < 0 ? -1 : 1;
        const speed = 62;
        if (Math.abs(dx) > 5) {
          this.x += Math.sign(dx) * speed * dt;
          moving = true;
        } else {
          corpses.splice(corpses.indexOf(this.target), 1);
          this.target = null;
          this.state = "carry";
          this.carryT = 0.9;
          onFetch(this.x);
        }
      }
    } else if (this.state === "carry") {
      this.carryT -= dt;
      if (this.carryT <= 0) this.state = "idle";
    } else {
      // gentle wander
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(2.5, 6);
        this.wanderTo = rand(30, 450);
      }
      const dx = this.wanderTo - this.x;
      if (Math.abs(dx) > 6) {
        this.dir = dx < 0 ? -1 : 1;
        this.x += Math.sign(dx) * 26 * dt;
        moving = true;
      }
    }

    this.frameT += dt;
    if (moving) {
      this.frame = Math.floor(this.frameT / 0.14) % 2;
    } else {
      this.frame = 0;
    }
  },

  draw(ctx) {
    const spr = DOG_SPRITES[this.frame];
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.dir, 1);
    ctx.drawImage(spr, -DOG_W / 2, -DOG_H / 2);
    ctx.restore();
  },
};
