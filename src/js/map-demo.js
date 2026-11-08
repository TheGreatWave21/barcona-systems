/* ==========================================================
   Simulation demo: a simplified example mission (illustrative only).
   The robot drives the aisle, brakes to a stop at each rack, turns its
   camera to the rack face and tilts it upwards level by level, reading
   one barcode per shelf. The camera stays on the robot; it only angles up. LiDAR scans 360° the whole time.
   ========================================================== */
(function () {
  const canvas = document.getElementById("floor-map");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // German copy (/bs-german/) shares this script
  const DE = location.pathname.includes("/bs-german/");
  const L = DE ? {
    level: "Ebene", camera: "KAMERA", side: "SEITENANSICHT", next: " (nächstes)", goal: "ZIEL",
    done: "Ziel erreicht", settle: "Angehalten", camOut: "Kamera zum Regal", up: "Kamera hoch · Ebene",
    lower: "Kamera waagerecht", camIn: "Kamera nach vorn", turn: "Wendet", brake: "Bremst", drive: "Fährt",
  } : {
    level: "level", camera: "CAMERA", side: "SIDE VIEW", next: " (next)", goal: "GOAL",
    done: "Goal reached", settle: "Stopped", camOut: "Camera to rack", up: "Camera up · level",
    lower: "Camera level", camIn: "Camera forward", turn: "Turning", brake: "Braking", drive: "Driving",
  };

  const C = {
    lidar: "#6ee7a8", cam: "#7fe3ff", robot: "#ff5b1f", read: "#ffc43d",
    idle: "#5f656e", text: "#9a9fa7", mono: "'IBM Plex Mono', monospace",
  };

  /* ---- Example hall ---- */
  const WORLD = { w: 18.0, h: 11.0 };
  const START = { x: 1.0, y: 1.2, a: Math.PI / 2 };
  const GOAL = { x: 16.2, y: 9.4 };
  const AISLE = 4.55;
  const OBSTACLES = [
    { id: "rack-a1", kind: "rack", x: 4.0, y: 3.0, w: 4.8, d: 0.65 },
    { id: "rack-a2", kind: "rack", x: 4.0, y: 6.1, w: 4.8, d: 0.65 },
    { id: "rack-b1", kind: "rack", x: 10.3, y: 3.0, w: 4.8, d: 0.65 },
    { id: "rack-b2", kind: "rack", x: 10.3, y: 6.1, w: 4.8, d: 0.65 },
    { id: "pallet-01", kind: "pallet", x: 7.1, y: 8.7, w: 1.1, d: 0.9 },
    { id: "box-01", kind: "box", x: 13.5, y: 8.5, w: 0.8, d: 0.8 },
  ];

  /* ---- Scan stops: one rack bay per stop, one barcode per shelf level ---- */
  const LEVELS = [0.6, 2.3, 4.0, 5.7];        // barcode heights on a tall rack (m)
  const BEAMS = [0.1, 1.8, 3.5, 5.2, 6.9], RACK_H = 7.0;
  const CAM_Z = 0.55, CAM_DIST = 2.4;          // camera height on the robot, distance to rack face
  const tiltFor = (z) => Math.atan2(z - CAM_Z, CAM_DIST);
  const STOPS = [
    { rack: "rack-a1", tag: "A1", x: 3.2, side: "up" },
    { rack: "rack-a2", tag: "A2", x: 5.6, side: "down" },
    { rack: "rack-b1", tag: "B1", x: 9.4, side: "up" },
    { rack: "rack-b2", tag: "B2", x: 11.8, side: "down" },
  ];
  STOPS.forEach((s) => {
    const r = OBSTACLES.find((o) => o.id === s.rack);
    s.faceY = s.side === "up" ? r.y + r.d / 2 : r.y - r.d / 2;
  });

  const MISSION = [
    { x: 1.0, y: AISLE },
    ...STOPS.map((s, i) => ({ x: s.x, y: AISLE, stop: i })),
    { x: 16.2, y: AISLE },
    { x: GOAL.x, y: GOAL.y, goal: true },
  ];

  /* ---- Motion parameters (illustrative) ---- */
  const SPEED = 1.3, ACC = 1.4, TURN = Math.PI * 0.8;
  const CAM_TURN = 3.0, TILT = 0.9, READ_RATE = 160;
  const LIDAR_RANGE = 7, LIDAR_RAYS = 120, CAM_RANGE = 1.5, CAM_HALF = (28 * Math.PI) / 180;

  const out = {
    scanned: document.querySelector('[data-map="scanned"]'),
    elapsed: document.querySelector('[data-map="elapsed"]'),
    state: document.querySelector('[data-map="state"]'),
    log: document.querySelector('[data-map="log"]'),
  };

  let bot, codes, wp, t, trail, phase, phaseT, level, lidarSpin;
  function reset() {
    bot = { ...START, v: 0, cam: 0, tilt: 0 };
    codes = STOPS.map(() => LEVELS.map(() => ({ p: 0, done: false })));
    wp = 0; t = 0; trail = []; phase = "drive"; phaseT = 0; level = 0; lidarSpin = 0;
    if (out.log) out.log.innerHTML = "";
  }

  const rect = (o) => ({ x0: o.x - o.w / 2, x1: o.x + o.w / 2, y0: o.y - o.d / 2, y1: o.y + o.d / 2 });
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const approach = (v, target, maxStep) => v + Math.max(-maxStep, Math.min(maxStep, target - v));

  // LiDAR ray against the hall walls and every obstacle (slab method)
  function ray(ax, ay, a) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = LIDAR_RANGE;
    const boxes = OBSTACLES.map(rect).concat([{ x0: 0, x1: WORLD.w, y0: 0, y1: WORLD.h, inside: true }]);
    for (const r of boxes) {
      let t0 = -Infinity, t1 = Infinity;
      for (const [o, d, lo, hi] of [[ax, dx, r.x0, r.x1], [ay, dy, r.y0, r.y1]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { t0 = Infinity; } continue; }
        let u0 = (lo - o) / d, u1 = (hi - o) / d;
        if (u0 > u1) [u0, u1] = [u1, u0];
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
      }
      if (t0 > t1) continue;
      const hit = r.inside ? t1 : t0;
      if (hit > 0.01 && hit < best) best = hit;
    }
    return best;
  }

  function addLog(text, time) {
    if (!out.log) return;
    const li = document.createElement("li");
    li.innerHTML = `${text}<span>${time.toFixed(1)} s</span>`;
    out.log.appendChild(li);
    while (out.log.children.length > 6) out.log.firstChild.remove();
  }

  function step(dt) {
    lidarSpin += dt * Math.PI * 2 * 0.8;
    if (phase === "done") { phaseT += dt; if (phaseT > 3) reset(); return; }
    t += dt;
    const target = MISSION[wp];
    const stop = target.stop !== undefined ? STOPS[target.stop] : null;
    const camSide = stop ? (stop.side === "up" ? -Math.PI / 2 : Math.PI / 2) : 0;

    if (phase === "drive") {
      bot.cam = approach(bot.cam, 0, CAM_TURN * dt);
      const dx = target.x - bot.x, dy = target.y - bot.y, dist = Math.hypot(dx, dy);
      const d = angDiff(Math.atan2(dy, dx), bot.a);
      if (dist < 0.01) {
        bot.x = target.x; bot.y = target.y; bot.v = 0;
        if (stop) { phase = "settle"; phaseT = 0; level = 0; }
        else if (target.goal) { phase = "done"; phaseT = 0; }
        else wp++;
      } else if (Math.abs(d) > 0.03 && bot.v < 0.05) {
        bot.v = 0; bot.a += Math.sign(d) * Math.min(Math.abs(d), TURN * dt); // turn on the spot
      } else {
        bot.a += d;
        const vWant = Math.min(SPEED, Math.sqrt(2 * ACC * dist)); // brake to a stop at the waypoint
        bot.v = approach(bot.v, vWant, ACC * dt);
        const s = Math.min(dist, bot.v * dt);
        bot.x += Math.cos(bot.a) * s; bot.y += Math.sin(bot.a) * s;
      }
    } else if (phase === "settle") {
      phaseT += dt; if (phaseT > 0.35) phase = "camOut";
    } else if (phase === "camOut") {
      bot.cam = approach(bot.cam, camSide, CAM_TURN * dt);
      if (bot.cam === camSide) phase = "lift";
    } else if (phase === "lift") {
      const want = tiltFor(LEVELS[level]);
      bot.tilt = approach(bot.tilt, want, TILT * dt);
      if (bot.tilt === want) {
        const c = codes[target.stop][level];
        c.p = Math.min(100, c.p + READ_RATE * dt);
        if (c.p >= 100 && !c.done) {
          c.done = true; addLog(`${stop.tag} · ${L.level} ${level + 1}`, t);
          if (++level >= LEVELS.length) phase = "lower";
        }
      }
    } else if (phase === "lower") {
      bot.tilt = approach(bot.tilt, 0, TILT * 1.4 * dt);
      if (bot.tilt === 0) phase = "camIn";
    } else if (phase === "camIn") {
      bot.cam = approach(bot.cam, 0, CAM_TURN * dt);
      if (bot.cam === 0) { phase = "drive"; wp++; }
    }
    if (!trail.length || Math.hypot(trail[trail.length - 1][0] - bot.x, trail[trail.length - 1][1] - bot.y) > 0.05) {
      trail.push([bot.x, bot.y]); if (trail.length > 600) trail.shift();
    }
  }

  /* ---- Rendering ---- */
  let W = 0, H = 0, S = 1, ox = 0, oy = 0;
  const X = (x) => ox + x * S, Y = (y) => oy + y * S;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 28;
    S = Math.min((W - pad * 2) / WORLD.w, (H - pad * 2) / WORLD.h);
    ox = (W - WORLD.w * S) / 2; oy = (H - WORLD.h * S) / 2;
    if (reduce || !running) draw();
  }
  const font = (px, weight = 400) => `${weight} ${Math.max(8, px)}px ${C.mono}`;

  function tagLabel(text, x, y, color) {
    ctx.font = font(10, 600);
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = "rgba(10,11,13,.85)"; ctx.fillRect(x, y - 11, w, 15);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y - 10.5, w - 1, 14);
    ctx.fillStyle = color; ctx.fillText(text, x + 5, y);
    return w;
  }

  function currentStopIndex() {
    for (let i = wp; i < MISSION.length; i++) if (MISSION[i].stop !== undefined) return MISSION[i].stop;
    return STOPS.length - 1;
  }

  function drawHall() {
    ctx.lineWidth = 1;
    for (let i = 0; i <= WORLD.w; i++) { ctx.strokeStyle = i % 5 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.moveTo(X(i) + 0.5, Y(0)); ctx.lineTo(X(i) + 0.5, Y(WORLD.h)); ctx.stroke(); }
    for (let j = 0; j <= WORLD.h; j++) { ctx.strokeStyle = j % 5 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.moveTo(X(0), Y(j) + 0.5); ctx.lineTo(X(WORLD.w), Y(j) + 0.5); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2; ctx.strokeRect(X(0), Y(0), WORLD.w * S, WORLD.h * S);
    ctx.fillStyle = C.idle; ctx.font = font(10);
    ctx.fillText("18.0 m", X(WORLD.w) - 40, Y(0) - 8); ctx.fillText("11.0 m", X(0) + 4, Y(WORLD.h) + 16);

    for (const o of OBSTACLES) {
      const r = rect(o);
      ctx.fillStyle = o.kind === "rack" ? "#1f232a" : o.kind === "pallet" ? "#3a2f22" : "#2e2a22";
      ctx.fillRect(X(r.x0), Y(r.y0), o.w * S, o.d * S);
      ctx.strokeStyle = o.kind === "rack" ? "rgba(255,91,31,.55)" : "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(X(r.x0) + 0.5, Y(r.y0) + 0.5, o.w * S - 1, o.d * S - 1);
      ctx.fillStyle = C.idle; ctx.font = font(9);
      ctx.fillText(o.id, X(r.x0) + 4, Y(r.y0) + Math.min(o.d * S - 3, 11));
    }

    ctx.strokeStyle = "rgba(127,227,255,.6)"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(X(GOAL.x), Y(GOAL.y), 0.35 * S, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.cam; ctx.font = font(9); ctx.fillText(L.goal, X(GOAL.x) - 12, Y(GOAL.y) + 0.35 * S + 12);

    // scan stops on the rack faces: one pip per shelf level
    STOPS.forEach((s, i) => {
      const n = codes[i].filter((c) => c.done).length;
      const reading = codes[i].some((c) => !c.done && c.p > 0);
      const col = n === LEVELS.length ? C.cam : reading ? C.read : C.idle;
      const off = s.side === "up" ? 6 : -6;
      for (let k = 0; k < LEVELS.length; k++) {
        ctx.fillStyle = codes[i][k].done ? C.cam : codes[i][k].p > 0 ? C.read : C.idle;
        ctx.fillRect(X(s.x) - 9 + k * 7, Y(s.faceY) + (s.side === "up" ? 2 : -7), 5, 5);
      }
      ctx.fillStyle = col; ctx.font = font(9);
      ctx.fillText(`${s.tag} ${n}/${LEVELS.length}`, X(s.x) - 14, Y(s.faceY) + off + (s.side === "up" ? 12 : -6));
    });

    ctx.strokeStyle = "rgba(255,91,31,.35)"; ctx.lineWidth = 2; ctx.setLineDash([2, 5]);
    ctx.beginPath(); trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawSensors() {
    const bx = X(bot.x), by = Y(bot.y);
    // LiDAR: 360° rays and hit points
    ctx.lineWidth = 1;
    for (let i = 0; i < LIDAR_RAYS; i++) {
      const a = (i / LIDAR_RAYS) * Math.PI * 2;
      const d = ray(bot.x, bot.y, a);
      const hx = X(bot.x + Math.cos(a) * d), hy = Y(bot.y + Math.sin(a) * d);
      const sweep = (((a - lidarSpin) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const glow = sweep > Math.PI * 1.75 ? (sweep - Math.PI * 1.75) / (Math.PI * 0.25) : 0;
      ctx.strokeStyle = `rgba(110,231,168,${0.05 + glow * 0.25})`;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(hx, hy); ctx.stroke();
      if (d < LIDAR_RANGE - 0.01) { ctx.fillStyle = `rgba(110,231,168,${0.55 + glow * 0.45})`; ctx.fillRect(hx - 1.2, hy - 1.2, 2.4, 2.4); }
    }
    // Camera field of view
    const ca = bot.a + bot.cam;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, CAM_RANGE * S);
    g.addColorStop(0, "rgba(127,227,255,.38)"); g.addColorStop(1, "rgba(127,227,255,.06)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.arc(bx, by, CAM_RANGE * S, ca - CAM_HALF, ca + CAM_HALF); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(127,227,255,.8)"; ctx.lineWidth = 1.2; ctx.stroke();
  }

  function drawRobot() {
    const bx = X(bot.x), by = Y(bot.y);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(bot.a);
    const rw = 0.6 * S, rh = 0.45 * S;
    ctx.fillStyle = C.robot; ctx.shadowColor = C.robot; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 4) : ctx.rect(-rw / 2, -rh / 2, rw, rh); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "#0a0b0d";
    ctx.beginPath(); ctx.moveTo(rw / 2 - 2, 0); ctx.lineTo(rw / 2 - 8, -4); ctx.lineTo(rw / 2 - 8, 4); ctx.fill();
    // LiDAR puck (centre) and camera head (turns toward the rack)
    ctx.fillStyle = C.lidar; ctx.strokeStyle = "#0a0b0d"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-rw * 0.12, 0, Math.max(3, rh * 0.22), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(bot.cam);
    ctx.fillStyle = C.cam; ctx.fillRect(rw * 0.05, -3, Math.max(6, rw * 0.28), 6); ctx.strokeRect(rw * 0.05, -3, Math.max(6, rw * 0.28), 6);
    ctx.restore();

    // callouts so it is obvious which beam is which
    const lx = bx - 0.9 * S - 52, ly = by - 0.9 * S;
    ctx.strokeStyle = "rgba(110,231,168,.7)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx - 3, by - 3); ctx.lineTo(lx + 50, ly + 2); ctx.stroke();
    tagLabel("LiDAR 360°", lx - 18, ly + 2, C.lidar);
    const ca = bot.a + bot.cam;
    const cx = bx + Math.cos(ca) * (CAM_RANGE * S + 8), cy = by + Math.sin(ca) * (CAM_RANGE * S + 8);
    tagLabel(L.camera, cx - (Math.cos(ca) < -0.3 ? 58 : Math.cos(ca) > 0.3 ? 0 : 29), cy + (Math.sin(ca) > 0.3 ? 12 : Math.sin(ca) < -0.3 ? -2 : 4), C.cam);
  }

  // Side view of the rack bay in front of the robot: shows the camera tilting up level by level
  function drawSideView() {
    const x0 = X(0.3), y0 = Y(7.05), w = X(6.4) - x0, h = Y(10.75) - y0;
    if (w < 120) return;
    const si = currentStopIndex(), stop = STOPS[si];
    const atStop = MISSION[wp] && MISSION[wp].stop === si && phase !== "drive";
    ctx.fillStyle = "rgba(10,11,13,.92)"; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    ctx.fillStyle = C.text; ctx.font = font(9.5, 600);
    ctx.fillText(`${L.side} · ${stop.rack}${atStop ? "" : L.next}`, x0 + 8, y0 + 14);

    const ground = y0 + h - 10, m = (h - 30) / (RACK_H + 0.2); // pixels per metre
    const Hy = (z) => ground - z * m;
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.moveTo(x0 + 6, ground + 0.5); ctx.lineTo(x0 + w - 6, ground + 0.5); ctx.stroke();

    // rack
    const rx0 = x0 + w * 0.56, rx1 = x0 + w - 12;
    ctx.fillStyle = "#1f232a"; ctx.fillRect(rx0, Hy(RACK_H), rx1 - rx0, RACK_H * m);
    ctx.fillStyle = "#d9561d";
    ctx.fillRect(rx0, Hy(RACK_H), 4, RACK_H * m); ctx.fillRect(rx1 - 4, Hy(RACK_H), 4, RACK_H * m);
    BEAMS.forEach((z) => ctx.fillRect(rx0, Hy(z) - 2, rx1 - rx0, 3));
    LEVELS.forEach((z, k) => {
      const c = codes[si][k];
      ctx.fillStyle = "#8c6c48"; ctx.fillRect(rx0 + 10, Hy(z + 0.75), rx1 - rx0 - 20, Hy(z - 0.45) - Hy(z + 0.75));
      const lw = Math.min(46, (rx1 - rx0) * 0.45), lh = Math.max(9, 0.26 * m);
      const lx = rx0 + 14, ly = Hy(z) - lh / 2;
      ctx.fillStyle = "#e8e7e3"; ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = "#15171a";
      for (let b = 3, s = k * 7 + si * 3; b < lw - 3; s = (s * 31 + 7) % 17) { const bw = 0.8 + (s % 3) * 0.6; ctx.fillRect(lx + b, ly + 2, bw, lh - 4); b += bw + 1 + (s % 2); }
      const col = c.done ? C.cam : c.p > 0 ? C.read : C.idle;
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(lx - 2.5, ly - 2.5, lw + 5, lh + 5);
      ctx.fillStyle = col; ctx.font = font(9);
      ctx.fillText(c.done ? `L${k + 1} ✓` : c.p > 0 ? `L${k + 1} ${Math.round(c.p)}%` : `L${k + 1}`, lx + lw + 6, Hy(z) + 3);
    });

    // robot seen from behind: body, LiDAR puck and the camera head sitting on top
    const rs = m * 2.2; // robot drawn larger than scale so it stays readable
    const cx = x0 + w * 0.2, bw = 0.6 * rs, bh = 0.38 * rs, top = ground - bh;
    ctx.fillStyle = C.robot; ctx.fillRect(cx - bw / 2, top, bw, bh);
    ctx.fillStyle = "#0a0b0d"; ctx.beginPath(); ctx.arc(cx - bw / 3, ground - 2, 3, 0, 7); ctx.arc(cx + bw / 3, ground - 2, 3, 0, 7); ctx.fill();
    // LiDAR: scans a flat plane around the robot
    const lz = top - 3;
    ctx.fillStyle = C.lidar; ctx.fillRect(cx - bw / 2 + 3, lz - 3, 12, 6);
    ctx.strokeStyle = "rgba(110,231,168,.55)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0 + 8, lz); ctx.lineTo(cx - bw / 2, lz); ctx.moveTo(cx + bw / 2, lz); ctx.lineTo(rx0, lz); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.lidar; ctx.font = font(9, 600); ctx.fillText("LiDAR", x0 + 8, lz - 6);

    // camera: fixed on the robot, only its angle changes
    const camX = cx + bw / 2 - 8, camY = top - 9;
    const run = rx0 - camX;
    // tilt in screen space: at each level's tilt the beam lands exactly on that label
    const ang = Math.atan2(camY - Hy(CAM_Z + Math.tan(bot.tilt) * CAM_DIST), run);
    const looking = atStop && Math.abs(bot.cam) > 1.2;
    if (looking) {
      const half = 0.07, yAt = (a) => camY - Math.tan(a) * run;
      ctx.fillStyle = "rgba(127,227,255,.22)";
      ctx.beginPath(); ctx.moveTo(camX, camY); ctx.lineTo(rx0 + 8, yAt(ang + half)); ctx.lineTo(rx0 + 8, yAt(ang - half)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(127,227,255,.8)"; ctx.lineWidth = 1; ctx.stroke();
    }
    if (bot.tilt > 0.02) { // arc showing how far the camera is angled up
      ctx.strokeStyle = "rgba(127,227,255,.5)"; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(camX, camY, 16, -Math.max(0, ang), 0); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = "#3a3d42"; ctx.fillRect(camX - 3, camY + 1, 6, top - camY - 1); // short fixed mount
    ctx.save(); ctx.translate(camX, camY); ctx.rotate(-ang);
    ctx.fillStyle = C.cam; ctx.fillRect(-6, -4, 13, 8);
    ctx.fillStyle = "#0a0b0d"; ctx.fillRect(6, -2.5, 3, 5);
    ctx.restore();
    ctx.fillStyle = C.cam; ctx.font = font(9, 600);
    ctx.fillText(L.camera, camX - 24, camY - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawHall();
    drawSensors();
    drawRobot();
    drawSideView();
  }

  function stateText() {
    switch (phase) {
      case "done": return L.done;
      case "settle": return L.settle;
      case "camOut": return L.camOut;
      case "lift": return `${L.up} ${Math.min(level + 1, LEVELS.length)}/${LEVELS.length}`;
      case "lower": return L.lower;
      case "camIn": return L.camIn;
      default: {
        const tgt = MISSION[wp];
        return bot.v < 0.05 && tgt && Math.hypot(tgt.x - bot.x, tgt.y - bot.y) > 0.02 ? L.turn : bot.v < SPEED * 0.85 && tgt && tgt.stop !== undefined && Math.hypot(tgt.x - bot.x, tgt.y - bot.y) < 0.7 ? L.brake : L.drive;
      }
    }
  }
  function report() {
    const all = codes.flat(), n = all.filter((c) => c.done).length;
    if (out.scanned) out.scanned.textContent = `${n}/${all.length}`;
    if (out.elapsed) out.elapsed.textContent = t.toFixed(1) + " s";
    if (out.state) out.state.textContent = stateText();
  }

  let running = false, last = 0, lastReport = 0;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    step(dt); draw();
    if (now - lastReport > 120) { report(); lastReport = now; }
    requestAnimationFrame(loop);
  }

  reset();
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  if (reduce) {
    // static frame: camera raised at the second rack
    for (let i = 0; i < 4000 && !(MISSION[wp].stop === 1 && phase === "lift" && level === 1); i++) step(1 / 30);
    draw(); report(); return;
  }
  new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!e.isIntersecting) running = false;
  })).observe(canvas);
})();
