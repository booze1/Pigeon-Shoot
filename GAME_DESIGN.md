# Pigeon Slash — Game Design Document

A progressive pixel-art bird shooting game set in the Yorkshire Dales. Birds fly
across the screen, you aim and shoot, earn money and XP, upgrade guns, unlock new
shooting sites, and build a game-bird business on the side. The crown jewel of the
game is the **Golden Curlew**, a legendary bird that only ever appears at
**Curlew Barn**.

---

## 1. Vision & Pillars

1. **Shooting must feel great.** Every shot has weight: muzzle flash, recoil,
   screen kick, feather bursts, shell casings, satisfying reload. Juice first.
2. **Always progressing.** Even short sessions produce money, XP, and unlocks.
   Passive income continues while away, so the game "levels up over time."
3. **Collection & rarity.** A bird almanac with commons through legendaries.
   Rare spawns are events — the screen tells you something special has arrived.
4. **A working estate.** Shooting feeds a business: sell meat, stuff trophies,
   fulfil orders, reinvest into better guns and new land.
5. **Rooted in a real place.** Backdrops are pixel-art renditions of the
   reference photos: stubble fields, drystone walls, hazy Dales hills, a
   farmhouse lawn, a stone hamlet, and the mythic Curlew Barn.

## 2. Platform & Tech (recommendation)

- **Browser game**, single-page, HTML5 Canvas, no server. Runs anywhere,
  instantly shareable, saves via `localStorage`.
- Plain JavaScript (ES modules) + Canvas 2D. No heavy engine needed for a
  side-scrolling shooter; we keep full control of the pixel-art pipeline
  (integer scaling, crunchy low-res render upscaled with
  `image-rendering: pixelated`).
- Internal resolution ~480×270 (16:9) scaled to fit the window — classic
  pixel-art look, cheap to render, easy parallax.
- All art authored as code-drawn sprites / embedded sprite sheets in a limited
  palette per location, derived from the photos' colour grading (golden stubble,
  sage greens, slate stone, haze-blue hills).

## 3. Core Loop

1. Pick a **site** (location) and a **gun**.
2. Birds stream across in waves; aim with mouse, click to shoot, reload
   manually (R or click-when-empty) — reload timing is part of the skill.
3. Downed birds are retrieved by your **dog** and go to the **Game Larder**.
4. Back at the farm: sell meat, send rare birds to **taxidermy**, fulfil
   **orders**, buy upgrades, unlock sites.
5. Repeat with better gear, rarer birds, bigger numbers.

A session at a site is untimed free-play by default, with optional timed
**Drives** (challenge rounds) for bonus pay.

## 4. Shooting Mechanics (the fun part)

- **Shot spread**: shotguns fire a pellet cone, not a hitscan point. Leading a
  crossing bird and catching two in one cloud is the core skill.
- **Brace Bonus**: two birds with one shot = instant cash bonus + big feedback.
- **Combo meter**: consecutive hits build a multiplier (×1 → ×5). A miss decays
  it rather than zeroing it, so it feels forgiving but worth protecting.
- **Reload rhythm**: 2-shell double barrel forces pacing; pump and semi-auto
  change the rhythm rather than being strictly better.
- **Slow-mo rare entrance**: when a rare+ bird spawns, brief time dilation and a
  golden glint so you never miss the moment (but can still miss the shot).
- **Protected species**: barn owls, lapwings and (everywhere except Curlew
  Barn) curlews cross the screen too. Shooting one costs a fine and your combo.
  Trigger discipline becomes a mechanic.
- **Wind** (unlocked at later sites): a wind arrow drifts your pellet cloud;
  adds mastery without hurting early game.
- **Ammo types**: birdshot (wide, weak), heavy shot (tight, strong), and
  specialty rounds bought per-session for hard birds.
- **The Dog**: a grey schnauzer (from the lawn photo) trots along the bottom of
  the screen retrieving downed birds. Upgradeable: retrieval speed, chance to
  find spent-shell refunds, chance to flush a bonus bird. Purely charming +
  economy-relevant, never punishing.

## 5. Birds & Rarity

| Rarity | Colour | Examples | Notes |
|---|---|---|---|
| Common | white | Feral Pigeon, Wood Pigeon | Bread and butter, steady flight |
| Uncommon | green | Crow, Jackdaw, Duck | Crows jink; ducks fly in lines |
| Rare | blue | Pheasant, Partridge, Grouse | Faster, higher value, flushes low |
| Epic | purple | Woodcock, Snipe, Kingfisher | Erratic zig-zag flight, small hitbox |
| Legendary | gold | **Golden Curlew** | **Curlew Barn only.** See below |
| Protected | red outline | Barn Owl, Lapwing, Curlew (normal) | Do NOT shoot |

Each species has: flight pattern, speed, hitbox size, meat value, trophy value,
and almanac entry. The **Almanac** tracks first kill, total kills, and best
specimen per species — completing pages grants permanent perks.

### The Golden Curlew
- Spawns **only at Curlew Barn**, rarely (roughly one chance per few minutes of
  play, weighted up by upgrades like the Curlew Caller).
- Announced by a distinctive call, a dimming sky, and a golden light sweep.
- Fast, gliding, hard arc. One pass only — miss it and it's gone.
- A downed Golden Curlew is the game's biggest prize: enormous taxidermy value,
  an almanac page of its own, and the endgame goal is a perfect mounted
  specimen in the trophy room.
- Twist for depth: at every other site curlews are protected. Curlew Barn is
  the licensed exception — reinforces the site's mythology.

## 6. Guns

Progression ladder (each with pixel-art model, sound, reload animation):

