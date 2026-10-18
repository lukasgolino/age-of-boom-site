// Broadside toy: a small canvas teaser for the website. Original code, not a port of the game.
// "Positioning is aiming": cannons fire from the sides only.
import spriteData from "../lib/sprites.json";

type Meta = { w: number; h: number; frames?: number; fps?: number; loop?: boolean; headings?: number; sinking?: { frames: number; fps: number } };
const META = spriteData as Record<string, Meta>;

const W = 384; // internal resolution (16:9)
const H = 216;
const STEP = 1 / 60;
const TAU = Math.PI * 2;
const G = 300; // cannonball gravity, px/s^2
const BALL_SPEED = 135;
const BALL_TIME = 0.85; // seconds of flight -> range ~115 px
const FONT = "8px Silkscreen, monospace";
const BIG_FONT = "16px Silkscreen, monospace";

type Kind = "sloop" | "brig" | "frigate" | "galleon";
type Team = "red" | "blue" | "gold";
const KINDS: Kind[] = ["sloop", "brig", "frigate", "galleon"];

interface Spec {
  hp: number;
  speed: number; // px/s at full sail
  accel: number;
  turn: number; // rad/s
  guns: number; // per side
  len: number; // hull half-length (hit capsule)
  beam: number; // hull half-beam
}
const SPECS: Record<Kind, Spec> = {
  sloop: { hp: 3, speed: 46, accel: 26, turn: 1.7, guns: 2, len: 11, beam: 6 },
  brig: { hp: 5, speed: 40, accel: 22, turn: 1.4, guns: 3, len: 14, beam: 7 },
  frigate: { hp: 8, speed: 35, accel: 18, turn: 1.15, guns: 4, len: 17, beam: 8 },
  galleon: { hp: 12, speed: 30, accel: 14, turn: 0.9, guns: 5, len: 21, beam: 10 },
};

interface Ship {
  kind: Kind;
  team: Team;
  player: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number; // heading, 0 = east, counter-clockwise (screen y is down)
  speed: number;
  sail: number; // 0..3
  hp: number;
  maxHp: number;
  reload: [number, number]; // port, starboard: seconds until ready
  reloadTime: number;
  spread: number;
  turnIn: number;
  fireIn: [boolean, boolean];
  sinkT: number; // -1 while afloat
  flash: number;
  entering: boolean;
  wakeT: number;
  orbit: number; // AI: preferred orbit direction (+1/-1)
  aiT: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  team: Team;
  delay: number;
  ship: Ship; // owner, used to place the gun when the delayed shot goes off
  side: number; // 0 port, 1 starboard
  gun: number; // offset along the hull
  live: boolean;
}

interface Fx {
  name: string;
  x: number;
  y: number;
  t: number;
  rot?: number;
  vx?: number;
  vy?: number;
  alpha?: number;
  anchor?: "center" | "bottom" | "left";
}

interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  t: number;
}

interface Foam {
  x: number;
  y: number;
  t: number;
}

const base = import.meta.env.BASE_URL;
const images = new Map<string, HTMLImageElement>();
function img(name: string): HTMLImageElement {
  let i = images.get(name);
  if (!i) {
    i = new Image();
    i.decoding = "async";
    i.src = `${base}sprites/${name}.png`;
    images.set(name, i);
  }
  return i;
}
function preload(): Promise<unknown> {
  const names = ["water", "cannonball", "explosion_big", "explosion_hit", "splash", "muzzle_flash", "smoke_puff", "fire_large", "geyser", "coin"];
  for (const k of KINDS) for (const t of ["red", "blue", "gold"]) names.push(`${k}_${t}`, `${k}_${t}_sinking`);
  return Promise.all(
    names.map(
      (n) =>
        new Promise<void>((res) => {
          const i = img(n);
          if (i.complete) res();
          else {
            i.onload = () => res();
            i.onerror = () => res();
          }
        }),
    ),
  );
}