1. **Garden Air Rifle** — starter. Single pellet, slow reload. Free.
2. **Old Side-by-Side** — first shotgun. 2 shells, wide spread.
3. **Over-and-Under** — tighter spread, faster reload.
4. **Pump Action** — 5 shells, rhythm reload between shots.
5. **Semi-Auto** — fast follow-ups, mild spread penalty.
6. **The Longfowler** — huge one-shot cone, very slow reload (brace-bonus toy).
7. **Curlew Gun** (endgame, sold only at Curlew Barn) — tight, fast, gilded.

Per-gun upgrade tracks (choke = tighter spread, stock = less recoil sway,
barrels = damage, magazine = capacity) so old guns stay viable to invest in.

## 7. Sites (from the reference photos)

Unlock order, each a parallax pixel-art scene with its own palette, bird mix,
and ambience:

1. **Home Field** *(photo: stubble field with long evening shadows)* —
   golden stubble foreground, farmhouse on the horizon, pink-blue dusk sky.
   Commons only. Tutorial home.
2. **The Walled Pasture** *(photo: drystone wall and hay rows)* — wall running
   up the foreground, cut hay lines, green valley behind. Adds crows, ducks;
   introduces protected lapwings.
3. **Foxglove Brow** *(photo: hazy valley with foxgloves)* — high moor edge,
   purple foxgloves in the foreground grass, vast hazy patchwork valley. Adds
   game birds (pheasant/partridge/grouse) and wind.
4. **The Farmhouse Lawn** *(photo: lawn, wicker chair, beer, schnauzer)* — you
   shoot from the garden, pint on the table, the dog sleeping until a bird
   drops. Adds epics (snipe, woodcock). Where you recruit/upgrade the dog.
5. **Stonebeck Hamlet** *(photo: stone barns, gates, Land Rovers)* — shooting
   over the rooftops at dusk, chimneys and drystone walls in silhouette. Dense
   mixed traffic, highest normal-site earnings, strict protected-species rules.
6. **Curlew Barn** *(finale)* — a lone gritstone barn on the moor at golden
   hour, long light, dust motes. Expensive to unlock. The only home of the
   Golden Curlew. Distinct audio (curlew calls) and a permanent golden-hour sky.

Each site sells a **hide upgrade** (spawn rate), **decoys** (attract specific
species), and a **caller** (raises rare odds at that site).

## 8. Business Layer (the estate)

Money flows: shoot → larder → process → sell/fulfil → reinvest.

- **Game Larder**: downed birds accumulate as meat + feathers. Sell instantly at
  base price, or…
- **The Butcher's Contract** (passive income): assign a standing contract —
  meat auto-sells over time at a better rate. This is the idle engine: it keeps
  paying while the game is closed (computed on return from timestamps).
- **Taxidermy Workshop**: rare+ birds can be mounted instead of sold. Mounting
  takes real time (minutes → hours for legendaries). Mounted birds either:
  - **Sell** for a large lump sum, or
  - **Display** in the **Trophy Room** for a permanent global buff
    (e.g. mounted Pheasant: +5% meat prices; mounted Golden Curlew: +25%
    everything). Collection = power.
- **Village Orders**: rotating timed requests ("The Fleece Inn wants 8 wood
  pigeons and a brace of pheasant before sundown") paying well above market.
  Encourages visiting different sites for different species.
- **Feather & Fletching stall**: small trickle income per bird ever shot —
  a "number always goes up" comfort stat.
- **Staff** (late game): hire a beater (spawn rate), a plucker (auto-process
  faster), a shop lad (better sell prices) — classic idle-game multipliers.

## 9. Progression & Leveling

- **XP** from every hit (scaled by rarity, combo, distance). Level-ups grant
  skill points spent on a small perk tree:
  - *Marksman* branch: tighter spread, longer slow-mo, steadier aim.
  - *Poacher's Eye* branch: rare spawn odds, bird value, almanac bonuses.
  - *Estate* branch: contract rates, taxidermy speed, order payouts.
- **Automatic progress over time**: contracts, taxidermy, and the feather stall
  all advance in real time, so returning players always come back to money and
  a finished mount or two — fuelling the "buy better things" loop even in
  short sessions.
- **Seasons (prestige)**: after mounting the Golden Curlew, optionally start a
  new Season: sites and guns reset, but Trophy Room buffs and almanac perks
  persist, plus a Season badge and escalating golden-bird variants
  (Silver Woodcock, Emerald Kingfisher…) for long-tail chase.

## 10. Feel, Audio & UI

- Crunchy layered SFX: distinct bang per gun, echo tail over the valley, wing
  flutter, dog bark on retrieve, till "cha-ching" on sales, haunting curlew cry.
- Ambient loop per site (wind, skylarks, distant tractor).
- HUD: shells, money, XP bar, combo meter, wind arrow — all diegetic-ish pixel
  UI in the corners; crosshair replaces cursor.
- Big readable damage/cash popups; feathers persist briefly on the ground.
- Colour-grade each site to its photo (dusk golds, hazy blues, lawn greens).

## 11. Build Order (once we start coding)

1. **M1 – It shoots**: one site (Home Field), crosshair, one shotgun with
   spread, pigeons crossing, feathers, money counter, localStorage save.
2. **M2 – It progresses**: XP/levels, gun shop, 3 sites, rarity table, combo,
   protected species, the dog.
3. **M3 – It's a business**: larder, contracts (offline income), taxidermy,
   trophy room, village orders.
4. **M4 – The legend**: remaining sites, Curlew Barn + Golden Curlew event,
   perk tree, almanac, seasons, audio polish.

Each milestone is a playable, saveable game — we can stop or reprioritise at
any point.