const wrapAngle = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Port (left) unit vector for heading a, in screen coordinates. */
function sideVec(a: number, side: number): [number, number] {
  const fx = Math.cos(a);
  const fy = -Math.sin(a);
  return side === 0 ? [fy, -fx] : [-fy, fx];
}

export function mountToy(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const startBtn = root.querySelector<HTMLButtonElement>(".toy-start")!;
  const ctx = canvas.getContext("2d")!;
  const params = new URLSearchParams(location.search);
  const demo = params.has("toy-demo");
  // ?toy-demo=N: simulate N seconds at once and freeze there (deterministic screenshots).
  const freezeAt = Number(params.get("toy-demo")) || 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  let k = 1; // backing-store scale (integer)
  let ships: Ship[] = [];
  let balls: Ball[] = [];
  let fx: Fx[] = [];
  let coins: Coin[] = [];
  let foam: Foam[] = [];
  let player!: Ship;
  let score = 0;
  let time = 0;
  let shake = 0;
  let spawnT = 0;
  let deadT = -1;
  let teamFlip = false;

  let loaded = false;
  let started = demo;
  let focused = false;
  let onScreen = false;
  let rafId = 0;
  let last = 0;
  let acc = 0;
  const keys = new Set<string>();
  const touch = { left: false, right: false, port: false, stbd: false };

  // ---------- world ----------

  function makeShip(kind: Kind, team: Team, x: number, y: number, a: number, isPlayer: boolean): Ship {
    const s = SPECS[kind];
    const hp = isPlayer ? 12 : s.hp;
    return {
      kind,
      team,
      player: isPlayer,
      x,
      y,
      vx: 0,
      vy: 0,
      a,
      speed: isPlayer ? 0 : s.speed * 0.7,
      sail: 2,
      hp,
      maxHp: hp,
      reload: [0, 0],
      reloadTime: isPlayer ? 1.5 : 3.6 + KINDS.indexOf(kind) * 0.2,
      spread: isPlayer ? 0.04 : 0.2,
      turnIn: 0,
      fireIn: [false, false],
      sinkT: -1,
      flash: 0,
      entering: !isPlayer,
      wakeT: 0,
      orbit: Math.random() < 0.5 ? 1 : -1,
      aiT: 0,
    };
  }

  function spawnEnemy(): void {
    const tier = Math.min(3, Math.floor(score / 2));
    const kind = KINDS[Math.max(0, tier - (Math.random() < 0.35 ? 1 : 0))];
    teamFlip = !teamFlip;
    const team: Team = teamFlip ? "blue" : "gold";
    // Enter from the screen edge farthest from the player.
    const edges: [number, number][] = [
      [-30, rand(40, H - 40)],
      [W + 30, rand(40, H - 40)],
      [rand(60, W - 60), -30],
      [rand(60, W - 60), H + 30],
    ];
    edges.sort((p, q) => Math.hypot(q[0] - player.x, q[1] - player.y) - Math.hypot(p[0] - player.x, p[1] - player.y));
    const [x, y] = edges[Math.floor(Math.random() * 2)];
    const a = Math.atan2(-(H / 2 - y), W / 2 - x);
    ships.push(makeShip(kind, team, x, y, a, false));
  }

  function reset(): void {
    ships = [];
    balls = [];
    fx = [];
    coins = [];
    foam = [];
    score = 0;
    deadT = -1;
    spawnT = 0;
    player = makeShip("brig", "red", W * 0.3, H * 0.6, 0.35, true);
    ships.push(player);
    spawnEnemy();
  }

  function enemiesAlive(): number {
    let n = 0;
    for (const s of ships) if (!s.player && s.sinkT < 0) n++;
    return n;
  }

  function wantedEnemies(): number {
    return score >= 6 ? 3 : score >= 2 ? 2 : 1;
  }

  function nearestFoe(s: Ship): Ship | null {
    let best: Ship | null = null;
    let bd = Infinity;
    for (const o of ships) {
      if (o === s || o.sinkT >= 0 || o.team === s.team) continue;
      const d = Math.hypot(o.x - s.x, o.y - s.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  /** Which side (0 port, 1 starboard) faces a point. */
  function sideToward(s: Ship, x: number, y: number): number {
    const [px, py] = sideVec(s.a, 0);
    return (x - s.x) * px + (y - s.y) * py >= 0 ? 0 : 1;
  }

  function fire(s: Ship, side: number): void {
    if (s.reload[side] > 0 || s.sinkT >= 0) return;
    s.reload[side] = s.reloadTime;
    const spec = SPECS[s.kind];
    const n = s.player ? spec.guns : Math.max(1, spec.guns - 1);
    for (let i = 0; i < n; i++) {
      const gun = n === 1 ? 0 : (i / (n - 1) - 0.5) * spec.len * 1.3;
      balls.push({ x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, team: s.team, delay: i * 0.07 + rand(0, 0.03), ship: s, side, gun, live: false });
    }
  }

  function launch(b: Ball): void {
    const s = b.ship;
    const fxv = Math.cos(s.a);
    const fyv = -Math.sin(s.a);
    const [sx, sy] = sideVec(s.a, b.side);
    const beam = SPECS[s.kind].beam;
    b.x = s.x + fxv * b.gun + sx * beam;
    b.y = s.y + fyv * b.gun + sy * beam;
    const ang = Math.atan2(sy, sx) + rand(-s.spread, s.spread);
    const sp = BALL_SPEED * rand(0.95, 1.05);
    b.vx = Math.cos(ang) * sp + s.vx * 0.6;
    b.vy = Math.sin(ang) * sp + s.vy * 0.6;
    b.z = 4;
    b.vz = (G * BALL_TIME) / 2;
    b.live = true;
    fx.push({ name: "muzzle_flash", x: b.x, y: b.y - 3, t: 0, rot: Math.atan2(sy, sx), anchor: "left" });
    fx.push({ name: "smoke_puff", x: b.x + sx * 4, y: b.y + sy * 4 - 3, t: -rand(0, 0.05), vx: sx * 10 + 4, vy: sy * 10 - 3, alpha: 0.85 });
  }

  function hitShip(s: Ship, x: number, y: number): boolean {
    const spec = SPECS[s.kind];
    const fxv = Math.cos(s.a);
    const fyv = -Math.sin(s.a);
    const dx = x - s.x;
    const dy = y - s.y;
    const along = clamp(dx * fxv + dy * fyv, -spec.len, spec.len);
    const ex = dx - along * fxv;
    const ey = dy - along * fyv;
    return ex * ex + ey * ey <= (spec.beam + 1.5) * (spec.beam + 1.5);
  }

  function addShake(v: number): void {
    if (!reduced.matches) shake = Math.max(shake, v);
  }

  function sink(s: Ship): void {
    s.sinkT = 0;
    fx.push({ name: "explosion_big", x: s.x, y: s.y - 4, t: 0 });
    fx.push({ name: "geyser", x: s.x + rand(-6, 6), y: s.y + 6, t: -0.15, anchor: "bottom" });
    addShake(s.player ? 6 : 4);
    if (s.player) {
      deadT = 0;
    } else {
      score++;
      for (let i = 0; i < 7; i++) {
        const a = rand(0, TAU);
        const v = rand(10, 30);
        coins.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, z: 6, vz: rand(60, 100), t: 0 });
      }
      spawnT = Math.max(spawnT, 1.6);
    }
  }

  // ---------- AI ----------

  function steerTo(s: Ship, want: number): void {
    const d = wrapAngle(want - s.a);
    s.turnIn = Math.abs(d) < 0.05 ? 0 : Math.sign(d) * Math.min(1, Math.abs(d) * 3);
  }

  function think(s: Ship): void {
    s.fireIn[0] = s.fireIn[1] = false;
    const t = nearestFoe(s);
    if (s.entering) {
      steerTo(s, Math.atan2(-(H / 2 - s.y), W / 2 - s.x));
      s.sail = 3;
      return;
    }
    if (!t) {
      s.sail = 1;
      s.turnIn = 0.3;
      return;
    }
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy);
    const toT = Math.atan2(-dy, dx); // heading pointing at the target
    // Orbit: keep the target on the beam at ~85 px; close in when far, open out when near.
    const ideal = 85;
    const bias = clamp((dist - ideal) / 60, -1, 1) * 0.9; // + = turn toward
    let want = toT - s.orbit * (Math.PI / 2 - bias * (Math.PI / 2) * 0.9);
    // Keep off the edges: the closer to one, the harder the pull toward the middle.
    const m = 55;
    const edge = Math.max(m - s.x, s.x - (W - m), m - s.y, s.y - (H - m));
    if (edge > 0) {
      const home = Math.atan2(-(H / 2 - s.y), W / 2 - s.x);
      want = home + wrapAngle(want - home) * Math.max(0, 1 - edge / 35);
    }
    s.aiT -= STEP;
    if (s.aiT <= 0) {
      s.aiT = rand(4, 8);
      if (Math.random() < 0.3) s.orbit = -s.orbit;
    }
    steerTo(s, want);
    s.sail = dist < 60 ? 2 : 3;
    // Fire when the target sits within the arc of a broadside and in range.
    if (dist < BALL_SPEED * BALL_TIME * 1.05) {
      for (const side of [0, 1]) {
        const [px, py] = sideVec(s.a, side);
        const cos = (dx * px + dy * py) / dist;
        // Lead a little for the target's motion.
        if (cos > (s.player ? 0.95 : 0.9)) s.fireIn[side] = true;
      }
    }
  }

  // ---------- simulation ----------

  function stepShip(s: Ship): void {
    const spec = SPECS[s.kind];
    for (const i of [0, 1]) s.reload[i] = Math.max(0, s.reload[i] - STEP);
    s.flash = Math.max(0, s.flash - STEP);
    if (s.sinkT >= 0) {
      s.sinkT += STEP;
      s.vx *= 0.97;
      s.vy *= 0.97;
      s.x += s.vx * STEP;
      s.y += s.vy * STEP;
      return;
    }
    if (s.player && !demo) {
      s.turnIn = (keys.has("left") || touch.left ? 1 : 0) - (keys.has("right") || touch.right ? 1 : 0);
      s.fireIn[0] = keys.has("port") || touch.port;
      s.fireIn[1] = keys.has("stbd") || touch.stbd;
      if (keys.has("auto")) {
        const t = nearestFoe(s);
        if (t) s.fireIn[sideToward(s, t.x, t.y)] = true;
      }
    } else {
      think(s);
    }
    if (s.fireIn[0]) fire(s, 0);
    if (s.fireIn[1]) fire(s, 1);

    const target = (spec.speed * s.sail) / 3;
    s.speed += clamp(target - s.speed, -spec.accel * STEP * 1.2, spec.accel * STEP);
    const eff = 0.45 + 0.55 * Math.min(1, s.speed / (spec.speed * 0.6));
    s.a = wrapAngle(s.a + s.turnIn * spec.turn * eff * STEP);
    const dvx = Math.cos(s.a) * s.speed;
    const dvy = -Math.sin(s.a) * s.speed;
    const grip = Math.min(1, 3 * STEP); // low grip = drift through turns
    s.vx += (dvx - s.vx) * grip;
    s.vy += (dvy - s.vy) * grip;
    s.x += s.vx * STEP;
    s.y += s.vy * STEP;

    const m = 14;
    if (s.entering) {
      if (s.x > m && s.x < W - m && s.y > m && s.y < H - m) s.entering = false;
    } else {
      if (s.x < m) (s.x = m), (s.vx = Math.max(0, s.vx));
      if (s.x > W - m) (s.x = W - m), (s.vx = Math.min(0, s.vx));
      if (s.y < m) (s.y = m), (s.vy = Math.max(0, s.vy));
      if (s.y > H - m - 4) (s.y = H - m - 4), (s.vy = Math.min(0, s.vy));
    }

    s.wakeT -= STEP;
    if (s.wakeT <= 0 && s.speed > 6) {
      s.wakeT = 0.06;
      const back = spec.len + 2;
      const [px, py] = sideVec(s.a, 0);
      const w = rand(-2, 2);
      foam.push({ x: s.x - Math.cos(s.a) * back + px * w, y: s.y + Math.sin(s.a) * back + py * w + 4, t: 0 });
    }
  }

  function step(): void {
    time += STEP;
    for (const s of ships) stepShip(s);

    // Hull-to-hull push.
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const p = ships[i];
        const q = ships[j];
        if (p.sinkT >= 0 || q.sinkT >= 0) continue;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const r = SPECS[p.kind].len * 0.8 + SPECS[q.kind].len * 0.8;
        if (d < r) {
          const push = (r - d) / 2;
          p.x -= (dx / d) * push;
          p.y -= (dy / d) * push;
          q.x += (dx / d) * push;
          q.y += (dy / d) * push;
        }
      }
    }

    for (const b of balls) {
      if (!b.live) {
        b.delay -= STEP;
        if (b.delay <= 0) {
          if (b.ship.sinkT >= 0) b.delay = 99;
          else launch(b);
        }
        continue;
      }
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
      b.vz -= G * STEP;
      b.z += b.vz * STEP;
      for (const s of ships) {
        if (s.team === b.team || s.sinkT >= 0 || s.entering) continue;
        if (b.z < 22 && hitShip(s, b.x, b.y)) {
          s.hp -= 1;
          s.flash = 0.12;
          b.delay = 99;
          b.live = false;
          fx.push({ name: "explosion_hit", x: b.x, y: b.y - 4, t: 0 });
          fx.push({ name: "smoke_puff", x: b.x, y: b.y - 8, t: -0.1, vx: 4, vy: -6, alpha: 0.7 });
          addShake(s.player ? 3 : 1.5);
          if (s.hp <= 0) sink(s);
          break;
        }
      }
      if (b.live && b.z <= 0) {
        b.live = false;
        b.delay = 99;
        fx.push({ name: "splash", x: b.x, y: b.y + 2, t: 0, anchor: "bottom" });
      }
    }
    balls = balls.filter((b) => b.live || b.delay < 50);

    for (const f of fx) {
      f.t += STEP;
      if (f.vx) f.x += f.vx * STEP;
      if (f.vy) f.y += f.vy * STEP;
    }
    fx = fx.filter((f) => {
      const m = META[f.name];
      return f.t < (m.frames ?? 1) / (m.fps || 1);
    });
    for (const c of coins) {
      c.t += STEP;
      c.x += c.vx * STEP;
      c.y += c.vy * STEP;
      c.vz -= 220 * STEP;
      c.z += c.vz * STEP;
      if (c.z < 0) (c.z = 0), (c.vz = Math.abs(c.vz) * 0.35), (c.vx *= 0.6), (c.vy *= 0.6);
    }
    coins = coins.filter((c) => c.t < 1.8);
    for (const f of foam) f.t += STEP;
    foam = foam.filter((f) => f.t < 1.4);

    const sinkDur = 6 / 2 + 0.8;
    ships = ships.filter((s) => s.player || s.sinkT < sinkDur);

    if (deadT >= 0) {
      deadT += STEP;
      if (demo && deadT > 3) reset();
    } else {
      spawnT -= STEP;
      if (spawnT <= 0 && enemiesAlive() < wantedEnemies()) {
        spawnEnemy();
        spawnT = 2.5;
      }
    }
    shake = Math.max(0, shake - STEP * 14);
  }

  // ---------- rendering ----------

  function drawFrame(name: string, frame: number, x: number, y: number, anchor: Fx["anchor"] = "center", rot = 0, alpha = 1): void {
    const m = META[name];
    const im = img(name);
    if (!im.complete || !im.naturalWidth) return;
    ctx.globalAlpha = alpha;
    if (rot) {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(rot);
      ctx.drawImage(im, frame * m.w, 0, m.w, m.h, anchor === "left" ? 0 : -m.w / 2, -m.h / 2, m.w, m.h);
      ctx.restore();
    } else {
      const dx = anchor === "left" ? x : x - m.w / 2;
      const dy = anchor === "bottom" ? y - m.h : y - m.h / 2;
      ctx.drawImage(im, frame * m.w, 0, m.w, m.h, Math.round(dx), Math.round(dy), m.w, m.h);
    }
    ctx.globalAlpha = 1;
  }

  function drawShip(s: Ship): void {
    const m = META[s.kind];
    if (s.sinkT >= 0) {
      const sm = m.sinking!;
      const f = Math.min(sm.frames - 1, Math.floor(s.sinkT * sm.fps));
      const fade = clamp(1 - (s.sinkT - sm.frames / sm.fps) / 0.8, 0, 1);
      const im = img(`${s.kind}_${s.team}_sinking`);
      ctx.globalAlpha = fade;
      ctx.drawImage(im, f * m.w, 0, m.w, m.h, Math.round(s.x - m.w / 2), Math.round(s.y - m.h / 2), m.w, m.h);
      ctx.globalAlpha = 1;
      return;
    }
    const idx = ((Math.round(s.a / (TAU / 32)) % 32) + 32) % 32;
    const im = img(`${s.kind}_${s.team}`);
    const bob = Math.round(Math.sin(time * 2 + s.x * 0.05) * 0.6);
    const dx = Math.round(s.x - m.w / 2);
    const dy = Math.round(s.y - m.h / 2) + bob;
    // Hull shadow on the water.
    ctx.fillStyle = "rgba(4,16,30,0.35)";
    ctx.beginPath();
    ctx.ellipse(Math.round(s.x), Math.round(s.y) + 6, SPECS[s.kind].len + 2, SPECS[s.kind].beam, -s.a, 0, TAU);
    ctx.fill();
    ctx.drawImage(im, idx * m.w, 0, m.w, m.h, dx, dy, m.w, m.h);
    if (s.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5;
      ctx.drawImage(im, idx * m.w, 0, m.w, m.h, dx, dy, m.w, m.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    if (s.hp / s.maxHp <= 0.5) {
      const fm = META.fire_large;
      drawFrame("fire_large", Math.floor(time * (fm.fps ?? 10) + s.x) % (fm.frames ?? 1), s.x + 3, s.y + 2, "bottom");
    }
    if (!s.player && s.hp < s.maxHp) {
      const bw = 18;
      const bx = Math.round(s.x - bw / 2);
      const by = Math.round(s.y - m.h / 2) - 2;
      ctx.fillStyle = "#060f1a";
      ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
      ctx.fillStyle = "#c03a32";
      ctx.fillRect(bx, by, Math.round((bw * s.hp) / s.maxHp), 2);
    }
  }

  function text(str: string, x: number, y: number, color = "#f3ead8", align: CanvasTextAlign = "left", font = FONT): void {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#060f1a";
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function bar(x: number, y: number, w: number, frac: number, ready: boolean): void {
    ctx.fillStyle = "#060f1a";
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = "#12304a";
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = ready ? "#e8b42c" : "#7f8ea0";
    ctx.fillRect(x, y, Math.round(w * frac), 3);
  }

  function drawHud(): void {
    text(`SUNK: ${score}`, 6, 5, "#e8b42c");
    // Hull pips.
    for (let i = 0; i < player.maxHp; i++) {
      ctx.fillStyle = "#060f1a";
      ctx.fillRect(W - 8 - i * 5, 5, 5, 6);
      ctx.fillStyle = i < player.hp ? "#c03a32" : "#12304a";
      ctx.fillRect(W - 7 - i * 5, 6, 3, 4);
    }
    text("HULL", W - 12 - player.maxHp * 5, 4, "#b9b0a0", "right");
    const y = H - 14;
    for (const side of [0, 1]) {
      const r = player.reload[side];
      const x = 6 + side * 70;
      text(side === 0 ? "PORT" : "STBD", x, y - 1, r <= 0 ? "#f3ead8" : "#7f8ea0");
      bar(x + 30, y + 2, 30, 1 - r / player.reloadTime, r <= 0);
    }
    text("SAIL", W - 46, y - 1, "#b9b0a0");
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#060f1a";
      ctx.fillRect(W - 20 + i * 5, y, 5, 7);
      ctx.fillStyle = i < player.sail ? "#f3ead8" : "#12304a";
      ctx.fillRect(W - 19 + i * 5, y + 1, 3, 5);
    }
  }

  function render(): void {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const sx = shake > 0 ? Math.round(rand(-shake, shake)) : 0;
    const sy = shake > 0 ? Math.round(rand(-shake, shake)) : 0;
    ctx.translate(sx, sy);

    const water = img("water");
    if (water.complete && water.naturalWidth) {
      const ox = reduced.matches ? 0 : Math.floor(time * 4) % 128;
      const oy = reduced.matches ? 0 : Math.floor(time * 2) % 128;
      for (let x = -128 - ox; x < W + 128; x += 128) for (let y = -128 - oy; y < H + 128; y += 128) ctx.drawImage(water, x, y);
    } else {
      ctx.fillStyle = "#1b4466";
      ctx.fillRect(-8, -8, W + 16, H + 16);
    }

    for (const f of foam) {
      ctx.globalAlpha = 0.55 * (1 - f.t / 1.4);
      ctx.fillStyle = "#cfe3ef";
      const s = f.t < 0.5 ? 2 : 1;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), s, 1);
    }
    ctx.globalAlpha = 1;

    // Ball shadows sit on the water, under the ships.
    ctx.fillStyle = "rgba(4,16,30,0.5)";
    for (const b of balls) if (b.live) ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y), 3, 2);

    for (const f of fx) if (f.name === "splash") drawFrame(f.name, Math.floor(f.t * (META[f.name].fps ?? 1)), f.x, f.y, f.anchor);

    const order = [...ships].sort((p, q) => (p.sinkT >= 0 ? 0 : 1) - (q.sinkT >= 0 ? 0 : 1) || p.y - q.y);
    for (const s of order) drawShip(s);

    for (const c of coins) {
      const cm = META.coin;
      drawFrame("coin", Math.floor(c.t * (cm.fps ?? 12)) % (cm.frames ?? 1), c.x, c.y - c.z, "center", 0, clamp((1.8 - c.t) / 0.4, 0, 1));
    }
    for (const b of balls) if (b.live) drawFrame("cannonball", 0, b.x, b.y - b.z);
    for (const f of fx) {
      if (f.name === "splash") continue;
      const m = META[f.name];
      if (f.t < 0) continue;
      drawFrame(f.name, Math.min((m.frames ?? 1) - 1, Math.floor(f.t * (m.fps ?? 1))), f.x, f.y, f.anchor, f.rot ?? 0, f.alpha ?? 1);
    }

    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawHud();

    if (deadT >= 0 && !demo) {
      const a = clamp(deadT / 1.2, 0, 1);
      ctx.fillStyle = `rgba(6,15,26,${0.6 * a})`;
      ctx.fillRect(0, 0, W, H);
      if (deadT > 1) {
        text("SUNK!", W / 2, H / 2 - 26, "#ff6a2a", "center", BIG_FONT);
        text(`YOU SENT ${score} SHIP${score === 1 ? "" : "S"} TO THE BOTTOM`, W / 2, H / 2 - 2, "#f3ead8", "center");
        text("PRESS R / TAP TO SAIL AGAIN", W / 2, H / 2 + 14, "#e8b42c", "center");
      }
    }
    if (demo) text("DEMO", W - 6, 16, "#7f8ea0", "right");
  }

  // ---------- loop / lifecycle ----------

  function active(): boolean {
    return loaded && started && onScreen && !document.hidden && (focused || demo);
  }

  function frame(now: number): void {
    rafId = 0;
    if (!active()) {
      render();
      return;
    }
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 6) {
      step();
      acc -= STEP;
      n++;
    }
    render();
    rafId = requestAnimationFrame(frame);
  }

  function wake(): void {
    syncUi();
    if (rafId || !loaded) return;
    last = performance.now();
    acc = 0;
    rafId = requestAnimationFrame(frame);
  }

  function syncUi(): void {
    const show = loaded && !demo && (!started || !focused);
    startBtn.hidden = !show;
    const verb = matchMedia("(hover: none)").matches ? "Tap" : "Click";
    startBtn.textContent = started ? `Paused: ${verb.toLowerCase()} to resume` : `${verb} to set sail`;
    root.classList.toggle("playing", started && focused);
  }

  function resize(): void {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    k = Math.max(1, Math.round((r.width * dpr) / W));
    if (canvas.width !== W * k) {
      canvas.width = W * k;
      canvas.height = H * k;
    }
    if (loaded) render();
  }

  // Input
  const KEYMAP: Record<string, string> = {
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
    KeyQ: "port",
    KeyE: "stbd",
    Space: "auto",
  };
  canvas.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === "Escape") {
      canvas.blur();
      return;
    }
    const act = KEYMAP[e.code];
    if (act) keys.add(act);
    if (!e.repeat) {
      if (e.code === "KeyW" || e.code === "ArrowUp") player.sail = Math.min(3, player.sail + 1);
      if (e.code === "KeyS" || e.code === "ArrowDown") player.sail = Math.max(0, player.sail - 1);
      if (e.code === "KeyR" && deadT > 1) reset();
    }
    if (act || /^(Arrow|Key[WSR]$)/.test(e.code)) e.preventDefault();
  });
  canvas.addEventListener("keyup", (e) => {
    const act = KEYMAP[e.code];
    if (act) keys.delete(act);
  });
  canvas.addEventListener("focus", () => {
    focused = true;
    started = true;
    wake();
  });
  canvas.addEventListener("blur", () => {
    focused = false;
    keys.clear();
    for (const key of Object.keys(touch) as (keyof typeof touch)[]) touch[key] = false;
    syncUi();
  });
  canvas.addEventListener("pointerdown", () => {
    if (deadT > 1 && !demo) reset();
  });
  startBtn.addEventListener("click", () => {
    started = true;
    canvas.focus({ preventScroll: true });
    wake();
  });

  // Touch buttons: hold to turn / fire. preventDefault keeps focus on the canvas.
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-touch]")) {
    const act = b.dataset.touch!;
    const on = (e: PointerEvent) => {
      e.preventDefault();
      if (!focused) canvas.focus({ preventScroll: true });
      if (deadT > 1) {
        reset();
        return;
      }
      if (act === "up") player.sail = Math.min(3, player.sail + 1);
      else if (act === "down") player.sail = Math.max(0, player.sail - 1);
      else touch[act as keyof typeof touch] = true;
      b.setPointerCapture(e.pointerId);
    };
    const off = () => {
      if (act in touch) touch[act as keyof typeof touch] = false;
    };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointercancel", off);
    b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && !loaded) {
      const font = Promise.race([document.fonts?.load(FONT).catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
      void Promise.all([preload(), font]).then(() => {
        loaded = true;
        resize();
        if (freezeAt > 0) {
          for (let i = 0; i < freezeAt * 60; i++) step();
          started = false;
          render();
          return;
        }
        wake();
      });
    }
    if (onScreen) wake();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) wake();
  });
  new ResizeObserver(resize).observe(canvas);

  reset();
  // Attract scene: the player brig and its first opponent already in view.
  ships[1].x = W * 0.72;
  ships[1].y = H * 0.38;
  ships[1].a = Math.PI * 0.9;
  ships[1].entering = false;
  syncUi();
}
